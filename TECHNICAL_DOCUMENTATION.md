# DIGI.MPLAD — MPLADS AI Monitor: Comprehensive Technical Documentation

> **Project:** Smart India Hackathon 2026 · Problem Statement SIH26102
> **Ministry:** Ministry of Statistics and Programme Implementation (MoSPI)
> **Platform:** AI-Powered Anomaly Detection & Audit Surveillance for MPLADS

---

## Table of Contents

1. Project Overview
2. Complete Technology Stack
3. Technical Approach
4. System Architecture & Technical Design
5. Detection Engine - Deep Dive
6. Benefits of This Solution
7. Challenges & Their Solutions
8. Future Scope
9. Legal & Ethical Posture

---

## 1. Project Overview

The **Members of Parliament Local Area Development Scheme (MPLADS)** is a Government of India programme under which each MP is entitled to recommend development works worth Rs.5 Crore per year in their constituency. With 543 Lok Sabha MPs and 245 Rajya Sabha MPs generating thousands of project recommendations annually, manual audit oversight at scale is practically impossible.

**DIGI.MPLAD (MPLADS AI Monitor)** is a production-grade, end-to-end digital surveillance platform that automatically ingests data from the MoSPI eSAKSHI portal, runs a multi-tier AI anomaly detection engine across every project, assigns a composite 0-100 risk score, and presents actionable findings through a clean auditor-friendly dashboard.

The platform enables government officials and auditors to:
- Prioritize field verifications on the highest-risk projects
- Detect fund inefficiencies, delayed works, and financial irregularities at national scale
- Generate formal, printable Audit Investigation Cards for flagged projects
- Search and analyze MPLADS data using plain English queries

> LEGAL DISCLAIMER: All risk scores are statistical indicators for human review. They do not constitute fraud findings. Physical verification by competent authorities is mandatory before any administrative action.

---

## 2. Complete Technology Stack

### 2.1 Frontend

| Technology             | Version  | Role                                                                  |
|------------------------|----------|-----------------------------------------------------------------------|
| React                  | 19.2.8   | Core UI framework (component-based rendering)                         |
| TypeScript             | ~6.0.2   | Static typing for all frontend code                                   |
| Vite                   | 8.2.2    | Next-generation build tool and dev server (HMR)                       |
| React Router DOM       | 7.18.3   | Client-side SPA routing across 8 pages                                |
| TanStack React Query   | 5.102.8  | Async server state management, caching, background refetch            |
| Recharts               | 3.10.1   | Composable charting library (bar charts, donut charts, trends)        |
| Lucide React           | 1.39.0   | Modern SVG icon library                                               |
| OXLint                 | 1.79.0   | Ultra-fast Rust-based JavaScript/TypeScript linter                    |
| Vanilla CSS            | --       | Custom design system, glassmorphism, dark mode, animations            |

Frontend Architecture Pattern: Single Page Application (SPA) with client-side routing. API state managed by React Query with automatic background polling. All type contracts enforced via TypeScript interfaces in types.ts.

---

### 2.2 Backend

| Technology          | Version        | Role                                                           |
|---------------------|----------------|----------------------------------------------------------------|
| Python              | 3.11+          | Primary backend language                                       |
| FastAPI             | 0.111.0        | High-performance async REST API framework                      |
| Uvicorn             | 0.29.0         | ASGI server (runs FastAPI)                                     |
| Pydantic            | 2.7.1          | Request/response validation and serialization                  |
| Pydantic Settings   | 2.2.1          | Environment-based configuration management                     |
| Pandas              | 2.2.2          | In-memory tabular data processing (primary data store)         |
| NumPy               | 1.26.4         | Numerical operations, array math, normalization                |
| SQLAlchemy          | 2.0.30         | ORM (available for future PostgreSQL migration)                |
| Alembic             | 1.13.1         | Database migration management                                  |
| Requests / HTTPX    | 2.31.0/0.27.0  | HTTP client for eSAKSHI portal API fetching                    |
| Python-dotenv       | 1.0.1          | .env file loading for secrets management                       |
| Aiofiles            | 23.2.1         | Async file I/O                                                 |
| Joblib              | 1.4.2          | Model serialization (save/load .pkl files)                     |
| ReportLab           | 4.2.0          | PDF generation for audit dockets                               |
| OpenPyXL            | 3.1.2          | Excel export capability                                        |
| Python-dateutil     | 2.9.0          | Robust date parsing for varied input formats                   |
| Pytest              | 8.2.0          | Unit and integration testing                                   |
| pytest-asyncio      | 0.23.7         | Async test support                                             |

---

### 2.3 Machine Learning

