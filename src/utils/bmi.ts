import type { BMICategory } from '@/db/types'

// 计算BMI指数
export function calculateBMI(weight: number, height: number): number {
  if (weight <= 0 || height <= 0) {
    return 0
  }
  const heightInMeters = height / 100
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1))
}

// 根据BMI获取分类
export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) {
    return {
      category: '偏瘦',
      description: '体重过轻，建议增加营养摄入',
      color: 'text-blue-600'
    }
  }
  if (bmi >= 18.5 && bmi < 24) {
    return {
      category: '正常',
      description: '体重正常，请继续保持',
      color: 'text-primary'
    }
  }
  if (bmi >= 24 && bmi < 28) {
    return {
      category: '超重',
      description: '体重超标，建议适当控制饮食',
      color: 'text-amber-600'
    }
  }
  return {
    category: '肥胖',
    description: '体重过重，建议加强运动和控制饮食',
    color: 'text-destructive'
  }
}

// 根据BMI推荐运动
export function getExerciseRecommendation(bmi: number): string {
  if (bmi < 18.5) {
    return '建议进行力量训练如哑铃、俯卧撑等，配合充足的营养摄入'
  }
  if (bmi >= 18.5 && bmi < 24) {
    return '建议每周进行3-5次有氧运动，如慢跑、游泳、骑行等，每次30-60分钟'
  }
  if (bmi >= 24 && bmi < 28) {
    return '建议每天进行40-60分钟中等强度有氧运动，如快走、慢跑、游泳等'
  }
  return '建议每天进行60分钟以上有氧运动，从低强度开始逐步增加，如快走、游泳、骑行等'
}
