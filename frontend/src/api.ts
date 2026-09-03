import type {
  NationalOverviewData,
  StateSummary,
  ProjectSummary,
  ProjectDetail,
  AuditCaseData,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const urlsToTry = [
    API_BASE ? `${API_BASE}${endpoint}` : endpoint,
    `http://127.0.0.1:8000${endpoint}`,
    `http://localhost:8000${endpoint}`,
  ];
  const uniqueUrls = Array.from(new Set(urlsToTry.filter(Boolean)));

  let lastError: any = null;
  for (const url of uniqueUrls) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 404) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Project Not Found (404)`);
      }
      lastError = new Error(`API error (${res.status}): ${res.statusText}`);
    } catch (err: any) {
      lastError = err;
      if (err.message && err.message.includes('404')) {
        throw err;
      }
    }
  }
  throw lastError || new Error(`Failed to fetch from ${endpoint}`);
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
    const urlsToTry = [
      API_BASE ? `${API_BASE}/api/projects/upload-excel` : '/api/projects/upload-excel',
      'http://127.0.0.1:8000/api/projects/upload-excel',
      'http://localhost:8000/api/projects/upload-excel',
    ];
    const uniqueUrls = Array.from(new Set(urlsToTry.filter(Boolean)));
    let lastError: any = null;
    for (const url of uniqueUrls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          return await res.json();
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Upload error (${res.status}): ${res.statusText}`);
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error('Upload failed');
  },

  getTemplateDownloadUrl: () => (API_BASE ? `${API_BASE}/api/projects/template/download` : '/api/projects/template/download'),
};



