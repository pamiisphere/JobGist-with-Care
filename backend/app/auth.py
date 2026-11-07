from dataclasses import dataclass
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import supabase

bearer = HTTPBearer()

@dataclass
class CurrentUser:
    id: str
    role: str  # 'caregiver' | 'family'

def get_current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> CurrentUser:
    try:
        res = supabase.auth.get_user(cred.credentials)
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    if not res or not res.user:
        raise HTTPException(401, "Invalid or expired token")

    prof = supabase.table("profiles").select("role").eq("id", res.user.id).maybe_single().execute()
    if not prof or not prof.data:
        raise HTTPException(403, "Profile not found")
    return CurrentUser(id=res.user.id, role=prof.data["role"])

def require_role(role: str):
    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role != role:
            raise HTTPException(403, f"Only {role} can do this")
        return user
    return checker
