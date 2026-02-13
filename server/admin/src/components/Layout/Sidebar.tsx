import { Link } from 'react-router-dom'
import './Sidebar.css'

interface SidebarProps {
  currentPath: string
}

export function Sidebar({ currentPath }: SidebarProps) {
  const menuItems = [
    { path: '/admin/dashboard', label: '仪表盘', icon: '📊' },
    { path: '/admin/users', label: '用户管理', icon: '👥' },
    { path: '/admin/games', label: '游戏管理', icon: '🎮' },
    { path: '/admin/configs', label: '配置管理', icon: '⚙️' },
    { path: '/admin/gameplays', label: '游戏记录', icon: '📝' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>管理后台</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${currentPath === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
