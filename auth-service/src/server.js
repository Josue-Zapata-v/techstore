// ================================================================
// Entry point del Auth Service
// ================================================================
import express        from 'express'
import helmet         from 'helmet'
import rateLimit      from 'express-rate-limit'
import dotenv         from 'dotenv'
import authRoutes     from './routes/auth.routes.js'

dotenv.config()

const app  = express()
const PORT = process.env.PORT || 3001

// ── Seguridad global ─────────────────────────────────────────────
app.use(helmet())
app.use(express.json({ limit: '10kb' }))

// Rate limiting global
// Caso → Login: protección contra fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutos
  max:      100,
  message:  { success: false, message: 'Demasiadas solicitudes, intenta más tarde' }
})
app.use(limiter)

// Rate limiting estricto solo para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Demasiados intentos de login' }
})
app.use('/api/auth/login', loginLimiter)

// ── Rutas ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ service: 'auth-service', status: 'ok', timestamp: new Date().toISOString() })
})

// ── 404 ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' })
})

app.listen(PORT, () => {
  console.log(`🔐 [Auth Service] corriendo en puerto ${PORT}`)
})
