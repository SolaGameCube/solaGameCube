import { Platform } from 'react-native'

interface SnackbarOptions {
  text: string
  duration?: number
}

// Web-compatible snackbar wrapper
export const AppSnackbar = {
  LENGTH_SHORT: 2000,
  LENGTH_LONG: 3500,

  show: (options: SnackbarOptions) => {
    if (Platform.OS === 'web') {
      // On web, use console or a simple alert as fallback
      console.log(`[Snackbar] ${options.text}`)
      // You could also use a toast library for web here
      return
    }

    // On native platforms, use react-native-snackbar
    try {
      const Snackbar = require('react-native-snackbar').default
      Snackbar.show({
        text: options.text,
        duration: options.duration ?? Snackbar.LENGTH_SHORT,
      })
    } catch (e) {
      console.log(`[Snackbar] ${options.text}`)
    }
  },
}
