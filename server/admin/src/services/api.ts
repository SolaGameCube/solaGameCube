import axios from 'axios'
import { storage } from '../utils/storage'

// 获取 API 基础 URL
// 开发环境：使用相对路径（通过 Vite proxy）
// 生产环境：使用环境变量中的域名
const getBaseURL = () => {
  // 开发环境使用相对路径
  if (import.meta.env.DEV) {
    return '/api'
  }
  // 生产环境使用环境变量
  const apiDomain = import.meta.env.VITE_API_DOMAIN || window.location.origin
  return `${apiDomain}/api`
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：添加 token
api.interceptors.request.use(
  (config) => {
    const token = storage.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理 401 错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      storage.clear()
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
