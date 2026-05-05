// ================================================================
// Caso → Fase 3: Rutas protegidas con middleware ABAC
// Cada ruta aplica el middleware correspondiente a la acción
// ================================================================
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import {
  extractUser, canSelect,
  canInsert, canUpdate, canDelete
} from '../middlewares/abac.middleware.js'
import {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, getAuditLog
} from '../controllers/products.controller.js'
import { requireRole } from '../middlewares/role.middleware.js'

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

// Extraer usuario en todas las rutas
router.use(extractUser)

// Audit log: solo Auditor y Admin
router.get('/audit', requireRole('Admin', 'Auditor'), getAuditLog)

// CRUD con políticas ABAC
router.get('/',    canSelect, getProducts)
router.get('/:id', canSelect, getProductById)

router.post('/',
  canInsert,
  [
    body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
    body('precio').isFloat({ min: 0 }).withMessage('Precio debe ser mayor o igual a 0'),
    body('tiendaId').isInt({ min: 1 }).withMessage('tiendaId requerido'),
    body('stock').optional().isInt({ min: 0 }).withMessage('Stock debe ser >= 0'),
    body('esPremium').optional().isBoolean()
  ],
  validate,
  createProduct
)

router.put('/:id',    canUpdate, updateProduct)
router.delete('/:id', canDelete, deleteProduct)

export default router
