import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token management (synchrone, lit le store via fonctions injectées) ──
let getAccessToken = () => null;
let getRefreshToken = () => null;
let onTokensRefreshed = () => {};
let onLogout = () => {};
let onPasswordChangeRequired = () => {};

export function configureApi(opts) {
  getAccessToken = opts.getAccessToken ?? getAccessToken;
  getRefreshToken = opts.getRefreshToken ?? getRefreshToken;
  onTokensRefreshed = opts.onTokensRefreshed ?? onTokensRefreshed;
  onLogout = opts.onLogout ?? onLogout;
  onPasswordChangeRequired = opts.onPasswordChangeRequired ?? onPasswordChangeRequired;
}

// ── Request interceptor : injecte le Bearer ─────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor : gère le 401 avec refresh automatique ─────
let isRefreshing = false;
let queue = [];

const resolveQueue = (token, error) => {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // Server says this account must change its password before any app use.
    if (error.response?.status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      onPasswordChangeRequired();
      return Promise.reject(error);
    }
    if (!original || original._retry || error.response?.status !== 401) {
      return Promise.reject(error);
    }
    // Pas de refresh pour les endpoints d'auth eux-mêmes
    if (original.url?.includes('/api/auth/login') ||
        original.url?.includes('/api/auth/refresh')) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    try {
      const refresh = getRefreshToken();
      if (!refresh) throw new Error('No refresh token');
      const resp = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken: refresh });
      const { accessToken, refreshToken: newRefresh } = resp.data;
      onTokensRefreshed({ accessToken, refreshToken: newRefresh });
      resolveQueue(accessToken, null);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (err) {
      resolveQueue(null, err);
      onLogout();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Helpers REST ─────────────────────────────────────────────────────

export const authApi = {
  login: (body) => api.post('/api/auth/login', body),
  logout: (refreshToken) => api.post('/api/auth/logout', { refreshToken }),
  // Returns { accessToken, refreshToken, user } so the caller can refresh its session.
  changePassword: (currentPassword, newPassword) =>
    api.put('/api/auth/change-password', { currentPassword, newPassword }),
  deleteAccount: () => api.delete('/api/auth/account'),
};

export const adminApi = {
  overview: () => api.get('/api/admin/overview'),
  users: () => api.get('/api/admin/users'),
  userProjects: (userId) => api.get(`/api/admin/users/${userId}/projects`),
  project: (projectId) => api.get(`/api/admin/projects/${projectId}`),
  createUser: (body) => api.post('/api/admin/users', body),
  resetPassword: (userId, password) => api.put(`/api/admin/users/${userId}/password`, { password }),
  deleteUser: (userId) => api.delete(`/api/admin/users/${userId}`),
};

export const userApi = {
  me: () => api.get('/api/users/me'),
  update: (body) => api.put('/api/users/me', body),
};

export const projectApi = {
  list: () => api.get('/api/projects'),
  create: (body) => api.post('/api/projects', body),
  get: (id) => api.get(`/api/projects/${id}`),
  update: (id, body) => api.patch(`/api/projects/${id}`, body),
  remove: (id) => api.delete(`/api/projects/${id}`),
  getOnboarding: (id) => api.get(`/api/projects/${id}/onboarding`),
  updateOnboarding: (id, patch) => api.put(`/api/projects/${id}/onboarding`, patch),
  launchAnalysis: (id, payload) => api.post(`/api/projects/${id}/analyze`, payload),
  continueAnalysis: (id) => api.post(`/api/projects/${id}/analyze/continue`),
  continueFromDiagnostic: (id) => api.post(`/api/projects/${id}/analyze/continue-diagnostic`),
  cancelAnalysis: (id) => api.post(`/api/projects/${id}/analyze/cancel`),
};

export const agentApi = {
  list: (projectId) => api.get(`/api/projects/${projectId}/agents`),
  get: (projectId, agentId) => api.get(`/api/projects/${projectId}/agents/${agentId}`),
  updateOutput: (projectId, agentId, output) =>
    api.put(`/api/projects/${projectId}/agents/${agentId}/output`, output),
  retry: (projectId, agentId) =>
    api.post(`/api/projects/${projectId}/agents/${agentId}/retry`),
  regenerate: (projectId, agentId) =>
    api.post(`/api/projects/${projectId}/agents/${agentId}/regenerate`),
  rederiveStale: (projectId) =>
    api.post(`/api/projects/${projectId}/agents/rederive-stale`),
  resume: (projectId) =>
    api.post(`/api/projects/${projectId}/agents/resume`),
  versions: (projectId, agentId) =>
    api.get(`/api/projects/${projectId}/agents/${agentId}/versions`),
};

export const exportApi = {
  download: (projectId, type) =>
    api.post(`/api/projects/${projectId}/export/${type}`, {}, { responseType: 'blob' }),
};

export const financeApi = {
  get: (projectId) => api.get(`/api/projects/${projectId}/finance`),
  update: (projectId, data) => api.put(`/api/projects/${projectId}/finance`, data),
  benchmark: (projectId, { sector, companySize, geography = 'FR', metric }) =>
    api.get(`/api/projects/${projectId}/finance/benchmark`, {
      params: { sector, companySize, geography, metric },
    }),
};

export const documentApi = {
  list: (projectId) => api.get(`/api/projects/${projectId}/documents`),
  upload: (projectId, file, docType) => {
    const form = new FormData();
    form.append('file', file);
    if (docType) form.append('docType', docType);
    return api.post(`/api/projects/${projectId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (projectId, docId) =>
    api.delete(`/api/projects/${projectId}/documents/${docId}`),
};

export const citationApi = {
  list: (projectId) => api.get(`/api/projects/${projectId}/citations`),
  create: (projectId, citation) =>
    api.post(`/api/projects/${projectId}/citations`, citation),
};

export default api;
