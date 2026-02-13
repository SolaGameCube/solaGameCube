import { useState } from 'react'
import { ChangePassword } from '../Settings/ChangePassword'
import './Header.css'

interface HeaderProps {
  admin: { username: string; role: string } | null
  onLogout: () => void
}

export function Header({ admin, onLogout }: HeaderProps) {
  const [showChangePassword, setShowChangePassword] = useState(false)

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">管理后台</h1>
          <div className="header-actions">
            <span className="admin-info">
              {admin?.username} ({admin?.role})
            </span>
            <button onClick={() => setShowChangePassword(true)} className="change-password-button">
              修改密码
            </button>
            <button onClick={onLogout} className="logout-button">
              退出登录
            </button>
          </div>
        </div>
      </header>
      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </>
  )
}
