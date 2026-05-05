// ================================================================
// Navegación lateral con acceso por rol
// ================================================================
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  LayoutDashboard, Package, Users, Shield,
  FileText, LogOut, Store
} from 'lucide-react'

const NAV = [
  {
    section: 'Principal',
    items: [
      { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard, roles: ['Admin','Gerente','Empleado','Auditor'] },
      { to: '/products',  label: 'Productos',  icon: Package,         roles: ['Admin','Gerente','Empleado','Auditor'] },
    ]
  },
  {
    section: 'Administración',
    items: [
      { to: '/users',  label: 'Usuarios', icon: Users,  roles: ['Admin'] },
      { to: '/roles',  label: 'Roles',    icon: Shield, roles: ['Admin'] },
    ]
  },
  {
    section: 'Reportes',
    items: [
      { to: '/audit', label: 'Auditoría', icon: FileText, roles: ['Admin','Auditor'] },
    ]
  }
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">TS</div>
        <div>
          <div className="sidebar-logo-text">TechStore</div>
          <div className="sidebar-logo-sub">Sistema de Inventario</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(group => {
          const visible = group.items.filter(i => i.roles.includes(user?.rol))
          if (visible.length === 0) return null
          return (
            <div key={group.section}>
              <div className="sidebar-section">{group.section}</div>
              {visible.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `sidebar-item ${isActive ? 'active' : ''}`
                  }
                >
                  <item.icon size={17} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.nombreCompleto}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width:'100%' }} onClick={handleLogout}>
          <LogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
