// ================================================================
// Caso → Fase 2 PARTE A: CRUD completo de Roles
// Reglas:
//   CREATE → solo Admin
//   READ   → todos los roles autenticados
//   UPDATE → solo Admin
//   DELETE → solo Admin (no si tiene usuarios asignados)
// ================================================================
import pool from '../config/db.js'

// ── GET /api/roles ───────────────────────────────────────────────
// Caso → READ: todos pueden ver roles existentes
export async function getRoles(_req, res) {
  try {
    const result = await pool.query(
      `SELECT
         r.id,
         r.nombre,
         r.descripcion,
         r.fecha_creacion,
         COUNT(ur.usuario_id)::int AS total_usuarios
       FROM rbac.roles r
       LEFT JOIN rbac.usuario_roles ur ON ur.rol_id = r.id
       GROUP BY r.id
       ORDER BY r.id`
    )
    return res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('[RBAC] Error en getRoles:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── GET /api/roles/:id ───────────────────────────────────────────
export async function getRolById(req, res) {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT
         r.id, r.nombre, r.descripcion, r.fecha_creacion,
         COUNT(ur.usuario_id)::int AS total_usuarios
       FROM rbac.roles r
       LEFT JOIN rbac.usuario_roles ur ON ur.rol_id = r.id
       WHERE r.id = $1
       GROUP BY r.id`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado' })
    }
    return res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('[RBAC] Error en getRolById:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── POST /api/roles ──────────────────────────────────────────────
// Caso → CREATE: solo Administrador puede crear roles
export async function createRol(req, res) {
  try {
    const { nombre, descripcion } = req.body

    const existe = await pool.query(
      'SELECT id FROM rbac.roles WHERE nombre = $1',
      [nombre]
    )
    if (existe.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre' })
    }

    const result = await pool.query(
      `INSERT INTO rbac.roles (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING *`,
      [nombre, descripcion || null]
    )
    return res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('[RBAC] Error en createRol:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── PUT /api/roles/:id ───────────────────────────────────────────
// Caso → UPDATE: solo Administrador puede modificar roles
export async function updateRol(req, res) {
  try {
    const { id } = req.params
    const { nombre, descripcion } = req.body

    const existe = await pool.query(
      'SELECT id FROM rbac.roles WHERE id = $1',
      [id]
    )
    if (existe.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado' })
    }

    // Verificar que el nuevo nombre no colisione con otro rol
    if (nombre) {
      const colision = await pool.query(
        'SELECT id FROM rbac.roles WHERE nombre = $1 AND id != $2',
        [nombre, id]
      )
      if (colision.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre' })
      }
    }

    const result = await pool.query(
      `UPDATE rbac.roles
       SET nombre      = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion)
       WHERE id = $3
       RETURNING *`,
      [nombre || null, descripcion || null, id]
    )
    return res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('[RBAC] Error en updateRol:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── DELETE /api/roles/:id ────────────────────────────────────────
// Caso → DELETE: solo Admin, no puede eliminar si tiene usuarios
export async function deleteRol(req, res) {
  try {
    const { id } = req.params

    const existe = await pool.query(
      'SELECT id, nombre FROM rbac.roles WHERE id = $1',
      [id]
    )
    if (existe.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Rol no encontrado' })
    }

    // Caso → DELETE: no puede eliminar si tiene usuarios asignados
    const conUsuarios = await pool.query(
      'SELECT COUNT(*)::int AS total FROM rbac.usuario_roles WHERE rol_id = $1',
      [id]
    )
    if (conUsuarios.rows[0].total > 0) {
      return res.status(409).json({
        success: false,
        message: `No se puede eliminar el rol "${existe.rows[0].nombre}" porque tiene ${conUsuarios.rows[0].total} usuario(s) asignado(s)`
      })
    }

    await pool.query('DELETE FROM rbac.roles WHERE id = $1', [id])
    return res.json({ success: true, message: 'Rol eliminado exitosamente' })
  } catch (error) {
    console.error('[RBAC] Error en deleteRol:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}
