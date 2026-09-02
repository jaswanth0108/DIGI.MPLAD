import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api';
import { RiskBadge } from '../components/RiskBadge';

export const MPAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [mpQuery, setMpQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [allMPs, setAllMPs] = useState<Array<{ mp_name: string; state: string; constituency: string; total_projects: number; avg_risk_score: number }>>([]);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load MP directory on mount
  useEffect(() => {
    async function loadMPDirectory() {
      try {
        setLoading(true);
        const [mpsRes, statesRes] = await Promise.all([
          api.getMPsList().catch(() => ({ mps: [] })),
          api.getFilterStates().catch(() => ({ states: [] })),
        ]);
        setAllMPs(mpsRes.mps || []);
        setAvailableStates(statesRes.states || []);

        // Auto-select first MP for immediate demonstration
        if (mpsRes.mps && mpsRes.mps.length > 0) {
          const defaultMP = mpsRes.mps[0].mp_name;
          setMpQuery(defaultMP);
          loadMP(defaultMP);
        }
      } catch (err) {
        console.error('Failed to load MP directory:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMPDirectory();
  }, []);

  const loadMP = async (name: string) => {
    if (!name.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMPAnalytics(name.trim());
      setAnalytics(res);
      setMpQuery(res.mp_name);
    } catch (err: any) {
      setError(err.message || `No data found for MP '${name}'`);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mpQuery.trim()) {
      loadMP(mpQuery);
    }
  };

  // Filtered MP list for quick selection
  const filteredMPs = allMPs.filter((m) => {
    const matchState = !selectedState || m.state.toUpperCase() === selectedState.toUpperCase();
    const matchQuery = !mpQuery || m.mp_name.toUpperCase().includes(mpQuery.toUpperCase()) || m.constituency.toUpperCase().includes(mpQuery.toUpperCase());
    return matchState && matchQuery;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Hon'ble MP Portfolio & Utilization Profiling</h1>
        <div className="page-desc">
          Individual Member of Parliament expenditure velocity, scheme allocation distribution, and risk surveillance
        </div>
      </div>

      {/* MP Search & Filter Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'center' }}>
          {/* State Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              FILTER BY STATE / UT
            </label>
            <select
              className="search-input"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="">All States & UTs ({availableStates.length})</option>
              {availableStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
              SEARCH MP NAME OR CONSTITUENCY
            </label>
            <form onSubmit={handleSearchSubmit}>
              <input
                type="text"
                className="search-input"
                placeholder="Type MP name or constituency (e.g. AGRA, VISAKHAPATNAM, PUNE)..."
                value={mpQuery}
                onChange={(e) => setMpQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Search Button */}
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading || !mpQuery.trim()}
              onClick={() => loadMP(mpQuery)}
              style={{ padding: '0.65rem 1.25rem' }}
            >
              <Search size={16} />
              <span>{loading ? 'Analyzing…' : 'Analyze MP'}</span>
            </button>
          </div>
        </div>

        {/* Quick MP Selector Badges */}
        {filteredMPs.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 700, textTransform: 'uppercase' }}>
              Select from Registered MPs ({filteredMPs.length}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: 90, overflowY: 'auto' }}>
              {filteredMPs.slice(0, 15).map((m) => (
                <button
                  key={m.mp_name}
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    padding: '0.25rem 0.65rem',
                    fontSize: '0.75rem',
                    border: analytics?.mp_name === m.mp_name ? '1px solid var(--accent-blue)' : '1px solid rgba(255,255,255,0.08)',
                    background: analytics?.mp_name === m.mp_name ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  }}
                  onClick={() => loadMP(m.mp_name)}
                >
                  <span>{m.mp_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginLeft: 4 }}>({m.constituency})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="card"
          style={{
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.05)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ color: 'var(--risk-critical)', fontWeight: 800, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} /> MP Not Found
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {error}. Please select an MP from the directory list above.
          </div>
        </div>
      )}

      {/* Analytics Results */}
      {analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* MP Profile Header */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', fontWeight: 800, textTransform: 'uppercase' }}>
                HON'BLE MEMBER OF PARLIAMENT PROFILE
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0.2rem 0' }}>{analytics.mp_name}</h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={15} color="var(--accent-teal)" />
                <span>{analytics.state} • {analytics.constituency}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>PORTFOLIO AVERAGE RISK</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: analytics.avg_risk_score >= 50 ? 'var(--risk-critical)' : 'var(--accent-blue)' }}>
                {analytics.avg_risk_score} / 100
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Across {analytics.total_projects} recommended projects
              </div>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="kpi-grid">
            <div className="kpi-tile" style={{ '--tile-accent': 'var(--accent-blue)' } as React.CSSProperties}>
              <div className="kpi-label">Total Recommended Works</div>
              <div className="kpi-value">{analytics.total_projects}</div>
              <div className="kpi-detail">Works registered in constituency</div>
            </div>

            <div className="kpi-tile" style={{ '--tile-accent': 'var(--accent-teal)' } as React.CSSProperties}>
              <div className="kpi-label">Total Allocated Funds</div>
              <div className="kpi-value">₹{analytics.total_allocated_crore} Cr</div>
              <div className="kpi-detail">Cumulative sanctioned value</div>
            </div>

            <div className="kpi-tile" style={{ '--tile-accent': 'var(--accent-blue)' } as React.CSSProperties}>
              <div className="kpi-label">Total Expended Funds</div>
              <div className="kpi-value">₹{analytics.total_expenditure_crore} Cr</div>
              <div className="kpi-detail">Fund Utilization: <strong>{analytics.fund_utilization_pct}%</strong></div>
            </div>

            <div className="kpi-tile" style={{ '--tile-accent': analytics.completed_pct >= 50 ? 'var(--risk-low)' : 'var(--risk-moderate)' } as React.CSSProperties}>
              <div className="kpi-label">Completion Rate</div>
              <div className="kpi-value">{analytics.completed_pct}%</div>
              <div className="kpi-detail">{analytics.overdue_count} overdue/delayed works</div>
            </div>
          </div>

          {/* Highest Risk Projects by this MP */}
          <div className="card">
            <div className="card-title">Highest Risk Projects Recommended by {analytics.mp_name}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Priority projects ranked by composite risk score for targeted audit review
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project ID</th>
                    <th>Location</th>
                    <th>Sanctioned Amount</th>
                    <th>Expenditure</th>
                    <th>Status</th>
                    <th>Risk Band</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics.top_risk_projects || []).map((p: any) => (
                    <tr key={p.project_id}>
                      <td><strong>#{p.project_id}</strong></td>
                      <td>
                        <div>{p.state_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.constituency_name}</div>
                      </td>
                      <td className="amount">₹{(p.allocated_amount || 0).toLocaleString()}</td>
                      <td className="amount">{p.expenditure_amt ? `₹${p.expenditure_amt.toLocaleString()}` : '₹0'}</td>
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
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
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
