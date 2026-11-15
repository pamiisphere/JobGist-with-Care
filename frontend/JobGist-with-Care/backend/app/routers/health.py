from fastapi import APIRouter, Depends
from app.auth import CurrentUser, get_current_user

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)):
    return user
