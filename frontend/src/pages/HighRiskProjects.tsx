import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, ArrowUpDown, Eye } from 'lucide-react';
import { api } from '../api';
import type { ProjectSummary } from '../types';
import { RiskBadge } from '../components/RiskBadge';

export const HighRiskProjects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<string[]>([]);

  // Filters
  const [selectedState, setSelectedState] = useState('');
  const [riskBand, setRiskBand] = useState('HIGH,CRITICAL');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('overall_risk_score');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    api.getFilterStates().then((res) => setStates(res.states || [])).catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.getProjects({
          state: selectedState || undefined,
          risk_band: riskBand || undefined,
          is_overdue: overdueOnly ? true : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          page,
          page_size: 20,
        });
        setProjects(res.projects || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedState, riskBand, overdueOnly, page, sortBy, sortOrder]);

  return (
    <div>
      <div className="page-header">
        <h1>Prioritized Audit Investigation Queue</h1>
        <div className="page-desc">
          Projects ranked by multi-tier risk scoring for proactive field and financial scrutiny
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>FILTERS:</span>
          </div>

          <select
            className="search-input"
            style={{ width: 180, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            value={selectedState}
            onChange={(e) => { setSelectedState(e.target.value); setPage(1); }}
          >
            <option value="">All States ({states.length})</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="search-input"
            style={{ width: 180, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            value={riskBand}
            onChange={(e) => { setRiskBand(e.target.value); setPage(1); }}
          >
            <option value="HIGH,CRITICAL">High & Critical Only</option>
            <option value="CRITICAL">Critical Risk (75-100)</option>
            <option value="HIGH">High Risk (50-74)</option>
            <option value="MODERATE">Moderate Risk (25-49)</option>
            <option value="LOW">Low Risk (0-24)</option>
            <option value="">All Risk Bands</option>
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }}
            />
            <span>Overdue Projects Only</span>
          </label>

          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing <strong>{projects.length}</strong> of <strong>{total}</strong> cases
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => { setSortBy('project_id'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    ID <ArrowUpDown size={12} />
                  </th>
                  <th>Location & IDA</th>
                  <th>Hon'ble MP</th>
                  <th onClick={() => { setSortBy('allocated_amount'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Allocated Limit <ArrowUpDown size={12} />
                  </th>
                  <th>Expenditure (₹)</th>
                  <th>Age / Status</th>
                  <th onClick={() => { setSortBy('overall_risk_score'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                    Risk Score <ArrowUpDown size={12} />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.project_id}>
                    <td><strong>#{p.project_id}</strong></td>
                    <td>
                      <div>{p.state_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {p.constituency_name} {p.city_name ? `• ${p.city_name}` : ''}
                      </div>
                    </td>
                    <td>
                      <div>{p.mp_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.house_type || 'LOK'}</div>
                    </td>
                    <td className="amount">₹{(p.allocated_amount || 0).toLocaleString()}</td>
                    <td className="amount">{p.expenditure_amt ? `₹${p.expenditure_amt.toLocaleString()}` : '-'}</td>
                    <td>
                      <div>{p.work_status}</div>
                      <div style={{ fontSize: '0.72rem', color: p.is_overdue ? 'var(--risk-critical)' : 'var(--text-muted)' }}>
                        {p.project_age_days ? `${p.project_age_days} days` : '-'}
                        {p.is_overdue && ' (OVERDUE)'}
                      </div>
                    </td>
                    <td>
                      <RiskBadge band={p.risk_band} score={p.overall_risk_score} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => navigate(`/projects/${p.project_id}`)}
                        >
                          <Eye size={12} />
                          <span>Audit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            className="btn btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Page {page} of {Math.max(1, Math.ceil(total / 20))}
          </span>
          <button
            className="btn btn-ghost"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
