import pytest
import pandas as pd
import numpy as np
from datetime import date, timedelta
from backend.features.engineering import (
    compute_financial_features,
    compute_temporal_features,
    compute_peer_features,
)
from backend.detection.rules import (
    check_r001_cost_overrun,
    check_r002_very_old_project,
    check_r003_overdue_ongoing,
    check_r004_expenditure_unsanctioned,
    check_r005_high_amount_district,
)
from backend.detection.risk_scorer import compute_overall_risk_score


def test_financial_features():
    df = pd.DataFrame([
        {'allocated_amount': 100000.0, 'expenditure_amt': 120000.0},
        {'allocated_amount': 50000.0, 'expenditure_amt': 25000.0},
    ])
    res = compute_financial_features(df)
    assert 'expenditure_ratio' in res.columns
    assert res['expenditure_ratio'].iloc[0] == 1.2
    assert res['expenditure_ratio'].iloc[1] == 0.5


def test_temporal_features():
    today = date.today()
    df = pd.DataFrame([
        {'recommended_date': today - timedelta(days=400), 'is_completed': False, 'actual_end_date': None},
        {'recommended_date': today - timedelta(days=100), 'is_completed': True, 'actual_end_date': today},
    ])
    res = compute_temporal_features(df)
    assert res['is_overdue'].iloc[0] == True
    assert res['is_overdue'].iloc[1] == False


def test_rule_r001_cost_overrun():
    row_overrun = pd.Series({'project_id': 1, 'expenditure_ratio': 1.25, 'expenditure_amt': 125000, 'allocated_amount': 100000})
    flag = check_r001_cost_overrun(row_overrun)
    assert flag is not None
    assert flag['rule_id'] == 'R001'
    assert flag['severity'] == 'CRITICAL'

    row_normal = pd.Series({'project_id': 2, 'expenditure_ratio': 0.95, 'expenditure_amt': 95000, 'allocated_amount': 100000})
    assert check_r001_cost_overrun(row_normal) is None


def test_rule_r004_unsanctioned_expenditure():
    row_unsanctioned = pd.Series({'project_id': 3, 'is_unsanctioned': True, 'expenditure_amt': 50000, 'work_status': 'UNSANCTIONED'})
    flag = check_r004_expenditure_unsanctioned(row_unsanctioned)
    assert flag is not None
    assert flag['rule_id'] == 'R004'


def test_risk_score_bounds():
    df = pd.DataFrame([
        {
            'project_id': 1,
            'financial_risk_score': 100.0,
            'delay_risk_score': 80.0,
            'expenditure_risk_score': 90.0,
            'duplicate_risk_score': 50.0,
            'peer_deviation_score': 60.0,
            'ml_anomaly_score': 70.0,
        },
        {
            'project_id': 2,
            'financial_risk_score': 0.0,
            'delay_risk_score': 0.0,
            'expenditure_risk_score': 0.0,
            'duplicate_risk_score': 0.0,
            'peer_deviation_score': 0.0,
            'ml_anomaly_score': 0.0,
        }
    ])
    res = compute_overall_risk_score(df)
    assert 0 <= res['overall_risk_score'].iloc[0] <= 100
    assert res['overall_risk_score'].iloc[1] == 0.0
    assert res['risk_band'].iloc[0] in ['HIGH', 'CRITICAL']
    assert res['risk_band'].iloc[1] == 'LOW'
