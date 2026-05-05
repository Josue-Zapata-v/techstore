// ================================================================
// Panel principal con stats según el rol del usuario
// ================================================================
import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { productsApi } from '../api/products.api.js'
import { usersApi, rolesApi } from '../api/rbac.api.js'
import { Package, Users, Shield, TrendingUp, Star, Store } from 'lucide-react'

const ROLE_BADGE = {
  Admin:    'badge-admin',
  Gerente:  'badge-gerente',
  Empleado: 'badge-empleado',
  Auditor:  'badge-auditor',
}

export default function Dashboard() {
  const { user }   = useAuth()
  const [stats, setStats] = useState({
    productos: 0, usuarios: 0, roles: 0, premium: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const prods = await productsApi.getAll()
        const data  = prods.data.data || []
        const newStats = {
          productos: data.length,
          premium:   data.filter(p => p.es_premium).length,
          usuarios:  0,
          roles:     0,
        }
        if (user.rol === 'Admin') {
          const [u, r] = await Promise.all([usersApi.getAll(), rolesApi.getAll()])
          newStats.usuarios = u.data.data?.length || 0
          newStats.roles    = r.data.data?.length || 0
        }
        setStats(newStats)
      } catch (_) {}
      finally { setLoading(false) }
    }
    load()
  }, [user.rol])

  const CARDS = [
    {
      label: 'Productos',
      value:  stats.productos,
      icon:   Package,
      color:  'var(--brand)',
      bg:     'var(--brand-light)',
      roles:  ['Admin','Gerente','Empleado','Auditor'],
    },
    {
      label: 'Premium',
      value:  stats.premium,
      icon:   Star,
      color:  'var(--warning)',
      bg:     'var(--warning-light)',
      roles:  ['Admin','Gerente','Auditor'],
    },
    {
      label: 'Usuarios',
      value:  stats.usuarios,
      icon:   Users,
      color:  'var(--cyan)',
      bg:     'var(--cyan-light)',
      roles:  ['Admin'],
    },
    {
      label: 'Roles',
      value:  stats.roles,
      icon:   Shield,
      color:  'var(--role-admin)',
      bg:     'rgba(168,85,247,0.15)',
      roles:  ['Admin'],
    },
  ].filter(c => c.roles.includes(user?.rol))

  return (
    <AppLayout title="Dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bienvenido, {user?.nombreCompleto?.split(' ')[0]}</h1>
          <p className="page-subtitle">
            Sesión activa como{' '}
            <span className={`badge ${ROLE_BADGE[user?.rol]}`}>{user?.rol}</span>
            {user?.tiendaId &&
              <span style={{ marginLeft:8, color:'var(--text-muted)', fontSize:13 }}>
                · Tienda #{user.tiendaId}
              </span>
            }
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="spinner"/>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            {CARDS.map(c => (
              <div key={c.label} className="stat-card">
                <div className="stat-icon" style={{ background: c.bg }}>
                  <c.icon size={22} color={c.color}/>
                </div>
                <div>
                  <div className="stat-value">{c.value}</div>
                  <div className="stat-label">{c.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Info de accesos según rol */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Tus permisos de acceso</span>
              <span className={`badge ${ROLE_BADGE[user?.rol]}`}>{user?.rol}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {PERMISOS[user?.rol]?.map((p, i) => (
                <div key={i} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          10,
                  padding:      '10px 14px',
                  background:   'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize:     13,
                }}>
                  <div style={{
                    width:8, height:8, borderRadius:'50%',
                    background: p.ok ? 'var(--success)' : 'var(--danger)',
                    flexShrink: 0,
                  }}/>
                  <span style={{ color: p.ok ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}

const PERMISOS = {
  Admin: [
    { ok: true,  label: 'Ver todos los productos de todas las tiendas' },
    { ok: true,  label: 'Crear productos en cualquier tienda' },
    { ok: true,  label: 'Modificar todos los campos de cualquier producto' },
    { ok: true,  label: 'Eliminar cualquier producto' },
    { ok: true,  label: 'Gestionar usuarios y roles' },
    { ok: true,  label: 'Ver audit log completo' },
  ],
  Gerente: [
    { ok: true,  label: 'Ver productos de tu tienda' },
    { ok: true,  label: 'Crear productos en tu tienda' },
    { ok: true,  label: 'Modificar precio, stock, nombre, descripción' },
    { ok: false, label: 'No puedes modificar la categoría' },
    { ok: true,  label: 'Eliminar productos no premium de tu tienda' },
    { ok: false, label: 'No puedes eliminar productos premium' },
  ],
  Empleado: [
    { ok: true,  label: 'Ver productos de tu tienda' },
    { ok: true,  label: 'Crear productos no premium en tu tienda' },
    { ok: true,  label: 'Actualizar stock de productos' },
    { ok: false, label: 'No puedes modificar precio ni categoría' },
    { ok: false, label: 'No puedes eliminar productos' },
    { ok: false, label: 'Sin acceso a gestión de usuarios' },
  ],
  Auditor: [
    { ok: true,  label: 'Ver todos los productos (solo lectura)' },
    { ok: true,  label: 'Ver audit log de todas las operaciones' },
    { ok: false, label: 'Sin permisos de creación' },
    { ok: false, label: 'Sin permisos de modificación' },
    { ok: false, label: 'Sin permisos de eliminación' },
    { ok: false, label: 'Sin acceso a gestión de usuarios' },
  ],
}
