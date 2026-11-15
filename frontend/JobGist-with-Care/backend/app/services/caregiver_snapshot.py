import hashlib, json
from app.db import supabase

def build_caregiver_snapshot(caregiver_id: str) -> dict | None:
    """Exact data sent to the LLM. No name, contact, address or wage."""
    d = (supabase.table("caregiver_details")
         .select("gender,birth_year,care_roles,years_experience,work_arrangements,"
                 "home_province,home_district,max_travel_km,available_from,extra_answers")
         .eq("caregiver_id", caregiver_id).maybe_single().execute())
    if not d or not d.data:
        return None
    data = d.data
    for k in ("care_roles", "work_arrangements"):          # stable order → stable hash
        data[k] = sorted(data.get(k) or [])

    skills = (supabase.table("caregiver_case_skills")
              .select("case_type,comfort_level,case_types(label_th)")
              .eq("caregiver_id", caregiver_id).execute().data)
    certs = (supabase.table("certificates")
             .select("cert_type,title,issuer,issued_date,verification_status")
             .eq("caregiver_id", caregiver_id).execute().data)

    data["skills"] = sorted(
        [{"case_type": s["case_type"], "label_th": s["case_types"]["label_th"],
          "comfort_level": s["comfort_level"]} for s in skills],
        key=lambda s: s["case_type"])
    data["certificates"] = sorted(certs, key=lambda c: (c["cert_type"], c["title"]))
    return data

def snapshot_hash(snapshot: dict) -> str:
    raw = json.dumps(snapshot, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()
