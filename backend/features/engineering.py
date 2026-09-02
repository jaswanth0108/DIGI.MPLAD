"""
MPLADS Monitor — Feature Engineering
=====================================
Computes all derived features for the master_projects DataFrame.

Features are organized in groups:
1. Financial Features
2. Temporal Features
3. Peer Comparison Features
4. Similarity Features (for duplicate detection)

All computations are transparent and auditable.
Division by zero is handled explicitly with None/NaN.
"""

import logging
from datetime import date, datetime, timedelta
from typing import Optional
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

TODAY = date.today()
# MPLADS scheme guideline: works should complete within 365 days of sanction
COMPLETION_GUIDELINE_DAYS = 365
STALLED_THRESHOLD_DAYS = 730


# ─────────────────────────────────────────────────────────────────────────────
# 1. Financial Features
# ─────────────────────────────────────────────────────────────────────────────

def compute_financial_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute financial derived features.
    
    Features:
    - expenditure_ratio: expenditure / allocated (0 = no spend, >1 = overrun)
    - cost_variance_pct: % over/under spend relative to allocation
    """
    df = df.copy()

    # Expenditure ratio
    mask = (df["allocated_amount"].notna() & (df["allocated_amount"] > 0) &
            df["expenditure_amt"].notna())
    df["expenditure_ratio"] = np.where(
        mask,
        df["expenditure_amt"] / df["allocated_amount"],
        np.nan
    )

    # Cost variance %
    df["cost_variance_pct"] = np.where(
        mask,
        ((df["expenditure_amt"] - df["allocated_amount"]) / df["allocated_amount"]) * 100,
        np.nan
    )

    logger.info(f"Financial features computed. "
                f"Avg expenditure_ratio: {df['expenditure_ratio'].mean():.3f}")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 2. Temporal Features
# ─────────────────────────────────────────────────────────────────────────────

def compute_temporal_features(df: pd.DataFrame,
                               reference_date: date = None) -> pd.DataFrame:
    """
    Compute time-based derived features.
    
    Features:
    - project_age_days: days since recommendation
    - days_to_complete: days from recommendation to completion (where available)
    - is_overdue: ongoing project older than COMPLETION_GUIDELINE_DAYS
    - is_stalled: no completion and older than STALLED_THRESHOLD_DAYS
    """
    df = df.copy()
    ref = reference_date or TODAY

    # Project age
    rec_dates = pd.to_datetime(df["recommended_date"], errors="coerce")
    ref_dt = pd.Timestamp(ref)
    df["project_age_days"] = (ref_dt - rec_dates).dt.days
    df["project_age_days"] = df["project_age_days"].where(
        df["project_age_days"] >= 0, np.nan
    ).astype("Int64")

    # Days to complete (for completed projects)
    end_dates = pd.to_datetime(df["actual_end_date"], errors="coerce")
    df["days_to_complete"] = (end_dates - rec_dates).dt.days
    df["days_to_complete"] = df["days_to_complete"].where(
        df["days_to_complete"] > 0, np.nan
    ).astype("Int64")

    # Overdue: ongoing and older than guideline
    df["is_overdue"] = (
        (~df["is_completed"].fillna(False)) &
        (df["project_age_days"].fillna(0) > COMPLETION_GUIDELINE_DAYS)
    )

    # Stalled: no completion, very old
    df["is_stalled"] = (
        (~df["is_completed"].fillna(False)) &
        (df["project_age_days"].fillna(0) > STALLED_THRESHOLD_DAYS)
    )

    overdue_count = df["is_overdue"].sum()
    stalled_count = df["is_stalled"].sum()
    logger.info(f"Temporal features: {overdue_count} overdue, {stalled_count} stalled")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 3. Peer Comparison Features
# ─────────────────────────────────────────────────────────────────────────────

def compute_peer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute peer comparison features by grouping similar projects.
    
    Peer groups:
    - District (IDA) level
    - State level
    - MP level
    - Constituency level
    
    Features:
    - district_median_amount, state_median_amount, mp_median_amount
    - amount_vs_district_pct, amount_vs_state_pct
    - mp_project_count, constituency_project_count
    """
    df = df.copy()

    # ── District (IDA) level ─────────────────────────────────────────────────
    district_stats = (
        df.groupby("ida_name")["allocated_amount"]
        .agg(["median", "mean", "std", "count"])
        .rename(columns={
            "median": "district_median_amount",
            "mean": "district_mean_amount",
            "std": "district_std_amount",
            "count": "district_project_count",
        })
        .reset_index()
    )
    df = df.merge(district_stats, on="ida_name", how="left")

    df["amount_vs_district_pct"] = np.where(
        df["district_median_amount"].notna() & (df["district_median_amount"] > 0) &
        df["allocated_amount"].notna(),
        ((df["allocated_amount"] - df["district_median_amount"]) /
         df["district_median_amount"]) * 100,
        np.nan
    )

    # ── State level ──────────────────────────────────────────────────────────
    state_stats = (
        df.groupby("state_name")["allocated_amount"]
        .agg(["median", "mean", "std"])
        .rename(columns={
            "median": "state_median_amount",
            "mean": "state_mean_amount",
            "std": "state_std_amount",
        })
        .reset_index()
    )
    df = df.merge(state_stats, on="state_name", how="left")

    df["amount_vs_state_pct"] = np.where(
        df["state_median_amount"].notna() & (df["state_median_amount"] > 0) &
        df["allocated_amount"].notna(),
        ((df["allocated_amount"] - df["state_median_amount"]) /
         df["state_median_amount"]) * 100,
        np.nan
    )

    # ── MP level ─────────────────────────────────────────────────────────────
    mp_stats = (
        df.groupby("mp_name")["allocated_amount"]
        .agg(["median", "count"])
        .rename(columns={
            "median": "mp_median_amount",
            "count": "mp_project_count",
        })
        .reset_index()
    )
    df = df.merge(mp_stats, on="mp_name", how="left")

    # ── Constituency level ───────────────────────────────────────────────────
    const_count = (
        df.groupby("constituency_name").size()
        .reset_index(name="constituency_project_count")
    )
    df = df.merge(const_count, on="constituency_name", how="left")

    logger.info(f"Peer features computed. "
                f"Avg district deviation: {df['amount_vs_district_pct'].mean():.1f}%")
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 4. Similarity Features (Duplicate Detection)
# ─────────────────────────────────────────────────────────────────────────────

