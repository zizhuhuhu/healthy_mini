import { View, Text, ScrollView, Button } from '@tarojs/components'
import { useState, useCallback } from 'react'
import { useShareAppMessage, useShareTimeline, showToast, navigateBack, switchTab, navigateTo } from '@tarojs/taro'
import { activateUserMembership } from '@/db/api'
import QuickNav from '@/components/QuickNav'

export default function Membership() {
  useShareAppMessage(() => ({ title: '会员开通 - 智体云衡' }))
  useShareTimeline(() => ({ title: '会员开通 - 智体云衡' }))

  const [activating, setActivating] = useState(false)

  // 开通会员（演示版本）
  const handleActivate = useCallback(async () => {
    setActivating(true)

    try {
      // 使用测试用户ID
      const userId = 'test_user_001'
      const success = await activateUserMembership(userId)

      if (success) {
        showToast({
          title: '会员开通成功',
          icon: 'success',
          duration: 2000
        })

        // 延迟返回
        setTimeout(() => {
          navigateBack()
        }, 2000)
      } else {
        showToast({
          title: '开通失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('开通会员失败:', error)
      showToast({
        title: '开通失败，请重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      setActivating(false)
    }
  }, [])

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 会员标题 */}
          <View className="bg-gradient-primary rounded-2xl p-6 mb-6 shadow-lg">
            <View className="flex flex-col items-center space-y-4">
              <View className="i-mdi-crown text-6xl text-primary-foreground" />
              <Text className="text-3xl font-bold text-primary-foreground">AI健康顾问会员</Text>
              <Text className="text-xl text-primary-foreground/90 text-center leading-relaxed">
                专业AI助手，24小时为您的健康保驾护航
              </Text>
            </View>
          </View>

          {/* 会员权益 */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-star text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">会员权益</Text>
            </View>

            <View className="flex flex-col space-y-4">
              <View className="flex flex-row items-start">
                <View className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center mr-3">
                  <View className="i-mdi-robot text-2xl text-primary" />
                </View>
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-xl font-semibold text-foreground">AI健康咨询</Text>
                  <Text className="text-xl text-muted-foreground leading-relaxed">
                    24小时在线，随时解答健康问题
                  </Text>
                </View>
              </View>

              <View className="flex flex-row items-start">
                <View className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center mr-3">
                  <View className="i-mdi-account-heart text-2xl text-primary" />
                </View>
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-xl font-semibold text-foreground">个性化建议</Text>
                  <Text className="text-xl text-muted-foreground leading-relaxed">
                    基于您的体质和BMI，提供专属健康方案
                  </Text>
                </View>
              </View>

              <View className="flex flex-row items-start">
                <View className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center mr-3">
                  <View className="i-mdi-food-apple text-2xl text-primary" />
                </View>
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-xl font-semibold text-foreground">饮食指导</Text>
                  <Text className="text-xl text-muted-foreground leading-relaxed">
                    结合中医体质学，推荐适合的食物
                  </Text>
                </View>
              </View>

              <View className="flex flex-row items-start">
                <View className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center mr-3">
                  <View className="i-mdi-run text-2xl text-primary" />
                </View>
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-xl font-semibold text-foreground">运动建议</Text>
                  <Text className="text-xl text-muted-foreground leading-relaxed">
                    根据体质特点，制定运动计划
                  </Text>
                </View>
              </View>

              <View className="flex flex-row items-start">
                <View className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex flex-col items-center justify-center mr-3">
                  <View className="i-mdi-history text-2xl text-primary" />
                </View>
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-xl font-semibold text-foreground">对话历史</Text>
                  <Text className="text-xl text-muted-foreground leading-relaxed">
                    保存所有咨询记录，随时回顾
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 价格说明（演示版本） */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-col items-center space-y-4">
              <Text className="text-2xl font-semibold text-foreground">会员价格</Text>
              <View className="flex flex-row items-baseline">
                <Text className="text-5xl font-bold text-primary">免费</Text>
                <Text className="text-xl text-muted-foreground ml-2">体验版</Text>
              </View>
              <Text className="text-xl text-muted-foreground text-center">
                当前为演示版本，免费开通体验
              </Text>
            </View>
          </View>

          {/* 开通按钮 */}
          <Button
            className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl mb-4"
            onClick={handleActivate}
            disabled={activating}
          >
            <View className="py-4 flex flex-row items-center justify-center">
              {activating && (
                <View className="i-mdi-loading animate-spin text-2xl mr-2" />
              )}
              <Text>{activating ? '开通中...' : '立即开通会员'}</Text>
            </View>
          </Button>

          {/* 温馨提示 */}
          <View className="bg-card rounded-2xl p-6 mb-4">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-information text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">温馨提示</Text>
            </View>
            <View className="flex flex-col space-y-3">
              <Text className="text-xl text-foreground leading-relaxed">
                • 当前为演示版本，点击开通即可免费体验
              </Text>
              <Text className="text-xl text-foreground leading-relaxed">
                • AI对话功能需要配置千帆API密钥后才能使用
              </Text>
              <Text className="text-xl text-foreground leading-relaxed">
                • 正式版本可以集成支付功能实现付费会员
              </Text>
              <Text className="text-xl text-foreground leading-relaxed">
                • 详细集成步骤请参考 AI_INTEGRATION_GUIDE.md
              </Text>
            </View>
          </View>

          {/* 快捷导航 */}
          <QuickNav />
        </View>
      </ScrollView>
    </View>
  )
}