| Technology    | Version | Role                                                                     |
|---------------|---------|--------------------------------------------------------------------------|
| scikit-learn  | 1.4.2   | Isolation Forest implementation, StandardScaler                          |
| SHAP          | 0.45.1  | SHapley Additive exPlanations - per-project feature attribution          |
| XGBoost       | 2.0.3   | Gradient Boosting (delay predictor ml/delay_predictor.py)                |
| LightGBM      | 4.3.0   | Fast gradient boosting (alternative delay prediction model)              |
| SciPy         | 1.13.0  | Statistical functions (percentile normalization, distribution analysis)  |

---

### 2.4 Infrastructure & DevOps

| Technology      | Version    | Role                                                                  |
|-----------------|------------|-----------------------------------------------------------------------|
| Docker          | --         | Container runtime                                                     |
| Docker Compose  | 3.9        | Multi-service orchestration (backend + frontend + PostgreSQL)         |
| PostgreSQL      | 16-alpine  | Production-grade relational database                                  |
| GitHub          | --         | Source control and CI/CD target                                       |

Docker Services:
- mplads-db:       PostgreSQL 16 (port 5432, health-checked)
- mplads-backend:  FastAPI/Uvicorn (port 8000)
- mplads-frontend: Vite dev server (port 5173)

---

### 2.5 Data Sources

| Source                   | Type          | Description                                                                             |
|--------------------------|---------------|-----------------------------------------------------------------------------------------|
| MoSPI eSAKSHI Portal     | Live REST API | Primary data source - 8 dataset endpoints for Lok Sabha and Rajya Sabha MPLADS works   |
| Synthetic Demo Generator | Python script | 5,000-project synthetic dataset for offline demonstration                               |

eSAKSHI Dataset Endpoints consumed:
- LOK_On_Going:        Active Lok Sabha works
- LOK_Completed:       Finished Lok Sabha works
- LOK_Unsanctioned:    Works without administrative sanction
- LOK_Allocated_Limit: MP-wise annual fund allocation limits
- LOK_Calamity:        Calamity-fund works
- RAJYA_Allocated_Limit: Rajya Sabha MP allocations
- RAJYA_Calamity:      Rajya Sabha calamity works
- manifest:            Dataset metadata and version info

---

## 3. Technical Approach

The platform was built following a layered pipeline architecture from raw data ingestion to final risk scoring, keeping each layer independently testable and replaceable.

### 3.1 Core Design Philosophy

1. No Labeled Fraud Data Required:
   Because no ground-truth fraud labels exist for MPLADS projects, the system uses unsupervised ML (Isolation Forest) and deterministic rule engines rather than a supervised fraud classifier.

2. Explainability First:
   Every risk score is broken into 6 auditor-readable sub-components. SHAP values trace each ML anomaly flag back to specific financial or temporal features.

3. Injection-Safe by Design:
   Natural language queries are never converted to SQL. All filtering is done through typed Python DataFrame operations. No raw query string construction anywhere in the codebase.

4. Stateless Hot-Reload:
   The API server loads data from JSON files into memory on startup and supports a /api/data/reload endpoint that replaces the in-memory dataset without restarting the server.

5. Ethical Guard Rails:
   Every API response that returns a risk score includes a disclaimer field. Rule flags include a justification and a disclaimer. The audit case builder includes a statutory notice.

---

### 3.2 The 8-Step Processing Pipeline

The entire data pipeline is orchestrated by backend/etl/pipeline.py:

    [Step 1] Data Acquisition
      - Fetch from eSAKSHI portal API (or generate synthetic demo data)
      - Save raw JSON files to data/raw/ with timestamps

    [Step 2] Data Validation
      - Check completeness, type consistency, null rates per field
      - Generate data quality report saved to data/processed/

    [Step 3] Cleaning & Merging
      - Normalize state/constituency names (upper-case, strip whitespace)
      - Parse dates with fallback handling for varied formats
      - Merge all 8 datasets into one master_projects DataFrame
      - Deduplicate project IDs, assign unique project_id

    [Step 4] Feature Engineering
      - Financial: expenditure_ratio, cost_variance_pct
      - Temporal: project_age_days, is_overdue, is_stalled
      - Peer: district_median_amount, state_median_amount,
              amount_vs_district_pct, amount_vs_state_pct
      - Similarity: candidate duplicate pairs via location+amount matching
      - ML: log-scale allocated_amount for feature matrix

    [Step 5] Rule-Based Detection (R001-R011)
      - Run 11 deterministic audit rules against every project row
      - Each rule returns structured evidence dict + score contribution
      - Populate risk_flags list on each project row
      - Compute sub-scores: financial_risk_score, delay_risk_score, expenditure_risk_score

    [Step 6] ML Anomaly Scoring (Isolation Forest)
      - Prepare 6-feature matrix
      - StandardScaler normalization
      - Isolation Forest training (n_estimators=200, contamination=5%)
      - Normalize raw IF scores to 0-100 scale
      - SHAP TreeExplainer for top-3 driver attribution per anomaly
      - Save model + scaler to ml/models/ with timestamp

    [Step 7] Composite Risk Scoring
      - Compute peer_deviation_score (district 60% + state 40%, scaled 0-100)
      - Compute duplicate_risk_score (max similarity score x 100)
      - Weighted sum of 6 components -> overall_risk_score (0-100)
      - Assign risk_band: LOW / MODERATE / HIGH / CRITICAL

    [Step 8] Persist Results
      - Save master_projects_{timestamp}.json + .csv
      - Save anomaly_results_{timestamp}.json
      - Save duplicate_pairs_{timestamp}.json
      - Copy to *_latest.json for API to load

