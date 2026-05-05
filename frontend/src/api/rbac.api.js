// ================================================================
// Llamadas al RBAC Service vía Gateway
// ================================================================
import axiosClient from './axiosClient.js'

export const rolesApi = {
  getAll:  ()        => axiosClient.get('/roles'),
  getById: (id)      => axiosClient.get(`/roles/${id}`),
  create:  (data)    => axiosClient.post('/roles', data),
  update:  (id, data)=> axiosClient.put(`/roles/${id}`, data),
  delete:  (id)      => axiosClient.delete(`/roles/${id}`),
}

export const usersApi = {
  getAll:      ()          => axiosClient.get('/users'),
  getById:     (id)        => axiosClient.get(`/users/${id}`),
  create:      (data)      => axiosClient.post('/users', data),
  update:      (id, data)  => axiosClient.put(`/users/${id}`, data),
  delete:      (id)        => axiosClient.delete(`/users/${id}`),
  assignRole:  (id, rolId) => axiosClient.post(`/users/${id}/roles`, { rolId }),
  removeRole:  (id, rolId) => axiosClient.delete(`/users/${id}/roles/${rolId}`),
}
