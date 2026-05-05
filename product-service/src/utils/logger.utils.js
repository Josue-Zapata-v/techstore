// ================================================================
// product-service/src/utils/logger.utils.js
// Caso → Fase 3: Logging de acciones por usuario
// Registra cada operación CRUD en inventory.audit_log
// ================================================================
import pool from '../config/db.js'

export async function logAction({ usuarioId, accion, recurso, recursoId, detalle, ip }) {
  try {
    await pool.query(
      `INSERT INTO inventory.audit_log
         (usuario_id, accion, recurso, recurso_id, detalle, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        usuarioId  || null,
        accion,
        recurso,
        recursoId  || null,
        detalle ? JSON.stringify(detalle) : null,
        ip         || null
      ]
    )
  } catch (error) {
    // El log nunca debe romper el flujo principal
    console.error('[Audit] Error al registrar acción:', error.message)
  }
}
