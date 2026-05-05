// ================================================================
// Caso → Fase 1: Middleware de autenticación
// Verifica JWT completo (no tempToken) en rutas protegidas
// ================================================================
import { verifyToken } from '../utils/jwt.utils.js'

export function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyToken(token)

    // Rechazar tempTokens en rutas que requieren acceso completo
    if (decoded.mfaPending) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación MFA pendiente. Completa la verificación.'
      })
    }

    // Inyectar datos del usuario en el request
    req.userId   = decoded.userId
    req.userEmail = decoded.email
    req.userRol  = decoded.rol
    req.tiendaId = decoded.tiendaId

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    })
  }
}
