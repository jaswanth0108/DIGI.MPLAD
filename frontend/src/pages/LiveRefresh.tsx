import React, { useState } from 'react';
import { RefreshCw, Database, CheckCircle, AlertTriangle, Clock, Play, Server, Layers } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RefreshStatus {
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  projects_loaded?: number;
  started_at?: string;
  finished_at?: string;
}

export const LiveRefresh: React.FC = () => {
  const [status, setStatus] = useState<RefreshStatus>({ status: 'idle', message: '' });
  const [pipelineMode, setPipelineMode] = useState<'demo' | 'live'>('demo');

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

  return (
    <div>
      <div className="page-header">
        <h1>Live Data Refresh & Pipeline Operations</h1>
        <div className="page-desc">
          Automated ETL synchronization, MoSPI eSAKSHI integration, and zero-downtime memory dataset management
        </div>
      </div>

      {/* Hot Reload API */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Server size={20} color="var(--accent-blue)" />
            <span>Hot-Reload In-Memory Dataset</span>
          </div>
          <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-blue)', padding: '0.2rem 0.6rem', borderRadius: 4, fontWeight: 700 }}>
            ZERO DOWNTIME
          </span>
        </div>

        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Reload newly processed records from <code>data/processed/master_projects_latest.json</code> into the running FastAPI server with zero downtime and sub-50ms latency.
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
                  All dashboards, risk scores, and audit queues are synchronized.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Ingestion Architecture */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--accent-teal)" />
          <span>Automated ETL Ingestion & Anomaly Scoring Architecture</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
          {[
            { step: '1', label: 'Portal Ingestion', detail: 'ETL fetches 8 endpoints from official MoSPI eSAKSHI portal', icon: <Database size={18} /> },
            { step: '2', label: 'Data Validation', detail: 'Automated data quality checks (nulls, types, duplicates)', icon: <CheckCircle size={18} /> },
            { step: '3', label: 'Feature Extraction', detail: 'Calculates financial ratios, peer medians, delay metrics', icon: <Layers size={18} /> },
            { step: '4', label: 'AI Risk Engine', detail: '11 deterministic rules + 6D Isolation Forest scoring', icon: <AlertTriangle size={18} /> },
            { step: '5', label: 'Memory Reload', detail: 'Pre-computed indexed dataset loaded into memory store', icon: <Play size={18} /> },
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
                STAGE {s.step}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>{s.label}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Pipeline Execution */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">Batch Pipeline Execution (Full National Sync)</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
          Execute the automated pipeline via CLI to fetch all national data from the official portal or regenerate 5,000 synthetic demo projects.
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Data Source Mode:</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="mode"
              checked={pipelineMode === 'demo'}
              onChange={() => setPipelineMode('demo')}
            />
            <span>Synthetic Demonstration Data (5,000 projects — works offline)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="mode"
              checked={pipelineMode === 'live'}
              onChange={() => setPipelineMode('live')}
            />
            <span>Live eSAKSHI Portal (Official MoSPI API endpoints)</span>
          </label>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 8,
            padding: '0.85rem 1rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: '#a3e635',
            marginBottom: '1rem',
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: '0.3rem' }}># Execute in terminal:</div>
          <div>{`cd mplads-monitor`}</div>
          <div>{`python -m backend.etl.pipeline${pipelineMode === 'demo' ? ' --demo' : ''}`}</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {pipelineMode === 'demo'
              ? '# Generates 5,000 synthetic projects spanning 16 states with calibrated risk patterns'
              : '# Ingests directly from https://mplads.mospi.gov.in REST API endpoints'}
          </div>
        </div>
      </div>
    </div>
  );
};
