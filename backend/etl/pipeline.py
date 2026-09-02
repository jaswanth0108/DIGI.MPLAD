"""
MPLADS Monitor — Full Pipeline Orchestrator
=============================================
Runs the complete ETL → Feature Engineering → Detection → Scoring pipeline.

Usage:
    python -m backend.etl.pipeline          # Full pipeline with live data fetch
    python -m backend.etl.pipeline --demo   # Full pipeline with synthetic demo data
"""

import json
import logging
import sys
import os
from datetime import datetime
from pathlib import Path

import pandas as pd

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings

logger = logging.getLogger(__name__)


def run_pipeline(use_demo_data: bool = True, save_to_db: bool = False):
    """
    Execute the full data pipeline.
    
    Steps:
    1. Fetch/generate data
    2. Validate
    3. Clean & merge
    4. Feature engineering
    5. Rule-based detection
    6. ML anomaly scoring
    7. Risk scoring
    8. Save results
    """
    logger.info("=" * 70)
    logger.info("MPLADS ANOMALY DETECTION PIPELINE")
    logger.info(f"Mode: {'DEMO (synthetic data)' if use_demo_data else 'LIVE (portal API)'}")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("=" * 70)

    base_dir = Path(__file__).parent.parent.parent
    raw_dir = base_dir / "data" / "raw"
    processed_dir = base_dir / "data" / "processed"
    model_dir = base_dir / "ml" / "models"

    # ── Step 1: Get Data ─────────────────────────────────────────────────────
    logger.info("\n[STEP 1] Data Acquisition")
    if use_demo_data:
        sys.path.insert(0, str(base_dir / "scripts"))
        from generate_demo_data import save_synthetic_data
        all_data = save_synthetic_data(raw_dir)
    else:
        from etl.fetcher import run_full_fetch
        all_data = run_full_fetch(raw_dir)

    logger.info(f"Datasets loaded: {len(all_data)}")

    # ── Step 2: Validate ─────────────────────────────────────────────────────
    logger.info("\n[STEP 2] Data Validation")
    from etl.validator import validate_all
    reports = validate_all(all_data, save_report=True, output_dir=processed_dir)
    total_issues = sum(r.to_dict()["issue_count"] for r in reports.values())
    logger.info(f"Validation complete: {total_issues} total issues across {len(reports)} datasets")

    # ── Step 3: Clean & Merge ────────────────────────────────────────────────
    logger.info("\n[STEP 3] Cleaning & Merging")
    from etl.cleaner import merge_all_datasets
    master_df, alloc_df, cal_df = merge_all_datasets(all_data)

    if master_df.empty:
        logger.error("PIPELINE FAILED: No project data after cleaning!")
        return None

    logger.info(f"Master projects: {len(master_df)}")
    logger.info(f"MP allocations: {len(alloc_df)}")
    logger.info(f"Calamity consents: {len(cal_df)}")

    # ── Step 4: Feature Engineering ──────────────────────────────────────────
    logger.info("\n[STEP 4] Feature Engineering")
    from features.engineering import run_feature_engineering
    master_df, pairs_df = run_feature_engineering(master_df)

    logger.info(f"Features computed. Similar pairs found: {len(pairs_df)}")

    # ── Step 5: Rule-Based Detection ─────────────────────────────────────────
    logger.info("\n[STEP 5] Rule-Based Detection")
    from detection.rules import run_all_rules
    master_df, rule_anomalies = run_all_rules(master_df, pairs_df)

    logger.info(f"Rule anomalies: {len(rule_anomalies)}")

    # ── Step 6: ML Anomaly Scoring ───────────────────────────────────────────
    logger.info("\n[STEP 6] ML Anomaly Scoring (Isolation Forest)")
    from detection.ml_model import run_ml_scoring
    master_df, ml_anomalies = run_ml_scoring(
        master_df,
        contamination=settings.isolation_forest_contamination,
        model_dir=model_dir,
    )
    logger.info(f"ML anomalies: {len(ml_anomalies)}")

    # ── Step 7: Composite Risk Scoring ───────────────────────────────────────
    logger.info("\n[STEP 7] Composite Risk Scoring")
    from detection.risk_scorer import compute_overall_risk_score
    master_df = compute_overall_risk_score(master_df, pairs_df)

    # Set metadata
    master_df["model_version"] = settings.model_version
    master_df["rules_version"] = settings.rules_version
    master_df["scored_at"] = datetime.utcnow()

    # ── Step 8: Save Results ─────────────────────────────────────────────────
    logger.info("\n[STEP 8] Saving Results")
    processed_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Save master projects as CSV + JSON
    master_path = processed_dir / f"master_projects_{ts}.csv"
    master_df.to_csv(master_path, index=False)
    logger.info(f"Saved: {master_path}")

    # Save as JSON for API loading
    json_path = processed_dir / f"master_projects_{ts}.json"
    master_df.to_json(json_path, orient="records", date_format="iso",
                      default_handler=str, indent=2)
    logger.info(f"Saved: {json_path}")

    # Save allocations
    if not alloc_df.empty:
        alloc_path = processed_dir / f"mp_allocations_{ts}.csv"
        alloc_df.to_csv(alloc_path, index=False)

    # Save anomalies
    all_anomalies = rule_anomalies + ml_anomalies
    anomalies_path = processed_dir / f"anomaly_results_{ts}.json"
    with open(anomalies_path, "w") as f:
        json.dump(all_anomalies, f, indent=2, default=str)
    logger.info(f"Saved: {anomalies_path}")

    # Save duplicate pairs
    if not pairs_df.empty:
        pairs_path = processed_dir / f"duplicate_pairs_{ts}.json"
        pairs_df.to_json(pairs_path, orient="records", indent=2, default_handler=str)
        logger.info(f"Saved: {pairs_path}")

    # Save "latest" symlink/copies for API to load
    for src, name in [
        (json_path, "master_projects_latest.json"),
        (anomalies_path, "anomaly_results_latest.json"),
    ]:
        latest = processed_dir / name
        import shutil
        shutil.copy2(src, latest)

    if not pairs_df.empty:
        shutil.copy2(
            processed_dir / f"duplicate_pairs_{ts}.json",
            processed_dir / "duplicate_pairs_latest.json",
        )

    # ── Summary ──────────────────────────────────────────────────────────────
    logger.info("\n" + "=" * 70)
    logger.info("PIPELINE COMPLETE — Summary")
    logger.info("=" * 70)
    logger.info(f"Total projects: {len(master_df)}")
    band_counts = master_df["risk_band"].value_counts().to_dict()
    for band in ["CRITICAL", "HIGH", "MODERATE", "LOW"]:
        count = band_counts.get(band, 0)
        pct = count / len(master_df) * 100
        logger.info(f"  {band:10s}: {count:5d} ({pct:.1f}%)")
    logger.info(f"Total anomaly flags: {len(all_anomalies)}")
    logger.info(f"Similar pairs: {len(pairs_df)}")
    logger.info(f"Score range: {master_df['overall_risk_score'].min():.1f} – "
                f"{master_df['overall_risk_score'].max():.1f}")
    logger.info(f"Output: {processed_dir}")
    logger.info("=" * 70)

    return {
        "master_df": master_df,
        "alloc_df": alloc_df,
        "cal_df": cal_df,
        "anomalies": all_anomalies,
        "pairs_df": pairs_df,
        "processed_dir": str(processed_dir),
    }


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-8s %(message)s",
    )

    use_demo = "--demo" in sys.argv or "--synthetic" in sys.argv
    if not use_demo:
        use_demo = True  # Default to demo mode for safety

    run_pipeline(use_demo_data=use_demo)
