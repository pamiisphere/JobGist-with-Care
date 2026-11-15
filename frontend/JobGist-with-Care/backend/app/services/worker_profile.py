from fastapi import HTTPException
from app.config import settings
from app.db import supabase
from app.llm.client import call_llm
from app.prompts.worker_profile import PROMPT_VERSION, build_messages
from app.services.ai_log import log_ai_call
from app.services.caregiver_snapshot import build_caregiver_snapshot, snapshot_hash

def clean_output(text: str) -> str:
    """Strip trailing spaces per line and drop blank lines."""
    return "\n".join(l.strip() for l in text.strip().splitlines() if l.strip())


def generate_worker_profile(caregiver_id: str, provider: str | None = None) -> dict:
    provider = provider or settings.default_provider
    model = settings.typhoon_model if provider == "typhoon" else settings.openai_model

    snap = build_caregiver_snapshot(caregiver_id)
    if snap is None:
        raise HTTPException(404, "Caregiver form not found — fill in the form first")
    h = snapshot_hash(snap)

    # Cache: same input + same prompt + same model → reuse, no LLM cost
    cached = (supabase.table("ai_worker_profiles").select("id,output_text")
              .eq("caregiver_id", caregiver_id).eq("is_active", True)
              .eq("input_hash", h).eq("prompt_version", PROMPT_VERSION)
              .eq("model_name", model).limit(1).execute().data)
    if cached:
        return {"profile_id": cached[0]["id"], "output_text": cached[0]["output_text"], "cached": True}

    r = call_llm(build_messages(snap), provider=provider, temperature=0.2, max_tokens=600)
    log_id = log_ai_call(r, "worker_profile", PROMPT_VERSION,
                         request_meta={"caregiver_id": caregiver_id})
    if not r.success or not r.text:
        raise HTTPException(502, "AI generation failed, please try again")

    # Unique index allows ONE active row: deactivate the old one FIRST, then insert
    (supabase.table("ai_worker_profiles").update({"is_active": False})
     .eq("caregiver_id", caregiver_id).eq("is_active", True).execute())
    row = supabase.table("ai_worker_profiles").insert({
        "caregiver_id": caregiver_id, "provider": provider, "model_name": model,
        "prompt_version": PROMPT_VERSION, "input_snapshot": snap, "input_hash": h,
        "output_text": clean_output(r.text), "is_active": True, "ai_log_id": log_id,
    }).execute().data[0]
    return {"profile_id": row["id"], "output_text": row["output_text"], "cached": False}