---

### 3.3 API Design (15+ REST Endpoints)

| Endpoint                                    | Method | Purpose                                          |
|---------------------------------------------|--------|--------------------------------------------------|
| /api/health                                 | GET    | Server health + data status                      |
| /api/dashboard/overview                     | GET    | National KPIs (funds, utilization, risk dist.)   |
| /api/dashboard/states                       | GET    | All-state risk summary sorted by avg risk score  |
| /api/dashboard/state/{state_name}           | GET    | Single state detail + constituency breakdown     |
| /api/projects                               | GET    | Paginated, multi-filter project list             |
| /api/projects/{project_id}                  | GET    | Full project detail with all risk sub-scores     |
| /api/projects/{project_id}/explanation      | GET    | Risk narrative + SHAP values                     |
| /api/projects/{project_id}/audit-case       | POST   | Generate audit investigation docket             |
| /api/anomalies/high-risk                    | GET    | Projects with HIGH or CRITICAL risk band         |
| /api/analytics/mp/{mp_name}                 | GET    | MP portfolio analytics                           |
| /api/analytics/trends                       | GET    | Quarterly time-series trend data                 |
| /api/search                                 | POST   | Natural language query to parameterized filter   |
| /api/filters/states                         | GET    | Dropdown population: all state names             |
| /api/filters/constituencies/{state_name}    | GET    | Dropdown: constituencies for a state             |
| /api/projects/submit                        | POST   | Real-time ingest + score a new project           |
| /api/data/reload                            | GET    | Hot-reload dataset without server restart        |

All responses include data_disclaimer fields. All input validated via Pydantic models.

---

### 3.4 Frontend Architecture

The frontend is a React 19 SPA with 8 route-level pages and 4 shared components.

Pages:
- NationalOverview.tsx:   Home dashboard with KPI tiles, donut chart, bar chart, top-risk table
- HighRiskProjects.tsx:   Priority audit queue with multi-filter and pagination
- StateView.tsx:          State selector + bar comparison + constituency breakdown
- ProjectDetail.tsx:      Full risk inspection card with gauge, score bars, anomaly evidence
- AuditCase.tsx:          Printable formal investigation docket
- SearchPage.tsx:         Natural language query interface with preset chips
- MPAnalytics.tsx:        MP portfolio profiler
- LiveRefresh.tsx:        Pipeline mode selection + hot-reload trigger

Shared Components:
- Sidebar.tsx:         Navigation sidebar with active route highlighting
- RiskBadge.tsx:       Color-coded LOW/MODERATE/HIGH/CRITICAL badge
- RiskGauge.tsx:       Animated SVG circular gauge (0-100 score display)
- ScoreBreakdown.tsx:  6-factor horizontal progress bar breakdown

State Management: TanStack React Query handles all server state with automatic caching, background refetching, and loading/error states. No Redux or Zustand needed.

Type Safety: All API response shapes are declared in types.ts and consumed by React Query with full TypeScript inference.

---

## 4. System Architecture & Technical Design

### 4.1 High-Level Architecture

    USER / AUDITOR BROWSER
    React 19 + TypeScript + Vite SPA
    (NationalOverview, ProjectDetail, AuditCase, SearchPage...)
               |
               | HTTP REST (JSON)
               v
    +-------------------------------------------------+
    | FastAPI / Uvicorn (port 8000) - ASGI Backend   |
    |   +-------------------------------------------+|
    |   | In-Memory DataStore (Pandas DataFrame)    ||
    |   | master_projects + anomalies + pairs       ||
    |   +-------------------------------------------+|
    +-------------------------------------------------+
               |
               | File I/O (JSON)
               v
    data/processed/ (JSON files)
      master_projects_latest.json
      anomaly_results_latest.json
      duplicate_pairs_latest.json
               |
               | Python pipeline
               v
    +-------------------------------------------------+
    | ETL + Detection Pipeline                       |
    |                                                |
    | Fetcher -> Cleaner -> Feature Eng.             |
    |                          |                     |
    |                    Rule Engine (R001-R011)      |
    |                          |                     |
    |                  Isolation Forest + SHAP        |
    |                          |                     |
    |               Risk Scorer (Composite 0-100)    |
    +-------------------------------------------------+
               ^
    MoSPI eSAKSHI Portal API (8 dataset endpoints)

