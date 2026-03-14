import Taro from '@tarojs/taro'

// 本地存储的key
const WEIGHT_RECORDS_KEY = 'weight_records_local'
const PENDING_SYNC_KEY = 'weight_pending_sync'

// 体重记录本地存储接口
export interface LocalWeightRecord {
  id?: string
  user_id: string
  weight: number
  record_date: string
  synced: boolean // 是否已同步到云端
  created_at: string
}

// 保存体重记录到本地存储
export function saveWeightRecordLocal(record: LocalWeightRecord): void {
  try {
    const records = getWeightRecordsLocal()
    // 检查是否已存在相同日期的记录
    const existingIndex = records.findIndex(
      r => r.user_id === record.user_id && r.record_date === record.record_date
    )
    
    if (existingIndex >= 0) {
      // 更新现有记录
      records[existingIndex] = record
    } else {
      // 添加新记录
      records.unshift(record)
    }
    
    // 只保留最近30条记录
    const limitedRecords = records.slice(0, 30)
    Taro.setStorageSync(WEIGHT_RECORDS_KEY, JSON.stringify(limitedRecords))
    console.log('体重记录已保存到本地存储:', record)
  } catch (error) {
    console.error('保存体重记录到本地存储失败:', error)
  }
}

// 从本地存储获取体重记录
export function getWeightRecordsLocal(): LocalWeightRecord[] {
  try {
    const data = Taro.getStorageSync(WEIGHT_RECORDS_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('从本地存储读取体重记录失败:', error)
    return []
  }
}

// 获取指定用户的体重记录
export function getUserWeightRecordsLocal(userId: string): LocalWeightRecord[] {
  const allRecords = getWeightRecordsLocal()
  return allRecords.filter(r => r.user_id === userId)
}

// 标记记录为已同步
export function markRecordAsSynced(userId: string, recordDate: string): void {
  try {
    const records = getWeightRecordsLocal()
    const record = records.find(
      r => r.user_id === userId && r.record_date === recordDate
    )
    if (record) {
      record.synced = true
      Taro.setStorageSync(WEIGHT_RECORDS_KEY, JSON.stringify(records))
      console.log('记录已标记为已同步:', recordDate)
    }
  } catch (error) {
    console.error('标记记录为已同步失败:', error)
  }
}

// 获取未同步的记录
export function getPendingSyncRecords(userId: string): LocalWeightRecord[] {
  const records = getUserWeightRecordsLocal(userId)
  return records.filter(r => !r.synced)
}

// 保存待同步的记录ID
export function savePendingSyncRecord(record: LocalWeightRecord): void {
  try {
    const pending = getPendingSyncList()
    pending.push(record)
    Taro.setStorageSync(PENDING_SYNC_KEY, JSON.stringify(pending))
    console.log('待同步记录已保存:', record)
  } catch (error) {
    console.error('保存待同步记录失败:', error)
  }
}

// 获取待同步列表
export function getPendingSyncList(): LocalWeightRecord[] {
  try {
    const data = Taro.getStorageSync(PENDING_SYNC_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('获取待同步列表失败:', error)
    return []
  }
}

// 清除待同步列表
export function clearPendingSyncList(): void {
  try {
    Taro.removeStorageSync(PENDING_SYNC_KEY)
    console.log('待同步列表已清除')
  } catch (error) {
    console.error('清除待同步列表失败:', error)
  }
}

// 检查今天是否已打卡（从本地存储检查）
export function hasCheckedInTodayLocal(userId: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  const records = getUserWeightRecordsLocal(userId)
  return records.some(r => r.record_date === today)
}
