import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Database,
  Layers,
  ShieldCheck,
  Cpu,
  Compass,
  CheckCircle2,
  GitBranch,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
          <BrainCircuit size={28} color="var(--accent-blue)" />
          <h1 style={{ margin: 0 }}>How Digi.MPLAD Works</h1>
        </div>
        <div className="page-desc">
          Architecture, Machine Learning Models, and Multi-Tier Anomaly Detection Lifecycle
        </div>
      </div>

      {/* Hero Overview */}
      <div
        className="card"
        style={{
          marginBottom: '2rem',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              NATIONAL DIGITAL SURVEILLANCE PLATFORM
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0.3rem 0 0.6rem' }}>
              Multi-Tier AI & Rule-Based Audit Surveillance for MPLADS
            </h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: 850, lineHeight: 1.6 }}>
              Digi.MPLAD monitors 100% of parliamentary constituency projects under the Members of Parliament Local Area Development Scheme.
              By integrating <strong>11 deterministic statutory audit rules</strong> with an <strong>unsupervised Isolation Forest machine learning model</strong>,
              the platform evaluates every project and assigns a composite <strong>0–100 Risk Score</strong>, allowing auditors to triage investigations effectively.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/high-risk')}
            style={{ padding: '0.65rem 1.25rem' }}
          >
            <span>Open Priority Audit Queue</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* 1. Detection Process Flowchart */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <GitBranch size={18} color="var(--accent-teal)" />
          <span>6-Stage Anomaly Detection Pipeline Flowchart</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.25rem' }}>
          The end-to-end data lifecycle from raw MoSPI eSAKSHI portal ingestion to final prioritized investigation cards.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {[
            {
              step: '01',
              title: 'Data Acquisition & Ingest',
              icon: <Database size={22} color="var(--accent-blue)" />,
              desc: 'Pulls 8 MoSPI eSAKSHI endpoints (Ongoing, Completed, Unsanctioned, Allocated Limits, Calamity) or receives verified Government Officer data.',
            },
            {
              step: '02',
              title: 'Validation & Engineering',
              icon: <Layers size={22} color="var(--accent-teal)" />,
              desc: 'Normalizes names and dates, computes financial ratios (expenditure ratio, cost variance %), age in days, and spatial peer medians.',
            },
            {
              step: '03',
              title: 'Deterministic Rule Engine',
              icon: <ShieldCheck size={22} color="#f59e0b" />,
              desc: 'Executes 11 statutory CAG rules (R001–R011) to detect unauthorized overruns, unsanctioned spending, and stalled works.',
            },
            {
              step: '04',
              title: 'Unsupervised Isolation Forest',
              icon: <Cpu size={22} color="#38bdf8" />,
              desc: 'Trains an ensemble of 200 Isolation Trees to uncover non-linear, multivariate outliers across 6 financial and temporal dimensions.',
            },
            {
              step: '05',
              title: 'Peer Deviation & Deduplication',
              icon: <Compass size={22} color="#a855f7" />,
              desc: 'Measures divergence against district medians (60% weight) and state medians (40% weight), and checks for duplicate project pairs.',
            },
            {
              step: '06',
              title: 'Composite Risk Scoring',
              icon: <CheckCircle2 size={22} color="#22c55e" />,
              desc: 'Combines all sub-scores into a final 0–100 score, assigns risk bands (LOW, MODERATE, HIGH, CRITICAL), and indexes the queue.',
            },
          ].map((s) => (
            <div
              key={s.step}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>{s.icon}</div>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  STAGE {s.step}
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {s.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Machine Learning Architecture */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={18} color="var(--accent-blue)" />
          <span>Machine Learning Models & Statistical Explainability</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.25rem' }}>
          Unsupervised learning ensures anomalies are detected even in the absence of pre-labeled historical fraud datasets.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-blue)', marginBottom: '0.4rem' }}>
              1. Isolation Forest (scikit-learn)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              • <strong>Role:</strong> Identifies statistical outliers by recursively partitioning feature space.<br />
              • <strong>Hyperparameters:</strong> <code>n_estimators = 200</code>, <code>contamination = 0.05 (5%)</code>, <code>max_samples = 'auto'</code>.<br />
              • <strong>Features (6D):</strong> <code>log(allocated_amount)</code>, <code>expenditure_ratio</code>, <code>project_age_days</code>, <code>amount_vs_district_pct</code>, <code>amount_vs_state_pct</code>, <code>mp_project_count</code>.
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-teal)', marginBottom: '0.4rem' }}>
              2. SHAP Explainability (TreeExplainer)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              • <strong>Role:</strong> Computes Shapley feature importance for every flagged anomalous project.<br />
              • <strong>Auditor Transparency:</strong> Deconstructs the ML anomaly score into top-3 contributing feature drivers, explaining the mathematical reasoning behind the flag.
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#a855f7', marginBottom: '0.4rem' }}>
              3. Delay Predictor (XGBoost / LightGBM)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              • <strong>Role:</strong> Forecasts completion timelines and identifies projects at risk of stalling.<br />
              • <strong>Signals:</strong> Historical Implementing District Authority (IDA) execution speed, category type, and disbursement velocity.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Statutory Rules Reference Table */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} color="#f59e0b" />
          <span>Core Statutory Risk Rules (R001–R011)</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.25rem' }}>
          Rule definitions codified from the CAG Audit Manual and MoSPI MPLADS Scheme Guidelines.
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rule Code</th>
                <th>Condition & Trigger</th>
                <th>Severity</th>
                <th>Score Impact</th>
                <th>Policy & Audit Rationale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>R001</strong></td>
                <td>Expenditure &gt; Allocated Amount</td>
                <td><span className="risk-badge critical">CRITICAL</span></td>
                <td>+80 pts</td>
                <td>Unauthorized cost overrun without sanctioned administrative revision</td>
              </tr>
              <tr>
                <td><strong>R002</strong></td>
                <td>Project Age &gt; 730 days (&gt;2 yrs) &amp; Incomplete</td>
                <td><span className="risk-badge high">HIGH</span></td>
                <td>+55 pts</td>
                <td>Chronic execution delay exceeding statutory scheme completion windows</td>
              </tr>
              <tr>
                <td><strong>R003</strong></td>
                <td>Ongoing Project Age &gt; 365 days</td>
                <td><span className="risk-badge moderate">MODERATE</span></td>
                <td>+30 pts</td>
                <td>Work in progress exceeding the standard 1-year delivery baseline</td>
              </tr>
              <tr>
                <td><strong>R004</strong></td>
                <td>Unsanctioned Work with Recorded Expenditure</td>
                <td><span className="risk-badge critical">CRITICAL</span></td>
                <td>+65 pts</td>
                <td>Disbursement logged against works that have not received administrative sanction</td>
              </tr>
              <tr>
                <td><strong>R005</strong></td>
                <td>Allocated &gt; 3.0× Constituency Median</td>
                <td><span className="risk-badge high">HIGH</span></td>
                <td>+50 pts</td>
                <td>High-value anomaly relative to peer projects in the same district</td>
              </tr>
              <tr>
                <td><strong>R006</strong></td>
                <td>Allocated &gt; 2.5× State Median</td>
                <td><span className="risk-badge moderate">MODERATE</span></td>
                <td>+30 pts</td>
                <td>Macro-level state allocation outlier</td>
              </tr>
              <tr>
                <td><strong>R007</strong></td>
                <td>MP Project Count &gt; Mean + 2σ</td>
                <td><span className="risk-badge moderate">MODERATE</span></td>
                <td>+20 pts</td>
                <td>Severe project fragmentation across small low-impact allocations</td>
              </tr>
              <tr>
                <td><strong>R008</strong></td>
                <td>Stalled Funds (&lt;5% spent after 365 days)</td>
                <td><span className="risk-badge moderate">MODERATE</span></td>
                <td>+25 pts</td>
                <td>Parked public funds without corresponding on-ground execution</td>
              </tr>
              <tr>
                <td><strong>R009</strong></td>
                <td>Candidate Duplicate Work Pair</td>
                <td><span className="risk-badge high">HIGH</span></td>
                <td>+50 pts</td>
                <td>High similarity in location, work title, amount, and sanction timeframe</td>
              </tr>
              <tr>
                <td><strong>R011</strong></td>
                <td>Negative Available Entitlement Balance</td>
                <td><span className="risk-badge high">HIGH</span></td>
                <td>+60 pts</td>
                <td>Over-commitment of annual MP entitlement beyond sanctioned limit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Composite Risk Score Weighting */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--accent-teal)" />
          <span>Composite Risk Score Formulation</span>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem', lineHeight: 1.6 }}>
          The final composite risk score (0–100) is calculated via a normalized weighted sum of 6 independent analytical dimensions:
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '1rem 1.25rem',
            borderRadius: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: 'var(--text-accent)',
            marginBottom: '1rem',
          }}
        >
          Overall Risk = 0.25(Financial) + 0.20(Delay) + 0.20(Expenditure Velocity) + 0.15(Duplicate) + 0.10(Peer Deviation) + 0.10(ML Anomaly)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <div style={{ fontWeight: 800, color: 'var(--risk-low)' }}>LOW RISK</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score: 0 – 24</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Standard project execution</div>
          </div>
          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ fontWeight: 800, color: 'var(--risk-moderate)' }}>MODERATE RISK</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score: 25 – 49</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Minor delay or peer variance</div>
          </div>
          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
            <div style={{ fontWeight: 800, color: 'var(--risk-high)' }}>HIGH RISK</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score: 50 – 74</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Priority audit review queue</div>
          </div>
          <div style={{ padding: '0.75rem', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ fontWeight: 800, color: 'var(--risk-critical)' }}>CRITICAL RISK</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Score: 75 – 100</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Mandatory physical field verification</div>
          </div>
        </div>
      </div>

      {/* Statutory Notice */}
      <div className="disclaimer" style={{ marginTop: '1.5rem' }}>
        <strong>Auditor Advisory:</strong> Flags generated by the Isolation Forest ML model and rule engines are indicators of statistical divergence and risk patterns. They do NOT constitute formal verdicts of fraud. Physical site verification and scrutiny of MB (Measurement Books) and Sanction Orders are mandatory before any administrative action.
      </div>
    </div>
  );
};
