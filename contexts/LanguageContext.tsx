import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { i18n, Language, TranslationKey } from '@/services/i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => Promise<void>
  t: (key: TranslationKey) => string
  actualLanguage: 'en' | 'zh'
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('system')
  const [isLoading, setIsLoading] = useState(true)
  const [systemLanguageCheck, setSystemLanguageCheck] = useState(0) // 用于强制重新检测系统语言
  
  // 使用 useMemo 确保 actualLanguage 在系统语言变化时重新计算
  // 当 language 是 'system' 时，只在 systemLanguageCheck 变化时重新检测系统语言
  const actualLanguage = React.useMemo(() => {
    const actual = i18n.getActualLanguage(language)
    return actual
  }, [language, systemLanguageCheck]) // 添加 systemLanguageCheck 作为依赖

  // 加载保存的语言设置
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await i18n.getCurrentLanguage()
        setLanguageState(saved)
      } catch (error) {
        console.error('Failed to load language:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadLanguage()
  }, [])

  // 当选择"跟随系统"时，在应用启动和从后台恢复时检查系统语言
  useEffect(() => {
    if (language === 'system') {
      // 应用启动时立即检查一次
      setSystemLanguageCheck(prev => prev + 1)
      
      // 监听应用状态变化（从后台恢复时重新检测系统语言）
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          // 应用从后台恢复时，重新检测系统语言
          setSystemLanguageCheck(prev => prev + 1)
        }
      })
      
      return () => {
        subscription.remove()
      }
    }
  }, [language])

  // 设置语言
  const setLanguage = useCallback(async (lang: Language) => {
    try {
      await i18n.setLanguage(lang)
      setLanguageState(lang)
      // 如果选择"跟随系统"，立即重新检测系统语言并强制更新
      if (lang === 'system') {
        // 强制触发系统语言重新检测
        setSystemLanguageCheck(prev => prev + 1)
      } else {
        // 重置系统语言检查计数器
        setSystemLanguageCheck(0)
      }
    } catch (error) {
      console.error('Failed to set language:', error)
    }
  }, [])

  // 翻译函数 - 使用 actualLanguage，避免每次都重新检测系统语言
  const t = useCallback((key: TranslationKey): string => {
    // 直接使用 actualLanguage，它已经通过 useMemo 缓存了
    const result = i18n.t(key, language)
    return result
  }, [language, actualLanguage]) // 依赖 actualLanguage，当它变化时会重新创建函数

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        actualLanguage,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
