import { supabase } from '@/client/supabase'
import type { ConstitutionType, Dish, UserMembership, DishAnalysisRecord } from './types'

// 获取所有体质类型
export async function getAllConstitutionTypes(): Promise<ConstitutionType[]> {
  const { data, error } = await supabase
    .from('constitution_types')
    .select('*')
    .order('id')

  if (error) {
    console.error('获取体质类型失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 根据名称获取体质类型
export async function getConstitutionTypeByName(name: string): Promise<ConstitutionType | null> {
  const { data, error } = await supabase
    .from('constitution_types')
    .select('*')
    .eq('name', name)
    .maybeSingle()

  if (error) {
    console.error('获取体质类型失败:', error)
    return null
  }

  return data
}

// 获取所有菜品
export async function getAllDishes(): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .order('id')

  if (error) {
    console.error('获取菜品失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 根据热量范围获取菜品推荐
export async function getDishesByCaloriesRange(minCalories: number, maxCalories: number): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .gte('calories', minCalories)
    .lte('calories', maxCalories)
    .order('calories')
    .limit(10)

  if (error) {
    console.error('获取菜品推荐失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 根据蛋白质含量获取菜品推荐
export async function getDishesByProtein(minProtein: number): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .gte('protein', minProtein)
    .order('protein', { ascending: false })
    .limit(10)

  if (error) {
    console.error('获取高蛋白菜品失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 检查用户会员状态
export async function checkUserMembership(userId: string): Promise<UserMembership | null> {
  const { data, error } = await supabase
    .from('user_memberships')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('检查会员状态失败:', error)
    return null
  }

  return data
}

// 激活用户会员
export async function activateUserMembership(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_memberships')
    .upsert({
      user_id: userId,
      is_active: true,
      activated_at: new Date().toISOString()
    })

  if (error) {
    console.error('激活会员失败:', error)
    return false
  }

  return true
}

// 保存菜品分析记录
export async function saveDishAnalysisRecord(record: Omit<DishAnalysisRecord, 'id' | 'created_at'>): Promise<boolean> {
  const { error } = await supabase
    .from('dish_analysis_records')
    .insert(record)

  if (error) {
    console.error('保存分析记录失败:', error)
    return false
  }

  return true
}

// 获取用户的菜品分析记录
export async function getUserDishAnalysisRecords(userId: string, limit = 20): Promise<DishAnalysisRecord[]> {
  const { data, error } = await supabase
    .from('dish_analysis_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('获取分析记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// ==================== 配送系统 API ====================

// 获取用户的配送地址列表
export async function getUserAddresses(userId: string) {
  const { data, error } = await supabase
    .from('delivery_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取地址列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 添加配送地址
export async function addDeliveryAddress(address: {
  user_id: string
  name: string
  phone: string
  address: string
  is_default: boolean
}) {
  // 如果设置为默认地址，先取消其他默认地址
  if (address.is_default) {
    await supabase
      .from('delivery_addresses')
      .update({ is_default: false })
      .eq('user_id', address.user_id)
  }

  const { data, error } = await supabase
    .from('delivery_addresses')
    .insert(address)
    .select()
    .maybeSingle()

  if (error) {
    console.error('添加地址失败:', error)
    return null
  }

  return data
}

// 设置默认地址
export async function setDefaultAddress(userId: string, addressId: string) {
  // 先取消所有默认地址
  await supabase
    .from('delivery_addresses')
    .update({ is_default: false })
    .eq('user_id', userId)

  // 设置新的默认地址
  const { error } = await supabase
    .from('delivery_addresses')
    .update({ is_default: true })
    .eq('id', addressId)

  if (error) {
    console.error('设置默认地址失败:', error)
    return false
  }

  return true
}

// 删除地址
export async function deleteAddress(addressId: string) {
  const { error } = await supabase
    .from('delivery_addresses')
    .delete()
    .eq('id', addressId)

  if (error) {
    console.error('删除地址失败:', error)
    return false
  }

  return true
}

// 创建配送订单
export async function createDeliveryOrder(order: {
  user_id: string
  dish_ids: string[]
  dish_names: string[]
  total_price: number
  delivery_fee: number
  delivery_address_id: string | null
  delivery_address: string
  delivery_name: string
  delivery_phone: string
  canteen_location: string
  notes?: string
}) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .insert({
      ...order,
      status: 'unpaid' // 初始状态为未支付
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('创建订单失败:', error)
    return null
  }

  return data
}

// 获取用户的订单列表
export async function getUserOrders(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('获取订单列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取待接单的订单列表
export async function getPendingOrders(limit = 50) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('获取待接单订单失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 接单
export async function acceptOrder(orderId: string, courierId: string) {
  const { error } = await supabase
    .from('delivery_orders')
    .update({
      status: 'accepted',
      courier_id: courierId,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('status', 'pending')

  if (error) {
    console.error('接单失败:', error)
    return false
  }

  return true
}

// 更新订单状态
export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await supabase
    .from('delivery_orders')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (error) {
    console.error('更新订单状态失败:', error)
    return false
  }

  // 如果订单完成，记录跑腿收入
  if (status === 'completed') {
    const { data: order } = await supabase
      .from('delivery_orders')
      .select('courier_id, delivery_fee')
      .eq('id', orderId)
      .maybeSingle()

    if (order && order.courier_id) {
      const earning = order.delivery_fee * 0.8
      await supabase
        .from('courier_earnings')
        .insert({
          courier_id: order.courier_id,
          order_id: orderId,
          earning
        })
    }
  }

  return true
}

// 获取跑腿的订单列表
export async function getCourierOrders(courierId: string, limit = 20) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('courier_id', courierId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('获取跑腿订单失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取跑腿收入统计
export async function getCourierEarnings(courierId: string) {
  const { data, error } = await supabase
    .from('courier_earnings')
    .select('*')
    .eq('courier_id', courierId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取收入记录失败:', error)
    return { total: 0, records: [] }
  }

  const records = Array.isArray(data) ? data : []
  const total = records.reduce((sum, record) => sum + Number(record.earning), 0)

  return { total, records }
}

// 获取订单详情
export async function getOrderDetail(orderId: string) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (error) {
    console.error('获取订单详情失败:', error)
    return null
  }

  return data
}

// ==================== 签到功能 ====================

// 用户签到
export async function checkinUser(userId: string) {
  const { data, error } = await supabase.rpc('checkin_user', {
    p_user_id: userId
  })

  if (error) {
    console.error('签到失败:', error)
    return {
      success: false,
      message: '签到失败，请重试',
      alreadyChecked: false
    }
  }

  return data
}

// 获取用户积分
export async function getUserPoints(userId: string) {
  const { data, error } = await supabase
    .from('user_points')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('获取用户积分失败:', error)
    return null
  }

  return data
}

// 获取积分排行榜（使用user_score字段排序）
export async function getPointsRanking(limit = 100) {
  const { data, error } = await supabase
    .from('user_points')
    .select('*')
    .order('user_score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('获取积分排行榜失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取用户签到记录
export async function getUserCheckins(userId: string, limit = 30) {
  const { data, error } = await supabase
    .from('user_checkins')
    .select('*')
    .eq('user_id', userId)
    .order('checkin_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('获取签到记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// ==================== 体重打卡功能 ====================

// 记录体重并打卡
export async function recordWeight(userId: string, weight: number): Promise<import('./types').WeightCheckinResult> {
  try {
    // 1. 检查今天是否已经记录
    const today = new Date().toISOString().split('T')[0]
    const { data: existingRecord } = await supabase
      .from('weight_records')
      .select('*')
      .eq('user_id', userId)
      .eq('record_date', today)
      .maybeSingle()

    if (existingRecord) {
      return {
        success: false,
        message: '今天已经打卡过了哦～明天再来吧！',
        pointsEarned: 0,
        bonusPoints: 0,
        currentStreak: 0,
        totalPoints: 0,
        newAchievements: []
      }
    }

    // 2. 插入体重记录（不记录积分）
    const { error: insertError } = await supabase
      .from('weight_records')
      .insert({
        user_id: userId,
        weight,
        record_date: today
      })

    if (insertError) {
      console.error('记录体重失败:', insertError)
      return {
        success: false,
        message: '记录失败，请重试',
        pointsEarned: 0,
        bonusPoints: 0,
        currentStreak: 0,
        totalPoints: 0,
        newAchievements: []
      }
    }

    // 3. 获取或创建打卡统计
    let { data: stats } = await supabase
      .from('weight_checkin_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!stats) {
      const { data: newStats } = await supabase
        .from('weight_checkin_stats')
        .insert({
          user_id: userId,
          current_streak: 0,
          max_streak: 0,
          total_checkins: 0,
          total_points: 0
        })
        .select()
        .single()
      stats = newStats
    }

    // 4. 计算连续打卡天数
    let currentStreak = 1
    const lastCheckinDate = stats?.last_checkin_date

    if (lastCheckinDate) {
      const lastDate = new Date(lastCheckinDate)
      const todayDate = new Date(today)
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        // 连续打卡
        currentStreak = (stats?.current_streak || 0) + 1
      } else if (diffDays > 1) {
        // 断签，重新开始
        currentStreak = 1
      }
    }

    // 5. 更新打卡统计（不更新积分）
    await supabase
      .from('weight_checkin_stats')
      .update({
        current_streak: currentStreak,
        max_streak: Math.max(currentStreak, stats?.max_streak || 0),
        total_checkins: (stats?.total_checkins || 0) + 1,
        last_checkin_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    console.log('体重打卡成功，不记录积分')

    return {
      success: true,
      message: '打卡成功！',
      pointsEarned: 0,
      bonusPoints: 0,
      currentStreak,
      totalPoints: 0,
      newAchievements: []
    }
  } catch (error) {
    console.error('体重打卡失败:', error)
    return {
      success: false,
      message: '打卡失败，请重试',
      pointsEarned: 0,
      bonusPoints: 0,
      currentStreak: 0,
      totalPoints: 0,
      newAchievements: []
    }
  }
}

// 检查并解锁成就
async function checkAndUnlockAchievements(userId: string, currentStreak: number, totalCheckins: number): Promise<import('./types').AchievementDefinition[]> {
  const newAchievements: import('./types').AchievementDefinition[] = []

  // 获取所有成就定义
  const { data: allAchievements } = await supabase
    .from('achievement_definitions')
    .select('*')

  if (!allAchievements) return []

  // 获取用户已解锁的成就
  const { data: unlockedAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId)

  const unlockedIds = new Set(unlockedAchievements?.map(a => a.achievement_id) || [])

  // 检查每个成就
  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue

    let shouldUnlock = false

    switch (achievement.condition_type) {
      case 'first_record':
        shouldUnlock = totalCheckins === 1
        break
      case 'streak_3':
        shouldUnlock = currentStreak >= 3
        break
      case 'streak_7':
        shouldUnlock = currentStreak >= 7
        break
      case 'streak_14':
        shouldUnlock = currentStreak >= 14
        break
      case 'streak_30':
        shouldUnlock = currentStreak >= 30
        break
      case 'stable_weight':
        // 检查体重波动
        shouldUnlock = await checkWeightStability(userId, 14, 2)
        break
    }

    if (shouldUnlock) {
      // 解锁成就
      await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: achievement.id
        })

      newAchievements.push(achievement)
    }
  }

  return newAchievements
}

// 检查体重稳定性
async function checkWeightStability(userId: string, days: number, maxDiff: number): Promise<boolean> {
  const { data: records } = await supabase
    .from('weight_records')
    .select('weight')
    .eq('user_id', userId)
    .order('record_date', { ascending: false })
    .limit(days)

  if (!records || records.length < days) return false

  const weights = records.map(r => Number(r.weight))
  const maxWeight = Math.max(...weights)
  const minWeight = Math.min(...weights)

  return (maxWeight - minWeight) <= maxDiff
}

// 获取用户体重记录
export async function getUserWeightRecords(userId: string, limit?: number): Promise<import('./types').WeightRecord[]> {
  let query = supabase
    .from('weight_records')
    .select('*')
    .eq('user_id', userId)
    .order('record_date', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('获取体重记录失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取用户打卡统计
export async function getUserWeightStats(userId: string): Promise<import('./types').WeightCheckinStats | null> {
  const { data, error } = await supabase
    .from('weight_checkin_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('获取打卡统计失败:', error)
    return null
  }

  return data
}

// 获取用户成就
export async function getUserAchievements(userId: string): Promise<Array<import('./types').AchievementDefinition & { unlocked_at: string }>> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      unlocked_at,
      achievement_definitions (*)
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.error('获取用户成就失败:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item.achievement_definitions,
    unlocked_at: item.unlocked_at
  }))
}

// 获取所有成就定义
export async function getAllAchievements(): Promise<import('./types').AchievementDefinition[]> {
  const { data, error } = await supabase
    .from('achievement_definitions')
    .select('*')
    .order('points_reward', { ascending: true })

  if (error) {
    console.error('获取成就定义失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// ==================== 虚拟物品和积分商城 ====================

// 获取所有虚拟物品
export async function getAllVirtualItems(): Promise<import('./types').VirtualItem[]> {
  const { data, error } = await supabase
    .from('virtual_items')
    .select('*')
    .order('price', { ascending: true })

  if (error) {
    console.error('获取虚拟物品失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取用户拥有的虚拟物品
export async function getUserItems(userId: string): Promise<Array<import('./types').VirtualItem & { is_active: boolean }>> {
  const { data, error } = await supabase
    .from('user_items')
    .select(`
      is_active,
      virtual_items (*)
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('获取用户物品失败:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    ...item.virtual_items,
    is_active: item.is_active
  }))
}

// 购买虚拟物品
export async function purchaseVirtualItem(userId: string, itemId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 检查是否已拥有
    const { data: existingItem } = await supabase
      .from('user_items')
      .select('*')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle()

    if (existingItem) {
      return { success: false, message: '你已经拥有这个物品了' }
    }

    // 2. 获取物品信息
    const { data: item } = await supabase
      .from('virtual_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle()

    if (!item) {
      return { success: false, message: '物品不存在' }
    }

    // 3. 检查积分是否足够
    const stats = await getUserWeightStats(userId)
    if (!stats || stats.total_points < item.price) {
      return { success: false, message: '积分不足' }
    }

    // 4. 扣除积分
    await supabase
      .from('weight_checkin_stats')
      .update({
        total_points: stats.total_points - item.price
      })
      .eq('user_id', userId)

    // 5. 添加物品到用户背包
    await supabase
      .from('user_items')
      .insert({
        user_id: userId,
        item_id: itemId
      })

    return { success: true, message: '购买成功！' }
  } catch (error) {
    console.error('购买物品失败:', error)
    return { success: false, message: '购买失败，请重试' }
  }
}

// 激活/取消激活虚拟物品
export async function toggleItemActive(userId: string, itemId: string, itemType: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 取消同类型其他物品的激活状态
    const { data: userItems } = await supabase
      .from('user_items')
      .select(`
        id,
        virtual_items!inner(type)
      `)
      .eq('user_id', userId)

    if (userItems) {
      const sameTypeItems = userItems.filter((item: any) => item.virtual_items.type === itemType)
      for (const item of sameTypeItems) {
        await supabase
          .from('user_items')
          .update({ is_active: false })
          .eq('id', item.id)
      }
    }

    // 2. 激活当前物品
    await supabase
      .from('user_items')
      .update({ is_active: true })
      .eq('user_id', userId)
      .eq('item_id', itemId)

    return { success: true, message: '已激活' }
  } catch (error) {
    console.error('激活物品失败:', error)
    return { success: false, message: '激活失败' }
  }
}

// ==================== 宿舍挑战榜 ====================

// 设置用户宿舍信息
export async function setUserDormitory(userId: string, dormitoryName: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('dormitory_info')
      .upsert({
        user_id: userId,
        dormitory_name: dormitoryName
      })

    if (error) {
      console.error('设置宿舍信息失败:', error)
      return { success: false, message: '设置失败' }
    }

    return { success: true, message: '设置成功' }
  } catch (error) {
    console.error('设置宿舍信息失败:', error)
    return { success: false, message: '设置失败' }
  }
}

// 获取用户宿舍信息
export async function getUserDormitory(userId: string): Promise<import('./types').DormitoryInfo | null> {
  const { data, error } = await supabase
    .from('dormitory_info')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('获取宿舍信息失败:', error)
    return null
  }

  return data
}

// 获取宿舍排行榜
export async function getDormitoryRankings(): Promise<import('./types').DormitoryRanking[]> {
  const { data, error } = await supabase
    .from('dormitory_rankings')
    .select('*')
    .limit(50)

  if (error) {
    console.error('获取宿舍排行榜失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取宿舍成员的打卡动态（仅显示连续天数，不显示体重）
export async function getDormitoryMembers(dormitoryName: string): Promise<Array<{ user_id: string; current_streak: number; total_points: number }>> {
  const { data: dormMembers } = await supabase
    .from('dormitory_info')
    .select('user_id')
    .eq('dormitory_name', dormitoryName)

  if (!dormMembers || dormMembers.length === 0) {
    return []
  }

  const userIds = dormMembers.map(m => m.user_id)

  const { data, error } = await supabase
    .from('weight_checkin_stats')
    .select('user_id, current_streak, total_points')
    .in('user_id', userIds)
    .order('current_streak', { ascending: false })

  if (error) {
    console.error('获取宿舍成员失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}
