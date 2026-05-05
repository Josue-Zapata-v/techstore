// ================================================================
// frontend/src/pages/MfaSetup.jsx
// Caso → Flujo MFA: muestra QR para escanear con Google Authenticator
// Si el QR no viene del registro (admin/seed), lo pide al backend
// ================================================================
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth.api.js'
import axiosClient from '../api/axiosClient.js'
import toast from 'react-hot-toast'
import { Shield, CheckCircle, Smartphone } from 'lucide-react'

export default function MfaSetup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const userId   = params.get('userId')

  const [qrCode,   setQrCode]   = useState('')
  const [secret,   setSecret]   = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (!userId) { navigate('/login'); return }

    const storedQr     = sessionStorage.getItem('mfa_qr')
    const storedSecret = sessionStorage.getItem('mfa_secret')

    if (storedQr) {
      // Viene del registro — usar directamente
      setQrCode(storedQr)
      setSecret(storedSecret || '')
      setLoading(false)
    } else {
      // Admin o usuario creado por seed — pedir QR al backend
      axiosClient.get(`/auth/mfa/setup/${userId}`)
        .then(res => {
          setQrCode(res.data.data.qrCode)
          setSecret(res.data.data.secret)
        })
        .catch(err => {
          setError(err.response?.data?.message || 'Error obteniendo QR')
        })
        .finally(() => setLoading(false))
    }
  }, [userId])

  async function handleConfirm(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await authApi.confirmMfaSetup({ userId: parseInt(userId), totpCode })
      sessionStorage.removeItem('mfa_qr')
      sessionStorage.removeItem('mfa_secret')
      toast.success('MFA activado. Ahora puedes iniciar sesión.')
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido')
      setTotpCode('')
    } finally { setSaving(false) }
  }

  return (
    <div style={{
      minHeight:'100vh', background:'var(--bg-base)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'
    }}>
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)',
        borderRadius:'var(--radius-lg)', padding:'40px',
        width:'100%', maxWidth:'460px', boxShadow:'var(--shadow-lg)',
      }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:52, height:52,
            background:'linear-gradient(135deg, var(--brand), var(--cyan))',
            borderRadius:'var(--radius-md)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 16px', boxShadow:'var(--glow-brand)',
          }}>
            <Shield size={24} color="#fff"/>
          </div>
          <h2 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>
            Configurar Google Authenticator
          </h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
            Sigue los pasos para activar MFA en tu cuenta
          </p>
        </div>

        {[
          { n:'1', title:'Instala Google Authenticator',
            desc:'Descárgalo desde App Store o Google Play' },
          { n:'2', title:'Escanea el código QR',
            desc:'Abre la app y escanea el código de abajo' },
          { n:'3', title:'Confirma con el código',
            desc:'Ingresa el código de 6 dígitos generado' },
        ].map(s => (
          <div key={s.n} style={{
            display:'flex', alignItems:'center', gap:14,
            padding:'12px 0', borderBottom:'1px solid var(--border)'
          }}>
            <div style={{
              width:32, height:32, borderRadius:'50%',
              background:'var(--brand-light)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:13, color:'var(--brand)', flexShrink:0,
            }}>{s.n}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{s.title}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.desc}</div>
            </div>
          </div>
        ))}

        {/* QR o spinner */}
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
            <div className="spinner"/>
          </div>
        ) : qrCode ? (
          <div style={{
            textAlign:'center', margin:'24px 0', padding:'20px',
            background:'#fff', borderRadius:'var(--radius-md)',
          }}>
            <img src={qrCode} alt="QR MFA" style={{ width:180, height:180 }}/>
          </div>
        ) : null}

        {/* Clave manual backup */}
        {secret && !loading && (
          <div style={{
            background:'var(--bg-surface)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', padding:'10px 14px',
            marginBottom:20, fontSize:12, color:'var(--text-muted)',
            wordBreak:'break-all', textAlign:'center',
          }}>
            <div style={{ marginBottom:4, fontWeight:600 }}>Clave manual (backup):</div>
            <code style={{ color:'var(--cyan)', fontSize:13 }}>{secret}</code>
          </div>
        )}

        {error && (
          <div style={{
            background:'var(--danger-light)', border:'1px solid var(--danger)',
            borderRadius:'var(--radius-sm)', padding:'10px 14px',
            marginBottom:16, fontSize:13, color:'var(--danger)',
          }}>{error}</div>
        )}

        {!loading && (
          <form onSubmit={handleConfirm}
            style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Código de verificación</label>
              <input
                type="text" className="form-input"
                placeholder="000000" value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                style={{
                  textAlign:'center', fontSize:26,
                  fontWeight:700, letterSpacing:10, padding:'14px',
                }}
                maxLength={6} autoFocus required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={saving || totpCode.length !== 6}>
              {saving ? 'Verificando...' : 'Activar MFA'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
