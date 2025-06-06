import apiClient from '../config/api';

const API_BASE = '/api';

export const userAPI = {
  getAll: () => apiClient.get(`${API_BASE}/users`),
  create: (formData) => apiClient.post(`${API_BASE}/users/register`, formData),
  update: (id, formData) => apiClient.put(`${API_BASE}/users/${id}`, formData),
  delete: (id) => apiClient.delete(`${API_BASE}/users/${id}`)
};

export const rosterAPI = {
  getRange: (startDate, endDate) => 
    apiClient.get(`${API_BASE}/roster/range?startDate=${startDate}&endDate=${endDate}`),
  create: (data) => apiClient.post(`${API_BASE}/roster`, data),
  update: (id, data) => apiClient.put(`${API_BASE}/roster/${id}`, data),
  delete: (id) => apiClient.delete(`${API_BASE}/roster/${id}`)
};

export const issuesAPI = {
  create: (formData) => apiClient.post(`${API_BASE}/issues`, formData),
  getByDate: (date) => apiClient.get(`${API_BASE}/issues/date/${date}`),
  getRange: (startDate, endDate) => 
    apiClient.get(`${API_BASE}/issues/range?startDate=${startDate}&endDate=${endDate}`),
  getById: (id) => apiClient.get(`${API_BASE}/issues/${id}`),
  updateStatus: (id, status) => apiClient.put(`${API_BASE}/issues/${id}/status`, { status }),
  getComments: (id) => apiClient.get(`${API_BASE}/issues/${id}/comments`),
  addComment: (id, formData) => apiClient.post(`${API_BASE}/issues/${id}/comments`, formData),
  addReaction: (id, commentId, reactionType) => 
    apiClient.post(`${API_BASE}/issues/${id}/comments/${commentId}/reactions`, { reactionType }),
  removeReaction: (id, commentId, reactionType) => 
    apiClient.delete(`${API_BASE}/issues/${id}/comments/${commentId}/reactions/${reactionType}`)
};

export default apiClient;