import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Info, RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { ProjectSummary } from '../types';
import { RiskBadge } from '../components/RiskBadge';

const SAMPLE_QUERIES = [
  'Show high-risk projects in Maharashtra',
  'Find delayed works in Tamil Nadu',
  'Critical risk cases with over 20 lakh allocation',
  'Completed projects in Uttar Pradesh',
  'Projects in Andhra Pradesh with high overrun',
  'Ongoing stalled projects in Bihar',
];

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (qText?: string) => {
    const textToSearch = qText || query;
    if (!textToSearch.trim()) return;
    try {
      setLoading(true);
      setError(null);
      setResponse(null);
      const res = await api.nlSearch(textToSearch);
      setResponse(res);
    } catch (err: any) {
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Natural Language Audit Search</h1>
        <div className="page-desc">
          Query the MPLADS database using plain English — no SQL or technical knowledge required
        </div>
      </div>

      {/* ── System Notice (permanent, always visible) ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          background: 'rgba(56, 189, 248, 0.06)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 10,
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={15} color="#38bdf8" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong style={{ color: 'var(--accent-blue)' }}>Safe Search Engine:</strong>{' '}
          Your query is converted to structured filter parameters (state, risk band, status, amount).
          No SQL is ever generated or executed directly — making this injection-safe by design.
        </span>
      </div>

      {/* ── Query Bar ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          style={{ display: 'flex', gap: '0.75rem' }}
        >
          <input
            id="nl-search-input"
            type="text"
            className="search-input"
            placeholder="e.g. 'Show critical risk delayed works in Bihar' or 'Find projects above 50 lakh in Karnataka'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button id="nl-search-submit" type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
            <span>{loading ? 'Searching…' : 'Search'}</span>
          </button>
        </form>

        {/* Preset Sample Queries */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Sparkles size={12} color="var(--accent-teal)" /> Try:
          </span>
          {SAMPLE_QUERIES.map((sample, i) => (
            <button
              key={i}
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              onClick={() => { setQuery(sample); handleSearch(sample); }}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error State ── */}
      {error && (
        <div className="card" style={{ color: 'var(--risk-critical)', padding: '1rem', marginBottom: '1.5rem' }}>
          <strong>Search Error:</strong> {error}
        </div>
      )}

      {/* ── Results Section ── */}
      {response && (
        <div className="card">
          {/* Result Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
                Interpreted As
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: 'var(--accent-blue)',
                  marginTop: '0.2rem',
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(56,189,248,0.07)',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 6,
                  display: 'inline-block',
                }}
              >
                {response.interpreted_as || 'all projects'}
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Found <strong style={{ color: 'var(--text-primary)' }}>{response.total}</strong> matching record{response.total !== 1 ? 's' : ''}
            </div>
          </div>

          {response.total === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No projects matched your query. Try a different state name or risk level keyword.
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Location</th>
                    <th>Hon'ble MP</th>
                    <th>Allocated (₹)</th>
                    <th>Expenditure (₹)</th>
                    <th>Status</th>
                    <th>Risk Band</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(response.results?.projects || []).map((p: ProjectSummary) => (
                    <tr key={p.project_id}>
                      <td><strong>#{p.project_id}</strong></td>
                      <td>
                        <div>{p.state_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.constituency_name}</div>
                      </td>
                      <td>{p.mp_name}</td>
                      <td className="amount">₹{(p.allocated_amount || 0).toLocaleString()}</td>
                      <td className="amount">{p.expenditure_amt ? `₹${p.expenditure_amt.toLocaleString()}` : '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.78rem', textTransform: 'capitalize' }}>
                          {p.work_status?.toLowerCase()}
                        </span>
                      </td>
                      <td><RiskBadge band={p.risk_band} score={p.overall_risk_score} /></td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                          onClick={() => navigate(`/projects/${p.project_id}`)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
