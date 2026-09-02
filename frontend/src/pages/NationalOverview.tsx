import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Database,
  Layers,
  GitBranch,
  Cpu,
  CheckCircle2,
  Compass,
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

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* HOW IT WORKS SECTION (Comprehensive Architecture, ML & Detection Process) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid rgba(56, 189, 248, 0.3)', background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <BrainCircuit size={26} color="var(--accent-blue)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>
            How Digi.MPLAD Works: Multi-Tier AI Audit & Anomaly Surveillance
          </h2>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '1.75rem' }}>
          Digi.MPLAD automates oversight across 100% of MPLADS projects using an end-to-end pipeline that combines deterministic CAG compliance rules, spatial peer deviation, and unsupervised machine learning.
        </div>

        {/* 1. Step-by-Step Detection Process Flowchart */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-teal)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitBranch size={18} />
            <span>Detection Process Flowchart (6-Stage Pipeline)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {[
              {
                step: '01',
                title: 'Data Ingestion',
                icon: <Database size={20} color="var(--accent-blue)" />,
                desc: 'Pulls 8 MoSPI eSAKSHI endpoints (Ongoing, Completed, Unsanctioned, Limits, Calamity) or handles direct Officer Ingestion.',
              },
              {
                step: '02',
                title: 'Feature Extraction',
                icon: <Layers size={20} color="var(--accent-teal)" />,
                desc: 'Computes cost variance %, expenditure velocity, project age days, overdue flags, and district/state median baselines.',
              },
              {
                step: '03',
                title: 'Deterministic Rules',
                icon: <ShieldCheck size={20} color="#f59e0b" />,
                desc: 'Evaluates 11 CAG & MoSPI rules (R001-R011) to catch cost overruns, unsanctioned spending, and chronic delays.',
              },
              {
                step: '04',
                title: 'Isolation Forest ML',
                icon: <Cpu size={20} color="#38bdf8" />,
                desc: 'Unsupervised ML model (200 trees) isolates multivariate anomalies across a standardized 6-dimensional feature space.',
              },
              {
                step: '05',
                title: 'Peer & Duplicate Check',
                icon: <Compass size={20} color="#a855f7" />,
                desc: 'Quantifies deviation against district (60%) & state (40%) peer medians, and detects candidate duplicate works.',
              },
              {
                step: '06',
                title: 'Composite Scoring',
                icon: <CheckCircle2 size={20} color="#22c55e" />,
                desc: 'Calculates calibrated 0-100 risk score, assigns risk band (Low, Moderate, High, Critical), and ranks audit queue.',
              },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>{s.icon}</div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    STAGE {s.step}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Machine Learning Models & Statistical Architecture */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-teal)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} />
            <span>Machine Learning & Explainability Engine</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-blue)', marginBottom: '0.4rem' }}>
                1. Isolation Forest (scikit-learn)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                • <strong>Role:</strong> Unsupervised outlier isolation without requiring labeled fraud data.<br />
                • <strong>Hyperparameters:</strong> 200 Isolation Trees, contamination = 5%, max_samples = 'auto'.<br />
                • <strong>Feature Vector:</strong> log(allocated_amount), expenditure_ratio, project_age_days, amount_vs_district_pct, amount_vs_state_pct, mp_project_count.
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-teal)', marginBottom: '0.4rem' }}>
                2. SHAP Explainability (TreeExplainer)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                • <strong>Role:</strong> Provides local feature attribution for every flagged anomaly.<br />
                • <strong>Auditor Transparency:</strong> Deconstructs the ML anomaly score into top-3 feature contributors, explaining exactly <em>why</em> a project was flagged.
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#a855f7', marginBottom: '0.4rem' }}>
                3. Delay Prediction Engine (XGBoost)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                • <strong>Role:</strong> Estimates project completion timelines and forecasts execution delays.<br />
                • <strong>Signals:</strong> Historical IDA speed, seasonal weather patterns, and category-level delivery durations.
              </div>
            </div>
          </div>
        </div>

        {/* 3. Fraud Detection Risk Constraints & Rules Reference */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-teal)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} />
            <span>Core Risk Factors & Rule Constraints (R001–R011)</span>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Rule Code</th>
                  <th>Risk Condition</th>
                  <th>Severity</th>
                  <th>Score Impact</th>
                  <th>Audit Rationale</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>R001</strong></td>
                  <td>Expenditure &gt; Allocated Amount</td>
                  <td><span className="risk-badge critical">CRITICAL</span></td>
                  <td>+80 pts</td>
                  <td>Unauthorized cost overrun without sanctioned revision</td>
                </tr>
                <tr>
                  <td><strong>R002</strong></td>
                  <td>Project Age &gt; 730 days (&gt;2 yrs) &amp; Incomplete</td>
                  <td><span className="risk-badge high">HIGH</span></td>
                  <td>+55 pts</td>
                  <td>Chronic project delay exceeding statutory delivery limits</td>
                </tr>
                <tr>
                  <td><strong>R003</strong></td>
                  <td>Ongoing Project Age &gt; 365 days</td>
                  <td><span className="risk-badge moderate">MODERATE</span></td>
                  <td>+30 pts</td>
                  <td>Work in progress exceeding the 1-year delivery guideline</td>
                </tr>
                <tr>
                  <td><strong>R004</strong></td>
                  <td>Unsanctioned Work &amp; Expenditure &gt; 0</td>
                  <td><span className="risk-badge critical">CRITICAL</span></td>
                  <td>+65 pts</td>
                  <td>Disbursement made prior to formal administrative approval</td>
                </tr>
                <tr>
                  <td><strong>R005</strong></td>
                  <td>Allocated &gt; 3.0× Constituency Median</td>
                  <td><span className="risk-badge high">HIGH</span></td>
                  <td>+50 pts</td>
                  <td>Anomalous high-value allocation compared to local peer works</td>
                </tr>
                <tr>
                  <td><strong>R006</strong></td>
                  <td>Allocated &gt; 2.5× State Median</td>
                  <td><span className="risk-badge moderate">MODERATE</span></td>
                  <td>+30 pts</td>
                  <td>Macro-level state allocation outlier</td>
                </tr>
                <tr>
                  <td><strong>R008</strong></td>
                  <td>Stalled Funds (&lt;5% spent after 365 days)</td>
                  <td><span className="risk-badge moderate">MODERATE</span></td>
                  <td>+25 pts</td>
                  <td>Parked government funds without execution progress</td>
                </tr>
                <tr>
                  <td><strong>R009</strong></td>
                  <td>Candidate Duplicate Project Pair</td>
                  <td><span className="risk-badge high">HIGH</span></td>
                  <td>+50 pts</td>
                  <td>High similarity in location, amount, and recommendation window</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Complete Website Features Guide */}
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-teal)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} />
            <span>Platform Features Navigation Guide</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.75rem' }}>
            {[
              {
                name: 'National Overview',
                route: '/',
                desc: 'Executive KPIs on fund allocation (₹ Cr), total expenditure, fund utilization %, quarterly trends, and risk distribution.',
              },
              {
                name: 'High-Risk Priority Queue',
                route: '/high-risk',
                desc: 'Ranked triage list of flagged works with state, constituency, MP, and risk-score filtering for targeted field audits.',
              },
              {
                name: 'State Diagnostics',
                route: '/states',
                desc: 'State-by-state allocation comparison bar charts and constituency-level breakdown of stalled funds.',
              },
              {
                name: 'NL Query / Search',
                route: '/search',
                desc: 'Query projects using plain English (e.g. "Critical delayed projects in Andhra Pradesh") with safe parameterized filtering.',
              },
              {
                name: 'MP & Peer Analytics',
                route: '/mp-analytics',
                desc: 'Individual MP portfolio profiling: completion rates, fund utilization, overdue projects, and project directory.',
              },
              {
                name: 'Officer Ingestion Portal',
                route: '/officer-portal',
                desc: 'Restricted government gateway for official project registration, credential verification, and instant risk scoring.',
              },
              {
                name: 'Official Audit Docket',
                route: '/projects/1',
                desc: 'Exportable and print-ready Audit Investigation Cards with complete evidence trails, statutory notices, and signature blocks.',
              },
            ].map((f) => (
              <div
                key={f.name}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 8,
                  padding: '1rem',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--accent-blue)', marginBottom: '0.3rem' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {f.desc}
                </div>
              </div>
            ))}
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