### 4.2 Data Flow Per Request

1. Browser sends GET /api/projects?state=MAHARASHTRA&risk_band=HIGH
2. FastAPI receives it, validates query parameters via Pydantic
3. DataStore filters the in-memory Pandas DataFrame (no SQL, no DB roundtrip)
4. FastAPI serializes results to JSON and returns with data_disclaimer
5. React Query receives the response, caches it for the configured stale time
6. React component renders from the cached data

Total round-trip latency on 5,000 projects: under 50ms (all in-memory Pandas operations).

### 4.3 Data Model - Master Project Record

Raw Fields (from eSAKSHI portal):
  project_id, house_type, state_name, constituency_name, mp_name,
  ida_name (Implementing District Authority), city_name, block_name,
  village_name, location_type, allocated_amount, expenditure_amt,
  available_limit, recommended_date, actual_end_date, work_status,
  letter_no, tenure_name, dataset_source

Engineered Features (computed by pipeline):
  expenditure_ratio, cost_variance_pct, project_age_days, days_to_complete,
  is_completed, is_ongoing, is_unsanctioned, is_overdue, is_stalled,
  district_median_amount, state_median_amount, amount_vs_district_pct,
  amount_vs_state_pct, mp_project_count, constituency_project_count,
  allocated_amount_log

Detection Outputs:
  risk_flags (list of rule dicts), financial_risk_score, delay_risk_score,
  expenditure_risk_score, ml_anomaly_score

Final Risk Output:
  duplicate_risk_score, peer_deviation_score, overall_risk_score,
  risk_band, model_version, rules_version, scored_at

### 4.4 Security Design

| Concern               | Implementation                                                         |
|-----------------------|------------------------------------------------------------------------|
| SQL Injection         | No SQL generated anywhere. All filtering uses Pandas boolean masks.    |
| NL Search Injection   | NL queries parsed into a safe typed ProjectFilter struct - never SQL   |
| Input Validation      | All API inputs validated by Pydantic models at every endpoint boundary |
| Credential Management | .env file pattern - no secrets hardcoded in source code                |
| CORS                  | FastAPI CORSMiddleware; lockable to specific origin in production       |
| API Auth              | Session-based auth ready (not enforced in hackathon demo mode)         |

---

## 5. Detection Engine - Deep Dive

### 5.1 Layer 1 - Deterministic Audit Rules (R001-R011)

Each rule is a pure Python function that takes a project row as input and returns a structured flag dict or None. Rules are grouped into categories feeding specific risk score components.

| Rule | Trigger Condition                                           | Severity | Score | Category     |
|------|-------------------------------------------------------------|----------|-------|--------------|
| R001 | expenditure_amt > allocated_amount (cost overrun)           | CRITICAL | 80    | Financial    |
| R002 | project_age_days > 730 and not completed                    | HIGH     | 55    | Delay        |
| R003 | is_ongoing = True and project_age_days > 365               | MODERATE | 30    | Delay        |
| R004 | is_unsanctioned = True and expenditure_amt > 0             | HIGH     | 65    | Financial    |
| R005 | allocated_amount > district_median x 3.0                   | HIGH     | 50    | Financial    |
| R006 | allocated_amount > state_median x 2.5                      | MODERATE | 30    | Financial    |
| R007 | mp_project_count > mean + 2x std across all MPs            | MODERATE | 20    | Concentration|
| R008 | expenditure_ratio < 0.05 and age > 365 days (stalled)      | MODERATE | 25    | Expenditure  |
| R009 | Project appears in high-similarity duplicate pair           | HIGH     | 50    | Duplicate    |
| R010 | Constituency project count > 2x constituency average       | LOW      | 15    | Concentration|
| R011 | available_limit < 0 (over-commitment of MP allocation)     | HIGH     | 60    | Financial    |

Each flag includes:
- justification: policy/audit rationale drawn from CAG audit manual and MPLADS scheme guidelines
- evidence: raw numerical values that triggered the rule
- disclaimer: statutory reminder that this is a risk indicator requiring human verification

### 5.2 Layer 2 - Isolation Forest (Unsupervised ML)

Why Isolation Forest?
- No labeled fraud data exists for MPLADS. A supervised classifier cannot be trained.
- Isolation Forest is purpose-built for unsupervised anomaly detection. It identifies points that are statistically isolated from the majority distribution without requiring any labeled outputs.
- Works directly on tabular financial data with no need for ground-truth labels.

