<div align="center">

# 🏛️ MPLADS AI Monitor
### AI-Powered Anomaly Detection & Audit Surveillance Platform
**Smart India Hackathon 2026 · Problem Statement SIH26102**

*Ministry of Statistics and Programme Implementation (MoSPI)*

[![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E?style=flat-square&logo=scikitlearn)](https://scikit-learn.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docker.com)

</div>

---

## 📌 What Is This?

**MPLADS AI Monitor** is a production-grade, end-to-end platform that monitors the **Members of Parliament Local Area Development Scheme (MPLADS)** — a Government of India programme under which each Member of Parliament recommends ₹5 Crore/year worth of development works in their constituency.

The platform automatically ingests data from the **MoSPI eSAKSHI portal**, runs a **multi-tier anomaly detection engine**, scores every project on a **0–100 risk scale**, and presents findings through a clean, auditor-friendly dashboard — enabling government officials to prioritize field verifications, detect fund inefficiencies, and export investigation dockets.

> **⚖️ Legal Disclaimer:** All risk scores are *statistical indicators for human review*. They do **not** constitute fraud findings. Physical verification by competent authorities is mandatory before any administrative action.

---

## 🌐 Website Features

### 1 · National Overview Dashboard
The home screen of the platform. Gives a real-time, bird's-eye view of the entire MPLADS programme.

| Feature | Description |
|---|---|
| **Fund KPI Tiles** | Total Allocated Limit (₹ Crores), Recorded Expenditure, Fund Utilization %, and total Delayed Works — updated every time data is refreshed |
| **Risk Distribution Donut Chart** | Visualizes how 5,000+ projects are spread across LOW / MODERATE / HIGH / CRITICAL risk bands at a national level |
| **Quarterly Trends Bar Chart** | Tracks sanctioned vs expended amounts across financial quarters to reveal absorption velocity patterns |
| **Priority Investigation Table** | Shows the top 8 highest-risk projects with one-click audit access |
| **Live Data Badge** | Confirms the data source (MoSPI eSAKSHI) and the timestamp of the last pipeline sync |

---

### 2 · High-Risk Audit Investigation Queue
A ranked, filterable list of all projects requiring human scrutiny — sorted by composite AI risk score.

| Feature | Description |
|---|---|
| **Multi-Dimension Filtering** | Filter simultaneously by State, Risk Band (Low/Moderate/High/Critical), and "Overdue Only" |
| **Column-Level Sorting** | Click any column header (ID, Allocated Amount, Risk Score) to re-rank the queue instantly |
| **Paginated Results** | 20 projects per page with Previous/Next navigation and total count indicator |
| **One-Click Audit** | Every row has an "Audit" button that opens the full project inspection card |
| **Overdue Flagging** | Projects breaching the 365-day MPLADS baseline are highlighted in red |

---

### 3 · State & Regional Diagnostics
Breaks down MPLADS performance at the state level, enabling geographic prioritization of audit resources.

| Feature | Description |
|---|---|
| **State Comparison Bar Chart** | Top 15 states plotted side-by-side on Allocated vs Expended ₹ Crores — absorption gaps visible at a glance |
| **State Selector Dropdown** | Choose any state to load a dedicated analysis panel |
| **State KPI Summary** | Total Works, Allocated Funds, Expenditure, and Fund Utilization % for the selected state |
| **Top Flagged Projects in State** | Table of the highest-risk works within the selected state with direct audit links |

---

### 4 · Project Deep-Dive Inspection Card
The most detailed view — a full risk breakdown for any individual MPLADS work.

| Feature | Description |
|---|---|
| **SVG Risk Gauge** | Circular animated gauge showing the composite 0–100 risk score, color-coded by severity band |
| **6-Factor Score Breakdown** | Horizontal progress bars showing the contribution of: Financial Overrun, Project Delay, Expenditure Velocity, Duplicate Detection, Peer Deviation, and ML Anomaly Score |
| **Scheme Metadata Table** | MP Name, IDA (Implementing District Authority), Allocated Amount, Recorded Expenditure, Recommendation Date, Project Age (days), District Peer Median Amount, and Peer Deviation % |
| **Anomaly Evidence Panel** | Lists each specific rule trigger (R001–R011) and ML flag with severity, textual explanation, and raw JSON evidence |
| **Automated Auditor Briefing** | AI-generated human-readable narrative paragraph describing the risk profile and what to verify |
| **Generate Audit Case Button** | Opens the official printable investigation docket for this project |

---

### 5 · Official Audit Investigation Card (Printable)
Generates a formal, printable Audit Investigation Card for any flagged project.

| Feature | Description |
|---|---|
| **Docket Reference Number** | Auto-generated unique reference: `MPLADS-AUD-{ID}-{YEAR}` |
| **Executive Case Summary** | Concise narrative of why this project was flagged |
| **Detected Risk Indicators** | Structured list of all anomaly findings with severity labels |
| **Recommended Auditor Actions** | Specific, actionable verification steps (check MB, Sanction Order, site photos) |
| **Sign-Off Blocks** | Pre-formatted signature fields for the Investigating Auditor and District Authority |
| **Print / Save as PDF** | Browser print dialog integration for paper or digital archiving |
| **Statutory Disclaimer** | Mandatory legal notice included on every card |

---

### 6 · Natural Language Audit Search
Query the entire MPLADS database using plain English — no SQL or technical knowledge required.

| Feature | Description |
|---|---|
| **Plain English Queries** | Type phrases like *"Show high-risk delayed works in Maharashtra"* or *"Critical projects in Tamil Nadu above 20 lakh"* |
| **Safe Keyword → Filter Translation** | Queries are parsed into typed filter parameters (state, risk band, status, amount threshold). No SQL is ever generated or executed — injection-safe by design |
| **Query Interpretation Display** | Shows the filter expression your query was translated into (e.g., `state = MAHARASHTRA AND risk = HIGH or CRITICAL`) |
| **Preset Query Chips** | 6 one-click sample queries to help new users get started immediately |
| **Result Table with Audit Links** | Every search result links directly to its full inspection card |
| **Empty State Handling** | Clear guidance when no projects match the search criteria |

---

### 7 · MP Portfolio & Peer Analytics
Profile any Member of Parliament's MPLADS utilization track record.

| Feature | Description |
|---|---|
| **MP Name Search** | Partial name search across all MPs in the dataset |
| **Portfolio KPIs** | Total Works Recommended, Total Allocated (₹ Cr), Total Expended (₹ Cr), Completion % |
| **Average Risk Score** | The portfolio-level mean risk score for all works recommended by this MP |
| **Top Risk Projects** | Table of the 5 highest-risk works recommended by the MP with direct audit links |
| **State & Constituency** | Auto-detected primary state and constituency for the searched MP |

---

### 8 · Live Data Refresh (New Project Ingestion)
Ingest new MPLADS data (including projects recommended today) and re-score everything without restarting the server.

| Feature | Description |
|---|---|
| **Pipeline Mode Selection** | Choose between Synthetic Demo Data (offline) or Live eSAKSHI Portal fetch (internet required) |
| **Step-by-Step Workflow Guide** | Visual 5-step pipeline diagram explaining the data flow from portal to dashboard |
| **Terminal Command Display** | Shows the exact command to run in your terminal to trigger the pipeline |
| **Hot-Reload Button** | After the pipeline completes, loads the new scored data into the running API server in-memory — no restart needed |
| **Reload Status Feedback** | Real-time success/error indication with total projects loaded |

---

## 🤖 Detection Engine

The platform uses **three independent detection layers** whose outputs are combined into one composite risk score.

### Layer 1 — Deterministic Audit Rules (R001–R011)

| Rule | What It Detects | Severity |
|---|---|---|
| R001 | Expenditure exceeds allocated amount (cost overrun) | CRITICAL |
| R002 | Project age > 730 days with no completion | HIGH |
| R003 | Ongoing project overdue beyond 365-day baseline | MODERATE |
| R004 | Expenditure recorded on an unsanctioned work | CRITICAL |
| R005 | Allocated amount > 3× district median (extreme outlier) | HIGH |
| R006 | Available limit goes negative (financial inconsistency) | CRITICAL |
| R007 | Work stalled — no expenditure for 180+ days | HIGH |
| R008 | Amount in top 2% of state distribution (state outlier) | MODERATE |
| R009 | Project age > 365 days, still not started | HIGH |
| R010 | Multiple works in same location within 30 days (clustering) | MODERATE |
| R011 | Expenditure velocity spike > 90% in final quarter | MODERATE |

### Layer 2 — Isolation Forest (Unsupervised ML)
Trains on 6 engineered features (log-transformed allocated amount, expenditure ratio, project age, district deviation %, constituency project count, state deviation %) to identify multi-variate statistical outliers without requiring labelled fraud data. Contamination rate: 5%.

### Layer 3 — Peer Deviation Scoring
Computes how far each project's allocated amount deviates from its district (IDA) median (60% weight) and state median (40% weight). Scaled to 0–100 using the 99th-percentile normalization.

### Composite Risk Score Weights

| Component | Weight |
|---|---|
| Financial Overrun Score | 25% |
| Project Delay Score | 20% |
| Expenditure Velocity Score | 20% |
| Duplicate / Similarity Score | 15% |
| Peer Deviation Score | 10% |
| Isolation Forest ML Score | 10% |

---

## 📂 Project Structure

```
mplads-monitor/
│
├── backend/
│   ├── etl/
│   │   ├── fetcher.py         # eSAKSHI portal API fetcher (8 dataset endpoints)
│   │   ├── validator.py       # Automated data quality & validation reports
│   │   ├── cleaner.py         # Normalization, entity matching, deduplication
│   │   └── pipeline.py        # End-to-end pipeline orchestrator
│   │
│   ├── features/
│   │   └── engineering.py     # Financial, temporal, peer & similarity features
│   │
│   ├── detection/
│   │   ├── rules.py           # Deterministic rules R001–R011 with evidence
│   │   ├── ml_model.py        # Isolation Forest with SHAP values
│   │   └── risk_scorer.py     # 6-factor composite risk scoring (0–100)
│   │
│   ├── explainability/
│   │   └── nl_explanations.py # Narrative generator & audit case builder
│   │
│   └── api/
│       ├── main.py            # FastAPI server (all endpoints)
│       └── models/
│           └── schemas.py     # Pydantic request/response models
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── NationalOverview.tsx   # Home dashboard
│       │   ├── HighRiskProjects.tsx   # Priority audit queue
│       │   ├── StateView.tsx          # State diagnostics
│       │   ├── ProjectDetail.tsx      # Per-project inspection
│       │   ├── AuditCase.tsx          # Printable docket
│       │   ├── SearchPage.tsx         # NL search
│       │   ├── MPAnalytics.tsx        # MP profiling
│       │   └── LiveRefresh.tsx        # Data ingestion panel
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── RiskBadge.tsx
│       │   ├── RiskGauge.tsx
│       │   └── ScoreBreakdown.tsx
│       ├── api.ts                     # Typed API client
│       └── types.ts                   # TypeScript interfaces
│
├── ml/
│   ├── delay_predictor.py     # Gradient Boosting delay classifier
│   └── models/                # Saved .pkl model files
│
├── data/
│   ├── raw/                   # Downloaded JSON datasets from portal
│   └── processed/             # Scored master_projects_latest.json
│
├── scripts/
│   └── generate_demo_data.py  # Synthetic 5,000-project dataset generator
│
├── backend/tests/
│   └── test_core.py           # Pytest suite (5 passing tests)
│
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

---

## 🔄 How to Add a New Project / Refresh Live Data

When new MPLADS works are sanctioned and appear on the eSAKSHI portal, follow these steps:

**Step 1 — Run the pipeline** (fetches fresh data and re-scores everything)
```bash
cd mplads-monitor

# Option A: Live portal fetch (requires internet)
python -m backend.etl.pipeline

# Option B: Offline demo (5,000 synthetic projects)
python -m backend.etl.pipeline --demo
```

**Step 2 — Reload data into the running API** (no server restart needed)

Open your browser and go to **Live Data Refresh** in the sidebar → click **"Reload Data Now"**.

Or via API:
```bash
curl -X GET http://localhost:8000/api/data/reload
```

All dashboards, risk scores, and audit queues update immediately.

---

## 🐳 Running with Docker

```bash
# Clone and start everything
docker-compose up --build
```

| Service | URL |
|---|---|
| React Dashboard | http://localhost:5173 |
| FastAPI Swagger Docs | http://localhost:8000/docs |
| API Health Check | http://localhost:8000/api/health |

---

## 🚀 Suggested Future Improvements

| Area | Improvement |
|---|---|
| **AI Search** | Replace keyword NL parser with a local LLM (Gemma / Phi-3) for true semantic query understanding |
| **PostgreSQL** | Persist scored data in PostgreSQL instead of JSON files for sub-millisecond filtering on 100k+ projects |
| **SHAP** | Install `shap` library for per-project feature importance visualizations in the UI |
| **Real-Time Alerts** | Add email/SMS alerts when a new project crosses the CRITICAL threshold |
| **GIS Map View** | Plot high-risk projects on a choropleth map (state/district heatmap) for geographic concentration analysis |
| **Audit Workflow** | Add an "Assign to Auditor" system where flagged cases can be tracked through investigation stages |
| **Historical Baselines** | Archive monthly pipeline snapshots to enable year-over-year risk trend comparisons |
| **OCR Integration** | Upload scanned Sanction Orders / MB PDFs and extract amounts for cross-validation against portal data |

---

## 🛡️ Security Design

- All database queries use **parameterized pandas filters** — no raw SQL string construction anywhere
- Natural Language Search translates to **typed filter structs** — injection impossible
- API inputs validated by **Pydantic** models at every endpoint
- CORS configured (can be locked to specific frontend origin in production)
- No sensitive credentials stored in code — uses `.env` configuration

---

## 📊 Verified Test Results

```
==================== Pytest Suite ====================
test_financial_features            PASSED
test_temporal_features             PASSED
test_rule_r001_cost_overrun        PASSED
test_rule_r004_unsanctioned        PASSED
test_risk_score_bounds             PASSED
======================================================
5 passed in 4.85s
```

```
==================== Pipeline Run ====================
Total projects processed  : 5,000
Rule anomaly flags        : 5,040
ML anomaly flags (IF)     : 250
HIGH + CRITICAL projects  : 499
Score range               : 0.0 — 55.8
Frontend build            : ✓ 2,412 modules in 9.04s
======================================================
```

---

<div align="center">

Built for **Smart India Hackathon 2026** · Problem **SIH26102**
Data Source: [MoSPI eSAKSHI MPLADS Portal](https://mplads.mospi.gov.in/digigov/dashboard.html)

</div>
