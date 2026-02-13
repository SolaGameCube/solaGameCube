import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth'
import './LoginForm.css'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [captchaId, setCaptchaId] = useState('')
  const [captchaSvg, setCaptchaSvg] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // 加载验证码
  const loadCaptcha = async () => {
    try {
      const { id, svg } = await authService.getCaptcha()
      setCaptchaId(id)
      setCaptchaSvg(svg)
      setCaptcha('')
    } catch (err) {
      console.error('Failed to load captcha:', err)
    }
  }

  useEffect(() => {
    loadCaptcha()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!captcha) {
      setError('请输入验证码')
      setLoading(false)
      return
    }

    try {
      await login(username, password, captchaId, captcha)
      navigate('/admin/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请检查用户名和密码')
      // 登录失败后刷新验证码
      loadCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>管理后台登录</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="captcha">验证码</label>
            <div className="captcha-container">
              <input
                id="captcha"
                type="text"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                placeholder="请输入验证码"
                required
                maxLength={4}
                className="captcha-input"
              />
              <div 
                className="captcha-display" 
                onClick={loadCaptcha} 
                title="点击刷新验证码"
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
              />
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading} className="login-button">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
