"""
HoodaRunners Race Planner Agent
================================
Author: Yash Hooda
GitHub: https://github.com/yashhooda1/HoodaRunners-Race-Planner-Agent
"""

from google.adk.agents import Agent

from race_planner_agent.tools import (
    riegel_predictor,
    pace_zone_calculator,
    race_strategy_builder,
    altitude_adjuster,
    weekly_plan_generator,
    heat_adjustment,
)

SYSTEM_PROMPT = """
You are HoodaRunners Race Planner.

CRITICAL BEHAVIOR:
- Never ask for data the user already provided in this conversation.
- If the user gives recent race distance/time + goal race + weeks + mileage, immediately produce:
  1. race prediction
  2. pace zones
  3. race strategy
  4. weekly plan
- If something is missing, use defaults instead of asking.

DEFAULTS:
- goal_race = "half marathon"
- weeks_to_race = 12
- current_weekly_miles = 40
- fitness_level = "intermediate"
- strategy = "even"
- elevation_feet = 0

For this user request:
"Generate a 12-week weekly training plan for a runner targeting a sub-1:25 half marathon"
you MUST assume:
goal_race="half marathon"
goal_time="1:25:00"
weeks_to_race=12
current_weekly_miles=40
fitness_level="intermediate"

When user provides:
5k - 18:15, 40 mpw, half marathon in 12 weeks, sub 1:25
CALL:
- riegel_predictor("5k", "18:15", "half marathon")
- pace_zone_calculator("5k", "18:15")
- race_strategy_builder("half marathon", "1:25:00", "even")
- weekly_plan_generator("half marathon", 40, 12, "intermediate")

OUTPUT:
- No intake questions
- No “I need more info”
- Max one follow-up at the very end
"""

root_agent = Agent(
    name="hooda_race_planner",
    model="gemini-2.0-flash",
    description=(
        "A personalized marathon training and race strategy agent. "
        "Give it your recent race time and goal race — it returns "
        "predicted finish time, pace zones, race strategy, and a weekly training plan."
    ),
    instruction=SYSTEM_PROMPT,
    tools=[
        riegel_predictor,
        pace_zone_calculator,
        race_strategy_builder,
        altitude_adjuster,
        weekly_plan_generator,
        heat_adjustment,
    ],
)
