"""
Admin dashboard data.
- /admin/ai-stats   : AI calls from ai_logs (Objective 2: success rate, latency per feature x model).
- /admin/eval-stats : platform_reviews + task_events + matches (Objective 1: ratings, task completion).
These tables are service_role only (or per-user RLS), so the frontend reads them through here.
"""
from collections import defaultdict
from statistics import median
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from app.auth import CurrentUser, require_admin
from app.db import supabase

router = APIRouter(prefix="/admin", tags=["admin"])

COLS = ("id,feature,provider,model_name,prompt_version,input_tokens,output_tokens,"
        "cost_thb,latency_ms,success,error_message,is_eval_run,request_meta,created_at")

def _fetch(since: str) -> list[dict]:
    rows, start, page = [], 0, 1000
    while True:                                   # PostgREST caps each response at 1000 rows
        batch = (supabase.table("ai_logs").select(COLS).gte("created_at", since)
                 .order("created_at", desc=True).range(start, start + page - 1).execute().data)
        rows += batch
        if len(batch) < page or len(rows) >= 20000:
            return rows
        start += page

def _summary(rows: list[dict]) -> dict:
    ok = [r for r in rows if r["success"]]
    cost = sum(float(r["cost_thb"] or 0) for r in rows)
    return {
        "calls": len(rows), "success": len(ok),
        "success_rate": round(len(ok) / len(rows), 4) if rows else None,
        "tokens_in": sum(r["input_tokens"] or 0 for r in rows),
        "tokens_out": sum(r["output_tokens"] or 0 for r in rows),
        "cost_thb": round(cost, 4),
        # cost per usable output: failed calls still cost money, so divide total cost by successes
        "cost_per_output_thb": round(cost / len(ok), 5) if ok else None,
        "avg_latency_ms": round(sum(r["latency_ms"] or 0 for r in ok) / len(ok)) if ok else None,
        "median_latency_ms": _pct([r["latency_ms"] for r in ok if r["latency_ms"] is not None], 50),
        "p95_latency_ms": _pct([r["latency_ms"] for r in ok if r["latency_ms"] is not None], 95),
    }