Model Configuration:
  n_estimators  = 200    (number of isolation trees)
  max_samples   = "auto" (256 or dataset size, whichever is smaller)
  contamination = 0.05   (expected 5% anomaly rate)
  max_features  = 1.0    (use all 6 features in each tree)
  bootstrap     = False
  random_state  = 42     (reproducibility)
  n_jobs        = -1     (parallel on all CPU cores)

Feature Matrix (6 features):

| Feature               | Transformation                             | Rationale                                            |
|-----------------------|--------------------------------------------|------------------------------------------------------|
| allocated_amount_log  | log1p(allocated_amount)                    | Right-skewed distribution; log-scale reveals outliers|
| expenditure_ratio     | expenditure_amt / allocated_amount         | Flags overruns (>1.0) and stalled funds (<0.05)      |
| project_age_days      | Raw (days since recommended date)          | Very old projects are statistically unusual          |
| amount_vs_district_pct| (alloc - dist_med) / dist_med x 100       | Peer deviation at district level                     |
| amount_vs_state_pct   | (alloc - state_med) / state_med x 100     | Peer deviation at state level                        |
| mp_project_count      | Count of all projects by this MP           | Captures fragmentation / concentration anomaly       |

Score Normalization:
  raw_score = model.decision_function(X_scaled)  # lower = more anomalous
  ml_score = ((max_raw - raw_score) / score_range) x 100  # invert + scale to 0-100
  Higher ML score = more statistically anomalous.

SHAP Integration:
  For the top 5% most anomalous projects (those exceeding the contamination threshold),
  shap.TreeExplainer computes per-feature attribution values. The top 3 SHAP drivers
  are included in the anomaly explanation text displayed to auditors.

### 5.3 Layer 3 - Peer Deviation Scoring

Every project receives a peer deviation score independent of rule triggers and ML flags:

  district_deviation = |amount - district_median| / district_median x 100
  state_deviation    = |amount - state_median| / state_median x 100
  combined           = 0.6 x district_deviation + 0.4 x state_deviation
  peer_score         = (combined / 99th_percentile_of_combined) x 100
  peer_score         = clip(0, 100)

District receives 60% weight because it is a more granular peer group.
Comparing a project in Pune district with other Pune projects is more
meaningful than comparing it with all Maharashtra projects.

### 5.4 Composite Risk Score Formula

  overall_risk_score =
      (0.25 x financial_risk_score)    +
      (0.20 x delay_risk_score)        +
      (0.20 x expenditure_risk_score)  +
      (0.15 x duplicate_risk_score)    +
      (0.10 x peer_deviation_score)    +
      (0.10 x ml_anomaly_score)

All weights are configurable via environment variables in config.py / .env.

Risk Band Assignment:
   0 to 24  ->  LOW
  25 to 49  ->  MODERATE
  50 to 74  ->  HIGH
  75 to 100 ->  CRITICAL

### 5.5 Duplicate / Similarity Detection

Candidate duplicate projects are identified by comparing projects within the same constituency on:
- Geographic proximity (same city_name / village_name)
- Amount similarity (within a configurable tolerance percentage)
- Temporal proximity (recommended within 30 days of each other)

Matching pairs are stored in duplicate_pairs_latest.json with a similarity_score (0-1).
Projects appearing in pairs score proportionally on the duplicate_risk_score component.

---

## 6. Benefits of This Solution

### 6.1 For Auditors and CAG Officers

Prioritization of Investigation Resources:
  Instead of manually reviewing thousands of MPLADS works, auditors receive a ranked
  queue sorted by composite AI risk score. The top 10% (HIGH/CRITICAL band) represent
  the cases most likely to require field verification. This can reduce audit planning
  time by an estimated 70-80%.

Evidence-Backed Flagging:
  Every risk flag includes structured evidence - actual rupee amounts, dates, deviation
  percentages, and rule codes. An auditor sees exactly why a project was flagged, not just
  that it was. This builds institutional trust in the AI system.

Printable Formal Dockets:
  The Audit Investigation Card generates a formal document with a docket reference number,
  structured findings, recommended field actions, and sign-off blocks. This digitizes the
  audit case origination process and creates a traceable paper trail.

No Technical Expertise Required:
  Natural Language Search allows a non-technical officer to type "Critical delayed projects
  in Andhra Pradesh" and get results instantly, with no SQL, no filter dropdowns, and no
  technical training needed.

### 6.2 For Government Programme Management

National Fund Utilization Visibility:
  The dashboard shows total allocated funds vs expenditure across the entire MPLADS
  programme in real-time. This was previously only possible through manual compilation
  of state-wise reports.

MP-Level Accountability:
  The MP Analytics page allows programme managers to assess any MP's project portfolio -
  completion rate, average risk score, overdue count. This enables performance-based
  resource allocation and targeted support.

