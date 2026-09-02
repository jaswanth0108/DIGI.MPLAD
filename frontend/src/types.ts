export interface ProjectSummary {
  project_id: number;
  house_type?: string;
  state_name?: string;
  constituency_name?: string;
  mp_name?: string;
  city_name?: string;
  ida_name?: string;
  location_type?: string;
  category?: string;
  work_description?: string;
  allocated_amount?: number;
  expenditure_amt?: number;
  recommended_date?: string;
  work_status?: string;
  dataset_source?: string;
  expenditure_ratio?: number;
  project_age_days?: number;
  is_completed?: boolean;
  is_ongoing?: boolean;
  is_overdue?: boolean;
  overall_risk_score?: number;
  risk_band?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface AnomalyResult {
  result_id?: number;
  project_id: number;
  detection_type: string;
  rule_name: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  score_contribution: number;
  explanation: string;
  evidence_json?: any;
  detected_at?: string;
}

export interface ProjectDetail extends ProjectSummary {
  tenure_name?: string;
  block_name?: string;
  village_name?: string;
  available_limit?: number;
  actual_end_date?: string;
  letter_no?: string;
  cost_variance_pct?: number;
  days_to_complete?: number;
  is_unsanctioned?: boolean;
  is_stalled?: boolean;
  district_median_amount?: number;
  state_median_amount?: number;
  amount_vs_district_pct?: number;
  amount_vs_state_pct?: number;
  mp_project_count?: number;
  constituency_project_count?: number;
  financial_risk_score?: number;
  delay_risk_score?: number;
  expenditure_risk_score?: number;
  duplicate_risk_score?: number;
  peer_deviation_score?: number;
  ml_anomaly_score?: number;
  risk_flags?: any[];
  anomalies?: AnomalyResult[];
  category?: string;
  work_description?: string;
}

export interface RiskExplanation {
  project_id: number;
  overall_risk_score: number;
  risk_band: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  score_breakdown: {
    financial?: number;
    delay?: number;
    expenditure?: number;
    duplicate?: number;
    peer_deviation?: number;
    ml_anomaly?: number;
  };
  anomalies: any[];
  narrative: string;
  disclaimer: string;
}

export interface NationalOverviewData {
  total_projects: number;
  total_allocated_crore: number;
  total_expenditure_crore: number;
  total_completed: number;
  total_ongoing: number;
  total_unsanctioned: number;
  fund_utilization_pct: number;
  high_risk_projects: number;
  critical_risk_projects: number;
  risk_distribution: Record<string, number>;
  avg_risk_score: number;
  total_states: number;
  total_constituencies: number;
  total_mps: number;
  overdue_projects: number;
  stalled_projects: number;
  data_as_of: string;
  data_disclaimer: string;
}

export interface StateSummary {
  state_name: string;
  total_projects: number;
  total_allocated_crore: number;
  total_expenditure_crore: number;
  fund_utilization_pct: number;
  high_risk_count: number;
  critical_risk_count: number;
  avg_risk_score: number;
  delayed_projects: number;
  completed_pct: number;
}

export interface AuditCaseData {
  project_id: number;
  priority: string;
  summary: string;
  anomalies: Array<{
    rule?: string;
    severity?: string;
    explanation?: string;
    action_advice?: string;
  }>;
  evidence?: any;
  recommended_action: string;
  disclaimer: string;
}
