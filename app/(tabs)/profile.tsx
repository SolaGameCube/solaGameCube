import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Linking,
  Platform,
  Pressable,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import { AppText } from '@/components/app-text'
import { useAppStore } from '@/services/store'
import { useAuth } from '@/components/auth/auth-provider'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { api, GameHistory } from '@/services/api'
import { Image } from 'expo-image'
import { useLanguage } from '@/hooks/useLanguage'
import { i18n } from '@/services/i18n'

// 语言设置菜单项组件
function LanguageSelectorMenuItem() {
  const { t, actualLanguage } = useLanguage()
  const [showModal, setShowModal] = useState(false)
  const { language, setLanguage } = useLanguage()
  const [systemLanguageTag, setSystemLanguageTag] = useState<string>('')

  // 获取系统语言标签
  useEffect(() => {
    const tag = i18n.getSystemLanguageTag()
    setSystemLanguageTag(tag)
  }, [])

  // 使用实际语言来显示选项标签，确保即使选择了"跟随系统"，选项标签也能正确显示
  // 但选项标签应该用当前实际使用的语言显示，而不是用系统语言
  const languages: { value: 'system' | 'en' | 'zh'; label: { en: string; zh: string } }[] = [
    { 
      value: 'system', 
      label: { 
        en: `Follow System${systemLanguageTag ? ` (${systemLanguageTag})` : ''}`, 
        zh: `跟随系统${systemLanguageTag ? ` (${systemLanguageTag})` : ''}` 
      } 
    },
    { value: 'en', label: { en: 'English', zh: 'English' } },
    { value: 'zh', label: { en: 'Chinese', zh: '中文' } },
  ]
  
  // 根据实际语言获取标签
  const getLabel = (labels: { en: string; zh: string }) => {
    return actualLanguage === 'zh' ? labels.zh : labels.en
  }

  const handleSelect = async (lang: 'system' | 'en' | 'zh') => {
    await setLanguage(lang)
    setShowModal(false)
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.menuItem}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <AppText style={styles.menuIcon}>🌐</AppText>
        <AppText style={styles.menuText}>{t('language')}</AppText>
        <AppText style={styles.menuArrow}>›</AppText>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable 
          style={styles.languageModalOverlay}
          onPress={() => setShowModal(false)}
        >
          <Pressable style={styles.languageModalContent} onPress={(e) => e.stopPropagation()}>
            {/* 标题区域 */}
            <View style={styles.languageModalHeader}>
              <View style={styles.languageModalIconContainer}>
                <AppText style={styles.languageModalIcon}>🌐</AppText>
              </View>
              <AppText style={styles.languageModalTitle}>{t('selectLanguage')}</AppText>
            </View>

            {/* 语言选项 */}
            <View style={styles.languageOptionsContainer}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.value}
                  style={[
                    styles.languageOption,
                    language === lang.value && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleSelect(lang.value)}
                  activeOpacity={0.8}
                >
                  <View style={styles.languageOptionContent}>
                    <View style={styles.languageOptionLeft}>
                      <View style={[
                        styles.languageOptionRadio,
                        language === lang.value && styles.languageOptionRadioSelected
                      ]}>
                        {language === lang.value && (
                          <View style={styles.languageOptionRadioInner} />
                        )}
                      </View>
                      <AppText
                        style={[
                          styles.languageOptionText,
                          language === lang.value && styles.languageOptionTextSelected,
                        ]}
                      >
                        {getLabel(lang.label)}
                      </AppText>
                    </View>
                    {language === lang.value && (
                      <View style={styles.languageCheckmarkContainer}>
                        <AppText style={styles.languageCheckmark}>✓</AppText>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* 关闭按钮 */}
            <TouchableOpacity
              style={styles.languageCloseButton}
              onPress={() => setShowModal(false)}
              activeOpacity={0.8}
            >
              <AppText style={styles.languageCloseButtonText}>{t('cancel')}</AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { account } = useMobileWallet()
  const { user, userStats, logout, refreshUserProfile, startGameSession } = useAppStore()
  const { t } = useLanguage()
  
  // 钱包地址
  const walletAddr = account?.publicKey?.toBase58() || user?.walletAddr || ''
  const shortWallet = walletAddr.length > 20
    ? walletAddr.substring(0, 10) + '...' + walletAddr.slice(-8)
    : walletAddr

  const [history, setHistory] = useState<GameHistory[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [exchangeInfo, setExchangeInfo] = useState<{ title: string; icon: string; description: string } | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      console.log('loadHistory: 开始加载游戏历史，钱包地址:', walletAddr)
      const result = await api.user.history(1, 5) // 只获取最近 5 条记录
      console.log('loadHistory: 获取到游戏历史:', result.history.length, '条')
      setHistory(result.history)
    } catch (error) {
      console.error('loadHistory: 加载游戏历史失败:', error)
      // 如果加载失败，至少显示空数组，避免显示错误
      setHistory([])
    }
  }, [walletAddr])

  // 加载兑换提示内容
  const loadExchangeInfo = useCallback(async () => {
    try {
      const info = await api.config.exchangeInfo()
      setExchangeInfo(info)
    } catch (error) {
      console.error('Load exchange info error:', error)
      // 使用默认内容
      setExchangeInfo({
        title: t('pointsExchangeTitle'),
        icon: '💰',
        description: t('pointsExchangeDescription')
      })
    }
  }, [t])

  // 页面获得焦点时自动刷新数据（游戏次数、时长等）
  useFocusEffect(
    useCallback(() => {
      // 自动刷新用户资料和游戏历史
      refreshUserProfile()
      loadHistory()
      loadExchangeInfo()
    }, [refreshUserProfile, loadHistory, loadExchangeInfo])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refreshUserProfile(), loadHistory()])
    setRefreshing(false)
  }, [])

  const handleLogout = () => {
    Alert.alert(t('logout'), t('confirmLogout'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('confirm'),
        style: 'destructive',
        onPress: async () => {
          await signOut()
          await logout()
          router.replace('/sign-in')
        },
      },
    ])
  }

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return t('today')
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday')
    } else {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
  }

  const handlePlayGame = useCallback((item: GameHistory) => {
    // 开始游戏会话
    startGameSession(item.game.id)
    // 导航到游戏页面
    router.push({
      pathname: '/(tabs)/game',
      params: {
        gameId: item.game.id.toString(),
        gameUrl: item.game.url,
        orientation: item.game.orientation || 'landscape',
        gameName: item.game.name,
      },
    })
  }, [router, startGameSession])

  const renderHistoryItem = (item: GameHistory) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.historyItem}
      onPress={() => handlePlayGame(item)}
      activeOpacity={0.7}
    >
      <View style={styles.historyIconContainer}>
        <Image 
          source={{ uri: item.game.icon }} 
          style={styles.historyIcon}
          contentFit="contain"
          transition={200}
        />
      </View>
      <View style={styles.historyInfo}>
        <AppText style={styles.historyName}>{item.game.name}</AppText>
        <AppText style={styles.historyTime}>
          {t('recentPlay')}: {formatDate(item.playedAt)}
        </AppText>
      </View>
      <View style={styles.historyPoints}>
        <AppText style={styles.historyPointsValue}>+{item.earnedPoints}</AppText>
        <AppText style={styles.historyPointsLabel}>{t('pointsEarned')}</AppText>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d2ff" />
        }
      >
        {/* 用户卡片 */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarLarge}>
              {user?.avatar ? (
                <Image
                  source={getAvatarSource(user.avatar)}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <AppText style={styles.avatarEmoji}>👤</AppText>
              )}
            </View>
            <View style={styles.avatarBadge}>
              <AppText style={styles.badgeIcon}>🎮</AppText>
            </View>
          </View>

          <AppText style={styles.walletAddress}>{shortWallet}</AppText>

          {/* 积分徽章 */}
          <View style={styles.pointsBadge}>
            <AppText style={styles.pointsBadgeText}>
              {(user?.points || 0).toLocaleString()}{t('points')}
            </AppText>
          </View>

          {/* 统计数据 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <AppText style={styles.statValue}>{userStats?.totalGamesPlayed || 0}</AppText>
              <AppText style={styles.statLabel}>{t('totalGames')}</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText style={styles.statValue}>
                {Math.floor((userStats?.totalPlayTime || 0) / 60)}
              </AppText>
              <AppText style={styles.statLabel}>{t('totalTime')}</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AppText style={styles.statValue}>{userStats?.totalPointsEarned || 0}</AppText>
              <AppText style={styles.statLabel}>{t('totalEarned')}</AppText>
            </View>
          </View>
        </View>

        {/* 功能菜单 */}
        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setShowExchangeModal(true)}
          >
            <AppText style={styles.menuIcon}>💰</AppText>
            <AppText style={styles.menuText}>{t('pointsExchange')}</AppText>
            <AppText style={styles.menuArrow}>›</AppText>
          </TouchableOpacity>
          
          {/* 语言设置 */}
          <LanguageSelectorMenuItem />
          
          {/* 官方推特按钮 */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              const url = 'https://x.com/SolaGameCube'
              Linking.openURL(url).catch(err => {
                console.error('Failed to open Twitter:', err)
                Alert.alert(t('error'), t('error'))
              })
            }}
          >
            <AppText style={styles.menuIcon}>🐦</AppText>
            <AppText style={styles.menuText}>{t('officialTwitter')}</AppText>
            <AppText style={styles.menuArrow}>›</AppText>
          </TouchableOpacity>
        </View>

        {/* 游戏历史 */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>{t('recentlyPlayed')}</AppText>
          </View>

          {history.length > 0 ? (
            history.slice(0, 5).map((item) => renderHistoryItem(item)) // 只显示最近 5 条
          ) : (
            <View style={styles.emptyHistory}>
              <AppText style={styles.emptyEmoji}>🎮</AppText>
              <AppText style={styles.emptyText}>{t('noGameHistory')}</AppText>
              <AppText style={styles.emptySubtext}>{t('goPlayGames')}</AppText>
            </View>
          )}
        </View>

        {/* 退出按钮 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <AppText style={styles.logoutText}>{t('logout')}</AppText>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 积分兑换提示框 */}
      <Modal
        visible={showExchangeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExchangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Coming Soon 标题 */}
            <View style={styles.comingSoonContainer}>
              <AppText style={styles.comingSoonText}>COMING SOON</AppText>
            </View>

            {/* 图标 */}
            <View style={styles.modalIconContainer}>
              <AppText style={styles.modalIcon}>{exchangeInfo?.icon || '💰'}</AppText>
            </View>

            {/* 标题 */}
            <AppText style={styles.modalTitle}>{exchangeInfo?.title || t('pointsExchangeTitle')}</AppText>

            {/* 内容说明 */}
            <View style={styles.modalDescription}>
              {exchangeInfo?.description ? (
                <AppText style={styles.modalDescriptionText}>
                  {exchangeInfo.description}
                </AppText>
              ) : (
                <AppText style={styles.modalDescriptionText}>{t('loading')}</AppText>
              )}
            </View>

            {/* 关闭按钮 */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowExchangeModal(false)}
            >
              <AppText style={styles.modalCloseButtonText}>{t('iKnow')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,210,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,210,255,0.4)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 50,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00d2ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 255, 0.5)',
  },
  badgeIcon: {
    fontSize: 18,
  },
  walletAddress: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  pointsBadge: {
    backgroundColor: 'rgba(0,210,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.4)',
  },
  pointsBadgeText: {
    color: '#00d2ff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuSection: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuArrow: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
  },
  historySection: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  historyIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIcon: {
    width: '100%',
    height: '100%',
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  historyPoints: {
    alignItems: 'flex-end',
  },
  historyPointsValue: {
    color: '#00d2ff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  historyPointsLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 30,
    backgroundColor: 'rgba(255,82,82,0.2)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.4)',
  },
  logoutText: {
    color: '#ff5252',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1f2e',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  comingSoonContainer: {
    backgroundColor: 'rgba(0, 210, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00d2ff',
  },
  comingSoonText: {
    color: '#00d2ff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    textAlign: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    overflow: 'visible',
  },
  modalIcon: {
    fontSize: 40,
    lineHeight: 40,
    textAlign: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalDescription: {
    width: '100%',
    marginBottom: 24,
  },
  modalDescriptionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  modalSpacer: {
    height: 12,
  },
  modalCloseButton: {
    backgroundColor: '#00d2ff',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  languageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  languageModalContent: {
    backgroundColor: '#1a1f2e',
    borderRadius: 24,
    padding: 0,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 25,
  },
  languageModalHeader: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  languageModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 255, 0.3)',
  },
  languageModalIcon: {
    fontSize: 32,
  },
  languageModalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  languageOptionsContainer: {
    padding: 16,
  },
  languageOption: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    borderColor: '#00d2ff',
    borderWidth: 2,
  },
  languageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  languageOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageOptionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageOptionRadioSelected: {
    borderColor: '#00d2ff',
  },
  languageOptionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00d2ff',
  },
  languageOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 17,
    fontWeight: '500',
  },
  languageOptionTextSelected: {
    color: '#00d2ff',
    fontWeight: '600',
  },
  languageCheckmarkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00d2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  languageCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  languageCloseButton: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  languageCloseButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
})
