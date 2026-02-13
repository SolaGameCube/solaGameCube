import { Tabs } from 'expo-router'
import React from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { AppText } from '@/components/app-text'
import { useLanguage } from '@/hooks/useLanguage'
import { useEffect, useRef } from 'react'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { useAppStore } from '@/services/store'

// 自定义图标组件
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    profile: '👤',
    settings: '⚙️',
  }
  
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <AppText style={[styles.icon, focused && styles.iconActive]}>
        {icons[name] || '📱'}
      </AppText>
    </View>
  )
}

export default function TabLayout() {
  const { t } = useLanguage()
  const { account } = useMobileWallet()
  const { login, walletAddr, isLoading } = useAppStore()
  const syncingRef = useRef(false)

  // 冷启动时，如果已连接钱包但未同步到本地 store/API header，自动补一次登录同步。
  useEffect(() => {
    const syncWalletSession = async () => {
      if (!account?.publicKey || syncingRef.current || isLoading) return

      const addr = account.publicKey.toBase58()
      if (walletAddr === addr) return

      syncingRef.current = true
      try {
        await login(addr)
      } finally {
        syncingRef.current = false
      }
    }

    syncWalletSession()
  }, [account?.publicKey, walletAddr, login, isLoading])
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#00d2ff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      {/* 首页 */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      
      {/* 我的 */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />

      {/* 游戏页面 - 隐藏导航栏 */}
      <Tabs.Screen
        name="game"
        options={{
          tabBarStyle: { display: 'none' },
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />

      {/* 隐藏不需要的页面 */}
      <Tabs.Screen
        name="account"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="demo"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(15, 15, 30, 0.95)',
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.2)',
  },
  icon: {
    fontSize: 22,
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
})
