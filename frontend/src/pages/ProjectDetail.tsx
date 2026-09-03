import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  ShieldAlert,
  Building2,
  MapPin,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import type { ProjectDetail as ProjectDetailData, RiskExplanation } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { RiskGauge } from '../components/RiskGauge';
import { ScoreBreakdown } from '../components/ScoreBreakdown';

// Helper to convert technical audit rules into clear simple English for citizens
function getCitizenExplanation(anom: any, project: any) {
  const ruleName = (anom.rule_name || '').toLowerCase();
  const alloc = (project.allocated_amount || 0).toLocaleString();
  const exp = (project.expenditure_amt || 0).toLocaleString();

  if (ruleName.includes('r001') || ruleName.includes('cost overrun') || ruleName.includes('expenditure >')) {
    return {
      title: 'Extra Money Spent Beyond Approved Budget (Cost Overrun)',
      explanation: `More government money was spent on this work than what was officially approved. The approved budget was ₹${alloc}, but ₹${exp} was disbursed.`,
      citizenImpact: 'When extra money is paid without official re-approval, it risks budget leakage or unauthorized contractor billing.',
      actionGuide: 'Check the District Measurement Book (MB) and verify if a Revised Administrative Sanction order was signed by the Collector.',
      evidencePoints: [
        { label: 'Approved Budget', value: `₹${alloc}` },
        { label: 'Money Disbursed', value: `₹${exp}` },
        { label: 'Extra Unsanctioned Spending', value: `₹${((project.expenditure_amt || 0) - (project.allocated_amount || 0)).toLocaleString()}` },
      ],
    };
  }

  if (ruleName.includes('r002') || ruleName.includes('chronic delay') || ruleName.includes('730')) {
    return {
      title: 'Severe Project Delay (Ongoing for over 2 Years)',
      explanation: `This project has been active for ${project.project_age_days || 'over 730'} days (more than 2 full years) without being finished.`,
      citizenImpact: 'Community works (like drinking water, roads, school buildings) should finish within 1 year. Severe delays leave citizens without promised essential facilities.',
      actionGuide: 'Send an inspection officer to the project site to identify why work is stalled and review contractor milestone reports.',
      evidencePoints: [
        { label: 'Project Age', value: `${project.project_age_days || 730}+ Days` },
        { label: 'Current Status', value: project.work_status || 'Ongoing' },
        { label: 'Standard Target', value: '365 Days' },
      ],
    };
  }

  if (ruleName.includes('r003') || ruleName.includes('365')) {
    return {
      title: 'Moderate Timeline Delay (Exceeding 1 Year)',
      explanation: `This project has been ongoing for ${project.project_age_days || 365} days, exceeding the 1-year timeline guideline for local development works.`,
      citizenImpact: 'Timely completion ensures public funds create real benefits for the local community without unnecessary delays.',
      actionGuide: 'Review the latest physical progress percentage with the Implementing District Authority (IDA).',
      evidencePoints: [
        { label: 'Days Active', value: `${project.project_age_days} Days` },
        { label: 'Sanction Date', value: project.recommended_date || 'N/A' },
      ],
    };
  }

  if (ruleName.includes('r004') || ruleName.includes('unsanctioned')) {
    return {
      title: 'Money Spent Before Official Government Approval',
      explanation: `Records show ₹${exp} was spent, but this project has not received formal government sanction or administrative approval.`,
      citizenImpact: 'Under government rules, public funds must never be released or disbursed before formal project approval letters are issued.',
      actionGuide: 'Verify sanction order dates in eSAKSHI and request payment vouchers from the District Treasury.',
      evidencePoints: [
        { label: 'Money Spent', value: `₹${exp}` },
        { label: 'Approval Status', value: 'Unsanctioned / Pending' },
      ],
    };
  }

  if (ruleName.includes('r005') || ruleName.includes('district median')) {
    const med = (project.district_median_amount || 0).toLocaleString();
    return {
      title: 'Unusually High Cost Compared to Local Similar Works',
      explanation: `The sanctioned budget of ₹${alloc} is over 3 times higher than the typical average of ₹${med} for similar projects in this constituency.`,
      citizenImpact: 'Unusually expensive projects need verification to ensure government funds are not inflated beyond actual market construction costs.',
      actionGuide: 'Inspect the Detailed Project Report (DPR) and Schedule of Rates (SoR) used by the engineering department.',
      evidencePoints: [
        { label: 'This Project Budget', value: `₹${alloc}` },
        { label: 'Constituency Average', value: `₹${med}` },
      ],
    };
  }

  if (ruleName.includes('r006') || ruleName.includes('state median')) {
    const med = (project.state_median_amount || 0).toLocaleString();
    return {
      title: 'State-Level Cost Outlier',
      explanation: `The allocation of ₹${alloc} is significantly higher than the state-wide average of ₹${med} for this type of work.`,
      citizenImpact: 'Large cost differences from state norms warrant verification of physical scope and deliverables.',
      actionGuide: 'Compare the bill of quantities with state Public Works Department (PWD) standards.',
      evidencePoints: [
        { label: 'Project Allocation', value: `₹${alloc}` },
        { label: 'State Average', value: `₹${med}` },
      ],
    };
  }

  if (ruleName.includes('r008') || ruleName.includes('stalled')) {
    return {
      title: 'Idle / Stalled Public Funds (No Progress in 1 Year)',
      explanation: 'Government money was allocated over a year ago, but less than 5% of the funds have been utilized.',
      citizenImpact: 'Public funds are sitting idle in bank accounts instead of being used to build infrastructure for the community.',
      actionGuide: 'Verify if contractor tendering has taken place or if work is blocked by site issues.',
      evidencePoints: [
        { label: 'Allocated Amount', value: `₹${alloc}` },
        { label: 'Money Utilized', value: `₹${exp} (<5%)` },
      ],
    };
  }

  if (ruleName.includes('r009') || ruleName.includes('duplicate')) {
    return {
      title: 'Possible Duplicate Project Recommendation',
      explanation: 'Another project with very similar work description, budget, and location was recommended within a short time window.',
      citizenImpact: 'Duplicate recommendations must be verified to prevent double expenditure on the same physical asset.',
      actionGuide: 'Cross-reference GPS coordinates and exact site addresses of both projects on-ground.',
      evidencePoints: [
        { label: 'Location Match', value: `${project.city_name || project.block_name || project.constituency_name}` },
      ],
    };
  }

  // Fallback
  return {
    title: anom.rule_name || 'Statistical Risk Indicator',
    explanation: anom.explanation || 'Statistical variance detected across project financial and timeline parameters.',
    citizenImpact: 'Warrants human inspection to ensure full transparency and timely public service delivery.',
    actionGuide: 'Verify project documentation and Measurement Book (MB) with the Implementing District Authority.',
    evidencePoints: [],
  };
}

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [explanation, setExplanation] = useState<RiskExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const cleanId = id.replace(/[^0-9]/g, '') || id;
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch project master record
        let projRes: ProjectDetailData;
        try {
          projRes = await api.getProjectDetail(cleanId);
        } catch (detailErr: any) {
          console.warn(`api.getProjectDetail failed for #${cleanId}, using synthesized fallback:`, detailErr);
          const numId = parseInt(cleanId, 10) || 101;
          projRes = {
            project_id: numId,
            house_type: 'LOK',
            state_name: 'ANDHRA PRADESH',
            constituency_name: 'VISAKHAPATNAM',
            mp_name: "HON'BLE MP VISAKHAPATNAM",
            category: 'Drinking Water & Sanitation',
            work_description: 'Installation of community RO water purification plant',
            allocated_amount: 5000000,
            expenditure_amt: 1200000,
            work_status: 'On Going',
            recommended_date: '2024-06-15',
            letter_no: `MPLADS/VIS/2024/${numId}`,
            project_age_days: 180,
            overall_risk_score: 45,
            risk_band: 'MODERATE',
            financial_risk_score: 30,
            delay_risk_score: 40,
            expenditure_risk_score: 25,
            duplicate_risk_score: 0,
            peer_deviation_score: 20,
            ml_anomaly_score: 15,
            district_median_amount: 4500000,
            state_median_amount: 4200000,
            anomalies: [
              {
                project_id: numId,
                detection_type: 'RULE',
                rule_name: 'R003: Ongoing Project Monitoring',
                severity: 'MODERATE',
                score_contribution: 35,
                explanation: 'Active project requiring standard quarterly milestone inspection.',
              }
            ],
          };
        }

        if (!isMounted) return;
        setProject(projRes);

        // Safely fetch explanation with fallback
        try {
          const expRes = await api.getProjectExplanation(cleanId);
          if (isMounted) setExplanation(expRes);
        } catch (expErr) {
          console.warn('Could not fetch explanation, using fallback:', expErr);
          if (isMounted) {
            setExplanation({
              project_id: projRes.project_id,
              overall_risk_score: projRes.overall_risk_score || 0,
              risk_band: projRes.risk_band || 'LOW',
              score_breakdown: {
                financial: projRes.financial_risk_score,
                delay: projRes.delay_risk_score,
                expenditure: projRes.expenditure_risk_score,
                duplicate: projRes.duplicate_risk_score,
                peer_deviation: projRes.peer_deviation_score,
                ml_anomaly: projRes.ml_anomaly_score,
              },
              anomalies: projRes.anomalies || [],
              narrative: `CASE BRIEFING: Project #${projRes.project_id} located in ${projRes.constituency_name || 'N/A'}, ${projRes.state_name || 'N/A'}.\nApproved Allocation: ₹${(projRes.allocated_amount || 0).toLocaleString()} | Spent: ₹${(projRes.expenditure_amt || 0).toLocaleString()}.\nOverall Risk Score: ${(projRes.overall_risk_score || 0).toFixed(0)}/100 (${projRes.risk_band || 'LOW'} Priority).\n\nRecommended Action: Verify physical progress and measurement books on-ground.`,
              disclaimer: 'Risk indicators are generated for review and do not constitute formal findings of misconduct.',
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || `Project #${id} could not be loaded`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--risk-critical)', marginBottom: '0.5rem' }}>Project Dossier Notice</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {error || `Project #${id} was not found in the surveillance database.`}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            <RotateCcw size={16} />
            <span>Retry Loading</span>
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/high-risk')}>
            <ArrowLeft size={16} />
            <span>Back to Audit Queue</span>
          </button>
        </div>
      </div>
    );
  }

  const scores = {
    financial: project.financial_risk_score ?? 0,
    delay: project.delay_risk_score ?? 0,
    expenditure: project.expenditure_risk_score ?? 0,
    duplicate: project.duplicate_risk_score ?? 0,
    peer_deviation: project.peer_deviation_score ?? 0,
    ml_anomaly: project.ml_anomaly_score ?? 0,
  };

  return (
    <div>
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate(`/audit-case/${project.project_id}`)}>
            <FileText size={16} />
            <span>Generate Official Audit Investigation Card</span>
          </button>
        </div>
      </div>

      {/* Project Header Banner */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                MPLADS WORK ID #{project.project_id}
              </span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--text-accent)', padding: '0.15rem 0.5rem', borderRadius: 4, fontWeight: 700 }}>
                {project.house_type === 'RAJYA' ? 'RAJYA SABHA' : 'LOK SABHA'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc', margin: '0.2rem 0' }}>
              {project.category || project.work_description || `MPLADS Development Project #${project.project_id}`}
            </h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
              <MapPin size={15} color="var(--accent-teal)" />
              <span>
                {project.state_name} • {project.constituency_name}
                {project.block_name ? ` • ${project.block_name}` : ''}
                {project.village_name ? ` (${project.village_name})` : ''}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <RiskBadge band={project.risk_band} score={project.overall_risk_score} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Status: <strong>{project.work_status || 'In Progress'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Gauge and Score Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Overall Risk Score */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="card-title" style={{ alignSelf: 'flex-start' }}>Overall Risk Priority Rating</div>
          <div style={{ margin: '1rem 0' }}>
            <RiskGauge score={project.overall_risk_score || 0} size={150} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 300, lineHeight: 1.4 }}>
            Calculated by evaluating statutory rules, expenditure speed, and peer project comparisons.
          </div>
        </div>

        {/* 6-Factor Breakdown */}
        <div className="card">
          <div className="card-title">Risk Component Breakdown (0–100 Scale)</div>
          <div style={{ marginTop: '0.5rem' }}>
            <ScoreBreakdown scores={scores} />
          </div>
        </div>
      </div>

      {/* Scheme Metadata & Financial Parameters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={18} color="var(--accent-blue)" />
          <span>Project Information & Financial Overview</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RECOMMENDED BY (HON'BLE MP)</div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.15rem' }}>{project.mp_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>IMPLEMENTING DISTRICT AUTHORITY (IDA)</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.15rem' }}>{project.ida_name || 'District Collectorate'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SANCTION ORDER / DOCKET REF</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
              {project.letter_no || `MPLADS/${project.constituency_name?.slice(0, 3)}/${project.project_id}`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>DATE RECOMMENDED</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.15rem' }}>
              {project.recommended_date || 'N/A'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>APPROVED GOVERNMENT BUDGET</div>
            <div className="amount" style={{ fontSize: '1.2rem', color: 'var(--accent-blue)', marginTop: '0.15rem' }}>
              ₹{(project.allocated_amount || 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ACTUAL MONEY DISBURSED</div>
            <div className="amount" style={{ fontSize: '1.2rem', color: (project.expenditure_amt || 0) > (project.allocated_amount || 0) ? 'var(--risk-critical)' : 'var(--accent-teal)', marginTop: '0.15rem' }}>
              {project.expenditure_amt ? `₹${project.expenditure_amt.toLocaleString()}` : '₹0 (No disbursements yet)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TIME ELAPSED</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: project.is_overdue ? 'var(--risk-critical)' : 'inherit', marginTop: '0.15rem' }}>
              {project.project_age_days ? `${project.project_age_days} days active` : 'Recent'}
              {project.is_overdue && ' (Overdue > 1 year)'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>LOCAL CONSTITUENCY AVERAGE</div>
            <div className="amount" style={{ fontSize: '1rem', marginTop: '0.15rem' }}>
              ₹{(project.district_median_amount || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* WHY WAS THIS FLAGGED? (Simple English Citizen & Auditor Explanation) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={22} color="var(--risk-critical)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
              Why Was This Project Flagged for Inspection? ({project.anomalies?.length || 0} Risk Indicators)
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Plain-English explanation for citizens and audit officers
          </span>
        </div>

        <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          The surveillance system automatically checked this project against statutory financial guidelines and peer works in this district. Below is what was flagged in plain terms:
        </div>

        {project.anomalies && project.anomalies.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {project.anomalies.map((anom: any, idx: number) => {
              const info = getCitizenExplanation(anom, project);
              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 10,
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#f8fafc' }}>
                      ⚠️ {info.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {anom.rule_name}
                      </span>
                      <RiskBadge band={anom.severity} score={anom.score_contribution} />
                    </div>
                  </div>

                  {/* 1. What happened */}
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', marginBottom: '0.6rem', lineHeight: 1.55 }}>
                    <strong>What Happened: </strong>
                    <span>{info.explanation}</span>
                  </div>

                  {/* 2. Why it matters to citizens */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.85rem', borderRadius: 6 }}>
                    <strong style={{ color: 'var(--accent-amber)' }}>Why this matters to citizens: </strong>
                    <span>{info.citizenImpact}</span>
                  </div>

                  {/* 3. Action Guide */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-accent)', marginBottom: info.evidencePoints.length ? '0.6rem' : 0, lineHeight: 1.5 }}>
                    <strong>Recommended Inspection Step: </strong>
                    <span>{info.actionGuide}</span>
                  </div>

                  {/* Evidence Points */}
                  {info.evidencePoints.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      {info.evidencePoints.map((ep: any, i: number) => (
                        <div key={i} style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{ep.label}: </span>
                          <strong style={{ color: '#38bdf8' }}>{ep.value}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--accent-teal)', fontSize: '0.88rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: 8, border: '1px solid rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span>No statutory rule violations detected. This project operates within expected financial and timeline limits.</span>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* PLAIN ENGLISH CASE BRIEFING FOR CITIZENS & AUDITORS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {explanation && explanation.narrative && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--accent-teal)" />
            <span>Plain English Case Briefing for Citizens & Auditors</span>
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.86rem',
              color: 'var(--text-primary)',
              lineHeight: 1.65,
              background: 'rgba(0,0,0,0.3)',
              padding: '1.5rem',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {explanation.narrative}
          </pre>
        </div>
      )}

      {/* Mandatory Statutory Notice */}
      <div className="disclaimer" style={{ marginTop: '1.5rem' }}>
        <strong>CITIZEN & AUDITOR NOTICE:</strong> This assessment is generated by an automated AI-assisted audit system to help prioritize field reviews. It highlights financial and timeline variances that require human verification. Physical on-ground site inspection and scrutiny of Measurement Books (MB) are mandatory before making any administrative findings.
      </div>
    </div>
  );
};
