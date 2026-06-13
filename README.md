# 🏃 HoodaRunners Race Planner Agent

> A personalized marathon training + race strategy AI agent built with **Google ADK**,
> deployed to **GCP Agent Runtime** (Gemini Enterprise Agent Platform).

**Author:** [Yash Hooda](https://yashhooda1.vercel.app) — Data/AI Engineer & Competitive Runner  
**Portfolio:** [yashhooda1.vercel.app](https://yashhooda1.vercel.app)  
**Model:** Gemini 2.5 Flash  
**Deploy:** GCP Agent Runtime via `agents-cli`

---

## What It Does

Give the agent your race history and goal — it gives you a complete race plan:

| Tool | Output |
|---|---|
| `riegel_predictor` | Predicted finish time for any distance |
| `pace_zone_calculator` | 5 training zones (Easy → Speed) |
| `race_strategy_builder` | Mile-by-mile splits (even / negative / positive split) |
| `altitude_adjuster` | Pace corrections for elevation (Boulder = 5,400 ft) |
| `heat_adjustment` | Pace corrections for heat + humidity (Texas summers) |
| `weekly_plan_generator` | 7-day training plan with mileage targets |

### Example

```
User: I ran a half marathon in 1:24:31. I'm targeting the 2026 Boulderthon Marathon. 
      What's my predicted time and what paces should I train at?

Agent:
  → Predicted marathon time: 2:55:42 (6:42/mi avg)
  → Boulder altitude adjustment: +4.4% → 7:01/mi adjusted goal pace
  → Training zones: Easy 8:02-8:37/mi | Tempo 7:00-7:15/mi | VO2max 6:27-6:57/mi
  → Race strategy: Negative split plan, mile-by-mile splits
  → Weekly plan: 55 mi/week peak | Tuesday tempo | Saturday track | Sunday long run
```

---

## Tech Stack

```
Language:       Python 3.11+
Framework:      Google ADK (google-adk)
Model:          Gemini 2.5 Flash
Deploy target:  GCP Agent Runtime (Gemini Enterprise Agent Platform)
Tooling:        agents-cli + uv
Infrastructure: Terraform (auto-provisioned by agents-cli)
```

---

## Local Setup

### Prerequisites
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) — `pip install uv`
- Google Cloud account (free $300 credits for new accounts)
- `gcloud` CLI — [install here](https://cloud.google.com/sdk/docs/install)

### 1. Clone + install

```bash
git clone https://github.com/yashhooda1/hooda-race-planner.git
cd hooda-race-planner

# Install dependencies with uv
uv sync
```

### 2. GCP auth + project

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable aiplatform.googleapis.com
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env — add your GOOGLE_CLOUD_PROJECT and STAGING_BUCKET
```

### 4. Run locally

```bash
uv run adk web
# Opens http://localhost:8080 — full agent playground in your browser
```

---

## Deploy to GCP Agent Runtime

```bash
# Create a GCS staging bucket (one-time)
gsutil mb -l us-central1 gs://YOUR_BUCKET_NAME

# Deploy — provisions Cloud Run + Agent Runtime automatically
uv run adk deploy agent_engine \
  --env_file .env \
  --region=us-central1 \
  race_planner_agent

# Output: a live HTTPS endpoint for your agent
```

Deployment provisions via Terraform under the hood — no manual GCP console setup needed.

---

## Using agents-cli (optional — AI-assisted build flow)

agents-cli lets you use Claude Code, Gemini CLI, or Codex to scaffold + deploy via natural language:

```bash
# Install agents-cli
uvx google-agents-cli setup

# Scaffold via natural language prompt in your AI coding tool:
# "Use the google-agents-cli-scaffold skill to create a marathon planning agent
#  with tools for pace prediction, zone calculation, and race strategy"
```

See [agents-cli docs](https://adk.dev/deploy/agent-runtime/agents-cli/) for full guide.

---

## Project Structure

```
hooda-race-planner/
├── race_planner_agent/
│   ├── __init__.py      # Package init
│   ├── agent.py         # ADK Agent definition + system prompt
│   └── tools.py         # 6 ADK tools (riegel, zones, strategy, altitude, heat, plan)
├── DESIGN_SPEC.md       # Agent design document
├── requirements.txt     # Python dependencies
├── pyproject.toml       # uv project config
├── .env.example         # Environment variable template
├── .gitignore
└── README.md
```

---

## About the Creator

**Yash Hooda** is a Data Engineer transitioning into AI Engineering, building portfolio
projects without a master's degree using certifications + real deployments.

- 🏃 Runner: 5K 18:15 | HM 1:24:31 | Training for 2026 Boulderthon Marathon
- 💼 Stack: PySpark, Databricks, Microsoft Fabric, Python, GCP, LangChain, RAG
- 🌐 Portfolio: [yashhooda1.vercel.app](https://yashhooda1.vercel.app)
- 📂 GitHub: [github.com/yashhooda1](https://github.com/yashhooda1)

---

## License
Apache 2.0
