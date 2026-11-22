"""
Admin dashboard data: AI usage, tokens and cost from ai_logs.
ai_logs has RLS with no policies (service_role only), so the frontend reads it through here.
"""
from collections import defaultdict
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
    }

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
