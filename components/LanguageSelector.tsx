import React, { useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native'
import { AppText } from './app-text'
import { useLanguage, Language } from '@/hooks/useLanguage'

interface LanguageSelectorProps {
  onPress?: () => void
  showLabel?: boolean
}

export function LanguageSelector({ onPress, showLabel = false }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage()
  const [showModal, setShowModal] = useState(false)

  const languages: { value: Language; label: string }[] = [
    { value: 'system', label: t('followSystem') },
    { value: 'en', label: t('english') },
    { value: 'zh', label: t('chinese') },
  ]

  const handleSelect = async (lang: Language) => {
    await setLanguage(lang)
    setShowModal(false)
    if (onPress) {
      onPress()
    }
  }

  const getCurrentLabel = () => {
    const current = languages.find(l => l.value === language)
    return current?.label || t('followSystem')
  }

  const handlePress = () => {
    setShowModal(true)
  }

  if (showLabel) {
    return (
      <>
        <TouchableOpacity
          style={styles.selector}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <AppText style={styles.selectorText}>{getCurrentLabel()}</AppText>
          <AppText style={styles.arrow}>›</AppText>
        </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>{t('selectLanguage')}</AppText>

            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[
                  styles.option,
                  language === lang.value && styles.optionSelected,
                ]}
                onPress={() => handleSelect(lang.value)}
                activeOpacity={0.7}
              >
                <AppText
                  style={[
                    styles.optionText,
                    language === lang.value && styles.optionTextSelected,
                  ]}
                >
                  {lang.label}
                </AppText>
                {language === lang.value && (
                  <AppText style={styles.checkmark}>✓</AppText>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
              activeOpacity={0.7}
            >
              <AppText style={styles.closeButtonText}>{t('cancel')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
  }

  // 内联模式（用于菜单项）
  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <AppText style={styles.arrow}>›</AppText>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>{t('selectLanguage')}</AppText>

            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[
                  styles.option,
                  language === lang.value && styles.optionSelected,
                ]}
                onPress={() => handleSelect(lang.value)}
                activeOpacity={0.7}
              >
                <AppText
                  style={[
                    styles.optionText,
                    language === lang.value && styles.optionTextSelected,
                  ]}
                >
                  {lang.label}
                </AppText>
                {language === lang.value && (
                  <AppText style={styles.checkmark}>✓</AppText>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
              activeOpacity={0.7}
            >
              <AppText style={styles.closeButtonText}>{t('cancel')}</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectorText: {
    color: '#fff',
    fontSize: 16,
  },
  arrow: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 20,
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
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 255, 0.3)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionSelected: {
    backgroundColor: 'rgba(0, 210, 255, 0.2)',
    borderColor: '#00d2ff',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  optionTextSelected: {
    color: '#00d2ff',
    fontWeight: '600',
  },
  checkmark: {
    color: '#00d2ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
})
