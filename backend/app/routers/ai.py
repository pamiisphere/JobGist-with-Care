from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.auth import CurrentUser, require_role
from app.services.worker_profile import generate_worker_profile

router = APIRouter(prefix="/ai", tags=["ai"])

class WorkerProfileOut(BaseModel):
    profile_id: str
    output_text: str
    cached: bool

# plain `def` (not async): FastAPI runs it in a thread, so the blocking LLM call
# doesn't freeze other requests
@router.post("/worker-profile", response_model=WorkerProfileOut)
def worker_profile(user: CurrentUser = Depends(require_role("caregiver"))):
    return generate_worker_profile(user.id)
