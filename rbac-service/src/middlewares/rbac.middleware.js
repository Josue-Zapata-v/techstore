// ================================================================
// Caso → Fase 2: Middleware para verificar roles
// Lee headers internos inyectados por el Gateway
// Cubre: proteger endpoints según roles definidos en el caso
// ================================================================

// Verifica que el usuario tenga al menos uno de los roles requeridos
// Uso: router.post('/roles', requireRole('Admin'), controller)
export function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    const userRol = req.headers['x-user-rol']

    if (!userRol) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      })
    }

    if (!rolesPermitidos.includes(userRol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}. Tu rol actual: ${userRol}`
      })
    }

    next()
  }
}

// Extrae y adjunta datos del usuario desde headers del Gateway
export function extractUser(req, _res, next) {
  req.userId       = parseInt(req.headers['x-user-id'])    || null
  req.userEmail    = req.headers['x-user-email']           || null
  req.userRol      = req.headers['x-user-rol']             || null
  req.userTiendaId = parseInt(req.headers['x-user-tienda']) || null
  req.userNombre   = req.headers['x-user-nombre']          || null
  next()
}
