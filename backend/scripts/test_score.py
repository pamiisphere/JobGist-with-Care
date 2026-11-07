from app.matching.score import score_match

job = {"needs": ["parkinson", "fall_risk"], "wage_max": 18000, "wage_unit": "month"}
cands = {
    "A ทำพาร์กินสันเป็น แต่อยู่ไกล 25 กม.": (25, {"skills": {"parkinson": "experienced"},
        "expected_wage_min": 17000, "wage_unit": "month", "years_experience": 5, "has_verified_cert": True}),
    "B ไม่มีทักษะพาร์กินสัน อยู่ใกล้ 2 กม.": (2, {"skills": {"fall_risk": "experienced"},
        "expected_wage_min": 15000, "wage_unit": "month", "years_experience": 6, "has_verified_cert": False}),
    "C ยินดีเรียนรู้พาร์กินสัน อยู่ 5 กม.": (5, {"skills": {"parkinson": "willing_to_learn", "fall_risk": "trained"},
        "expected_wage_min": 16000, "wage_unit": "month", "years_experience": 2, "has_verified_cert": False}),
}
results = sorted(((score_match({**job, "distance_km": d}, cg), name) for name, (d, cg) in cands.items()),
                 key=lambda x: -x[0]["total"])
for r, name in results:
    print(f"{r['total']:5.1f}  {name}\n       {r['breakdown']}  ขาด: {r['missing_specialized']}")