Geographic Bottleneck Identification:
  The State View bar chart comparing Allocated vs Expended amounts across 15+ states makes
  fund absorption gaps immediately visible. States consistently under-utilizing MPLADS funds
  can be identified and supported proactively.

Early Warning System:
  Rule R008 (Stalled Funds: <5% expenditure after 365 days) and Rule R002 (730+ day
  incomplete projects) function as an automated early warning system, surfacing projects
  likely to lapse before they reach critical failure.

### 6.3 For Transparency and Accountability

Deterrence Effect:
  The existence of an automated AI monitoring system covering 100% of MPLADS projects
  serves as a deterrent. When MPs and implementing authorities know every project is
  being statistically analyzed, it creates an accountability pressure that manual
  spot-checks cannot achieve.

Objective, Audit-Ready Risk Scoring:
  The composite risk score formula is documented, open, and reproducible. Any auditor
  can re-run the pipeline and verify the scores. Every score decomposes into 6 auditable
  components - there is no black-box "AI said so."

Statutory Disclaimer Framework:
  Every score includes a disclaimer, every audit case includes a statutory notice, and
  the system explicitly positions itself as a pre-screening tool for human review,
  not an enforcement mechanism.

### 6.4 Technical / Operational Benefits

Zero Dependency on Labeled Fraud Data:
  The unsupervised Isolation Forest approach works immediately on any MPLADS dataset
  without needing historical fraud records or labeled examples, which do not publicly exist.

Hot-Reload Without Downtime:
  The /api/data/reload endpoint allows the in-memory dataset to be refreshed with newly
  processed data without restarting the API server. This enables zero-downtime data
  updates during business hours.

Sub-50ms Query Response:
  All filtering and sorting is done in-memory via Pandas DataFrame operations. For 5,000-
  50,000 projects, all API responses return in under 50 milliseconds without any database
  round-trip.

Fully Containerized Deployment:
  docker-compose up --build brings up the complete stack (backend + frontend + database)
  in a single command, making deployment reproducible and environment-agnostic.

---

## 7. Challenges & Their Solutions

### Challenge 1: No Labeled Fraud or Anomaly Data Exists

The Problem:
  The MPLADS programme has never had a publicly available dataset of projects labeled as
  "fraudulent" or "high-risk." Without training labels, it is impossible to build a
  supervised fraud classifier in the traditional sense.

The Solution:
  The platform avoids the requirement for labels entirely through two complementary approaches:

  1. Deterministic Audit Rules (R001-R011):
     Domain experts and audit guidelines (the CAG audit manual and MPLADS scheme guidelines)
     define clear threshold conditions for anomalies - cost overrun, projects older than 730
     days, expenditure on unsanctioned works. These require no training data and are fully
     interpretable.

  2. Unsupervised Isolation Forest:
     This algorithm identifies statistical outliers without any labeled data. A project is
     flagged as anomalous if it is statistically isolated from the majority distribution in
     6-dimensional feature space. The model learns "what normal looks like" and flags
     deviations from that learned normality.

  This hybrid approach achieves what pure supervised learning cannot in this domain.

---

### Challenge 2: Inconsistent and Incomplete Data from the Government Portal

The Problem:
  The MoSPI eSAKSHI portal data has significant quality issues:
  - Inconsistent name formatting ("MAHARASHTRA" vs "Maharashtra" vs "maharashtra")
  - Missing expenditure amounts for many projects causing division errors
  - Dates in varying formats across different dataset endpoints
  - Project IDs duplicated across Lok Sabha and Rajya Sabha datasets
  - Missing district-level geographic fields for some constituencies

The Solution:
  A dedicated ETL cleaning layer (backend/etl/cleaner.py and backend/etl/validator.py):
  - All string fields normalized to uppercase + stripped whitespace before any comparison
  - Null amounts treated as zero; absence flagged via Rule R008 if old + zero expenditure
  - python-dateutil handles a wide range of date formats with graceful fallback to None
  - Duplicate IDs assigned unique sequential IDs during the merge step
  - Missing district fields filled from state-level medians during peer deviation calculation
  - A data quality report is generated for every pipeline run documenting all issues found

---

### Challenge 3: Explaining AI Decisions to Non-Technical Government Auditors

The Problem:
  Government auditors are domain experts but not data scientists. Presenting a number like
  "risk score: 67.3" without explanation creates distrust and reduces adoption. A black-box
  AI system will not be used in practice by government officials.

