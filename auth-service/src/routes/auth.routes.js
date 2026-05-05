// ================================================================
// Caso → Fase 1: Endpoints de autenticación con validaciones
// Cubre: Registro, Login, MFA Setup, MFA Verify, Me
// ================================================================
import { Router }           from 'express'
import { body, validationResult } from 'express-validator'
import pool                      from '../config/db.js'
import {
  register,
  confirmMfaSetup,
  login,
  verifyMfa,
  getMe, getMfaSetup
} from '../controllers/auth.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'

const router = Router()

// Helper: captura errores de express-validator y responde 400
function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg }))
    })
  }
  next()
}

// ── POST /api/auth/register ──────────────────────────────────────
// Caso → Registro: email único, contraseña segura, nombre, tienda
router.post('/register',
  [
    body('email')
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
      .matches(/[A-Z]/).withMessage('Al menos una mayúscula')
      .matches(/[0-9]/).withMessage('Al menos un número')
      .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
      .withMessage('Al menos un carácter especial'),
    body('nombreCompleto')
      .trim()
      .isLength({ min: 3, max: 150 }).withMessage('Nombre entre 3 y 150 caracteres'),
    body('tiendaId')
      .optional()
      .isInt({ min: 1 }).withMessage('tiendaId debe ser un número entero positivo')
  ],
  validate,
  register
)

// ── POST /api/auth/mfa/setup/confirm ────────────────────────────
// Activa MFA tras escanear QR con Google Authenticator
router.post('/mfa/setup/confirm',
  [
    body('userId')
      .isInt({ min: 1 }).withMessage('userId inválido'),
    body('totpCode')
      .isLength({ min: 6, max: 6 }).withMessage('Código de 6 dígitos requerido')
      .isNumeric().withMessage('El código debe ser numérico')
  ],
  validate,
  confirmMfaSetup
)

// ── POST /api/auth/login ─────────────────────────────────────────
// Caso → Login básico con manejo de intentos fallidos
router.post('/login',
  [
    body('email')
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Contraseña requerida')
  ],
  validate,
  login
)

// ── POST /api/auth/mfa/verify ────────────────────────────────────
// Caso → Flujo MFA: verificar código TOTP de Google Authenticator
router.post('/mfa/verify',
  [
    body('tempToken')
      .notEmpty().withMessage('Token temporal requerido'),
    body('totpCode')
      .isLength({ min: 6, max: 6 }).withMessage('Código de 6 dígitos requerido')
      .isNumeric().withMessage('El código debe ser numérico')
  ],
  validate,
  verifyMfa
)

// ── GET /api/auth/me ─────────────────────────────────────────────
// Requiere JWT completo (no tempToken)
router.get('/me', authMiddleware, getMe)
router.get('/mfa/setup/:userId', getMfaSetup)

// ── GET /api/auth/tiendas ────────────────────────────────────────
// Público: lista tiendas para el formulario de registro
router.get('/tiendas', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, ciudad FROM public.tiendas WHERE activo = true ORDER BY id'
    )
    res.json({ success: true, data: result.rows })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno' })
  }
})

export default router
