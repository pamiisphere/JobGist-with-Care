import hmac, time
from dataclasses import dataclass
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db import supabase

bearer = HTTPBearer()

@dataclass
class CurrentUser:
    id: str
    role: str  # 'caregiver' | 'family'
    email: str = ""

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
    return CurrentUser(id=res.user.id, role=prof.data["role"], email=(res.user.email or "").lower())

def require_role(role: str):
    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role != role:
            raise HTTPException(403, f"Only {role} can do this")
        return user
    return checker

def require_admin(request: Request) -> CurrentUser:
    """Admin = correct X-Admin-User / X-Admin-Password headers, or a signed-in user in ADMIN_EMAILS."""
    from app.config import settings
    user_h, pass_h = request.headers.get("x-admin-user"), request.headers.get("x-admin-password")
    if user_h is not None or pass_h is not None:
        ok = bool(settings.admin_password) \
            and hmac.compare_digest((user_h or "").encode(), settings.admin_username.encode()) \
            and hmac.compare_digest((pass_h or "").encode(), settings.admin_password.encode())
        if not ok:
            time.sleep(1)                       # slow down password guessing
            raise HTTPException(403, "Wrong admin username or password")
        return CurrentUser(id="admin", role="admin", email="")

    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "Admin login required")
    user = get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=auth[7:]))
    allowed = {e.strip().lower() for e in settings.admin_emails.split(",") if e.strip()}
    if user.email not in allowed:
        raise HTTPException(403, "Admins only")
    return user
