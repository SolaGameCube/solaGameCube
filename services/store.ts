import { create } from 'zustand'
import { User, UserStats, Game, api, setWalletAddr } from './api'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 本地默认游戏（离线模式）
const LOCAL_GAMES: Game[] = [
  {
    id: 1,
    name: 'Moto X3M',
    icon: 'https://img.gamemonetize.com/3dwqqh0cdhpf2z9n4cagabdqmq3qb4ik/512x384.jpg',
    url: 'local://game/index.html',
    shortDesc: '刺激的摩托车越野游戏',
    orientation: 'landscape',
    bannerImage: 'https://img.gamemonetize.com/3dwqqh0cdhpf2z9n4cagabdqmq3qb4ik/512x384.jpg',
    isHot: true,
  },
]

interface AppState {
  // 用户状态
  user: User | null
  userStats: UserStats | null
  isLoggedIn: boolean
  isLoading: boolean
  walletAddr: string | null

  // 游戏状态
  games: Game[]
  banners: Game[]
  hotGames: Game[]
  currentPage: number
  hasMoreGames: boolean

  // 当前游戏会话
  currentGameSession: {
    gameId: number
    startTime: number
    gamePlayId?: number
    adClickCount?: number // 记录广告点击次数
  } | null

  // 操作
  login: (walletAddr: string) => Promise<boolean>
  logout: () => Promise<void>
  loadGames: (reset?: boolean) => Promise<void>
  loadBanners: () => Promise<void>
  loadHotGames: () => Promise<void>
  startGameSession: (gameId: number) => void
  endGameSession: () => Promise<{ earnedPoints: number; breakdown?: { timePoints: number; adPoints: number; openGameCost: number; durationMinutes: number } } | null>
  reportAdClick: () => Promise<void>
  refreshUserProfile: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  userStats: null,
  isLoggedIn: false,
  isLoading: false,
  walletAddr: null,
  games: [],
  banners: [],
  hotGames: [],
  currentPage: 1,
  hasMoreGames: true,
  currentGameSession: null,

  login: async (walletAddr) => {
    try {
      set({ isLoading: true, walletAddr })
      setWalletAddr(walletAddr)
      
      // 尝试连接后端，如果失败也允许继续（离线模式）
      try {
        const result = await api.auth.devLogin(walletAddr)
        if (result.success) {
          set({ user: result.user, isLoggedIn: true })
          // 加载用户统计
          await get().refreshUserProfile()
        }
      } catch (apiError) {
        console.warn('Backend connection failed, using offline mode:', apiError)
        // 离线模式：创建本地用户
        set({ 
          user: { 
            id: 0, 
            walletAddr, 
            points: 0, 
            createdAt: new Date().toISOString() 
          }, 
          isLoggedIn: true 
        })
      }
      
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    setWalletAddr(null)
    set({
      user: null,
      userStats: null,
      isLoggedIn: false,
      walletAddr: null,
      currentGameSession: null,
    })
  },

  loadGames: async (reset = false) => {
    const { currentPage, games, hasMoreGames } = get()
    
    if (!reset && !hasMoreGames) return

    try {
      set({ isLoading: true })
      const page = reset ? 1 : currentPage
      const result = await api.games.list(page)

      set({
        games: reset ? result.games : [...games, ...result.games],
        currentPage: page + 1,
        hasMoreGames: result.pagination.hasMore,
      })
    } catch (error) {
      console.error('Load games error:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  loadBanners: async () => {
    try {
      const result = await api.games.banners()
      set({ banners: result.banners })
    } catch (error) {
      console.error('Load banners error:', error)
    }
  },

  loadHotGames: async () => {
    try {
      const result = await api.games.hot(8)
      set({ hotGames: result.hotGames })
    } catch (error) {
      console.warn('Load hot games error, using local games:', error)
      // 降级到本地热门游戏
      const localHotGames = LOCAL_GAMES.filter((g) => g.isHot).slice(0, 8)
      set({ hotGames: localHotGames })
    }
  },

  startGameSession: (gameId) => {
    set({
      currentGameSession: {
        gameId,
        startTime: Date.now(),
        adClickCount: 0, // 初始化广告点击计数
      },
    })
  },

  endGameSession: async () => {
    const { currentGameSession, user } = get()
    
    if (!currentGameSession || !user) {
      console.log('endGameSession: 没有游戏会话或用户，跳过保存')
      set({ currentGameSession: null })
      return null
    }

    // 防止重复提交：如果已经提交过，就不再提交
    if (currentGameSession.gamePlayId) {
      console.log('endGameSession: 游戏数据已提交过，跳过重复提交', currentGameSession.gamePlayId)
      set({ currentGameSession: null })
      return null
    }

    try {
      const duration = Math.floor((Date.now() - currentGameSession.startTime) / 1000)
      const adClicks = currentGameSession.adClickCount || 0
      
      console.log('endGameSession: 开始提交游戏数据到服务器', {
        gameId: currentGameSession.gameId,
        duration,
        adClicks,
        walletAddr: user.walletAddr
      })
      
      // 退出游戏时一次性计算积分，包括广告点击次数
      const result = await api.points.earn(currentGameSession.gameId, duration, adClicks)
      
      console.log('endGameSession: 数据提交成功', {
        earnedPoints: result.earnedPoints,
        totalPoints: result.totalPoints,
        gamePlayId: result.gamePlayId
      })
      
      // 更新用户积分，并标记游戏会话已提交
      set({
        user: { ...user, points: result.totalPoints },
        currentGameSession: {
          ...currentGameSession,
          gamePlayId: result.gamePlayId, // 标记已提交，防止重复提交
        },
      })

      // 延迟清空会话，确保数据已保存
      setTimeout(() => {
        set({ currentGameSession: null })
      }, 100)

      return { 
        earnedPoints: result.earnedPoints,
        breakdown: result.breakdown
      }
    } catch (error) {
      console.error('endGameSession: 提交游戏数据失败', {
        error: error instanceof Error ? error.message : String(error),
        gameId: currentGameSession.gameId,
        duration: Math.floor((Date.now() - currentGameSession.startTime) / 1000),
        adClicks: currentGameSession.adClickCount || 0
      })
      // 即使提交失败，也清空会话，避免重复尝试
      set({ currentGameSession: null })
      return null
    }
  },

  reportAdClick: async () => {
    const { currentGameSession } = get()
    
    // 只记录广告点击次数，不立即计算积分
    // 积分在退出游戏时一次性计算，避免重复
    if (currentGameSession) {
      set({
        currentGameSession: {
          ...currentGameSession,
          adClickCount: (currentGameSession.adClickCount || 0) + 1,
        },
      })
      console.log('广告点击记录:', currentGameSession.adClickCount + 1)
    }
  },

  refreshUserProfile: async () => {
    try {
      const walletAddr = get().walletAddr
      console.log('refreshUserProfile: 开始刷新用户资料，钱包地址:', walletAddr)
      const result = await api.user.profile()
      console.log('refreshUserProfile: 获取到用户资料:', {
        points: result.user.points,
        totalGamesPlayed: result.stats.totalGamesPlayed,
        totalPlayTime: result.stats.totalPlayTime,
        totalPointsEarned: result.stats.totalPointsEarned
      })
      set({
        user: result.user,
        userStats: result.stats,
      })
    } catch (error) {
      console.error('refreshUserProfile: 刷新用户资料失败:', error)
      // 即使失败也不清空现有数据
    }
  },
}))
