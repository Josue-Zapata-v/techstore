// ================================================================
// Caso → Fase 3: Middleware para verificar permisos ABAC
// Lee headers del Gateway, construye objeto user, evalúa política
// ================================================================
import { evaluatePolicy } from '../utils/policy-engine.js'
import pool               from '../config/db.js'

// Extrae datos del usuario desde headers internos del Gateway
export function extractUser(req, _res, next) {
  req.user = {
    id:       parseInt(req.headers['x-user-id'])     || null,
    email:    req.headers['x-user-email']            || null,
    rol:      req.headers['x-user-rol']              || null,
    tiendaId: parseInt(req.headers['x-user-tienda']) || null,
    nombre:   req.headers['x-user-nombre']           || null,
  }
  next()
}

// Middleware ABAC para SELECT
// Adjunta filtros de tienda al request para que el controller los use
export function canSelect(req, res, next) {
  const result = evaluatePolicy('select', req.user)
  if (!result.allowed) {
    return res.status(403).json({ success: false, message: result.reason })
  }
  req.selectPolicy = result
  next()
}

// Middleware ABAC para INSERT
// Evalúa reglas antes de crear el producto
export function canInsert(req, res, next) {
  const producto = {
    tiendaId:  parseInt(req.body.tiendaId),
    esPremium: req.body.esPremium === true || req.body.esPremium === 'true'
  }
  const result = evaluatePolicy('insert', req.user, [], producto)
  if (!result.allowed) {
    return res.status(403).json({ success: false, message: result.reason })
  }
  next()
}

// Middleware ABAC para UPDATE
// Necesita el producto existente en DB para evaluar tienda y premium
export async function canUpdate(req, res, next) {
  try {
    const { id } = req.params

    const dbResult = await pool.query(
      'SELECT id, tienda_id, es_premium FROM inventory.productos WHERE id = $1',
      [id]
    )
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' })
    }

    const producto = dbResult.rows[0]
    const campos   = Object.keys(req.body)

    const result = evaluatePolicy('update', req.user, campos, producto)
    if (!result.allowed) {
      return res.status(403).json({ success: false, message: result.reason })
    }

    // Adjuntar producto y campos permitidos para el controller
    req.productoExistente  = producto
    req.camposPermitidos   = result.camposPermitidos || campos
    next()
  } catch (error) {
    console.error('[ABAC] Error en canUpdate:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// Middleware ABAC para DELETE
export async function canDelete(req, res, next) {
  try {
    const { id } = req.params

    const dbResult = await pool.query(
      'SELECT id, tienda_id, es_premium FROM inventory.productos WHERE id = $1',
      [id]
    )
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' })
    }

    const producto = dbResult.rows[0]
    const result   = evaluatePolicy('delete', req.user, [], producto)

    if (!result.allowed) {
      return res.status(403).json({ success: false, message: result.reason })
    }

    req.productoExistente = producto
    next()
  } catch (error) {
    console.error('[ABAC] Error en canDelete:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}
