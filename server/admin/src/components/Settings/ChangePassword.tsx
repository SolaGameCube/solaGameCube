import { useState } from 'react'
import api from '../../services/api'
import './ChangePassword.css'

interface ChangePasswordProps {
  onClose: () => void
}

export function ChangePassword({ onClose }: ChangePasswordProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('请填写所有字段')
      return
    }

    if (newPassword.length < 6) {
      setError('新密码至少需要 6 个字符')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }

    setLoading(true)

    try {
      await api.post('/admin-auth/change-password', {
        oldPassword,
        newPassword,
      })
      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.error || '修改密码失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="change-password-modal">
      <div className="change-password-box">
        <h2>修改密码</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="oldPassword">当前密码</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">新密码</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">确认新密码</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">密码修改成功！</div>}
          <div className="form-actions">
            <button type="submit" disabled={loading || success} className="btn btn-primary">
              {loading ? '修改中...' : '确认修改'}
            </button>
            <button type="button" onClick={onClose} className="btn">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
