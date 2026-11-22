"""
AI Lab — lets the team see exactly how a match is scored and what the LLM receives.

Inputs come from the request, not from real profiles, so it is safe for demos and
advisor Q&A. The only write is the ai_logs row (is_eval_run = true) when the LLM is called. The LLM is only called when `call_llm` is true (costs tokens),
and only for signed-in users.
"""
from typing import Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.auth import CurrentUser, get_current_user
from app.llm.client import call_llm
from app.matching.config import SPECIALIZED, WEIGHTS, LEVEL_CREDIT, DISTANCE_ZERO_KM, EXPERIENCE_FULL_YEARS
from app.matching.score import score_match
from app.prompts import applicant_summary as AS, worker_profile as WP
from app.services.ai_log import log_ai_call
from app.services.match_data import load_labels
from app.services.worker_profile import clean_output

router = APIRouter(prefix="/ai/lab", tags=["ai-lab"])

Level = Literal["experienced", "trained", "willing_to_learn", "not_comfortable"]
Tags = list[str]

class LabJob(BaseModel):
    needs: list[str] = []
    wage_min: int | None = None
    wage_max: int | None = None
    wage_unit: Literal["month", "day", "hour"] = "month"
    work_arrangement: Literal["daily", "live_in"] = "daily"
    patient_description: str = Field("", max_length=1000)
    custom_tags: Tags = Field(default_factory=list, max_length=8)

class LabCaregiver(BaseModel):
    skills: dict[str, Level] = {}
    care_roles: list[str] = ["caregiver"]
    years_experience: int = Field(0, ge=0, le=60)
    has_verified_cert: bool = False
    expected_wage_min: int | None = None
    expected_wage_max: int | None = None
    wage_unit: Literal["month", "day", "hour"] = "month"
    gender: str | None = None
    work_arrangements: list[str] = ["daily"]
    home_district: str | None = None
    home_province: str | None = None
    max_travel_km: int | None = None
    custom_tags: Tags = Field(default_factory=list, max_length=8)

class LabIn(BaseModel):
    job: LabJob
    caregiver: LabCaregiver
    distance_km: float | None = Field(None, ge=0, le=1000)
    call_llm: bool = False
    provider: Literal["typhoon", "openai"] | None = None

def _llm(messages, provider, max_tokens, feature, prompt_version):
    r = call_llm(messages, provider=provider, temperature=0.2, max_tokens=max_tokens)
    # logged as an eval run so lab tests never mix with real-user costs
    log_ai_call(r, feature, prompt_version, is_eval_run=True, request_meta={"source": "ai_lab"})
    return {"success": r.success, "text": clean_output(r.text) if r.text else None,
            "provider": r.provider, "model": r.model_name, "latency_ms": r.latency_ms,
            "input_tokens": r.input_tokens, "output_tokens": r.output_tokens,
            "cost_thb": r.cost_thb, "error": r.error_message}

@router.get("/config")
def config(_: CurrentUser = Depends(get_current_user)):
    """The scoring constants, so the UI can explain them without hard-coding a copy."""
    return {"weights": WEIGHTS, "level_credit": LEVEL_CREDIT, "specialized": sorted(SPECIALIZED),
            "distance_zero_km": DISTANCE_ZERO_KM, "experience_full_years": EXPERIENCE_FULL_YEARS,
            "prompt_versions": {"applicant_summary": AS.PROMPT_VERSION, "worker_profile": WP.PROMPT_VERSION}}

@router.post("/applicant-summary")
def lab_applicant_summary(body: LabIn, _: CurrentUser = Depends(get_current_user)):
    j, c = body.job.model_dump(), body.caregiver.model_dump()
    sc = score_match({"needs": j["needs"], "wage_max": j["wage_max"], "wage_unit": j["wage_unit"],
                      "distance_km": body.distance_km}, c)
    snap = {"job": j, "caregiver": c, "distance_km": body.distance_km, "score": sc}
    messages = AS.build_messages(snap, load_labels())
    out = {"score": sc, "prompt_version": AS.PROMPT_VERSION, "messages": messages}
    if body.call_llm:
        out["llm"] = _llm(messages, body.provider, 500, "applicant_summary", AS.PROMPT_VERSION)
    return out

@router.post("/worker-profile")
def lab_worker_profile(body: LabIn, _: CurrentUser = Depends(get_current_user)):
    c, labels = body.caregiver, load_labels()
    snap = {"gender": c.gender, "care_roles": c.care_roles, "years_experience": c.years_experience,
            "skills": [{"case_type": k, "label_th": labels.get(k, k), "comfort_level": v}
                       for k, v in sorted(c.skills.items())],
            "certificates": [{"title": "ใบรับรองผู้ดูแล", "issuer": None, "verification_status": "verified"}]
                            if c.has_verified_cert else [],
            "work_arrangements": c.work_arrangements, "home_district": c.home_district,
            "home_province": c.home_province, "max_travel_km": c.max_travel_km,
            "custom_tags": c.custom_tags}
    messages = WP.build_messages(snap)
    out = {"prompt_version": WP.PROMPT_VERSION, "messages": messages}
    if body.call_llm:
        out["llm"] = _llm(messages, body.provider, 800, "worker_profile", WP.PROMPT_VERSION)
    return out
