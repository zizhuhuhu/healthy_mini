// 数据库类型定义

export interface ConstitutionType {
  id: number
  name: string
  description: string
  suitable_foods: string
  avoid_foods: string
  recommended_exercises: string
  created_at: string
}

export interface Dish {
  id: number
  name: string
  canteen_name: string
  window_location: string
  price: number
  calories: number
  protein: number
  flavor: string
  image_url: string | null
  suitable_constitutions: string[]
  created_at: string
}

// 会员信息
export interface UserMembership {
  id: number
  user_id: string
  is_active: boolean
  activated_at: string | null
  expires_at: string | null
  created_at: string
}

// AI对话记录
export interface AIConversation {
  id: number
  user_id: string
  conversation_type: 'health_advisor' | 'dish_analysis'
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  created_at: string
}

// 菜品分析记录
export interface DishAnalysisRecord {
  id: number
  user_id: string
  dish_image_url: string | null
  dish_name: string
  ingredients: string
  flavor: string
  calories_per_100g: number | null
  constitution_compatibility: {
    [key: string]: number // 体质名称 -> 适配度(0-100)
  } | null
  is_suitable: boolean | null
  analysis_result: string | null
  created_at: string
}

export interface BMICategory {
  category: string
  description: string
  color: string
}

// 配送地址
export interface DeliveryAddress {
  id: string
  user_id: string
  name: string
  phone: string
  address: string
  is_default: boolean
  created_at: string
}

// 配送订单
export interface DeliveryOrder {
  id: string
  user_id: string
  dish_ids: string[]
  dish_names: string[]
  total_price: number
  delivery_fee: number
  delivery_address_id: string | null
  delivery_address: string
  delivery_name: string
  delivery_phone: string
  status: 'unpaid' | 'pending' | 'accepted' | 'delivering' | 'completed' | 'cancelled'
  courier_id: string | null
  canteen_location: string
  notes: string | null
  created_at: string
  updated_at: string
}

// 跑腿收入
export interface CourierEarning {
  id: string
  courier_id: string
  order_id: string
  earning: number
  created_at: string
}

// 用户签到记录
export interface UserCheckin {
  id: string
  user_id: string
  checkin_date: string
  consecutive_days: number
  points_earned: number
  created_at: string
}

// 用户积分
export interface UserPoints {
  id: string
  user_id: string
  total_points: number
  current_consecutive_days: number
  last_checkin_date: string | null
  created_at: string
  updated_at: string
}

// 签到结果
export interface CheckinResult {
  success: boolean
  message: string
  pointsEarned?: number
  bonusPoints?: number
  consecutiveDays?: number
  totalPoints?: number
  alreadyChecked: boolean
}

// 体重记录
export interface WeightRecord {
  id: number
  user_id: string
  weight: number
  record_date: string
  created_at: string
}

// 成就定义
export interface AchievementDefinition {
  id: string
  name: string
  description: string
  icon: string
  points_reward: number
  condition_type: string
  condition_value: number | null
  created_at: string
}

// 用户成就
export interface UserAchievement {
  id: number
  user_id: string
  achievement_id: string
  unlocked_at: string
}

// 体重打卡统计
export interface WeightCheckinStats {
  user_id: string
  current_streak: number
  max_streak: number
  total_checkins: number
  total_points: number
  last_checkin_date: string | null
  updated_at: string
}

// 体重打卡结果
export interface WeightCheckinResult {
  success: boolean
  message: string
  pointsEarned: number
  bonusPoints: number
  currentStreak: number
  totalPoints: number
  newAchievements: AchievementDefinition[]
}

// 虚拟物品
export interface VirtualItem {
  id: string
  name: string
  description: string
  type: 'chart_skin' | 'effect' | 'nickname_icon'
  price: number
  icon: string
  preview_image: string | null
  created_at: string
}

// 用户拥有的虚拟物品
export interface UserItem {
  id: number
  user_id: string
  item_id: string
  purchased_at: string
  is_active: boolean
}

// 宿舍信息
export interface DormitoryInfo {
  id: number
  user_id: string
  dormitory_name: string
  created_at: string
}

// 宿舍排行
export interface DormitoryRanking {
  dormitory_name: string
  member_count: number
  avg_streak: number
  max_streak: number
  total_points: number
}

// ==================== 饮食速递信用系统 ====================

// 用户信用信息
export interface DeliveryUser {
  id: string
  user_id: string
  credit_score: number
  total_help_count: number
  total_request_count: number
  positive_review_count: number
  negative_review_count: number
  credit_level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  free_help_count: number
  is_verified: boolean
  real_name: string | null
  student_id: string | null
  class_name: string | null
  phone_number: string | null
  wechat_id: string | null
  verification_status: 'pending' | 'approved' | 'rejected'
  verification_submitted_at: string | null
  verification_approved_at: string | null
  verification_rejected_reason: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

// 饮食速递订单
export interface DeliveryExpressOrder {
  id: string
  order_number: string
  requester_id: string
  helper_id: string | null
  pickup_location: string
  delivery_location: string
  canteen_order_number: string
  meal_fee: number
  tip_credit: number
  status: 'pending' | 'accepted' | 'completed' | 'cancelled' | 'disputed'
  notes: string | null
  requester_phone: string | null
  requester_wechat: string | null
  requester_confirmed: boolean
  helper_confirmed: boolean
  created_at: string
  accepted_at: string | null
  completed_at: string | null
  cancelled_at: string | null
}

// 评价
export interface DeliveryReview {
  id: string
  order_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  tags: string[]
  created_at: string
}

// 成就
export interface DeliveryAchievement {
  id: string
  user_id: string
  achievement_type: string
  achievement_name: string
  achievement_desc: string
  reward_type: string | null
  reward_value: number | null
  unlocked_at: string
}

// 争议
export interface DeliveryDispute {
  id: string
  order_id: string
  initiator_id: string
  reason: string
  description: string
  status: 'pending' | 'resolved' | 'rejected'
  resolution: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

// 社交动态
export interface DeliveryMoment {
  id: string
  user_id: string
  content: string
  order_id: string | null
  image_url: string | null
  like_count: number
  created_at: string
}
