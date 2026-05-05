// ================================================================
// Entry point del API Gateway
// Responsabilidades: CORS, rate limiting, auth JWT, proxy
// ================================================================
import express   from 'express'
import helmet    from 'helmet'
import cors      from 'cors'
import dotenv    from 'dotenv'
import { authMiddleware }               from './middlewares/auth.middleware.js'
import { globalLimiter, authLimiter }   from './middlewares/rateLimit.middleware.js'
import { setupProxies }                 from './proxy.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3000

// ── Seguridad ────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin:      'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// ── Rate limiting ────────────────────────────────────────────────
app.use(globalLimiter)
app.use('/api/auth', authLimiter)

// ── Parseo de body (antes del proxy) ────────────────────────────
app.use(express.json({ limit: '10kb' }))

// ── Health check del Gateway ─────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    service:   'api-gateway',
    status:    'ok',
    timestamp: new Date().toISOString(),
    services: {
      auth:    process.env.AUTH_SERVICE_URL,
      rbac:    process.env.RBAC_SERVICE_URL,
      product: process.env.PRODUCT_SERVICE_URL
    }
  })
})

// ── Middleware JWT global (antes del proxy) ──────────────────────
app.use(authMiddleware)

// ── Proxies hacia microservicios ─────────────────────────────────
setupProxies(app)

// ── 404 ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada en el Gateway' })
})

app.listen(PORT, () => {
  console.log(`🌐 [API Gateway] corriendo en puerto ${PORT}`)
})
