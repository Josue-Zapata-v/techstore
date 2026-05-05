// ================================================================
// Router principal con rutas protegidas por rol
// ================================================================
import { Routes, Route, Navigate } from 'react-router-dom'
import { BrowserRouter } from 'react-router-dom'
import { Toaster }       from 'react-hot-toast'
import { AuthProvider }  from './context/AuthContext.jsx'
import PrivateRoute      from './components/PrivateRoute.jsx'

import Login      from './pages/Login.jsx'
import Register   from './pages/Register.jsx'
import MfaSetup   from './pages/MfaSetup.jsx'
import Dashboard  from './pages/Dashboard.jsx'
import Products   from './pages/Products.jsx'
import Roles      from './pages/Roles.jsx'
import Users      from './pages/Users.jsx'
import Audit      from './pages/Audit.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color:      'var(--text-primary)',
              border:     '1px solid var(--border)',
              fontSize:   '14px',
            }
          }}
        />
        <Routes>
          {/* Públicas */}
          <Route path="/login"     element={<Login/>}/>
          <Route path="/register"  element={<Register/>}/>
          <Route path="/mfa-setup" element={<MfaSetup/>}/>

          {/* Protegidas */}
          <Route path="/dashboard" element={
            <PrivateRoute><Dashboard/></PrivateRoute>
          }/>
          <Route path="/products" element={
            <PrivateRoute><Products/></PrivateRoute>
          }/>
          <Route path="/roles" element={
            <PrivateRoute roles={['Admin']}><Roles/></PrivateRoute>
          }/>
          <Route path="/users" element={
            <PrivateRoute roles={['Admin']}><Users/></PrivateRoute>
          }/>
          <Route path="/audit" element={
            <PrivateRoute roles={['Admin','Auditor']}><Audit/></PrivateRoute>
          }/>

          {/* Redirecciones */}
          <Route path="/"   element={<Navigate to="/dashboard" replace/>}/>
          <Route path="*"   element={<Navigate to="/login"     replace/>}/>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
