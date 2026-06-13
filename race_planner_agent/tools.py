"""
HoodaRunners Race Planner — Tools
ADK 2.x compatible: tools are plain Python functions, no @tool decorator needed.
ADK auto-discovers them from the tools=[] list in Agent().
"""


# ── HELPER: seconds <-> mm:ss conversion ─────────────────────────────────────
def _seconds_to_mmss(seconds: float) -> str:
    total = int(round(seconds))
    m, s = divmod(total, 60)
    return f"{m}:{s:02d}"


def _mmss_to_seconds(pace_str: str) -> float:
    parts = pace_str.strip().split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    raise ValueError(f"Invalid pace format: {pace_str}. Expected M:SS (e.g. 6:30)")


def _time_to_seconds(time_str: str) -> float:
    parts = time_str.strip().split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    raise ValueError(f"Invalid time format: {time_str}. Expected H:MM:SS or M:SS")


def _seconds_to_hmmss(seconds: float) -> str:
    total = int(round(seconds))
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


RACE_DISTANCES_MI = {
    "mile": 1.0, "1 mile": 1.0,
    "5k": 3.10686, "8k": 4.97097,
    "5 mile": 5.0, "10k": 6.21371,
    "15k": 9.32057,
    "half marathon": 13.1094, "half": 13.1094,
    "marathon": 26.2188, "50k": 31.0686,
}


def _parse_distance(distance_str: str) -> float:
    key = distance_str.lower().strip()
    if key in RACE_DISTANCES_MI:
        return RACE_DISTANCES_MI[key]
    try:
        return float(key)
    except ValueError:
        raise ValueError(f"Unknown distance '{distance_str}'. Supported: {', '.join(RACE_DISTANCES_MI.keys())}")


# ── TOOL 1: Riegel Predictor ──────────────────────────────────────────────────
def riegel_predictor(known_distance: str, known_time: str, goal_distance: str) -> dict:
    """
    Predicts a race finish time using the Riegel formula: T2 = T1 x (D2/D1)^1.06.

    Args:
        known_distance: Distance of known result e.g. 'half marathon', '5K', '10K'.
        known_time: Finish time for known distance e.g. '1:24:31' or '18:15'.
        goal_distance: Target race distance to predict e.g. 'marathon', '10K'.

    Returns:
        dict with predicted_time, predicted_pace, and formula used.
    """
    d1 = _parse_distance(known_distance)
    d2 = _parse_distance(goal_distance)
    t1 = _time_to_seconds(known_time)
    t2 = t1 * ((d2 / d1) ** 1.06)
    pace_per_mile = t2 / d2
    return {
        "predicted_time": _seconds_to_hmmss(t2),
        "predicted_pace": _seconds_to_mmss(pace_per_mile) + "/mi",
        "known_distance": known_distance,
        "known_time": known_time,
        "goal_distance": goal_distance,
        "formula": f"T2 = {known_time} x ({d2:.4f} / {d1:.4f}) ^ 1.06",
    }


# ── TOOL 2: Pace Zone Calculator ─────────────────────────────────────────────
def pace_zone_calculator(race_distance: str, race_time: str) -> dict:
    """
    Computes 5 training pace zones from a recent race result.

    Args:
        race_distance: Recent race distance e.g. 'half marathon', '5K'.
        race_time: Finish time e.g. '1:24:31' or '18:15'.

    Returns:
        dict with 5 pace zones (easy through speed) and recommended use for each.
    """
    d = _parse_distance(race_distance)
    t = _time_to_seconds(race_time)
    rp = t / d

    def zone(lo: float, hi: float) -> str:
        return f"{_seconds_to_mmss(rp / hi)}–{_seconds_to_mmss(rp / lo)}/mi"

    return {
        "race_pace": _seconds_to_mmss(rp) + "/mi",
        "zone_1_easy":    {"pace": zone(0.76, 0.82), "use": "Recovery runs, long run base"},
        "zone_2_aerobic": {"pace": zone(0.83, 0.88), "use": "Easy aerobic base building (most of your miles)"},
        "zone_3_tempo":   {"pace": zone(0.89, 0.92), "use": "Tempo runs, cruise intervals"},
        "zone_4_vo2max":  {"pace": zone(0.93, 1.00), "use": "Track intervals, 5K-10K effort"},
        "zone_5_speed":   {"pace": zone(1.01, 1.10), "use": "Strides, hill sprints, 800m repeats"},
        "note": "Zone 2 should be 75-80% of your weekly volume. Zone 4-5 max 1-2 sessions/week.",
    }


