"""
MPLADS Monitor — Data Validator
================================
Validates raw MPLADS data against expected schemas.
Produces a detailed data quality report documenting:
- Missing values
- Invalid amounts (negative, zero, extreme)
- Invalid date formats
- Duplicate records
- Joinability issues

IMPORTANT DISTINCTION:
  Data Quality Issue ≠ Operational Anomaly ≠ Possible Fraud
"""

import json
import logging
from datetime import datetime, date
from typing import Optional
from pathlib import Path
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Expected columns per dataset (from portal JS deobfuscation)
EXPECTED_COLUMNS = {
    "Allocated_Limit": ["STATE_NAME", "CONSTITUENCY_NAME", "MP_NAME", "ALLOCATED_AMOUNT"],
    "Available_Limit": ["HOUSE_NAME", "STATE_NAME", "CONSTITUENCY_NAME", "MP_NAME",
                        "FRESH_LIMIT", "RECOMMENDED_AMOUNT"],
    "Rural": ["HOUSE_NAME", "WORK_STATUS", "BLOCK_NAME", "VILLAGE_NAME", "STATE_NAME",
              "CITY_NAME", "CONSTITUENCY_NAME", "MP_NAME", "FRESH_LIMIT",
              "RECOMMENDATION_DATE", "RECOMMENDED_AMOUNT"],
    "Urban": ["HOUSE_NAME", "WORK_STATUS", "STATE_NAME", "CITY_NAME",
              "CONSTITUENCY_NAME", "MP_NAME", "FRESH_LIMIT",
              "RECOMMENDATION_DATE", "RECOMMENDED_AMOUNT"],
    "On_Going": ["HOUSE_NAME", "WORK_STATUS", "CITY_NAME", "STATE_NAME",
                 "CONSTITUENCY_NAME", "MP_NAME", "FRESH_LIMIT",
                 "RECOMMENDATION_DATE", "RECOMMENDED_AMOUNT"],
    "Completed": ["HOUSE_NAME", "WORK_STATUS", "CITY_NAME", "STATE_NAME",
                  "CONSTITUENCY_NAME", "MP_NAME", "FRESH_LIMIT",
                  "RECOMMENDATION_DATE", "RECOMMENDED_AMOUNT", "EXPENDITURE_AMT",
                  "ACTUAL_END_DATE"],
    "Unsanctioned": ["HOUSE_NAME", "WORK_STATUS", "CITY_NAME", "STATE_NAME",
                     "CONSTITUENCY_NAME", "MP_NAME", "FRESH_LIMIT",
                     "RECOMMENDATION_DATE", "RECOMMENDED_AMOUNT"],
    "Calamity": ["CALAMITY_TYPE", "CALAMITY_NAME", "MP_NAME",
                 "DATE_OF_CONSENT", "CONSENT_AMOUNT"],
}

# Amount columns to validate per dataset
AMOUNT_COLUMNS = {
    "Allocated_Limit": ["ALLOCATED_AMOUNT"],
    "Available_Limit": ["FRESH_LIMIT", "RECOMMENDED_AMOUNT"],
    "Rural": ["FRESH_LIMIT", "RECOMMENDED_AMOUNT"],
    "Urban": ["FRESH_LIMIT", "RECOMMENDED_AMOUNT"],
    "On_Going": ["FRESH_LIMIT", "RECOMMENDED_AMOUNT"],
    "Completed": ["FRESH_LIMIT", "RECOMMENDED_AMOUNT", "EXPENDITURE_AMT"],
    "Unsanctioned": ["FRESH_LIMIT", "RECOMMENDED_AMOUNT"],
    "Calamity": ["CONSENT_AMOUNT"],
}

DATE_COLUMNS = {
    "Rural": ["RECOMMENDATION_DATE"],
    "Urban": ["RECOMMENDATION_DATE"],
    "On_Going": ["RECOMMENDATION_DATE"],
    "Completed": ["RECOMMENDATION_DATE", "ACTUAL_END_DATE"],
    "Unsanctioned": ["RECOMMENDATION_DATE"],
    "Calamity": ["DATE_OF_CONSENT"],
}


