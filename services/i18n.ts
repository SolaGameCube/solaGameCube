import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Language = 'system' | 'en' | 'zh'

const LANGUAGE_STORAGE_KEY = '@app_language'

// 翻译资源
const translations = {
  en: {
    // 通用
    ok: 'OK',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    
    // 登录页
    signIn: 'Sign In',
    quickLogin: 'Quick Login (Test Mode)',
    connectSolanaWallet: 'Connect Solana Wallet',
    supportedWallets: 'Supports Phantom, Solflare, Seeker and other wallets',
    playToEarn: 'Play games to earn points',
    pointsToCrypto: 'Exchange points for cryptocurrency',
    leaderboardChallenge: 'Leaderboard competition',
    loginAgreement: 'By signing in, you agree to our Terms of Service and Privacy Policy',
    testInstallHint: '💡 For testing, please install',
    testInstallHint2: 'or use quick login',
    connectionFailed: 'Connection Failed',
    connectionFailedMessage: 'Unable to connect wallet. Would you like to use a test wallet address for quick login?',
    useTestWallet: 'Use Test Wallet',
    connectionFailedMessage2: 'Unable to connect wallet. Please make sure you have installed a Solana wallet app',
    
    // 首页
    home: 'Home',
    announcement: 'Announcement',
    hotGames: 'Hot Games',
    allGames: 'All Games',
    points: 'Points',
    
    // 我的页面
    profile: 'My',
    walletAddress: 'Wallet Address',
    totalGames: 'Games Played',
    totalTime: 'Play Time (min)',
    totalEarned: 'Total Earned',
    pointsExchange: 'Points Exchange',
    officialTwitter: 'Official Twitter',
    recentlyPlayed: 'Recently Played Games',
    noGameHistory: 'No game history yet',
    goPlayGames: 'Go play games to earn points!',
    logout: 'Logout',
    confirmLogout: 'Are you sure you want to logout?',
    
    // 游戏页面
    exit: 'Exit',
    nowLoading: 'Now Loading',
    goHome: 'Go Home',
    reload: 'Reload',
    
    // 语言设置
    language: 'Language',
    followSystem: 'Follow System',
    english: 'English',
    chinese: 'Chinese',
    selectLanguage: 'Select Language',
    
    // 积分兑换
    pointsExchangeTitle: 'Points Exchange SKR',
    pointsExchangeDescription: 'Great news! Your game points will soon be exchangeable for SKR tokens!\n\nPoints earned through playing games can be exchanged for SKR tokens at a certain ratio in future versions, making your gaming time more valuable.\n\nSpecific exchange rules, exchange rates, and launch dates will be announced in future updates. Stay tuned!\n\nKeep playing games, accumulate more points, and get ready for the exchange! 🎮',
    iKnow: 'I Know',
    
    // 游戏历史
    recentPlay: 'Recent Play',
    pointsEarned: 'Points',
    
    // 日期
    today: 'Today',
    yesterday: 'Yesterday',
    
    // 首页
    welcomeBack: 'Welcome Back!',
    hotGames: 'Hot Games',
    allGames: 'All Games',
    pressAgainToExit: 'Press again to exit',
    
    // 游戏页面
    gameOver: 'Game Over',
    earnedPoints: 'Earned Points',
    playTime: 'Play Time',
    minutes: 'min',
    seconds: 'sec',
    continue: 'Continue',
    
    // 屏幕方向
    landscape: 'Landscape',
    portrait: 'Portrait',
  },
  zh: {
    // 通用
    ok: '确定',
    cancel: '取消',
    confirm: '确认',
    close: '关闭',
    save: '保存',
    loading: '加载中...',
    error: '错误',
    
    // 登录页
    signIn: '登录',
    quickLogin: '快速登录（测试模式）',
    connectSolanaWallet: '连接 Solana 钱包',
    supportedWallets: '支持 Phantom、Solflare、Seeker 等钱包',
    playToEarn: '玩游戏赚取积分',
    pointsToCrypto: '积分兑换虚拟货币',
    leaderboardChallenge: '排行榜竞技挑战',
    loginAgreement: '登录即表示您同意我们的服务条款和隐私政策',
    testInstallHint: '💡 测试时请安装',
    testInstallHint2: '或使用快速登录',
    connectionFailed: '连接失败',
    connectionFailedMessage: '无法连接钱包。是否使用测试钱包地址快速登录？',
    useTestWallet: '使用测试钱包',
    connectionFailedMessage2: '无法连接钱包，请确保已安装 Solana 钱包应用',
    
    // 首页
    home: '首页',
    announcement: '公告',
    hotGames: '热门游戏',
    allGames: '全部游戏',
    points: '积分',
    
    // 我的页面
    profile: '我的',
    walletAddress: '钱包地址',
    totalGames: '游戏次数',
    totalTime: '游戏时长(分)',
    totalEarned: '累计获得',
    pointsExchange: '积分兑换',
    officialTwitter: '官方推特',
    recentlyPlayed: '最近游玩的游戏',
    noGameHistory: '还没有游戏记录',
    goPlayGames: '快去玩游戏赚积分吧！',
    logout: '退出登录',
    confirmLogout: '确定要退出登录吗？',
    
    // 游戏页面
    exit: '退出',
    nowLoading: '正在加载',
    goHome: '返回主页',
    reload: '重新加载',
    
    // 语言设置
    language: '语言',
    followSystem: '跟随系统',
    english: 'English',
    chinese: '中文',
    selectLanguage: '选择语言',
    
    // 积分兑换
    pointsExchangeTitle: '积分兑换 SKR',
    pointsExchangeDescription: '好消息！您的游戏积分即将可以兑换 SKR 代币了！\n\n通过玩游戏获得的积分，未来将可以按照一定比例兑换成 SKR 代币，让您的游戏时间更有价值。\n\n具体兑换规则、兑换比例和开放时间将在后续版本中推出，敬请期待！\n\n继续玩游戏，积累更多积分，为兑换做好准备吧！🎮',
    iKnow: '我知道了',
    
    // 游戏历史
    recentPlay: '最近游玩',
    pointsEarned: '积分',
    
    // 日期
    today: '今天',
    yesterday: '昨天',
    
    // 首页
    welcomeBack: '欢迎回来!',
    hotGames: '热门游戏',
    allGames: '全部游戏',
    pressAgainToExit: '再按一次退出应用',
    
    // 游戏页面
    gameOver: '游戏结束',
    earnedPoints: '获得积分',
    playTime: '游戏时长',
    minutes: '分',
    seconds: '秒',
    continue: '继续',
    
    // 屏幕方向
    landscape: '横屏',
    portrait: '竖屏',
  },
}

