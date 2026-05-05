// ================================================================
// Llamadas al Product Service vía Gateway
// ================================================================
import axiosClient from './axiosClient.js'

export const productsApi = {
  getAll:     ()       => axiosClient.get('/products'),
  getById:    (id)     => axiosClient.get(`/products/${id}`),
  create:     (data)   => axiosClient.post('/products', data),
  update:     (id, data) => axiosClient.put(`/products/${id}`, data),
  delete:     (id)     => axiosClient.delete(`/products/${id}`),
  getAudit:   ()       => axiosClient.get('/products/audit'),
}
