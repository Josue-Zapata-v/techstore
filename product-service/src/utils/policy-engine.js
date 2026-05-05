// ================================================================
// Caso → Fase 3 PARTE B: Motor de políticas ABAC
// Implementa todas las reglas de acceso por atributos del caso:
//   SELECT, INSERT, UPDATE, DELETE por rol + atributos de producto
// ================================================================

// ────────────────────────────────────────────────────────────────
// Tabla de políticas ABAC según el caso de estudio
//
// SELECT:
//   Admin   → todos los productos
//   Gerente → solo productos de su tienda
//   Empleado→ solo productos de su tienda
//   Auditor → todos los productos (solo lectura)
//
// INSERT:
//   Admin   → cualquier tienda
//   Gerente → solo en su tienda
//   Empleado→ solo NO premium en su tienda
//   Auditor → sin acceso
//
// UPDATE:
//   Admin   → todos los campos, todas las tiendas
//   Gerente → todos los campos excepto categoría, su tienda
//   Empleado→ solo campo stock, su tienda
//   Auditor → sin acceso
//
// DELETE:
//   Admin   → cualquier producto
//   Gerente → solo NO premium de su tienda
//   Empleado→ sin acceso
//   Auditor → sin acceso
// ────────────────────────────────────────────────────────────────

const POLICIES = {
  Admin: {
    select: () => ({ allowed: true, scope: 'all' }),
    insert: () => ({ allowed: true }),
    update: (_producto, campos) => ({
      allowed: true,
      camposPermitidos: campos
    }),
    delete: () => ({ allowed: true })
  },

  Gerente: {
    // Solo productos de su tienda
    select: (user) => ({
      allowed: true,
      scope:   'store',
      tiendaId: user.tiendaId
    }),
    // Solo en su tienda
    insert: (user, _campos, producto) => {
      if (producto.tiendaId !== user.tiendaId) {
        return { allowed: false, reason: 'Solo puedes crear productos en tu tienda asignada' }
      }
      return { allowed: true }
    },
    // Todos los campos excepto categoría, solo su tienda
    update: (user, campos, producto) => {
      if (producto.tienda_id !== user.tiendaId) {
        return { allowed: false, reason: 'Solo puedes modificar productos de tu tienda' }
      }
      if (campos.includes('categoria')) {
        return { allowed: false, reason: 'Gerentes no pueden modificar la categoría del producto' }
      }
      return { allowed: true, camposPermitidos: campos }
    },
    // Solo NO premium de su tienda
    delete: (user, _campos, producto) => {
      if (producto.tienda_id !== user.tiendaId) {
        return { allowed: false, reason: 'Solo puedes eliminar productos de tu tienda' }
      }
      if (producto.es_premium) {
        return { allowed: false, reason: 'Gerentes no pueden eliminar productos premium' }
      }
      return { allowed: true }
    }
  },

  Empleado: {
    // Solo productos de su tienda
    select: (user) => ({
      allowed: true,
      scope:   'store',
      tiendaId: user.tiendaId
    }),
    // Solo NO premium en su tienda
    insert: (user, _campos, producto) => {
      if (producto.tiendaId !== user.tiendaId) {
        return { allowed: false, reason: 'Solo puedes crear productos en tu tienda asignada' }
      }
      if (producto.esPremium) {
        return { allowed: false, reason: 'Empleados no pueden crear productos premium' }
      }
      return { allowed: true }
    },
    // Solo campo stock, su tienda
    update: (user, campos, producto) => {
      if (producto.tienda_id !== user.tiendaId) {
        return { allowed: false, reason: 'Solo puedes modificar productos de tu tienda' }
      }
      const camposNoPermitidos = campos.filter(c => c !== 'stock')
      if (camposNoPermitidos.length > 0) {
        return {
          allowed: false,
          reason: `Empleados solo pueden modificar el campo "stock". Campos no permitidos: ${camposNoPermitidos.join(', ')}`
        }
      }
      return { allowed: true, camposPermitidos: ['stock'] }
    },
    // Sin acceso
    delete: () => ({
      allowed: false,
      reason: 'Empleados no pueden eliminar productos'
    })
  },

  Auditor: {
    // Todos los productos, solo lectura
    select: () => ({ allowed: true, scope: 'all' }),
    insert: () => ({ allowed: false, reason: 'Auditores no pueden crear productos' }),
    update: () => ({ allowed: false, reason: 'Auditores no tienen permisos de modificación' }),
    delete: () => ({ allowed: false, reason: 'Auditores no tienen permisos de eliminación' })
  }
}

// ────────────────────────────────────────────────────────────────
// Función principal del motor ABAC
// Recibe: acción, usuario, campos a modificar, producto existente
// Retorna: { allowed: bool, reason?: string, scope?, camposPermitidos? }
// ────────────────────────────────────────────────────────────────
export function evaluatePolicy(accion, user, campos = [], producto = null) {
  const policy = POLICIES[user.rol]

  if (!policy) {
    return { allowed: false, reason: `Rol desconocido: ${user.rol}` }
  }

  const handler = policy[accion]
  if (!handler) {
    return { allowed: false, reason: `Acción no reconocida: ${accion}` }
  }

  return handler(user, campos, producto)
}

// Construye cláusula WHERE según el scope del SELECT
// Evita que un Gerente/Empleado vea productos de otras tiendas
export function buildSelectFilter(policyResult) {
  if (policyResult.scope === 'all') {
    return { whereClause: '', params: [] }
  }
  if (policyResult.scope === 'store') {
    return {
      whereClause: 'WHERE p.tienda_id = $1',
      params:      [policyResult.tiendaId]
    }
  }
  return { whereClause: '', params: [] }
}
