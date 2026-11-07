from supabase import create_client, Client
from app.config import settings

# service_role client: bypasses RLS, so every endpoint must check the user itself
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)