The Solution:
  Three levels of explainability were built:

  1. Score Breakdown:
     Every project's risk score decomposes into 6 horizontal progress bars (Financial Overrun,
     Project Delay, Expenditure Velocity, Duplicate Detection, Peer Deviation, ML Anomaly).
     Non-technical users can immediately read and understand the risk profile.

  2. Rule Evidence Panel:
     Each triggered rule shows the specific data values that caused the flag. For example:
     "Expenditure Rs.18,50,000 exceeds allocation Rs.15,00,000 by 23.3%."

  3. Automated Auditor Briefing:
     The nl_explanations.py module generates a natural language paragraph (template-based
     narrative generation, no LLM required) summarizing the project's risk profile in plain
     English, including specific recommended verification actions for the auditor.

---

### Challenge 4: Scale - Scoring 5,000+ Projects in a Single Batch

The Problem:
  The platform must score every MPLADS project in the dataset, not just the ones being
  viewed. The risk scoring pipeline must handle thousands of records efficiently in a single
  batch, and the API must filter and sort these scored projects with sub-second response times.

The Solution:
  - Vectorized Pandas Operations: All feature engineering, rule scoring, and risk score
    computation uses Pandas vectorized operations applied to entire columns at once, rather
    than Python row-by-row loops.
  - Pre-computation: All risk scores, sub-scores, and flags are computed once during the
    pipeline run and stored in the JSON output. The API never re-computes risk scores on the fly.
  - In-Memory Data Store: The DataStore class loads the entire scored dataset into a Pandas
    DataFrame in memory on server startup. All API queries filter this DataFrame directly -
    no database round-trip, no I/O during request handling.
  - Isolation Forest with Parallelism: n_jobs=-1 in scikit-learn uses all available CPU
    cores for parallel tree building and scoring.

  Benchmark: 5,000 projects processed (ETL + ML + scoring) in under 90 seconds on a standard laptop.

---

### Challenge 5: Preventing Misuse - AI Score Being Treated as a Fraud Verdict

The Problem:
  A significant governance risk of deploying AI in government audit workflows is that
  officials might treat an AI-generated risk score as a definitive fraud finding, bypassing
  due process. This could lead to administrative actions against MPs or implementing
  authorities without proper physical verification - a serious civil rights concern.

The Solution:
  The platform was designed from the ground up to prevent this:

  1. Systemic Disclaimers: Every API response carrying a risk score includes a disclaimer
     field. Every rule flag includes a disclaimer. The audit case docket includes a statutory
     notice prominently displayed.

  2. Language Framing: The platform consistently uses "risk indicator," never "fraud
     indicator" or "irregularity confirmed." The README includes a legal disclaimer in a
     prominent callout block.

  3. Human-in-the-Loop Design: The "Generate Audit Case" button produces a document with
     "Recommended Auditor Actions." The system always terminates in a human action (site visit,
     document review, MB verification), never in automated enforcement.

  4. Score Range Design: The scoring system is calibrated such that even the highest scores
     (75-100, CRITICAL band) represent statistical outliers requiring investigation, not
     automatic violations.

---

### Challenge 6: Usability Without a Database Administrator

The Problem:
  Government deployments face infrastructure constraints. Setting up and maintaining a
  PostgreSQL database requires DBA expertise. For a hackathon demo and initial deployment,
  relying on a database creates a significant setup barrier.

The Solution:
  The platform operates in two modes:

  1. JSON File Mode (default/demo):
     The pipeline outputs JSON files to data/processed/. The API loads these into memory.
     No database setup required - just run the pipeline and start the API server.

  2. PostgreSQL Mode (production):
     Docker Compose includes a fully configured PostgreSQL 16 container. SQLAlchemy and
     Alembic are already integrated for production deployments requiring persistent storage.
     The switch is a single environment variable change.

  This dual-mode design means the platform runs from a single docker-compose up --build
  command for demos, while being fully ready for production-grade database persistence.

---

## 8. Future Scope

### 8.1 AI & ML Enhancements

Semantic Natural Language Search:
  The current NL search uses keyword-based rule parsing (state name detection, risk level
  keywords, amount patterns). The next version would integrate a locally hosted language
  model (Google Gemma 2B or Microsoft Phi-3) fine-tuned on MPLADS domain vocabulary,
  supporting complex queries like "Show projects where the MP recommended more than 5 works
  in a single month with low completion rates."

Federated Learning for Sensitive Data:
  For scenarios where raw project data cannot leave state servers, federated learning can
  train a shared anomaly detection model across state-level deployments without centralizing
  the data - addressing data sovereignty concerns for sensitive government information.

Time-Series Anomaly Detection:
  The current model treats each project as a static snapshot. A future version could model
  the trajectory of a project's expenditure over time, detecting acceleration patterns
  (spending bursts near year-end to avoid fund lapse) as a separate anomaly class.

Supervised Learning Once Labels Are Available:
  If a future audit cycle produces a labeled dataset of confirmed irregularities, the
  platform can transition to a supervised XGBoost or LightGBM classifier, significantly
  improving precision. The feature engineering pipeline is already in place.

