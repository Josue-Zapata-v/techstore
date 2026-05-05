// ================================================================
// Caso → Fase 1: Registro con validación de contraseña segura
// Tras registro exitoso redirige a MFA Setup con el QR
// ================================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api.js'
import { productsApi } from '../api/products.api.js'
import axiosClient from '../api/axiosClient.js'
import toast from 'react-hot-toast'
import { User, Mail, Lock, Store, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

function PasswordRule({ ok, text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12,
      color: ok ? 'var(--success)' : 'var(--text-muted)' }}>
      {ok ? <CheckCircle size={12}/> : <XCircle size={12}/>}
      {text}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', password: '', nombreCompleto: '', tiendaId: ''
  })
  const [tiendas,  setTiendas]  = useState([])
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const pw = form.password
  const rules = {
    length:   pw.length >= 8,
    upper:    /[A-Z]/.test(pw),
    number:   /[0-9]/.test(pw),
    special:  /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  }
  const pwValid = Object.values(rules).every(Boolean)

  useEffect(() => {
    axiosClient.get('/auth/tiendas').catch(() => {})
    // Cargamos tiendas desde un endpoint simple
    fetch('/api/auth/tiendas').then(r => r.json()).then(d => {
      if (d.data) setTiendas(d.data)
    }).catch(() => {})
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pwValid) { setError('La contraseña no cumple los requisitos'); return }
    setError('')
    setLoading(true)
    try {
      const res  = await authApi.register({
        email:          form.email,
        password:       form.password,
        nombreCompleto: form.nombreCompleto,
        tiendaId:       form.tiendaId ? parseInt(form.tiendaId) : undefined
      })
      const { userId, mfa } = res.data.data

      // Guardar QR en sessionStorage para la página de setup
      sessionStorage.setItem('mfa_qr',     mfa.qrCode)
      sessionStorage.setItem('mfa_secret', mfa.secret)

      toast.success('Cuenta creada. Configura Google Authenticator.')
      navigate(`/mfa-setup?userId=${userId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg-base)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'
    }}>
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)', padding:'40px',
        width:'100%', maxWidth:'440px', boxShadow:'var(--shadow-lg)',
      }}>
        <div style={{ textAlign:'center', marginBottom: 28 }}>
          <div style={{
            width:52, height:52,
            background:'linear-gradient(135deg, var(--brand), var(--cyan))',
            borderRadius:'var(--radius-md)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px', boxShadow:'var(--glow-brand)',
          }}>
            <User size={24} color="#fff"/>
          </div>
          <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>Crear cuenta</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
            Completa el formulario para registrarte
          </p>
        </div>

        {error && (
          <div style={{
            background:'var(--danger-light)', border:'1px solid var(--danger)',
            borderRadius:'var(--radius-sm)', padding:'10px 14px',
            marginBottom:16, fontSize:13, color:'var(--danger)',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <div style={{ position:'relative' }}>
              <User size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input name="nombreCompleto" type="text" className="form-input"
                style={{ paddingLeft:36 }} placeholder="Juan Pérez García"
                value={form.nombreCompleto} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <div style={{ position:'relative' }}>
              <Mail size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input name="email" type="email" className="form-input"
                style={{ paddingLeft:36 }} placeholder="usuario@techstore.com"
                value={form.email} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div style={{ position:'relative' }}>
              <Lock size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <input name="password" type={showPass ? 'text':'password'}
                className="form-input" style={{ paddingLeft:36, paddingRight:40 }}
                placeholder="Mínimo 8 caracteres"
                value={form.password} onChange={handleChange} required />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
                  display:'flex', alignItems:'center' }}>
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {form.password && (
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:8 }}>
                <PasswordRule ok={rules.length}  text="Mínimo 8 caracteres" />
                <PasswordRule ok={rules.upper}   text="Al menos una mayúscula" />
                <PasswordRule ok={rules.number}  text="Al menos un número" />
                <PasswordRule ok={rules.special} text="Al menos un carácter especial" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Tienda asignada (opcional)</label>
            <div style={{ position:'relative' }}>
              <Store size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
              <select name="tiendaId" className="form-input form-select"
                style={{ paddingLeft:36 }}
                value={form.tiendaId} onChange={handleChange}>
                <option value="">Sin tienda asignada</option>
                {tiendas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg"
            disabled={loading || !pwValid} style={{ marginTop:4 }}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p style={{ textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <a href="/login" style={{ color:'var(--brand)', textDecoration:'none' }}>
              Inicia sesión
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
