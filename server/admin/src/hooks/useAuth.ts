import { useState, useEffect } from 'react'
import { authService } from '../services/auth'
import type { AdminInfo } from '../services/auth'
import { storage } from '../utils/storage'

export function useAuth() {
  const [admin, setAdmin] = useState<AdminInfo | null>(storage.getAdmin())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const adminInfo = await authService.getCurrentAdmin()
          setAdmin(adminInfo)
          storage.setAdmin(adminInfo)
        } catch (error) {
          authService.logout()
          setAdmin(null)
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [])

  const login = async (username: string, password: string, captchaId: string, captcha: string) => {
    const response = await authService.login({ username, password, captchaId, captcha })
    setAdmin(response.admin)
    return response
  }

  const logout = () => {
    authService.logout()
    setAdmin(null)
  }

  return {
    admin,
    loading,
    login,
    logout,
    isAuthenticated: !!admin,
  }
}
