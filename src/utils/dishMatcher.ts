import type { ConstitutionType, Dish } from '@/db/types'
import type { UserConstitutionData } from './storage'

// 菜品推荐结果接口
export interface DishRecommendation {
  dish: Dish
  matchScore: number // 匹配度分数 0-100
  reason: string // 推荐理由
  isRecommended: boolean // 是否推荐
}

// 根据BMI获取热量推荐范围
function getCalorieRecommendation(bmi: number): { min: number; max: number; ideal: number } {
  if (bmi < 18.5) {
    // 偏瘦：需要增重，推荐高热量
    return { min: 500, max: 800, ideal: 650 }
  }
  if (bmi >= 18.5 && bmi < 24) {
    // 正常：维持体重，推荐中等热量
    return { min: 350, max: 600, ideal: 450 }
  }
  if (bmi >= 24 && bmi < 28) {
    // 超重：需要减重，推荐低热量
    return { min: 200, max: 450, ideal: 350 }
  }
  // 肥胖：需要减重，推荐更低热量
  return { min: 150, max: 400, ideal: 280 }
}

// 根据BMI获取蛋白质推荐
function getProteinRecommendation(bmi: number): number {
  if (bmi < 18.5) {
    return 25 // 偏瘦需要更多蛋白质
  }
  if (bmi >= 18.5 && bmi < 24) {
    return 20 // 正常
  }
  if (bmi >= 24 && bmi < 28) {
    return 22 // 超重需要高蛋白低热量
  }
  return 25 // 肥胖需要高蛋白低热量
}

// 根据体质类型和菜品特性计算基础匹配度
function calculateConstitutionMatch(dish: Dish, constitution: ConstitutionType): number {
  let score = 50 // 基础分
  
  switch (constitution.name) {
    case '气虚质':
      // 偏好：高蛋白、易消化、温和
      if (dish.protein >= 20) score += 20
      else if (dish.protein >= 15) score += 10
      
      if (dish.flavor.includes('清淡')) score += 15
      if (dish.flavor.includes('鲜')) score += 10
      if (dish.flavor.includes('麻辣') || dish.flavor.includes('辛辣')) score -= 10
      break
      
    case '阳虚质':
      // 偏好：温热、高热量、温补
      if (dish.calories >= 500) score += 20
      else if (dish.calories >= 400) score += 10
      
      if (dish.name.includes('羊') || dish.name.includes('姜') || dish.name.includes('牛')) score += 15
      if (dish.flavor.includes('浓郁') || dish.flavor.includes('香')) score += 10
      if (dish.flavor.includes('清淡')) score -= 5
      break
      
    case '阴虚质':
      // 偏好：滋阴、清淡、低热量
      if (dish.calories <= 400) score += 15
      if (dish.flavor.includes('清淡')) score += 20
      if (dish.name.includes('鱼') || dish.name.includes('蛋')) score += 10
      if (dish.flavor.includes('麻辣') || dish.flavor.includes('辛辣')) score -= 20
      break
      
    case '痰湿质':
      // 偏好：低热量、祛湿、清淡
      if (dish.calories <= 350) score += 25
      else if (dish.calories >= 550) score -= 15
      
      if (dish.flavor.includes('清淡') || dish.flavor.includes('清爽')) score += 15
      if (dish.protein >= 18) score += 10
      break
      
    case '湿热质':
      // 偏好：清热、低热量、清淡
      if (dish.calories <= 350) score += 20
      if (dish.flavor.includes('清淡') || dish.flavor.includes('清爽')) score += 20
      if (dish.flavor.includes('麻辣') || dish.flavor.includes('油腻')) score -= 20
      break
      
    case '血瘀质':
      // 偏好：活血、温和
      if (dish.name.includes('醋') || dish.flavor.includes('酸')) score += 15
      if (dish.protein >= 15) score += 10
      break
      
    case '气郁质':
      // 偏好：疏肝、清香
      if (dish.flavor.includes('清香') || dish.flavor.includes('清爽')) score += 15
      if (dish.calories <= 450) score += 10
      break
      
    case '特禀质':
      // 偏好：清淡、低过敏
      if (dish.flavor.includes('清淡')) score += 20
      if (dish.calories <= 400) score += 10
      if (dish.name.includes('海鲜') || dish.name.includes('虾')) score -= 15
      break
      
    case '平和质':
      // 均衡即可
      if (dish.calories >= 300 && dish.calories <= 550) score += 15
      if (dish.protein >= 12 && dish.protein <= 30) score += 10
      break
  }
  
  return Math.min(Math.max(score, 0), 100)
}

