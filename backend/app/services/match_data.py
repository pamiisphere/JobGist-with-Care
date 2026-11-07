import math
from app.db import supabase

def km_between(a: dict, b: dict) -> float | None:
    if None in (a.get("lat"), a.get("lng"), b.get("lat"), b.get("lng")):
        return None
    la1, lo1, la2, lo2 = map(math.radians, (a["lat"], a["lng"], b["lat"], b["lng"]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return round(6371 * 2 * math.asin(min(1.0, math.sqrt(h))), 1)

def load_labels() -> dict[str, str]:
    return {r["code"]: r["label_th"] for r in supabase.table("case_types").select("code,label_th").execute().data}

def load_job(job_id: str) -> dict | None:
    j = (supabase.table("job_posts")
         .select("id,family_id,title,patient_description,patient_age,patient_gender,work_arrangement,"
                 "province,district,wage_min,wage_max,wage_unit,preferred_caregiver_gender")
         .eq("id", job_id).maybe_single().execute())
    if not j or not j.data:
        return None
    job = j.data
    needs = (supabase.table("job_post_case_needs").select("case_type")
             .eq("job_post_id", job_id).eq("is_required", True).execute().data)
    job["needs"] = sorted(n["case_type"] for n in needs)
    loc = supabase.table("job_post_locations").select("lat,lng").eq("job_post_id", job_id).maybe_single().execute()
    job["_loc"] = loc.data if loc and loc.data else {}      # private: never sent to LLM or client
    return job

def load_caregivers(ids: list[str]) -> dict[str, dict]:
    if not ids:
        return {}
    det = (supabase.table("caregiver_details")
           .select("caregiver_id,gender,birth_year,care_roles,years_experience,work_arrangements,"
                   "home_province,home_district,expected_wage_min,expected_wage_max,wage_unit")
           .in_("caregiver_id", ids).eq("is_visible", True).execute().data)
    out = {d["caregiver_id"]: {**d, "care_roles": sorted(d.get("care_roles") or []),
                               "skills": {}, "has_verified_cert": False, "_loc": {}} for d in det}
    if not out:
        return {}
    keys = list(out)
    for s in supabase.table("caregiver_case_skills").select("caregiver_id,case_type,comfort_level").in_("caregiver_id", keys).execute().data:
        out[s["caregiver_id"]]["skills"][s["case_type"]] = s["comfort_level"]
    for c in (supabase.table("certificates").select("caregiver_id")
              .in_("caregiver_id", keys).eq("verification_status", "verified").execute().data):
        out[c["caregiver_id"]]["has_verified_cert"] = True
    for l in supabase.table("caregiver_locations").select("caregiver_id,lat,lng").in_("caregiver_id", keys).execute().data:
        out[l["caregiver_id"]]["_loc"] = l
    return out