class DataQualityReport:
    """Structured data quality report for a single dataset."""

    def __init__(self, dataset_name: str):
        self.dataset_name = dataset_name
        self.total_records = 0
        self.issues = []
        self.missing_pct = {}
        self.duplicate_records = 0
        self.invalid_amounts = {}
        self.invalid_dates = {}
        self.value_stats = {}
        self.timestamp = datetime.now().isoformat()

    def add_issue(self, severity: str, field: str, description: str, count: int = 0):
        self.issues.append({
            "severity": severity,  # INFO / WARNING / ERROR
            "field": field,
            "description": description,
            "count": count,
        })

    def to_dict(self) -> dict:
        return {
            "dataset": self.dataset_name,
            "timestamp": self.timestamp,
            "total_records": self.total_records,
            "duplicate_records": self.duplicate_records,
            "missing_pct": self.missing_pct,
            "invalid_amounts": self.invalid_amounts,
            "invalid_dates": self.invalid_dates,
            "value_stats": self.value_stats,
            "issues": self.issues,
            "issue_count": len(self.issues),
            "error_count": sum(1 for i in self.issues if i["severity"] == "ERROR"),
            "warning_count": sum(1 for i in self.issues if i["severity"] == "WARNING"),
        }

    def print_summary(self):
        print(f"\n{'='*60}")
        print(f"Data Quality Report: {self.dataset_name}")
        print(f"{'='*60}")
        print(f"Records: {self.total_records}")
        print(f"Duplicates: {self.duplicate_records}")
        print(f"Issues: {len(self.issues)} "
              f"({sum(1 for i in self.issues if i['severity'] == 'ERROR')} errors, "
              f"{sum(1 for i in self.issues if i['severity'] == 'WARNING')} warnings)")

        if self.missing_pct:
            print("\nMissing Values:")
            for col, pct in sorted(self.missing_pct.items(), key=lambda x: -x[1]):
                if pct > 0:
                    print(f"  {col}: {pct:.1f}%")

        for issue in self.issues:
            icon = "[ERROR]" if issue["severity"] == "ERROR" else "[WARN]" if issue["severity"] == "WARNING" else "[INFO]"
            print(f"  {icon} [{issue['field']}] {issue['description']}")


