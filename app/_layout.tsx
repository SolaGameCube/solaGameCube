import { PortalHost } from '@rn-primitives/portal'
import { useFonts } from 'expo-font'
import { Stack, Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { AppProviders } from '@/components/app-providers'
import { useCallback } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { View } from 'react-native'
import { useTrackLocations } from '@/hooks/use-track-locations'
import { AppSplashController } from '@/components/app-splash-controller'
import { ToastContainer } from '@/components/app-toast'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  useTrackLocations((pathname, params) => {
    console.log(`Track ${pathname}`, { params })
  })

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  const onLayoutRootView = useCallback(async () => {
    if (loaded) {
      await SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AppProviders>
        <AppSplashController />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
        <ToastContainer />
      </AppProviders>
      <PortalHost />
    </View>
  )
}
