"""
MPLADS Monitor — Rule-Based Detection Engine
=============================================
Deterministic rule-based anomaly detection.

Each rule:
- Has a unique ID (R001–R011)
- Is fully documented with justification
- Returns an AnomalyResult with structured evidence
- Produces a score contribution (0–100) to the overall risk score

IMPORTANT DISCLAIMER:
  Rule triggers are RISK INDICATORS, NOT fraud findings.
  Every flag requires human verification before any action.

Rules:
  R001: Expenditure exceeds allocation (overrun)
  R002: Very old project, not completed (730+ days)
  R003: Ongoing project overdue (365+ days)
  R004: Expenditure recorded for unsanctioned work
  R005: Allocation far above district median (3x+)
  R006: Allocation far above state median (2.5x+)
  R007: MP project count unusually high
  R008: Stalled funds (< 5% expenditure after 365 days)
  R009: Potential duplicate detected (similarity-based)
  R010: Constituency project concentration
  R011: Available limit negative (over-utilized allocation)
"""

import logging
from typing import Optional
import pandas as pd
import numpy as np
from datetime import date

logger = logging.getLogger(__name__)

RULES_VERSION = "1.0.0"

# ─────────────────────────────────────────────────────────────────────────────
# Rule Definitions
# ─────────────────────────────────────────────────────────────────────────────

RULE_METADATA = {
    "R001": {
        "name": "Expenditure Exceeds Allocation",
        "severity": "CRITICAL",
        "score": 80,
        "justification": (
            "Expenditure > allocated amount indicates either data entry error, "
            "unauthorized spending, or budget revision without proper sanctioning."
        ),
    },
    "R002": {
        "name": "Very Old Incomplete Project",
        "severity": "HIGH",
        "score": 55,
        "justification": (
            "Project recommended 730+ days ago and not yet completed. "
            "MPLADS guidelines require works to be completed within a reasonable timeframe."
        ),
    },
    "R003": {
        "name": "Overdue Ongoing Project",
        "severity": "MODERATE",
        "score": 30,
        "justification": (
            "Ongoing project older than 365 days. Projects are expected to complete "
            "within ~365 days per MPLADS scheme guidelines."
        ),
    },
    "R004": {
        "name": "Expenditure Without Sanction",
        "severity": "HIGH",
        "score": 65,
        "justification": (
            "Expenditure amount recorded for a work that is still 'UNSANCTIONED'. "
            "Expenditure should only occur post-sanction."
        ),
    },
    "R005": {
        "name": "Abnormally High Allocation vs District",
        "severity": "HIGH",
        "score": 50,
        "justification": (
            "Allocated amount is 3x+ above the district median. "
            "May indicate inflated project cost or data entry issue."
        ),
    },
    "R006": {
        "name": "High Allocation vs State Peers",
        "severity": "MODERATE",
        "score": 30,
        "justification": (
            "Allocated amount is 2.5x+ above the state median. "
            "Warrants comparison with similar projects in the state."
        ),
    },
    "R007": {
        "name": "Unusually High MP Project Count",
        "severity": "MODERATE",
        "score": 20,
        "justification": (
            "MP has significantly more projects than peers (> mean + 2*std). "
            "May indicate fragmentation of large works into smaller ones."
        ),
    },
    "R008": {
        "name": "Stalled Fund Utilization",
        "severity": "MODERATE",
        "score": 25,
        "justification": (
            "Less than 5% expenditure recorded after 365+ days. "
            "Indicates funds are sanctioned but work has not meaningfully progressed."
        ),
    },
    "R009": {
        "name": "Potential Duplicate Work",
        "severity": "HIGH",
        "score": 50,
        "justification": (
            "Similar project detected in same constituency with close location and amount. "
            "NOTE: Similarity based on location+amount only (no work descriptions available). "
            "Requires human verification."
        ),
    },
    "R010": {
        "name": "High Constituency Project Concentration",
        "severity": "LOW",
        "score": 15,
        "justification": (
            "Constituency has 2x+ projects compared to the constituency average. "
            "May indicate inequitable distribution or data pattern requiring review."
        ),
    },
    "R011": {
        "name": "Negative Available Limit",
        "severity": "HIGH",
        "score": 60,
        "justification": (
            "Available limit is negative, indicating more funds committed than allocated. "
            "Indicates over-commitment of MP entitlement."
        ),
    },
}


