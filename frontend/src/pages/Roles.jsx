// ================================================================
// Caso → PARTE A: CRUD de Roles - solo Admin
// ================================================================
import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { rolesApi } from '../api/rbac.api.js'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Shield, X, Users } from 'lucide-react'

export default function Roles() {
  const [roles,    setRoles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState({ nombre:'', descripcion:'' })
  const [saving,   setSaving]   = useState(false)

  async function load() {
    try {
      setLoading(true)
      const res = await rolesApi.getAll()
      setRoles(res.data.data || [])
    } catch { toast.error('Error cargando roles') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm({ nombre:'', descripcion:'' })
    setSelected(null)
    setModal('form')
  }

  function openEdit(r) {
    setSelected(r)
    setForm({ nombre: r.nombre, descripcion: r.descripcion || '' })
    setModal('form')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selected) {
        await rolesApi.update(selected.id, form)
        toast.success('Rol actualizado')
      } else {
        await rolesApi.create(form)
        toast.success('Rol creado')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  async function handleDelete(r) {
    if (r.total_usuarios > 0) {
      toast.error(`No se puede eliminar: tiene ${r.total_usuarios} usuario(s) asignado(s)`)
      return
    }
    try {
      await rolesApi.delete(r.id)
      toast.success('Rol eliminado')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar')
    }
  }

  const BADGE = {
    Admin:'badge-admin', Gerente:'badge-gerente',
    Empleado:'badge-empleado', Auditor:'badge-auditor'
  }

  return (
    <AppLayout title="Roles">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Roles</h1>
          <p className="page-subtitle">RBAC — Control de acceso basado en roles</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16}/> Nuevo rol
        </button>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="spinner"/>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Descripción</th>
                <th>Usuarios</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td>
                    <span className={`badge ${BADGE[r.nombre] || 'badge-success'}`}>
                      <Shield size={10}/> {r.nombre}
                    </span>
                  </td>
                  <td style={{ color:'var(--text-secondary)', fontSize:13 }}>
                    {r.descripcion || '—'}
                  </td>
                  <td>
                    <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:13 }}>
                      <Users size={13} color="var(--text-muted)"/>
                      {r.total_usuarios}
                    </span>
                  </td>
                  <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                    {new Date(r.fecha_creacion).toLocaleDateString('es-PE')}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>
                        <Pencil size={13}/>
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}
                        disabled={r.total_usuarios > 0} title={r.total_usuarios > 0
                          ? 'No se puede eliminar: tiene usuarios asignados' : 'Eliminar'}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'form' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selected ? 'Editar Rol' : 'Nuevo Rol'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del rol</label>
                  <input className="form-input" value={form.nombre} required
                    onChange={e => setForm(f=>({...f, nombre:e.target.value}))}
                    placeholder="Ej: Supervisor"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input className="form-input" value={form.descripcion}
                    onChange={e => setForm(f=>({...f, descripcion:e.target.value}))}
                    placeholder="Describe las responsabilidades del rol"/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
