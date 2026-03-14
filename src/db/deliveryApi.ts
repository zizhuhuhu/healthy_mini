import { supabase } from '@/client/supabase'
import type { DeliveryUser, DeliveryExpressOrder, DeliveryReview, DeliveryAchievement } from './types'

// ==================== 用户信用管理 ====================

// 获取或创建用户信用信息
export async function getOrCreateDeliveryUser(userId: string): Promise<DeliveryUser | null> {
  // 先尝试获取
  const { data: existing } = await supabase
    .from('delivery_users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return existing
  }

  // 不存在则创建（新用户赠送5点初始信用）
  const { data, error } = await supabase
    .from('delivery_users')
    .insert({
      user_id: userId,
      credit_score: 5
    })
    .select()
    .single()

  if (error) {
    console.error('创建用户信用信息失败:', error)
    return null
  }

  return data
}

// 更新用户信用等级
async function updateCreditLevel(userId: string, helpCount: number, positiveRate: number) {
  let level = 'bronze'
  
  if (helpCount >= 100 && positiveRate >= 0.95) {
    level = 'diamond'
  } else if (helpCount >= 50 && positiveRate >= 0.90) {
    level = 'platinum'
  } else if (helpCount >= 20 && positiveRate >= 0.85) {
    level = 'gold'
  } else if (helpCount >= 10 && positiveRate >= 0.80) {
    level = 'silver'
  }

  await supabase
    .from('delivery_users')
    .update({ credit_level: level, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

// ==================== 订单管理 ====================

// 创建订单（发需求）
export async function createDeliveryExpressOrder(params: {
  userId: string
  pickupLocation: string
  deliveryLocation: string
  canteenOrderNumber: string
  mealFee: number
  tipCredit?: number
  notes?: string
  requesterPhone: string
  requesterWechat?: string
}): Promise<{ success: boolean; message: string; orderId?: string }> {
  try {
    // 1. 检查用户信用
    const user = await getOrCreateDeliveryUser(params.userId)
    if (!user) {
      return { success: false, message: '获取用户信息失败' }
    }

    const requiredCredit = 1 + (params.tipCredit || 0)
    if (user.credit_score < requiredCredit) {
      return { success: false, message: `信用分不足，需要${requiredCredit}分，当前${user.credit_score}分` }
    }

    // 2. 冻结信用分
    await supabase
      .from('delivery_users')
      .update({
        credit_score: user.credit_score - requiredCredit,
        total_request_count: user.total_request_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', params.userId)

    // 3. 创建订单
    const orderNumber = `DO${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const { data, error } = await supabase
      .from('delivery_orders')
      .insert({
        order_number: orderNumber,
        requester_id: params.userId,
        pickup_location: params.pickupLocation,
        delivery_location: params.deliveryLocation,
        canteen_order_number: params.canteenOrderNumber,
        meal_fee: params.mealFee,
        tip_credit: params.tipCredit || 0,
        notes: params.notes || null,
        requester_phone: params.requesterPhone,
        requester_wechat: params.requesterWechat || null
      })
      .select()
      .single()

    if (error) {
      console.error('创建订单失败:', error)
      // 回滚信用分
      await supabase
        .from('delivery_users')
        .update({
          credit_score: user.credit_score,
          total_request_count: user.total_request_count,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', params.userId)
      return { success: false, message: '创建订单失败' }
    }

    return { success: true, message: '发布成功！等待热心同学接单', orderId: data.id }
  } catch (error) {
    console.error('创建订单失败:', error)
    return { success: false, message: '创建订单失败' }
  }
}

// 接单
export async function acceptDeliveryExpressOrder(orderId: string, helperId: string): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 检查订单状态
    const { data: order } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) {
      return { success: false, message: '订单不存在' }
    }

    if (order.status !== 'pending') {
      return { success: false, message: '订单已被接单或已完成' }
    }

    if (order.requester_id === helperId) {
      return { success: false, message: '不能接自己的订单' }
    }

    // 2. 更新订单状态
    const { error } = await supabase
      .from('delivery_orders')
      .update({
        helper_id: helperId,
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('status', 'pending') // 防止并发接单

    if (error) {
      console.error('接单失败:', error)
      return { success: false, message: '接单失败，可能已被他人接单' }
    }

    return { success: true, message: '接单成功！请尽快完成送餐' }
  } catch (error) {
    console.error('接单失败:', error)
    return { success: false, message: '接单失败' }
  }
}

// 确认完成（双方确认）
export async function confirmDeliveryExpressOrder(orderId: string, userId: string, role: 'requester' | 'helper'): Promise<{ success: boolean; message: string }> {
  try {
    const { data: order } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) {
      return { success: false, message: '订单不存在' }
    }

    if (order.status !== 'accepted') {
      return { success: false, message: '订单状态异常' }
    }

    // 更新确认状态
    const updateData: any = {}
    if (role === 'requester') {
      if (order.requester_id !== userId) {
        return { success: false, message: '无权操作' }
      }
      updateData.requester_confirmed = true
    } else {
      if (order.helper_id !== userId) {
        return { success: false, message: '无权操作' }
      }
      updateData.helper_confirmed = true
    }

    await supabase
      .from('delivery_orders')
      .update(updateData)
      .eq('id', orderId)

    // 检查是否双方都确认
    const bothConfirmed = role === 'requester' 
      ? updateData.requester_confirmed && order.helper_confirmed
      : order.requester_confirmed && updateData.helper_confirmed

    if (bothConfirmed) {
      // 双方确认，完成订单
      await completeOrder(order)
      return { success: true, message: '订单已完成！感谢你的互助精神' }
    }

    return { success: true, message: '确认成功！等待对方确认' }
  } catch (error) {
    console.error('确认订单失败:', error)
    return { success: false, message: '确认失败' }
  }
}

// 完成订单（内部函数）
async function completeOrder(order: DeliveryExpressOrder) {
  // 1. 更新订单状态
  await supabase
    .from('delivery_orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', order.id)

  // 2. 给帮助者增加信用分和帮助次数
  const { data: helper } = await supabase
    .from('delivery_users')
    .select('*')
    .eq('user_id', order.helper_id)
    .maybeSingle()

  if (helper) {
    const creditReward = 1 + order.tip_credit
    await supabase
      .from('delivery_users')
      .update({
        credit_score: helper.credit_score + creditReward,
        total_help_count: helper.total_help_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', order.helper_id)

    // 检查并解锁成就
    await checkAndUnlockAchievements(order.helper_id!, helper.total_help_count + 1)
  }
}

// 检查并解锁成就
async function checkAndUnlockAchievements(userId: string, helpCount: number) {
  const achievements = [
    { type: 'first_help', name: '初次相助', desc: '完成第1次帮助', threshold: 1, reward: 'credit_boost', value: 2 },
    { type: 'help_10', name: '热心助人', desc: '完成10次帮助', threshold: 10, reward: 'free_help', value: 1 },
    { type: 'help_50', name: '互助达人', desc: '完成50次帮助', threshold: 50, reward: 'free_help', value: 3 },
    { type: 'help_100', name: '校园天使', desc: '完成100次帮助', threshold: 100, reward: 'free_help', value: 5 }
  ]

  for (const achievement of achievements) {
    if (helpCount === achievement.threshold) {
      // 检查是否已解锁
      const { data: existing } = await supabase
        .from('delivery_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_type', achievement.type)
        .maybeSingle()

      if (!existing) {
        // 解锁成就
        await supabase
          .from('delivery_achievements')
          .insert({
            user_id: userId,
            achievement_type: achievement.type,
            achievement_name: achievement.name,
            achievement_desc: achievement.desc,
            reward_type: achievement.reward,
            reward_value: achievement.value
          })

        // 发放奖励
        if (achievement.reward === 'credit_boost') {
          const { data: user } = await supabase
            .from('delivery_users')
            .select('credit_score')
            .eq('user_id', userId)
            .maybeSingle()

          if (user) {
            await supabase
              .from('delivery_users')
              .update({ credit_score: user.credit_score + achievement.value })
              .eq('user_id', userId)
          }
        } else if (achievement.reward === 'free_help') {
          const { data: user } = await supabase
            .from('delivery_users')
            .select('free_help_count')
            .eq('user_id', userId)
            .maybeSingle()

          if (user) {
            await supabase
              .from('delivery_users')
              .update({ free_help_count: user.free_help_count + achievement.value })
              .eq('user_id', userId)
          }
        }
      }
    }
  }
}

// 获取订单列表（按信用分排序）
export async function getDeliveryExpressOrders(status: 'pending' | 'accepted' | 'completed' = 'pending'): Promise<DeliveryExpressOrder[]> {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('获取订单列表失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

// 获取用户订单
export async function getUserDeliveryExpressOrders(userId: string): Promise<{ requested: DeliveryExpressOrder[]; helped: DeliveryExpressOrder[] }> {
  const { data: requested } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false})

  const { data: helped } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('helper_id', userId)
    .order('created_at', { ascending: false })

  return {
    requested: Array.isArray(requested) ? requested : [],
    helped: Array.isArray(helped) ? helped : []
  }
}

// 提交评价
export async function submitDeliveryExpressReview(params: {
  orderId: string
  reviewerId: string
  revieweeId: string
  rating: number
  comment?: string
  tags?: string[]
}): Promise<{ success: boolean; message: string }> {
  try {
    // 1. 创建评价
    await supabase
      .from('delivery_reviews')
      .insert({
        order_id: params.orderId,
        reviewer_id: params.reviewerId,
        reviewee_id: params.revieweeId,
        rating: params.rating,
        comment: params.comment || null,
        tags: params.tags || []
      })

    // 2. 更新被评价者的好评/差评数
    const { data: reviewee } = await supabase
      .from('delivery_users')
      .select('*')
      .eq('user_id', params.revieweeId)
      .maybeSingle()

    if (reviewee) {
      const isPositive = params.rating >= 4
      await supabase
        .from('delivery_users')
        .update({
          positive_review_count: isPositive ? reviewee.positive_review_count + 1 : reviewee.positive_review_count,
          negative_review_count: !isPositive ? reviewee.negative_review_count + 1 : reviewee.negative_review_count,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', params.revieweeId)

      // 更新信用等级
      const totalReviews = reviewee.positive_review_count + reviewee.negative_review_count + 1
      const positiveRate = (reviewee.positive_review_count + (isPositive ? 1 : 0)) / totalReviews
      await updateCreditLevel(params.revieweeId, reviewee.total_help_count, positiveRate)
    }

    return { success: true, message: '评价成功' }
  } catch (error) {
    console.error('提交评价失败:', error)
    return { success: false, message: '评价失败' }
  }
}

// 获取用户成就
export async function getUserDeliveryExpressAchievements(userId: string): Promise<DeliveryAchievement[]> {
  const { data, error } = await supabase
    .from('delivery_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.error('获取成就失败:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}


// 提交实名认证
export async function submitVerification(params: {
  userId: string
  realName: string
  studentId: string
  className: string
  phoneNumber: string
  wechatId?: string
}): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('delivery_users')
      .update({
        real_name: params.realName,
        student_id: params.studentId,
        class_name: params.className,
        phone_number: params.phoneNumber,
        wechat_id: params.wechatId || null,
        verification_status: 'pending',
        verification_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', params.userId)

    if (error) {
      console.error('提交认证失败:', error)
      return { success: false, message: '提交失败，请重试' }
    }

    return { success: true, message: '提交成功！我们将在1-3个工作日内完成审核' }
  } catch (error) {
    console.error('提交认证失败:', error)
    return { success: false, message: '提交失败，请重试' }
  }
}
