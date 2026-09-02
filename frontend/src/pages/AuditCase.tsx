import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { api } from '../api';
import type { AuditCaseData } from '../types';
import { RiskBadge } from '../components/RiskBadge';

export const AuditCase: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [auditCase, setAuditCase] = useState<AuditCaseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        const res = await api.generateAuditCase(id!);
        setAuditCase(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (!auditCase) {
    return <div>Audit case generation failed.</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Back to Project</span>
        </button>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Investigation Docket */}
      <div
        className="card"
        style={{
          backgroundColor: '#0f172a',
          borderColor: 'rgba(255,255,255,0.15)',
          padding: '2.5rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
                GOVERNMENT OF INDIA • MPLADS SURVEILLANCE & AUDIT CELL
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.4rem', color: '#f8fafc' }}>
                AUDIT INVESTIGATION CARD
              </h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Case Docket Reference: <strong>MPLADS-AUD-{auditCase.project_id}-{new Date().getFullYear()}</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <RiskBadge band={auditCase.priority} />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Generated: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            1. Executive Case Summary
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 8, fontSize: '0.9rem', lineHeight: 1.6 }}>
            {auditCase.summary}
          </div>
        </div>

        {/* Anomaly Indicators */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            2. Detected Risk Indicators & Variance Flags
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {auditCase.anomalies.map((a, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: '0.85rem',
                  borderRadius: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{a.rule}</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--risk-critical)', fontWeight: 700 }}>
                    {a.severity}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                  {a.explanation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Actions */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            3. Recommended Auditor Actions
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
              padding: '1rem',
              borderRadius: 8,
              color: 'var(--text-primary)',
            }}
          >
            {auditCase.recommended_action}
          </pre>
        </div>

        {/* Signatures & Auditor Block */}
        <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Investigating Auditor:</div>
            <div style={{ height: 40, borderBottom: '1px dashed rgba(255,255,255,0.2)', margin: '0.5rem 0' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Name / Designation / Emp ID</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>District Collector / Authority Verification:</div>
            <div style={{ height: 40, borderBottom: '1px dashed rgba(255,255,255,0.2)', margin: '0.5rem 0' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seal & Signature</div>
          </div>
        </div>

        {/* Mandatory Legal Disclaimer */}
        <div className="disclaimer" style={{ marginTop: '2rem' }}>
          <strong>STATUTORY NOTICE:</strong> {auditCase.disclaimer}
        </div>
      </div>
    </div>
  );
};
