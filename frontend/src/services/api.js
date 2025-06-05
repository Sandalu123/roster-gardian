import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true
});

export const userAPI = {
  getAll: () => API.get('/users'),
  create: (formData) => API.post('/users/register', formData),
  update: (id, formData) => API.put(`/users/${id}`, formData),
  delete: (id) => API.delete(`/users/${id}`)
};

export const rosterAPI = {
  getRange: (startDate, endDate) => 
    API.get(`/roster/range?startDate=${startDate}&endDate=${endDate}`),
  create: (data) => API.post('/roster', data),
  update: (id, data) => API.put(`/roster/${id}`, data),
  delete: (id) => API.delete(`/roster/${id}`)
};

export const issuesAPI = {
  create: (formData) => API.post('/issues', formData),
  getByDate: (date) => API.get(`/issues/date/${date}`),
  getRange: (startDate, endDate) => 
    API.get(`/issues/range?startDate=${startDate}&endDate=${endDate}`),
  getById: (id) => API.get(`/issues/${id}`),
  updateStatus: (id, status) => API.put(`/issues/${id}/status`, { status }),
  getComments: (id) => API.get(`/issues/${id}/comments`),
  addComment: (id, formData) => API.post(`/issues/${id}/comments`, formData),
  addReaction: (id, commentId, reactionType) => 
    API.post(`/issues/${id}/comments/${commentId}/reactions`, { reactionType }),
  removeReaction: (id, commentId, reactionType) => 
    API.delete(`/issues/${id}/comments/${commentId}/reactions/${reactionType}`)
};

export default API;
