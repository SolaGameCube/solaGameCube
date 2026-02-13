import React, { useEffect, useRef } from 'react'
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { AppText } from '@/components/app-text'
import { useAuth } from '@/components/auth/auth-provider'
import { useMobileWallet } from '@wallet-ui/react-native-web3js'
import { useAppStore } from '@/services/store'
import { useLanguage } from '@/hooks/useLanguage'

const { width, height } = Dimensions.get('window')

export default function SignInScreen() {
  const router = useRouter()
  const { signIn, isAuthenticated, isLoading } = useAuth()
  const { account } = useMobileWallet()
  const { login } = useAppStore()
  const { t } = useLanguage()

  // 动画
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    // 入场动画
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()

    // 脉冲动画
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()

    return () => pulse.stop()
  }, [])

  // 当钱包登录成功后，同步到后端
  useEffect(() => {
    if (isAuthenticated && account) {
      syncToBackend()
    }
  }, [isAuthenticated, account])

  const syncToBackend = async () => {
    if (!account) return
    
    try {
      // 将钱包地址同步到后端
      const walletAddr = account.publicKey.toBase58()
      const success = await login(walletAddr)
      
      if (success) {
        router.replace('/(tabs)')
      }
    } catch (error) {
      console.error('Sync to backend error:', error)
      // 即使后端同步失败，也允许进入（离线模式）
      router.replace('/(tabs)')
    }
  }

  const handleWalletConnect = async () => {
    try {
      await signIn()
      // signIn 成功后 useEffect 会处理后续逻辑
    } catch (error: any) {
      console.error('Wallet connect error:', error)
      
      // Debug 模式下，连接失败时使用默认钱包地址
      if (__DEV__) {
        const useDevWallet = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('connectionFailed'),
            t('connectionFailedMessage'),
            [
              {
                text: t('cancel'),
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: t('useTestWallet'),
                onPress: () => resolve(true),
              },
            ]
          )
        })
        
        if (useDevWallet) {
          await handleDevLogin()
          return
        }
      } else {
        Alert.alert(
          t('connectionFailed'),
          error?.message || t('connectionFailedMessage2'),
          [{ text: t('ok') }]
        )
      }
    }
  }

  // Debug 模式快速登录（使用固定的测试钱包地址）
  const handleDevLogin = async () => {
    // 使用固定的测试钱包地址
    const devWalletAddr = 'TestUser001'
    
    console.log('使用测试钱包地址登录:', devWalletAddr)
    
    try {
      const success = await login(devWalletAddr)
      if (success) {
        router.replace('/(tabs)')
      }
    } catch (error) {
      console.error('Dev login error:', error)
      // 即使失败也进入（离线模式）
      router.replace('/(tabs)')
    }
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      {/* 背景星星装饰 */}
      <View style={styles.bgDecoration}>
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: Math.random() * width,
                top: Math.random() * height * 0.6,
                opacity: Math.random() * 0.5 + 0.3,
                transform: [{ scale: Math.random() * 0.5 + 0.5 }],
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo 区域 */}
        <Animated.View
          style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}
        >
          <View style={styles.logoCircle}>
            <AppText style={styles.logoEmoji} numberOfLines={1} adjustsFontSizeToFit>
              🎮
            </AppText>
          </View>
          <AppText style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            SolaGameCube
          </AppText>
          <AppText style={styles.subtitle}>Play & Earn</AppText>
        </Animated.View>

        {/* 特性介绍 */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <AppText style={styles.featureIcon}>🎯</AppText>
            <AppText style={styles.featureText}>{t('playToEarn')}</AppText>
          </View>
          <View style={styles.featureItem}>
            <AppText style={styles.featureIcon}>💰</AppText>
            <AppText style={styles.featureText}>{t('pointsToCrypto')}</AppText>
          </View>
          <View style={styles.featureItem}>
            <AppText style={styles.featureIcon}>🏆</AppText>
            <AppText style={styles.featureText}>{t('leaderboardChallenge')}</AppText>
          </View>
        </View>

        {/* 登录按钮 */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={styles.walletButton}
            onPress={handleWalletConnect}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#9945FF', '#14F195']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.walletButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <AppText style={styles.walletIcon}>👛</AppText>
                  <AppText style={styles.walletButtonText}>
                    {t('connectSolanaWallet')}
                  </AppText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <AppText style={styles.hint}>
            {t('supportedWallets')}
          </AppText>

          {__DEV__ && (
            <>
              {/* Debug 模式快速登录按钮 */}
              <TouchableOpacity
                style={styles.devLoginButton}
                onPress={handleDevLogin}
                disabled={isLoading}
              >
                <AppText style={styles.devLoginText}>
                  🚀 {t('quickLogin')}
                </AppText>
              </TouchableOpacity>

              {/* 测试提示 */}
              <View style={styles.testInfo}>
                <AppText style={styles.testInfoText}>
                  {t('testInstallHint')}{' '}
                  <AppText style={styles.linkText}>Mock MWA Wallet</AppText>
                  {' '}{t('testInstallHint2')}
                </AppText>
              </View>
            </>
          )}
        </View>

        {/* 底部说明 */}
        <AppText style={styles.footer}>
          {t('loginAgreement')}
        </AppText>
      </Animated.View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgDecoration: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
    paddingHorizontal: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(153, 69, 255, 0.5)',
    overflow: 'hidden',
  },
  logoEmoji: {
    fontSize: 50,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
    includeFontPadding: false,
    width: '100%',
  },
  subtitle: {
    fontSize: 18,
    color: '#14F195',
    marginTop: 8,
    letterSpacing: 4,
  },
  features: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  loginSection: {
    width: '100%',
    alignItems: 'center',
  },
  walletButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#9945FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  walletButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  walletIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  walletButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  hint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 16,
  },
  testInfo: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  testInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  linkText: {
    color: '#14F195',
    textDecorationLine: 'underline',
  },
  devLoginButton: {
    marginTop: 16,
    width: '100%',
    backgroundColor: 'rgba(20, 241, 149, 0.2)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(20, 241, 149, 0.5)',
  },
  devLoginText: {
    color: '#14F195',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
  },
})
