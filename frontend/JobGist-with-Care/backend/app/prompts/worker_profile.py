from datetime import date
import json

PROMPT_VERSION = "wp-v3"   # bump whenever the prompt text changes

ROLE_TH = {"caregiver": "ผู้ดูแลผู้สูงอายุ (CG)", "nurse_aide": "พนักงานผู้ช่วยเหลือคนไข้ (NA)",
           "practical_nurse": "ผู้ช่วยพยาบาล (PN)", "informal": "ดูแลแบบไม่เป็นทางการ เช่น ดูแลคนในครอบครัว"}
COMFORT_TH = {"experienced": "มีประสบการณ์", "trained": "ผ่านการอบรม", "willing_to_learn": "ยินดีเรียนรู้"}
ARR_TH = {"daily": "ไป-กลับรายวัน", "live_in": "อยู่ประจำ (ค้างคืน)"}
GENDER_TH = {"female": "หญิง", "male": "ชาย", "other": "อื่นๆ"}

SYSTEM_PROMPT = """คุณเป็นผู้ช่วยเขียนโปรไฟล์ผู้ดูแลผู้สูงอายุและผู้ป่วย ให้ครอบครัวอ่านเข้าใจง่าย

กฎ:
1. ใช้เฉพาะข้อมูลที่ได้รับ ห้ามเติมคำบรรยายที่ไม่มีในข้อมูล
2. จำนวนปีประสบการณ์เป็นประสบการณ์รวม ห้ามเขียนผูกกับเคสใดเคสหนึ่ง
3. ทักษะเคสทุกข้อในข้อมูลต้องอยู่ในหัวข้อ "ประสบการณ์และทักษะ" ครบทุกข้อ พร้อมระดับตามที่ให้มา
4. คุณวุฒิ ให้คัดลอกบรรทัดใบรับรองจากข้อมูลตามเดิม
5. ห้ามใส่ชื่อ เบอร์โทร หรือที่อยู่
6. ตอบตามรูปแบบในตัวอย่างเท่านั้น ห้ามมีข้อความอื่น

ตัวอย่าง
ข้อมูลผู้ดูแล:
เพศ: ชาย
อายุ: ประมาณ 35 ปี
บทบาท: พนักงานผู้ช่วยเหลือคนไข้ (NA)
ประสบการณ์ทำงานดูแล: 3 ปี
ทักษะเฉพาะเคส:
- ฟื้นฟูผู้ป่วยหลอดเลือดสมอง: มีประสบการณ์
- จัดยา / ดูแลการทานยา: ผ่านการอบรม
- ดูดเสมหะ: ยินดีเรียนรู้
ใบรับรอง:
- ยังไม่ได้แนบใบรับรอง
รูปแบบงานที่รับ: ไป-กลับรายวัน
พื้นที่: เมืองนนทบุรี นนทบุรี เดินทางได้ไม่เกิน 10 กม.

ผลลัพธ์:
สรุป: ผู้ช่วยเหลือคนไข้ (NA) ประสบการณ์งานดูแล 3 ปี มีประสบการณ์ฟื้นฟูผู้ป่วยหลอดเลือดสมอง
ประสบการณ์และทักษะ:
- ฟื้นฟูผู้ป่วยหลอดเลือดสมอง: มีประสบการณ์
- จัดยา / ดูแลการทานยา: ผ่านการอบรม
- ดูดเสมหะ: ยินดีเรียนรู้
คุณวุฒิ:
- ยังไม่ได้แนบใบรับรอง
รูปแบบงาน: รับงานไป-กลับรายวัน แถวเมืองนนทบุรี เดินทางได้ไม่เกิน 10 กม."""

def build_messages(s: dict) -> list[dict]:
    lines = []
    if s.get("gender") in GENDER_TH:
        lines.append(f"เพศ: {GENDER_TH[s['gender']]}")
    if s.get("birth_year"):
        lines.append(f"อายุ: ประมาณ {date.today().year - s['birth_year']} ปี")
    if s.get("care_roles"):
        lines.append("บทบาท: " + ", ".join(ROLE_TH.get(r, r) for r in s["care_roles"]))
    if s.get("years_experience") is not None:
        lines.append(f"ประสบการณ์ทำงานดูแล: {s['years_experience']} ปี")

    skills = [x for x in s.get("skills", []) if x["comfort_level"] in COMFORT_TH]
    if skills:
        lines.append("ทักษะเฉพาะเคส:")
        lines += [f"- {x['label_th']}: {COMFORT_TH[x['comfort_level']]}" for x in skills]

    lines.append("ใบรับรอง:")
    if s.get("certificates"):
        for c in s["certificates"]:
            status = "ตรวจสอบแล้ว" if c["verification_status"] == "verified" else "แนบใบรับรอง รอตรวจสอบ"
            issuer = f" โดย {c['issuer']}" if c.get("issuer") else ""
            lines.append(f"- {c['title']}{issuer} ({status})")
    else:
        lines.append("- ยังไม่ได้แนบใบรับรอง")

    if s.get("work_arrangements"):
        lines.append("รูปแบบงานที่รับ: " + ", ".join(ARR_TH.get(a, a) for a in s["work_arrangements"]))
    area = " ".join(x for x in [s.get("home_district"), s.get("home_province")] if x)
    if area:
        lines.append(f"พื้นที่: {area}" + (f" เดินทางได้ไม่เกิน {s['max_travel_km']} กม." if s.get("max_travel_km") else ""))
    if s.get("extra_answers"):
        lines.append("ข้อมูลเพิ่มเติม: " + json.dumps(s["extra_answers"], ensure_ascii=False))

    return [{"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "ข้อมูลผู้ดูแล:\n" + "\n".join(lines) + "\n\nผลลัพธ์:"}]
