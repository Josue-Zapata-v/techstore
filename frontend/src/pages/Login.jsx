// ================================================================
// Caso → Fase 1: Login básico + flujo MFA
// Maneja 3 estados: login → mfaSetupRequired → mfaVerify
// ================================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { authApi } from '../api/auth.api.js'
import toast from 'react-hot-toast'
import { Shield, Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'

export default function Login() {
  const navigate  = useNavigate()
  const { login } = useAuth()

  // Estados del flujo
  const [step, setStep]         = useState('login')  // login | mfaVerify | mfaSetup
  const [tempToken, setTempToken] = useState('')
  const [userId, setUserId]     = useState(null)

  // Formulario login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  // Formulario MFA
  const [totpCode, setTotpCode] = useState('')

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // ── STEP 1: Login ──────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await authApi.login({ email, password })
      const data = res.data.data

      if (data.mfaSetupRequired) {
        setUserId(data.userId)
        setStep('mfaSetup')
        toast('Debes configurar Google Authenticator primero', { icon: '🔐' })
        return
      }

      if (data.mfaRequired) {
        setTempToken(data.tempToken)
        setStep('mfaVerify')
        return
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 2: Verificar código TOTP ──────────────────────────────
  async function handleMfaVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await authApi.verifyMfa({ tempToken, totpCode })
      const { accessToken, user } = res.data.data
      login(user, accessToken)
      toast.success(`Bienvenido, ${user.nombreCompleto}`)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Código inválido'
      setError(msg)
      setTotpCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:       '100vh',
      background:      'var(--bg-base)',
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         '20px',
    }}>
      {/* Panel izquierdo decorativo */}
      <div style={{
        display:        'none',
        width:          '440px',
        marginRight:    '60px',
      }} className="login-deco">
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           10,
            marginBottom:  24
          }}>
            <div style={{
              width:         44,
              height:        44,
              background:    'linear-gradient(135deg, var(--brand), var(--cyan))',
              borderRadius:  'var(--radius-md)',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              fontWeight:    700,
              fontSize:      20,
              color:         '#fff'
            }}>TS</div>
            <span style={{ fontSize: 22, fontWeight: 700 }}>TechStore</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
            Sistema de Gestión<br />
            <span style={{ color: 'var(--brand)' }}>de Inventario</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Plataforma enterprise con control de acceso basado en roles y atributos.
            Seguridad de nivel bancario con autenticación TOTP.
          </p>
        </div>
        {[
          { icon: Shield, label: 'Autenticación TOTP',     sub: 'Compatible con Google Authenticator' },
          { icon: Lock,   label: 'Control de acceso RBAC', sub: 'Roles granulares por usuario' },
          { icon: Shield, label: 'Políticas ABAC',         sub: 'Acceso por atributos del recurso' },
        ].map((f, i) => (
          <div key={i} style={{
            display:       'flex',
            alignItems:    'center',
            gap:           14,
            padding:       '14px 0',
            borderBottom:  '1px solid var(--border)'
          }}>
            <div style={{
              width:         38,
              height:        38,
              background:    'var(--brand-light)',
              borderRadius:  'var(--radius-sm)',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              flexShrink:    0,
            }}>
              <f.icon size={18} color="var(--brand)" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Card principal */}
      <div style={{
        background:    'var(--bg-card)',
        border:        '1px solid var(--border)',
        borderRadius:  'var(--radius-lg)',
        padding:       '40px',
        width:         '100%',
        maxWidth:      '420px',
        boxShadow:     'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width:         52,
            height:        52,
            background:    'linear-gradient(135deg, var(--brand), var(--cyan))',
            borderRadius:  'var(--radius-md)',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            margin:        '0 auto 16px',
            boxShadow:     'var(--glow-brand)',
          }}>
            {step === 'login'
              ? <Lock size={24} color="#fff" />
              : <Shield size={24} color="#fff" />
            }
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            {step === 'login'     && 'Iniciar Sesión'}
            {step === 'mfaVerify' && 'Verificación MFA'}
            {step === 'mfaSetup'  && 'Configurar MFA'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {step === 'login'     && 'Ingresa tus credenciales de acceso'}
            {step === 'mfaVerify' && 'Ingresa el código de Google Authenticator'}
            {step === 'mfaSetup'  && 'Debes activar MFA antes de continuar'}
          </p>
        </div>

        {/* Error global */}
        {error && (
          <div style={{
            background:    'var(--danger-light)',
            border:        '1px solid var(--danger)',
            borderRadius:  'var(--radius-sm)',
            padding:       '10px 14px',
            marginBottom:  20,
            display:       'flex',
            alignItems:    'center',
            gap:           8,
            fontSize:      13,
            color:         'var(--danger)',
          }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* ── FORM LOGIN ────────────────────────────────── */}
        {step === 'login' && (
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)'
                }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="usuario@techstore.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--text-muted)'
                }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position:   'absolute', right: 12, top: '50%',
                    transform:  'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor:     'pointer', color: 'var(--text-muted)',
                    display:    'flex', alignItems: 'center'
                  }}
                >
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading
                ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}}/> Verificando...</>
                : 'Iniciar sesión'
              }
            </button>

            <p style={{ textAlign:'center', fontSize: 13, color: 'var(--text-muted)' }}>
              ¿No tienes cuenta?{' '}
              <a href="/register" style={{ color: 'var(--brand)', textDecoration: 'none' }}>
                Regístrate
              </a>
            </p>
          </form>
        )}

        {/* ── FORM MFA VERIFY ───────────────────────────── */}
        {step === 'mfaVerify' && (
          <form onSubmit={handleMfaVerify} style={{ display:'flex', flexDirection:'column', gap: 20 }}>
            <div style={{
              background:    'var(--brand-light)',
              border:        '1px solid rgba(59,130,246,0.3)',
              borderRadius:  'var(--radius-sm)',
              padding:       '12px 16px',
              fontSize:      13,
              color:         'var(--brand)',
            }}>
              Abre Google Authenticator y busca <strong>TechStore</strong> para obtener tu código.
            </div>

            <div className="form-group">
              <label className="form-label">Código de 6 dígitos</label>
              <input
                type="text"
                className="form-input"
                placeholder="000000"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                style={{
                  textAlign:     'center',
                  fontSize:      28,
                  fontWeight:    700,
                  letterSpacing: 12,
                  padding:       '14px',
                }}
                maxLength={6}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading || totpCode.length !== 6}
            >
              {loading
                ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}}/> Verificando...</>
                : 'Verificar código'
              }
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-full"
              onClick={() => { setStep('login'); setError(''); setTotpCode('') }}
            >
              ← Volver al login
            </button>
          </form>
        )}

        {/* ── MFA SETUP REQUIRED ────────────────────────── */}
        {step === 'mfaSetup' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
              Tu cuenta requiere configurar Google Authenticator antes de poder acceder.
            </p>
            <button
              className="btn btn-primary btn-full"
              onClick={() => navigate(`/mfa-setup?userId=${userId}`)}
            >
              Configurar ahora
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
