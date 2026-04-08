import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'accessToken'

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEY)
}

export async function setAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEY, token)
}

export async function clearAccessToken(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}
