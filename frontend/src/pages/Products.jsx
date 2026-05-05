// ================================================================
// Caso → Fase 3 PARTE B: CRUD productos con reglas ABAC visibles
// ================================================================
import { useState, useEffect } from 'react'
import AppLayout from '../components/layout/AppLayout.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { productsApi } from '../api/products.api.js'
import toast from 'react-hot-toast'
import {
  Plus, Pencil, Trash2, Star, Search,
  Package, X, AlertCircle
} from 'lucide-react'

function canCreate(rol)          { return ['Admin','Gerente','Empleado'].includes(rol) }
function canEdit(rol, p, user)   {
  if (rol === 'Admin')    return true
  if (rol === 'Gerente')  return p.tienda_id === user.tiendaId
  if (rol === 'Empleado') return p.tienda_id === user.tiendaId
  return false
}
function canDelete(rol, p, user) {
  if (rol === 'Admin')   return true
  if (rol === 'Gerente') return p.tienda_id === user.tiendaId && !p.es_premium
  return false
}
function editableFields(rol) {
  if (rol === 'Admin')    return ['nombre','descripcion','precio','stock','categoria','esPremium']
  if (rol === 'Gerente')  return ['nombre','descripcion','precio','stock']
  if (rol === 'Empleado') return ['stock']
  return []
}

export default function Products() {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)  // null | 'create' | 'edit'
  const [selected, setSelected] = useState(null)
  const [form,     setForm]     = useState({})
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function load() {
    try {
      setLoading(true)
      const res = await productsApi.getAll()
      setProducts(res.data.data || [])
    } catch { toast.error('Error cargando productos') }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() {
    setForm({ nombre:'', descripcion:'', precio:'', stock:'0',
              categoria:'', tiendaId: user.tiendaId || '', esPremium: false })
    setSelected(null)
    setModal('create')
  }

  function openEdit(p) {
    setSelected(p)
    setForm({
      nombre:      p.nombre,
      descripcion: p.descripcion || '',
      precio:      p.precio,
      stock:       p.stock,
      categoria:   p.categoria || '',
      esPremium:   p.es_premium,
    })
    setModal('edit')
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form,
        precio:   parseFloat(form.precio),
        stock:    parseInt(form.stock),
        tiendaId: parseInt(form.tiendaId) || user.tiendaId,
      }
      if (modal === 'create') {
        await productsApi.create(payload)
        toast.success('Producto creado')
      } else {
        // Solo enviar campos permitidos
        const allowed  = editableFields(user.rol)
        const filtered = {}
        allowed.forEach(k => { if (payload[k] !== undefined) filtered[k] = payload[k] })
        await productsApi.update(selected.id, filtered)
        toast.success('Producto actualizado')
      }
      setModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  async function handleDelete(id) {
    setDeleting(id)
    try {
      await productsApi.delete(id)
      toast.success('Producto eliminado')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No puedes eliminar este producto')
    } finally { setDeleting(null) }
  }

  const fields = modal === 'edit' ? editableFields(user.rol) : null

  return (
    <AppLayout title="Productos">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">{filtered.length} producto(s) disponibles</p>
        </div>
        {canCreate(user.rol) && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16}/> Nuevo producto
          </button>
        )}
      </div>

      {/* Buscador */}
      <div style={{ position:'relative', marginBottom:20, maxWidth:360 }}>
        <Search size={15} style={{ position:'absolute', left:12, top:'50%',
          transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
        <input className="form-input" style={{ paddingLeft:36 }}
          placeholder="Buscar por nombre o categoría..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
          <div className="spinner"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={40}/>
          <p>No hay productos disponibles</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Tienda</th>
                <th>Premium</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight:500 }}>{p.nombre}</td>
                  <td><span style={{ color:'var(--text-secondary)', fontSize:13 }}>{p.categoria || '—'}</span></td>
                  <td style={{ fontWeight:600, color:'var(--success)' }}>
                    S/ {parseFloat(p.precio).toFixed(2)}
                  </td>
                  <td>
                    <span style={{
                      color: p.stock <= 5 ? 'var(--danger)' : p.stock <= 20 ? 'var(--warning)' : 'var(--text-primary)',
                      fontWeight: 600
                    }}>{p.stock}</span>
                  </td>
                  <td style={{ fontSize:13, color:'var(--text-secondary)' }}>{p.tienda_nombre}</td>
                  <td>
                    {p.es_premium
                      ? <span className="badge badge-premium"><Star size={10}/> Premium</span>
                      : <span style={{ color:'var(--text-muted)', fontSize:12 }}>—</span>
                    }
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      {canEdit(user.rol, p, user) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                          <Pencil size={13}/>
                        </button>
                      )}
                      {canDelete(user.rol, p, user) && (
                        <button className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(p.id)}
                          disabled={deleting === p.id}>
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {modal === 'create' ? 'Nuevo Producto' : `Editar: ${selected?.nombre}`}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>
                <X size={16}/>
              </button>
            </div>

            {modal === 'edit' && user.rol === 'Empleado' && (
              <div style={{
                margin:'0 24px', padding:'10px 14px',
                background:'var(--warning-light)', border:'1px solid var(--warning)',
                borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--warning)',
                display:'flex', alignItems:'center', gap:8
              }}>
                <AlertCircle size={13}/>
                Como Empleado solo puedes modificar el campo <strong>stock</strong>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="modal-body">
                {(!fields || fields.includes('nombre')) && (
                  <div className="form-group">
                    <label className="form-label">Nombre</label>
                    <input className="form-input" value={form.nombre}
                      onChange={e => setForm(f=>({...f, nombre:e.target.value}))} required/>
                  </div>
                )}
                {(!fields || fields.includes('descripcion')) && (
                  <div className="form-group">
                    <label className="form-label">Descripción</label>
                    <input className="form-input" value={form.descripcion}
                      onChange={e => setForm(f=>({...f, descripcion:e.target.value}))}/>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {(!fields || fields.includes('precio')) && (
                    <div className="form-group">
                      <label className="form-label">Precio (S/)</label>
                      <input className="form-input" type="number" min="0" step="0.01"
                        value={form.precio}
                        onChange={e => setForm(f=>({...f, precio:e.target.value}))} required/>
                    </div>
                  )}
                  {(!fields || fields.includes('stock')) && (
                    <div className="form-group">
                      <label className="form-label">Stock</label>
                      <input className="form-input" type="number" min="0"
                        value={form.stock}
                        onChange={e => setForm(f=>({...f, stock:e.target.value}))} required/>
                    </div>
                  )}
                </div>
                {(!fields || fields.includes('categoria')) && (
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <input className="form-input" value={form.categoria}
                      onChange={e => setForm(f=>({...f, categoria:e.target.value}))}/>
                  </div>
                )}
                {modal === 'create' && (
                  <div className="form-group">
                    <label className="form-label">Tienda ID</label>
                    <input className="form-input" type="number" min="1"
                      value={form.tiendaId}
                      onChange={e => setForm(f=>({...f, tiendaId:e.target.value}))}
                      disabled={user.rol !== 'Admin'} required/>
                  </div>
                )}
                {(!fields || fields.includes('esPremium')) && (
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.esPremium}
                      onChange={e => setForm(f=>({...f, esPremium:e.target.checked}))}/>
                    Producto Premium
                  </label>
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
