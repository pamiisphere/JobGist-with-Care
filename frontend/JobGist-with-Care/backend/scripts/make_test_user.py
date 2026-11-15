import sys
from supabase import create_client
from app.config import settings

email, role = sys.argv[1], sys.argv[2]   # role: caregiver | family
password = "Test1234!"
sb = create_client(settings.supabase_url, settings.supabase_service_role_key)

try:
    sb.auth.admin.create_user({
        "email": email, "password": password, "email_confirm": True,
        "user_metadata": {"role": role, "display_name": f"test {role}"},
    })
    print("created", email)
except Exception as e:
    print("create skipped:", e)

res = sb.auth.sign_in_with_password({"email": email, "password": password})
print("\nACCESS TOKEN:\n" + res.session.access_token)
