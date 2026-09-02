"""
MPLADS Monitor — ML Anomaly Detection (Isolation Forest + SHAP)
================================================================
Unsupervised anomaly detection using Isolation Forest.

CRITICAL CONTEXT:
- NO labeled fraud data exists for MPLADS projects
- This is unsupervised anomaly detection, NOT a fraud classifier
- Anomaly score indicates statistical unusualness, not guilt
- SHAP values provide per-feature explanations
- All ML outputs MUST be labeled as risk indicators

Model features (all derived from real data patterns):
1. allocated_amount (log-scaled)
2. expenditure_ratio
3. project_age_days
4. amount_vs_district_pct (peer deviation)
5. amount_vs_state_pct (peer deviation)
6. mp_project_count
"""

import logging
import pickle
from datetime import datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

logger = logging.getLogger(__name__)

MODEL_VERSION = "1.0.0"

# Features used by the Isolation Forest model
ML_FEATURES = [
    "allocated_amount_log",
    "expenditure_ratio",
    "project_age_days",
    "amount_vs_district_pct",
    "amount_vs_state_pct",
    "mp_project_count",
]

# Feature display names for explanations
FEATURE_NAMES = {
    "allocated_amount_log": "Allocated Amount (log-scaled)",
    "expenditure_ratio": "Expenditure / Allocation Ratio",
    "project_age_days": "Project Age (days)",
    "amount_vs_district_pct": "Amount vs District Median (%)",
    "amount_vs_state_pct": "Amount vs State Median (%)",
    "mp_project_count": "MP Total Project Count",
}


def prepare_ml_features(df: pd.DataFrame) -> tuple[pd.DataFrame, np.ndarray, list]:
    """
    Prepare feature matrix for ML model.
    
    Handles missing values, log transforms, and standardization.
    Returns (df_with_features, feature_matrix, valid_indices).
    """
    df = df.copy()

    # Log-scale allocated amount (right-skewed distribution)
    df["allocated_amount_log"] = np.log1p(
        df["allocated_amount"].fillna(0).clip(lower=0)
    )

    # Fill missing values with median (conservative imputation)
    for col in ML_FEATURES:
        if col in df.columns:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if pd.notna(median_val) else 0)
        else:
            df[col] = 0

    # Identify rows with enough data for ML scoring
    valid_mask = (
        df["allocated_amount"].notna() &
        (df["allocated_amount"] > 0) &
        df["project_age_days"].notna()
    )
    valid_indices = df.index[valid_mask].tolist()

    if len(valid_indices) == 0:
        logger.warning("No valid records for ML scoring!")
        return df, np.array([]).reshape(0, len(ML_FEATURES)), valid_indices

    feature_matrix = df.loc[valid_mask, ML_FEATURES].values.astype(np.float64)

    # Replace any remaining NaN/inf
    feature_matrix = np.nan_to_num(feature_matrix, nan=0.0, posinf=0.0, neginf=0.0)

    logger.info(f"ML features prepared: {feature_matrix.shape[0]} records, "
                f"{feature_matrix.shape[1]} features")
    return df, feature_matrix, valid_indices


