import sys
from app.db import supabase

cid = sys.argv[1]   # caregiver user id (from GET /me)
supabase.table("caregiver_details").upsert({
    "caregiver_id": cid, "gender": "female", "birth_year": 1985,
    "care_roles": ["caregiver"], "years_experience": 6,
    "work_arrangements": ["daily", "live_in"],
    "home_province": "กรุงเทพมหานคร", "home_district": "บางแค",
    "max_travel_km": 15, "is_visible": True,
}).execute()
supabase.table("caregiver_case_skills").upsert([
    {"caregiver_id": cid, "case_type": "bedridden",    "comfort_level": "experienced"},
    {"caregiver_id": cid, "case_type": "feeding_tube", "comfort_level": "trained"},
    {"caregiver_id": cid, "case_type": "dementia",     "comfort_level": "willing_to_learn"},
]).execute()
supabase.table("certificates").insert({
    "caregiver_id": cid, "cert_type": "caregiver_training",
    "title": "หลักสูตรผู้ดูแลผู้สูงอายุ 420 ชั่วโมง", "issuer": "กรมอนามัย",
    "file_path": f"{cid}/test.pdf",
}).execute()
print("seeded", cid)
