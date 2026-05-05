// ================================================================
// Llamadas al Auth Service vía Gateway
// ================================================================
import axiosClient from './axiosClient.js'

export const authApi = {
  register: (data)      => axiosClient.post('/auth/register', data),
  login:    (data)      => axiosClient.post('/auth/login', data),
  verifyMfa:(data)      => axiosClient.post('/auth/mfa/verify', data),
  confirmMfaSetup:(data)=> axiosClient.post('/auth/mfa/setup/confirm', data),
  getMe:    ()          => axiosClient.get('/auth/me'),
}