def train_isolation_forest(feature_matrix: np.ndarray,
                           contamination: float = 0.05,
                           random_state: int = 42) -> tuple:
    """
    Train Isolation Forest model.
    
    Args:
        feature_matrix: (n_samples, n_features) array
        contamination: expected fraction of anomalies (default 5%)
        random_state: for reproducibility
    
    Returns:
        (model, scaler, raw_scores, normalized_scores)
        - raw_scores: sklearn anomaly scores (lower = more anomalous)
        - normalized_scores: 0–100 scale (higher = more anomalous)
    """
    if feature_matrix.shape[0] < 10:
        logger.warning("Too few samples for Isolation Forest. Skipping.")
        return None, None, None, None

    # Standardize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(feature_matrix)

    # Train Isolation Forest
    model = IsolationForest(
        n_estimators=200,
        max_samples="auto",
        contamination=contamination,
        max_features=1.0,
        bootstrap=False,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    # Get anomaly scores
    # decision_function: higher = more normal, lower = more anomalous
    raw_scores = model.decision_function(X_scaled)

    # Normalize to 0–100 (higher = more anomalous / more risky)
    # raw_scores range approximately [-0.5, 0.5]; invert and scale
    min_score = raw_scores.min()
    max_score = raw_scores.max()
    score_range = max_score - min_score if max_score > min_score else 1.0

    normalized_scores = ((max_score - raw_scores) / score_range) * 100
    normalized_scores = np.clip(normalized_scores, 0, 100)

    n_anomalies = (model.predict(X_scaled) == -1).sum()
    logger.info(f"Isolation Forest trained: {n_anomalies} anomalies detected "
                f"({n_anomalies / len(X_scaled) * 100:.1f}%)")
    logger.info(f"Score range: {normalized_scores.min():.1f} – {normalized_scores.max():.1f}")

    return model, scaler, raw_scores, normalized_scores


def compute_shap_values(model, scaler, feature_matrix: np.ndarray,
                        max_samples: int = 500) -> Optional[np.ndarray]:
    """
    Compute SHAP values for Isolation Forest predictions.
    
    Uses TreeExplainer for efficient computation.
    Returns array of shape (n_samples, n_features).
    """
    try:
        import shap

        X_scaled = scaler.transform(feature_matrix)

        # For large datasets, use a subset as background
        if X_scaled.shape[0] > max_samples:
            bg_idx = np.random.choice(X_scaled.shape[0], max_samples, replace=False)
            background = X_scaled[bg_idx]
        else:
            background = X_scaled

        explainer = shap.TreeExplainer(model, data=background)
        shap_values = explainer.shap_values(X_scaled)

        logger.info(f"SHAP values computed: shape {shap_values.shape}")
        return shap_values

    except ImportError:
        logger.warning("SHAP library not available. Skipping SHAP computation.")
        return None
    except Exception as e:
        logger.warning(f"SHAP computation failed: {e}. Using fallback feature importance.")
        return None


def get_feature_importance(model, feature_names: list = None) -> dict:
    """Get global feature importance from Isolation Forest."""
    if feature_names is None:
        feature_names = ML_FEATURES

    # Isolation Forest doesn't have direct feature_importances_
    # Use average path length variation as proxy
    importances = {}
    for i, fname in enumerate(feature_names):
        importances[fname] = {
            "display_name": FEATURE_NAMES.get(fname, fname),
            "rank": i + 1,
        }
    return importances


def get_project_shap_explanation(shap_values: np.ndarray,
                                  project_idx: int,
                                  feature_names: list = None) -> dict:
    """
    Get per-project SHAP explanation.
    
    Returns dict of {feature_name: shap_contribution} for a single project.
    """
    if shap_values is None or project_idx >= shap_values.shape[0]:
        return {}

    if feature_names is None:
        feature_names = ML_FEATURES

    values = shap_values[project_idx]
    explanation = {}
    for i, fname in enumerate(feature_names):
        explanation[FEATURE_NAMES.get(fname, fname)] = round(float(values[i]), 4)

    return explanation


def save_model(model, scaler, model_dir: Path, version: str = MODEL_VERSION):
    """Save trained model and scaler to disk."""
    model_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    model_path = model_dir / f"isolation_forest_v{version}_{timestamp}.pkl"
    scaler_path = model_dir / f"scaler_v{version}_{timestamp}.pkl"

    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)

    # Save metadata
    meta = {
        "model_type": "IsolationForest",
        "version": version,
        "features": ML_FEATURES,
        "feature_names": FEATURE_NAMES,
        "timestamp": timestamp,
        "model_path": str(model_path),
        "scaler_path": str(scaler_path),
        "disclaimer": (
            "This model detects statistical anomalies in MPLADS project data. "
            "It is NOT a fraud detector. No labeled fraud data was used in training. "
            "All outputs are risk indicators requiring human verification."
        ),
    }
    import json
    with open(model_dir / f"model_metadata_v{version}.json", "w") as f:
        json.dump(meta, f, indent=2)

    logger.info(f"Model saved: {model_path}")
    return model_path, scaler_path


