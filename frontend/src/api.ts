import type {
  NationalOverviewData,
  StateSummary,
  ProjectSummary,
  ProjectDetail,
  AuditCaseData,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error (${res.status}): ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  getOverview: () => fetchJson<NationalOverviewData>('/api/dashboard/overview'),
  getStates: () => fetchJson<{ states: StateSummary[]; total_states: number }>('/api/dashboard/states'),
  getStateDetail: (state: string) => fetchJson<any>(`/api/dashboard/state/${encodeURIComponent(state)}`),
  
  getProjects: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        q.append(k, String(v));
      }
    });
    return fetchJson<{ total: number; page: number; page_size: number; projects: ProjectSummary[] }>(
      `/api/projects?${q.toString()}`
    );
  },

  getProjectDetail: (id: number | string) => fetchJson<ProjectDetail>(`/api/projects/${id}`),
  getProjectExplanation: (id: number | string) => fetchJson<any>(`/api/projects/${id}/explanation`),
  generateAuditCase: (id: number | string) =>
    fetchJson<AuditCaseData>(`/api/projects/${id}/audit-case`, { method: 'POST' }),

  getHighRisk: (limit: number = 50) =>
    fetchJson<{ total_high_risk: number; showing: number; projects: ProjectSummary[] }>(
      `/api/anomalies/high-risk?limit=${limit}`
    ),

  nlSearch: (query: string) =>
    fetchJson<any>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  getMPAnalytics: (mpName: string) =>
    fetchJson<any>(`/api/analytics/mp/${encodeURIComponent(mpName)}`),

  getMPsList: () =>
    fetchJson<{ mps: Array<{ mp_name: string; state: string; constituency: string; total_projects: number; avg_risk_score: number }> }>('/api/analytics/mps'),

  getTrends: () => fetchJson<{ trends: any[] }>('/api/analytics/trends'),
  getFilterStates: () => fetchJson<{ states: string[] }>('/api/filters/states'),
  getFilterConstituencies: (state: string) =>
    fetchJson<{ constituencies: string[] }>(`/api/filters/constituencies/${encodeURIComponent(state)}`),

  submitProject: (data: any) =>
    fetchJson<any>('/api/projects/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadExcelProjects: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/projects/upload-excel`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Upload error (${res.status}): ${res.statusText}`);
    }
    return res.json();
  },

  getTemplateDownloadUrl: () => `${API_BASE}/api/projects/template/download`,
};


