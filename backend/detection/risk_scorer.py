"""
MPLADS Monitor — Risk Scorer
==============================
Computes the composite overall_risk_score (0–100) from all detection layers.

Formula:
  overall_risk_score = (
      WEIGHT_FINANCIAL    * financial_risk_score +
      WEIGHT_DELAY        * delay_risk_score +
      WEIGHT_EXPENDITURE  * expenditure_risk_score +
      WEIGHT_DUPLICATE    * duplicate_risk_score +
      WEIGHT_PEER         * peer_deviation_score +
      WEIGHT_ML           * ml_anomaly_score
  )

Weights sum to 1.0 and are configurable via environment variables.
Risk bands: LOW (0–24) | MODERATE (25–49) | HIGH (50–74) | CRITICAL (75–100)
"""

import logging
import numpy as np
import pandas as pd
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

logger = logging.getLogger(__name__)


def compute_peer_deviation_score(df: pd.DataFrame) -> pd.Series:
    """
    Compute peer deviation score (0–100) based on amount vs district/state peers.
    Higher score = further from peer median.
    """
    district_dev = df["amount_vs_district_pct"].fillna(0).abs()
    state_dev = df["amount_vs_state_pct"].fillna(0).abs()

    # Weighted combination: district is more granular so weighted higher
    combined = 0.6 * district_dev + 0.4 * state_dev

    # Scale to 0–100 using percentile rank
    q99 = float(combined.quantile(0.99))
    denom = max(q99, 1.0)
    if combined.max() > 0:
        scores = (combined / denom) * 100
    else:
        scores = pd.Series(0.0, index=df.index)

    return scores.clip(lower=0, upper=100).round(2)


def compute_duplicate_score(df: pd.DataFrame,
                            pairs_df: pd.DataFrame = None) -> pd.Series:
    """
    Compute duplicate risk score (0–100) based on similarity pairs.
    """
    scores = pd.Series(0.0, index=df.index)

    if pairs_df is None or pairs_df.empty:
        return scores

    # For each project, get max similarity score from pairs
    for _, pair in pairs_df.iterrows():
        sim = float(pair.get("similarity_score", 0))
        dup_score = min(sim * 100, 100)

        pid_a = pair.get("project_id_a")
        pid_b = pair.get("project_id_b")

        mask_a = df["project_id"] == pid_a
        mask_b = df["project_id"] == pid_b

        scores = scores.where(~mask_a, scores.where(~mask_a, dup_score).clip(lower=dup_score))
        scores = scores.where(~mask_b, scores.where(~mask_b, dup_score).clip(lower=dup_score))

    return scores.clip(lower=0, upper=100).round(2)


def compute_overall_risk_score(df: pd.DataFrame,
                                pairs_df: pd.DataFrame = None) -> pd.DataFrame:
    """
    Compute the final composite risk score for every project.
    
    Returns DataFrame with updated columns:
    - peer_deviation_score
    - duplicate_risk_score
    - overall_risk_score
    - risk_band
    """
    df = df.copy()

    # Compute peer deviation score if not already set
    if "peer_deviation_score" not in df.columns or df["peer_deviation_score"].isna().all():
        df["peer_deviation_score"] = compute_peer_deviation_score(df)

    # Compute duplicate score
    if "duplicate_risk_score" not in df.columns or df["duplicate_risk_score"].isna().all():
        df["duplicate_risk_score"] = compute_duplicate_score(df, pairs_df)

    # Ensure all component scores exist
    for col in ["financial_risk_score", "delay_risk_score", "expenditure_risk_score",
                "duplicate_risk_score", "peer_deviation_score", "ml_anomaly_score"]:
        if col not in df.columns:
            df[col] = 0.0
        df[col] = df[col].fillna(0.0)

    # Weighted sum
    df["overall_risk_score"] = (
        settings.weight_financial * df["financial_risk_score"] +
        settings.weight_delay * df["delay_risk_score"] +
        settings.weight_expenditure * df["expenditure_risk_score"] +
        settings.weight_duplicate * df["duplicate_risk_score"] +
        settings.weight_peer * df["peer_deviation_score"] +
        settings.weight_ml * df["ml_anomaly_score"]
    ).clip(lower=0, upper=100).round(2)

    # Assign risk bands
    df["risk_band"] = df["overall_risk_score"].apply(settings.get_risk_band)

    # Summary stats
    band_counts = df["risk_band"].value_counts().to_dict()
    logger.info(f"Risk scoring complete. Distribution: {band_counts}")
    logger.info(f"Score range: {df['overall_risk_score'].min():.1f} – "
                f"{df['overall_risk_score'].max():.1f}")
    logger.info(f"Mean score: {df['overall_risk_score'].mean():.1f}")

    return df
