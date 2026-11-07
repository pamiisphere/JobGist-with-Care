import json
from concurrent.futures import ThreadPoolExecutor
from fastapi import HTTPException
from app.config import settings
from app.db import supabase
from app.llm.client import call_llm
from app.matching.score import score_match
from app.prompts.applicant_summary import PROMPT_VERSION, build_messages
from app.services.ai_log import log_ai_call
from app.services.caregiver_snapshot import snapshot_hash
from app.services.match_data import km_between, load_caregivers, load_job, load_labels
from app.services.worker_profile import clean_output

def _public(d, drop):
    return {k: v for k, v in d.items() if not k.startswith("_") and k not in drop}

def _result(cid, sc, text, source, cached):
    return {"caregiver_id": cid, "fit_score": float(sc["total"]), "breakdown": sc["breakdown"],
            "missing_specialized": sc["missing_specialized"],
            "missing_general": sc.get("missing_general", []), "summary_text": text,
            "source": source, "cached": cached}

def _save(job_post_id, cid, provider, model, snap, h, text, sc, log_id):
    tbl = supabase.table("ai_applicant_summaries")
    tbl.update({"is_active": False}).eq("job_post_id", job_post_id) \
       .eq("caregiver_id", cid).eq("is_active", True).execute()
    row = {"job_post_id": job_post_id, "caregiver_id": cid, "provider": provider,
           "model_name": model, "prompt_version": PROMPT_VERSION, "input_snapshot": snap,
           "input_hash": h, "summary_text": text, "fit_score": sc["total"],
           "fit_rationale": json.dumps(sc, ensure_ascii=False), "is_active": True,
           "ai_log_id": log_id}
    supabase.table("ai_applicant_summaries").insert(row).execute()

def generate_summaries(family_id, job_post_id, caregiver_ids, provider=None):
    provider = provider or settings.default_provider
    model = settings.typhoon_model if provider == "typhoon" else settings.openai_model

    job = load_job(job_post_id)
    if job is None:
        raise HTTPException(404, "Job post not found")
    if job["family_id"] != family_id:
        raise HTTPException(403, "Not your job post")

    cgs, labels = load_caregivers(caregiver_ids), load_labels()
    job_pub = _public(job, {"id", "family_id"})
    results, todo = [], []

    for cid in dict.fromkeys(caregiver_ids):
        cg = cgs.get(cid)
        if cg is None:
            continue
        d = km_between(job["_loc"], cg["_loc"])
        sc = score_match({"needs": job["needs"], "wage_max": job.get("wage_max"),
                          "wage_unit": job.get("wage_unit"), "distance_km": d}, cg)
        snap = {"job": job_pub, "caregiver": _public(cg, {"caregiver_id"}),
                "distance_km": d, "score": sc}
        h = snapshot_hash(snap)
        hit = supabase.table("ai_applicant_summaries").select("summary_text") \
            .eq("job_post_id", job_post_id).eq("caregiver_id", cid).eq("is_active", True) \
            .eq("input_hash", h).eq("prompt_version", PROMPT_VERSION) \
            .eq("model_name", model).limit(1).execute().data
        if hit:
            results.append(_result(cid, sc, hit[0]["summary_text"], "ai", True))
        else:
            todo.append((cid, snap, h, sc))

    def run(t):
        return call_llm(build_messages(t[1], labels), provider=provider,
                        temperature=0.2, max_tokens=500)

    with ThreadPoolExecutor(max_workers=5) as ex:
        outs = list(ex.map(run, todo))

    for (cid, snap, h, sc), r in zip(todo, outs):
        log_id = log_ai_call(r, "applicant_summary", PROMPT_VERSION,
                             request_meta={"job_post_id": job_post_id, "caregiver_id": cid})
        if not r.success or not r.text:
            results.append(_result(cid, sc, None, "rule_only", False))
            continue
        text = clean_output(r.text)
        _save(job_post_id, cid, provider, model, snap, h, text, sc, log_id)
        results.append(_result(cid, sc, text, "ai", False))

    return sorted(results, key=lambda x: -x["fit_score"])
