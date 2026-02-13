import React from 'react'
import { View, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { AppText } from './app-text'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLanguage } from '@/hooks/useLanguage'

interface AnnouncementModalProps {
  visible: boolean
  id: string
  title: string
  content: string
  onClose: () => void
}

export function AnnouncementModal({ visible, id, title, content, onClose }: AnnouncementModalProps) {
  const { t } = useLanguage()

  const handleClose = async () => {
    // 保存已读的公告ID
    if (id) {
      try {
        const STORAGE_KEY = '@read_announcements'
        let readAnnouncements: string[] = []
        
        const readStr = await AsyncStorage.getItem(STORAGE_KEY)
        if (readStr) {
          readAnnouncements = JSON.parse(readStr)
        }
        
        // 如果还没有这个ID，就添加
        if (!readAnnouncements.includes(id)) {
          readAnnouncements.push(id)
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(readAnnouncements))
          console.log('公告已读，已保存ID:', id)
        }
      } catch (error) {
        console.error('Failed to save read announcement:', error)
      }
    }
    
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 标题 */}
          <View style={styles.header}>
            <AppText style={styles.title}>{title}</AppText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <AppText style={styles.closeButtonText}>✕</AppText>
            </TouchableOpacity>
          </View>

          {/* 内容 */}
          <ScrollView 
            style={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <AppText style={styles.content}>{content}</AppText>
          </ScrollView>

          {/* 确认按钮 */}
          <TouchableOpacity style={styles.confirmButton} onPress={handleClose}>
            <AppText style={styles.confirmButtonText}>{t('iKnow')}</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#9945FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(153, 69, 255, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  contentContainer: {
    maxHeight: 400,
    padding: 20,
  },
  content: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
  confirmButton: {
    margin: 20,
    paddingVertical: 14,
    backgroundColor: '#9945FF',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
})
