// ================================================================
// Caso → PARTE A: Gestión de Usuarios y Asignación de Roles
// Solo Admin puede gestionar usuarios
// ================================================================
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { requireRole, extractUser } from '../middlewares/rbac.middleware.js'
import {
  getUsers, getUserById, createUser,
  updateUser, deleteUser, assignRole, removeRole
} from '../controllers/users.controller.js'

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

router.get('/',    requireRole('Admin'), getUsers)
router.get('/:id', requireRole('Admin'), getUserById)

router.post('/',
  requireRole('Admin'),
  [
    body('email').isEmail().withMessage('Email inválido').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres')
      .matches(/[A-Z]/).withMessage('Al menos una mayúscula')
      .matches(/[0-9]/).withMessage('Al menos un número')
      .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Al menos un carácter especial'),
    body('nombreCompleto').trim().isLength({ min: 3 }).withMessage('Nombre requerido'),
    body('tiendaId').optional().isInt({ min: 1 }),
    body('rolId').optional().isInt({ min: 1 })
  ],
  validate,
  createUser
)

router.put('/:id',   requireRole('Admin'), updateUser)
router.delete('/:id', requireRole('Admin'), deleteUser)

// Caso → Módulo de Asignación Roles-Usuarios
router.post('/:id/roles',
  requireRole('Admin'),
  [body('rolId').isInt({ min: 1 }).withMessage('rolId requerido')],
  validate,
  assignRole
)
router.delete('/:id/roles/:rolId', requireRole('Admin'), removeRole)

export default router
