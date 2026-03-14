import { View, Text, ScrollView, Button } from '@tarojs/components'
import { useState, useCallback } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useDidShow, navigateTo } from '@tarojs/taro'
import { useTabBarPageClass } from '@/hooks/useTabBarPageClass'
import { getOrCreateDeliveryUser, getDeliveryExpressOrders, acceptDeliveryExpressOrder } from '@/db/deliveryApi'
import type { DeliveryUser, DeliveryExpressOrder } from '@/db/types'

// 生成用户ID
const getUserId = () => {
  let userId = localStorage.getItem('temp_user_id')
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('temp_user_id', userId)
  }
  return userId
}

// 信用等级配置
const CREDIT_LEVELS = {
  bronze: { name: '青铜', color: '#CD7F32', icon: 'i-mdi-medal' },
  silver: { name: '白银', color: '#C0C0C0', icon: 'i-mdi-medal' },
  gold: { name: '黄金', color: '#FFD700', icon: 'i-mdi-medal' },
  platinum: { name: '铂金', color: '#E5E4E2', icon: 'i-mdi-star' },
  diamond: { name: '钻石', color: '#B9F2FF', icon: 'i-mdi-diamond-stone' }
}

export default function DeliveryExpress() {
  useTabBarPageClass()
  useShareAppMessage(() => ({ title: '饮食速递 - 校园互助送餐' }))
  useShareTimeline(() => ({ title: '饮食速递 - 校园互助送餐' }))

  const [userId] = useState(() => getUserId())
  const [userInfo, setUserInfo] = useState<DeliveryUser | null>(null)
  const [pendingOrders, setPendingOrders] = useState<DeliveryExpressOrder[]>([])
  const [loading, setLoading] = useState(false)

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 加载用户信用信息
      const user = await getOrCreateDeliveryUser(userId)
      setUserInfo(user)

      // 加载待接单列表
      const orders = await getDeliveryExpressOrders('pending')
      setPendingOrders(orders)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useDidShow(() => {
    loadData()
  })

  // 发布需求
  const handlePublishRequest = () => {
    if (!userInfo) {
      Taro.showToast({ title: '加载中，请稍后', icon: 'none' })
      return
    }
    navigateTo({ url: '/pages/delivery-publish/index' })
  }

  // 接单
  const handleAcceptOrder = async (orderId: string) => {
    const result = await acceptDeliveryExpressOrder(orderId, userId)
    Taro.showToast({
      title: result.message,
      icon: result.success ? 'success' : 'none'
    })
    if (result.success) {
      loadData()
    }
  }

  // 查看订单详情
  const handleViewOrder = (orderId: string) => {
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  // 查看我的订单
  const handleViewMyOrders = () => {
    navigateTo({ url: '/pages/delivery-my-orders/index' })
  }

  // 查看我的信用
  const handleViewCredit = () => {
    if (!userInfo) return
    
    // 如果未认证，跳转到认证页面
    if (userInfo.verification_status !== 'approved') {
      navigateTo({ url: '/pages/delivery-verification/index' })
      return
    }
    
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  const creditLevel = userInfo ? CREDIT_LEVELS[userInfo.credit_level] : CREDIT_LEVELS.bronze

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 用户信用卡片 */}
          {userInfo && (
            <View className="bg-gradient-primary rounded-3xl p-6 mb-6 shadow-elegant" onClick={handleViewCredit}>
              <View className="flex flex-row items-center justify-between mb-4">
                <View className="flex flex-row items-center">
                  <View className={`${creditLevel.icon} text-4xl mr-3`} style={{ color: creditLevel.color }} />
                  <View className="flex flex-col space-y-1">
                    <Text className="text-2xl font-bold text-primary-foreground">{creditLevel.name}会员</Text>
                    <Text className="text-xl text-primary-foreground/80">信用分：{userInfo.credit_score}</Text>
                  </View>
                </View>
                <View className="i-mdi-chevron-right text-3xl text-primary-foreground" />
              </View>
              
              <View className="flex flex-row items-center justify-around pt-4 border-t border-primary-foreground/20">
                <View className="flex flex-col items-center space-y-1">
                  <Text className="text-3xl font-bold text-primary-foreground">{userInfo.total_help_count}</Text>
                  <Text className="text-lg text-primary-foreground/80">帮助次数</Text>
                </View>
                <View className="flex flex-col items-center space-y-1">
                  <Text className="text-3xl font-bold text-primary-foreground">{userInfo.total_request_count}</Text>
                  <Text className="text-lg text-primary-foreground/80">求助次数</Text>
                </View>
                <View className="flex flex-col items-center space-y-1">
                  <Text className="text-3xl font-bold text-primary-foreground">
                    {userInfo.positive_review_count + userInfo.negative_review_count > 0
                      ? Math.round((userInfo.positive_review_count / (userInfo.positive_review_count + userInfo.negative_review_count)) * 100)
                      : 100}%
                  </Text>
                  <Text className="text-lg text-primary-foreground/80">好评率</Text>
                </View>
              </View>
            </View>
          )}

          {/* 快捷操作 */}
          <View className="flex flex-row items-center space-x-3 mb-6">
            <Button
              className="flex-1 bg-primary text-primary-foreground text-xl font-medium rounded-xl"
              onClick={handlePublishRequest}
            >
              <View className="flex flex-row items-center justify-center py-4">
                <View className="i-mdi-plus-circle text-2xl mr-2" />
                <Text>发布需求</Text>
              </View>
            </Button>
            <Button
              className="flex-1 bg-card text-foreground border border-border text-xl font-medium rounded-xl"
              onClick={handleViewMyOrders}
            >
              <View className="flex flex-row items-center justify-center py-4">
                <View className="i-mdi-clipboard-list text-2xl mr-2" />
                <Text>我的订单</Text>
              </View>
            </Button>
          </View>

          {/* 订单列表标题 */}
          <View className="flex flex-row items-center mb-4">
            <View className="i-mdi-format-list-bulleted text-3xl text-primary mr-2" />
            <Text className="text-2xl font-semibold text-foreground">待接订单</Text>
          </View>

          {/* 订单列表 */}
          {loading ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-loading animate-spin text-5xl text-primary mb-4" />
              <Text className="text-xl text-muted-foreground">加载中...</Text>
            </View>
          ) : pendingOrders.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl">
              <View className="i-mdi-inbox text-6xl text-muted-foreground mb-4" />
              <Text className="text-2xl font-semibold text-foreground mb-2">暂无订单</Text>
              <Text className="text-xl text-muted-foreground">发布需求或等待新订单</Text>
            </View>
          ) : (
            <View className="flex flex-col space-y-4">
              {pendingOrders.map((order) => (
                <View
                  key={order.id}
                  className="bg-card rounded-2xl p-6 border border-border"
                  onClick={() => handleViewOrder(order.id)}
                >
                  <View className="flex flex-row items-start justify-between mb-4">
                    <View className="flex flex-col space-y-2 flex-1">
                      <View className="flex flex-row items-center">
                        <View className="i-mdi-map-marker text-2xl text-primary mr-2" />
                        <Text className="text-xl font-semibold text-foreground">
                          {order.pickup_location}
                        </Text>
                      </View>
                      <View className="flex flex-row items-center">
                        <View className="i-mdi-map-marker-check text-2xl text-green-500 mr-2" />
                        <Text className="text-xl font-semibold text-foreground">
                          {order.delivery_location}
                        </Text>
                      </View>
                    </View>
                    <View className="flex flex-col items-end space-y-1">
                      <Text className="text-2xl font-bold text-primary">¥{order.meal_fee}</Text>
                      {order.tip_credit > 0 && (
                        <View className="flex flex-row items-center bg-yellow-100 px-2 py-1 rounded">
                          <View className="i-mdi-coin text-lg text-yellow-600 mr-1" />
                          <Text className="text-lg font-medium text-yellow-600">+{order.tip_credit}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View className="flex flex-row items-center justify-between pt-4 border-t border-border">
                    <View className="flex flex-col space-y-1">
                      <Text className="text-lg text-muted-foreground">订单号：{order.canteen_order_number}</Text>
                      <Text className="text-lg text-muted-foreground">
                        {new Date(order.created_at).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <Button
                      className="bg-primary text-primary-foreground text-xl font-medium rounded-xl px-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAcceptOrder(order.id)
                      }}
                    >
                      <View className="py-3">
                        <Text>接单</Text>
                      </View>
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 温馨提示 */}
          <View className="bg-card rounded-2xl p-6 mt-6 border border-border">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-information text-3xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">温馨提示</Text>
            </View>
            <View className="flex flex-col space-y-3">
              <Text className="text-xl text-foreground leading-relaxed">
                • 帮助他人完成送餐，获得1点信用+餐费
              </Text>
              <Text className="text-xl text-foreground leading-relaxed">
                • 发布需求需要1点信用，完成后转给帮助者
              </Text>
              <Text className="text-xl text-foreground leading-relaxed">
                • 可添加小费（额外信用）感谢帮助者
              </Text>
              <Text className="text-xl text-foreground leading-relaxed">
                • 累计帮助达里程碑，解锁免费求助权益
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
