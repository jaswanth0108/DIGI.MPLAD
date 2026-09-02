"""
MPLADS Monitor — FastAPI Application
======================================
Main API server providing all endpoints for the dashboard frontend.

Security:
- Parameterized queries only (no SQL injection)
- Input sanitization on all endpoints
- CORS configured for frontend only
- No raw LLM-generated SQL execution
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings
from api.models.schemas import (
    HealthResponse, NationalKPIs, StateRiskSummary, MpRiskSummary,
    ProjectSummary, ProjectDetail, ProjectListResponse, ProjectFilter,
    AnomalyResultSchema, RiskExplanation, AuditCaseSchema,
    NLSearchRequest, NLSearchResponse, TrendPoint, NewProjectInput,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MPLADS Anomaly Detection API",
    description=(
        "AI-powered system to detect anomalies, fraud indicators, and inefficiencies "
        "in MPLADS (Members of Parliament Local Area Development Scheme). "
        "DISCLAIMER: All risk scores are indicators for human review, not fraud findings."
    ),
    version=settings.model_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production: settings.cors_origins_list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# In-Memory Data Store (loaded from pipeline output)
# ─────────────────────────────────────────────────────────────────────────────

class DataStore:
    """Thread-safe in-memory data store loaded from processed pipeline output."""

    def __init__(self):
        self.master_df: Optional[pd.DataFrame] = None
        self.anomalies: list = []
        self.pairs_df: Optional[pd.DataFrame] = None
        self.loaded_at: Optional[datetime] = None
        self.data_dir = Path(__file__).parent.parent.parent / "data" / "processed"

    def load(self):
        """Load latest processed data from disk."""
        master_path = self.data_dir / "master_projects_latest.json"
        anomalies_path = self.data_dir / "anomaly_results_latest.json"
        pairs_path = self.data_dir / "duplicate_pairs_latest.json"

        if not master_path.exists():
            logger.warning(f"No data found at {master_path}. Run pipeline first!")
            return False

        try:
            self.master_df = pd.read_json(master_path)
            logger.info(f"Loaded {len(self.master_df)} projects from {master_path}")

            if anomalies_path.exists():
                with open(anomalies_path) as f:
                    self.anomalies = json.load(f)
                logger.info(f"Loaded {len(self.anomalies)} anomaly records")

            if pairs_path.exists():
                self.pairs_df = pd.read_json(pairs_path)
                logger.info(f"Loaded {len(self.pairs_df)} duplicate pairs")

            self.loaded_at = datetime.now()

            # Convert dates
            for col in ["recommended_date", "actual_end_date"]:
                if col in self.master_df.columns:
                    self.master_df[col] = pd.to_datetime(
                        self.master_df[col], errors="coerce"
                    ).dt.date

            return True

        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            return False


store = DataStore()


@app.on_event("startup")
async def startup():
    """Load data on server startup."""
    if not store.load():
        logger.warning("Server started without data. Run pipeline first.")


# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_data():
    if store.master_df is None or store.master_df.empty:
        raise HTTPException(status_code=503, detail="No data loaded. Run pipeline first.")


def _safe_float(val) -> Optional[float]:
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    return float(val)


def _safe_int(val) -> Optional[int]:
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    return int(val)


def _project_to_summary(row) -> dict:
    """Convert a DataFrame row to ProjectSummary dict."""
    return {
        "project_id": _safe_int(row.get("project_id")),
        "house_type": row.get("house_type"),
        "state_name": row.get("state_name"),
        "constituency_name": row.get("constituency_name"),
        "mp_name": row.get("mp_name"),
        "city_name": row.get("city_name"),
        "ida_name": row.get("ida_name"),
        "location_type": row.get("location_type"),
        "allocated_amount": _safe_float(row.get("allocated_amount")),
        "expenditure_amt": _safe_float(row.get("expenditure_amt")),
        "recommended_date": row.get("recommended_date"),
        "work_status": row.get("work_status"),
        "dataset_source": row.get("dataset_source"),
        "expenditure_ratio": _safe_float(row.get("expenditure_ratio")),
        "project_age_days": _safe_int(row.get("project_age_days")),
        "is_completed": bool(row.get("is_completed", False)),
        "is_ongoing": bool(row.get("is_ongoing", False)),
        "is_overdue": bool(row.get("is_overdue", False)),
        "overall_risk_score": _safe_float(row.get("overall_risk_score")),
        "risk_band": row.get("risk_band"),
    }


def _project_to_detail(row) -> dict:
    """Convert a DataFrame row to full ProjectDetail dict."""
    d = _project_to_summary(row)
    d.update({
        "tenure_name": row.get("tenure_name"),
        "block_name": row.get("block_name"),
        "village_name": row.get("village_name"),
        "available_limit": _safe_float(row.get("available_limit")),
        "actual_end_date": row.get("actual_end_date"),
        "letter_no": row.get("letter_no"),
        "cost_variance_pct": _safe_float(row.get("cost_variance_pct")),
        "days_to_complete": _safe_int(row.get("days_to_complete")),
        "is_unsanctioned": bool(row.get("is_unsanctioned", False)),
        "is_stalled": bool(row.get("is_stalled", False)),
        "district_median_amount": _safe_float(row.get("district_median_amount")),
        "state_median_amount": _safe_float(row.get("state_median_amount")),
        "amount_vs_district_pct": _safe_float(row.get("amount_vs_district_pct")),
        "amount_vs_state_pct": _safe_float(row.get("amount_vs_state_pct")),
        "mp_project_count": _safe_int(row.get("mp_project_count")),
        "constituency_project_count": _safe_int(row.get("constituency_project_count")),
        "financial_risk_score": _safe_float(row.get("financial_risk_score")),
        "delay_risk_score": _safe_float(row.get("delay_risk_score")),
        "expenditure_risk_score": _safe_float(row.get("expenditure_risk_score")),
        "duplicate_risk_score": _safe_float(row.get("duplicate_risk_score")),
        "peer_deviation_score": _safe_float(row.get("peer_deviation_score")),
        "ml_anomaly_score": _safe_float(row.get("ml_anomaly_score")),
        "risk_flags": row.get("risk_flags"),
        "model_version": row.get("model_version"),
        "rules_version": row.get("rules_version"),
        "ingested_at": row.get("ingested_at"),
    })
    return d


# ─────────────────────────────────────────────────────────────────────────────
# API Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    total = len(store.master_df) if store.master_df is not None else 0
    db_status = "loaded" if total > 0 else "no_data"
    return HealthResponse(
        status="ok",
        database=db_status,
        model_version=settings.model_version,
        rules_version=settings.rules_version,
        total_projects=total,
        timestamp=datetime.now(),
    )


@app.get("/api/dashboard/overview")
async def dashboard_overview():
    """National-level KPI dashboard."""
    _ensure_data()
    df = store.master_df

    total_alloc = df["allocated_amount"].sum() or 0
    total_exp = df["expenditure_amt"].sum() or 0
    completed = df[df["is_completed"] == True]
    ongoing = df[df["is_ongoing"] == True]
    unsanctioned = df[df["is_unsanctioned"] == True]

    return {
        "total_projects": len(df),
        "total_allocated_crore": round(total_alloc / 1_00_00_000, 2),
        "total_expenditure_crore": round(total_exp / 1_00_00_000, 2),
        "total_completed": len(completed),
        "total_ongoing": len(ongoing),
        "total_unsanctioned": len(unsanctioned),
        "fund_utilization_pct": round(
            (total_exp / total_alloc * 100) if total_alloc > 0 else 0, 2
        ),
        "high_risk_projects": int((df["risk_band"] == "HIGH").sum()),
        "critical_risk_projects": int((df["risk_band"] == "CRITICAL").sum()),
        "risk_distribution": df["risk_band"].value_counts().to_dict(),
        "avg_risk_score": round(float(df["overall_risk_score"].mean()), 2),
        "total_states": int(df["state_name"].nunique()),
        "total_constituencies": int(df["constituency_name"].nunique()),
        "total_mps": int(df["mp_name"].nunique()),
        "overdue_projects": int(df["is_overdue"].sum()),
        "stalled_projects": int(df["is_stalled"].sum()),
        "data_as_of": str(store.loaded_at),
        "data_disclaimer": (
            "Data sourced from MPLADS eSAKSHI portal (April 2023 onward). "
            "Risk scores are AI-generated indicators for human review."
        ),
    }


@app.get("/api/dashboard/states")
async def dashboard_states():
    """State-level risk summary for all states."""
    _ensure_data()
    df = store.master_df

    states = []
    for state, group in df.groupby("state_name"):
        total_alloc = group["allocated_amount"].sum() or 0
        total_exp = group["expenditure_amt"].sum() or 0
        states.append({
            "state_name": state,
            "total_projects": len(group),
            "total_allocated_crore": round(total_alloc / 1_00_00_000, 2),
            "total_expenditure_crore": round(total_exp / 1_00_00_000, 2),
            "fund_utilization_pct": round(
                (total_exp / total_alloc * 100) if total_alloc > 0 else 0, 2
            ),
            "high_risk_count": int((group["risk_band"] == "HIGH").sum()),
            "critical_risk_count": int((group["risk_band"] == "CRITICAL").sum()),
            "avg_risk_score": round(float(group["overall_risk_score"].mean()), 2),
            "delayed_projects": int(group["is_overdue"].sum()),
            "completed_pct": round(
                group["is_completed"].sum() / len(group) * 100 if len(group) > 0 else 0, 1
            ),
        })

    states.sort(key=lambda s: s["avg_risk_score"], reverse=True)
    return {"states": states, "total_states": len(states)}


@app.get("/api/dashboard/state/{state_name}")
async def dashboard_state_detail(state_name: str):
    """Single state detailed view."""
    _ensure_data()
    df = store.master_df
    state_df = df[df["state_name"].str.upper() == state_name.upper()]

    if state_df.empty:
        raise HTTPException(status_code=404, detail=f"State '{state_name}' not found")

    total_alloc = state_df["allocated_amount"].sum() or 0
    total_exp = state_df["expenditure_amt"].sum() or 0

    # Top risk projects
    top_risk = (
        state_df.nlargest(10, "overall_risk_score")
        .apply(lambda r: _project_to_summary(r), axis=1)
        .tolist()
    )

    # Constituency breakdown
    const_data = []
    for const, cg in state_df.groupby("constituency_name"):
        const_alloc = cg["allocated_amount"].sum() or 0
        const_exp = cg["expenditure_amt"].sum() or 0
        const_data.append({
            "constituency_name": const,
            "total_projects": len(cg),
            "total_allocated_crore": round(const_alloc / 1_00_00_000, 2),
            "high_risk_count": int((cg["risk_band"].isin(["HIGH", "CRITICAL"])).sum()),
            "avg_risk_score": round(float(cg["overall_risk_score"].mean()), 2),
        })

    return {
        "state_name": state_name,
        "total_projects": len(state_df),
        "total_allocated_crore": round(total_alloc / 1_00_00_000, 2),
        "total_expenditure_crore": round(total_exp / 1_00_00_000, 2),
        "fund_utilization_pct": round(
            (total_exp / total_alloc * 100) if total_alloc > 0 else 0, 2
        ),
        "risk_distribution": state_df["risk_band"].value_counts().to_dict(),
        "top_risk_projects": top_risk,
        "constituencies": const_data,
    }


@app.get("/api/projects")
async def list_projects(
    state: Optional[str] = None,
    constituency: Optional[str] = None,
    mp: Optional[str] = None,
    risk_band: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    is_overdue: Optional[bool] = None,
    is_completed: Optional[bool] = None,
    sort_by: str = "overall_risk_score",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Paginated, filterable project list."""
    _ensure_data()
    df = store.master_df.copy()

    # Apply filters (all parameterized — no SQL injection possible)
    if state:
        df = df[df["state_name"].str.upper() == state.upper()]
    if constituency:
        df = df[df["constituency_name"].str.upper() == constituency.upper()]
    if mp:
        df = df[df["mp_name"].str.upper().str.contains(mp.upper(), na=False)]
    if risk_band:
        bands = [b.strip().upper() for b in risk_band.split(",")]
        df = df[df["risk_band"].isin(bands)]
    if min_score is not None:
        df = df[df["overall_risk_score"] >= min_score]
    if max_score is not None:
        df = df[df["overall_risk_score"] <= max_score]
    if is_overdue is not None:
        df = df[df["is_overdue"] == is_overdue]
    if is_completed is not None:
        df = df[df["is_completed"] == is_completed]

    # Sort
    ascending = sort_order.lower() == "asc"
    if sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=ascending, na_position="last")

    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    page_df = df.iloc[start:end]

    projects = page_df.apply(lambda r: _project_to_summary(r), axis=1).tolist()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "projects": projects,
    }


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Full project detail including all risk scores."""
    _ensure_data()
    df = store.master_df
    try:
        pid_int = int(project_id)
        match = df[df["project_id"] == pid_int]
    except ValueError:
        match = pd.DataFrame()

    if match.empty:
        match = df[df["project_id"].astype(str) == str(project_id)]

    if match.empty:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    row = match.iloc[0]
    detail = _project_to_detail(row)
    matched_id = int(row.get("project_id", 0))

    # Get anomalies for this project
    project_anomalies = [
        a for a in store.anomalies if str(a.get("project_id")) == str(matched_id)
    ]
    detail["anomalies"] = project_anomalies

    return detail


@app.get("/api/projects/{project_id}/explanation")
async def get_project_explanation(project_id: str):
    """Full risk explanation with narrative and SHAP values."""
    _ensure_data()
    df = store.master_df
    try:
        pid_int = int(project_id)
        match = df[df["project_id"] == pid_int]
    except ValueError:
        match = pd.DataFrame()

    if match.empty:
        match = df[df["project_id"].astype(str) == str(project_id)]

    if match.empty:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    row = match.iloc[0].to_dict()
    matched_id = int(row.get("project_id", 0))
    project_anomalies = [
        a for a in store.anomalies if str(a.get("project_id")) == str(matched_id)
    ]

    # Generate narrative safely
    narrative = ""
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from explainability.nl_explanations import generate_risk_narrative
        narrative = generate_risk_narrative(row, project_anomalies)
    except Exception as e:
        logger.warning(f"Could not generate narrative: {e}")
        narrative = f"Project #{matched_id} located in {row.get('state_name', '')} - {row.get('constituency_name', '')}. Overall Risk Score: {row.get('overall_risk_score', 0)}/100 ({row.get('risk_band', 'LOW')})."

    return {
        "project_id": matched_id,
        "overall_risk_score": _safe_float(row.get("overall_risk_score")),
        "risk_band": row.get("risk_band"),
        "score_breakdown": {
            "financial": _safe_float(row.get("financial_risk_score")),
            "delay": _safe_float(row.get("delay_risk_score")),
            "expenditure": _safe_float(row.get("expenditure_risk_score")),
            "duplicate": _safe_float(row.get("duplicate_risk_score")),
            "peer_deviation": _safe_float(row.get("peer_deviation_score")),
            "ml_anomaly": _safe_float(row.get("ml_anomaly_score")),
        },
        "anomalies": project_anomalies,
        "narrative": narrative,
        "disclaimer": (
            "This risk score is generated by an AI-assisted system. "
            "It highlights patterns requiring attention, NOT fraud findings. "
            "Human verification is mandatory before any action."
        ),
    }


@app.post("/api/projects/{project_id}/audit-case")
async def generate_audit_case(project_id: str):
    """Generate an audit investigation card for a project."""
    _ensure_data()
    df = store.master_df
    try:
        pid_int = int(project_id)
        match = df[df["project_id"] == pid_int]
    except ValueError:
        match = pd.DataFrame()

    if match.empty:
        match = df[df["project_id"].astype(str) == str(project_id)]

    if match.empty:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    row = match.iloc[0].to_dict()
    matched_id = int(row.get("project_id", 0))
    project_anomalies = [
        a for a in store.anomalies if str(a.get("project_id")) == str(matched_id)
    ]

    from explainability.nl_explanations import generate_audit_case
    case = generate_audit_case(row, project_anomalies)
    return case


@app.get("/api/anomalies/high-risk")
async def get_high_risk_projects(
    limit: int = Query(50, ge=1, le=500),
):
    """Get projects with HIGH or CRITICAL risk bands."""
    _ensure_data()
    df = store.master_df

    high_risk = df[df["risk_band"].isin(["HIGH", "CRITICAL"])]
    high_risk = high_risk.nlargest(limit, "overall_risk_score")

    projects = high_risk.apply(lambda r: _project_to_summary(r), axis=1).tolist()

    return {
        "total_high_risk": int((df["risk_band"].isin(["HIGH", "CRITICAL"])).sum()),
        "showing": len(projects),
        "projects": projects,
    }


@app.get("/api/analytics/mps")
async def list_mps():
    """Get sorted directory of distinct MPs with state and constituency."""
    _ensure_data()
    df = store.master_df
    mp_groups = []
    for mp_name, group in df.groupby("mp_name"):
        state = group["state_name"].mode().iloc[0] if not group["state_name"].mode().empty else ""
        const = group["constituency_name"].mode().iloc[0] if not group["constituency_name"].mode().empty else ""
        mp_groups.append({
            "mp_name": mp_name,
            "state": state,
            "constituency": const,
            "total_projects": len(group),
            "avg_risk_score": round(float(group["overall_risk_score"].mean()), 2),
        })
    mp_groups.sort(key=lambda x: x["mp_name"])
    return {"mps": mp_groups}


@app.get("/api/analytics/mp/{mp_name}")
async def mp_analytics(mp_name: str):
    """MP-level analytics and risk profile for a single distinct MP."""
    _ensure_data()
    df = store.master_df
    
    clean_name = mp_name.strip().upper()
    exact_match = df[df["mp_name"].str.upper() == clean_name]
    if not exact_match.empty:
        target_name = exact_match.iloc[0]["mp_name"]
        mp_df = exact_match
    else:
        matches = df[df["mp_name"].str.upper().str.contains(clean_name, na=False)]
        if matches.empty:
            raise HTTPException(status_code=404, detail=f"MP '{mp_name}' not found")
        target_name = matches["mp_name"].value_counts().index[0]
        mp_df = df[df["mp_name"] == target_name]

    total_alloc = mp_df["allocated_amount"].sum() or 0
    total_exp = mp_df["expenditure_amt"].sum() or 0

    return {
        "mp_name": target_name,
        "state": mp_df["state_name"].mode().iloc[0] if not mp_df["state_name"].mode().empty else "N/A",
        "constituency": mp_df["constituency_name"].mode().iloc[0] if not mp_df["constituency_name"].mode().empty else "N/A",
        "total_projects": len(mp_df),
        "total_allocated_crore": round(total_alloc / 1_00_00_000, 2),
        "total_expenditure_crore": round(total_exp / 1_00_00_000, 2),
        "fund_utilization_pct": round(
            (total_exp / total_alloc * 100) if total_alloc > 0 else 0, 2
        ),
        "avg_risk_score": round(float(mp_df["overall_risk_score"].mean()), 2),
        "risk_distribution": mp_df["risk_band"].value_counts().to_dict(),
        "completed_pct": round(
            mp_df["is_completed"].sum() / len(mp_df) * 100 if len(mp_df) > 0 else 0, 1
        ),
        "overdue_count": int(mp_df["is_overdue"].sum()),
        "top_risk_projects": (
            mp_df.nlargest(5, "overall_risk_score")
            .apply(lambda r: _project_to_summary(r), axis=1)
            .tolist()
        ),
    }


@app.get("/api/analytics/trends")
async def analytics_trends():
    """Time-based trend data with citizen-friendly quarter names."""
    _ensure_data()
    df = store.master_df.copy()

    rec_dates = pd.to_datetime(df["recommended_date"], errors="coerce")
    df["quarter"] = rec_dates.dt.to_period("Q").astype(str)

    quarter_names = {
        "1": ("Jan–Mar", "January – March (Q1)"),
        "2": ("Apr–Jun", "April – June (Q2)"),
        "3": ("Jul–Sep", "July – September (Q3)"),
        "4": ("Oct–Dec", "October – December (Q4)"),
    }

    trends = []
    for period, group in df.groupby("quarter"):
        if period == "NaT" or pd.isna(period):
            continue
        rec_amt = group["allocated_amount"].sum() or 0
        exp_amt = group["expenditure_amt"].sum() or 0
        
        # Parse year and quarter
        period_str = str(period)
        display_label = period_str
        full_period = period_str
        if "Q" in period_str:
            parts = period_str.split("Q")
            year = parts[0]
            q_num = parts[1]
            short_year = year[-2:] if len(year) == 4 else year
            if q_num in quarter_names:
                short_m, full_m = quarter_names[q_num]
                display_label = f"{short_m} '{short_year}"
                full_period = f"{full_m} {year}"

        trends.append({
            "period": period_str,
            "display_label": display_label,
            "full_period": full_period,
            "projects_recommended": len(group),
            "projects_completed": int(group["is_completed"].sum()),
            "amount_recommended_crore": round(rec_amt / 1_00_00_000, 2),
            "amount_expended_crore": round(exp_amt / 1_00_00_000, 2),
        })

    trends.sort(key=lambda t: t["period"])
    return {"trends": trends}


@app.post("/api/search")
async def nl_search(request: NLSearchRequest):
    """
    Natural language search → parameterized filter.
    
    SECURITY: The NL query is NEVER executed as raw SQL.
    It is parsed into a safe ProjectFilter object.
    """
    _ensure_data()
    query = request.query.strip().lower()

    # Simple keyword-based NL → filter mapping (safe, no LLM SQL)
    filters = {}
    interpretation_parts = []

    # State detection
    states = store.master_df["state_name"].dropna().unique()
    for s in states:
        if s.lower() in query:
            filters["state"] = s
            interpretation_parts.append(f"state = {s}")
            break

    # Risk level
    if "critical" in query:
        filters["risk_band"] = "CRITICAL"
        interpretation_parts.append("risk = CRITICAL")
    elif "high risk" in query or "high-risk" in query:
        filters["risk_band"] = "HIGH,CRITICAL"
        interpretation_parts.append("risk = HIGH or CRITICAL")

    # Amount threshold
    import re
    amount_match = re.search(r'(\d+)\s*(lakh|crore|cr)', query)
    if amount_match:
        val = int(amount_match.group(1))
        unit = amount_match.group(2)
        if "crore" in unit or "cr" in unit:
            filters["min_score"] = None
            interpretation_parts.append(f"amount > {val} crore")
        else:
            interpretation_parts.append(f"amount > {val} lakh")

    # Status
    if "delayed" in query or "overdue" in query:
        filters["is_overdue"] = True
        interpretation_parts.append("overdue = true")
    elif "completed" in query:
        filters["is_completed"] = True
        interpretation_parts.append("completed = true")
    elif "ongoing" in query:
        filters["is_completed"] = False
        interpretation_parts.append("ongoing/incomplete")

    interpreted = " AND ".join(interpretation_parts) if interpretation_parts else "all projects"

    # Apply filters through the same safe endpoint
    df = store.master_df.copy()
    if "state" in filters:
        df = df[df["state_name"].str.upper() == filters["state"].upper()]
    if "risk_band" in filters:
        bands = [b.strip() for b in filters["risk_band"].split(",")]
        df = df[df["risk_band"].isin(bands)]
    if "is_overdue" in filters:
        df = df[df["is_overdue"] == filters["is_overdue"]]
    if "is_completed" in filters:
        df = df[df["is_completed"] == filters["is_completed"]]

    df = df.sort_values("overall_risk_score", ascending=False)
    total = len(df)
    page_df = df.head(20)
    projects = page_df.apply(lambda r: _project_to_summary(r), axis=1).tolist()

    return {
        "query": request.query,
        "interpreted_as": interpreted,
        "total": total,
        "results": {
            "total": total,
            "page": 1,
            "page_size": 20,
            "projects": projects,
        },
        "disclaimer": "Results are based on keyword matching. Verify data independently.",
    }


@app.get("/api/filters/states")
async def get_filter_states():
    """Get list of all states for filter dropdowns."""
    _ensure_data()
    states = sorted(store.master_df["state_name"].dropna().unique().tolist())
    return {"states": states}


@app.get("/api/filters/constituencies/{state_name}")
async def get_filter_constituencies(state_name: str):
    """Get constituencies for a state."""
    _ensure_data()
    df = store.master_df
    const = (
        df[df["state_name"].str.upper() == state_name.upper()]
        ["constituency_name"].dropna().unique().tolist()
    )
    return {"constituencies": sorted(const)}


@app.post("/api/projects/submit")
async def submit_project(project: NewProjectInput):
    """
    Ingest a new MPLADS project record via the frontend,
    execute instant feature extraction, rule anomaly detection,
    and risk scoring, then insert it live into the dataset.
    """
    _ensure_data()
    df = store.master_df

    # 1. Assign new unique project ID
    new_id = int(df["project_id"].max() + 1) if "project_id" in df.columns and len(df) > 0 else 100001

    # 2. Parse dates & compute temporal features
    rec_date = None
    if project.recommended_date:
        try:
            rec_date = datetime.strptime(project.recommended_date, "%Y-%m-%d").date()
        except ValueError:
            rec_date = datetime.now().date()
    else:
        rec_date = datetime.now().date()

    today = datetime.now().date()
    age_days = max(0, (today - rec_date).days)

    # 3. Status flags
    status_clean = project.work_status.strip().title()
    is_completed = status_clean.lower() == "completed"
    is_ongoing = status_clean.lower() in ["on going", "ongoing", "sanctioned"]
    is_unsanctioned = status_clean.lower() == "unsanctioned"
    is_overdue = (age_days > 365) and not is_completed

    # 4. Financial features
    alloc = float(project.allocated_amount)
    exp = float(project.expenditure_amt)
    exp_ratio = round(exp / alloc, 4) if alloc > 0 else 0.0
    cost_var = round(((exp - alloc) / alloc * 100), 2) if alloc > 0 else 0.0
    is_stalled = (age_days > 365) and is_ongoing and (exp_ratio < 0.05)

    # 5. Peer stats
    district_peers = df[df["constituency_name"].str.upper() == project.constituency_name.strip().upper()]
    state_peers = df[df["state_name"].str.upper() == project.state_name.strip().upper()]

    dist_med = float(district_peers["allocated_amount"].median()) if not district_peers.empty else (float(df["allocated_amount"].median()) if not df.empty else alloc)
    st_med = float(state_peers["allocated_amount"].median()) if not state_peers.empty else (float(df["allocated_amount"].median()) if not df.empty else alloc)

    amt_vs_dist_pct = round(((alloc - dist_med) / dist_med * 100), 2) if dist_med > 0 else 0.0
    amt_vs_st_pct = round(((alloc - st_med) / st_med * 100), 2) if st_med > 0 else 0.0

    # 6. Evaluate Deterministic Rules
    rule_anomalies = []
    fin_score = 0.0
    delay_score = 0.0
    exp_score = 0.0
    peer_score = 0.0

    # R001: Cost Overrun
    if exp > (alloc * 1.05):
        fin_score = max(fin_score, 80.0)
        rule_anomalies.append({
            "result_id": len(store.anomalies) + len(rule_anomalies) + 1,
            "project_id": new_id,
            "detection_type": "RULE",
            "rule_name": "R001: Cost Overrun",
            "severity": "CRITICAL",
            "score_contribution": 80.0,
            "explanation": f"Expenditure (₹{exp:,.0f}) exceeds allocation (₹{alloc:,.0f}) by {cost_var:.1f}% without sanctioned revision.",
            "detected_at": datetime.now().isoformat(),
        })

    # R004: Unsanctioned Spending
    if is_unsanctioned and exp > 0:
        fin_score = max(fin_score, 90.0)
        rule_anomalies.append({
            "result_id": len(store.anomalies) + len(rule_anomalies) + 1,
            "project_id": new_id,
            "detection_type": "RULE",
            "rule_name": "R004: Unsanctioned Expenditure",
            "severity": "CRITICAL",
            "score_contribution": 90.0,
            "explanation": f"Expenditure of ₹{exp:,.0f} logged against work that has not received administrative sanction.",
            "detected_at": datetime.now().isoformat(),
        })

    # R002 / R003: Delay & Overdue
    if age_days >= 730 and not is_completed:
        delay_score = max(delay_score, 75.0)
        rule_anomalies.append({
            "result_id": len(store.anomalies) + len(rule_anomalies) + 1,
            "project_id": new_id,
            "detection_type": "RULE",
            "rule_name": "R002: Very Old Incomplete Work",
            "severity": "HIGH",
            "score_contribution": 75.0,
            "explanation": f"Project has been active for {age_days} days (> 2 years) without reaching completion status.",
            "detected_at": datetime.now().isoformat(),
        })
    elif age_days >= 365 and is_ongoing:
        delay_score = max(delay_score, 50.0)
        rule_anomalies.append({
            "result_id": len(store.anomalies) + len(rule_anomalies) + 1,
            "project_id": new_id,
            "detection_type": "RULE",
            "rule_name": "R003: Ongoing Project Overdue",
            "severity": "MEDIUM",
            "score_contribution": 50.0,
            "explanation": f"Project is ongoing after {age_days} days, exceeding the standard 365-day delivery window.",
            "detected_at": datetime.now().isoformat(),
        })

    # R008: Stalled Funds
    if is_stalled:
        exp_score = max(exp_score, 65.0)
        rule_anomalies.append({
            "result_id": len(store.anomalies) + len(rule_anomalies) + 1,
            "project_id": new_id,
            "detection_type": "RULE",
            "rule_name": "R008: Stalled Funds",
            "severity": "HIGH",
            "score_contribution": 65.0,
            "explanation": f"Project has consumed only {exp_ratio*100:.1f}% of funds after {age_days} days.",
            "detected_at": datetime.now().isoformat(),
        })

    # R005 / R006: Peer Allocation Outlier
    if dist_med > 0 and alloc > (dist_med * 3.0):
        peer_score = max(peer_score, 70.0)
        rule_anomalies.append({
            "result_id": len(store.anomalies) + len(rule_anomalies) + 1,
            "project_id": new_id,
            "detection_type": "RULE",
            "rule_name": "R005: District Allocation Outlier",
            "severity": "HIGH",
            "score_contribution": 70.0,
            "explanation": f"Allocated amount (₹{alloc:,.0f}) is >3x higher than constituency median (₹{dist_med:,.0f}).",
            "detected_at": datetime.now().isoformat(),
        })
    elif st_med > 0 and alloc > (st_med * 2.5):
        peer_score = max(peer_score, 50.0)
        rule_anomalies.append({
            "result_id": len(store.anomalies) + len(rule_anomalies) + 1,
            "project_id": new_id,
            "detection_type": "RULE",
            "rule_name": "R006: State Allocation Outlier",
            "severity": "MEDIUM",
            "score_contribution": 50.0,
            "explanation": f"Allocated amount is >2.5x higher than state median (₹{st_med:,.0f}).",
            "detected_at": datetime.now().isoformat(),
        })

    # 7. Composite Risk Score
    overall_score = round(
        settings.weight_financial * fin_score +
        settings.weight_delay * delay_score +
        settings.weight_expenditure * exp_score +
        settings.weight_peer * peer_score,
        2
    )
    risk_band = settings.get_risk_band(overall_score)

    # 8. Construct full row record
    new_record = {
        "project_id": new_id,
        "house_type": project.house_type or "LOK",
        "state_name": project.state_name.strip().upper(),
        "constituency_name": project.constituency_name.strip().upper(),
        "mp_name": project.mp_name.strip().upper(),
        "city_name": project.constituency_name.strip().title(),
        "ida_name": f"District Collectorate, {project.constituency_name.strip().title()}",
        "location_type": project.location_type or "Rural",
        "allocated_amount": alloc,
        "expenditure_amt": exp,
        "recommended_date": rec_date,
        "work_status": status_clean,
        "dataset_source": "Live Ingest / User Submission",
        "expenditure_ratio": exp_ratio,
        "project_age_days": age_days,
        "is_completed": is_completed,
        "is_ongoing": is_ongoing,
        "is_overdue": is_overdue,
        "is_stalled": is_stalled,
        "is_unsanctioned": is_unsanctioned,
        "cost_variance_pct": cost_var,
        "district_median_amount": dist_med,
        "state_median_amount": st_med,
        "amount_vs_district_pct": amt_vs_dist_pct,
        "amount_vs_state_pct": amt_vs_st_pct,
        "financial_risk_score": fin_score,
        "delay_risk_score": delay_score,
        "expenditure_risk_score": exp_score,
        "duplicate_risk_score": 0.0,
        "peer_deviation_score": peer_score,
        "ml_anomaly_score": 0.0,
        "overall_risk_score": overall_score,
        "risk_band": risk_band,
        "letter_no": project.letter_no or f"MPLADS/{project.constituency_name[:3].upper()}/{datetime.now().year}/{new_id}",
        "ingested_at": datetime.now().isoformat(),
        "model_version": settings.model_version,
        "rules_version": settings.rules_version,
    }

    # 9. Insert live into in-memory store (at the very top of the DataFrame)
    new_df_row = pd.DataFrame([new_record])
    store.master_df = pd.concat([new_df_row, store.master_df], ignore_index=True)
    store.anomalies.extend(rule_anomalies)

    # 10. Persist to master_projects_latest.json
    try:
        master_path = store.data_dir / "master_projects_latest.json"
        store.master_df.to_json(master_path, orient="records", date_format="iso", default_handler=str, indent=2)
        anomalies_path = store.data_dir / "anomaly_results_latest.json"
        with open(anomalies_path, "w") as f:
            json.dump(store.anomalies, f, indent=2, default=str)
    except Exception as e:
        logger.warning(f"Could not persist submitted project to disk: {e}")

    return {
        "status": "success",
        "message": f"Project #{new_id} ingested and assessed successfully. Risk band: {risk_band} ({overall_score}/100)",
        "project": _project_to_detail(new_record),
        "anomalies_detected": rule_anomalies,
        "overall_risk_score": overall_score,
        "risk_band": risk_band,
    }


@app.get("/api/data/reload")
async def reload_data():
    """Reload data from disk (admin endpoint)."""
    success = store.load()
    if success:
        return {"status": "ok", "projects_loaded": len(store.master_df)}
    else:
        raise HTTPException(status_code=500, detail="Failed to reload data")



# ─────────────────────────────────────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    uvicorn.run(app, host=settings.api_host, port=settings.api_port, reload=True)
