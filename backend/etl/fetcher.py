"""
MPLADS Monitor — Official API Data Fetcher
==========================================
Fetches all datasets from the MPLADS eSAKSHI public portal.

DISCOVERED ENDPOINTS (reverse-engineered from portal JS):
  POST /rest/PreLoginDashboardData/getTilesReportData
  POST /rest/PreLoginDashboardData/getTilesData
  POST /rest/PreLoginDashboardData/getStateData

IMPORTANT LIMITATIONS (documented):
- Portal data covers April 2023 onward ONLY
- No work_id exists across datasets (entity matching by composite key)
- No vendor/payment data in public API
- No work descriptions in public API
"""

import json
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
import requests
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings

logger = logging.getLogger(__name__)

BASE_URL = settings.mplads_api_base
TILES_REPORT_ENDPOINT = f"{BASE_URL}/rest/PreLoginDashboardData/getTilesReportData"
TILES_DATA_ENDPOINT = f"{BASE_URL}/rest/PreLoginDashboardData/getTilesData"
STATE_DATA_ENDPOINT = f"{BASE_URL}/rest/PreLoginDashboardData/getStateData"

# Lok Sabha = "0,0,0,2" | Rajya Sabha = "0,0,0,1"
LOK_SABHA_COMBO = "0,0,0,2"
RAJYA_SABHA_COMBO = "0,0,0,1"

DATASET_KEYS = [
    "Allocated Limit",
    "Available Limit",
    "Rural",
    "Urban",
    "On Going",
    "Completed",
    "Unsanctioned",
    "Calamity",
]

HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Accept": "application/json",
    "Origin": "https://mplads.mospi.gov.in",
    "Referer": "https://mplads.mospi.gov.in/digigov/dashboard.html",
}


def _post_with_retry(url: str, payload: dict, max_retries: int = None) -> Optional[dict]:
    """POST request with retry logic and exponential backoff."""
    max_retries = max_retries or settings.mplads_max_retries
    timeout = settings.mplads_request_timeout

    for attempt in range(max_retries):
        try:
            response = requests.post(
                url,
                json=payload,
                headers=HEADERS,
                timeout=timeout,
            )
            response.raise_for_status()
            data = response.json()
            return data
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout on attempt {attempt+1}/{max_retries}: {url}")
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error {e.response.status_code}: {url}")
            if e.response.status_code in (403, 401):
                # Auth error — don't retry
                raise
        except Exception as e:
            logger.error(f"Request failed (attempt {attempt+1}): {e}")

        if attempt < max_retries - 1:
            wait = 2 ** attempt
            logger.info(f"Retrying in {wait}s...")
            time.sleep(wait)

    return None


def fetch_tiles_summary(combo: str = LOK_SABHA_COMBO) -> Optional[dict]:
    """Fetch KPI tile summary data (totals only, no row-level data)."""
    payload = {"uname": combo}
    logger.info(f"Fetching tiles summary for combo={combo}")
    result = _post_with_retry(TILES_DATA_ENDPOINT, payload)
    return result


def fetch_dataset(key: str, combo: str = LOK_SABHA_COMBO) -> Optional[list]:
    """
    Fetch full tabular data for one dataset key.
    
    Args:
        key: Dataset name (e.g., "Completed", "On Going", "Rural")
        combo: Filter combo string "STATE_ID,CONST_ID,MP_ID,TENURE_ID"
    
    Returns:
        List of record dicts, or None on failure
    """
    payload = {"combo": combo, "key": key}
    logger.info(f"Fetching dataset key='{key}' combo={combo}")

    raw = _post_with_retry(TILES_REPORT_ENDPOINT, payload)
    if raw is None:
        logger.error(f"Failed to fetch dataset: {key}")
        return None

    # The API returns: {"Allocated Limit": "[{...},{...}]", ...}
    # The actual data is usually a JSON-encoded string under the key name
    try:
        if isinstance(raw, dict):
            if key in raw:
                inner = raw[key]
                if isinstance(inner, str):
                    return json.loads(inner)
                elif isinstance(inner, list):
                    return inner
            # Sometimes the whole response IS the list
            for k, v in raw.items():
                if isinstance(v, str) and v.startswith("["):
                    try:
                        parsed = json.loads(v)
                        if isinstance(parsed, list) and len(parsed) > 0:
                            logger.info(f"Found data under key '{k}': {len(parsed)} records")
                            return parsed
                    except Exception:
                        pass
        elif isinstance(raw, list):
            return raw
    except (json.JSONDecodeError, KeyError) as e:
        logger.error(f"Failed to parse dataset response for '{key}': {e}")
        logger.debug(f"Raw response type: {type(raw)}, content: {str(raw)[:500]}")

    return None


