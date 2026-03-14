import Taro from '@tarojs/taro'
import type { ConstitutionType } from '@/db/types'

// 本地存储的键名
const STORAGE_KEY = 'user_constitution_data'

// 用户体质数据接口
export interface UserConstitutionData {
  constitutionType: string // 体质类型名称
  weight: number
  height: number
  bmi: number
  age?: number // 年龄（可选）
  gender?: 'male' | 'female' // 性别（可选）
  testDate: string // 测试日期
}

// 保存用户体质测试结果
export function saveUserConstitution(data: UserConstitutionData): void {
  try {
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('保存体质数据失败:', error)
  }
}

// 获取用户体质测试结果
export function getUserConstitution(): UserConstitutionData | null {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY)
    if (data) {
      return JSON.parse(data) as UserConstitutionData
    }
    return null
  } catch (error) {
    console.error('读取体质数据失败:', error)
    return null
  }
}

// 清除用户体质测试结果
export function clearUserConstitution(): void {
  try {
    Taro.removeStorageSync(STORAGE_KEY)
  } catch (error) {
    console.error('清除体质数据失败:', error)
  }
}

// 检查用户是否已完成体质测试
export function hasCompletedTest(): boolean {
  return getUserConstitution() !== null
}
