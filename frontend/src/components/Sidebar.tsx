import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  Search,
  RefreshCw,
  FilePlus2,
  BrainCircuit,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#ffffff',
              border: '1.5px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 0 12px rgba(56, 189, 248, 0.2)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1>Digi.MPLAD</h1>
            <div className="subtitle">Audit &amp; Anomaly Platform</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          end
        >
          <LayoutDashboard size={18} />
          <span>National Overview</span>
        </NavLink>

        <NavLink
          to="/high-risk"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <AlertTriangle size={18} />
          <span>High-Risk Queue</span>
        </NavLink>

        <NavLink
          to="/states"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <MapPin size={18} />
          <span>State Diagnostics</span>
        </NavLink>

        <NavLink
          to="/search"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Search size={18} />
          <span>NL Query / Search</span>
        </NavLink>

        <NavLink
          to="/how-it-works"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <BrainCircuit size={18} />
          <span>How It Works</span>
        </NavLink>

        <div style={{ margin: '0.5rem 1rem', borderTop: '1px solid var(--border-subtle)' }} />

        <NavLink
          to="/officer-portal"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FilePlus2 size={18} />
          <span>Officer Ingestion Portal</span>
        </NavLink>

        <NavLink
          to="/live-refresh"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <RefreshCw size={18} />
          <span>Live Data Refresh</span>
        </NavLink>
      </nav>

      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <div><strong>MoSPI eSAKSHI Source</strong></div>
          <div style={{ marginTop: '0.2rem', color: '#38bdf8' }}>Digi.MPLAD v1.0 Production</div>
        </div>
      </div>
    </aside>
  );
};
