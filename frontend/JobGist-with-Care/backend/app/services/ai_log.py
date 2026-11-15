from app.db import supabase
from app.llm.client import LLMResult

def log_ai_call(r: LLMResult, feature: str, prompt_version: str,
                is_eval_run: bool = False, eval_input_id: str | None = None,
                request_meta: dict | None = None) -> str | None:
    """Insert one row into ai_logs and return its id (None if logging failed)."""
    row = {
        "feature": feature,                 # worker_profile | applicant_summary | other
        "provider": r.provider,
        "model_name": r.model_name,
        "prompt_version": prompt_version,
        "input_tokens": r.input_tokens,
        "output_tokens": r.output_tokens,
        "cost_usd": round(r.cost_usd, 8) if r.cost_usd is not None else None,
        "usd_thb_rate": r.usd_thb_rate,
        "cost_thb": round(r.cost_thb, 6) if r.cost_thb is not None else None,
        "latency_ms": r.latency_ms,
        "success": r.success,
        "error_message": r.error_message,
        "is_eval_run": is_eval_run,
        "eval_input_id": eval_input_id,
        "request_meta": request_meta or {},
    }
    try:
        res = supabase.table("ai_logs").insert(row).execute()
        return res.data[0]["id"]
    except Exception as e:
        print("ai_logs insert failed:", e)   # never break the user request over logging
        return None
