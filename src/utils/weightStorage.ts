import Taro from '@tarojs/taro'

// 本地存储的key前缀
const WEIGHT_RECORDS_PREFIX = 'weight_record_'
const WEIGHT_RECORDS_INDEX_KEY = 'weight_records_index'
const PENDING_SYNC_KEY = 'weight_pending_sync'

// 体重记录本地存储接口
export interface LocalWeightRecord {
  id?: string
  user_id: string
  weight: number
  record_date: string
  synced: boolean // 是否已同步到云端
  sync_status: 'synced' | 'pending' | 'failed' // 同步状态
  created_at: string
  updated_at: string
}

// 记录索引接口
interface RecordIndex {
  user_id: string
  record_date: string
  key: string
}

// 生成存储key（用户ID + 打卡日期）
function generateRecordKey(userId: string, recordDate: string): string {
  return `${WEIGHT_RECORDS_PREFIX}${userId}_${recordDate}`
}

// 获取记录索引
function getRecordIndex(): RecordIndex[] {
  try {
    const data = Taro.getStorageSync(WEIGHT_RECORDS_INDEX_KEY)
    if (data) {
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('获取记录索引失败:', error)
    return []
  }
}

// 保存记录索引
function saveRecordIndex(index: RecordIndex[]): void {
  try {
    Taro.setStorageSync(WEIGHT_RECORDS_INDEX_KEY, JSON.stringify(index))
  } catch (error) {
    console.error('保存记录索引失败:', error)
  }
}

// 保存体重记录到本地存储（按用户ID + 打卡日期为键）
export function saveWeightRecordLocal(record: LocalWeightRecord): boolean {
  try {
    const key = generateRecordKey(record.user_id, record.record_date)
    const now = new Date().toISOString()
    
    // 检查是否已存在
    const existingRecord = Taro.getStorageSync(key)
    
    const recordToSave: LocalWeightRecord = {
      ...record,
      updated_at: now,
      created_at: existingRecord ? JSON.parse(existingRecord).created_at : now
    }
    
    // 保存记录
    Taro.setStorageSync(key, JSON.stringify(recordToSave))
    
    // 更新索引
    const index = getRecordIndex()
    const existingIndexItem = index.find(
      item => item.user_id === record.user_id && item.record_date === record.record_date
    )
    
    if (!existingIndexItem) {
      index.unshift({
        user_id: record.user_id,
        record_date: record.record_date,
        key: key
      })
      
      // 只保留最近30条索引
      const limitedIndex = index.slice(0, 30)
      saveRecordIndex(limitedIndex)
    }
    
    console.log('✓ 体重记录已保存到本地存储:', key, recordToSave)
    return true
  } catch (error) {
    console.error('✗ 保存体重记录到本地存储失败:', error)
    return false
  }
}

// 从本地存储获取所有体重记录
export function getWeightRecordsLocal(): LocalWeightRecord[] {
  try {
    const index = getRecordIndex()
    const records: LocalWeightRecord[] = []
    
    for (const item of index) {
      try {
        const data = Taro.getStorageSync(item.key)
        if (data) {
          records.push(JSON.parse(data))
        }
      } catch (error) {
        console.error('读取记录失败:', item.key, error)
      }
    }
    
    // 按日期降序排序
    records.sort((a, b) => {
      return new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
    })
    
    return records
  } catch (error) {
    console.error('从本地存储读取体重记录失败:', error)
    return []
  }
}

// 获取指定用户的体重记录
export function getUserWeightRecordsLocal(userId: string): LocalWeightRecord[] {
  try {
    const index = getRecordIndex()
    const userIndex = index.filter(item => item.user_id === userId)
    const records: LocalWeightRecord[] = []
    
    for (const item of userIndex) {
      try {
        const data = Taro.getStorageSync(item.key)
        if (data) {
          records.push(JSON.parse(data))
        }
      } catch (error) {
        console.error('读取用户记录失败:', item.key, error)
      }
    }
    
    // 按日期降序排序
    records.sort((a, b) => {
      return new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
    })
    
    console.log(`✓ 从本地存储读取到 ${records.length} 条用户记录`)
    return records
  } catch (error) {
    console.error('获取用户体重记录失败:', error)
    return []
  }
}

// 标记记录为已同步
export function markRecordAsSynced(userId: string, recordDate: string, cloudId?: string): boolean {
  try {
    const key = generateRecordKey(userId, recordDate)
    const data = Taro.getStorageSync(key)
    
    if (data) {
      const record: LocalWeightRecord = JSON.parse(data)
      record.synced = true
      record.sync_status = 'synced'
      record.updated_at = new Date().toISOString()
      if (cloudId) {
        record.id = cloudId
      }
      
      Taro.setStorageSync(key, JSON.stringify(record))
      console.log('✓ 记录已标记为已同步:', recordDate)
      return true
    }
    
    console.warn('⚠ 未找到要标记的记录:', recordDate)
    return false
  } catch (error) {
    console.error('✗ 标记记录为已同步失败:', error)
    return false
  }
}

// 标记记录为同步失败
export function markRecordAsFailed(userId: string, recordDate: string): boolean {
  try {
    const key = generateRecordKey(userId, recordDate)
    const data = Taro.getStorageSync(key)
    
    if (data) {
      const record: LocalWeightRecord = JSON.parse(data)
      record.synced = false
      record.sync_status = 'failed'
      record.updated_at = new Date().toISOString()
      
      Taro.setStorageSync(key, JSON.stringify(record))
      console.log('✓ 记录已标记为同步失败:', recordDate)
      return true
    }
    
    return false
  } catch (error) {
    console.error('✗ 标记记录为同步失败失败:', error)
    return false
  }
}

// 获取未同步的记录（包括pending和failed状态）
export function getPendingSyncRecords(userId: string): LocalWeightRecord[] {
  const records = getUserWeightRecordsLocal(userId)
  const pendingRecords = records.filter(r => !r.synced || r.sync_status === 'pending' || r.sync_status === 'failed')
  console.log(`✓ 找到 ${pendingRecords.length} 条待同步记录`)
  return pendingRecords
}

// 验证本地数据完整性
export function validateLocalData(userId: string): boolean {
  try {
    const records = getUserWeightRecordsLocal(userId)
    
    for (const record of records) {
      // 检查必要字段
      if (!record.user_id || !record.weight || !record.record_date) {
        console.error('✗ 数据完整性校验失败：缺少必要字段', record)
        return false
      }
      
      // 检查日期格式
      if (isNaN(new Date(record.record_date).getTime())) {
        console.error('✗ 数据完整性校验失败：日期格式错误', record)
        return false
      }
    }
    
    console.log('✓ 本地数据完整性校验通过')
    return true
  } catch (error) {
    console.error('✗ 数据完整性校验失败:', error)
    return false
  }
}

// 清除损坏的数据
export function clearCorruptedData(): void {
  try {
    const index = getRecordIndex()
    const validIndex: RecordIndex[] = []
    
    for (const item of index) {
      try {
        const data = Taro.getStorageSync(item.key)
        if (data) {
          const record = JSON.parse(data)
          // 验证数据完整性
          if (record.user_id && record.weight && record.record_date) {
            validIndex.push(item)
          } else {
            // 删除损坏的数据
            Taro.removeStorageSync(item.key)
            console.log('✓ 已删除损坏的数据:', item.key)
          }
        }
      } catch (error) {
        // 删除无法解析的数据
        Taro.removeStorageSync(item.key)
        console.log('✓ 已删除无法解析的数据:', item.key)
      }
    }
    
    // 更新索引
    saveRecordIndex(validIndex)
    console.log('✓ 数据清理完成，保留', validIndex.length, '条有效记录')
  } catch (error) {
    console.error('✗ 清除损坏数据失败:', error)
  }
}

// 检查今天是否已打卡（从本地存储检查）
export function hasCheckedInTodayLocal(userId: string): boolean {
  try {
    const today = new Date().toISOString().split('T')[0]
    const key = generateRecordKey(userId, today)
    const data = Taro.getStorageSync(key)
    
    if (data) {
      console.log('✓ 今日已打卡（本地检查）')
      return true
    }
    
    console.log('✓ 今日未打卡（本地检查）')
    return false
  } catch (error) {
    console.error('✗ 检查今日打卡状态失败:', error)
    return false
  }
}

// 获取指定日期的记录
export function getRecordByDate(userId: string, recordDate: string): LocalWeightRecord | null {
  try {
    const key = generateRecordKey(userId, recordDate)
    const data = Taro.getStorageSync(key)
    
    if (data) {
      return JSON.parse(data)
    }
    
    return null
  } catch (error) {
    console.error('✗ 获取指定日期记录失败:', error)
    return null
  }
}
