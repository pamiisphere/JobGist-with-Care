from app.matching.config import (SPECIALIZED, WEIGHTS, LEVEL_CREDIT,
                                 DISTANCE_ZERO_KM, EXPERIENCE_FULL_YEARS)

def _coverage(needs: list[str], skills: dict[str, str]) -> float:
    """0..1 average credit over needs; no needs → 1 (nothing to miss)."""
    if not needs:
        return 1.0
    return sum(LEVEL_CREDIT.get(skills.get(n, ""), 0.0) for n in needs) / len(needs)

def score_match(job: dict, cg: dict) -> dict:
    """
    job: {needs: [codes], wage_max, wage_unit, distance_km}
    cg:  {skills: {code: level}, expected_wage_min, wage_unit,
          years_experience, has_verified_cert}
    Returns total 0-100, per-criterion breakdown, and specialized needs not covered.
    """
    w = WEIGHTS
    spec_needs = [n for n in job["needs"] if n in SPECIALIZED]
    gen_needs = [n for n in job["needs"] if n not in SPECIALIZED]

    specialized = w["specialized"] * _coverage(spec_needs, cg["skills"])
    general = w["general"] * _coverage(gen_needs, cg["skills"])

    d = job.get("distance_km")
    distance = w["distance"] / 2 if d is None else w["distance"] * max(0.0, 1 - d / DISTANCE_ZERO_KM)

    jmax, cmin = job.get("wage_max"), cg.get("expected_wage_min")
    if jmax is None or cmin is None or job.get("wage_unit") != cg.get("wage_unit"):
        wage = w["wage"] / 2                      # unknown → neutral
    elif cmin <= jmax:
        wage = w["wage"]
    elif cmin <= jmax * 1.1:
        wage = w["wage"] / 2                      # up to 10% over budget → negotiable
    else:
        wage = 0.0

    years = min(cg.get("years_experience") or 0, EXPERIENCE_FULL_YEARS)
    experience = w["experience"] * (0.6 * years / EXPERIENCE_FULL_YEARS
                                    + 0.4 * bool(cg.get("has_verified_cert")))

    breakdown = {k: round(v, 1) for k, v in {
        "specialized": specialized, "distance": distance, "wage": wage,
        "general": general, "experience": experience}.items()}
    missing = [n for n in spec_needs
               if LEVEL_CREDIT.get(cg["skills"].get(n, ""), 0) < LEVEL_CREDIT["trained"]]
    missing_general = [n for n in gen_needs
                       if LEVEL_CREDIT.get(cg["skills"].get(n, ""), 0) < LEVEL_CREDIT["trained"]]
    return {"total": round(sum(breakdown.values()), 1), "breakdown": breakdown,
            "missing_specialized": missing, "missing_general": missing_general}
