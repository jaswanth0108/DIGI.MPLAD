import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Info } from 'lucide-react';
import { api } from '../api';
import { RiskBadge } from '../components/RiskBadge';

// Constituency keywords that exist in the demo/synthetic dataset
const SAMPLE_SEARCHES = [
  'AGRA', 'ALIGARH', 'ADILABAD', 'AJMER', 'ALLAHABA',
  'ALATHUR', 'ALAPPUZH', 'AKBARPUR', 'AHMEDNAG', 'ALIPURDU',
];

export const MPAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [mpQuery, setMpQuery] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!mpQuery.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMPAnalytics(mpQuery);
      setAnalytics(res);
    } catch (err: any) {
      setError(err.message || 'MP not found');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Hon'ble MP Portfolio & Utilization Profiling</h1>
        <div className="page-desc">
          Constituency expenditure velocity, scheme distribution, and peer variance
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          style={{ display: 'flex', gap: '0.75rem' }}
        >
          <input
            type="text"
            className="search-input"
            placeholder="Search by MP name (e.g. 'HON\\'BLE MP', or partial name)"
            value={mpQuery}
            onChange={(e) => setMpQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Search size={16} />
            <span>{loading ? 'Analyzing...' : 'Search MP'}</span>
          </button>
        </form>
      </div>


      {error && (
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', padding: '1.1rem 1.25rem' }}>
          <div style={{ color: 'var(--risk-critical)', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={16} /> MP Not Found
          </div>
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            No MP record matched <strong style={{ color: 'var(--text-primary)' }}>"{mpQuery}"</strong> in the loaded dataset.
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <strong>Why this happens:</strong> In demo mode the dataset uses synthetic MP names formatted as{' '}
            <code style={{ background: 'rgba(255,255,255,0.07)', padding: '0 4px', borderRadius: 3 }}>MP &lt;CONSTITUENCY&gt; &lt;N&gt;</code>
            {' '}— e.g. <em>MP AGRA 1</em>, <em>MP ALIGARH 2</em>. Real MP names only appear after a live eSAKSHI fetch.
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <strong>Try a constituency keyword (click to search):</strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {SAMPLE_SEARCHES.map(s => (
              <button
                key={s}
                className="btn btn-ghost"
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => { setMpQuery(s); setError(null); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{analytics.mp_name}</h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {analytics.state} • {analytics.constituency}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AVERAGE RISK SCORE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent-blue)' }}>
                {analytics.avg_risk_score} / 100
              </div>
            </div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-tile">
              <div className="kpi-label">Recommended Works</div>
              <div className="kpi-value">{analytics.total_projects}</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Total Allocated</div>
              <div className="kpi-value">₹{analytics.total_allocated_crore} Cr</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Total Expended</div>
              <div className="kpi-value">₹{analytics.total_expenditure_crore} Cr</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Completion %</div>
              <div className="kpi-value">{analytics.completed_pct}%</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Highest Risk Projects Recommended by Member</div>
            <div className="data-table-wrapper" style={{ marginTop: '0.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Location</th>
                    <th>Allocated</th>
                    <th>Status</th>
                    <th>Risk Band</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.top_risk_projects || []).map((p: any) => (
                    <tr key={p.project_id}>
                      <td><strong>#{p.project_id}</strong></td>
                      <td>{p.state_name} • {p.constituency_name}</td>
                      <td className="amount">₹{(p.allocated_amount || 0).toLocaleString()}</td>
                      <td>{p.work_status}</td>
                      <td><RiskBadge band={p.risk_band} score={p.overall_risk_score} /></td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
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
        </div>
      )}
    </div>
  );
};
