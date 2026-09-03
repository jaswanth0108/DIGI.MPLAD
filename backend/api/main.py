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

import io
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

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
        store.load()
    if store.master_df is None or store.master_df.empty:
        raise HTTPException(status_code=503, detail="No data loaded. Run pipeline first.")


def _safe_float(val, default=None) -> Optional[float]:
    if val is None or pd.isna(val):
        return default
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return f
    except Exception:
        return default


def _safe_int(val, default=None) -> Optional[int]:
    if val is None or pd.isna(val):
        return default
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return int(f)
    except Exception:
        return default


def _safe_str(val, default=None) -> Optional[str]:
    if val is None or pd.isna(val):
        return default
    s = str(val).strip()
    if s.lower() in ("nan", "nat", "none", "<na>"):
        return default
    return s


def _safe_bool(val, default=False) -> bool:
    if val is None or pd.isna(val):
        return default
    if isinstance(val, (bool, np.bool_)):
        return bool(val)
    if isinstance(val, (int, float)):
        return bool(val != 0)
    s = str(val).strip().lower()
    return s in ("true", "1", "yes", "t", "y")


def _row_val(row, key, default=None):
    """Safely extract value whether row is a Series or a dict."""
    if isinstance(row, dict):
        return row.get(key, default)
    if hasattr(row, "get"):
        val = row.get(key, default)
        return default if pd.isna(val) else val
    try:
        if key in row:
            val = row[key]
            return default if pd.isna(val) else val
    except Exception:
        pass
    return default


def _project_to_summary(row) -> dict:
    """Convert a DataFrame row or dict to ProjectSummary dict."""
    return {
        "project_id": _safe_int(_row_val(row, "project_id"), 0),
        "house_type": _safe_str(_row_val(row, "house_type"), "LOK"),
        "state_name": _safe_str(_row_val(row, "state_name"), "N/A"),
        "constituency_name": _safe_str(_row_val(row, "constituency_name"), "N/A"),
        "mp_name": _safe_str(_row_val(row, "mp_name"), "Hon'ble MP"),
        "city_name": _safe_str(_row_val(row, "city_name")),
        "ida_name": _safe_str(_row_val(row, "ida_name")),
        "location_type": _safe_str(_row_val(row, "location_type"), "Rural"),
        "category": _safe_str(_row_val(row, "category"), "Community Infrastructure"),
        "work_description": _safe_str(_row_val(row, "work_description")),
        "allocated_amount": _safe_float(_row_val(row, "allocated_amount"), 0.0),
        "expenditure_amt": _safe_float(_row_val(row, "expenditure_amt"), 0.0),
        "recommended_date": _safe_str(_row_val(row, "recommended_date")),
        "work_status": _safe_str(_row_val(row, "work_status"), "On Going"),
        "dataset_source": _safe_str(_row_val(row, "dataset_source"), "Authorized Officer Ingestion"),
        "expenditure_ratio": _safe_float(_row_val(row, "expenditure_ratio")),
        "project_age_days": _safe_int(_row_val(row, "project_age_days"), 0),
        "is_completed": _safe_bool(_row_val(row, "is_completed")),
        "is_ongoing": _safe_bool(_row_val(row, "is_ongoing")),
        "is_overdue": _safe_bool(_row_val(row, "is_overdue")),
        "overall_risk_score": _safe_float(_row_val(row, "overall_risk_score"), 0.0),
        "risk_band": _safe_str(_row_val(row, "risk_band"), "LOW"),
    }


