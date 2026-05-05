// ================================================================
// Caso → PARTE A: CRUD Usuarios + Asignación de Roles - solo Admin
// ================================================================
import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { usersApi, rolesApi } from '../api/rbac.api.js'
import axiosClient from '../api/axiosClient.js'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, UserX, UserCheck } from 'lucide-react'

const BADGE = {
  Admin:'badge-admin', Gerente:'badge-gerente',
  Empleado:'badge-empleado', Auditor:'badge-auditor'
}

export default function Users() {
  const [users,    setUsers]    = useState([])
  const [roles,    setRoles]    = useState([])
  const [tiendas,  setTiendas]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)

  async function load() {
    try {
      setLoading(true)
      const [u, r, t] = await Promise.all([
        usersApi.getAll(),
        rolesApi.getAll(),
        axiosClient.get('/auth/tiendas')
      ])
      setUsers(u.data.data   || [])
      setRoles(r.data.data   || [])
      setTiendas(t.data.data || [])
    } catch { toast.error('Error cargando datos') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm({ email:'', password:'', nombreCompleto:'', tiendaId:'', rolId:'' })
    setSelected(null)
    setModal('form')
  }

  function openEdit(u) {
    setSelected(u)
    setForm({ nombreCompleto: u.nombre_completo, tiendaId: u.tienda_id || '', activo: u.activo })
    setModal('form')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selected) {
        await usersApi.update(selected.id, {
          nombreCompleto: form.nombreCompleto,
          tiendaId:       form.tiendaId ? parseInt(form.tiendaId) : null,
          activo:         form.activo
        })
        toast.success('Usuario actualizado')
      } else {
        await usersApi.create({
          email:          form.email,
          password:       form.password,
          nombreCompleto: form.nombreCompleto,
          tiendaId:       form.tiendaId ? parseInt(form.tiendaId) : undefined,
          rolId:          form.rolId    ? parseInt(form.rolId)    : undefined,
        })
        toast.success('Usuario creado. Debe configurar MFA al primer login.')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  async function toggleActivo(u) {
    try {
      await usersApi.update(u.id, { activo: !u.activo })
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
      load()
    } catch { toast.error('Error al actualizar') }
  }

  return (
    <AppLayout title="Usuarios">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Usuarios</h1>
          <p className="page-subtitle">RBAC — Administración de cuentas y roles</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16}/> Nuevo usuario
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
                <th>Usuario</th>
                <th>Roles</th>
                <th>Tienda</th>
                <th>MFA</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight:500 }}>{u.nombre_completo}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {u.roles?.map(r => (
                        <span key={r.id} className={`badge ${BADGE[r.nombre]||'badge-success'}`}>
                          {r.nombre}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize:13, color:'var(--text-secondary)' }}>
                    {u.tienda_nombre || '—'}
                  </td>
                  <td>
                    <span className={`badge ${u.mfa_habilitado ? 'badge-success':'badge-danger'}`}>
                      {u.mfa_habilitado ? '✓ Activo' : '✗ Pendiente'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.activo ? 'badge-success':'badge-danger'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
                        <Pencil size={13}/>
                      </button>
                      <button
                        className={`btn btn-sm ${u.activo ? 'btn-danger':'btn-secondary'}`}
                        onClick={() => toggleActivo(u)}
                        title={u.activo ? 'Desactivar':'Activar'}>
                        {u.activo ? <UserX size={13}/> : <UserCheck size={13}/>}
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
              <span className="modal-title">
                {selected ? 'Editar Usuario' : 'Nuevo Usuario'}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre completo</label>
                  <input className="form-input" value={form.nombreCompleto} required
                    onChange={e => setForm(f=>({...f, nombreCompleto:e.target.value}))}
                    placeholder="Juan Pérez García"/>
                </div>

                {!selected && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-input" type="email" value={form.email} required
                        onChange={e => setForm(f=>({...f, email:e.target.value}))}
                        placeholder="usuario@techstore.com"/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contraseña</label>
                      <input className="form-input" type="password" value={form.password} required
                        onChange={e => setForm(f=>({...f, password:e.target.value}))}
                        placeholder="Mín. 8 chars, mayúscula, número, especial"/>
                    </div>
                  </>
                )}

                {/* Dropdown de tiendas — reemplaza el campo numérico */}
                <div className="form-group">
                  <label className="form-label">Tienda asignada</label>
                  <select className="form-input form-select" value={form.tiendaId}
                    onChange={e => setForm(f=>({...f, tiendaId:e.target.value}))}>
                    <option value="">Sin tienda asignada</option>
                    {tiendas.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} — {t.ciudad}
                      </option>
                    ))}
                  </select>
                </div>

                {!selected && (
                  <div className="form-group">
                    <label className="form-label">Rol</label>
                    <select className="form-input form-select" value={form.rolId}
                      onChange={e => setForm(f=>({...f, rolId:e.target.value}))}>
                      <option value="">Selecciona un rol</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
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