// 根据BMI调整匹配度
function adjustScoreByBMI(baseScore: number, dish: Dish, bmi: number): number {
  const calorieRec = getCalorieRecommendation(bmi)
  const proteinRec = getProteinRecommendation(bmi)
  
  let adjustment = 0
  
  // 热量匹配度调整
  if (bmi < 18.5) {
    // 偏瘦：优先推荐高热量菜品
    if (dish.calories >= calorieRec.ideal) {
      // 高热量菜品，大幅加分
      adjustment += 20
    } else if (dish.calories >= calorieRec.min) {
      // 中等热量，适度加分
      adjustment += 10
    } else {
      // 低热量菜品，减分
      adjustment -= 15
    }
  } else if (bmi >= 24) {
    // 超重/肥胖：优先推荐低热量菜品
    if (dish.calories <= calorieRec.ideal) {
      // 低热量菜品，大幅加分
      adjustment += 20
    } else if (dish.calories <= calorieRec.max) {
      // 中等热量，适度加分
      adjustment += 10
    } else {
      // 高热量菜品，减分
      adjustment -= 15
    }
  } else {
    // 正常体重：推荐范围内的菜品
    if (dish.calories >= calorieRec.min && dish.calories <= calorieRec.max) {
      const deviation = Math.abs(dish.calories - calorieRec.ideal)
      const maxDeviation = calorieRec.max - calorieRec.ideal
      adjustment += 15 * (1 - deviation / maxDeviation)
    } else if (dish.calories < calorieRec.min) {
      adjustment -= 10
    } else {
      adjustment -= 10
    }
  }
  
  // 蛋白质匹配度调整
  if (dish.protein >= proteinRec) {
    adjustment += 10
  } else if (dish.protein >= proteinRec * 0.8) {
    adjustment += 5
  }
  
  return Math.min(Math.max(baseScore + adjustment, 0), 100)
}

// 生成推荐理由
function generateReason(
  dish: Dish,
  constitution: ConstitutionType,
  userData: UserConstitutionData,
  finalScore: number
): string {
  const reasons: string[] = []
  const bmi = userData.bmi
  const calorieRec = getCalorieRecommendation(bmi)
  
  // 体质匹配理由
  if (finalScore >= 85) {
    reasons.push(`非常适合${constitution.name}`)
  } else if (finalScore >= 70) {
    reasons.push(`适合${constitution.name}`)
  }
  
  // BMI相关理由
  if (bmi < 18.5) {
    if (dish.calories >= 500) {
      reasons.push('高热量有助于增重')
    }
    if (dish.protein >= 25) {
      reasons.push('高蛋白促进肌肉生长')
    }
  } else if (bmi >= 24) {
    if (dish.calories <= 400) {
      reasons.push('低热量有助于控制体重')
    }
    if (dish.protein >= 20 && dish.calories <= 450) {
      reasons.push('高蛋白低热量，适合减脂')
    }
  } else {
    if (dish.calories >= 350 && dish.calories <= 550) {
      reasons.push('热量适中，营养均衡')
    }
  }
  
  // 营养特点
  if (dish.protein >= 25) {
    reasons.push('富含蛋白质')
  }
  
  // 口味特点
  if (constitution.name === '阴虚质' && dish.flavor.includes('清淡')) {
    reasons.push('清淡滋阴')
  } else if (constitution.name === '阳虚质' && dish.calories >= 500) {
    reasons.push('温补阳气')
  } else if ((constitution.name === '痰湿质' || constitution.name === '湿热质') && dish.calories <= 350) {
    reasons.push('清淡祛湿')
  }
  
  // 性价比
  if (dish.price <= 10 && finalScore >= 70) {
    reasons.push('性价比高')
  }
  
  if (reasons.length === 0) {
    return '该菜品营养均衡，可适量食用'
  }
  
  return reasons.join('，')
}

// 根据体质类型和用户数据匹配菜品
export function matchDishWithConstitution(
  dish: Dish,
  constitution: ConstitutionType,
  userData: UserConstitutionData
): DishRecommendation {
  // 检查菜品是否在数据库中标记为适合该体质
  const isDirectMatch = dish.suitable_constitutions?.includes(constitution.name)
  
  if (!isDirectMatch) {
    // 不在推荐列表中
    return {
      dish,
      matchScore: 20,
      reason: `该菜品未经过${constitution.name}的适配认证`,
      isRecommended: false
    }
  }
  
  // 计算基础匹配度（基于体质特点）
  const baseScore = calculateConstitutionMatch(dish, constitution)
  
  // 根据BMI调整匹配度
  const finalScore = adjustScoreByBMI(baseScore, dish, userData.bmi)
  
  // 生成推荐理由
  const reason = generateReason(dish, constitution, userData, finalScore)
  
  return {
    dish,
    matchScore: Math.round(finalScore),
    reason,
    isRecommended: finalScore >= 60
  }
}

// 批量匹配菜品并排序
export function recommendDishes(
  dishes: Dish[],
  constitution: ConstitutionType,
  userData: UserConstitutionData
): DishRecommendation[] {
  const recommendations = dishes.map(dish => 
    matchDishWithConstitution(dish, constitution, userData)
  )
  
  // 按匹配度降序排序
  return recommendations.sort((a, b) => b.matchScore - a.matchScore)
}

// 获取推荐菜品（只返回推荐的）
export function getRecommendedDishes(
  dishes: Dish[],
  constitution: ConstitutionType,
  userData: UserConstitutionData
): DishRecommendation[] {
  const allRecommendations = recommendDishes(dishes, constitution, userData)
  return allRecommendations.filter(rec => rec.isRecommended)
}
