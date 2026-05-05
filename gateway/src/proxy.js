// ================================================================
// Caso → Arquitectura: enrutamiento del Gateway a microservicios
// Patrón: Gateway valida JWT → inyecta headers → proxy al servicio
// ================================================================
import proxy from 'express-http-proxy'

// Helper: construye opciones de proxy con headers de usuario
function buildProxyOptions(serviceUrl) {
  return {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      // Pasar headers internos de usuario al microservicio
      proxyReqOpts.headers['x-user-id']     = srcReq.headers['x-user-id']     || ''
      proxyReqOpts.headers['x-user-email']  = srcReq.headers['x-user-email']  || ''
      proxyReqOpts.headers['x-user-rol']    = srcReq.headers['x-user-rol']    || ''
      proxyReqOpts.headers['x-user-tienda'] = srcReq.headers['x-user-tienda'] || ''
      proxyReqOpts.headers['x-user-nombre'] = srcReq.headers['x-user-nombre'] || ''
      // Pasar IP real para audit log
      proxyReqOpts.headers['x-forwarded-for'] = srcReq.ip
      return proxyReqOpts
    },
    userResDecorator: (_proxyRes, proxyResData) => proxyResData,
    proxyErrorHandler: (err, res, next) => {
      console.error(`[Gateway] Error de proxy hacia ${serviceUrl}:`, err.message)
      res.status(502).json({
        success: false,
        message: 'Servicio temporalmente no disponible'
      })
    }
  }
}

export function setupProxies(app) {
  const AUTH_URL    = process.env.AUTH_SERVICE_URL
  const RBAC_URL    = process.env.RBAC_SERVICE_URL
  const PRODUCT_URL = process.env.PRODUCT_SERVICE_URL

  // ── Auth Service → /api/auth/* ───────────────────────────────
  app.use('/api/auth', proxy(AUTH_URL, buildProxyOptions(AUTH_URL)))

  // ── RBAC Service → /api/roles/* y /api/users/* ───────────────
  app.use('/api/roles', proxy(RBAC_URL, buildProxyOptions(RBAC_URL)))
  app.use('/api/users', proxy(RBAC_URL, buildProxyOptions(RBAC_URL)))

  // ── Product Service → /api/products/* ────────────────────────
  app.use('/api/products', proxy(PRODUCT_URL, buildProxyOptions(PRODUCT_URL)))
}
