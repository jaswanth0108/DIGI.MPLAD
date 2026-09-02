import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Database, CheckCircle, AlertTriangle, Clock, Play, PlusCircle, ShieldAlert, ArrowRight, Zap } from 'lucide-react';
import { api } from '../api';
import { RiskBadge } from '../components/RiskBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RefreshStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  projects_loaded?: number;
  started_at?: string;
  finished_at?: string;
}

const PRESET_SCENARIOS = [
  {
    label: '🚨 Cost Overrun Anomaly',
    desc: 'Expenditure exceeds allocation by 40%',
    data: {
      state_name: 'UTTAR PRADESH',
      constituency_name: 'AGRA',
      mp_name: 'MP AGRA 1',
      allocated_amount: 5000000,
      expenditure_amt: 7000000,
      work_status: 'Completed',
      location_type: 'Rural',
      recommended_date: '2023-05-10',
    },
  },
  {
    label: '⚠️ Unsanctioned Spending',
    desc: 'Expenditure on unapproved work',
    data: {
      state_name: 'MAHARASHTRA',
      constituency_name: 'PUNE',
      mp_name: 'HONBLE MP PUNE',
      allocated_amount: 3000000,
      expenditure_amt: 1500000,
      work_status: 'Unsanctioned',
      location_type: 'Urban',
      recommended_date: '2024-01-15',
    },
  },
  {
    label: '⏳ Stalled / Overdue Work',
    desc: 'Active 2+ years with <5% spending',
    data: {
      state_name: 'BIHAR',
      constituency_name: 'PATNA SAHIB',
      mp_name: 'HONBLE MP PATNA',
      allocated_amount: 8000000,
      expenditure_amt: 200000,
      work_status: 'On Going',
      location_type: 'Rural',
      recommended_date: '2022-04-01',
    },
  },
  {
    label: '✅ Clean / Low Risk Work',
    desc: 'Normal completed work within budget',
    data: {
      state_name: 'TAMIL NADU',
      constituency_name: 'CHENNAI SOUTH',
      mp_name: 'HONBLE MP CHENNAI',
      allocated_amount: 2500000,
      expenditure_amt: 2400000,
      work_status: 'Completed',
      location_type: 'Urban',
      recommended_date: '2023-09-01',
    },
  },
];

