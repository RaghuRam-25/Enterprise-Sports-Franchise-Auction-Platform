import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Request interceptor – attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle 401 token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${BACKEND_URL}/api/auth/refresh-token`, { refreshToken });
          if (res.data?.token) {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
            return axios(originalRequest);
          }
        }
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  refreshToken: (token) => api.post('/auth/refresh-token', { refreshToken: token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ─── Admin Configuration ──────────────────────────────────────────────────────
export const adminAPI = {
  getSessions: () => api.get('/admin/sessions'),
  createSession: (data) => api.post('/admin/sessions', data),
  deleteSession: (id) => api.delete(`/admin/sessions/${id}`),

  getPositions: () => api.get('/admin/positions'),
  createPosition: (data) => api.post('/admin/positions', data),
  deletePosition: (id) => api.delete(`/admin/positions/${id}`),

  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  getBiddingTiers: () => api.get('/admin/bidding-tiers'),
  updateBiddingTier: (id, data) => api.put(`/admin/bidding-tiers/${id}`, data),

  getTeams: () => api.get('/admin/teams'),
  createTeam: (data) => api.post('/admin/teams', data),

  getManagers: () => api.get('/admin/managers'),
  createManager: (data) => api.post('/admin/managers', data),
};

// ─── Players ──────────────────────────────────────────────────────────────────
export const playerAPI = {
  register: (formData) => api.post('/players/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => api.get('/players', { params }),
  getRegistrationStatus: () => api.get('/players/status'),
  withdraw: (id) => api.put(`/players/${id}/withdraw`),
  toggleFreeze: () => api.post('/players/toggle-freeze'),
};

// ─── Podium (Auction Control) ─────────────────────────────────────────────────
export const podiumAPI = {
  getState: () => api.get('/podium/state'),
  launchPlayer: (data) => api.post('/podium/launch-player', data),
  pause: () => api.post('/podium/pause'),
  resume: () => api.post('/podium/resume'),
  rollback: () => api.post('/podium/rollback'),
  cancel: () => api.post('/podium/cancel'),
  forceSell: () => api.post('/podium/force-sell'),
};