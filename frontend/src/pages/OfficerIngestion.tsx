import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FilePlus2,
  UserCheck,
  ArrowRight,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { api } from '../api';
import { RiskBadge } from '../components/RiskBadge';

const CATEGORIES = [
  'Drinking Water & Sanitation',
  'Rural Roadways & Connectivity',
  'Education & School Infrastructure',
  'Public Healthcare & Dispensaries',
  'Irrigation & Flood Management',
  'Community Centers & Public Halls',
  'Renewable Energy & Solar Lighting',
  'Sports Infrastructure & Youth Facilities',
  'Other Statutory Works',
];

export const OfficerIngestion: React.FC = () => {
  const navigate = useNavigate();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('digi_mplad_officer_auth') === 'true';
  });
  const [officerInfo, setOfficerInfo] = useState({
    officerId: sessionStorage.getItem('digi_mplad_officer_id') || '',
    designation: sessionStorage.getItem('digi_mplad_officer_role') || '',
  });

  // Login form state
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginRole, setLoginRole] = useState('District Audit Officer (IDA)');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Project Ingestion Form State
  const [formData, setFormData] = useState({
    house_type: 'LOK',
    state_name: 'ANDHRA PRADESH',
    constituency_name: 'VISAKHAPATNAM',
    mp_name: 'HONBLE MP VISAKHAPATNAM',
    city_name: 'Visakhapatnam',
    block_name: 'Anandapuram',
    village_name: 'Boni',
    ida_name: 'District Collectorate, Visakhapatnam',
    location_type: 'Rural',
    category: 'Drinking Water & Sanitation',
    allocated_amount: 5000000,
    expenditure_amt: 0,
    work_status: 'On Going',
    recommended_date: new Date().toISOString().split('T')[0],
    letter_no: '',
    work_description: '',
    officer_verified: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanId = loginId.trim().toUpperCase();
    if (!cleanId || cleanId.length < 4) {
      setAuthError('Please enter a valid Government Officer ID (e.g. GOI-MOSPI-84920 or NIC-AP-0491).');
      return;
    }

    // Standard Government Security PIN requirement
    if (loginPin !== 'MOSPI@GOV2026' && loginPin !== 'MOSPI@2026') {
      setAuthError('Invalid Security Access PIN. Please verify with your Nodal Authority.');
      return;
    }

    if (captchaAnswer.trim() !== '14') {
      setAuthError('Security Captcha calculation failed. (7 + 7 = 14)');
      return;
    }

    // Success Authentication
    sessionStorage.setItem('digi_mplad_officer_auth', 'true');
    sessionStorage.setItem('digi_mplad_officer_id', cleanId);
    sessionStorage.setItem('digi_mplad_officer_role', loginRole);
    setOfficerInfo({ officerId: cleanId, designation: loginRole });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('digi_mplad_officer_auth');
    sessionStorage.removeItem('digi_mplad_officer_id');
    sessionStorage.removeItem('digi_mplad_officer_role');
    setIsAuthenticated(false);
    setSubmitResult(null);
  };

  // Handle Project Submission
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    try {
      const payload = {
        ...formData,
        letter_no: formData.letter_no || `MPLADS/${formData.constituency_name.slice(0, 3).toUpperCase()}/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`,
      };
      const res = await api.submitProject(payload);
      setSubmitResult(res);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to ingest project into registry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Authorized Officer Ingestion Portal</h1>
          <div className="page-desc">
            Restricted Government Registry Gateway for official project creation, verification, and instant AI audit scoring
          </div>
        </div>
        {isAuthenticated && (
          <button className="btn btn-ghost" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
            <LogOut size={15} />
            <span>Sign Out ({officerInfo.officerId})</span>
          </button>
        )}
      </div>

      {!isAuthenticated ? (
        /* Security Clearance / Login Gate */
        <div style={{ maxWidth: 580, margin: '2rem auto' }}>
          <div className="card" style={{ border: '1px solid rgba(56, 189, 248, 0.3)', background: 'rgba(15, 23, 42, 0.95)', padding: '2.25rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-blue)',
                  marginBottom: '1rem',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                <Lock size={26} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Government Officer Access Clearance
              </h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                RESTRICTED GOVERNMENT PORTAL: Official credentials required. All unauthorized access attempts are logged under IT Act 2000.
              </div>
            </div>

            {authError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  OFFICER BADGE / GOVT ID *
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="e.g. GOI-MOSPI-84920 or NIC-AP-0491"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    OFFICIAL DESIGNATION *
                  </label>
                  <select
                    className="search-input"
                    value={loginRole}
                    onChange={(e) => setLoginRole(e.target.value)}
                  >
                    <option value="District Audit Officer (IDA)">District Audit Officer (IDA)</option>
                    <option value="District Collector & Magistrate">District Collector & Magistrate</option>
                    <option value="MoSPI Programme Director">MoSPI Programme Director</option>
                    <option value="State Nodal Officer">State Nodal Officer</option>
                    <option value="CAG Field Audit Officer">CAG Field Audit Officer</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    SECURITY ACCESS PIN *
                  </label>
                  <input
                    type="password"
                    className="search-input"
                    placeholder="Enter Security PIN"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  SECURITY VERIFICATION: What is 7 + 7 ? *
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Enter numerical answer"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', fontSize: '0.9rem' }}>
                  <Unlock size={16} />
                  <span>Verify Credentials & Enter Ingestion Portal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Authenticated Project Ingestion Section */
        <div>
          {/* Officer Verification Banner */}
          <div
            className="card"
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(34, 197, 94, 0.04)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              padding: '1rem 1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserCheck size={24} color="#22c55e" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#22c55e' }}>
                  AUTHENTICATED GOVERNMENT OFFICER CLEARANCE ACTIVE
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Officer ID: <strong>{officerInfo.officerId}</strong> • {officerInfo.designation}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              <div>Digital Audit Trail: <strong>ACTIVE</strong></div>
              <div>Timestamp: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          {/* Ingestion Form Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <FilePlus2 size={22} color="var(--accent-blue)" />
              <div className="card-title" style={{ margin: 0 }}>
                Official MPLADS Work Registration & Risk Pre-Screening
              </div>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.5rem' }}>
              Please enter official work details matching the signed Sanction Order. The system executes instantaneous rule evaluation (R001–R011) and registers the record directly into the national surveillance data store.
            </div>

            <form onSubmit={handleSubmitProject} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {/* House Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PARLIAMENTARY HOUSE *
                </label>
                <select
                  className="search-input"
                  value={formData.house_type}
                  onChange={(e) => setFormData({ ...formData, house_type: e.target.value })}
                  required
                >
                  <option value="LOK">Lok Sabha (House of the People)</option>
                  <option value="RAJYA">Rajya Sabha (Council of States)</option>
                </select>
              </div>

              {/* State */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  STATE / UT *
                </label>
                <input
                  type="text"
                  className="search-input"
                  value={formData.state_name}
                  onChange={(e) => setFormData({ ...formData, state_name: e.target.value })}
                  required
                  placeholder="e.g. MAHARASHTRA"
                />
              </div>

              {/* Constituency */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  PARLIAMENTARY CONSTITUENCY *
                </label>
                <input
                  type="text"
                  className="search-input"
                  value={formData.constituency_name}
                  onChange={(e) => setFormData({ ...formData, constituency_name: e.target.value })}
                  required
                  placeholder="e.g. PUNE"
                />
              </div>

              {/* MP Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  HON'BLE MP NAME *
                </label>
                <input
                  type="text"
                  className="search-input"
                  value={formData.mp_name}
                  onChange={(e) => setFormData({ ...formData, mp_name: e.target.value })}
                  required
                  placeholder="e.g. DR. SANJEEV KUMAR"
                />
              </div>

              {/* Work Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  WORK CATEGORY *
                </label>
                <select
                  className="search-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Location Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  LOCATION TYPE *
                </label>
                <select
                  className="search-input"
                  value={formData.location_type}
                  onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                >
                  <option value="Rural">Rural</option>
                  <option value="Urban">Urban</option>
                  <option value="Semi-Urban">Semi-Urban</option>
                </select>
              </div>

              {/* City / Block / Village */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  BLOCK / TALUKA & VILLAGE
                </label>
                <input
                  type="text"
                  className="search-input"
                  value={formData.block_name}
                  onChange={(e) => setFormData({ ...formData, block_name: e.target.value })}
                  placeholder="e.g. Haveli Block"
                />
              </div>

              {/* Implementing District Authority (IDA) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  IMPLEMENTING DISTRICT AUTHORITY (IDA) *
                </label>
                <input
                  type="text"
                  className="search-input"
                  value={formData.ida_name}
                  onChange={(e) => setFormData({ ...formData, ida_name: e.target.value })}
                  required
                  placeholder="e.g. District Collectorate & Magistrate"
                />
              </div>

              {/* Allocated Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  SANCTIONED / ALLOCATED AMOUNT (₹) *
                </label>
                <input
                  type="number"
                  className="search-input"
                  value={formData.allocated_amount}
                  onChange={(e) => setFormData({ ...formData, allocated_amount: parseFloat(e.target.value) || 0 })}
                  required
                  min="1000"
                />
              </div>

              {/* Expenditure Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  CURRENT RECORDED EXPENDITURE (₹)
                </label>
                <input
                  type="number"
                  className="search-input"
                  value={formData.expenditure_amt}
                  onChange={(e) => setFormData({ ...formData, expenditure_amt: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>

              {/* Work Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  WORK STATUS *
                </label>
                <select
                  className="search-input"
                  value={formData.work_status}
                  onChange={(e) => setFormData({ ...formData, work_status: e.target.value })}
                >
                  <option value="On Going">On Going (Sanctioned & In Progress)</option>
                  <option value="Completed">Completed (Final MB Cleared)</option>
                  <option value="Unsanctioned">Unsanctioned (Recommended only)</option>
                </select>
              </div>

              {/* Recommendation Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  RECOMMENDATION DATE *
                </label>
                <input
                  type="date"
                  className="search-input"
                  value={formData.recommended_date}
                  onChange={(e) => setFormData({ ...formData, recommended_date: e.target.value })}
                  required
                />
              </div>

              {/* Sanction Letter No */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  SANCTION LETTER / DOCKET NO
                </label>
                <input
                  type="text"
                  className="search-input"
                  placeholder="e.g. MPLADS/PUN/2024/008"
                  value={formData.letter_no}
                  onChange={(e) => setFormData({ ...formData, letter_no: e.target.value })}
                />
              </div>

              {/* Verification Declaration */}
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={formData.officer_verified}
                    onChange={(e) => setFormData({ ...formData, officer_verified: e.target.checked })}
                    required
                    style={{ marginTop: '0.2rem' }}
                  />
                  <span>
                    I confirm as an authorized Government Officer ({officerInfo.officerId}) that the submitted MPLADS work details have been cross-checked with the official Sanction Order and District Authority records.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !formData.officer_verified}
                  style={{ fontSize: '0.92rem', padding: '0.75rem 2rem' }}
                >
                  {submitting ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={18} />}
                  <span>{submitting ? 'Running Multi-Tier Anomaly Engine…' : 'Register Project & Execute Risk Scoring'}</span>
                </button>
              </div>
            </form>

            {/* Submit Error */}
            {submitError && (
              <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                <strong>Registration Error:</strong> {submitError}
              </div>
            )}

            {/* Ingestion & Assessment Result */}
            {submitResult && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1.5rem',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', textTransform: 'uppercase', fontWeight: 800 }}>
                      <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                      SUCCESSFULLY REGISTERED IN NATIONAL STORE
                    </span>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0.2rem 0' }}>
                      Project #{submitResult.project.project_id} — {submitResult.project.mp_name}
                    </h3>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      {submitResult.project.state_name} • {submitResult.project.constituency_name} ({submitResult.project.work_status})
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>COMPOSITE RISK SCORE</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: submitResult.overall_risk_score >= 50 ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                        {submitResult.overall_risk_score} / 100
                      </div>
                    </div>
                    <RiskBadge band={submitResult.risk_band} score={submitResult.overall_risk_score} />
                  </div>
                </div>

                {submitResult.anomalies_detected && submitResult.anomalies_detected.length > 0 ? (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--risk-critical)', marginBottom: '0.4rem' }}>
                      ⚠️ Triggered Audit Indicators ({submitResult.anomalies_detected.length}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {submitResult.anomalies_detected.map((a: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            padding: '0.6rem 0.85rem',
                            borderRadius: 6,
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            fontSize: '0.82rem',
                          }}
                        >
                          <strong>{a.rule_name}</strong> ({a.severity}) — {a.explanation}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '1.25rem', padding: '0.6rem 0.85rem', borderRadius: 6, background: 'rgba(34, 197, 94, 0.08)', color: '#22c55e', fontSize: '0.82rem' }}>
                    ✓ No deterministic rule violations triggered. Work complies with standard scheme metrics.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
                    onClick={() => navigate(`/projects/${submitResult.project.project_id}`)}
                  >
                    <span>Open Detailed Audit Inspection Dossier</span>
                    <ArrowRight size={15} />
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Project record is now indexed across National Overview, High-Risk Queue, and State Diagnostics.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
