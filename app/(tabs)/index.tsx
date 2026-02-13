import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  BackHandler,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import { AppText } from '@/components/app-text'
import { useAppStore } from '@/services/store'
import { Game, api } from '@/services/api'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { Image } from 'expo-image'
import { AppToast } from '@/components/app-toast'
import { AnnouncementModal } from '@/components/app-announcement-modal'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLanguage } from '@/hooks/useLanguage'

const { width } = Dimensions.get('window')
const BANNER_WIDTH = width - 40
const BANNER_HEIGHT = 200

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

export default function HomeScreen() {
  const router = useRouter()
  const { account } = useMobileWallet()
  const { t } = useLanguage()
  const { 
    user, 
    games, 
    banners, 
    hotGames,
    hasMoreGames, 
    isLoading,
    loadGames, 
    loadBanners,
    loadHotGames,
    startGameSession,
  } = useAppStore()

  const [bannerIndex, setBannerIndex] = useState(0)
  const [localMode, setLocalMode] = useState(false)
  const [announcement, setAnnouncement] = useState<{ id: string; title: string; content: string } | null>(null)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const bannerScrollRef = useRef<ScrollView>(null)
  const backPressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const backPressCountRef = useRef(0)
  const hasCheckedAnnouncementRef = useRef(false)

  // 显示的游戏列表（优先后端，降级本地）
  const displayGames = games.length > 0 ? games : LOCAL_GAMES
  const displayBanners = banners.length > 0 ? banners : LOCAL_GAMES
  const displayHotGames = hotGames.length > 0 ? hotGames : LOCAL_GAMES.slice(0, 8)

  useEffect(() => {
    loadData()
  }, [])

  // 处理返回键 - 再按一次退出应用
  // 使用 useFocusEffect 确保页面获得焦点时重新注册，失去焦点时清理
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') return

      // 重置计数，确保每次回到首页时都是初始状态
      backPressCountRef.current = 0
      if (backPressTimeoutRef.current) {
        clearTimeout(backPressTimeoutRef.current)
        backPressTimeoutRef.current = null
      }

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        const currentCount = backPressCountRef.current
        
        if (currentCount === 0) {
          // 第一次按返回键，显示提示
          backPressCountRef.current = 1
          AppToast.show(t('pressAgainToExit'), 2000)
          
          // 清除之前的定时器
          if (backPressTimeoutRef.current) {
            clearTimeout(backPressTimeoutRef.current)
          }
          
          // 2秒后重置计数
          backPressTimeoutRef.current = setTimeout(() => {
            backPressCountRef.current = 0
          }, 2000)
          
          return true // 阻止默认返回行为
        } else if (currentCount === 1) {
          // 第二次按返回键（在2秒内），退出应用
          // 清除定时器
          if (backPressTimeoutRef.current) {
            clearTimeout(backPressTimeoutRef.current)
            backPressTimeoutRef.current = null
          }
          // 重置计数
          backPressCountRef.current = 0
          // 退出应用
          BackHandler.exitApp()
          return true
        }
        
        return false
      })

      return () => {
        backHandler.remove()
        if (backPressTimeoutRef.current) {
          clearTimeout(backPressTimeoutRef.current)
          backPressTimeoutRef.current = null
        }
        // 重置计数
        backPressCountRef.current = 0
      }
    }, [])
  )

  const loadData = async () => {
    try {
      await Promise.all([loadBanners(), loadHotGames(), loadGames(true)])
      setLocalMode(false)
    } catch (error) {
      console.warn('Failed to load from backend, using local games')
      setLocalMode(true)
    }
  }

  // 检查公告（只在登录后检查一次）
  const checkAnnouncement = useCallback(async () => {
    if (hasCheckedAnnouncementRef.current || !user) return
    
    try {
      const result = await api.config.announcement()
      if (result.hasAnnouncement && result.content && result.id) {
        // 检查是否已读
        const STORAGE_KEY = '@read_announcements'
        let readAnnouncements: string[] = []
        
        try {
          const readStr = await AsyncStorage.getItem(STORAGE_KEY)
          if (readStr) {
            readAnnouncements = JSON.parse(readStr)
          }
        } catch (error) {
          console.warn('Failed to read read announcements:', error)
        }
        
        // 如果这个公告ID已经读过，就不显示
        if (readAnnouncements.includes(result.id)) {
          console.log('公告已读，不显示:', result.id)
          hasCheckedAnnouncementRef.current = true
          return
        }
        
        // 显示公告
        setAnnouncement({
          id: result.id,
          title: result.title || t('announcement'),
          content: result.content
        })
        setShowAnnouncement(true)
        hasCheckedAnnouncementRef.current = true
      } else {
        // 没有公告，标记为已检查
        hasCheckedAnnouncementRef.current = true
      }
    } catch (error) {
      // 如果后端未运行或接口不存在，静默处理，不显示错误
      console.warn('Failed to load announcement (backend may not be running):', error)
      hasCheckedAnnouncementRef.current = true
    }
  }, [user, t])

  // 当用户登录后检查公告
  useFocusEffect(
    useCallback(() => {
      if (user && !hasCheckedAnnouncementRef.current) {
        checkAnnouncement()
      }
    }, [user, checkAnnouncement])
  )


  const handlePlayGame = (game: Game) => {
    startGameSession(game.id)
    router.push({
      pathname: '/(tabs)/game',
      params: { 
        gameId: game.id.toString(),
        gameUrl: game.url,
        orientation: game.orientation,
        gameName: game.name,
      },
    })
  }

  // 获取钱包地址显示
  const walletDisplay = account?.publicKey?.toBase58() || user?.walletAddr || '未连接'
  const shortWallet = walletDisplay.length > 12 
    ? walletDisplay.substring(0, 8) + '...' + walletDisplay.slice(-6)
    : walletDisplay

  // 获取头像图片源
  const getAvatarSource = (avatarName: string) => {
    const avatarNumber = avatarName.replace('.png', '')
    const avatarMap: { [key: string]: any } = {
      '1': require('@/assets/images/head/1.png'),
      '2': require('@/assets/images/head/2.png'),
      '3': require('@/assets/images/head/3.png'),
      '4': require('@/assets/images/head/4.png'),
      '5': require('@/assets/images/head/5.png'),
      '6': require('@/assets/images/head/6.png'),
      '7': require('@/assets/images/head/7.png'),
      '8': require('@/assets/images/head/8.png'),
      '9': require('@/assets/images/head/9.png'),
    }
    return avatarMap[avatarNumber] || avatarMap['1']
  }

  // 自动轮播
  useEffect(() => {
    if (displayBanners.length <= 1) return
    
    const timer = setInterval(() => {
      setBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % displayBanners.length
        
        // 使用 ScrollView 的 scrollTo
        if (bannerScrollRef.current) {
          const scrollX = nextIndex * width
          bannerScrollRef.current.scrollTo({
            x: scrollX,
            animated: true,
          })
        }
        
        return nextIndex
      })
    }, 4000)
    
    return () => clearInterval(timer)
  }, [displayBanners.length, width])


  // 使用 useMemo 和 useCallback 优化 banner 渲染
  const BannerItem = React.memo(({ game, index }: { game: Game; index: number }) => {
    const bannerImage = game.bannerImage || game.icon
    
    return (
      <View style={[styles.bannerItem, { width }]}>
        <TouchableOpacity
          onPress={() => handlePlayGame(game)}
          activeOpacity={0.9}
          style={styles.bannerTouchable}
        >
          <Image
            source={{ uri: bannerImage }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.bannerOverlay}
          >
            <View style={styles.bannerContent}>
              <AppText style={styles.bannerTitle}>
                {game.name}
              </AppText>
              <AppText style={styles.bannerDesc}>
                {game.shortDesc}
              </AppText>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    )
  }, (prevProps, nextProps) => {
    // 自定义比较函数，只有当游戏数据变化时才重新渲染
    return prevProps.game.id === nextProps.game.id &&
           prevProps.game.name === nextProps.game.name &&
           (prevProps.game.bannerImage || prevProps.game.icon) === (nextProps.game.bannerImage || nextProps.game.icon)
  })

  const renderBanner = useCallback(() => {
    if (displayBanners.length === 0) return null

    return (
      <View style={styles.bannerContainer}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x
            const index = Math.round(offsetX / width)
            if (index >= 0 && index < displayBanners.length && index !== bannerIndex) {
              setBannerIndex(index)
            }
          }}
          onMomentumScrollEnd={(e) => {
            const offsetX = e.nativeEvent.contentOffset.x
            const index = Math.round(offsetX / width)
            if (index >= 0 && index < displayBanners.length) {
              setBannerIndex(index)
            }
          }}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="start"
          contentContainerStyle={{ width: width * displayBanners.length }}
        >
          {displayBanners.map((game, index) => (
            <BannerItem key={`banner-${game.id}-${index}`} game={game} index={index} />
          ))}
        </ScrollView>
      </View>
    )
  }, [displayBanners, width])

  // 使用 React.memo 优化热门游戏渲染，防止轮播滚动时重新渲染
  const HotGameItem = React.memo(({ game }: { game: Game }) => (
    <TouchableOpacity
      style={styles.hotGameItem}
      onPress={() => handlePlayGame(game)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: game.icon }} 
        style={styles.hotGameIcon}
        contentFit="contain"
        transition={200}
      />
      <AppText style={styles.hotGameName} numberOfLines={1}>
        {game.name}
      </AppText>
    </TouchableOpacity>
  ), (prevProps, nextProps) => {
    return prevProps.game.id === nextProps.game.id &&
           prevProps.game.icon === nextProps.game.icon &&
           prevProps.game.name === nextProps.game.name
  })

  const renderHotGame = useCallback((game: Game, index: number) => (
    <HotGameItem key={game.id} game={game} />
  ), [])

  const renderGameItem = ({ item }: { item: Game }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => handlePlayGame(item)}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.icon }} 
        style={styles.gameIcon}
        contentFit="contain"
        transition={200}
      />
      <View style={styles.gameInfo}>
        <AppText style={styles.gameName}>{item.name}</AppText>
        <AppText style={styles.gameDesc} numberOfLines={1}>
          {item.shortDesc}
        </AppText>
        <View style={styles.gameTags}>
          <View style={[
            styles.tag,
            item.orientation === 'landscape' ? styles.tagLandscape : styles.tagPortrait
          ]}>
            <AppText style={styles.tagText}>
              {item.orientation === 'landscape' ? t('landscape') : t('portrait')}
            </AppText>
          </View>
        </View>
      </View>
      <View style={styles.playButton}>
        <AppText style={styles.playButtonText}>▶</AppText>
      </View>
    </TouchableOpacity>
  )

  // 将 Banner 和热门游戏分离，避免 bannerIndex 变化时重新渲染热门游戏
  const BannerSection = useMemo(() => renderBanner(), [renderBanner])
  
  // 指示器单独 memoize，依赖 bannerIndex
  const BannerIndicatorsMemo = useMemo(() => {
    if (displayBanners.length <= 1) return null
    
    return (
      <View style={styles.indicators}>
        {displayBanners.map((_, i) => (
          <View
            key={`indicator-${i}`}
            style={[
              styles.indicator,
              i === bannerIndex && styles.indicatorActive,
            ]}
          />
        ))}
      </View>
    )
  }, [displayBanners.length, bannerIndex])
  
  const HotGamesSection = useMemo(() => {
    const hotGamesToShow = displayHotGames.slice(0, 8)
    return (
      <View style={styles.hotGamesSection}>
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>🔥 {t('hotGames')}</AppText>
        </View>
        <View style={styles.hotGamesGrid}>
          {hotGamesToShow.map((game) => (
            <HotGameItem key={game.id} game={game} />
          ))}
        </View>
      </View>
    )
  }, [displayHotGames, t])

  // 使用 useMemo 优化 ListHeader，避免轮播滚动时重新渲染
  const ListHeader = useMemo(() => {
    return (
      <View>
        {/* 用户信息栏 */}
        <View style={styles.userBar}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image
                  source={getAvatarSource(user.avatar)}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <AppText style={styles.avatarText}>👤</AppText>
              )}
            </View>
            <View style={styles.userText}>
              <AppText style={styles.greeting}>{t('welcomeBack')}</AppText>
              <AppText style={styles.walletAddr} numberOfLines={1}>
                {shortWallet}
              </AppText>
            </View>
          </View>
          <View style={styles.pointsBox}>
            <AppText style={styles.pointsLabel}>{t('points')}</AppText>
            <AppText style={styles.pointsValue}>
              {(user?.points || 0).toLocaleString()}
            </AppText>
          </View>
        </View>

        {/* Banner 轮播 */}
        <View>
          {BannerSection}
          {BannerIndicatorsMemo}
        </View>

        {/* 热门游戏（8个） */}
        {HotGamesSection}

        {/* 游戏列表标题 */}
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>🎯 {t('allGames')}</AppText>
        </View>
      </View>
    )
  }, [shortWallet, user?.points, BannerSection, HotGamesSection, BannerIndicatorsMemo, t])

  return (
    <View style={styles.container}>
      <FlatList
        data={displayGames}
        renderItem={renderGameItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (hasMoreGames && !isLoading && !localMode) {
            loadGames()
          }
        }}
        onEndReachedThreshold={0.5}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingFooter}>
              <AppText style={styles.loadingText}>{t('loading')}</AppText>
            </View>
          ) : null
        }
      />
      
      {/* 公告弹窗 */}
      {announcement && (
        <AnnouncementModal
          visible={showAnnouncement}
          id={announcement.id}
          title={announcement.title}
          content={announcement.content}
          onClose={() => setShowAnnouncement(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  listContent: {
    paddingBottom: 100,
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 24,
  },
  userText: {
    flex: 1,
  },
  greeting: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  walletAddr: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  pointsBox: {
    backgroundColor: 'rgba(0,210,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.3)',
  },
  pointsLabel: {
    color: '#00d2ff',
    fontSize: 11,
    marginBottom: 2,
  },
  pointsValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerContainer: {
    marginBottom: 20,
    height: BANNER_HEIGHT,
  },
  bannerItem: {
    width: width, // 每个 item 宽度等于屏幕宽度，用于 pagingEnabled
    height: BANNER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    flexShrink: 0, // 防止被压缩
  },
  bannerTouchable: {
    width: BANNER_WIDTH, // width - 40 (padding)
    height: BANNER_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  bannerContent: {
    marginTop: 20,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bannerDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#00d2ff',
    width: 20,
  },
  hotGamesSection: {
    marginBottom: 20,
  },
  hotGamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  hotGameItem: {
    width: (width - 60) / 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  hotGameIcon: {
    width: (width - 60) / 4,
    height: (width - 60) / 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  hotGameName: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gameIcon: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gameInfo: {
    flex: 1,
    marginLeft: 14,
  },
  gameName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  gameDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 8,
  },
  gameTags: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagLandscape: {
    backgroundColor: 'rgba(0,210,255,0.2)',
  },
  tagPortrait: {
    backgroundColor: 'rgba(20,241,149,0.2)',
  },
  tagText: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '500',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00d2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  separator: {
    height: 12,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
})
