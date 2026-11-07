from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from app.auth import CurrentUser, require_role
from app.services.applicant_summary import generate_summaries
from app.services.worker_profile import generate_worker_profile

router = APIRouter(prefix="/ai", tags=["ai"])

class WorkerProfileOut(BaseModel):
    profile_id: str
    output_text: str
    cached: bool

class SummariesIn(BaseModel):
    job_post_id: str
    caregiver_ids: list[str] = Field(min_length=1, max_length=20)

class SummaryOut(BaseModel):
    caregiver_id: str
    fit_score: float
    breakdown: dict
    missing_specialized: list[str]
    summary_text: str | None      # None when AI failed → show score only
    source: str                   # 'ai' | 'rule_only'
    cached: bool

class SummariesOut(BaseModel):
    summaries: list[SummaryOut]

# plain `def`: FastAPI runs it in a thread so blocking LLM calls don't freeze the server
@router.post("/worker-profile", response_model=WorkerProfileOut)
def worker_profile(user: CurrentUser = Depends(require_role("caregiver"))):
    return generate_worker_profile(user.id)

@router.post("/applicant-summaries", response_model=SummariesOut)
def applicant_summaries(body: SummariesIn, user: CurrentUser = Depends(require_role("family"))):
    return {"summaries": generate_summaries(user.id, body.job_post_id, body.caregiver_ids)}
