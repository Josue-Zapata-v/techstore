// ================================================================
// Caso → Fase 3: Audit log - solo Admin y Auditor
// ================================================================
import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { productsApi } from '../api/products.api.js'
import { FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const ACTION_BADGE = {
  CREATE: 'badge-success',
  READ:   'badge-auditor',
  UPDATE: 'badge-gerente',
  DELETE: 'badge-danger',
}

export default function Audit() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    productsApi.getAudit()
      .then(r => setLogs(r.data.data || []))
      .catch(() => toast.error('Error cargando audit log'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout title="Auditoría">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">{logs.length} registros de actividad</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="spinner"/>
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <FileText size={40}/>
          <p>No hay registros de auditoría</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Recurso</th>
                <th>ID</th>
                <th>IP</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                    {new Date(l.timestamp).toLocaleString('es-PE')}
                  </td>
                  <td>
                    <div style={{ fontSize:13, fontWeight:500 }}>{l.nombre_completo || '—'}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{l.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${ACTION_BADGE[l.accion] || 'badge-success'}`}>
                      {l.accion}
                    </span>
                  </td>
                  <td style={{ fontSize:13 }}>{l.recurso}</td>
                  <td style={{ fontSize:12, color:'var(--text-muted)' }}>{l.recurso_id || '—'}</td>
                  <td style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>
                    {l.ip || '—'}
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-muted)', maxWidth:200 }}>
                    {l.detalle ? (
                      <code style={{ fontSize:11 }}>
                        {JSON.stringify(l.detalle).slice(0,60)}...
                      </code>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  )
}
