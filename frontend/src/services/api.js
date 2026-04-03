import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lq_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth store ────────────────────────────────────────────────────────────────
export const useAuthStore = create(persist((set) => ({
  user: null,
  token: null,
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('lq_token', data.token);
    set({ user: data.user, token: data.token });
    return data;
  },
  logout: () => {
    localStorage.removeItem('lq_token');
    set({ user: null, token: null });
  },
}), { name: 'lq_auth', partialize: (s) => ({ user: s.user, token: s.token }) }));

// ── API helpers ───────────────────────────────────────────────────────────────
export const requestsApi = {
  getAll: (params) => api.get('/requests', { params }).then(r => r.data),
  create: (data) => api.post('/requests', data).then(r => r.data),
  setPriority: (id, priority) => api.patch(`/requests/${id}/priority`, { priority }).then(r => r.data),
  setStatus: (id, status, fulfilled_quantity) => api.patch(`/requests/${id}/status`, { status, fulfilled_quantity }).then(r => r.data),
  allocate: (id) => api.post(`/requests/${id}/allocate`).then(r => r.data),
};

export const stockApi = {
  getAll: () => api.get('/stock').then(r => r.data),
  getWarehouses: () => api.get('/stock/warehouses').then(r => r.data),
  getResources: () => api.get('/stock/resources').then(r => r.data),
  getDeliveryPoints: () => api.get('/stock/delivery-points').then(r => r.data),
  getStats: () => api.get('/stock/stats').then(r => r.data),
  getNearest: (params) => api.get('/stock/nearest', { params }).then(r => r.data),
  update: (warehouse_id, resource_id, data) => api.patch(`/stock/${warehouse_id}/${resource_id}`, data).then(r => r.data),
};
