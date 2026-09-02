import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { api } from '../api';
import type { StateSummary } from '../types';
import { RiskBadge } from '../components/RiskBadge';

export const StateView: React.FC = () => {
  const navigate = useNavigate();
  const [states, setStates] = useState<StateSummary[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [stateDetail, setStateDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStates() {
      try {
        setLoading(true);
        const res = await api.getStates();
        setStates(res.states || []);
        if (res.states && res.states.length > 0) {
          setSelectedState(res.states[0].state_name);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStates();
  }, []);

  useEffect(() => {
    if (!selectedState) return;
    async function loadDetail() {
      try {
        const res = await api.getStateDetail(selectedState);
        setStateDetail(res);
      } catch (err) {
        console.error(err);
      }
    }
    loadDetail();
  }, [selectedState]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  const chartData = states.slice(0, 15).map((s) => ({
    name: s.state_name.length > 12 ? s.state_name.slice(0, 10) + '..' : s.state_name,
    allocated: s.total_allocated_crore,
    expended: s.total_expenditure_crore,
    avg_risk: s.avg_risk_score,
  }));

  return (
    <div>
      <div className="page-header">
        <h1>State & Regional Diagnostics</h1>
        <div className="page-desc">
          Geographic fund absorption, stalled ratio, and localized risk concentration
        </div>
      </div>

      {/* Top 15 States Comparative Chart */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title">State-Level Allocation vs Expenditure (₹ Crores)</div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} angle={-25} textAnchor="end" />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                }}
              />
              <Bar dataKey="allocated" name="Allocated (₹ Cr)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expended" name="Expended (₹ Cr)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* State Selector & Detail View */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          SELECT STATE FOR DETAILED AUDIT:
        </span>
        <select
          className="search-input"
          style={{ width: 260 }}
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
        >
          {states.map((s) => (
            <option key={s.state_name} value={s.state_name}>
              {s.state_name} (Risk: {s.avg_risk_score} | {s.total_projects} works)
            </option>
          ))}
        </select>
      </div>

      {stateDetail && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          {/* State Summary Card */}
          <div className="card">
            <div className="card-title">{selectedState} Overview</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL WORKS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stateDetail.total_projects}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ALLOCATED FUNDS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  ₹{stateDetail.total_allocated_crore} Cr
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>RECORDED EXPENDITURE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                  ₹{stateDetail.total_expenditure_crore} Cr
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FUND UTILIZATION</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {stateDetail.fund_utilization_pct}%
                </div>
              </div>
            </div>
          </div>

          {/* Top High Risk in State */}
          <div className="card">
            <div className="card-title">Top Flagged Projects in {selectedState}</div>
            <div className="data-table-wrapper" style={{ marginTop: '0.5rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Constituency</th>
                    <th>MP</th>
                    <th>Allocated</th>
                    <th>Risk Band</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(stateDetail.top_risk_projects || []).map((p: any) => (
                    <tr key={p.project_id}>
                      <td><strong>#{p.project_id}</strong></td>
                      <td>{p.constituency_name}</td>
                      <td>{p.mp_name}</td>
                      <td className="amount">₹{(p.allocated_amount || 0).toLocaleString()}</td>
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