def _try_parse_amount(val) -> Optional[float]:
    """Try to parse a value as float amount, handling Indian formatting."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    try:
        s = str(val).strip().replace(",", "").replace("₹", "").replace("Rs", "").strip()
        return float(s)
    except (ValueError, TypeError):
        return None


def _try_parse_date(val) -> Optional[date]:
    """Try to parse various date formats."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    if isinstance(val, (date, datetime)):
        return val if isinstance(val, date) else val.date()
    formats = ["%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%b-%Y"]
    s = str(val).strip()
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def validate_dataset(records: list, dataset_name: str) -> DataQualityReport:
    """
    Validate a list of raw records from the MPLADS API.
    Returns a DataQualityReport.
    """
    report = DataQualityReport(dataset_name)

    if not records:
        report.add_issue("ERROR", "dataset", "Empty dataset — no records returned")
        return report

    df = pd.DataFrame(records)
    report.total_records = len(df)

    # ── 1. Missing Values ────────────────────────────────────────────────────
    for col in df.columns:
        missing = df[col].isna().sum() + (df[col] == "").sum() + (df[col] == "null").sum()
        pct = (missing / len(df)) * 100
        report.missing_pct[col] = round(pct, 2)
        if pct > 50:
            report.add_issue("WARNING", col, f"{pct:.1f}% missing values")
        elif pct > 0:
            report.add_issue("INFO", col, f"{pct:.1f}% missing values", count=int(missing))

    # ── 2. Duplicate Records ─────────────────────────────────────────────────
    # Exclude serial number column from duplicate check
    dup_cols = [c for c in df.columns if c.upper() not in ("SNO", "SL_NO", "SERIAL_NO")]
    if len(dup_cols) > 1:
        dups = df.duplicated(subset=dup_cols[:5]).sum()
        report.duplicate_records = int(dups)
        if dups > 0:
            pct = (dups / len(df)) * 100
            report.add_issue("WARNING", "duplicates", f"{dups} duplicate records ({pct:.1f}%)",
                             count=int(dups))

    # ── 3. Amount Validation ─────────────────────────────────────────────────
    ds_key = dataset_name.replace(" ", "_")
    amount_cols = AMOUNT_COLUMNS.get(ds_key, [])

    for col in amount_cols:
        # Find actual column name (case-insensitive)
        actual_col = next((c for c in df.columns if c.upper() == col.upper()), None)
        if actual_col is None:
            # Try alternate column names
            alt_map = {
                "FRESH_LIMIT": ["AVAILABLE_LIMIT", "FRESH_LIMIT"],
                "RECOMMENDED_AMOUNT": ["ALLOCATED_AMOUNT", "RECOMMENDED_AMOUNT"],
                "EXPENDITURE_AMT": ["EXPENDITURE_AMOUNT", "EXPENDITURE_AMT"],
            }
            for alt in alt_map.get(col, []):
                actual_col = next((c for c in df.columns if c.upper() == alt.upper()), None)
                if actual_col:
                    break

        if actual_col is None:
            report.add_issue("INFO", col, f"Column '{col}' not found in dataset")
            continue

        amounts = df[actual_col].apply(_try_parse_amount)
        valid_amounts = amounts.dropna()

        if len(valid_amounts) == 0:
            report.add_issue("ERROR", actual_col, "No parseable amounts found")
            continue

        negatives = (valid_amounts < 0).sum()
        zeros = (valid_amounts == 0).sum()
        
        # Statistical outlier detection (> 5 IQR from Q3)
        q1 = valid_amounts.quantile(0.25)
        q3 = valid_amounts.quantile(0.75)
        iqr = q3 - q1
        extreme = (valid_amounts > q3 + 5 * iqr).sum() if iqr > 0 else 0

        report.invalid_amounts[actual_col] = {
            "negatives": int(negatives),
            "zeros": int(zeros),
            "extreme_outliers": int(extreme),
            "min": float(valid_amounts.min()),
            "max": float(valid_amounts.max()),
            "median": float(valid_amounts.median()),
            "mean": float(valid_amounts.mean()),
        }
        report.value_stats[actual_col] = report.invalid_amounts[actual_col]

        if negatives > 0:
            report.add_issue("ERROR", actual_col, f"{negatives} negative amounts", count=int(negatives))
        if zeros > int(0.1 * len(df)):  # more than 10% zeros
            report.add_issue("WARNING", actual_col, f"{zeros} zero amounts ({zeros/len(df)*100:.1f}%)",
                             count=int(zeros))
        if extreme > 0:
            report.add_issue("WARNING", actual_col,
                            f"{extreme} extreme outliers (>5 IQR above Q3)", count=int(extreme))

    # ── 4. Date Validation ───────────────────────────────────────────────────
    date_cols = DATE_COLUMNS.get(ds_key, [])
    portal_launch = date(2023, 4, 1)
    today = date.today()

    for col in date_cols:
        actual_col = next((c for c in df.columns if c.upper() == col.upper()), None)
        if actual_col is None:
            continue

        dates = df[actual_col].apply(_try_parse_date)
        valid_dates = dates.dropna()
        unparseable = dates.isna().sum() - df[actual_col].isna().sum()

        if unparseable > 0:
            report.add_issue("WARNING", actual_col,
                            f"{unparseable} unparseable dates", count=int(unparseable))
            report.invalid_dates[actual_col] = {"unparseable": int(unparseable)}

        pre_portal = (valid_dates < portal_launch).sum()
        future = (valid_dates > today).sum()

        if pre_portal > 0:
            report.add_issue("INFO", actual_col,
                            f"{pre_portal} dates before April 2023 (portal launch)",
                            count=int(pre_portal))
        if future > 0:
            report.add_issue("WARNING", actual_col,
                            f"{future} future dates (> today)", count=int(future))

    # ── 5. State/MP Name Consistency ─────────────────────────────────────────
    state_col = next((c for c in df.columns if "STATE" in c.upper() and "NAME" in c.upper()), None)
    if state_col:
        unique_states = df[state_col].dropna().unique()
        report.value_stats["unique_states"] = int(len(unique_states))

    mp_col = next((c for c in df.columns if "MP_NAME" in c.upper() or "MEMBER" in c.upper()), None)
    if mp_col:
        unique_mps = df[mp_col].dropna().unique()
        report.value_stats["unique_mps"] = int(len(unique_mps))

    return report


def validate_all(all_data: dict, save_report: bool = True,
                 output_dir: Optional[Path] = None) -> dict:
    """
    Validate all fetched datasets. Returns dict of DataQualityReport objects.
    """
    reports = {}

    for key, records in all_data.items():
        if records is None:
            logger.warning(f"Skipping validation for {key}: no data")
            continue
        if not isinstance(records, list):
            continue

        logger.info(f"Validating {key}...")
        report = validate_dataset(records, key)
        report.print_summary()
        reports[key] = report

    if save_report and output_dir:
        output_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = output_dir / f"data_quality_report_{timestamp}.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump({k: v.to_dict() for k, v in reports.items()}, f, indent=2)
        logger.info(f"Data quality report saved: {report_path}")

    return reports