# ── TOOL 3: Race Strategy Builder ────────────────────────────────────────────
def race_strategy_builder(race_distance: str, goal_time: str, strategy: str = "even") -> dict:
    """
    Builds a mile-by-mile race execution plan for a target goal time.

    Args:
        race_distance: Target race distance e.g. 'marathon', 'half marathon', '10K'.
        goal_time: Goal finish time e.g. '2:55:42' or '1:24:31'.
        strategy: Pacing strategy - 'even', 'negative', or 'positive'. Default is even.

    Returns:
        dict with per-mile splits, average pace, and strategy coaching notes.
    """
    d_miles = _parse_distance(race_distance)
    total_sec = _time_to_seconds(goal_time)
    avg_pace = total_sec / d_miles
    num_miles = int(d_miles)
    partial = d_miles - num_miles
    splits = []
    cumulative = 0.0

    for mile in range(1, num_miles + 1):
        progress = mile / d_miles
        if strategy == "negative":
            factor = 1.02 if progress <= 0.5 else 0.98
        elif strategy == "positive":
            factor = max(0.97, 1.03 - (0.06 * progress))
        else:
            factor = 1.0
        mile_pace = avg_pace * factor
        cumulative += mile_pace
        splits.append({"mile": mile, "pace": _seconds_to_mmss(mile_pace) + "/mi", "split": _seconds_to_hmmss(cumulative)})

    if partial > 0.05:
        last_pace = avg_pace * (0.97 if strategy in ("negative", "positive") else 1.0)
        cumulative += last_pace * partial
        splits.append({"mile": f"{num_miles + 1} (partial {partial:.2f} mi)", "pace": _seconds_to_mmss(last_pace) + "/mi", "split": _seconds_to_hmmss(cumulative)})

    notes = {
        "even": "Lock in and stay controlled. Mental toughness wins miles 18-22.",
        "negative": "Start 2% conservative. Passing people in the second half is a massive energy boost.",
        "positive": "Risky — banking time often leads to blowups. Trust the data instead.",
    }
    return {
        "race_distance": race_distance,
        "goal_time": goal_time,
        "strategy": strategy,
        "average_pace": _seconds_to_mmss(avg_pace) + "/mi",
        "mile_splits": splits,
        "coaching_note": notes.get(strategy, ""),
    }


# ── TOOL 4: Altitude Adjuster ─────────────────────────────────────────────────
def altitude_adjuster(sea_level_pace: str, elevation_feet: int) -> dict:
    """
    Adjusts a sea-level pace for running at altitude. Uses 3% slowdown per 1000ft above 3000ft.

    Args:
        sea_level_pace: Target pace at sea level e.g. '6:50' (M:SS per mile).
        elevation_feet: Race or training elevation in feet e.g. 5400 for Boulder CO.

    Returns:
        dict with adjusted pace, slowdown percentage, and acclimation guidance.
    """
    base_sec = _mmss_to_seconds(sea_level_pace)
    if elevation_feet <= 3000:
        return {
            "sea_level_pace": sea_level_pace + "/mi",
            "adjusted_pace": sea_level_pace + "/mi",
            "elevation_feet": elevation_feet,
            "slowdown_pct": "0%",
            "note": "Under 3,000 ft — no significant pace adjustment needed.",
        }
    excess_ft = elevation_feet - 3000
    slowdown = min((excess_ft / 1000) * 0.03, 0.12)
    adjusted_sec = base_sec * (1 + slowdown)
    acclimation_days = min(14, max(5, int(elevation_feet / 500)))
    return {
        "sea_level_pace": sea_level_pace + "/mi",
        "adjusted_pace": _seconds_to_mmss(adjusted_sec) + "/mi",
        "elevation_feet": elevation_feet,
        "slowdown_pct": f"{slowdown * 100:.1f}%",
        "acclimation_days": acclimation_days,
        "acclimation_note": f"Arrive {acclimation_days}+ days before race for full acclimatisation, or arrive within 24 hours and run on fresh legs.",
        "boulder_example": f"Boulder CO (5,400 ft): {sea_level_pace}/mi at sea level -> {_seconds_to_mmss(adjusted_sec)}/mi adjusted",
    }


