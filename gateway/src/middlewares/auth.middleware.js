// ================================================================
// Caso → Fase 1: Middleware de autenticación global
// El Gateway valida el JWT aquí y los servicios confían en
// los headers internos x-user-* que este middleware inyecta
// ================================================================
import jwt from 'jsonwebtoken'

const PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/auth/register' },
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/mfa/verify' },
  { method: 'POST', path: '/api/auth/mfa/setup/confirm' },
  { method: 'GET',  path: '/api/auth/mfa/setup' },
  { method: 'GET',  path: '/api/auth/tiendas' },
  { method: 'GET',  path: '/health' },
]

function isPublicRoute(method, path) {
  return PUBLIC_ROUTES.some(
    r => r.method === method && path.startsWith(r.path)
  )
}

export function authMiddleware(req, res, next) {
  // Rutas públicas no requieren token
  if (isPublicRoute(req.method, req.path)) {
    return next()
  }

  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Rechazar tempTokens (solo sirven para /mfa/verify)
    if (decoded.mfaPending) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación MFA pendiente'
      })
    }

    // Inyectar datos del usuario como headers internos
    // Los microservicios leen estos headers en lugar de re-validar JWT
    req.headers['x-user-id']       = String(decoded.userId)
    req.headers['x-user-email']    = decoded.email
    req.headers['x-user-rol']      = decoded.rol
    req.headers['x-user-tienda']   = String(decoded.tiendaId || '')
    req.headers['x-user-nombre']   = decoded.nombreCompleto

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    })
  }
}
