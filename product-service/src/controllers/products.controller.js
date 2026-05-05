// ================================================================
// Caso → Fase 3 PARTE B: CRUD de Productos con ABAC
// Cada operación respeta las reglas de acceso por atributos
// y registra la acción en audit_log
// ================================================================
import pool                  from '../config/db.js'
import { buildSelectFilter } from '../utils/policy-engine.js'
import { logAction }         from '../utils/logger.utils.js'

// ── GET /api/products ────────────────────────────────────────────
// Caso → SELECT: Admin/Auditor ven todo, Gerente/Empleado su tienda
export async function getProducts(req, res) {
  try {
    const { whereClause, params } = buildSelectFilter(req.selectPolicy)

    const result = await pool.query(
      `SELECT
         p.id, p.nombre, p.descripcion, p.precio,
         p.stock, p.categoria, p.tienda_id,
         t.nombre AS tienda_nombre,
         p.es_premium, p.creado_por, p.fecha_creacion, p.fecha_actualizacion
       FROM inventory.productos p
       LEFT JOIN public.tiendas t ON t.id = p.tienda_id
       ${whereClause}
       ORDER BY p.id`,
      params
    )

    await logAction({
      usuarioId: req.user.id,
      accion:    'READ',
      recurso:   'productos',
      detalle:   { filtro: req.selectPolicy.scope },
      ip:        req.headers['x-forwarded-for'] || req.ip
    })

    return res.json({ success: true, data: result.rows, total: result.rows.length })
  } catch (error) {
    console.error('[Products] Error en getProducts:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── GET /api/products/:id ────────────────────────────────────────
export async function getProductById(req, res) {
  try {
    const { id } = req.params
    const { whereClause, params } = buildSelectFilter(req.selectPolicy)

    const baseWhere = whereClause
      ? `${whereClause} AND p.id = $${params.length + 1}`
      : 'WHERE p.id = $1'

    const result = await pool.query(
      `SELECT
         p.id, p.nombre, p.descripcion, p.precio,
         p.stock, p.categoria, p.tienda_id,
         t.nombre AS tienda_nombre,
         p.es_premium, p.creado_por, p.fecha_creacion, p.fecha_actualizacion
       FROM inventory.productos p
       LEFT JOIN public.tiendas t ON t.id = p.tienda_id
       ${baseWhere}`,
      [...params, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado o sin acceso' })
    }

    return res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('[Products] Error en getProductById:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── POST /api/products ───────────────────────────────────────────
// Caso → INSERT: reglas por rol ya evaluadas en canInsert middleware
export async function createProduct(req, res) {
  try {
    const {
      nombre, descripcion, precio,
      stock, categoria, tiendaId, esPremium
    } = req.body

    const result = await pool.query(
      `INSERT INTO inventory.productos
         (nombre, descripcion, precio, stock, categoria, tienda_id, es_premium, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        nombre,
        descripcion  || null,
        precio,
        stock        || 0,
        categoria    || null,
        tiendaId,
        esPremium    || false,
        req.user.id
      ]
    )

    const producto = result.rows[0]

    await logAction({
      usuarioId: req.user.id,
      accion:    'CREATE',
      recurso:   'productos',
      recursoId: producto.id,
      detalle:   { nombre: producto.nombre, tiendaId: producto.tienda_id },
      ip:        req.headers['x-forwarded-for'] || req.ip
    })

    return res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: producto
    })
  } catch (error) {
    console.error('[Products] Error en createProduct:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── PUT /api/products/:id ────────────────────────────────────────
// Caso → UPDATE: campos permitidos ya filtrados por canUpdate middleware
export async function updateProduct(req, res) {
  try {
    const { id }             = req.params
    const camposPermitidos   = req.camposPermitidos
    const body               = req.body

    // Construir SET dinámico solo con campos permitidos
    const setClauses = []
    const values     = []
    let   paramIndex = 1

    const camposDB = {
      nombre:      'nombre',
      descripcion: 'descripcion',
      precio:      'precio',
      stock:       'stock',
      categoria:   'categoria',
      tiendaId:    'tienda_id',
      esPremium:   'es_premium'
    }

    for (const campo of camposPermitidos) {
      if (body[campo] !== undefined && camposDB[campo]) {
        setClauses.push(`${camposDB[campo]} = $${paramIndex}`)
        values.push(body[campo])
        paramIndex++
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos válidos para actualizar' })
    }

    values.push(id)

    const result = await pool.query(
      `UPDATE inventory.productos
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    await logAction({
      usuarioId: req.user.id,
      accion:    'UPDATE',
      recurso:   'productos',
      recursoId: parseInt(id),
      detalle:   { camposModificados: camposPermitidos },
      ip:        req.headers['x-forwarded-for'] || req.ip
    })

    return res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('[Products] Error en updateProduct:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── DELETE /api/products/:id ─────────────────────────────────────
// Caso → DELETE: reglas ya evaluadas en canDelete middleware
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params

    await pool.query('DELETE FROM inventory.productos WHERE id = $1', [id])

    await logAction({
      usuarioId: req.user.id,
      accion:    'DELETE',
      recurso:   'productos',
      recursoId: parseInt(id),
      detalle:   { productoEliminado: req.productoExistente },
      ip:        req.headers['x-forwarded-for'] || req.ip
    })

    return res.json({ success: true, message: 'Producto eliminado exitosamente' })
  } catch (error) {
    console.error('[Products] Error en deleteProduct:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── GET /api/products/audit ──────────────────────────────────────
// Caso → Auditor: consulta el log de acciones
export async function getAuditLog(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         al.id, al.accion, al.recurso, al.recurso_id,
         al.detalle, al.ip, al.timestamp,
         u.email, u.nombre_completo
       FROM inventory.audit_log al
       LEFT JOIN auth.usuarios u ON u.id = al.usuario_id
       ORDER BY al.timestamp DESC
       LIMIT 500`
    )
    return res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('[Products] Error en getAuditLog:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}
