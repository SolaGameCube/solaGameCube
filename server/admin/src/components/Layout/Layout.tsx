import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import './Layout.css'

export function Layout() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="layout">
      <Sidebar currentPath={location.pathname} />
      <div className="layout-content">
        <Header admin={admin} onLogout={handleLogout} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