def fetch_all_datasets(house: str = "LOK") -> dict:
    """
    Fetch all MPLADS datasets for both Lok Sabha and Rajya Sabha.
    
    Returns:
        dict with keys like "LOK_Rural", "RAJYA_Completed", etc.
        Each value is a list of records or None if fetch failed.
    """
    combo = LOK_SABHA_COMBO if house == "LOK" else RAJYA_SABHA_COMBO
    results = {}
    failed = []

    logger.info(f"Starting full data fetch for {house} Sabha...")
    for key in DATASET_KEYS:
        data = fetch_dataset(key, combo)
        store_key = f"{house}_{key.replace(' ', '_')}"
        results[store_key] = data
        if data is None:
            failed.append(key)
        else:
            logger.info(f"  ✓ {key}: {len(data)} records")
        time.sleep(0.5)  # Respectful delay

    if failed:
        logger.warning(f"Failed datasets: {failed}")

    return results


def save_raw_data(data: dict, output_dir: Path) -> dict:
    """Save raw fetched data as JSON files with timestamp."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_files = {}

    for key, records in data.items():
        if records is not None:
            filename = f"{key}_{timestamp}.json"
            filepath = output_dir / filename
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2, default=str)
            saved_files[key] = str(filepath)
            logger.info(f"Saved {key}: {filepath}")
        else:
            logger.warning(f"No data to save for {key}")

    # Save manifest
    manifest = {
        "fetch_timestamp": timestamp,
        "datasets": {k: len(v) if v else 0 for k, v in data.items()},
        "files": saved_files,
    }
    manifest_path = output_dir / f"manifest_{timestamp}.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    logger.info(f"Manifest saved: {manifest_path}")
    return saved_files


def load_latest_raw(raw_dir: Path, key: str) -> Optional[list]:
    """Load the most recent saved JSON for a dataset key."""
    pattern = f"{key}_*.json"
    files = sorted(raw_dir.glob(pattern), reverse=True)
    if not files:
        return None
    with open(files[0], encoding="utf-8") as f:
        return json.load(f)


def run_full_fetch(output_dir: Optional[Path] = None) -> dict:
    """
    Main entry point: fetch all data, save to disk, return summary.
    Fetches both Lok Sabha and Rajya Sabha.
    """
    if output_dir is None:
        output_dir = settings.data_raw_dir

    logger.info("=" * 60)
    logger.info("MPLADS Data Fetcher — Starting")
    logger.info("Source: https://mplads.mospi.gov.in")
    logger.info("Data coverage: April 2023 onward (eSAKSHI portal)")
    logger.info("=" * 60)

    all_data = {}

    # Fetch tiles summary first
    lok_summary = fetch_tiles_summary(LOK_SABHA_COMBO)
    rajya_summary = fetch_tiles_summary(RAJYA_SABHA_COMBO)
    all_data["LOK_SUMMARY"] = lok_summary
    all_data["RAJYA_SUMMARY"] = rajya_summary

    # Fetch all detailed datasets
    lok_data = fetch_all_datasets("LOK")
    rajya_data = fetch_all_datasets("RAJYA")
    all_data.update(lok_data)
    all_data.update(rajya_data)

    saved = save_raw_data(all_data, Path(output_dir))

    logger.info("=" * 60)
    logger.info("Fetch complete. Summary:")
    for k, v in lok_data.items():
        count = len(v) if v else 0
        logger.info(f"  {k}: {count} records")
    logger.info("=" * 60)

    return all_data


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s"
    )
    run_full_fetch()
