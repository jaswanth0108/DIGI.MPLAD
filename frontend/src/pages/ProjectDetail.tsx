import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api';
import type { ProjectDetail as IProjectDetail } from '../types';
import { RiskGauge } from '../components/RiskGauge';
import { RiskBadge } from '../components/RiskBadge';
import { ScoreBreakdown } from '../components/ScoreBreakdown';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<IProjectDetail | null>(null);
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        const [projRes, explRes] = await Promise.all([
          api.getProjectDetail(id!),
          api.getProjectExplanation(id!),
        ]);
        setProject(projRes);
        setExplanation(explRes);
      } catch (err: any) {
        setError(err.message || 'Failed to load project details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Project #{id} Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/high-risk')}>
          Back to Audit Queue
        </button>
      </div>
    );
  }

  const scores = {
    financial: project.financial_risk_score,
    delay: project.delay_risk_score,
    expenditure: project.expenditure_risk_score,
    duplicate: project.duplicate_risk_score,
    peer_deviation: project.peer_deviation_score,
    ml_anomaly: project.ml_anomaly_score,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/audit-case/${project.project_id}`)}
          >
            <FileText size={16} />
            <span>Generate Official Audit Case</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Project #{project.project_id}</h1>
            <RiskBadge band={project.risk_band} score={project.overall_risk_score} />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            {project.state_name} • {project.constituency_name} {project.city_name ? `• ${project.city_name}` : ''}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>WORK STATUS</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
            {project.work_status}
          </div>
        </div>
      </div>

      {/* Grid of details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Risk Score & Gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="card-title" style={{ alignSelf: 'flex-start' }}>Overall Composite Risk</div>
          <div style={{ margin: '1rem 0' }}>
            <RiskGauge score={project.overall_risk_score || 0} size={150} />
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 280 }}>
            Weighted assessment combining deterministic rules, spatial peer deviation, and unsupervised Isolation Forest ML.
          </div>
        </div>

        {/* Multi-Factor Contribution */}
        <div className="card">
          <div className="card-title">Risk Component Breakdown</div>
          <div style={{ marginTop: '0.5rem' }}>
            <ScoreBreakdown scores={scores} />
          </div>
        </div>
      </div>

      {/* Project Financials & Metadata */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">Scheme & Financial Metadata</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>HON'BLE MP</div>
            <div style={{ fontWeight: 600 }}>{project.mp_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>IMPLEMENTING AUTHORITY (IDA)</div>
            <div style={{ fontWeight: 600 }}>{project.ida_name || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ALLOCATED AMOUNT</div>
            <div className="amount" style={{ fontSize: '1.1rem' }}>
              ₹{(project.allocated_amount || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RECORDED EXPENDITURE</div>
            <div className="amount" style={{ fontSize: '1.1rem' }}>
              {project.expenditure_amt ? `₹${project.expenditure_amt.toLocaleString()}` : 'None logged'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RECOMMENDATION DATE</div>
            <div style={{ fontWeight: 500 }}>{project.recommended_date || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PROJECT AGE</div>
            <div style={{ fontWeight: 500, color: project.is_overdue ? 'var(--risk-critical)' : 'inherit' }}>
              {project.project_age_days ? `${project.project_age_days} days` : 'N/A'}
              {project.is_overdue && ' (Overdue baseline)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DISTRICT PEER MEDIAN</div>
            <div className="amount">
              ₹{(project.district_median_amount || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PEER DEVIATION</div>
            <div style={{ fontWeight: 600, color: (project.amount_vs_district_pct || 0) > 100 ? 'var(--risk-critical)' : 'inherit' }}>
              {project.amount_vs_district_pct ? `${Math.round(project.amount_vs_district_pct)}%` : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* Detected Anomalies / Evidence */}
      <div className="explanation-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="explanation-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} color="var(--risk-critical)" />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Specific Anomaly Findings & Evidence ({project.anomalies?.length || 0})
            </span>
          </div>
        </div>
        <div className="explanation-body">
          {project.anomalies && project.anomalies.length > 0 ? (
            project.anomalies.map((anom, idx) => (
              <div key={idx} className="explanation-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="rule-id">{anom.rule_name} • {anom.detection_type}</span>
                  <RiskBadge band={anom.severity} score={anom.score_contribution} />
                </div>
                <div className="rule-text">{anom.explanation}</div>
                {anom.evidence_json && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      marginTop: '0.4rem',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(anom.evidence_json, null, 2)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No discrete rule triggers. Score driven by baseline peer comparison.
            </div>
          )}
        </div>
      </div>

      {/* Human-Readable Risk Narrative */}
      {explanation && explanation.narrative && (
        <div className="card">
          <div className="card-title">Automated Auditor Briefing</div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              background: 'rgba(0,0,0,0.2)',
              padding: '1rem',
              borderRadius: 8,
            }}
          >
            {explanation.narrative}
          </pre>
        </div>
      )}
    </div>
  );
};
