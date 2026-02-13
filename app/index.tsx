import { Redirect } from 'expo-router'
import { useAuth } from '@/components/auth/auth-provider'
import { View, ActivityIndicator } from 'react-native'

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth()

  // 加载中显示加载指示器
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0c29' }}>
        <ActivityIndicator size="large" color="#9945FF" />
      </View>
    )
  }

  // 根据认证状态重定向
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/sign-in" />
}
