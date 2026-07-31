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

// ─── Public Config (no auth required) ─────────────────────────────────────────
export const configAPI = {
  getSessions: () => api.get('/config/sessions'),
  getPositions: () => api.get('/config/positions'),
  getCategories: () => api.get('/config/categories'),
  getBiddingTiers: () => api.get('/config/bidding-tiers'),
  getTeams: () => api.get('/config/teams'),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  refreshToken: (token) => api.post('/auth/refresh-token', { refreshToken: token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ─── Admin Configuration (SUPER_ADMIN only) ───────────────────────────────────
export const adminAPI = {
  // Sessions
  getSessions: () => api.get('/admin/sessions'),
  createSession: (data) => api.post('/admin/sessions', data),
  deleteSession: (id) => api.delete(`/admin/sessions/${id}`),

  // Positions
  getPositions: () => api.get('/admin/positions'),
  createPosition: (data) => api.post('/admin/positions', data),
  deletePosition: (id) => api.delete(`/admin/positions/${id}`),

  // Categories
  getCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  // Bidding Tiers
  getBiddingTiers: () => api.get('/admin/bidding-tiers'),
  createBiddingTier: (data) => api.post('/admin/bidding-tiers', data),
  updateBiddingTier: (id, data) => api.put(`/admin/bidding-tiers/${id}`, data),
  deleteBiddingTier: (id) => api.delete(`/admin/bidding-tiers/${id}`),

  // Teams — CRUD
  getTeams: () => api.get('/admin/teams'),
  createTeam: (data) => api.post('/admin/teams', data),
  editTeam: (id, data) => api.put(`/admin/teams/${id}`, data),
  deleteTeam: (id) => api.delete(`/admin/teams/${id}`),

  // Managers & Podium Admins
  getManagers: () => api.get('/admin/managers'),
  createManager: (data) => api.post('/admin/managers', data),
  editManager: (id, data) => api.put(`/admin/managers/${id}`, data),
  deleteManager: (id) => api.delete(`/admin/managers/${id}`),
  resetManagerPassword: (id, data) => api.put(`/admin/managers/${id}/reset-password`, data),
  updateManagerRequest: (id, action) => api.put(`/admin/managers/${id}/request`, { action }),
  createPodiumAdmin: (data) => api.post('/admin/podium-admins', data),

  // Player Management
  getPlayers: (params) => api.get('/admin/players', { params }),
  editPlayer: (id, data) => api.put(`/admin/players/${id}`, data),
  approvePlayer: (id) => api.put(`/admin/players/${id}/approve`),
  banPlayer: (id) => api.put(`/admin/players/${id}/ban`),

  // Reports
  getReports: () => api.get('/admin/reports'),
  exportReports: () => api.get('/admin/reports/export'),
};

// ─── Players (Public + Player self-service) ────────────────────────────────────
export const playerAPI = {
  register: (formData) => api.post('/players/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => api.get('/players', { params }),
  getMyProfile: () => api.get('/players/me'),
  getRegistrationStatus: () => api.get('/players/status'),
  withdraw: (id) => api.put(`/players/${id}/withdraw`),
  updateProfile: (id, formData) => api.put(`/players/${id}/profile`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  toggleFreeze: () => api.post('/players/toggle-freeze'),
};

// ─── Manager (TEAM_MANAGER + SUPER_ADMIN) ─────────────────────────────────────
export const managerAPI = {
  getTeam: () => api.get('/manager/team'),
  updateTeam: (formData) => api.put('/manager/team', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getBudget: () => api.get('/manager/budget'),
  // GAP 8 FIX: roster endpoint added
  getRoster: () => api.get('/manager/roster'),
  getHistory: () => api.get('/manager/history'),
  placeBid: (data) => api.post('/manager/bid', data),
  placeBlindBid: (data) => api.post('/manager/blind-bid', data),
  changePassword: (data) => api.put('/manager/password', data),
};

// ─── Podium (Auction Control — PODIUM_ADMIN + SUPER_ADMIN) ────────────────────
export const podiumAPI = {
  getState: () => api.get('/podium/state'),
  getAvailablePlayers: () => api.get('/podium/players'),
  launchPlayer: (data) => api.post('/podium/launch-player', data),
  selectUnsold: (data) => api.post('/podium/select-unsold', data),
  moveNext: () => api.post('/podium/move-next'),
  declareWinner: () => api.post('/podium/declare-winner'),
  pause: () => api.post('/podium/pause'),
  resume: () => api.post('/podium/resume'),
  rollback: () => api.post('/podium/rollback'),
  cancel: () => api.post('/podium/cancel'),
  forceSell: () => api.post('/podium/force-sell'),
};