def build_similarity_text(row: pd.Series) -> str:
    """
    Build a normalized text representation for similarity comparison.
    
    NOTE: Work descriptions are NOT available in the MPLADS public API.
    Similarity is based on location + IDA + amount bucket only.
    This is a known limitation documented in the system.
    """
    parts = [
        str(row.get("state_name", "") or ""),
        str(row.get("constituency_name", "") or ""),
        str(row.get("ida_name", "") or ""),
        str(row.get("city_name", "") or ""),
        str(row.get("block_name", "") or ""),
        str(row.get("location_type", "") or ""),
        _amount_bucket(row.get("allocated_amount")),
    ]
    return " ".join(p for p in parts if p).lower()


def _amount_bucket(amount: Optional[float]) -> str:
    """Bucket amount into ranges for similarity matching."""
    if amount is None or np.isnan(amount):
        return "unknown_amount"
    if amount < 5_00_000:      # < 5 lakh
        return "very_small"
    elif amount < 20_00_000:   # < 20 lakh
        return "small"
    elif amount < 50_00_000:   # < 50 lakh
        return "medium"
    elif amount < 2_00_00_000: # < 2 crore
        return "large"
    else:
        return "very_large"


def compute_similarity_pairs(df: pd.DataFrame,
                              threshold: float = 0.75,
                              max_pairs: int = 1000) -> pd.DataFrame:
    """
    Find potentially similar/duplicate projects using TF-IDF cosine similarity.
    
    Only compares projects from the SAME state and SAME constituency
    (reduces computation and false positives from cross-state comparisons).
    
    Returns DataFrame of (project_id_a, project_id_b, similarity_score, match_factors)
    
    IMPORTANT: High similarity ≠ confirmed duplicate.
    Requires human review for confirmation.
    """
    pairs = []

    # Group by state + constituency to limit comparisons
    groups = df.groupby(["state_name", "constituency_name"])

    vectorizer = TfidfVectorizer(analyzer="word", ngram_range=(1, 2))

    for (state, const), group in groups:
        if len(group) < 2:
            continue

        texts = group.apply(build_similarity_text, axis=1).tolist()
        project_ids = group["project_id"].tolist()

        try:
            tfidf_matrix = vectorizer.fit_transform(texts)
            sim_matrix = cosine_similarity(tfidf_matrix)

            # Extract pairs above threshold (upper triangle only)
            n = len(project_ids)
            for i in range(n):
                for j in range(i + 1, n):
                    score = sim_matrix[i, j]
                    if score >= threshold:
                        row_a = group.iloc[i]
                        row_b = group.iloc[j]

                        # Additional evidence checks
                        same_mp = row_a["mp_name"] == row_b["mp_name"]
                        same_ida = row_a["ida_name"] == row_b["ida_name"]
                        same_location_type = row_a["location_type"] == row_b["location_type"]

                        amt_a = row_a.get("allocated_amount")
                        amt_b = row_b.get("allocated_amount")
                        amount_close = (
                            abs(amt_a - amt_b) / max(amt_a, amt_b) < 0.15
                            if (amt_a and amt_b and amt_a > 0 and amt_b > 0)
                            else False
                        )

                        date_a = pd.to_datetime(row_a.get("recommended_date"), errors="coerce")
                        date_b = pd.to_datetime(row_b.get("recommended_date"), errors="coerce")
                        date_close = (
                            abs((date_a - date_b).days) < 180
                            if (pd.notna(date_a) and pd.notna(date_b))
                            else False
                        )

                        pairs.append({
                            "project_id_a": project_ids[i],
                            "project_id_b": project_ids[j],
                            "similarity_score": round(float(score), 4),
                            "match_factors": {
                                "same_state": True,
                                "same_constituency": True,
                                "same_mp": same_mp,
                                "same_ida": same_ida,
                                "same_location_type": same_location_type,
                                "amount_within_15pct": amount_close,
                                "dates_within_180_days": date_close,
                                "note": (
                                    "Similarity based on location+amount only "
                                    "(no work descriptions available in public API)"
                                ),
                            },
                        })

                        if len(pairs) >= max_pairs:
                            logger.warning(f"Max pairs ({max_pairs}) reached. Truncating.")
                            return pd.DataFrame(pairs)

        except Exception as e:
            logger.debug(f"Similarity failed for {state}/{const}: {e}")
            continue

    logger.info(f"Similarity detection: {len(pairs)} pairs with score >= {threshold}")
    return pd.DataFrame(pairs) if pairs else pd.DataFrame(
        columns=["project_id_a", "project_id_b", "similarity_score", "match_factors"]
    )


# ─────────────────────────────────────────────────────────────────────────────
# Main Feature Pipeline
# ─────────────────────────────────────────────────────────────────────────────

def run_feature_engineering(master_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Run the full feature engineering pipeline.
    
    Returns:
        (enriched_df, duplicate_pairs_df)
    """
    logger.info("Starting feature engineering pipeline...")
    logger.info(f"Input: {len(master_df)} projects")

    df = master_df.copy()

    # 1. Financial features
    df = compute_financial_features(df)

    # 2. Temporal features
    df = compute_temporal_features(df)

    # 3. Peer comparison features
    df = compute_peer_features(df)

    # 4. Similarity / duplicate pairs
    pairs_df = compute_similarity_pairs(df)

    logger.info(f"Feature engineering complete. Output: {len(df)} projects, {len(pairs_df)} similar pairs")
    return df, pairs_df
