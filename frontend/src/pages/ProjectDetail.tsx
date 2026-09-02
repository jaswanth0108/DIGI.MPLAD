import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  ShieldAlert,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
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
        setError(null);
        
        // 1. Fetch main project detail
        const projRes = await api.getProjectDetail(id!);
        setProject(projRes);

        // 2. Fetch explanation asynchronously with graceful fallback
        try {
          const explRes = await api.getProjectExplanation(id!);
          setExplanation(explRes);
        } catch (explErr) {
          console.warn('Could not load separate explanation payload, using embedded project metrics:', explErr);
          setExplanation({
            narrative: `Project #${projRes.project_id} in ${projRes.state_name} (${projRes.constituency_name}) has an assessed risk score of ${projRes.overall_risk_score}/100. Status: ${projRes.work_status}. Allocated: ₹${(projRes.allocated_amount || 0).toLocaleString()}. Recorded Expenditure: ₹${(projRes.expenditure_amt || 0).toLocaleString()}.`,
          });
        }
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
        <div style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Loading Project #{id} Inspection Dossier…
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', maxWidth: 600, margin: '2rem auto' }}>
        <div style={{ color: 'var(--risk-critical)', marginBottom: '1rem' }}>
          <AlertTriangle size={48} style={{ margin: '0 auto' }} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Project #{id} Not Loaded</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1rem 0', fontSize: '0.9rem' }}>
          {error || 'Unable to retrieve project details from the surveillance engine.'}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            <RotateCcw size={16} />
            <span>Retry Loading</span>
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/high-risk')}>
            <span>Back to Audit Queue</span>
          </button>
        </div>
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

  const utilization = project.allocated_amount && project.allocated_amount > 0
    ? Math.min(100, Math.round(((project.expenditure_amt || 0) / project.allocated_amount) * 100))
    : 0;

  return (
    <div>
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
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
            <span>Generate Official Audit Docket (PDF)</span>
          </button>
        </div>
      </div>

      {/* Header Banner Card */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0 }}>Project #{project.project_id}</h1>
            <RiskBadge band={project.risk_band} score={project.overall_risk_score} />
            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.6rem', borderRadius: 4, color: 'var(--text-secondary)' }}>
              {project.house_type === 'RAJYA' ? 'Rajya Sabha' : '18th Lok Sabha'}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <MapPin size={15} color="var(--accent-teal)" />
            <span>{project.state_name} • {project.constituency_name}</span>
            {project.city_name && <span>• {project.city_name}</span>}
            {project.location_type && <span style={{ color: 'var(--text-muted)' }}>({project.location_type})</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WORK STATUS</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-blue)', textTransform: 'capitalize' }}>
            {project.work_status}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Fund Utilization: <strong>{utilization}%</strong>
          </div>
        </div>
      </div>

      {/* Risk Gauge and Score Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Overall Risk Score */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="card-title" style={{ alignSelf: 'flex-start' }}>Overall Composite Risk</div>
          <div style={{ margin: '1rem 0' }}>
            <RiskGauge score={project.overall_risk_score || 0} size={150} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.4 }}>
            Multi-tier weighted score combining 11 CAG audit rules, spatial peer deviation, and unsupervised Isolation Forest ML.
          </div>
        </div>

        {/* 6-Factor Breakdown */}
        <div className="card">
          <div className="card-title">Risk Component Breakdown (0–100 Scale)</div>
          <div style={{ marginTop: '0.5rem' }}>
            <ScoreBreakdown scores={scores} />
          </div>
        </div>
      </div>

      {/* Scheme Metadata & Financial Parameters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={18} color="var(--accent-blue)" />
          <span>Scheme Administration & Financial Parameters</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>HON'BLE MEMBER OF PARLIAMENT</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.15rem' }}>{project.mp_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>IMPLEMENTING DISTRICT AUTHORITY (IDA)</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.15rem' }}>{project.ida_name || 'District Collectorate'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SANCTION LETTER / DOCKET REF</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {project.letter_no || `MPLADS/${project.constituency_name?.slice(0, 3)}/${project.project_id}`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RECOMMENDATION DATE</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.15rem' }}>
              {project.recommended_date || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SANCTIONED ALLOCATION</div>
            <div className="amount" style={{ fontSize: '1.2rem', color: 'var(--accent-blue)', marginTop: '0.15rem' }}>
              ₹{(project.allocated_amount || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RECORDED EXPENDITURE</div>
            <div className="amount" style={{ fontSize: '1.2rem', color: (project.expenditure_amt || 0) > (project.allocated_amount || 0) ? 'var(--risk-critical)' : 'var(--accent-teal)', marginTop: '0.15rem' }}>
              {project.expenditure_amt ? `₹${project.expenditure_amt.toLocaleString()}` : 'None logged (₹0)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>PROJECT AGE & STATUS</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: project.is_overdue ? 'var(--risk-critical)' : 'inherit', marginTop: '0.15rem' }}>
              {project.project_age_days ? `${project.project_age_days} days active` : 'Recent'}
              {project.is_overdue && ' (Overdue >365d)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CONSTITUENCY PEER MEDIAN</div>
            <div className="amount" style={{ fontSize: '1rem', marginTop: '0.15rem' }}>
              ₹{(project.district_median_amount || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Detected Anomalies / Evidence Findings */}
      <div className="explanation-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="explanation-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} color="var(--risk-critical)" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              Auditor Evidence Dossier & Rule Triggers ({project.anomalies?.length || 0})
            </span>
          </div>
        </div>
        <div className="explanation-body">
          {project.anomalies && project.anomalies.length > 0 ? (
            project.anomalies.map((anom, idx) => (
              <div key={idx} className="explanation-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span className="rule-id" style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                    {anom.rule_name} • {anom.detection_type}
                  </span>
                  <RiskBadge band={anom.severity} score={anom.score_contribution} />
                </div>
                <div className="rule-text" style={{ fontSize: '0.85rem' }}>{anom.explanation}</div>
                {anom.evidence_json && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      padding: '0.6rem 0.85rem',
                      borderRadius: 6,
                      fontSize: '0.75rem',
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
            <div style={{ color: 'var(--accent-teal)', fontSize: '0.85rem', padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} />
              <span>No deterministic rule violations detected. Risk score is driven by baseline spatial variance.</span>
            </div>
          )}
        </div>
      </div>

      {/* Automated Auditor Briefing Narrative */}
      {explanation && explanation.narrative && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-teal)" />
            <span>Automated Auditor Narrative Briefing</span>
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              background: 'rgba(0,0,0,0.25)',
              padding: '1.25rem',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {explanation.narrative}
          </pre>
        </div>
      )}
    </div>
  );
};
