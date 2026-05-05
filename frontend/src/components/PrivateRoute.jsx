// ================================================================
// Protege rutas que requieren autenticación completa
// ================================================================
import { Navigate } from 'react-router-dom'
import { useAuth }  from '../context/AuthContext.jsx'

export default function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh' }}>
      <div className="spinner" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
