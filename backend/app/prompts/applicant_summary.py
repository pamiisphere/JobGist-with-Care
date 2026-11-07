from app.prompts.worker_profile import ROLE_TH, COMFORT_TH, ARR_TH

PROMPT_VERSION = "as-v2"
UNIT_TH = {"month": "บาท/เดือน", "day": "บาท/วัน", "hour": "บาท/ชม."}

SYSTEM_PROMPT = """คุณช่วยครอบครัวที่กำลังหาผู้ดูแลผู้ป่วย สรุปว่าผู้ดูแลคนนี้เหมาะกับงานนี้แค่ไหน

กฎ:
1. ใช้เฉพาะข้อมูลที่ได้รับ ห้ามเดา ห้ามเติม
2. ระดับทักษะต้องเขียนตามที่ให้มาตรงตัว "ผ่านการอบรม" ห้ามเขียนว่า "มีประสบการณ์"
3. ทุกข้อใน "สิ่งที่ยังขาด" ต้องอยู่ในหัวข้อ "ควรคุยเพิ่ม" ครบทุกข้อ
4. ห้ามให้คะแนนเอง
5. ห้ามใส่ชื่อ เบอร์โทร หรือที่อยู่
6. ตอบตามรูปแบบในตัวอย่างเท่านั้น

ตัวอย่าง
งาน: ไป-กลับรายวัน งบ 600 บาท/วัน
สิ่งที่ตรงกับความต้องการ: ภาวะสมองเสื่อม / อัลไซเมอร์ (มีประสบการณ์)
สิ่งที่ยังขาด: จัดยา / ดูแลการทานยา (ยังไม่มี)
ผู้ดูแล: ผู้ช่วยพยาบาล (PN) ประสบการณ์รวม 4 ปี ใบรับรองที่ตรวจสอบแล้ว: มี
ค่าจ้างที่ต้องการ: 550 บาท/วัน (อยู่ในงบ)
ระยะทาง: 12 กม.
คะแนนรวม: 71/100

ผลลัพธ์:
สรุป: มีประสบการณ์ดูแลผู้ป่วยสมองเสื่อม ค่าจ้างอยู่ในงบ แต่ยังไม่มีทักษะจัดยา
จุดเด่น:
- ภาวะสมองเสื่อม / อัลไซเมอร์: มีประสบการณ์
- ผู้ช่วยพยาบาล (PN) ประสบการณ์รวม 4 ปี มีใบรับรองที่ตรวจสอบแล้ว
- ค่าจ้าง 550 บาท/วัน อยู่ในงบ
ควรคุยเพิ่ม:
- ยังไม่มีทักษะจัดยา / ดูแลการทานยา
- ระยะทาง 12 กม. ควรถามเรื่องการเดินทาง"""

def _wage(lo, hi, unit):
    if lo is None and hi is None:
        return "ไม่ระบุ"
    rng = f"{lo:,}-{hi:,}" if lo is not None and hi is not None else f"{(lo if lo is not None else hi):,}"
    return f"{rng} {UNIT_TH.get(unit, '')}".strip()

def build_messages(snap: dict, labels: dict) -> list[dict]:
    j, c, sc = snap["job"], snap["caregiver"], snap["score"]
    lab = lambda code: labels.get(code, code)
    lvl = lambda code: COMFORT_TH.get(c["skills"].get(code, ""), "ยังไม่มี")
    missing = sc["missing_specialized"] + sc.get("missing_general", [])
    matched = [n for n in j["needs"] if n not in missing]
    wage_note = {15: " (อยู่ในงบ)", 7.5: " (เกินงบเล็กน้อย หรือไม่ระบุ)", 0: " (เกินงบ)"}.get(sc["breakdown"]["wage"], "")

    L = [f"งาน: {ARR_TH.get(j['work_arrangement'], j['work_arrangement'])} "
         f"งบ {_wage(j.get('wage_min'), j.get('wage_max'), j.get('wage_unit'))}",
         f"ครอบครัวเล่าอาการ: {j.get('patient_description') or '-'}",
         "สิ่งที่ตรงกับความต้องการ: " + (", ".join(f"{lab(n)} ({lvl(n)})" for n in matched) or "ไม่มี"),
         "สิ่งที่ยังขาด: " + (", ".join(f"{lab(n)} ({lvl(n)})" for n in missing) or "ไม่มี"),
         "ผู้ดูแล: " + (", ".join(ROLE_TH.get(r, r) for r in c["care_roles"]) or "ไม่ระบุบทบาท")
         + f" ประสบการณ์รวม {c.get('years_experience') or 0} ปี"
         + f" ใบรับรองที่ตรวจสอบแล้ว: {'มี' if c['has_verified_cert'] else 'ไม่มี'}",
         f"ค่าจ้างที่ต้องการ: {_wage(c.get('expected_wage_min'), c.get('expected_wage_max'), c.get('wage_unit'))}{wage_note}",
         f"ระยะทาง: {snap['distance_km']} กม." if snap["distance_km"] is not None else "ระยะทาง: ไม่ทราบ",
         f"คะแนนรวม: {sc['total']}/100"]
    return [{"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "\n".join(L) + "\n\nผลลัพธ์:"}]
