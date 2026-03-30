import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'

const PRIMARY_USER_ID_KEY = 'user_id'
const LEGACY_USER_ID_KEY = 'temp_user_id'

export function cacheUserId(userId: string): void {
  if (!userId) {
    return
  }
  Taro.setStorageSync(PRIMARY_USER_ID_KEY, userId)
  Taro.setStorageSync(LEGACY_USER_ID_KEY, userId)
}

export function clearCachedUserId(): void {
  Taro.removeStorageSync(PRIMARY_USER_ID_KEY)
  Taro.removeStorageSync(LEGACY_USER_ID_KEY)
}

export function getCurrentUserId(): string {
  const userId = Taro.getStorageSync(PRIMARY_USER_ID_KEY) || Taro.getStorageSync(LEGACY_USER_ID_KEY) || ''
  if (userId) {
    cacheUserId(userId)
  }
  return userId
}

export async function syncUserIdFromAuth(): Promise<string> {
  const {data} = await supabase.auth.getUser()
  const userId = data.user?.id || ''
  if (userId) {
    cacheUserId(userId)
  }
  return userId
}
