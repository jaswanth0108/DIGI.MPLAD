import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
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
          <div className="card-title">Quarterly Sanction & Expenditure Trends (₹ Crores)</div>
          <div style={{ height: 260 }}>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="period" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                    }}
                  />
                  <Bar dataKey="amount_recommended_crore" name="Recommended (₹ Cr)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="amount_expended_crore" name="Expended (₹ Cr)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
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

      {/* Priority Audit Cases */}
      <div className="card">
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

      {/* Statutory Disclaimer */}
      <div className="disclaimer" style={{ marginTop: '1.5rem' }}>
        <strong>Auditor Advisory:</strong> Flags generated by the Isolation Forest ML model and rule engines are indicators of statistical divergence and risk patterns. They do NOT constitute formal verdicts of fraud. Physical site verification and scrutiny of MB (Measurement Books) and Sanction Orders are mandatory.
      </div>
    </div>
  );
};