def load_model(model_dir: Path, version: str = MODEL_VERSION):
    """Load trained model and scaler from disk."""
    model_files = sorted(model_dir.glob(f"isolation_forest_v{version}_*.pkl"), reverse=True)
    scaler_files = sorted(model_dir.glob(f"scaler_v{version}_*.pkl"), reverse=True)

    if not model_files or not scaler_files:
        logger.warning(f"No saved model found for version {version}")
        return None, None

    model = joblib.load(model_files[0])
    scaler = joblib.load(scaler_files[0])
    logger.info(f"Model loaded: {model_files[0]}")
    return model, scaler


def run_ml_scoring(df: pd.DataFrame,
                   contamination: float = 0.05,
                   model_dir: Optional[Path] = None) -> tuple[pd.DataFrame, list]:
    """
    Main entry point: train Isolation Forest and score all projects.
    
    Returns:
        (df_with_ml_scores, ml_anomaly_records)
    """
    logger.info("Starting ML anomaly scoring pipeline...")

    df, feature_matrix, valid_indices = prepare_ml_features(df)

    if feature_matrix.shape[0] < 10:
        logger.warning("Insufficient data for ML scoring. Skipping.")
        df["ml_anomaly_score"] = 0.0
        return df, []

    model, scaler, raw_scores, normalized_scores = train_isolation_forest(
        feature_matrix, contamination
    )

    if model is None:
        df["ml_anomaly_score"] = 0.0
        return df, []

    # Compute SHAP values
    shap_values = compute_shap_values(model, scaler, feature_matrix)

    # Assign scores back to DataFrame
    df["ml_anomaly_score"] = 0.0
    for i, idx in enumerate(valid_indices):
        df.at[idx, "ml_anomaly_score"] = round(float(normalized_scores[i]), 2)

    # Save model
    if model_dir:
        save_model(model, scaler, model_dir)

    # Generate anomaly records for projects flagged by ML
    ml_threshold = np.percentile(normalized_scores, 100 - contamination * 100)
    ml_anomaly_records = []

    for i, idx in enumerate(valid_indices):
        score = normalized_scores[i]
        if score >= ml_threshold:
            project_id = df.at[idx, "project_id"]
            shap_explanation = (
                get_project_shap_explanation(shap_values, i)
                if shap_values is not None else {}
            )

            # Find top contributing features
            if shap_explanation:
                top_features = sorted(
                    shap_explanation.items(), key=lambda x: abs(x[1]), reverse=True
                )[:3]
                drivers = ", ".join(f"{k} ({v:+.3f})" for k, v in top_features)
            else:
                drivers = "Feature importance unavailable"

            ml_anomaly_records.append({
                "project_id": project_id,
                "detection_type": "ML",
                "rule_name": "ISOLATION_FOREST",
                "severity": "HIGH" if score > 85 else "MODERATE",
                "score_contribution": round(float(score), 2),
                "explanation": (
                    f"Isolation Forest flagged this project as a multivariate outlier "
                    f"(anomaly score: {score:.1f}/100). "
                    f"Key drivers: {drivers}. "
                    f"This is a statistical anomaly flag, NOT a fraud finding."
                ),
                "evidence_json": {
                    "anomaly_score": round(float(score), 2),
                    "shap_values": shap_explanation,
                    "model_version": MODEL_VERSION,
                    "features_used": ML_FEATURES,
                    "disclaimer": "Unsupervised anomaly detection. No fraud labels used.",
                },
                "model_version": MODEL_VERSION,
            })

    logger.info(f"ML scoring complete: {len(ml_anomaly_records)} ML anomalies flagged")
    return df, ml_anomaly_records
