import Constants from 'expo-constants'

function readExtraApiUrl(): string | undefined {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined
  return extra?.apiUrl?.trim()
}

/** База API без завершающего /. Локально: LAN IP вместо localhost для физического устройства. */
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  readExtraApiUrl() ||
  'https://api.chat-q.ru'
).replace(/\/$/, '')
