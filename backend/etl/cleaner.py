"""
MPLADS Monitor — Data Cleaner & Normalizer
==========================================
Cleans and normalizes raw MPLADS data into a unified schema.

Cleaning operations:
- Normalize MP/state/constituency names (uppercase, strip honorifics)
- Parse amounts to float (handle Indian number formatting)
- Parse dates to Python date objects
- Create composite entity-matching key
- Merge Rural + Urban → Recommended Works
- Merge lifecycle datasets into master_projects table

DOCUMENTED LIMITATIONS:
- No persistent work_id exists → composite key matching only
- Entity matching is approximate (may have collisions or mismatches)
- Rural/Urban may overlap during status transitions
"""

import re
import logging
from datetime import datetime, date
from typing import Optional
import pandas as pd
import numpy as np
try:
    from unidecode import unidecode
except ImportError:
    unidecode = lambda x: x

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Name Normalization
# ─────────────────────────────────────────────────────────────────────────────

# Honorifics to strip from MP names
HONORIFICS = [
    r"^(dr\.?\s+)", r"^(shri\s+)", r"^(smt\.?\s+)", r"^(smt\s+)",
    r"^(mr\.?\s+)", r"^(mrs\.?\s+)", r"^(prof\.?\s+)",
    r"^(adv\.?\s+)", r"^(hon\'ble\s+)",
    r"(\s+mp\s*$)", r"(\s+\(mp\)\s*$)",
]

# State name standardization map
STATE_ALIASES = {
    "JAMMU AND KASHMIR": "JAMMU & KASHMIR",
    "J&K": "JAMMU & KASHMIR",
    "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "DADRA & NAGAR HAVELI",
    "ANDAMAN AND NICOBAR": "ANDAMAN & NICOBAR ISLANDS",
    "ANDAMAN AND NICOBAR ISLANDS": "ANDAMAN & NICOBAR ISLANDS",
}


def normalize_name(name: Optional[str], strip_honorifics: bool = False) -> Optional[str]:
    """Normalize a name field: uppercase, strip whitespace, optional honorific removal."""
    if name is None or (isinstance(name, float) and np.isnan(name)):
        return None
    name = str(name).strip().upper()
    name = re.sub(r'\s+', ' ', name)
    if strip_honorifics:
        for pattern in HONORIFICS:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE).strip().upper()
    return name if name else None


def normalize_state(name: Optional[str]) -> Optional[str]:
    """Normalize state name with alias resolution."""
    n = normalize_name(name)
    if n is None:
        return None
    return STATE_ALIASES.get(n, n)