export const LiveRefresh: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<RefreshStatus>({ status: 'idle', message: '' });
  const [pipelineMode, setPipelineMode] = useState<'demo' | 'live'>('demo');

  // Interactive submission state
  const [formData, setFormData] = useState({
    state_name: 'UTTAR PRADESH',
    constituency_name: 'AGRA',
    mp_name: 'MP AGRA 1',
    allocated_amount: 4500000,
    expenditure_amt: 0,
    work_status: 'On Going',
    location_type: 'Rural',
    recommended_date: new Date().toISOString().split('T')[0],
    letter_no: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleReload = async () => {
    try {
      setStatus({ status: 'running', message: 'Reloading processed data into API server…', started_at: new Date().toISOString() });
      const res = await fetch(`${API_BASE}/api/data/reload`);
      const data = await res.json();
      if (res.ok) {
        setStatus({
          status: 'success',
          message: `Data reloaded successfully. ${data.projects_loaded} projects now active in the audit engine.`,
          projects_loaded: data.projects_loaded,
          finished_at: new Date().toISOString(),
        });
      } else {
        setStatus({ status: 'error', message: data.detail || 'Reload failed.' });
      }
    } catch (err: any) {
      setStatus({ status: 'error', message: err.message || 'Could not connect to API server.' });
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    try {
      const res = await api.submitProject(formData);
      setSubmitResult(res);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit project');
    } finally {
      setSubmitting(false);
    }
  };

  const loadScenario = (preset: typeof PRESET_SCENARIOS[0]) => {
    setFormData((prev) => ({
      ...prev,
      ...preset.data,
      letter_no: `DEMO-${preset.data.constituency_name.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
    }));
    setSubmitResult(null);
    setSubmitError(null);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Live Data Ingestion & Real-Time Fraud Assessment</h1>
        <div className="page-desc">
          How new MPLADS project data is ingested, audited in real-time, and hot-swapped into the detection engine
        </div>
      </div>

      {/* Interactive Fraud Detection Sandbox */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <PlusCircle size={20} color="var(--accent-blue)" />
            <span>Interactive Project Ingestion & Instant Fraud Scorer</span>
          </div>
          <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', padding: '0.2rem 0.6rem', borderRadius: 4, fontWeight: 700 }}>
            REAL-TIME SCORING
          </span>
        </div>

        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1rem' }}>
          Enter new project details below to run instant anomaly detection (11 deterministic rules + peer statistical comparison).
          Once submitted, the record is immediately scored and inserted into the active dashboard portfolio!
        </div>

        {/* Quick presets */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Zap size={13} style={{ display: 'inline', marginRight: 4 }} />
            Quick Test Scenarios (Click to Load):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {PRESET_SCENARIOS.map((scenario) => (
              <button
                key={scenario.label}
                type="button"
                className="btn btn-ghost"
                onClick={() => loadScenario(scenario)}
                style={{
                  textAlign: 'left',
                  padding: '0.6rem 0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{scenario.label}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{scenario.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleProjectSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              State Name *
            </label>
            <input
              type="text"
              className="search-input"
              value={formData.state_name}
              onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Constituency Name *
            </label>
            <input
              type="text"
              className="search-input"
              value={formData.constituency_name}
              onChange={(e) => setFormData({ ...formData, constituency_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Hon'ble MP Name *
            </label>
            <input
              type="text"
              className="search-input"
              value={formData.mp_name}
              onChange={(e) => setFormData({ ...formData, mp_name: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Allocated Amount (₹) *
            </label>
            <input
              type="number"
              className="search-input"
              value={formData.allocated_amount}
              onChange={(e) => setFormData({ ...formData, allocated_amount: parseFloat(e.target.value) || 0 })}
              required
              min="1000"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Expenditure Amount (₹)
            </label>
            <input
              type="number"
              className="search-input"
              value={formData.expenditure_amt}
              onChange={(e) => setFormData({ ...formData, expenditure_amt: parseFloat(e.target.value) || 0 })}
              min="0"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Work Status *
            </label>
            <select
              className="search-input"
              value={formData.work_status}
              onChange={(e) => setFormData({ ...formData, work_status: e.target.value })}
            >
              <option value="On Going">On Going</option>
              <option value="Completed">Completed</option>
              <option value="Unsanctioned">Unsanctioned</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Recommended Date
            </label>
            <input
              type="date"
              className="search-input"
              value={formData.recommended_date}
              onChange={(e) => setFormData({ ...formData, recommended_date: e.target.value })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              Sanction Letter No
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="e.g. MPLADS/AGR/2024/09"
              value={formData.letter_no}
              onChange={(e) => setFormData({ ...formData, letter_no: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ fontSize: '0.9rem', padding: '0.65rem 1.75rem' }}
            >
              {submitting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldAlert size={16} />}
              <span>{submitting ? 'Running Anomaly & Fraud Engine…' : 'Assess Risk & Ingest Project'}</span>
            </button>
          </div>
        </form>

        {/* Submit feedback */}
        {submitError && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
            <strong>Error:</strong> {submitError}
          </div>
        )}

        {submitResult && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1.25rem',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>NEW INGESTED RECORD</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.1rem 0' }}>
                  Project #{submitResult.project.project_id} — {submitResult.project.mp_name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {submitResult.project.state_name} • {submitResult.project.constituency_name}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ASSESSED RISK SCORE</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: submitResult.overall_risk_score >= 50 ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                    {submitResult.overall_risk_score} / 100
                  </div>
                </div>
                <RiskBadge band={submitResult.risk_band} score={submitResult.overall_risk_score} />
              </div>
            </div>

            {submitResult.anomalies_detected && submitResult.anomalies_detected.length > 0 ? (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--risk-critical)', marginBottom: '0.4rem' }}>
                  🚨 Triggered Fraud / Risk Indicators ({submitResult.anomalies_detected.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {submitResult.anomalies_detected.map((a: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <strong>{a.rule_name}</strong> ({a.severity}) — {a.explanation}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(34, 197, 94, 0.08)', color: '#22c55e', fontSize: '0.82rem' }}>
                ✓ No deterministic rule violations triggered. Work adheres to standard MPLADS guidelines.
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
                onClick={() => navigate(`/projects/${submitResult.project.project_id}`)}
              >
                <span>Open Project Audit Dossier</span>
                <ArrowRight size={14} />
              </button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Record is now permanently active in portfolio, search, and MP analytics.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">How Data Ingestion & Anomaly Detection Operates</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
          {[
            { step: '1', label: 'Portal Fetch / Input', detail: 'ETL pulls from eSAKSHI endpoints or ingests direct input', icon: <Database size={18} /> },
            { step: '2', label: 'Validate', detail: 'Auto-validator checks schema, nulls, date anomalies, duplicate rates', icon: <CheckCircle size={18} /> },
            { step: '3', label: 'Clean & Merge', detail: 'Normalizer standardizes MP names, merges datasets by composite key', icon: <RefreshCw size={18} /> },
            { step: '4', label: 'ML & Rules', detail: 'Isolation Forest + 11 deterministic rules score each project', icon: <AlertTriangle size={18} /> },
            { step: '5', label: 'API Reload', detail: 'Scored dataset is hot-swapped into memory with zero downtime', icon: <Play size={18} /> },
          ].map((s) => (
            <div
              key={s.step}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ color: 'var(--accent-blue)', marginBottom: '0.5rem' }}>{s.icon}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                STEP {s.step}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>{s.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Pipeline */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">Batch Pipeline Execution (Full Ingestion)</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
          Execute the full end-to-end pipeline to fetch all national data from the official portal or regenerate 5,000 synthetic demo projects.
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Data Source:</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="mode"
              checked={pipelineMode === 'demo'}
              onChange={() => setPipelineMode('demo')}
            />
            <span>Synthetic Demo Data (5,000 projects — works offline)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="mode"
              checked={pipelineMode === 'live'}
              onChange={() => setPipelineMode('live')}
            />
            <span>Live eSAKSHI Portal (requires internet access)</span>
          </label>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: '#a3e635',
            marginBottom: '1rem',
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.3rem' }}># Run this in your terminal:</div>
          <div>{`cd mplads-monitor`}</div>
          <div>{`python -m backend.etl.pipeline${pipelineMode === 'demo' ? ' --demo' : ''}`}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {pipelineMode === 'demo'
              ? '# Generates 5,000 synthetic projects spanning 16 states'
              : '# Fetches live from https://mplads.mospi.gov.in — requires active internet'}
          </div>
        </div>
      </div>

      {/* Hot Reload API */}
      <div className="card">
        <div className="card-title">Hot Reload In-Memory Dataset</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
          Reload processed data from <code>data/processed/master_projects_latest.json</code> into the running API server with zero downtime.
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <button
            id="reload-data-btn"
            className="btn btn-primary"
            onClick={handleReload}
            disabled={status.status === 'running'}
            style={{ fontSize: '0.9rem', padding: '0.6rem 1.5rem' }}
          >
            {status.status === 'running'
              ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              : <RefreshCw size={16} />}
            <span>{status.status === 'running' ? 'Reloading…' : 'Reload Dataset Now'}</span>
          </button>

          {status.started_at && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={13} /> Started {new Date(status.started_at).toLocaleTimeString()}
            </span>
          )}
        </div>

        {status.status !== 'idle' && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 8,
              border: `1px solid ${
                status.status === 'success' ? 'rgba(34, 197, 94, 0.3)'
                : status.status === 'error' ? 'rgba(239, 68, 68, 0.3)'
                : 'rgba(56, 189, 248, 0.3)'
              }`,
              background: `${
                status.status === 'success' ? 'rgba(34, 197, 94, 0.05)'
                : status.status === 'error' ? 'rgba(239, 68, 68, 0.05)'
                : 'rgba(56, 189, 248, 0.05)'
              }`,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.7rem',
            }}
          >
            {status.status === 'success' && <CheckCircle size={18} color="#22c55e" />}
            {status.status === 'error' && <AlertTriangle size={18} color="#ef4444" />}
            {status.status === 'running' && <RefreshCw size={18} color="#38bdf8" style={{ animation: 'spin 1s linear infinite' }} />}
            <div>
              <div style={{ fontWeight: 600 }}>{status.message}</div>
              {status.projects_loaded && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  All dashboards, risk scores, and audit queues are up to date.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

