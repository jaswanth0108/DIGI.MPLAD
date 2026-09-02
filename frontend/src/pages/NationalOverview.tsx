import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BrainCircuit,
  FilePlus2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../api';
import type { NationalOverviewData, ProjectSummary } from '../types';
import { RiskBadge } from '../components/RiskBadge';

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#f59e0b',
  LOW: '#22c55e',
};

export const NationalOverview: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<NationalOverviewData | null>(null);
  const [highRisk, setHighRisk] = useState<ProjectSummary[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [overviewRes, highRiskRes, trendsRes] = await Promise.all([
          api.getOverview(),
          api.getHighRisk(8),
          api.getTrends().catch(() => ({ trends: [] })),
        ]);
        setData(overviewRes);
        setHighRisk(highRiskRes.projects || []);
        setTrends(trendsRes.trends || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load national data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--risk-critical)', marginBottom: '0.5rem' }}>Connection Notice</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry Loading
        </button>
      </div>
    );
  }

  const pieData = Object.entries(data.risk_distribution || {}).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>National MPLADS Audit Dashboard</h1>
          <div className="page-desc">
            18th Lok Sabha & Rajya Sabha Real-Time Anomaly Prioritization & Fund Surveillance
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="risk-badge low">eSAKSHI LIVE SYNCED</span>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Data as of: {new Date(data.data_as_of).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-tile" style={{ '--tile-accent': 'var(--accent-blue)' } as React.CSSProperties}>
          <div className="kpi-label">Total Allocated Limit</div>
          <div className="kpi-value">₹{data.total_allocated_crore.toLocaleString()} Cr</div>
          <div className="kpi-detail">Across {data.total_states} States & {data.total_constituencies} Constituencies</div>
        </div>

        <div className="kpi-tile" style={{ '--tile-accent': 'var(--accent-teal)' } as React.CSSProperties}>
          <div className="kpi-label">Recorded Expenditure</div>
          <div className="kpi-value">₹{data.total_expenditure_crore.toLocaleString()} Cr</div>
          <div className="kpi-detail">Fund Utilization: <strong>{data.fund_utilization_pct}%</strong></div>
        </div>

        <div className="kpi-tile" style={{ '--tile-accent': 'var(--risk-critical)' } as React.CSSProperties}>
          <div className="kpi-label">Critical / High Risk Cases</div>
          <div className="kpi-value" style={{ color: 'var(--risk-critical)' }}>
            {(data.critical_risk_projects + data.high_risk_projects).toLocaleString()}
          </div>
          <div className="kpi-detail">Requiring Human Verification</div>
        </div>

        <div className="kpi-tile" style={{ '--tile-accent': 'var(--risk-moderate)' } as React.CSSProperties}>
          <div className="kpi-label">Delayed & Stalled Works</div>
          <div className="kpi-value">{data.overdue_projects.toLocaleString()}</div>
          <div className="kpi-detail">Exceeding 365 days sanctioned baseline</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: '0.2rem' }}>
            Government Sanctions vs Actual Spending (Every 3-Month Quarter)
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Comparing approved project budget against actual money spent on ground every 3 months
          </div>
          <div style={{ height: 260 }}>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="display_label"
                    stroke="var(--text-muted)"
                    fontSize={10}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div
                            style={{
                              backgroundColor: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: 8,
                              padding: '0.75rem 1rem',
                              fontSize: '0.8rem',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            }}
                          >
                            <div style={{ fontWeight: 800, color: 'var(--text-accent)', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.25rem' }}>
                              {d.full_period || d.display_label || label}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#38bdf8', margin: '0.2rem 0' }}>
                              <span>Approved Budget:</span>
                              <strong>₹{d.amount_recommended_crore} Cr</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#14b8a6', margin: '0.2rem 0' }}>
                              <span>Actual Money Spent:</span>
                              <strong>₹{d.amount_expended_crore} Cr</strong>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                              Works Approved in Period: {d.projects_recommended}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount_recommended_crore" name="Approved Budget (₹ Cr)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="amount_expended_crore" name="Actual Money Spent (₹ Cr)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Trend timeline compiling...
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">National Risk Distribution</div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={RISK_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                  }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Priority Audit Cases Queue */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div className="card-title" style={{ marginBottom: '0.2rem' }}>Priority Investigation Queue</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Top anomalous projects flagged by hybrid multi-layer detection
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/high-risk')}>
            <span>View Full Audit Queue</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>State / Constituency</th>
                <th>Hon'ble MP</th>
                <th>Allocated Amount</th>
                <th>Expenditure</th>
                <th>Work Status</th>
                <th>Risk Band</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {highRisk.map((p) => (
                <tr key={p.project_id}>
                  <td><strong>#{p.project_id}</strong></td>
                  <td>
                    <div>{p.state_name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.constituency_name}</div>
                  </td>
                  <td>{p.mp_name}</td>
                  <td className="amount">₹{(p.allocated_amount || 0).toLocaleString()}</td>
                  <td className="amount">{p.expenditure_amt ? `₹${p.expenditure_amt.toLocaleString()}` : '-'}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                      {p.work_status?.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <RiskBadge band={p.risk_band} score={p.overall_risk_score} />
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => navigate(`/projects/${p.project_id}`)}
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* How It Works Action Banner */}
        <div
          className="card"
          style={{
            border: '1px solid rgba(56, 189, 248, 0.3)',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <BrainCircuit size={20} color="var(--accent-blue)" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>How Digi.MPLAD Works</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              Explore the 6-stage detection flowchart, Isolation Forest ML models, SHAP explainability, and 11 statutory CAG audit rules (R001–R011).
            </div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={() => navigate('/how-it-works')} style={{ width: '100%', justifyContent: 'center' }}>
              <span>View Architecture & Detection Flowchart</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Officer Ingestion Portal Banner */}
        <div
          className="card"
          style={{
            border: '1px solid rgba(34, 197, 94, 0.3)',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(20, 35, 45, 0.8))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <FilePlus2 size={20} color="var(--accent-teal)" />
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Officer Ingestion Gateway</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
              Restricted government officer gateway for official project registration, credentials verification, and live AI audit pre-screening.
            </div>
          </div>
          <div>
            <button className="btn btn-ghost" onClick={() => navigate('/officer-portal')} style={{ width: '100%', justifyContent: 'center', borderColor: 'rgba(34, 197, 94, 0.3)', color: 'var(--accent-teal)' }}>
              <span>Enter Authorized Officer Portal</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Statutory Disclaimer */}
      <div className="disclaimer" style={{ marginTop: '1.5rem' }}>
        <strong>Auditor Advisory:</strong> Flags generated by the Isolation Forest ML model and rule engines are indicators of statistical divergence and risk patterns. They do NOT constitute formal verdicts of fraud. Physical site verification and scrutiny of MB (Measurement Books) and Sanction Orders are mandatory before any administrative action.
      </div>
    </div>
  );
};
