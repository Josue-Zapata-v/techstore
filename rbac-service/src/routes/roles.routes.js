// ================================================================
// rbac-service/src/routes/roles.routes.js
// Caso → PARTE A: RBAC - protección por rol en cada endpoint
// ================================================================
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { requireRole, extractUser } from '../middlewares/rbac.middleware.js'
import { getRoles, getRolById, createRol, updateRol, deleteRol } from '../controllers/roles.controller.js'

const router = Router()

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

router.use(extractUser)

// Caso → READ: todos los roles autenticados pueden ver roles
router.get('/',    getRoles)
router.get('/:id', getRolById)

// Caso → CREATE/UPDATE/DELETE: solo Administrador
router.post('/',
  requireRole('Admin'),
  [
    body('nombre').trim().notEmpty().withMessage('Nombre del rol requerido'),
    body('descripcion').optional().trim()
  ],
  validate,
  createRol
)

router.put('/:id',
  requireRole('Admin'),
  [
    body('nombre').optional().trim().notEmpty().withMessage('Nombre no puede estar vacío'),
    body('descripcion').optional().trim()
  ],
  validate,
  updateRol
)

router.delete('/:id', requireRole('Admin'), deleteRol)

export default router
