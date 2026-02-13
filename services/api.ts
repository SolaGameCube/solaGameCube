import { Platform } from 'react-native'

// API 基础配置
// 检测是否为模拟器（更可靠的检测方法）
const isEmulator = Platform.OS === 'android' && (
  Platform.constants?.Brand === 'generic' || 
  Platform.constants?.Brand === 'unknown' ||
  Platform.constants?.Model?.toLowerCase().includes('sdk') ||
  Platform.constants?.Model?.toLowerCase().includes('emulator') ||
  Platform.constants?.Model?.toLowerCase().includes('google_sdk') ||
  Platform.constants?.Fingerprint?.includes('generic') ||
  Platform.constants?.Fingerprint?.includes('unknown')
)

// 获取电脑的局域网 IP（实体机需要这个）
// 如果环境变量设置了就用环境变量，否则自动检测
const getLocalNetworkIP = () => {
  // 可以通过环境变量设置：EXPO_PUBLIC_LOCAL_IP=192.168.1.13
  if (process.env.EXPO_PUBLIC_LOCAL_IP) {
    return process.env.EXPO_PUBLIC_LOCAL_IP
  }
  // 默认值（根据你的网络环境修改）
  return '192.168.1.13' // 你的电脑局域网 IP
}

const DEV_API_URL = Platform.select({
  android: isEmulator 
    ? 'http://10.0.2.2:3001'  // 模拟器：10.0.2.2 指向本机
    : `http://${getLocalNetworkIP()}:3001`, // 实体机：使用局域网 IP
  ios: 'http://localhost:3001',
  web: 'http://localhost:3001',
  default: 'http://localhost:3001',
})

// 生产环境 API（从环境变量读取，如果没有则使用默认值）
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.SolaGameCube.com'

// 根据环境选择 API URL
// 开发环境：使用本地服务器
// 生产环境：使用环境变量中的域名
export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL

// 调试信息
if (__DEV__) {
  console.log('API Configuration:', {
    platform: Platform.OS,
    isEmulator,
    apiUrl: API_URL,
    localIP: getLocalNetworkIP(),
    brand: Platform.constants?.Brand,
    model: Platform.constants?.Model,
  })
}

// 存储钱包地址
let currentWalletAddr: string | null = null

export const setWalletAddr = (addr: string | null) => {
  currentWalletAddr = addr
}

export const getWalletAddr = () => currentWalletAddr

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (currentWalletAddr) {
    headers['X-Wallet-Address'] = currentWalletAddr
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// API 接口
export const api = {
  // 健康检查
  health: () => request<{ status: string; timestamp: string }>('/api/health'),

  // 认证
  auth: {
    login: (walletAddr: string, signature: string, message: string) =>
      request<{ success: boolean; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ walletAddr, signature, message }),
      }),

    devLogin: (walletAddr: string) =>
      request<{ success: boolean; user: User }>('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ walletAddr }),
      }),
  },

  // 游戏
  games: {
    list: (page = 1, limit = 10) =>
      request<{ games: Game[]; pagination: Pagination }>(
        `/api/games?page=${page}&limit=${limit}`
      ),

    banners: () => request<{ banners: Game[] }>('/api/games/banners'),

    hot: (limit = 8) => request<{ hotGames: Game[] }>(`/api/games/hot?limit=${limit}`),

    detail: (id: number) => request<{ game: Game }>(`/api/games/${id}`),
  },

  // 用户
  user: {
    profile: () =>
      request<{ user: User; stats: UserStats }>('/api/user/profile'),

    history: (page = 1, limit = 20) =>
      request<{ history: GameHistory[]; pagination: Pagination }>(
        `/api/user/history?page=${page}&limit=${limit}`
      ),
  },

  // 积分
  points: {
    earn: (gameId: number, duration: number, adClicks = 0) =>
      request<{
        success: boolean
        earnedPoints: number
        breakdown: PointsBreakdown
        totalPoints: number
        gamePlayId: number
      }>('/api/points/earn', {
        method: 'POST',
        body: JSON.stringify({ gameId, duration, adClicks }),
      }),

    adClick: (gamePlayId: number) =>
      request<{ success: boolean; adPoints: number; totalPoints: number }>(
        '/api/points/ad-click',
        {
          method: 'POST',
          body: JSON.stringify({ gamePlayId }),
        }
      ),
  },

  // 配置
  config: {
    rules: () =>
      request<{ rules: Record<string, { value: string; description: string }> }>(
        '/api/config/rules'
      ),
    
    announcement: () =>
      request<{ hasAnnouncement: boolean; id?: string; title?: string; content?: string }>(
        '/api/config/announcement'
      ),
    
    exchangeInfo: () =>
      request<{ title: string; icon: string; description: string }>(
        '/api/config/exchange-info'
      ),
  },
}

// 类型定义
export interface User {
  id: number
  walletAddr: string
  points: number
  avatar?: string | null
  createdAt: string
}

export interface UserStats {
  totalGamesPlayed: number
  totalPlayTime: number
  totalPointsEarned: number
}

export interface Game {
  id: number
  name: string
  icon: string
  url: string
  description?: string
  shortDesc: string
  orientation: 'landscape' | 'portrait'
  bannerImage?: string
  isHot?: boolean
}

export interface GameHistory {
  id: number
  game: { id: number; name: string; icon: string; url: string; orientation: string }
  duration: number
  earnedPoints: number
  playedAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface PointsBreakdown {
  timePoints: number
  adPoints: number
  openGameCost: number
  durationMinutes: number
}
