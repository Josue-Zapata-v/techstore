// ================================================================
// Caso → Fase 2 PARTE A: CRUD Usuarios + Asignación de Roles
// Solo Admin puede gestionar usuarios y asignar roles
// ================================================================
import pool        from '../config/db.js'
import bcrypt      from 'bcryptjs'

// ── GET /api/users ───────────────────────────────────────────────
export async function getUsers(_req, res) {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.nombre_completo,
         u.tienda_id,
         t.nombre  AS tienda_nombre,
         u.mfa_habilitado,
         u.activo,
         u.fecha_creacion,
         COALESCE(
           json_agg(
             json_build_object('id', r.id, 'nombre', r.nombre)
           ) FILTER (WHERE r.id IS NOT NULL),
           '[]'
         ) AS roles
       FROM auth.usuarios u
       LEFT JOIN public.tiendas t ON t.id = u.tienda_id
       LEFT JOIN rbac.usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN rbac.roles r ON r.id = ur.rol_id
       GROUP BY u.id, t.nombre
       ORDER BY u.id`
    )
    return res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('[RBAC] Error en getUsers:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── GET /api/users/:id ───────────────────────────────────────────
export async function getUserById(req, res) {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT
         u.id, u.email, u.nombre_completo, u.tienda_id,
         t.nombre AS tienda_nombre, u.mfa_habilitado,
         u.activo, u.fecha_creacion,
         COALESCE(
           json_agg(
             json_build_object('id', r.id, 'nombre', r.nombre)
           ) FILTER (WHERE r.id IS NOT NULL),
           '[]'
         ) AS roles
       FROM auth.usuarios u
       LEFT JOIN public.tiendas t ON t.id = u.tienda_id
       LEFT JOIN rbac.usuario_roles ur ON ur.usuario_id = u.id
       LEFT JOIN rbac.roles r ON r.id = ur.rol_id
       WHERE u.id = $1
       GROUP BY u.id, t.nombre`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }
    return res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('[RBAC] Error en getUserById:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── POST /api/users ──────────────────────────────────────────────
// Admin crea usuario directamente con rol asignado
export async function createUser(req, res) {
  const client = await pool.connect()
  try {
    const { email, password, nombreCompleto, tiendaId, rolId } = req.body
    const adminId = req.userId

    await client.query('BEGIN')

    const existe = await client.query(
      'SELECT id FROM auth.usuarios WHERE email = $1',
      [email]
    )
    if (existe.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: 'El email ya está registrado' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await client.query(
      `INSERT INTO auth.usuarios
         (email, password_hash, nombre_completo, tienda_id, mfa_habilitado)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, email, nombre_completo, tienda_id`,
      [email, passwordHash, nombreCompleto, tiendaId || null]
    )
    const newUser = result.rows[0]

    // Asignar rol
    if (rolId) {
      await client.query(
        `INSERT INTO rbac.usuario_roles (usuario_id, rol_id, asignado_por)
         VALUES ($1, $2, $3)`,
        [newUser.id, rolId, adminId]
      )
    }

    await client.query('COMMIT')
    return res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[RBAC] Error en createUser:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  } finally {
    client.release()
  }
}

// ── PUT /api/users/:id ───────────────────────────────────────────
export async function updateUser(req, res) {
  try {
    const { id } = req.params
    const { nombreCompleto, tiendaId, activo } = req.body

    const result = await pool.query(
      `UPDATE auth.usuarios
       SET nombre_completo = COALESCE($1, nombre_completo),
           tienda_id       = COALESCE($2, tienda_id),
           activo          = COALESCE($3, activo)
       WHERE id = $4
       RETURNING id, email, nombre_completo, tienda_id, activo`,
      [nombreCompleto || null, tiendaId || null, activo ?? null, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }
    return res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('[RBAC] Error en updateUser:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── DELETE /api/users/:id ────────────────────────────────────────
export async function deleteUser(req, res) {
  try {
    const { id }    = req.params
    const adminId   = req.userId

    // Admin no puede eliminarse a sí mismo
    if (parseInt(id) === adminId) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      })
    }

    const result = await pool.query(
      'UPDATE auth.usuarios SET activo = false WHERE id = $1 RETURNING id, email',
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    }
    return res.json({
      success: true,
      message: 'Usuario desactivado exitosamente',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('[RBAC] Error en deleteUser:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── POST /api/users/:id/roles ────────────────────────────────────
// Caso → Módulo de Asignación Roles-Usuarios
export async function assignRole(req, res) {
  try {
    const { id }    = req.params
    const { rolId } = req.body
    const adminId   = req.userId

    const result = await pool.query(
      `INSERT INTO rbac.usuario_roles (usuario_id, rol_id, asignado_por)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, rol_id) DO NOTHING
       RETURNING *`,
      [id, rolId, adminId]
    )
    return res.status(201).json({
      success: true,
      message: 'Rol asignado exitosamente',
      data: result.rows[0] || { message: 'El usuario ya tenía ese rol' }
    })
  } catch (error) {
    console.error('[RBAC] Error en assignRole:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}

// ── DELETE /api/users/:id/roles/:rolId ───────────────────────────
export async function removeRole(req, res) {
  try {
    const { id, rolId } = req.params

    await pool.query(
      'DELETE FROM rbac.usuario_roles WHERE usuario_id = $1 AND rol_id = $2',
      [id, rolId]
    )
    return res.json({ success: true, message: 'Rol removido exitosamente' })
  } catch (error) {
    console.error('[RBAC] Error en removeRole:', error)
    return res.status(500).json({ success: false, message: 'Error interno del servidor' })
  }
}
