# Tag categories (codes from case_types). Unlisted codes count as daily_life.
SPECIALIZED = {
    "bedridden", "feeding_tube", "suction", "dementia", "parkinson", "stroke_rehab",
    "wound_care", "urinary_catheter", "oxygen", "diabetes_care", "palliative",
}
HOUSEHOLD = {"meal_prep", "light_housework"}

# Priority weights (sum = 100): specialized > distance > wage > general > experience
WEIGHTS = {"specialized": 40, "distance": 20, "wage": 15, "general": 15, "experience": 10}

# How much each comfort level counts toward a need
LEVEL_CREDIT = {"experienced": 1.0, "trained": 0.8, "willing_to_learn": 0.2, "not_comfortable": 0.0}

DISTANCE_ZERO_KM = 30     # at or beyond this distance, distance score = 0
EXPERIENCE_FULL_YEARS = 5
