import { View, Text, ScrollView, Image, Button } from '@tarojs/components'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useShareAppMessage, useShareTimeline, switchTab } from '@tarojs/taro'
import { useTabBarPageClass } from '@/hooks/useTabBarPageClass'
import { getAllDishes } from '@/db/api'
import { getConstitutionTypeByName } from '@/db/api'
import type { Dish, ConstitutionType } from '@/db/types'
import { getUserConstitution, hasCompletedTest } from '@/utils/storage'
import { getRecommendedDishes, type DishRecommendation } from '@/utils/dishMatcher'
import CheckInButton from '@/components/CheckInButton'

export default function FoodRecommend() {
  useTabBarPageClass()
  useShareAppMessage(() => ({ title: '天中饮食 - 智体云衡' }))
  useShareTimeline(() => ({ title: '天中饮食 - 智体云衡' }))

  const [dishes, setDishes] = useState<Dish[]>([])
  const [constitution, setConstitution] = useState<ConstitutionType | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasTest, setHasTest] = useState(false)

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    
    // 检查是否完成体质测试
    const completed = hasCompletedTest()
    setHasTest(completed)
    
    if (!completed) {
      setLoading(false)
      return
    }
    
    // 获取用户体质数据
    const userData = getUserConstitution()
    if (!userData) {
      setHasTest(false)
      setLoading(false)
      return
    }
    
    // 加载体质类型详情
    const constitutionData = await getConstitutionTypeByName(userData.constitutionType)
    setConstitution(constitutionData)
    
    // 加载所有菜品
    const dishesData = await getAllDishes()
    setDishes(dishesData)
    
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 计算推荐菜品（使用用户数据）
  const recommendations = useMemo(() => {
    const userData = getUserConstitution()
    if (!constitution || dishes.length === 0 || !userData) {
      return []
    }
    return getRecommendedDishes(dishes, constitution, userData)
  }, [dishes, constitution])

  const handleGoToTest = () => {
    switchTab({ url: '/pages/constitution-test/index' })
  }

  // 获取匹配度颜色 - 统一使用红色
  const getScoreColor = (score: number): string => {
    return 'text-red-600'
  }

  // 获取匹配度标签
  const getScoreLabel = (score: number): string => {
    if (score >= 90) return '强烈推荐'
    if (score >= 85) return '非常推荐'
    if (score >= 75) return '推荐'
    if (score >= 65) return '适合'
    return '可选'
  }

  // 获取用户BMI信息用于显示
  const userData = getUserConstitution()
  const bmiInfo = userData ? {
    bmi: userData.bmi.toFixed(1),
    weight: userData.weight,
    height: userData.height
  } : null

  return (
    <View className="min-h-screen bg-background">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 顶部：返回首页按钮 + 签到按钮 */}
          <View className="flex flex-row items-center justify-between mb-6">
            <View
              className="flex flex-row items-center bg-card rounded-full px-5 py-2 border border-border shadow-sm"
              onClick={() => switchTab({ url: '/pages/home/index' })}
            >
              <View className="i-mdi-home text-2xl text-primary mr-1" />
              <Text className="text-xl font-medium text-foreground">首页</Text>
            </View>
            
            <CheckInButton onPointsUpdate={() => {}} />
          </View>

          {/* 学校食堂标识 */}
          <View className="glass rounded-3xl p-7 mb-6 shadow-soft bg-[#63a948] bg-none">
            <View className="flex flex-col items-center space-y-3">
              <Image
                src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a354990-fbb2-4357-82aa-0c94b6fde357.jpg"
                mode="aspectFit"
                className="w-64 h-64"
                style={{ backgroundColor: 'transparent' }}
              />
              <Text className="text-3xl font-extrabold text-center text-[#131515]" style={{ letterSpacing: '2px' }}>
                天中饮食推荐
              </Text>
              <Text className="text-xl font-bold text-muted-foreground text-center" style={{ letterSpacing: '1px' }}>
                天津中医药大学
              </Text>
              <Text className="text-xl font-medium text-muted-foreground text-center" style={{ letterSpacing: '0.5px' }}>
                营养搭配 · 健康饮食
              </Text>
            </View>
          </View>

          {/* 未完成测试提示 */}
          {!hasTest && !loading && (
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-col items-center space-y-4">
                <View className="i-mdi-alert-circle text-6xl text-amber-600" />
                <Text className="text-2xl font-semibold text-foreground">
                  请先完成体质测试
                </Text>
                <Text className="text-xl text-muted-foreground text-center">
                  为了给您提供个性化的饮食推荐，请先完成体质测试
                </Text>
                <Button
                  className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl mt-4"
                  onClick={handleGoToTest}
                >
                  <View className="py-4">
                    <Text>前往体质测试</Text>
                  </View>
                </Button>
              </View>
            </View>
          )}

          {/* 加载状态 */}
          {loading && (
            <View className="flex flex-col items-center py-12">
              <View className="i-mdi-loading animate-spin text-5xl text-primary mb-4" />
              <Text className="text-xl text-muted-foreground">加载中...</Text>
            </View>
          )}

          {/* 已完成测试 - 显示个性化推荐 */}
          {hasTest && !loading && constitution && bmiInfo && (
            <View className="flex flex-col space-y-4">
              {/* 个性化推荐说明 */}
              <View className="rounded-2xl p-6 border border-border bg-[#63a948] bg-none">
                <View className="flex flex-col space-y-3">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-account-heart text-3xl text-primary-foreground mr-2" />
                    <Text className="text-2xl font-bold text-primary-foreground">
                      为您的{constitution.name}定制
                    </Text>
                  </View>
                  <Text className="text-xl text-primary-foreground/90">
                    根据您的体质特点和BMI指数（{bmiInfo.bmi}），为您推荐{recommendations.length}道适合的菜品
                  </Text>
                  <View className="flex flex-row items-center flex-wrap gap-2 mt-2">
                    <View className="bg-primary-foreground/20 px-3 py-1 rounded-lg">
                      <Text className="text-xl text-primary-foreground">
                        身高 {bmiInfo.height}cm
                      </Text>
                    </View>
                    <View className="bg-primary-foreground/20 px-3 py-1 rounded-lg">
                      <Text className="text-xl text-primary-foreground">
                        体重 {bmiInfo.weight}kg
                      </Text>
                    </View>
                    <View className="bg-primary-foreground/20 px-3 py-1 rounded-lg">
                      <Text className="text-xl text-primary-foreground">
                        BMI {bmiInfo.bmi}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 推荐菜品列表 */}
              {recommendations.length > 0 && (
                <View className="flex flex-col space-y-4">
                  {recommendations.map((rec: DishRecommendation) => (
                    <View key={rec.dish.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                      {/* 菜品图片 */}
                      {rec.dish.image_url && (
                        <View className="w-full h-48 bg-muted relative">
                          <Image
                            src={rec.dish.image_url}
                            className="w-full h-full"
                            mode="aspectFill"
                          />
                          {/* 匹配度标签 */}
                          <View className={`absolute top-3 right-3 px-3 py-1 rounded-lg ${
                            rec.matchScore >= 85 ? 'bg-primary' : 
                            rec.matchScore >= 70 ? 'bg-amber-600' : 'bg-orange-600'
                          }`}>
                            <Text className="text-xl font-semibold text-primary-foreground">
                              {getScoreLabel(rec.matchScore)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* 菜品信息 */}
                      <View className="p-6">
                        <View className="flex flex-row items-center justify-between mb-4">
                          <Text className="text-2xl font-bold text-foreground">{rec.dish.name}</Text>
                          <Text className="text-2xl font-bold text-primary">¥{rec.dish.price}</Text>
                        </View>

                        {/* 推荐理由 */}
                        <View className="bg-primary/10 rounded-xl p-4 mb-4">
                          <View className="flex flex-row items-start">
                            <View className="i-mdi-lightbulb-on text-xl text-primary mr-2 mt-1" />
                            <View className="flex-1 flex flex-col space-y-1">
                              <Text className="text-xl font-semibold text-[#63a948]">{"推荐理由"}</Text>
                              <Text className="text-xl text-foreground leading-relaxed">
                                {rec.reason}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* 食堂和窗口信息 */}
                        <View className="flex flex-row items-center mb-3">
                          <View className="i-mdi-store text-xl text-primary mr-2" />
                          <Text className="text-xl text-foreground">{rec.dish.canteen_name}</Text>
                          <View className="i-mdi-map-marker text-xl text-primary ml-4 mr-2" />
                          <Text className="text-xl text-foreground">{rec.dish.window_location}</Text>
                        </View>

                        {/* 营养信息 */}
                        <View className="flex flex-row items-center mb-3 flex-wrap gap-2">
                          <View className="flex flex-row items-center">
                            <View className="i-mdi-fire text-xl text-destructive mr-1" />
                            <Text className="text-xl text-foreground">{rec.dish.calories} 千卡</Text>
                          </View>
                          <View className="flex flex-row items-center">
                            <View className="i-mdi-dumbbell text-xl text-primary mr-1" />
                            <Text className="text-xl text-foreground">{rec.dish.protein}g 蛋白质</Text>
                          </View>
                        </View>

                        {/* 口味和匹配度 */}
                        <View className="flex flex-row items-center justify-between">
                          <View className="flex flex-row items-center">
                            <View className="i-mdi-tag text-xl text-primary mr-2" />
                            <View className="bg-muted px-3 py-1 rounded-lg">
                              <Text className="text-xl text-foreground">{rec.dish.flavor}</Text>
                            </View>
                          </View>
                          <View className="flex flex-row items-center">
                            <View className="i-mdi-chart-line text-xl text-primary mr-1" />
                            <Text className={`text-xl font-semibold ${getScoreColor(rec.matchScore)}`}>
                              匹配度 {rec.matchScore}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 无推荐菜品 */}
              {recommendations.length === 0 && (
                <View className="bg-card rounded-2xl p-12 flex flex-col items-center">
                  <View className="i-mdi-food-off text-6xl text-muted-foreground mb-4" />
                  <Text className="text-2xl font-semibold text-foreground mb-2">
                    暂无适合的菜品
                  </Text>
                  <Text className="text-xl text-muted-foreground text-center">
                    菜品信息正在更新中，请稍后再试
                  </Text>
                </View>
              )}

              {/* 温馨提示 */}
              <View className="bg-card rounded-2xl p-6">
                <View className="flex flex-row items-center mb-4">
                  <View className="i-mdi-information text-2xl text-primary mr-2" />
                  <Text className="text-2xl font-semibold text-foreground">温馨提示</Text>
                </View>
                <View className="flex flex-col space-y-3">
                  <Text className="text-xl text-foreground leading-relaxed">
                    • 推荐基于您的{constitution.name}和BMI {bmiInfo.bmi}
                  </Text>
                  <Text className="text-xl text-foreground leading-relaxed">
                    • 匹配度越高，越适合您的体质和健康目标
                  </Text>
                  <Text className="text-xl text-foreground leading-relaxed">
                    • 建议优先选择匹配度85%以上的菜品
                  </Text>
                  <Text className="text-xl text-foreground leading-relaxed">
                    • 均衡饮食，适量摄入各类营养
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
