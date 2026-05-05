// ================================================================
// Middleware de rol simple para rutas que no necesitan ABAC completo
// ================================================================
export function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    const userRol = req.user?.rol

    if (!userRol) {
      return res.status(401).json({ success: false, message: 'No autenticado' })
    }

    if (!rolesPermitidos.includes(userRol)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}`
      })
    }
    next()
  }
}