export type TranslationKey = keyof typeof translations.en

// 获取系统语言
function getSystemLanguage(): 'en' | 'zh' {
  try {
    // 优先使用 getLocales() 方法，它返回按优先级排序的语言列表
    try {
      const locales = Localization.getLocales()
      if (locales && locales.length > 0) {
        // 使用列表中的第一个语言（通常是系统主要语言）
        const firstLocale = locales[0] as any
        const languageCode = (firstLocale.languageCode || '').toLowerCase()
        const languageTag = (firstLocale.languageTag || '').toLowerCase()
        
        // 检查第一个语言是否是中文
        if (languageCode.startsWith('zh') || languageTag.startsWith('zh')) {
          return 'zh'
        } else {
          return 'en'
        }
      }
    } catch (e) {
      // getLocales() 不可用，继续使用降级方案
    }
    
    // 降级方案：使用 Localization.locale
    const locale = Localization.locale || 'en'
    const localeLower = locale.toLowerCase()
    
    // 检查主要区域设置（支持 zh, zh-CN, zh-TW, zh-HK 等）
    if (localeLower.startsWith('zh')) {
      return 'zh'
    }
    
    // 降级方案：检查所有区域设置
    if (Localization.locales && Array.isArray(Localization.locales) && Localization.locales.length > 0) {
      const firstLocale = Localization.locales[0] as any
      const code = (firstLocale.languageCode || firstLocale.languageTag || '').toLowerCase()
      
      if (code.startsWith('zh')) {
        return 'zh'
      }
    }
    
    return 'en'
  } catch (error) {
    console.error('[i18n] Failed to get system language:', error)
    return 'en'
  }
}

// 获取当前语言
async function getCurrentLanguage(): Promise<Language> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (saved && (saved === 'system' || saved === 'en' || saved === 'zh')) {
      return saved as Language
    }
  } catch (error) {
    console.error('Failed to get language:', error)
  }
  return 'system'
}

// 设置语言
async function setLanguage(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch (error) {
    console.error('Failed to set language:', error)
  }
}

// 获取实际使用的语言（如果选择跟随系统，则返回系统语言）
function getActualLanguage(language: Language): 'en' | 'zh' {
  if (language === 'system') {
    return getSystemLanguage()
  }
  return language
}

// 翻译函数
function t(key: TranslationKey, language: Language): string {
  const actualLang = getActualLanguage(language)
  return translations[actualLang][key] || translations.en[key] || key
}

// 获取系统语言标签（用于显示）
function getSystemLanguageTag(): string {
  try {
    const locale = Localization.locale || 'en'
    
    // 尝试获取更详细的语言信息
    let tag = locale
    
    // 如果 locales 数组可用，尝试获取第一个区域设置
    if (Localization.locales && Array.isArray(Localization.locales) && Localization.locales.length > 0) {
      const firstLocale = Localization.locales[0] as any
      if (firstLocale.languageTag) {
        tag = firstLocale.languageTag
      } else if (firstLocale.languageCode && firstLocale.regionCode) {
        tag = `${firstLocale.languageCode}-${firstLocale.regionCode}`
      } else if (firstLocale.languageCode) {
        tag = firstLocale.languageCode
      }
    }
    
    // 尝试使用 getLocales() 方法
    try {
      const locales = Localization.getLocales()
      if (locales && locales.length > 0) {
        const firstLocale = locales[0] as any
        if (firstLocale.languageTag) {
          tag = firstLocale.languageTag
        } else if (firstLocale.languageCode && firstLocale.regionCode) {
          tag = `${firstLocale.languageCode}-${firstLocale.regionCode}`
        }
      }
    } catch (e) {
      // getLocales() 可能不可用，忽略
    }
    
    console.log('[i18n] System language tag:', tag)
    return tag
  } catch (error) {
    console.error('[i18n] Failed to get system language tag:', error)
    return 'en'
  }
}

export const i18n = {
  getSystemLanguage,
  getSystemLanguageTag,
  getCurrentLanguage,
  setLanguage,
  getActualLanguage,
  t,
  translations,
}