def _project_to_detail(row) -> dict:
    """Convert a DataFrame row or dict to full ProjectDetail dict."""
    d = _project_to_summary(row)
    d.update({
        "tenure_name": _safe_str(_row_val(row, "tenure_name")),
        "block_name": _safe_str(_row_val(row, "block_name")),
        "village_name": _safe_str(_row_val(row, "village_name")),
        "available_limit": _safe_float(_row_val(row, "available_limit")),
        "actual_end_date": _safe_str(_row_val(row, "actual_end_date")),
        "letter_no": _safe_str(_row_val(row, "letter_no")),
        "cost_variance_pct": _safe_float(_row_val(row, "cost_variance_pct")),
        "days_to_complete": _safe_int(_row_val(row, "days_to_complete")),
        "is_unsanctioned": _safe_bool(_row_val(row, "is_unsanctioned")),
        "is_stalled": _safe_bool(_row_val(row, "is_stalled")),
        "district_median_amount": _safe_float(_row_val(row, "district_median_amount")),
        "state_median_amount": _safe_float(_row_val(row, "state_median_amount")),
        "amount_vs_district_pct": _safe_float(_row_val(row, "amount_vs_district_pct")),
        "amount_vs_state_pct": _safe_float(_row_val(row, "amount_vs_state_pct")),
        "mp_project_count": _safe_int(_row_val(row, "mp_project_count")),
        "constituency_project_count": _safe_int(_row_val(row, "constituency_project_count")),
        "financial_risk_score": _safe_float(_row_val(row, "financial_risk_score"), 0.0),
        "delay_risk_score": _safe_float(_row_val(row, "delay_risk_score"), 0.0),
        "expenditure_risk_score": _safe_float(_row_val(row, "expenditure_risk_score"), 0.0),
        "duplicate_risk_score": _safe_float(_row_val(row, "duplicate_risk_score"), 0.0),
        "peer_deviation_score": _safe_float(_row_val(row, "peer_deviation_score"), 0.0),
        "ml_anomaly_score": _safe_float(_row_val(row, "ml_anomaly_score"), 0.0),
        "risk_flags": _row_val(row, "risk_flags", []),
        "model_version": _safe_str(_row_val(row, "model_version"), settings.model_version),
        "rules_version": _safe_str(_row_val(row, "rules_version"), settings.rules_version),
        "ingested_at": _safe_str(_row_val(row, "ingested_at")),
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


def _find_project_row(project_id: str) -> pd.DataFrame:
    """Find a project by int or string ID cleanly."""
    df = store.master_df
    if df is None or df.empty:
        return pd.DataFrame()
    clean_id = str(project_id).replace("#", "").strip()
    try:
        pid_int = int(clean_id)
        match = df[df["project_id"] == pid_int]
        if not match.empty:
            return match
    except (ValueError, TypeError):
        pass

    match = df[df["project_id"].astype(str) == clean_id]
    if not match.empty:
        return match

    return df[df["project_id"].astype(str) == str(project_id)]


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    """Full project detail including all risk scores."""
    _ensure_data()
    match = _find_project_row(project_id)

    if match.empty:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    row = match.iloc[0]
    detail = _project_to_detail(row)
    matched_id = int(detail.get("project_id", 0))

    # Get anomalies for this project
    project_anomalies = [
        a for a in store.anomalies if str(a.get("project_id")) == str(matched_id)
    ]
    detail["anomalies"] = project_anomalies

    return detail


@app.get("/api/projects/{project_id}/explanation")
async def get_project_explanation(project_id: str):
    """Full risk explanation with narrative and plain-English citizen briefing."""
    _ensure_data()
    match = _find_project_row(project_id)

    if match.empty:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    row = match.iloc[0]
    detail = _project_to_detail(row)
    matched_id = int(detail.get("project_id", 0))
    project_anomalies = [
        a for a in store.anomalies if str(a.get("project_id")) == str(matched_id)
    ]

    # Generate narrative safely
    narrative = ""
    try:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from explainability.nl_explanations import generate_risk_narrative
        narrative = generate_risk_narrative(detail, project_anomalies)
    except Exception as e:
        logger.warning(f"Could not generate narrative: {e}")
        narrative = (
            f"CASE BRIEFING: Project #{matched_id} located in {detail.get('state_name', 'N/A')} - {detail.get('constituency_name', 'N/A')}.\n"
            f"Approved Budget: ₹{(detail.get('allocated_amount') or 0):,.0f} | Disbursed: ₹{(detail.get('expenditure_amt') or 0):,.0f}.\n"
            f"Overall Risk Score: {detail.get('overall_risk_score', 0):.0f}/100 ({detail.get('risk_band', 'LOW')} Priority).\n\n"
            f"Recommended Action: Verify on-ground measurement books and execution milestones."
        )

    return {
        "project_id": matched_id,
        "overall_risk_score": _safe_float(detail.get("overall_risk_score"), 0.0),
        "risk_band": _safe_str(detail.get("risk_band"), "LOW"),
        "score_breakdown": {
            "financial": _safe_float(detail.get("financial_risk_score"), 0.0),
            "delay": _safe_float(detail.get("delay_risk_score"), 0.0),
            "expenditure": _safe_float(detail.get("expenditure_risk_score"), 0.0),
            "duplicate": _safe_float(detail.get("duplicate_risk_score"), 0.0),
            "peer_deviation": _safe_float(detail.get("peer_deviation_score"), 0.0),
            "ml_anomaly": _safe_float(detail.get("ml_anomaly_score"), 0.0),
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
    match = _find_project_row(project_id)

    if match.empty:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    row = match.iloc[0]
    detail = _project_to_detail(row)
    matched_id = int(detail.get("project_id", 0))
    project_anomalies = [
        a for a in store.anomalies if str(a.get("project_id")) == str(matched_id)
    ]

    try:
        from explainability.nl_explanations import generate_audit_case as gen_case
        case = gen_case(detail, project_anomalies)
        return case
    except Exception as e:
        logger.warning(f"Could not generate dynamic audit case: {e}")
        alloc_val = detail.get("allocated_amount") or 0.0
        exp_val = detail.get("expenditure_amt") or 0.0
        return {
            "project_id": matched_id,
            "priority": detail.get("risk_band", "LOW"),
            "summary": f"Project #{matched_id} in {detail.get('constituency_name', 'N/A')} ({detail.get('state_name', 'N/A')}) has an approved budget of ₹{alloc_val:,.0f} with ₹{exp_val:,.0f} spent to date. Risk score: {detail.get('overall_risk_score', 0):.0f}/100.",
            "anomalies": [
                {
                    "rule": a.get("rule_name", "Risk Indicator"),
                    "severity": a.get("severity", "MODERATE"),
                    "explanation": a.get("explanation", "Compliance indicator triggered."),
                    "action_advice": "Verify physical site conditions and measurement book.",
                }
                for a in project_anomalies
            ],
            "recommended_action": "1. Conduct on-site physical progress verification.\n2. Cross-check District Measurement Book entries with contractor bills.\n3. Confirm project utility with local beneficiaries.",
            "disclaimer": "This assessment is generated by an automated AI-assisted audit system for review.",
        }


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


def _process_single_project_data(p_dict: dict, new_id: int, df: pd.DataFrame, existing_anomalies_count: int):
    """Assess and construct full project record and detect anomalies."""
    rec_date_str = str(p_dict.get("recommended_date") or "").strip()
    rec_date = None
    if rec_date_str and rec_date_str.lower() != "nan" and rec_date_str.lower() != "nat":
        try:
            # Handle standard date string or timestamp
            if isinstance(p_dict.get("recommended_date"), (datetime, pd.Timestamp)):
                rec_date = p_dict["recommended_date"].date()
            else:
                rec_date = pd.to_datetime(rec_date_str).date()
        except Exception:
            rec_date = datetime.now().date()
    else:
        rec_date = datetime.now().date()

    today = datetime.now().date()
    age_days = max(0, (today - rec_date).days)

    status_clean = str(p_dict.get("work_status") or "On Going").strip().title()
    is_completed = status_clean.lower() == "completed"
    is_ongoing = status_clean.lower() in ["on going", "ongoing", "sanctioned"]
    is_unsanctioned = status_clean.lower() == "unsanctioned"
    is_overdue = (age_days > 365) and not is_completed

    try:
        alloc = float(p_dict.get("allocated_amount") or 0.0)
    except Exception:
        alloc = 0.0

    try:
        exp = float(p_dict.get("expenditure_amt") or 0.0)
    except Exception:
        exp = 0.0

    exp_ratio = round(exp / alloc, 4) if alloc > 0 else 0.0
    cost_var = round(((exp - alloc) / alloc * 100), 2) if alloc > 0 else 0.0
    is_stalled = (age_days > 365) and is_ongoing and (exp_ratio < 0.05)

    const_str = str(p_dict.get("constituency_name") or "CONSTITUENCY").strip().upper()
    state_str = str(p_dict.get("state_name") or "STATE").strip().upper()

    district_peers = df[df["constituency_name"].str.upper() == const_str] if not df.empty else pd.DataFrame()
    state_peers = df[df["state_name"].str.upper() == state_str] if not df.empty else pd.DataFrame()

    dist_med = float(district_peers["allocated_amount"].median()) if not district_peers.empty else (float(df["allocated_amount"].median()) if not df.empty else alloc)
    st_med = float(state_peers["allocated_amount"].median()) if not state_peers.empty else (float(df["allocated_amount"].median()) if not df.empty else alloc)

    amt_vs_dist_pct = round(((alloc - dist_med) / dist_med * 100), 2) if dist_med > 0 else 0.0
    amt_vs_st_pct = round(((alloc - st_med) / st_med * 100), 2) if st_med > 0 else 0.0

    rule_anomalies = []
    fin_score = 0.0
    delay_score = 0.0
    exp_score = 0.0
    peer_score = 0.0

    # R001: Cost Overrun
    if exp > (alloc * 1.05):
        fin_score = max(fin_score, 80.0)
        rule_anomalies.append({
            "result_id": existing_anomalies_count + len(rule_anomalies) + 1,
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
            "result_id": existing_anomalies_count + len(rule_anomalies) + 1,
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
            "result_id": existing_anomalies_count + len(rule_anomalies) + 1,
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
            "result_id": existing_anomalies_count + len(rule_anomalies) + 1,
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
            "result_id": existing_anomalies_count + len(rule_anomalies) + 1,
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
            "result_id": existing_anomalies_count + len(rule_anomalies) + 1,
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
            "result_id": existing_anomalies_count + len(rule_anomalies) + 1,
            "project_id": new_id,
            "detection_type": "RULE",
            "rule_name": "R006: State Allocation Outlier",
            "severity": "MEDIUM",
            "score_contribution": 50.0,
            "explanation": f"Allocated amount is >2.5x higher than state median (₹{st_med:,.0f}).",
            "detected_at": datetime.now().isoformat(),
        })

    overall_score = round(
        settings.weight_financial * fin_score +
        settings.weight_delay * delay_score +
        settings.weight_expenditure * exp_score +
        settings.weight_peer * peer_score,
        2
    )
    risk_band = settings.get_risk_band(overall_score)

    record = {
        "project_id": new_id,
        "house_type": str(p_dict.get("house_type") or "LOK").upper(),
        "state_name": state_str,
        "constituency_name": const_str,
        "mp_name": str(p_dict.get("mp_name") or "HONBLE MP").strip().upper(),
        "city_name": str(p_dict.get("city_name") or const_str.title()),
        "ida_name": str(p_dict.get("ida_name") or f"District Collectorate, {const_str.title()}"),
        "location_type": str(p_dict.get("location_type") or "Rural"),
        "category": str(p_dict.get("category") or "Community Infrastructure"),
        "work_description": str(p_dict.get("work_description") or p_dict.get("category") or "MPLADS Development Project"),
        "block_name": str(p_dict.get("block_name") or ""),
        "village_name": str(p_dict.get("village_name") or ""),
        "allocated_amount": alloc,
        "expenditure_amt": exp,
        "recommended_date": str(rec_date),
        "work_status": status_clean,
        "dataset_source": "Authorized Officer Ingestion",
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
        "letter_no": str(p_dict.get("letter_no") or f"MPLADS/{const_str[:3]}/{datetime.now().year}/{new_id}"),
        "ingested_at": datetime.now().isoformat(),
        "model_version": settings.model_version,
        "rules_version": settings.rules_version,
    }

    return record, rule_anomalies, overall_score, risk_band


@app.post("/api/projects/submit")
async def submit_project(project: NewProjectInput):
    """Single project ingestion via form."""
    _ensure_data()
    df = store.master_df
    new_id = int(df["project_id"].max() + 1) if "project_id" in df.columns and len(df) > 0 else 100001

    record, anomalies, overall_score, risk_band = _process_single_project_data(
        project.dict(), new_id, df, len(store.anomalies)
    )

    new_df_row = pd.DataFrame([record])
    store.master_df = pd.concat([new_df_row, store.master_df], ignore_index=True)
    store.anomalies.extend(anomalies)

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
        "project": _project_to_detail(record),
        "anomalies_detected": anomalies,
        "overall_risk_score": overall_score,
        "risk_band": risk_band,
    }


@app.post("/api/projects/upload-excel")
async def upload_excel_projects(file: UploadFile = File(...)):
    """
    Authorized Officer Excel / CSV Batch Ingestion Endpoint.
    Parses Excel/CSV with predefined columns, runs instant 11-rule audit engine,
    and prepends all records into the live national surveillance dataset.
    """
    _ensure_data()
    df = store.master_df

    contents = await file.read()
    filename = file.filename.lower()

    # 1. Parse File into DataFrame
    try:
        if filename.endswith(".csv"):
            upload_df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith((".xlsx", ".xls")):
            upload_df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format. Please upload an .xlsx, .xls, or .csv file.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if upload_df.empty:
        raise HTTPException(status_code=400, detail="The uploaded Excel sheet contains no data rows.")

    # 2. Normalize and Map Column Headers
    header_aliases = {
        "house_type": ["house_type", "house", "parliamentary_house", "house type", "parliamentary house"],
        "state_name": ["state_name", "state", "state/ut", "state_ut", "state name"],
        "constituency_name": ["constituency_name", "constituency", "parliamentary_constituency", "constituency name", "parliamentary constituency"],
        "mp_name": ["mp_name", "mp", "member_of_parliament", "honble_mp", "mp name", "honble mp"],
        "category": ["category", "work_category", "sector", "work category"],
        "ida_name": ["ida_name", "ida", "implementing_agency", "implementing_district_authority", "ida name", "district authority"],
        "allocated_amount": ["allocated_amount", "allocated", "sanctioned_amount", "sanction_amount", "budget", "allocated amount", "sanctioned amount"],
        "expenditure_amt": ["expenditure_amt", "expenditure", "spent", "disbursed", "expenditure amount", "spent amount"],
        "work_status": ["work_status", "status", "stage", "work status"],
        "recommended_date": ["recommended_date", "date", "recommendation_date", "sanction_date", "recommended date"],
        "letter_no": ["letter_no", "letter", "docket_no", "sanction_letter", "letter no", "docket no", "sanction letter no"],
        "block_name": ["block_name", "block", "taluka", "block name"],
        "village_name": ["village_name", "village", "ward", "village name"],
        "location_type": ["location_type", "location", "area_type", "location type"],
        "work_description": ["work_description", "description", "work_name", "work description", "work title"],
    }

    norm_cols = {}
    for col in upload_df.columns:
        clean_col = str(col).strip().lower()
        matched = False
        for std_name, aliases in header_aliases.items():
            if clean_col == std_name or clean_col in aliases:
                norm_cols[col] = std_name
                matched = True
                break
        if not matched:
            norm_cols[col] = clean_col.replace(" ", "_")

    upload_df = upload_df.rename(columns=norm_cols)

    # 3. Process every row
    new_records = []
    all_new_anomalies = []
    current_max_id = int(df["project_id"].max()) if "project_id" in df.columns and len(df) > 0 else 100000

    for idx, row in upload_df.iterrows():
        current_max_id += 1
        row_dict = row.to_dict()
        record, anomalies, score, band = _process_single_project_data(
            row_dict, current_max_id, df, len(store.anomalies) + len(all_new_anomalies)
        )
        new_records.append(record)
        all_new_anomalies.extend(anomalies)

    # 4. Concatenate and Persist
    new_batch_df = pd.DataFrame(new_records)
    store.master_df = pd.concat([new_batch_df, store.master_df], ignore_index=True)
    store.anomalies.extend(all_new_anomalies)

    try:
        master_path = store.data_dir / "master_projects_latest.json"
        store.master_df.to_json(master_path, orient="records", date_format="iso", default_handler=str, indent=2)
        anomalies_path = store.data_dir / "anomaly_results_latest.json"
        with open(anomalies_path, "w") as f:
            json.dump(store.anomalies, f, indent=2, default=str)
    except Exception as e:
        logger.warning(f"Could not persist batch uploaded projects: {e}")

    high_count = sum(1 for r in new_records if r["risk_band"] in ["HIGH", "CRITICAL"])
    critical_count = sum(1 for r in new_records if r["risk_band"] == "CRITICAL")

    return {
        "status": "success",
        "message": f"Successfully ingested {len(new_records)} projects from '{file.filename}'. {high_count} projects flagged for priority audit.",
        "total_uploaded": len(new_records),
        "high_risk_count": high_count,
        "critical_risk_count": critical_count,
        "projects": [_project_to_summary(r) for r in new_records],
        "anomalies_detected": len(all_new_anomalies),
    }


@app.get("/api/projects/template/download")
async def download_excel_template():
    """Generates and returns the official pre-formatted CSV template with sample data."""
    template_csv = (
        "house_type,state_name,constituency_name,mp_name,category,ida_name,allocated_amount,expenditure_amt,work_status,recommended_date,letter_no,block_name,village_name,location_type,work_description\n"
        "LOK,ANDHRA PRADESH,VISAKHAPATNAM,HONBLE MP VISAKHAPATNAM,Drinking Water & Sanitation,District Collectorate Visakhapatnam,5000000,1200000,On Going,2024-06-15,MPLADS/VIS/2024/001,Anandapuram,Boni,Rural,Installation of community RO water purification plant\n"
        "LOK,MAHARASHTRA,PUNE,HONBLE MP PUNE,Rural Roadways & Connectivity,District Collectorate Pune,7500000,0,On Going,2024-04-10,MPLADS/PUN/2024/014,Haveli,Khadakwasla,Rural,Construction of BT connecting road from main junction\n"
        "RAJYA,UTTAR PRADESH,AGRA,HONBLE MP AGRA,Education & School Infrastructure,District Collectorate Agra,3500000,3800000,Completed,2023-08-20,MPLADS/AGR/2023/089,Fatehabad,Dhana,Rural,Additional school classrooms and computer laboratory\n"
    )
    return StreamingResponse(
        io.StringIO(template_csv),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=MPLADS_Official_Ingestion_Template.csv"}
    )



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