def _make_flag(rule_id: str, project_id: int, evidence: dict) -> dict:
    """Create a standardized flag dictionary."""
    meta = RULE_METADATA[rule_id]
    return {
        "rule_id": rule_id,
        "rule_name": meta["name"],
        "detection_type": "RULE",
        "severity": meta["severity"],
        "score_contribution": meta["score"],
        "justification": meta["justification"],
        "evidence": evidence,
        "disclaimer": (
            "This flag is a RISK INDICATOR. It highlights patterns that warrant "
            "human attention. It does NOT constitute a finding of fraud or misconduct."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Individual Rule Functions
# ─────────────────────────────────────────────────────────────────────────────

def check_r001_cost_overrun(row: pd.Series) -> Optional[dict]:
    """R001: expenditure_ratio > 1.0"""
    ratio = row.get("expenditure_ratio")
    if ratio is None or pd.isna(ratio) or ratio <= 1.0:
        return None
    exp = row.get("expenditure_amt", 0) or 0
    alloc = row.get("allocated_amount", 0) or 0
    return _make_flag("R001", row.get("project_id"), {
        "expenditure_amt": exp,
        "allocated_amount": alloc,
        "overrun_amount": round(exp - alloc, 2),
        "expenditure_ratio": round(float(ratio), 3),
        "overrun_pct": round((ratio - 1) * 100, 2),
    })


def check_r002_very_old_project(row: pd.Series) -> Optional[dict]:
    """R002: age > 730 days and not completed"""
    age = row.get("project_age_days")
    is_completed = row.get("is_completed", False) or False
    if age is None or pd.isna(age) or is_completed or int(age) <= 730:
        return None
    return _make_flag("R002", row.get("project_id"), {
        "project_age_days": int(age),
        "recommended_date": str(row.get("recommended_date", "")),
        "work_status": row.get("work_status"),
        "days_over_threshold": int(age) - 730,
    })


def check_r003_overdue_ongoing(row: pd.Series) -> Optional[dict]:
    """R003: ongoing and age > 365 days"""
    age = row.get("project_age_days")
    is_ongoing = row.get("is_ongoing", False) or False
    is_completed = row.get("is_completed", False) or False
    if age is None or pd.isna(age) or is_completed or not is_ongoing:
        return None
    if int(age) <= 365:
        return None
    return _make_flag("R003", row.get("project_id"), {
        "project_age_days": int(age),
        "recommended_date": str(row.get("recommended_date", "")),
        "expected_completion_days": 365,
        "days_overdue": int(age) - 365,
    })


def check_r004_expenditure_unsanctioned(row: pd.Series) -> Optional[dict]:
    """R004: expenditure > 0 AND status = UNSANCTIONED"""
    is_unsanctioned = row.get("is_unsanctioned", False) or False
    exp = row.get("expenditure_amt")
    if not is_unsanctioned or exp is None or pd.isna(exp) or float(exp) <= 0:
        return None
    return _make_flag("R004", row.get("project_id"), {
        "work_status": row.get("work_status"),
        "expenditure_amt": float(exp),
        "allocated_amount": row.get("allocated_amount"),
        "issue": "Expenditure recorded for unsanctioned work",
    })


def check_r005_high_amount_district(row: pd.Series) -> Optional[dict]:
    """R005: allocated > district_median * 3.0"""
    alloc = row.get("allocated_amount")
    district_med = row.get("district_median_amount")
    if alloc is None or district_med is None:
        return None
    if pd.isna(alloc) or pd.isna(district_med) or district_med <= 0:
        return None
    ratio = float(alloc) / float(district_med)
    if ratio <= 3.0:
        return None
    return _make_flag("R005", row.get("project_id"), {
        "allocated_amount": float(alloc),
        "district_median_amount": float(district_med),
        "ratio": round(ratio, 2),
        "pct_above_median": round((ratio - 1) * 100, 1),
        "ida_name": row.get("ida_name"),
    })


def check_r006_high_amount_state(row: pd.Series) -> Optional[dict]:
    """R006: allocated > state_median * 2.5"""
    alloc = row.get("allocated_amount")
    state_med = row.get("state_median_amount")
    if alloc is None or state_med is None:
        return None
    if pd.isna(alloc) or pd.isna(state_med) or state_med <= 0:
        return None
    ratio = float(alloc) / float(state_med)
    if ratio <= 2.5:
        return None
    return _make_flag("R006", row.get("project_id"), {
        "allocated_amount": float(alloc),
        "state_median_amount": float(state_med),
        "ratio": round(ratio, 2),
        "pct_above_median": round((ratio - 1) * 100, 1),
        "state_name": row.get("state_name"),
    })


def check_r007_mp_project_concentration(row: pd.Series,
                                         mp_stats: dict) -> Optional[dict]:
    """R007: mp_project_count > mean + 2*std"""
    mp_name = row.get("mp_name")
    if not mp_name or mp_name not in mp_stats:
        return None
    count = mp_stats[mp_name].get("count", 0)
    mean_count = mp_stats.get("_global_mean", 0)
    std_count = mp_stats.get("_global_std", 1)
    threshold = mean_count + 2 * std_count
    if count <= threshold:
        return None
    return _make_flag("R007", row.get("project_id"), {
        "mp_name": mp_name,
        "mp_project_count": int(count),
        "all_mps_mean_count": round(mean_count, 1),
        "all_mps_std_count": round(std_count, 1),
        "threshold": round(threshold, 1),
        "deviations_above_mean": round((count - mean_count) / max(std_count, 0.1), 2),
    })


def check_r008_stalled_funds(row: pd.Series) -> Optional[dict]:
    """R008: expenditure_ratio < 0.05 and age > 365 days"""
    ratio = row.get("expenditure_ratio")
    age = row.get("project_age_days")
    is_completed = row.get("is_completed", False) or False
    if is_completed:
        return None
    if ratio is None or pd.isna(ratio):
        return None
    if age is None or pd.isna(age):
        return None
    if float(ratio) >= 0.05 or int(age) <= 365:
        return None
    return _make_flag("R008", row.get("project_id"), {
        "expenditure_ratio": round(float(ratio), 4),
        "expenditure_pct": round(float(ratio) * 100, 2),
        "project_age_days": int(age),
        "allocated_amount": row.get("allocated_amount"),
        "expenditure_amt": row.get("expenditure_amt"),
    })


def check_r009_duplicate(project_id: int, pairs_df: pd.DataFrame) -> Optional[dict]:
    """R009: project appears in a high-similarity pair"""
    if pairs_df is None or pairs_df.empty:
        return None
    matches = pairs_df[
        (pairs_df["project_id_a"] == project_id) |
        (pairs_df["project_id_b"] == project_id)
    ]
    if matches.empty:
        return None
    best = matches.loc[matches["similarity_score"].idxmax()]
    peer_id = (int(best["project_id_b"]) if best["project_id_a"] == project_id
               else int(best["project_id_a"]))
    return _make_flag("R009", project_id, {
        "similar_project_id": peer_id,
        "similarity_score": round(float(best["similarity_score"]), 4),
        "match_factors": best.get("match_factors", {}),
        "note": (
            "Similarity detection based on location+amount only. "
            "Work descriptions not available in public API. "
            "Human verification required."
        ),
    })


def check_r010_constituency_concentration(row: pd.Series,
                                           const_stats: dict) -> Optional[dict]:
    """R010: constituency project count > 2x average constituency count"""
    const = row.get("constituency_name")
    if not const or const not in const_stats:
        return None
    count = const_stats[const].get("count", 0)
    mean_count = const_stats.get("_global_mean", 0)
    if count <= mean_count * 2:
        return None
    return _make_flag("R010", row.get("project_id"), {
        "constituency_name": const,
        "constituency_project_count": int(count),
        "all_constituencies_mean_count": round(mean_count, 1),
        "ratio_to_mean": round(count / max(mean_count, 1), 2),
    })


def check_r011_negative_available_limit(row: pd.Series) -> Optional[dict]:
    """R011: available_limit < 0"""
    avail = row.get("available_limit")
    if avail is None or pd.isna(avail) or float(avail) >= 0:
        return None
    return _make_flag("R011", row.get("project_id"), {
        "available_limit": float(avail),
        "allocated_amount": row.get("allocated_amount"),
        "mp_name": row.get("mp_name"),
        "issue": "Negative available limit: more committed than allocated",
    })


# ─────────────────────────────────────────────────────────────────────────────
# Rule Engine Runner
# ─────────────────────────────────────────────────────────────────────────────

def build_mp_stats(df: pd.DataFrame) -> dict:
    """Pre-compute MP project count statistics."""
    counts = df.groupby("mp_name").size()
    stats = {mp: {"count": int(count)} for mp, count in counts.items()}
    stats["_global_mean"] = float(counts.mean())
    stats["_global_std"] = float(counts.std())
    return stats


def build_const_stats(df: pd.DataFrame) -> dict:
    """Pre-compute constituency project count statistics."""
    counts = df.groupby("constituency_name").size()
    stats = {c: {"count": int(count)} for c, count in counts.items()}
    stats["_global_mean"] = float(counts.mean())
    return stats


def run_all_rules(df: pd.DataFrame,
                  pairs_df: Optional[pd.DataFrame] = None) -> tuple[pd.DataFrame, list]:
    """
    Run all detection rules against the master projects DataFrame.
    
    Returns:
        (df_with_flags, all_anomaly_records)
        - df_with_flags has risk_flags and rule-based score columns populated
        - all_anomaly_records is a list of dicts for the anomaly_results table
    """
    logger.info(f"Running rule engine on {len(df)} projects (v{RULES_VERSION})...")

    mp_stats = build_mp_stats(df)
    const_stats = build_const_stats(df)
    pair_ids = set()
    if pairs_df is not None and not pairs_df.empty:
        pair_ids = set(pairs_df["project_id_a"].tolist() + pairs_df["project_id_b"].tolist())

    all_flags = []   # (project_id, flag_dict)
    all_anomaly_records = []

    for _, row in df.iterrows():
        project_id = row.get("project_id")
        row_flags = []

        # Run all rules
        checks = [
            check_r001_cost_overrun(row),
            check_r002_very_old_project(row),
            check_r003_overdue_ongoing(row),
            check_r004_expenditure_unsanctioned(row),
            check_r005_high_amount_district(row),
            check_r006_high_amount_state(row),
            check_r007_mp_project_concentration(row, mp_stats),
            check_r008_stalled_funds(row),
            check_r009_duplicate(project_id, pairs_df) if project_id in pair_ids else None,
            check_r010_constituency_concentration(row, const_stats),
            check_r011_negative_available_limit(row),
        ]

        for flag in checks:
            if flag is not None:
                row_flags.append(flag)
                all_anomaly_records.append({
                    "project_id": project_id,
                    "detection_type": "RULE",
                    "rule_name": flag["rule_id"],
                    "severity": flag["severity"],
                    "score_contribution": flag["score_contribution"],
                    "explanation": flag["justification"],
                    "evidence_json": flag["evidence"],
                    "model_version": None,
                })

        all_flags.append((project_id, row_flags))

    # Attach flags back to DataFrame
    flags_map = {pid: flags for pid, flags in all_flags}
    df["risk_flags"] = df["project_id"].map(flags_map)

    # Compute rule-based sub-scores
    def rule_score(flags, categories):
        if not flags:
            return 0.0
        matching = [f["score_contribution"] for f in flags
                    if f["rule_id"] in categories]
        return min(float(max(matching)) if matching else 0.0, 100.0)

    financial_rules = {"R001", "R004", "R005", "R006", "R011"}
    delay_rules = {"R002", "R003"}
    expenditure_rules = {"R001", "R008"}

    df["financial_risk_score"] = df["risk_flags"].apply(
        lambda f: rule_score(f, financial_rules))
    df["delay_risk_score"] = df["risk_flags"].apply(
        lambda f: rule_score(f, delay_rules))
    df["expenditure_risk_score"] = df["risk_flags"].apply(
        lambda f: rule_score(f, expenditure_rules))

    rule_flags_count = sum(1 for _, flags in all_flags if len(flags) > 0)
    logger.info(f"Rule engine complete: {rule_flags_count} projects flagged, "
                f"{len(all_anomaly_records)} total anomaly records")

    return df, all_anomaly_records