### 8.2 Platform Features

GIS Map View:
  Plot all HIGH/CRITICAL projects on an interactive choropleth map at state and district
  level. Geographic concentration analysis - clusters of high-risk projects in specific
  parliamentary constituencies - is a powerful signal invisible in tabular views.

Real-Time Alerting:
  When new pipeline runs complete and a project crosses the CRITICAL threshold for the
  first time, automatically trigger email or SMS alerts to the designated district audit
  officer, enabling immediate response.

Audit Workflow Management:
  Add a case management layer on top of the existing audit docket system:
  - Assign flagged cases to specific auditors
  - Track investigation status (Open -> In Field Verification -> Resolved)
  - Record resolution type (Anomaly Confirmed / False Positive / Awaiting Evidence)
  - Build a feedback loop that improves future model calibration over time

Historical Baselines and Trend Analysis:
  Archive monthly pipeline snapshots to enable year-over-year comparisons such as
  "Maharashtra's average risk score increased from 32 to 41 between April 2024 and
  April 2025." This enables systemic risk trend monitoring at the programme level.

OCR-Based Document Cross-Validation:
  MPs and District Authorities submit physical Measurement Books and Sanction Orders. A
  future integration would allow these PDFs/scans to be uploaded and parsed via OCR
  (Google Document AI or Tesseract), extracting amounts for cross-validation against portal
  data. Discrepancies between the physical sanction and portal-recorded amount would
  generate an automatic flag.

### 8.3 Infrastructure & Scale

PostgreSQL Migration:
  The current JSON file + Pandas in-memory approach scales to ~50,000 projects. For the
  full national MPLADS dataset (potentially hundreds of thousands of records across all
  years since 2011), migrating to PostgreSQL with proper indexes on state_name, risk_band,
  overall_risk_score, and mp_name would enable sub-millisecond filtered queries.

Redis Caching Layer:
  For high-concurrency deployment (multiple auditors simultaneously querying), add Redis
  for caching frequently accessed aggregations (national KPIs, state summaries) with a
  configurable TTL tied to the pipeline refresh cycle.

Kubernetes Deployment:
  Containerized via Docker Compose today; the natural production evolution is a Kubernetes
  deployment with horizontal pod autoscaling for the API layer, enabling the platform to
  serve hundreds of concurrent auditors without manual scaling.

CI/CD Pipeline:
  Integrate GitHub Actions to automatically run the pytest suite on every pull request,
  build Docker images, and deploy to a staging environment for review before production release.

### 8.4 Policy and Governance

Integration with PFMS (Public Financial Management System):
  PFMS is the Government of India's central payment platform. Integration would allow the
  MPLADS monitor to pull live payment release data, enabling a new anomaly class: mismatches
  between what the portal records as expended vs what PFMS actually disbursed.

Multi-Scheme Extension:
  The detection engine architecture (ETL -> Feature Engineering -> Rule Engine -> ML
  Scoring -> Risk Scoring) is scheme-agnostic. With configuration-level changes to the
  rule set and feature definitions, the same platform could monitor:
  - MLALAD (Member of Legislative Assembly Local Area Development)
  - DMDF (District Mineral Development Fund)
  - Smart Cities Mission project tracking

RTI Public Dashboard:
  A read-only public-facing version of the national overview dashboard (without
  project-level risk details) could be published as a transparency initiative, allowing
  citizens to see fund utilization trends across states without exposing individual
  project risk scores that could be misinterpreted.

---

## 9. Legal & Ethical Posture

This platform was designed with explicit attention to the legal and ethical constraints
of deploying AI in government governance.

What the Platform IS:
  - A statistical pre-screening tool surfacing projects warranting human audit attention
  - A priority-ranking system for directing limited audit resources
  - A data visualization and search platform for MPLADS programme management

What the Platform IS NOT:
  - A fraud detection system
  - An enforcement mechanism
  - A system that makes any administrative decision autonomously

Mandatory Human Review:
  The platform is explicitly a Human-in-the-Loop system. Every workflow terminates in a
  human decision: an auditor must review, verify, and sign the audit case. The platform
  provides evidence; humans make decisions.

Data Source Transparency:
  All data displayed on the platform is sourced from the publicly available MoSPI eSAKSHI
  portal. No private or confidential government data is required.

Algorithmic Transparency:
  The scoring formula, rule definitions, feature set, and model type are fully documented
  in this document and in the codebase itself. Any CAG officer can audit the audit tool.

---

Document Version: 1.0
Prepared For: Smart India Hackathon 2026 - Problem Statement SIH26102
Ministry of Statistics and Programme Implementation (MoSPI)
Data Source: MoSPI eSAKSHI MPLADS Portal - https://mplads.mospi.gov.in
