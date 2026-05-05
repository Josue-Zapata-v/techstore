// ================================================================
// Wrapper del layout principal con sidebar + topbar
// ================================================================
import Sidebar from './Sidebar.jsx'
import Topbar  from './Topbar.jsx'

export default function AppLayout({ title, children }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={title} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}
