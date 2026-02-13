import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Text, Platform } from 'react-native'
import { AppText } from './app-text'

interface ToastState {
  visible: boolean
  message: string
}

let toastState: ToastState = { visible: false, message: '' }
let toastListeners: Array<(state: ToastState) => void> = []

const notifyListeners = () => {
  toastListeners.forEach((listener) => listener(toastState))
}

export const AppToast = {
  show: (message: string, duration: number = 2000) => {
    toastState = { visible: true, message }
    notifyListeners()

    setTimeout(() => {
      toastState = { visible: false, message: '' }
      notifyListeners()
    }, duration)
  },
}

export function ToastContainer() {
  const [state, setState] = React.useState<ToastState>({ visible: false, message: '' })
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.8)).current

  useEffect(() => {
    const listener = (newState: ToastState) => {
      setState(newState)
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  useEffect(() => {
    if (state.visible) {
      // 显示动画
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // 隐藏动画
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [state.visible])

  if (!state.visible) return null

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <AppText style={styles.text}>{state.message}</AppText>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    maxWidth: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  text: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
})
