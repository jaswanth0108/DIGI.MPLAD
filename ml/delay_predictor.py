"""
MPLADS Monitor — Predictive Delay Classification Model
======================================================
Trains an XGBoost / GradientBoosting model to predict whether ongoing / newly
sanctioned works will breach the standard 365-day timeline.

Features:
- allocated_amount (log)
- location_type (encoded)
- amount_vs_district_pct
- mp_project_count
- state_project_density
"""

import logging
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib

logger = logging.getLogger(__name__)


def train_delay_predictor(master_df: pd.DataFrame, model_dir: Path = None):
    # Only train on completed or clearly overdue works (known ground truth for delay)
    df = master_df.copy()
    
    # Target: 1 if days_to_complete > 365 or is_stalled/is_overdue
    df["target_delay"] = np.where(
        (df["days_to_complete"] > 365) | (df["project_age_days"] > 365), 1, 0
    )

    feature_cols = [
        "allocated_amount",
        "amount_vs_district_pct",
        "amount_vs_state_pct",
        "mp_project_count",
        "constituency_project_count",
    ]

    for col in feature_cols:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].median() if not pd.isna(df[col].median()) else 0)
        else:
            df[col] = 0

    X = df[feature_cols].values
    y = df["target_delay"].values

    if len(X) < 50:
        logger.warning("Insufficient samples for training delay predictor.")
        return None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    clf = GradientBoostingClassifier(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    probs = clf.predict_proba(X_test)[:, 1]

    auc = roc_auc_score(y_test, probs) if len(np.unique(y_test)) > 1 else 0.5
    logger.info(f"Delay Predictor AUC-ROC: {auc:.3f}")

    if model_dir:
        model_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(clf, model_dir / "delay_predictor.pkl")
        joblib.dump(feature_cols, model_dir / "delay_features.pkl")

    return clf