def parse_amount(val) -> Optional[float]:
    """Parse Indian-formatted currency values to float."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        if np.isnan(val):
            return None
        return float(val)
    s = str(val).strip()
    s = re.sub(r'[₹Rs,\s]', '', s)
    if not s or s.lower() in ('null', 'n/a', '-', ''):
        return None
    try:
        return float(s)
    except ValueError:
        logger.debug(f"Could not parse amount: '{val}'")
        return None


def parse_date(val) -> Optional[date]:
    """Parse various MPLADS date formats to Python date."""
    if val is None:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, float) and np.isnan(val):
        return None
    s = str(val).strip()
    if not s or s.lower() in ('null', 'n/a', '-', ''):
        return None
    formats = [
        "%d-%b-%Y",   # 15-Apr-2024
        "%d/%m/%Y",   # 15/04/2024
        "%Y-%m-%d",   # 2024-04-15
        "%d-%m-%Y",   # 15-04-2024
        "%b-%Y",      # Apr-2024
        "%Y-%m-%dT%H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    logger.debug(f"Could not parse date: '{val}'")
    return None


def make_composite_key(house: str, state: str, constituency: str,
                       mp: str, date_val: Optional[date],
                       amount: Optional[float]) -> str:
    """
    Create a composite entity-matching key.
    
    WARNING: This is an APPROXIMATE matching key, not a guaranteed unique ID.
    Collisions are possible. Mismatches are possible. Document all assumptions.
    """
    parts = [
        str(house or "").strip(),
        str(state or "").strip().upper(),
        str(constituency or "").strip().upper(),
        str(mp or "").strip().upper(),
        str(date_val) if date_val else "NO_DATE",
        str(int(round(amount))) if amount else "NO_AMT",
    ]
    return "|".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# Dataset-Specific Cleaners
# ─────────────────────────────────────────────────────────────────────────────

def clean_allocated_limit(records: list, house_type: str = "LOK") -> pd.DataFrame:
    """Clean Allocated Limit dataset."""
    df = pd.DataFrame(records)
    if df.empty:
        return df

    # Normalize column names
    df.columns = [c.strip().upper() for c in df.columns]

    # Find actual columns (flexible matching)
    state_col = _find_col(df, ["STATE_NAME", "STATE"])
    mp_col = _find_col(df, ["MP_NAME", "MEMBER_OF_PARLIAMENT"])
    const_col = _find_col(df, ["CONSTITUENCY_NAME", "CONSTITUENCY"])
    amt_col = _find_col(df, ["ALLOCATED_AMOUNT", "RECOMMENDED_AMOUNT"])

    result = pd.DataFrame()
    result["house_type"] = house_type
    result["state_name"] = df[state_col].apply(normalize_state) if state_col else None
    result["mp_name"] = df[mp_col].apply(lambda x: normalize_name(x, True)) if mp_col else None
    result["constituency_name"] = df[const_col].apply(normalize_name) if const_col else None
    result["allocated_amount"] = df[amt_col].apply(parse_amount) if amt_col else None
    result["dataset_source"] = "Allocated_Limit"

    return result.dropna(subset=["state_name", "mp_name"], how="all")


def clean_works_dataset(records: list, source_key: str, house_type: str = "LOK") -> pd.DataFrame:
    """
    Clean Rural, Urban, On Going, Completed, or Unsanctioned dataset.
    This is the primary workhorse for project-level data.
    """
    df = pd.DataFrame(records)
    if df.empty:
        return df

    df.columns = [c.strip().upper() for c in df.columns]

    # Flexible column detection
    state_col = _find_col(df, ["STATE_NAME"])
    mp_col = _find_col(df, ["MP_NAME"])
    const_col = _find_col(df, ["CONSTITUENCY_NAME"])
    ida_col = _find_col(df, ["IDA NAME", "IDA_NAME"])
    city_col = _find_col(df, ["CITY_NAME"])
    block_col = _find_col(df, ["BLOCK_NAME"])
    village_col = _find_col(df, ["VILLAGE_NAME"])
    location_col = _find_col(df, ["LOCATION_TYPE"])
    status_col = _find_col(df, ["WORK_STATUS"])
    house_col = _find_col(df, ["HOUSE_NAME"])
    rec_date_col = _find_col(df, ["RECOMMENDATION_DATE", "RECOMMENDED_DATE",
                                   "RECOMMENDATION DATE"])
    amt_col = _find_col(df, ["RECOMMENDED_AMOUNT", "ALLOCATED_AMOUNT"])
    avail_col = _find_col(df, ["FRESH_LIMIT", "AVAILABLE_LIMIT"])
    exp_col = _find_col(df, ["EXPENDITURE_AMT", "EXPENDITURE_AMOUNT"])
    end_date_col = _find_col(df, ["ACTUAL_END_DATE", "COMPLETION_DATE"])
    letter_col = _find_col(df, ["LETTER_NO", "LETTER_NUMBER"])
    const_id_col = _find_col(df, ["CONSTITUENCY_ID"])

    result = pd.DataFrame()
    result["house_type"] = (
        df[house_col].apply(lambda x: "LOK" if str(x).upper() in ("LOK", "LOK SABHA") else "RAJYA")
        if house_col else house_type
    )
    result["state_name"] = df[state_col].apply(normalize_state) if state_col else None
    result["mp_name"] = (df[mp_col].apply(lambda x: normalize_name(x, True))
                          if mp_col else None)
    result["constituency_name"] = (df[const_col].apply(normalize_name)
                                    if const_col else None)
    result["ida_name"] = df[ida_col].apply(normalize_name) if ida_col else None
    result["city_name"] = df[city_col].apply(normalize_name) if city_col else None
    result["block_name"] = df[block_col].apply(normalize_name) if block_col else None
    result["village_name"] = df[village_col].apply(normalize_name) if village_col else None
    result["location_type"] = (
        df[location_col].apply(lambda x: str(x).strip().capitalize()) if location_col
        else ("Rural" if "Rural" in source_key else "Urban" if "Urban" in source_key else None)
    )
    result["work_status"] = df[status_col].apply(normalize_name) if status_col else None
    result["dataset_source"] = source_key
    result["recommended_date"] = df[rec_date_col].apply(parse_date) if rec_date_col else None
    result["allocated_amount"] = df[amt_col].apply(parse_amount) if amt_col else None
    result["available_limit"] = df[avail_col].apply(parse_amount) if avail_col else None
    result["expenditure_amt"] = df[exp_col].apply(parse_amount) if exp_col else None
    result["actual_end_date"] = df[end_date_col].apply(parse_date) if end_date_col else None
    result["letter_no"] = df[letter_col] if letter_col else None

    # Status flags
    result["is_completed"] = source_key in ("Completed",)
    result["is_ongoing"] = source_key in ("On_Going",)
    result["is_unsanctioned"] = source_key in ("Unsanctioned",)

    # Composite key for entity matching
    result["internal_key"] = result.apply(
        lambda row: make_composite_key(
            row.get("house_type"), row.get("state_name"),
            row.get("constituency_name"), row.get("mp_name"),
            row.get("recommended_date"), row.get("allocated_amount")
        ), axis=1
    )

    return result.dropna(subset=["state_name", "mp_name"], how="all")


def clean_calamity(records: list) -> pd.DataFrame:
    """Clean Calamity/Consent dataset."""
    df = pd.DataFrame(records)
    if df.empty:
        return df

    df.columns = [c.strip().upper() for c in df.columns]
    mp_col = _find_col(df, ["MP_NAME", "MEMBER_OF_PARLIAMENT"])
    type_col = _find_col(df, ["CALAMITY_TYPE"])
    name_col = _find_col(df, ["CALAMITY_NAME"])
    date_col = _find_col(df, ["DATE_OF_CONSENT", "CONSENT_DATE"])
    amt_col = _find_col(df, ["CONSENT_AMOUNT"])

    result = pd.DataFrame()
    result["mp_name"] = df[mp_col].apply(lambda x: normalize_name(x, True)) if mp_col else None
    result["calamity_type"] = df[type_col] if type_col else None
    result["calamity_name"] = df[name_col] if name_col else None
    result["consent_date"] = df[date_col].apply(parse_date) if date_col else None
    result["consent_amount"] = df[amt_col].apply(parse_amount) if amt_col else None

    return result


def _find_col(df: pd.DataFrame, candidates: list) -> Optional[str]:
    """Find first matching column name (case-insensitive)."""
    for candidate in candidates:
        for col in df.columns:
            if col.upper().replace(" ", "_") == candidate.upper().replace(" ", "_"):
                return col
            if col.upper() == candidate.upper():
                return col
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Master Merge
# ─────────────────────────────────────────────────────────────────────────────

def merge_all_datasets(all_data: dict) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Merge all cleaned datasets into:
    1. master_projects DataFrame
    2. mp_allocations DataFrame
    3. calamity_consents DataFrame
    
    Entity matching strategy:
    - Primary: internal_key (composite key)
    - For works that appear in multiple datasets (e.g., Rural + Completed),
      the Completed version takes priority (has expenditure + end_date)
    
    WARNING: This matching is APPROXIMATE. Collision/mismatch possible.
    """
    work_dfs = []
    alloc_dfs = []
    cal_dfs = []

    # Process Lok Sabha and Rajya Sabha
    for house in ("LOK", "RAJYA"):
        # Works datasets
        for source in ("Rural", "Urban", "On_Going", "Completed", "Unsanctioned"):
            key = f"{house}_{source}"
            records = all_data.get(key)
            if records and isinstance(records, list) and len(records) > 0:
                cleaned = clean_works_dataset(records, source, house)
                if not cleaned.empty:
                    work_dfs.append(cleaned)
                    logger.info(f"  Cleaned {key}: {len(cleaned)} records")

        # Allocations
        alloc_records = all_data.get(f"{house}_Allocated_Limit")
        if alloc_records and isinstance(alloc_records, list):
            alloc_cleaned = clean_allocated_limit(alloc_records, house)
            alloc_dfs.append(alloc_cleaned)

        # Calamity
        cal_records = all_data.get(f"{house}_Calamity")
        if cal_records and isinstance(cal_records, list):
            cal_cleaned = clean_calamity(cal_records)
            cal_dfs.append(cal_cleaned)

    # Concatenate all work datasets
    if not work_dfs:
        logger.warning("No work data to merge!")
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

    all_works = pd.concat(work_dfs, ignore_index=True)
    logger.info(f"Total records before dedup: {len(all_works)}")

    # Deduplication priority: Completed > On_Going > Rural/Urban > Unsanctioned
    priority_order = {"Completed": 0, "On_Going": 1, "Rural": 2, "Urban": 2, "Unsanctioned": 3}
    all_works["_priority"] = all_works["dataset_source"].map(priority_order).fillna(9)
    all_works = all_works.sort_values("_priority")
    master = all_works.drop_duplicates(subset=["internal_key"], keep="first")
    master = master.drop(columns=["_priority"])
    master = master.reset_index(drop=True)
    master["project_id"] = range(1, len(master) + 1)

    logger.info(f"Master projects after dedup: {len(master)}")
    logger.info(f"  By source: {master['dataset_source'].value_counts().to_dict()}")
    logger.info(f"  By house: {master['house_type'].value_counts().to_dict()}")
    logger.info(f"  By state: {master['state_name'].nunique()} states")

    alloc_df = pd.concat(alloc_dfs, ignore_index=True) if alloc_dfs else pd.DataFrame()
    cal_df = pd.concat(cal_dfs, ignore_index=True) if cal_dfs else pd.DataFrame()

    return master, alloc_df, cal_df
