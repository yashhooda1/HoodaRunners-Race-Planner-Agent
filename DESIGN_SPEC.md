# HoodaRunners Race Planner Agent — Design Spec

## Overview
A personalized marathon training and race strategy agent built with Google ADK,
deployed to GCP Agent Runtime (Gemini Enterprise Agent Platform).

**Author:** Yash Hooda  
**GitHub:** https://github.com/yashhooda1/hooda-race-planner  
**Portfolio:** https://yashhooda1.vercel.app  
**Deploy target:** GCP Agent Runtime (Cloud Run + Agent Engine)  
**Model:** Gemini 2.5 Flash  

---

## Agent Purpose
Give any runner their race time + goal race and receive:
1. Predicted finish time (Riegel formula)
2. Training pace zones (5 zones, Daniels methodology)
3. Mile-by-mile race strategy (even / negative / positive split)
4. Altitude adjustment (critical for Boulder, Denver, Colorado Springs)
5. Heat/humidity pace correction (WBGT model)
6. Weekly training plan snapshot (80/20 rule, peak mileage target)

---

## Tools

| Tool | Purpose | Key Inputs |
|---|---|---|
| `riegel_predictor` | Predicts race time from known result | known_distance, known_time, goal_distance |
| `pace_zone_calculator` | Computes 5 training zones | race_distance, race_time |
| `race_strategy_builder` | Mile-by-mile race plan | race_distance, goal_time, strategy |
| `altitude_adjuster` | Adjusts paces for elevation | sea_level_pace, elevation_feet |
| `weekly_plan_generator` | 7-day training snapshot | goal_race, current_weekly_miles, weeks_to_race |
| `heat_adjustment` | Slows paces for heat + humidity | goal_pace, temperature_f, humidity_pct |

---

## Example Conversation

**User:** I ran a half marathon in 1:24:31 last month. I'm targeting the 2026 Boulderthon
Marathon (Boulder, CO). What's my predicted marathon time and what paces should I train at?

**Agent flow:**
1. Call `riegel_predictor(known_distance="half marathon", known_time="1:24:31", goal_distance="marathon")`
   → Predicted: 2:55:42, avg pace ~6:42/mi
2. Call `pace_zone_calculator(race_distance="half marathon", race_time="1:24:31")`
   → Zones: Easy 8:02–8:37/mi, Tempo 7:00–7:15/mi, VO2max 6:27–6:57/mi
3. Call `altitude_adjuster(sea_level_pace="6:42", elevation_feet=5400)`
   → Boulder adjusted: 6:42 → ~7:01/mi (~4.4% slowdown)
4. Call `race_strategy_builder(race_distance="marathon", goal_time="2:55:42", strategy="negative")`
   → Per-mile splits with negative split pacing

---

## Deployment

```bash
# 1. Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable APIs
gcloud services enable aiplatform.googleapis.com

# 3. Create GCS staging bucket
gsutil mb -l us-central1 gs://YOUR_BUCKET_NAME

# 4. Set env vars
cp .env.example .env
# Edit .env with your project ID and bucket name

# 5. Test locally
uv run adk web

# 6. Deploy to Agent Runtime
uv run adk deploy agent_engine \
  --env_file .env \
  --region=us-central1 \
  race_planner_agent
```

---

## Safety Constraints
- Agent does NOT provide medical advice
- Always recommends consulting a doctor before starting a training program
- Explicitly notes when conditions (extreme heat, altitude) pose health risks
- Race strategy tool includes DNS ("Did Not Start") guidance for dangerous conditions

---

## Stack
- **Language:** Python 3.11+
- **Framework:** Google ADK (`google-adk`)
- **Model:** Gemini 2.5 Flash (`gemini-2.5-flash-preview-05-20`)
- **Deploy:** GCP Agent Runtime via `adk deploy agent_engine`
- **Package manager:** `uv`
- **Infra:** Terraform auto-provisioned by agents-cli
