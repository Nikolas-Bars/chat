import type { ExpoConfig } from 'expo/config'

const DEFAULT_API_URL = 'https://api.chat-q.ru'

const config: ExpoConfig = {
  name: 'Чат',
  slug: 'chat-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: { supportsTablet: true, bundleIdentifier: 'ru.chatq.mobile', buildNumber: '1' },
  android: {
    package: 'ru.chatq.mobile',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
  },
  web: { favicon: './assets/favicon.png' },
  extra: {
    eas: {
      projectId: 'cab2d456-28a6-4c42-bc70-98ac8fdd24df',
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL,
  },
}

export default config
