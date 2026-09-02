import React, { useState, useRef } from 'react';
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
  FileSpreadsheet,
  Download,
  UploadCloud,
  Table,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Ingestion Mode: 'excel' (primary) or 'single'
  const [activeTab, setActiveTab] = useState<'excel' | 'single'>('excel');

  // Excel Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Single Project Ingestion Form State
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

    if (loginPin !== 'MOSPI@GOV2026' && loginPin !== 'MOSPI@2026') {
      setAuthError('Invalid Security Access PIN. Please verify with your Nodal Authority.');
      return;
    }

    if (captchaAnswer.trim() !== '14') {
      setAuthError('Security Captcha calculation failed. (7 + 7 = 14)');
      return;
    }

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
    setUploadResult(null);
  };

  // Handle Client File Selection & Preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadError(null);
    setUploadResult(null);

    // If CSV, parse first few rows for live preview
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const headers = lines[0].split(',').map((h) => h.trim());
            const rows = lines.slice(1, 6).map((line) => {
              const vals = line.split(',');
              const obj: any = {};
              headers.forEach((h, i) => {
                obj[h] = vals[i]?.trim();
              });
              return obj;
            });
            setPreviewRows(rows);
          }
        } catch (err) {
          console.warn('Could not parse CSV preview:', err);
        }
      };
      reader.readAsText(file);
    } else {
      setPreviewRows([]);
    }
  };

  // Upload Excel / CSV
  const handleUploadExcel = async () => {
    if (!selectedFile) {
      setUploadError('Please select an Excel (.xlsx/.xls) or CSV file first.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = await api.uploadExcelProjects(selectedFile);
      setUploadResult(res);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to process Excel file.');
    } finally {
      setUploading(false);
    }
  };

  // Download Official Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'house_type,state_name,constituency_name,mp_name,category,ida_name,allocated_amount,expenditure_amt,work_status,recommended_date,letter_no,block_name,village_name,location_type,work_description\n' +
      'LOK,ANDHRA PRADESH,VISAKHAPATNAM,HONBLE MP VISAKHAPATNAM,Drinking Water & Sanitation,District Collectorate Visakhapatnam,5000000,1200000,On Going,2024-06-15,MPLADS/VIS/2024/001,Anandapuram,Boni,Rural,Installation of community RO water purification plant\n' +
      'LOK,MAHARASHTRA,PUNE,HONBLE MP PUNE,Rural Roadways & Connectivity,District Collectorate Pune,7500000,0,On Going,2024-04-10,MPLADS/PUN/2024/014,Haveli,Khadakwasla,Rural,Construction of BT connecting road from main junction\n' +
      'RAJYA,UTTAR PRADESH,AGRA,HONBLE MP AGRA,Education & School Infrastructure,District Collectorate Agra,3500000,3800000,Completed,2023-08-20,MPLADS/AGR/2023/089,Fatehabad,Dhana,Rural,Additional school classrooms and computer laboratory\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'MPLADS_Official_Ingestion_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Single Project Submission
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
            Restricted Government Registry Gateway for official batch Excel project creation, validation, and AI anomaly pre-screening
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

          {/* Ingestion Mode Switcher */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <button
              className={`btn ${activeTab === 'excel' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('excel')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.4rem' }}
            >
              <FileSpreadsheet size={18} />
              <span>Excel / CSV Batch Ingestion (Recommended)</span>
            </button>
            <button
              className={`btn ${activeTab === 'single' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('single')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.4rem' }}
            >
              <FilePlus2 size={18} />
              <span>Single Work Entry Form</span>
            </button>
          </div>

          {/* ──────────────────────────────────────────────────────────────────────── */}
          {/* TAB 1: EXCEL / CSV BATCH WORK INGESTION                                  */}
          {/* ──────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'excel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Upload Card */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <FileSpreadsheet size={22} color="var(--accent-blue)" />
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                        Official MPLADS Excel / CSV Batch Work Ingestion
                      </h2>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      Upload an official spreadsheet to register hundreds of constituency works at once. The AI audit engine processes all rows instantaneously.
                    </div>
                  </div>

                  <button
                    className="btn btn-ghost"
                    onClick={handleDownloadTemplate}
                    style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8', padding: '0.6rem 1.25rem' }}
                  >
                    <Download size={16} />
                    <span>Download Official Excel Template (.csv)</span>
                  </button>
                </div>

                {/* Drag-and-drop upload box */}
                <div
                  style={{
                    border: '2px dashed rgba(56, 189, 248, 0.35)',
                    borderRadius: 12,
                    background: 'rgba(15, 23, 42, 0.6)',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '1.5rem',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: 'var(--accent-blue)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <UploadCloud size={28} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc', marginBottom: '0.25rem' }}>
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'Click or Drag & Drop Excel / CSV Spreadsheet Here'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Supported formats: Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                  </div>
                  {selectedFile && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-teal)', fontWeight: 700 }}>
                      File size: {(selectedFile.size / 1024).toFixed(1)} KB • Ready for Ingestion
                    </div>
                  )}
                </div>

                {/* Live Preview Table of First 5 Rows if CSV */}
                {previewRows.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                      Spreadsheet Preview (First {previewRows.length} Rows):
                    </div>
                    <div className="data-table-wrapper" style={{ maxHeight: 180, overflowY: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.75rem' }}>
                        <thead>
                          <tr>
                            <th>House</th>
                            <th>State</th>
                            <th>Constituency</th>
                            <th>Hon'ble MP</th>
                            <th>Category</th>
                            <th>Allocated</th>
                            <th>Expenditure</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx}>
                              <td>{row.house_type || row.House_Type || 'LOK'}</td>
                              <td>{row.state_name || row.State || '-'}</td>
                              <td>{row.constituency_name || row.Constituency || '-'}</td>
                              <td>{row.mp_name || row.MP_Name || '-'}</td>
                              <td>{row.category || row.Category || '-'}</td>
                              <td className="amount">₹{Number(row.allocated_amount || row.Sanctioned_Amount || 0).toLocaleString()}</td>
                              <td className="amount">₹{Number(row.expenditure_amt || row.Expenditure || 0).toLocaleString()}</td>
                              <td>{row.work_status || row.Status || 'On Going'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Officer Declaration: All data in the uploaded sheet must reflect official Sanction Orders.
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={!selectedFile || uploading}
                    onClick={handleUploadExcel}
                    style={{ padding: '0.75rem 2rem', fontSize: '0.92rem' }}
                  >
                    {uploading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={18} />}
                    <span>{uploading ? 'Parsing & Running 11-Rule AI Audit…' : 'Ingest Spreadsheet & Score All Works'}</span>
                  </button>
                </div>

                {/* Upload Error */}
                {uploadError && (
                  <div style={{ marginTop: '1rem', padding: '0.85rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.85rem' }}>
                    <strong>Upload Error:</strong> {uploadError}
                  </div>
                )}
              </div>

              {/* Upload Success Results Card */}
              {uploadResult && (
                <div
                  className="card"
                  style={{
                    border: '1px solid rgba(34, 197, 94, 0.4)',
                    background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(15, 30, 25, 0.9))',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#22c55e', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        <CheckCircle2 size={16} />
                        BATCH INGESTION COMPLETED SUCCESSFULLY
                      </div>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0.2rem 0' }}>
                        {uploadResult.total_uploaded} MPLADS Works Ingested into National Surveillance
                      </h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {uploadResult.message}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="kpi-tile" style={{ padding: '0.75rem 1.25rem', minWidth: 140 }}>
                        <div className="kpi-label">Works Flagged</div>
                        <div className="kpi-value small" style={{ color: uploadResult.high_risk_count > 0 ? 'var(--risk-critical)' : 'var(--risk-low)' }}>
                          {uploadResult.high_risk_count}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Table of Ingested Projects */}
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Location</th>
                          <th>Hon'ble MP</th>
                          <th>Allocated</th>
                          <th>Disbursed</th>
                          <th>Status</th>
                          <th>Risk Band</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(uploadResult.projects || []).slice(0, 10).map((p: any) => (
                          <tr key={p.project_id}>
                            <td><strong>#{p.project_id}</strong></td>
                            <td>
                              <div>{p.state_name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.constituency_name}</div>
                            </td>
                            <td>{p.mp_name}</td>
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

                  {uploadResult.projects && uploadResult.projects.length > 10 && (
                    <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Showing first 10 projects. All {uploadResult.total_uploaded} projects are now active across the High-Risk Queue and National Overview.
                    </div>
                  )}
                </div>
              )}

              {/* Predefined Columns Specification Guide - One Sample Format */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Table size={18} color="var(--accent-teal)" />
                    <span>Predefined Excel Column Format &amp; Sample Row</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Column headers are case-insensitive and mapped automatically
                  </div>
                </div>

                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Ensure your Excel (.xlsx, .xls) or CSV spreadsheet includes the standard columns as shown in this sample format:
                </div>

                <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.75rem' }}>
                    <thead>
                      <tr>
                        <th>house_type</th>
                        <th>state_name</th>
                        <th>constituency_name</th>
                        <th>mp_name</th>
                        <th>category</th>
                        <th>ida_name</th>
                        <th>allocated_amount</th>
                        <th>expenditure_amt</th>
                        <th>work_status</th>
                        <th>recommended_date</th>
                        <th>letter_no</th>
                        <th>block_name</th>
                        <th>village_name</th>
                        <th>location_type</th>
                        <th>work_description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code style={{ color: '#38bdf8', fontWeight: 700 }}>LOK</code></td>
                        <td><strong>ANDHRA PRADESH</strong></td>
                        <td><strong>VISAKHAPATNAM</strong></td>
                        <td>HONBLE MP VISAKHAPATNAM</td>
                        <td>Drinking Water &amp; Sanitation</td>
                        <td>District Collectorate Visakhapatnam</td>
                        <td className="amount" style={{ color: 'var(--accent-teal)', fontWeight: 800 }}>5000000</td>
                        <td className="amount">1200000</td>
                        <td><span style={{ color: '#38bdf8', fontWeight: 700 }}>On Going</span></td>
                        <td>2024-06-15</td>
                        <td>MPLADS/VIS/2024/001</td>
                        <td>Anandapuram</td>
                        <td>Boni</td>
                        <td>Rural</td>
                        <td style={{ minWidth: 200 }}>Installation of community RO water purification plant</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────── */}
          {/* TAB 2: SINGLE WORK ENTRY FORM                                            */}
          {/* ──────────────────────────────────────────────────────────────────────── */}
          {activeTab === 'single' && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <FilePlus2 size={22} color="var(--accent-blue)" />
                <div className="card-title" style={{ margin: 0 }}>
                  Single Project Registration &amp; Instant Risk Scoring
                </div>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '1.5rem' }}>
                Register one project at a time matching the signed Sanction Order.
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
                    BLOCK / TALUKA &amp; VILLAGE
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
                    placeholder="e.g. District Collectorate &amp; Magistrate"
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
                    <option value="On Going">On Going (Sanctioned &amp; In Progress)</option>
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
                    <span>{submitting ? 'Running Multi-Tier Anomaly Engine…' : 'Register Project &amp; Execute Risk Scoring'}</span>
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
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