def _pct(vals: list[float], p: int):
    """Nearest-rank percentile; None when empty."""
    if not vals:
        return None
    v = sorted(vals)
    k = max(0, min(len(v) - 1, -(-p * len(v) // 100) - 1))
    return round(v[k], 1)

@router.get("/ai-stats")
def ai_stats(days: int = Query(30, ge=1, le=365),
             include_eval: bool = False,
             _: CurrentUser = Depends(require_admin)):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    all_rows = _fetch(since)
    rows = all_rows if include_eval else [r for r in all_rows if not r["is_eval_run"]]

    groups = defaultdict(list)
    for r in rows:
        groups[(r["feature"], r["model_name"], r["prompt_version"])].append(r)
    by_group = sorted(({"feature": f, "model_name": m, "prompt_version": v, **_summary(g)}
                       for (f, m, v), g in groups.items()),
                      key=lambda x: (x["feature"], x["model_name"], x["prompt_version"]))

    daily = defaultdict(list)
    for r in rows:
        daily[r["created_at"][:10]].append(r)
    by_day = [{"date": d, **_summary(daily[d])} for d in sorted(daily)]

    recent = [{k: r[k] for k in ("id", "created_at", "feature", "model_name", "prompt_version",
                                  "input_tokens", "output_tokens", "cost_thb", "latency_ms",
                                  "success", "error_message", "is_eval_run")}
              for r in rows[:50]]

    return {"days": days, "include_eval": include_eval, "eval_calls_hidden":
            0 if include_eval else len(all_rows) - len(rows),
            "totals": _summary(rows), "by_group": by_group, "by_day": by_day, "recent": recent}


# ---------------------------------------------------------------------------
# Objective 1: platform evaluation
# ---------------------------------------------------------------------------
QUESTIONS = ("ease_of_use", "profile_clarity", "summary_accuracy", "tag_usefulness", "overall_satisfaction")

def _all(table: str, cols: str, since: str | None = None, ts: str = "created_at") -> list[dict]:
    rows, start, page = [], 0, 1000
    while True:
        q = supabase.table(table).select(cols)
        if since:
            q = q.gte(ts, since)
        batch = q.range(start, start + page - 1).execute().data
        rows += batch
        if len(batch) < page or len(rows) >= 20000:
            return rows
        start += page

def _qstat(vals: list) -> dict:
    v = [x for x in vals if x is not None]
    return {"n": len(v),
            "mean": round(sum(v) / len(v), 2) if v else None,
            "pct_4_or_more": round(sum(1 for x in v if x >= 4) / len(v), 4) if v else None}

def _minutes(a: str | None, b: str | None):
    if not a or not b:
        return None
    d = (datetime.fromisoformat(b.replace("Z", "+00:00")) - datetime.fromisoformat(a.replace("Z", "+00:00")))
    m = d.total_seconds() / 60
    return m if m >= 0 else None

@router.get("/eval-stats")
def eval_stats(days: int = Query(30, ge=1, le=365), _: CurrentUser = Depends(require_admin)):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    profiles = _all("profiles", "id,role,created_at", since)
    role_of = {p["id"]: p["role"] for p in profiles}
    signup_at = {p["id"]: p["created_at"] for p in profiles}

    # --- ratings ---------------------------------------------------------
    reviews = _all("platform_reviews", "user_id,role,ease_of_use,profile_clarity,summary_accuracy,"
                   "tag_usefulness,overall_satisfaction,comment,created_at", since)
    for r in reviews:                       # older rows have no role column filled
        r["role"] = r.get("role") or role_of.get(r["user_id"])

    questions = {}
    for q in QUESTIONS:
        questions[q] = {"all": _qstat([r.get(q) for r in reviews]),
                        "caregiver": _qstat([r.get(q) for r in reviews if r["role"] == "caregiver"]),
                        "family": _qstat([r.get(q) for r in reviews if r["role"] == "family"])}

    # model whose text this user actually saw
    reviewer_ids = list({r["user_id"] for r in reviews})
    model_of: dict[str, str] = {}
    if reviewer_ids:
        wp = (supabase.table("ai_worker_profiles").select("caregiver_id,model_name,created_at")
              .in_("caregiver_id", reviewer_ids).eq("is_active", True).execute().data)
        for w in sorted(wp, key=lambda x: x["created_at"]):
            model_of[w["caregiver_id"]] = w["model_name"]
        jobs = (supabase.table("job_posts").select("id,family_id")
                .in_("family_id", reviewer_ids).execute().data)
        fam_of_job = {j["id"]: j["family_id"] for j in jobs}
        if fam_of_job:
            sm = (supabase.table("ai_applicant_summaries").select("job_post_id,model_name,created_at")
                  .in_("job_post_id", list(fam_of_job)).eq("is_active", True).execute().data)
            for x in sorted(sm, key=lambda x: x["created_at"]):
                model_of[fam_of_job[x["job_post_id"]]] = x["model_name"]

    by_model = defaultdict(list)
    for r in reviews:
        by_model[model_of.get(r["user_id"], "ไม่ทราบ")].append(r)
    by_model_out = [{"model": m, "n": len(g),
                     "overall_mean": _qstat([r.get("overall_satisfaction") for r in g])["mean"],
                     "profile_clarity_mean": _qstat([r.get("profile_clarity") for r in g])["mean"],
                     "summary_accuracy_mean": _qstat([r.get("summary_accuracy") for r in g])["mean"]}
                    for m, g in sorted(by_model.items())]

    comments = sorted(({"role": r["role"], "comment": r["comment"], "created_at": r["created_at"],
                        "overall": r.get("overall_satisfaction")}
                       for r in reviews if (r.get("comment") or "").strip()),
                      key=lambda x: x["created_at"], reverse=True)[:30]

    # --- task completion -------------------------------------------------
    events = _all("task_events", "user_id,role,step,started_at,completed_at", since, ts="completed_at")
    done = defaultdict(dict)                 # step -> user_id -> event
    for e in events:
        done[e["step"]][e["user_id"]] = e

    first_match: dict[str, str] = {}
    mm = _all("matches", "job_post_id,caregiver_id,matched_at", since, ts="matched_at")
    mm = [m for m in mm if m["matched_at"]]
    if mm:
        jids = list({m["job_post_id"] for m in mm})
        fam = {j["id"]: j["family_id"] for j in
               supabase.table("job_posts").select("id,family_id").in_("id", jids).execute().data}
        for m in mm:
            for uid in (m["caregiver_id"], fam.get(m["job_post_id"])):
                if uid and (uid not in first_match or m["matched_at"] < first_match[uid]):
                    first_match[uid] = m["matched_at"]

    tasks = []
    plan = {"caregiver": ("signup", "onboarding_form", "mutual_match"),
            "family": ("signup", "post_job", "mutual_match")}
    for role, steps in plan.items():
        users = [u for u, r in role_of.items() if r == role]
        for step in steps:
            if step == "mutual_match":
                ok = [u for u in users if u in first_match]
                mins = [_minutes(signup_at[u], first_match[u]) for u in ok]
            else:
                ok = [u for u in users if u in done[step]]
                mins = [_minutes(done[step][u]["started_at"], done[step][u]["completed_at"]) for u in ok]
            mins = [m for m in mins if m is not None]
            tasks.append({"step": step, "role": role, "eligible": len(users), "completed": len(ok),
                          "completion_rate": round(len(ok) / len(users), 4) if users else None,
                          "median_minutes": round(median(mins), 1) if mins else None,
                          "p90_minutes": _pct(mins, 90)})

    return {"days": days,
            "reviews": {"total": len(reviews),
                        "by_role": {k: sum(1 for r in reviews if r["role"] == k) for k in ("caregiver", "family")},
                        "questions": questions, "by_model": by_model_out, "comments": comments},
            "tasks": tasks}
