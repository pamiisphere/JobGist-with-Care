import sys
from app.db import supabase

family_id, caregiver_id = sys.argv[1], sys.argv[2]
job = supabase.table("job_posts").insert({
    "family_id": family_id, "title": "หาผู้ดูแลคุณพ่อติดเตียง",
    "patient_description": "คุณพ่ออายุ 78 ติดเตียงหลังเส้นเลือดในสมองตีบ ให้อาหารทางสายยาง ช่วงหลังมือสั่นและกลางคืนชอบตื่น",
    "patient_age": 78, "patient_gender": "male", "work_arrangement": "live_in",
    "province": "กรุงเทพมหานคร", "district": "ภาษีเจริญ",
    "wage_min": 15000, "wage_max": 18000, "wage_unit": "month", "status": "open",
}).execute().data[0]
jid = job["id"]
supabase.table("job_post_case_needs").insert([
    {"job_post_id": jid, "case_type": "bedridden"},
    {"job_post_id": jid, "case_type": "feeding_tube"},
    {"job_post_id": jid, "case_type": "fall_risk"},
]).execute()
supabase.table("job_post_locations").upsert({"job_post_id": jid, "lat": 13.7140, "lng": 100.4370}).execute()
supabase.table("caregiver_locations").upsert({"caregiver_id": caregiver_id, "lat": 13.6960, "lng": 100.4090}).execute()
supabase.table("caregiver_details").update({"expected_wage_min": 16000, "expected_wage_max": 18000,
                                            "wage_unit": "month"}).eq("caregiver_id", caregiver_id).execute()
print("JOB ID:", jid)
