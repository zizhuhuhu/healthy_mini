import { View, Text, Image } from '@tarojs/components'
import { useState, useCallback, useEffect } from 'react'
import {
  useShareAppMessage,
  useShareTimeline,
  navigateTo,
  switchTab,
  useDidShow,
  getStorageSync,
  setStorageSync
} from '@tarojs/taro'
import { useTabBarPageClass } from '@/hooks/useTabBarPageClass'
import { getUserPoints } from '@/db/api'
import CheckInButton from '@/components/CheckInButton'

// 生成用户ID
const getUserId = () => {
  let userId = getStorageSync('temp_user_id')
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    setStorageSync('temp_user_id', userId)
  }
  return userId
}

export default function Home() {
  useTabBarPageClass()
  useShareAppMessage(() => ({ title: '智体云衡 - 体质健康管理' }))
  useShareTimeline(() => ({ title: '智体云衡 - 体质健康管理' }))

  const [totalPoints, setTotalPoints] = useState(0)
  const [pointsAnimating, setPointsAnimating] = useState(false)

  // 加载用户积分（使用user_score字段）
  const loadPoints = useCallback(async () => {
    const userId = getUserId()
    const points = await getUserPoints(userId)
    if (points) {
      // 使用user_score字段
      setTotalPoints(points.user_score || 0)
      console.log('当前用户积分(user_score):', points.user_score)
    }
  }, [])

  useEffect(() => {
    loadPoints()
  }, [loadPoints])

  // 页面显示时刷新积分
  useDidShow(() => {
    loadPoints()
  })

  // 积分更新回调（带动画效果和强制刷新）
  const handlePointsUpdate = (points: number) => {
    // 触发动画
    setPointsAnimating(true)
    
    // 立即更新积分显示
    setTotalPoints(points)
    
    // 动画结束后重置状态
    setTimeout(() => {
      setPointsAnimating(false)
    }, 1000)
    
    // 额外再次刷新确保数据同步
    setTimeout(() => {
      loadPoints()
    }, 1500)
  }

  // 跳转到积分排行榜
  const handleNavigateToRanking = () => {
    navigateTo({ url: '/pages/points-ranking/index' })
  }

  const handleNavigateToTest = () => {
    switchTab({ url: '/pages/constitution-test/index' })
  }

  const handleNavigateToFood = () => {
    switchTab({ url: '/pages/food-recommend/index' })
  }

  const handleNavigateToDelivery = () => {
    switchTab({ url: '/pages/delivery-express/index' })
  }

  const handleNavigateToAIAdvisor = () => {
    navigateTo({ url: '/pages/ai-advisor/index' })
  }

  const handleNavigateToDishAnalysis = () => {
    navigateTo({ url: '/pages/dish-analysis/index' })
  }

  const handleNavigateToWeightLab = () => {
    switchTab({ url: '/pages/weight-lab/index' })
  }

  return (
    <View className="min-h-screen bg-background texture-noise">
      <View className="w-full px-4 py-6">
        {/* 顶部：签到按钮 + 积分显示 */}
        <View className="mb-8 animate-fade-in-scale">
          <View className="glass rounded-3xl px-6 py-5 shadow-soft">
            <View className="flex flex-col space-y-4">
              {/* 签到按钮 */}
              <View className="flex flex-row items-center justify-center">
                <CheckInButton onPointsUpdate={handlePointsUpdate} />
              </View>
              
              {/* 分隔线 */}
              <View className="w-full h-px bg-border" />
              
              {/* 积分显示和排行榜 */}
              <View className="flex flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg text-muted-foreground mb-1">我的积分</Text>
                  <View className="flex flex-row items-baseline">
                    <Text 
                      className={`text-4xl font-bold gradient-text mr-2 ${
                        pointsAnimating ? 'animate-bounce' : ''
                      }`}
                    >
                      {totalPoints}
                    </Text>
                    <Text className="text-xl text-muted-foreground">分</Text>
                  </View>
                </View>

                {/* 排行榜按钮 */}
                <View
                  className="bg-gradient-primary px-5 py-3 rounded-xl active-press"
                  onClick={handleNavigateToRanking}
                >
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-trophy text-2xl text-white mr-2" />
                    <Text className="text-xl font-semibold text-white">排行榜</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 欢迎区域 - 加入天津中医药大学校徽 */}
        <View className="rounded-3xl p-10 mb-8 shadow-elegant animate-fade-in-up bg-[#63a948f2] bg-none">
          <View className="flex flex-col items-center space-y-6">
            {/* 天津中医药大学校徽 - 超大尺寸 */}
            <Image
              src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a354990-fbb2-4357-82aa-0c94b6fde357.jpg"
              mode="aspectFit"
              className="w-64 h-64"
              style={{ backgroundColor: 'transparent' }}
            />
            <Text className="text-5xl font-extrabold text-primary-foreground" style={{ letterSpacing: '3px' }}>
              智体云衡
            </Text>
            <Text className="text-3xl font-bold text-primary-foreground text-center leading-relaxed" style={{ letterSpacing: '2px' }}>
              天津中医药大学
            </Text>
            <Text className="text-2xl font-bold text-primary-foreground/90 text-center" style={{ letterSpacing: '1px' }}>
              体质健康管理平台
            </Text>
            <Text className="text-xl font-medium text-primary-foreground/85 text-center" style={{ letterSpacing: '1px' }}>
              了解体质 · 科学饮食 · 健康生活
            </Text>
          </View>
        </View>

        {/* 功能入口 - 大圆角+细腻阴影+动画 */}
        <View className="flex flex-col space-y-4">
          {/* 体质测试入口 */}
          <View
            className="bg-card-warm rounded-3xl p-7 shadow-medium active-press hover-lift"
            onClick={handleNavigateToTest}
          >
            <View className="flex flex-row items-center">
              <View className="flex-shrink-0 w-18 h-18 bg-gradient-primary rounded-2xl flex flex-col items-center justify-center mr-5 shadow-soft">
                <View className="i-mdi-clipboard-text text-5xl text-primary-foreground" />
              </View>
              <View className="flex-1 flex flex-col space-y-2">
                <Text className="text-2xl font-bold text-foreground">体质测试</Text>
                <Text className="text-xl text-muted-foreground leading-relaxed">
                  了解您的体质类型，获取个性化健康建议
                </Text>
              </View>
              <View className="i-mdi-chevron-right text-3xl ml-3" style={{ color: '#9BB88B' }} />
            </View>
          </View>

          {/* 天中饮食入口 */}
          <View
            className="bg-card-warm rounded-3xl p-7 shadow-medium active-press hover-lift"
            onClick={handleNavigateToFood}
          >
            <View className="flex flex-row items-center">
              <View className="flex-shrink-0 w-18 h-18 bg-gradient-deep rounded-2xl flex flex-col items-center justify-center mr-5 shadow-soft">
                <View className="i-mdi-food text-5xl text-primary-foreground" />
              </View>
              <View className="flex-1 flex flex-col space-y-2">
                <Text className="text-2xl font-bold text-foreground">天中饮食</Text>
                <Text className="text-xl text-muted-foreground leading-relaxed">
                  校园食堂菜品推荐，营养健康搭配
                </Text>
              </View>
              <View className="i-mdi-chevron-right text-3xl ml-3" style={{ color: '#9BB88B' }} />
            </View>
          </View>

          {/* 健康实验室入口 - 新增 */}
          <View
            className="bg-card-warm rounded-3xl p-7 shadow-medium active-press hover-lift"
            onClick={handleNavigateToWeightLab}
          >
            <View className="flex flex-row items-center">
              <View className="flex-shrink-0 w-18 h-18 rounded-2xl flex flex-col items-center justify-center mr-5 shadow-soft" style={{ background: 'linear-gradient(135deg, #D4AF37, #F4D03F)' }}>
                <View className="i-mdi-scale-bathroom text-5xl text-primary-foreground" />
              </View>
              <View className="flex-1 flex flex-col space-y-2">
                <Text className="text-2xl font-bold text-foreground">健康实验室</Text>
                <Text className="text-xl text-muted-foreground leading-relaxed">
                  记录体重变化，打卡赢积分，解锁成就徽章
                </Text>
              </View>
              <View className="i-mdi-chevron-right text-3xl ml-3" style={{ color: '#D4AF37' }} />
            </View>
          </View>

          {/* 饮食速递入口 */}
          <View
            className="bg-card-warm rounded-3xl p-7 shadow-medium active-press hover-lift"
            onClick={handleNavigateToDelivery}
          >
            <View className="flex flex-row items-center">
              <View className="flex-shrink-0 w-18 h-18 bg-gradient-gold rounded-2xl flex flex-col items-center justify-center mr-5 shadow-soft">
                <View className="i-mdi-moped text-5xl text-primary-foreground" />
              </View>
              <View className="flex-1 flex flex-col space-y-2">
                <Text className="text-2xl font-bold text-foreground">饮食速递</Text>
                <Text className="text-xl text-muted-foreground leading-relaxed">
                  校园外卖配送，美食送到宿舍
                </Text>
              </View>
              <View className="i-mdi-chevron-right text-3xl ml-3" style={{ color: '#9BB88B' }} />
            </View>
          </View>

          {/* AI健康顾问入口 - 特殊渐变卡片 */}
          <View
            className="rounded-3xl p-7 shadow-large active-press hover-lift bg-[#f2f8f2] bg-none"
            onClick={handleNavigateToAIAdvisor}
          >
            <View className="flex flex-row items-center">
              <View className="flex-shrink-0 w-18 h-18 glass-strong rounded-2xl flex flex-col items-center justify-center mr-5">
                <View className="i-mdi-robot text-5xl" style={{ color: '#D4AF37' }} />
              </View>
              <View className="flex-1 flex flex-col space-y-2">
                <View className="flex flex-row items-center">
                  <Text className="text-2xl font-bold mr-2 text-[#15372a]">AI健康顾问</Text>
                  <View className="px-3 py-1 rounded-full shadow-soft bg-[#d9d91a] bg-none">
                    <Text className="text-base text-primary-foreground font-bold">会员</Text>
                  </View>
                </View>
                <Text className="text-xl leading-relaxed text-[#808080]">
                  专业AI助手，提供个性化健康建议
                </Text>
              </View>
              <View className="i-mdi-chevron-right text-3xl text-primary-foreground ml-3" />
            </View>
          </View>

          {/* AI菜品分析入口 */}
          <View
            className="bg-card-warm rounded-3xl p-7 shadow-medium active-press hover-lift"
            onClick={handleNavigateToDishAnalysis}
          >
            <View className="flex flex-row items-center">
              <View className="flex-shrink-0 w-18 h-18 bg-gradient-primary rounded-2xl flex flex-col items-center justify-center mr-5 shadow-soft">
                <View className="i-mdi-camera-plus text-5xl text-primary-foreground" />
              </View>
              <View className="flex-1 flex flex-col space-y-2">
                <Text className="text-2xl font-bold text-foreground">AI菜品分析</Text>
                <Text className="text-xl text-muted-foreground leading-relaxed">
                  拍照识别菜品，分析热量和体质适配度
                </Text>
              </View>
              <View className="i-mdi-chevron-right text-3xl ml-3" style={{ color: '#9BB88B' }} />
            </View>
          </View>
        </View>

        {/* 健康小贴士 - 毛玻璃卡片 */}
        <View className="glass rounded-3xl p-7 mt-8 shadow-soft">
          <View className="flex flex-row items-center mb-5">
            <View className="i-mdi-lightbulb-on text-3xl mr-3" style={{ color: '#D4AF37' }} />
            <Text className="text-2xl font-bold text-foreground">健康小贴士</Text>
          </View>
          <View className="flex flex-col space-y-4">
            <View className="flex flex-row items-start">
              <View className="i-mdi-check-circle text-2xl mr-3 mt-1" style={{ color: '#9BB88B' }} />
              <Text className="flex-1 text-xl text-foreground leading-relaxed">
                每天保持充足的水分摄入，建议饮水1500-2000ml
              </Text>
            </View>
            <View className="flex flex-row items-start">
              <View className="i-mdi-check-circle text-2xl mr-3 mt-1" style={{ color: '#9BB88B' }} />
              <Text className="flex-1 text-xl text-foreground leading-relaxed">
                规律作息，保证每天7-8小时的优质睡眠
              </Text>
            </View>
            <View className="flex flex-row items-start">
              <View className="i-mdi-check-circle text-2xl mr-3 mt-1" style={{ color: '#9BB88B' }} />
              <Text className="flex-1 text-xl text-foreground leading-relaxed">
                均衡饮食，多吃新鲜蔬菜水果，少吃油腻食物
              </Text>
            </View>
          </View>
        </View>

        {/* 学校标识和版权信息 */}
        <View className="flex flex-col items-center mt-10 mb-6 space-y-4">
          <View className="flex flex-row items-center">
            <Image
              src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a354990-fbb2-4357-82aa-0c94b6fde357.jpg"
              mode="aspectFit"
              className="w-20 h-20 mr-3"
              style={{ backgroundColor: 'transparent' }}
            />
            <Text className="text-2xl font-bold text-foreground" style={{ letterSpacing: '1px' }}>
              天津中医药大学
            </Text>
          </View>
          <Text className="text-xl text-muted-foreground text-center font-medium" style={{ letterSpacing: '0.5px' }}>
            Tianjin University of Traditional Chinese Medicine
          </Text>
          <Text className="text-lg text-muted-foreground font-medium" style={{ letterSpacing: '0.5px' }}>
            © 2026 智体云衡 · 体质健康管理平台
          </Text>
        </View>
      </View>
    </View>
  );
}


  