# ── TOOL 5: Weekly Plan Generator ────────────────────────────────────────────
def weekly_plan_generator(goal_race: str, current_weekly_miles: float, weeks_to_race: int, fitness_level: str = "intermediate") -> dict:
    """
    Generates a 7-day training week snapshot following the 80/20 rule.

    Args:
        goal_race: Target race distance e.g. 'marathon', 'half marathon'.
        current_weekly_miles: Current average weekly mileage e.g. 45.0.
        weeks_to_race: Number of weeks until race day e.g. 16.
        fitness_level: Runner tier - 'beginner', 'intermediate', or 'advanced'. Default intermediate.

    Returns:
        dict with a full 7-day plan, mileage targets, and phase guidance.
    """
    peak_targets = {
        "marathon":      {"beginner": 40, "intermediate": 55, "advanced": 70},
        "half marathon": {"beginner": 30, "intermediate": 45, "advanced": 55},
    }
    goal_key = "marathon" if "marathon" in goal_race.lower() else "half marathon"
    level = fitness_level.lower() if fitness_level.lower() in ("beginner", "intermediate", "advanced") else "intermediate"
    peak_miles = peak_targets.get(goal_key, peak_targets["marathon"])[level]
    build_weeks = max(1, weeks_to_race - 3)
    increment = max(0, (peak_miles - current_weekly_miles) / build_weeks)
    this_week = round(min(current_weekly_miles + increment * (build_weeks / 2), peak_miles), 1)

    plan = {
        "monday":    {"type": "Rest or cross-train",       "miles": 0,                              "note": "Active recovery. Swim, bike, or yoga."},
        "tuesday":   {"type": "Easy aerobic run",          "miles": round(this_week * 0.14, 1),     "note": "Zone 2. Conversational pace."},
        "wednesday": {"type": "Tempo run",                 "miles": round(this_week * 0.16, 1),     "note": "2mi warmup + tempo miles + 2mi cooldown."},
        "thursday":  {"type": "Easy aerobic run",          "miles": round(this_week * 0.12, 1),     "note": "Easy. Focus on cadence (~180 spm)."},
        "friday":    {"type": "Strides or rest",           "miles": round(this_week * 0.08, 1),     "note": "4-6 x 20-sec strides at mile effort."},
        "saturday":  {"type": "Track intervals",           "miles": round(this_week * 0.18, 1),     "note": "8 x 800m at 5K-10K effort, 90-sec jog recovery."},
        "sunday":    {"type": "Long run",                  "miles": round(this_week * 0.32, 1),     "note": "Easy pace. Last 3-5 miles at goal marathon pace."},
    }
    return {
        "goal_race": goal_race,
        "fitness_level": level,
        "weeks_to_race": weeks_to_race,
        "this_week_target_miles": this_week,
        "peak_mileage_target": peak_miles,
        "taper_starts_week": weeks_to_race - 3,
        "weekly_plan": plan,
        "total_planned_miles": round(sum(v["miles"] for v in plan.values()), 1),
        "principle": "80% easy (Zone 1-2), 20% quality (Zone 3-5). Never increase more than 10%/week.",
    }


# ── TOOL 6: Heat Adjustment ───────────────────────────────────────────────────
def heat_adjustment(goal_pace: str, temperature_f: float, humidity_pct: float) -> dict:
    """
    Calculates heat-adjusted pace using the WBGT heat index model.

    Args:
        goal_pace: Target pace in ideal conditions e.g. '6:50' (M:SS per mile).
        temperature_f: Ambient temperature in Fahrenheit e.g. 85.0.
        humidity_pct: Relative humidity as a percentage e.g. 72.0.

    Returns:
        dict with adjusted pace, heat index, risk level, and race-day guidance.
    """
    base_sec = _mmss_to_seconds(goal_pace)
    T, RH = temperature_f, humidity_pct
    hi = round(-42.379 + 2.04901523*T + 10.14333127*RH - 0.22475541*T*RH
               - 0.00683783*T**2 - 0.05481717*RH**2 + 0.00122874*T**2*RH
               + 0.00085282*T*RH**2 - 0.00000199*T**2*RH**2, 1)

    if hi < 65:
        slowdown, risk, guidance = 0.00, "Low",                     "Ideal conditions. Execute your plan."
    elif hi < 75:
        slowdown, risk, guidance = 0.02, "Low-moderate",            "Slightly warm. Minor adjustment, hydrate well."
    elif hi < 85:
        slowdown, risk, guidance = 0.04, "Moderate",                "Warm. Slow 3-5%. Prioritize hydration over pace."
    elif hi < 95:
        slowdown, risk, guidance = 0.07, "High",                    "Hot. Run by effort not pace. Slow 6-8%. Ice and shade critical."
    elif hi < 105:
        slowdown, risk, guidance = 0.12, "Very High",               "Very hot. Slow 10-15%. Consider dropping to shorter distance."
    else:
        slowdown, risk, guidance = 0.20, "Extreme — consider DNS",  "Dangerous. Cancellation territory. Survival shuffle only if you must run."

    return {
        "goal_pace": goal_pace + "/mi",
        "temperature_f": temperature_f,
        "humidity_pct": humidity_pct,
        "heat_index_f": hi,
        "risk_level": risk,
        "slowdown_pct": f"{slowdown * 100:.0f}%",
        "adjusted_pace": _seconds_to_mmss(base_sec * (1 + slowdown)) + "/mi",
        "guidance": guidance,
        "hydration_note": "4-6 oz every 15-20 min in heat. Salt tabs if sweating heavily.",
    }