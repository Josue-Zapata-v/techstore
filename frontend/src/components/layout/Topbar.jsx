import { useAuth } from '../../context/AuthContext.jsx'

const ROLE_BADGE = {
  Admin:    'badge-admin',
  Gerente:  'badge-gerente',
  Empleado: 'badge-empleado',
  Auditor:  'badge-auditor',
}

export default function Topbar({ title }) {
  const { user } = useAuth()
  const initials = user?.nombreCompleto
    ?.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() || 'U'

  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-right">
        <div className="user-chip">
          <div className="user-avatar">{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.nombreCompleto}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span className={`badge ${ROLE_BADGE[user?.rol] || ''}`} style={{ padding: '1px 7px', fontSize: 10 }}>
                {user?.rol}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
