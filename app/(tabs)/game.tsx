import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, StatusBar, BackHandler, Platform, TouchableOpacity, Alert, Dimensions, Modal, Pressable } from 'react-native'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { AppText } from '@/components/app-text'
import { useAppStore } from '@/services/store'
import { useLanguage } from '@/hooks/useLanguage'
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS,
  withRepeat,
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated'

// 条件导入原生模块
let WebView: any = null
let ScreenOrientation: any = null

if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView
  ScreenOrientation = require('expo-screen-orientation')
}

const FLOATING_BUTTON_SIZE = 56
const MENU_ITEM_HEIGHT = 50

// 获取屏幕尺寸（考虑横竖屏）
const getScreenDimensions = (orientation: string) => {
  const { width, height } = Dimensions.get('window')
  // 横屏时，宽度和高度交换
  if (orientation === 'landscape') {
    return { width: Math.max(width, height), height: Math.min(width, height) }
  }
  return { width: Math.min(width, height), height: Math.max(width, height) }
}

export default function GameScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { gameId, gameUrl, orientation, gameName } = params
  const { t } = useLanguage()
  
  const { endGameSession, reportAdClick, currentGameSession } = useAppStore()
  const webViewRef = useRef<any>(null)
  const [lastUrl, setLastUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [canGoBack, setCanGoBack] = useState(false)
  const [showPointsAlert, setShowPointsAlert] = useState(false)
  const [pointsResult, setPointsResult] = useState<{ earnedPoints: number; playTime: number } | null>(null)
  const isNavigatingBackRef = useRef(false) // 标记是否正在后退
  const loadingOpacity = useSharedValue(1)
  const isLoadingRef = useRef(true) // 用于防止重复调用
  const hideLoadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dot1Opacity = useSharedValue(0.3)
  const dot2Opacity = useSharedValue(0.3)
  const dot3Opacity = useSharedValue(0.3)
  
  // 立即启动加载动画（不等待 isLoading 变化）
  useEffect(() => {
    // 三个点的闪烁动画 - 立即启动
    dot1Opacity.value = withRepeat(
      withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
    dot2Opacity.value = withRepeat(
      withDelay(200, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })),
      -1,
      true
    )
    dot3Opacity.value = withRepeat(
      withDelay(400, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })),
      -1,
      true
    )
    
    return () => {
      // 清理动画
      dot1Opacity.value = 0.3
      dot2Opacity.value = 0.3
      dot3Opacity.value = 0.3
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在组件挂载时运行一次
  
  // 获取当前屏幕尺寸（根据方向）
  const screenDims = getScreenDimensions(orientation as string)
  const SCREEN_WIDTH = screenDims.width
  const SCREEN_HEIGHT = screenDims.height
  
  // 浮动按钮位置和菜单状态
  const translateX = useSharedValue(SCREEN_WIDTH - FLOATING_BUTTON_SIZE / 2) // 初始位置：一半在屏幕外
  const translateY = useSharedValue(SCREEN_HEIGHT / 2 - FLOATING_BUTTON_SIZE / 2)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const buttonPositionRef = useRef({ x: SCREEN_WIDTH - FLOATING_BUTTON_SIZE / 2, y: SCREEN_HEIGHT / 2 - FLOATING_BUTTON_SIZE / 2 })
  const startX = useSharedValue(0)
  const startY = useSharedValue(0)
  
  // 保存屏幕尺寸到 shared value，以便在 worklet 中使用
  const screenWidthSV = useSharedValue(SCREEN_WIDTH)
  const screenHeightSV = useSharedValue(SCREEN_HEIGHT)
  
  // 计算最近的边缘位置（非 worklet 版本，用于 JS 代码）
  const snapToEdgeJS = (x: number, y: number, screenWidth: number, screenHeight: number) => {
    // 确保值是有效的数字
    if (isNaN(x) || isNaN(y) || isNaN(screenWidth) || isNaN(screenHeight) || 
        screenWidth <= 0 || screenHeight <= 0) {
      // 返回默认位置（右边中间）
      return { x: screenWidth > 0 ? screenWidth - FLOATING_BUTTON_SIZE / 2 : 0, 
               y: screenHeight > 0 ? screenHeight / 2 - FLOATING_BUTTON_SIZE / 2 : 0 }
    }
    
    const centerX = x + FLOATING_BUTTON_SIZE / 2
    
    // 只计算到左右边缘的距离
    const distToLeft = Math.abs(centerX)
    const distToRight = Math.abs(screenWidth - centerX)
    
    // 找到最近的左右边缘
    let newX = x
    
    if (distToLeft < distToRight) {
      // 贴左边：一半在屏幕外
      newX = -FLOATING_BUTTON_SIZE / 2
    } else {
      // 贴右边：一半在屏幕外
      newX = screenWidth - FLOATING_BUTTON_SIZE / 2
    }
    
    // Y 位置保持不变（不贴靠上下边缘）
    const newY = Math.max(0, Math.min(y, screenHeight - FLOATING_BUTTON_SIZE))
    
    // 确保返回值是有效数字
    if (isNaN(newX) || isNaN(newY)) {
      return { x: screenWidth - FLOATING_BUTTON_SIZE / 2, y: screenHeight / 2 - FLOATING_BUTTON_SIZE / 2 }
    }
    
    return { x: newX, y: newY }
  }

  // 当方向改变时，更新按钮位置和屏幕尺寸，并检测按钮是否在边缘
  useEffect(() => {
    const newDims = getScreenDimensions(orientation as string)
    screenWidthSV.value = newDims.width
    screenHeightSV.value = newDims.height
    
    // 获取当前按钮位置
    const currentX = translateX.value
    const currentY = translateY.value
    
    // 检测按钮是否在边缘（允许小误差）
    const EDGE_THRESHOLD = 5 // 5像素的误差范围
    const buttonCenterX = currentX + FLOATING_BUTTON_SIZE / 2
    const isOnLeftEdge = Math.abs(buttonCenterX) <= EDGE_THRESHOLD
    const isOnRightEdge = Math.abs(buttonCenterX - newDims.width) <= EDGE_THRESHOLD
    const isOnEdge = isOnLeftEdge || isOnRightEdge
    
    // 检查是否超出屏幕范围
    const isOutOfBounds = currentX < -FLOATING_BUTTON_SIZE / 2 || 
                          currentX > newDims.width - FLOATING_BUTTON_SIZE / 2 ||
                          currentY < 0 || 
                          currentY > newDims.height - FLOATING_BUTTON_SIZE
    
    // 如果按钮不在边缘，或者超出屏幕范围，自动移动到最近的边缘
    if (!isOnEdge || isOutOfBounds) {
      // 使用 snapToEdgeJS 函数计算最近的边缘位置
      const snapped = snapToEdgeJS(currentX, currentY, newDims.width, newDims.height)
      
      // 使用动画移动到边缘
      translateX.value = withSpring(snapped.x, {
        damping: 20,
        stiffness: 90,
      })
      translateY.value = withSpring(snapped.y, {
        damping: 20,
        stiffness: 90,
      })
      
      // 更新位置引用
      buttonPositionRef.current = { x: snapped.x, y: snapped.y }
    } else {
      // 如果已经在边缘，只需要更新位置引用（确保不超出屏幕）
      const clampedX = Math.max(-FLOATING_BUTTON_SIZE / 2, Math.min(currentX, newDims.width - FLOATING_BUTTON_SIZE / 2))
      const clampedY = Math.max(0, Math.min(currentY, newDims.height - FLOATING_BUTTON_SIZE))
      if (clampedX !== currentX || clampedY !== currentY) {
        translateX.value = clampedX
        translateY.value = clampedY
      }
      buttonPositionRef.current = { x: clampedX, y: clampedY }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation, gameId]) // 添加 gameId 依赖，确保切换游戏时也检测

  // 设置屏幕方向
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'web' && ScreenOrientation) {
        const lockOrientation = async () => {
          if (orientation === 'portrait') {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
          } else {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
          }
        }
        lockOrientation()
      }

      return () => {
        // 页面失去焦点时（返回主界面或退出 app）保存游戏数据
        const saveGameData = async () => {
          try {
            // 使用 store 的 getState 方法获取当前状态
            const store = useAppStore.getState()
            if (store.currentGameSession) {
              console.log('页面失去焦点，自动保存游戏数据...', {
                gameId: store.currentGameSession.gameId,
                duration: Math.floor((Date.now() - store.currentGameSession.startTime) / 1000),
                adClicks: store.currentGameSession.adClickCount || 0
              })
              await store.endGameSession()
              console.log('游戏数据已保存到服务器')
            }
          } catch (error) {
            console.error('自动保存游戏数据失败:', error)
          }
        }
        saveGameData()
        
        // 页面失去焦点时（返回主界面）立即切换回竖屏
        if (Platform.OS !== 'web' && ScreenOrientation) {
          ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        }
        
        // 停止加载（保留 localStorage，不清除游戏进度）
        if (webViewRef.current && Platform.OS !== 'web') {
          try {
            webViewRef.current.stopLoading()
          } catch (error) {
            // 忽略错误
          }
        }
      }
    }, [orientation, endGameSession])
  )

  // 处理返回主页
  const handleGoHome = React.useCallback(async () => {
    setShowMenu(false)
    
    // 使用 store 中的 startTime 计算游戏时长（更准确）
    const playTime = currentGameSession 
      ? Math.floor((Date.now() - currentGameSession.startTime) / 1000)
      : 0
    
    // 停止加载（不清除 localStorage，保留游戏进度）
    if (webViewRef.current && Platform.OS !== 'web') {
      try {
        webViewRef.current.stopLoading()
      } catch (error) {
        console.warn('Failed to stop WebView:', error)
      }
    }
    
    // 立即切换回竖屏
    if (Platform.OS !== 'web' && ScreenOrientation) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }
    
    // 结束游戏会话并获取积分
    const result = await endGameSession()
    
    // 如果有积分，显示自定义的积分提示框
    if (result && result.earnedPoints > 0) {
      setPointsResult({ earnedPoints: result.earnedPoints, playTime })
      setShowPointsAlert(true)
    } else {
      router.back()
    }
  }, [endGameSession, router, currentGameSession])

  // 处理重新加载
  const handleReload = () => {
    setShowMenu(false)
    if (webViewRef.current && Platform.OS !== 'web') {
      try {
        webViewRef.current.reload()
      } catch (error) {
        console.warn('Failed to reload WebView:', error)
      }
    }
  }

  const handleExit = React.useCallback(async () => {
    await handleGoHome()
  }, [handleGoHome])

  // 返回按钮处理 - 先检测 WebView 是否可以后退
  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS !== 'android') {
        return undefined
      }

      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // 如果 WebView 可以后退，就让 WebView 后退
        if (canGoBack && webViewRef.current && Platform.OS !== 'web') {
          try {
            isNavigatingBackRef.current = true // 标记正在后退
            webViewRef.current.goBack()
            // 重置标记（延迟一点，让 goBack 完成）
            setTimeout(() => {
              isNavigatingBackRef.current = false
            }, 500)
            return true // 阻止默认行为，使用 WebView 的后退
          } catch (error) {
            console.warn('Failed to go back:', error)
            isNavigatingBackRef.current = false
          }
        }
        
        // 如果 WebView 不能后退，取消返回行为（不返回主界面）
        // 用户可以通过浮动按钮返回主界面
        return true // 阻止默认返回行为
      })

      return () => {
        backHandler.remove()
      }
    }, [canGoBack])
  )

  // 计算最近的左右边缘并贴边（一半进入边框）- 只贴靠左右边缘，不贴靠上下边缘
  const snapToEdge = (x: number, y: number, screenWidth: number, screenHeight: number) => {
    'worklet'
    try {
      // 确保值是有效的数字
      if (isNaN(x) || isNaN(y) || isNaN(screenWidth) || isNaN(screenHeight) || 
          screenWidth <= 0 || screenHeight <= 0) {
        // 返回默认位置（右边中间）
        return { x: screenWidth > 0 ? screenWidth - FLOATING_BUTTON_SIZE / 2 : 0, 
                 y: y } // 保持当前 Y 位置
      }
      
      const centerX = x + FLOATING_BUTTON_SIZE / 2
      
      // 只计算到左右边缘的距离
      const distToLeft = Math.abs(centerX)
      const distToRight = Math.abs(screenWidth - centerX)
      
      // 找到最近的左右边缘
      let newX = x
      
      if (distToLeft < distToRight) {
        // 贴左边：一半在屏幕外
        newX = -FLOATING_BUTTON_SIZE / 2
      } else {
        // 贴右边：一半在屏幕外
        newX = screenWidth - FLOATING_BUTTON_SIZE / 2
      }
      
      // Y 位置保持不变（不贴靠上下边缘）
      const newY = y
      
      // 确保返回值是有效数字
      if (isNaN(newX) || isNaN(newY)) {
        return { x: screenWidth - FLOATING_BUTTON_SIZE / 2, y: y }
      }
      
      return { x: newX, y: newY }
    } catch (error) {
      // 如果出错，返回默认位置（右边，保持当前 Y）
      return { x: screenWidth - FLOATING_BUTTON_SIZE / 2, y: y }
    }
  }

  // 更新按钮位置的 JS 函数
  const updateButtonPosition = (x: number, y: number) => {
    buttonPositionRef.current = { x, y }
  }

  // 关闭菜单的 JS 函数
  const closeMenu = () => {
    setShowMenu(false)
  }

  // 手势处理 - 使用新的 Gesture API (react-native-reanimated v4)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet'
      // 保存开始位置（当前按钮位置）
      startX.value = translateX.value
      startY.value = translateY.value
      // 关闭菜单
      runOnJS(closeMenu)()
    })
    .onUpdate((event) => {
      'worklet'
      // 从开始位置加上偏移量，这样按钮会跟着手指移动
      translateX.value = startX.value + event.translationX
      translateY.value = startY.value + event.translationY
    })
    .onEnd(() => {
      'worklet'
      const currentX = translateX.value
      const currentY = translateY.value
      
      // 确保值是有效的
      if (isNaN(currentX) || isNaN(currentY)) {
        return
      }
      
      // 使用 shared value 中的屏幕尺寸（更可靠）
      let screenWidth = screenWidthSV.value
      let screenHeight = screenHeightSV.value
      
      // 如果 shared value 无效，尝试从 Dimensions 获取
      if (screenWidth <= 0 || screenHeight <= 0) {
        const winDims = Dimensions.get('window')
        const winWidth = winDims?.width || 0
        const winHeight = winDims?.height || 0
        screenWidth = Math.max(winWidth, winHeight)
        screenHeight = Math.min(winWidth, winHeight)
      }
      
      // 确保屏幕尺寸有效
      if (screenWidth <= 0 || screenHeight <= 0) {
        screenWidth = 400
        screenHeight = 800
      }
      
      // 传递屏幕尺寸到 worklet 函数
      const snapped = snapToEdge(currentX, currentY, screenWidth, screenHeight)
      
      // 确保返回值有效
      if (isNaN(snapped.x) || isNaN(snapped.y)) {
        return
      }
      
      translateX.value = withSpring(snapped.x, {
        damping: 20,
        stiffness: 90,
      })
      translateY.value = withSpring(snapped.y, {
        damping: 20,
        stiffness: 90,
      })
      
      // 更新位置引用
      runOnJS(updateButtonPosition)(snapped.x, snapped.y)
    })

  // 动画样式
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    }
  })

  // 加载提示的动画样式 - 使用 shared value，确保可以在 worklet 中使用
  const loadingOverlayStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }))

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }))

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }))

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }))

  // 处理按钮点击
  const handleButtonPress = () => {
    // 获取当前屏幕尺寸
    const currentDims = getScreenDimensions(orientation as string)
    const currentWidth = currentDims.width
    const currentHeight = currentDims.height
    
    // 获取按钮当前位置（从 ref 读取）
    const { x: buttonX, y: buttonY } = buttonPositionRef.current
    
    // 计算按钮中心位置（考虑可能一半在屏幕外）
    const buttonCenterX = buttonX + FLOATING_BUTTON_SIZE / 2
    const buttonCenterY = buttonY + FLOATING_BUTTON_SIZE / 2
    
    // 计算菜单位置（在按钮旁边，根据按钮在屏幕的哪一侧）
    const menuX = buttonCenterX < currentWidth / 2 
      ? Math.max(buttonX + FLOATING_BUTTON_SIZE + 10, 10)
      : Math.min(buttonX - 150, currentWidth - 160) // 菜单宽度约150
    const menuY = buttonY
    
    // 确保菜单不超出屏幕
    const finalMenuX = Math.max(10, Math.min(menuX, currentWidth - 160))
    const finalMenuY = Math.max(10, Math.min(menuY, currentHeight - 120))
    
    setMenuPosition({ x: finalMenuX, y: finalMenuY })
    setShowMenu(true)
  }

  // 处理导航请求 - 确保所有链接都在 WebView 内打开，并保留所有参数和 referrer
  // 注意：在 WebView 内打开广告链接不会违反 Google 广告政策
  // Google 主要关注的是真实点击和合法性，而不是打开方式
  const handleShouldStartLoadWithRequest = (request: any) => {
    const { url, navigationType } = request
    
    // WebView 会自动传递 referrer 和所有 URL 参数
    // 返回 true 允许在 WebView 内加载，这样所有参数（包括 referrer）都会正确传递
    // 这对于广告追踪非常重要，确保广告平台能正确识别来源
    // 
    // 重要：WebView 默认会自动设置 Referer header，值为当前页面的 URL
    // 这确保了广告链接能正确追踪来源，符合广告平台的要求
    return true
  }
  
  // 注入 JavaScript 确保 referrer 正确传递（作为备用方案）
  const injectedJavaScript = `
    (function() {
      // 确保 document.referrer 正确设置
      if (!document.referrer && window.location.href) {
        // 如果 referrer 不存在，尝试从 sessionStorage 获取
        try {
          var referrer = sessionStorage.getItem('_last_referrer');
          if (referrer) {
            Object.defineProperty(document, 'referrer', {
              get: function() { return referrer; },
              configurable: true
            });
          }
        } catch(e) {}
      }
      
      // 保存当前 URL 作为下一个页面的 referrer
      try {
        sessionStorage.setItem('_last_referrer', window.location.href);
      } catch(e) {}
      
      // 拦截所有链接点击，确保在 WebView 内打开
      document.addEventListener('click', function(e) {
        var target = e.target;
        while (target && target.tagName !== 'A') {
          target = target.parentElement;
        }
        if (target && target.href) {
          // 确保链接在 WebView 内打开，保留所有参数
          e.preventDefault();
          window.location.href = target.href;
        }
      }, true);
    })();
    true; // 必须返回 true
  `

  // 监听 URL 变化检测广告点击
  const handleNavigationChange = (state: any) => {
    const newUrl = state.url || ''
    
    // 更新 canGoBack 状态
    if (state.canGoBack !== undefined) {
      setCanGoBack(state.canGoBack)
    }
    
    // 打印所有 URL 变化，方便观察
    if (lastUrl && newUrl !== lastUrl) {
      console.log('🔗 URL 变化:', {
        from: lastUrl,
        to: newUrl,
        canGoBack: state.canGoBack
      })
      
      // 广告链接特征匹配
      const adPatterns = [
        'googleads',
        'doubleclick',
        'googlesyndication',
        'adservice',
        'ads.',
        'ad.',
        '/ads/',
        'click.',
        'track.',
      ]
      const matchedPatterns: string[] = []
      adPatterns.forEach(pattern => {
        if (newUrl.toLowerCase().includes(pattern)) {
          matchedPatterns.push(pattern)
        }
      })
      const isAdClick = matchedPatterns.length > 0

      if (isAdClick) {
        console.log('✅ 广告点击检测到', {
          url: newUrl,
          matchedPatterns,
          timestamp: new Date().toISOString()
        })
        reportAdClick()
      } else {
        console.log('🔗 非广告链接', { url: newUrl })
      }
    }
    
    setLastUrl(newUrl)
  }

  // 解析游戏 URL
  const getGameSource = () => {
    const url = (gameUrl as string) || ''
    
    if (url.startsWith('local://')) {
      // 本地游戏
      const localPath = url.replace('local://', '')
      if (Platform.OS === 'android') {
        return { uri: `file:///android_asset/${localPath}` }
      }
      return { uri: localPath }
    } else if (url.startsWith('http')) {
      // 网络游戏
      return { uri: url }
    } else {
      // 默认本地 Moto X3M
      if (Platform.OS === 'android') {
        return { uri: 'file:///android_asset/game/index.html' }
      }
      return { uri: '/game/index.html' }
    }
  }

  // Web 版本
  if (Platform.OS === 'web') {
    const source = getGameSource()
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <AppText style={styles.exitButtonText}>✕ {t('exit')}</AppText>
        </TouchableOpacity>
        <iframe
          src={source.uri}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="fullscreen"
        />
      </View>
    )
  }

  // 原生版本
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <StatusBar hidden />
        
        {/* 加载提示 - 始终渲染，通过 opacity 控制显示/隐藏，确保立即显示 */}
          <Animated.View
            style={[
              styles.loadingOverlay,
              loadingOverlayStyle,
            ]}
            pointerEvents="none"
          >
          <View style={styles.loadingContainer}>
            <AppText style={styles.loadingText}>{t('nowLoading')}</AppText>
            <View style={styles.loadingDots}>
              <Animated.View
                style={[
                  styles.loadingDot,
                  dot1Style,
                ]}
              />
              <Animated.View
                style={[
                  styles.loadingDot,
                  dot2Style,
                ]}
              />
              <Animated.View
                style={[
                  styles.loadingDot,
                  dot3Style,
                ]}
              />
            </View>
          </View>
        </Animated.View>
        
        {WebView && (
          <WebView
            key={`webview-${gameId}-${gameUrl}`}
            ref={webViewRef}
            source={getGameSource()}
            style={[
              styles.webview,
              isLoading && styles.webviewHidden, // 加载时隐藏 WebView，避免显示白色背景
            ]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            allowUniversalAccessFromFileURLs={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            originWhitelist={['*']}
            cacheEnabled={true}
            cacheMode="LOAD_CACHE_ELSE_NETWORK"
            incognito={false}
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={false}
            injectedJavaScript={injectedJavaScript}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onNavigationStateChange={handleNavigationChange}
            onLoadStart={(syntheticEvent: any) => {
              // 如果正在后退，不显示 loading（使用缓存，应该很快）
              if (isNavigatingBackRef.current) {
                return
              }
              
              // 清除之前的隐藏定时器
              if (hideLoadingTimeoutRef.current) {
                clearTimeout(hideLoadingTimeoutRef.current)
                hideLoadingTimeoutRef.current = null
              }
              setIsLoading(true)
              isLoadingRef.current = true
              setLoadProgress(0)
              loadingOpacity.value = 1
            }}
            onLoadProgress={(syntheticEvent: any) => {
              // 如果正在后退，不更新进度（使用缓存，不需要显示进度）
              if (isNavigatingBackRef.current) {
                return
              }
              
              const { nativeEvent } = syntheticEvent
              const progress = nativeEvent.progress
              setLoadProgress(progress)
              
              // 当加载进度达到 100% 时，立即隐藏 loading
              if (progress >= 1 && isLoadingRef.current) {
                // 清除之前的定时器
                if (hideLoadingTimeoutRef.current) {
                  clearTimeout(hideLoadingTimeoutRef.current)
                }
                
                isLoadingRef.current = false
                // 立即隐藏，不延迟
                setIsLoading(false)
                loadingOpacity.value = withSpring(0, {
                  damping: 15,
                  stiffness: 100,
                })
              }
            }}
            onLoadEnd={() => {
              // 如果正在后退，立即隐藏 loading（缓存页面加载很快）
              if (isNavigatingBackRef.current) {
                isLoadingRef.current = false
                setIsLoading(false)
                loadingOpacity.value = 0
                isNavigatingBackRef.current = false
                return
              }
              
              // 如果 onLoadProgress 没有触发（某些情况下），使用 onLoadEnd 作为备用
              if (isLoadingRef.current) {
                // 清除之前的定时器
                if (hideLoadingTimeoutRef.current) {
                  clearTimeout(hideLoadingTimeoutRef.current)
                  hideLoadingTimeoutRef.current = null
                }
                
                isLoadingRef.current = false
                // 立即隐藏，不延迟
                setIsLoading(false)
                loadingOpacity.value = withSpring(0, {
                  damping: 15,
                  stiffness: 100,
                })
              }
            }}
            onError={(syntheticEvent: any) => {
              const { nativeEvent } = syntheticEvent
              console.warn('WebView error:', nativeEvent)
              // 清除定时器
              if (hideLoadingTimeoutRef.current) {
                clearTimeout(hideLoadingTimeoutRef.current)
                hideLoadingTimeoutRef.current = null
              }
              setIsLoading(false)
              isLoadingRef.current = false
              setLoadProgress(0)
              loadingOpacity.value = withSpring(0, {
                damping: 15,
                stiffness: 100,
              })
            }}
          />
        )}

        {/* 可拖动的浮动按钮 */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.floatingButton, animatedStyle]}>
            <TouchableOpacity
              style={styles.floatingButtonInner}
              onPress={handleButtonPress}
              activeOpacity={0.8}
            >
              <AppText style={styles.floatingButtonIcon}>🎮</AppText>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>

        {/* 弹出菜单 */}
        <Modal
          visible={showMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <Pressable
            style={styles.menuOverlay}
            onPress={() => setShowMenu(false)}
          >
            <View
              style={[
                styles.menuContainer,
                {
                  left: menuPosition.x,
                  top: menuPosition.y,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleGoHome}
                activeOpacity={0.7}
              >
                <AppText style={styles.menuItemIcon}>🏠</AppText>
                <AppText style={styles.menuItemText}>{t('goHome')}</AppText>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleReload}
                activeOpacity={0.7}
              >
                <AppText style={styles.menuItemIcon}>🔄</AppText>
                <AppText style={styles.menuItemText}>{t('reload')}</AppText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      </View>

      <Modal
        visible={showPointsAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPointsAlert(false)
          router.back()
        }}
      >
        <View style={styles.pointsAlertOverlay}>
          <View style={[styles.pointsAlertBox]}>
            {/* 顶部装饰 */}
            <View style={styles.pointsAlertTopDecoration}>
              <AppText style={styles.pointsAlertEmoji}>🎉</AppText>
            </View>

            {/* 主内容 */}
            <View style={styles.pointsAlertContent}>
              <AppText style={styles.pointsAlertTitle}>{t('gameOver')}</AppText>
              
              {/* 大积分显示 */}
              <View style={styles.pointsAlertScoreContainer}>
                <AppText style={styles.pointsAlertScoreLabel}>{t('earnedPoints')}</AppText>
                <AppText style={styles.pointsAlertScore}>+{pointsResult?.earnedPoints || 0}</AppText>
              </View>

              {/* 游戏时长 */}
              {pointsResult && (
                <AppText style={styles.pointsAlertDuration}>
                  {t('playTime')}: {Math.floor(pointsResult.playTime / 60)}{t('minutes')}{pointsResult.playTime % 60}{t('seconds')}
                </AppText>
              )}
            </View>

            {/* 按钮 */}
            <TouchableOpacity
              style={styles.pointsAlertButton}
              onPress={() => {
                setShowPointsAlert(false)
                router.back()
              }}
            >
              <AppText style={styles.pointsAlertButtonText}>{t('continue')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000', // 设置 WebView 背景为黑色，避免白色闪烁
  },
  webviewHidden: {
    opacity: 0, // 加载时完全隐藏 WebView
  },
  floatingButton: {
    position: 'absolute',
    width: FLOATING_BUTTON_SIZE,
    height: FLOATING_BUTTON_SIZE,
    zIndex: 1001, // 确保在 loadingOverlay (999) 之上
    elevation: 1001, // Android 层级
  },
  floatingButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: FLOATING_BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0, 210, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  floatingButtonIcon: {
    fontSize: 24,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 20, 25, 0.95)',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', // 更深的背景，确保完全覆盖 WebView
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999, // Android 层级
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: 1,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00d2ff',
  },
  // 自定义积分提示框样式
  pointsAlertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    overflow: 'visible',
  },
  pointsAlertBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 18,
    width: '92%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d2ff',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
  },
  pointsAlertTopDecoration: {
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 5,
  },
  pointsAlertEmoji: {
    fontSize: 40,
    lineHeight: 50,
  },
  pointsAlertContent: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  pointsAlertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 28,
  },
  pointsAlertScoreContainer: {
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
    paddingVertical: 5,
  },
  pointsAlertScoreLabel: {
    fontSize: 12,
    color: '#00d2ff',
    marginBottom: 4,
    letterSpacing: 1,
    lineHeight: 18,
  },
  pointsAlertScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00ff88',
    lineHeight: 58,
  },
  pointsAlertDuration: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    lineHeight: 16,
  },
  pointsAlertButton: {
    backgroundColor: '#00d2ff',
    paddingVertical: 9,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  pointsAlertButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  exitButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  exitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
})
