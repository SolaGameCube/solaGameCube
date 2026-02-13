import api from './api'
import { storage } from '../utils/storage'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AdminInfo {
  id: number
  username: string
  role: string
}

export interface LoginResponse {
  success: boolean
  token: string
  admin: AdminInfo
}

export interface CaptchaResponse {
  id: string
  svg: string
}

export const authService = {
  getCaptcha: async (): Promise<CaptchaResponse> => {
    const response = await api.get<CaptchaResponse>('/admin-auth/captcha')
    return response.data
  },
  login: async (credentials: LoginCredentials & { captchaId: string; captcha: string }): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/admin-auth/login', credentials)
    storage.setToken(response.data.token)
    storage.setAdmin(response.data.admin)
    return response.data
  },
  logout: (): void => {
    storage.clear()
    window.location.href = '/admin/login'
  },
  getCurrentAdmin: async (): Promise<AdminInfo> => {
    const response = await api.get<{ admin: AdminInfo }>('/admin-auth/me')
    return response.data.admin
  },
  isAuthenticated: (): boolean => {
    return !!storage.getToken()
  },
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.post('/admin-auth/change-password', {
      oldPassword,
      newPassword,
    })
  },
}
