import { View, Text, ScrollView, Button } from '@tarojs/components'
import { useState, useCallback, useEffect } from 'react'
import { useShareAppMessage, useShareTimeline, navigateTo, useDidShow } from '@tarojs/taro'
import { getUserOrders } from '@/db/api'
import type { DeliveryOrder } from '@/db/types'
import QuickNav from '@/components/QuickNav'

// 生成用户ID（实际应用中应该从登录系统获取）
const getUserId = () => {
  let userId = localStorage.getItem('temp_user_id')
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('temp_user_id', userId)
  }
  return userId
}

export default function MyOrders() {
  useShareAppMessage(() => ({ title: '我的订单 - 智体云衡' }))
  useShareTimeline(() => ({ title: '我的订单 - 智体云衡' }))

  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'delivering' | 'completed'>('all')

  // 加载订单数据
  const loadOrders = useCallback(async () => {
    setLoading(true)
    const userId = getUserId()
    const allOrders = await getUserOrders(userId, 50)
    setOrders(allOrders)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // 页面显示时刷新数据
  useDidShow(() => {
    loadOrders()
  })

  // 获取订单状态文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      unpaid: '待支付',
      pending: '待接单',
      accepted: '已接单',
      delivering: '配送中',
      completed: '已完成',
      cancelled: '已取消'
    }
    return statusMap[status] || status
  }

  // 获取订单状态颜色
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      unpaid: 'text-red-600',
      pending: 'text-amber-600',
      accepted: 'text-blue-600',
      delivering: 'text-primary',
      completed: 'text-green-600',
      cancelled: 'text-muted-foreground'
    }
    return colorMap[status] || 'text-foreground'
  }

  // 筛选订单
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return order.status === 'pending' || order.status === 'unpaid'
    if (activeTab === 'delivering') return order.status === 'accepted' || order.status === 'delivering'
    if (activeTab === 'completed') return order.status === 'completed'
    return true
  })

  // 查看订单详情
  const handleViewOrder = (orderId: string) => {
    navigateTo({ url: `/pages/order-detail/index?orderId=${orderId}` })
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* Tab切换 */}
          <View className="bg-card rounded-2xl p-2 mb-4 shadow-lg">
            <View className="flex flex-row gap-2">
              <Button
                className={`flex-1 text-xl font-medium rounded-xl ${
                  activeTab === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-foreground'
                }`}
                onClick={() => setActiveTab('all')}
              >
                <View className="py-3">
                  <Text>全部</Text>
                </View>
              </Button>
              <Button
                className={`flex-1 text-xl font-medium rounded-xl ${
                  activeTab === 'pending'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-foreground'
                }`}
                onClick={() => setActiveTab('pending')}
              >
                <View className="py-3">
                  <Text>待接单</Text>
                </View>
              </Button>
              <Button
                className={`flex-1 text-xl font-medium rounded-xl ${
                  activeTab === 'delivering'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-foreground'
                }`}
                onClick={() => setActiveTab('delivering')}
              >
                <View className="py-3">
                  <Text>配送中</Text>
                </View>
              </Button>
              <Button
                className={`flex-1 text-xl font-medium rounded-xl ${
                  activeTab === 'completed'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-foreground'
                }`}
                onClick={() => setActiveTab('completed')}
              >
                <View className="py-3">
                  <Text>已完成</Text>
                </View>
              </Button>
            </View>
          </View>

          {/* 订单列表 */}
          {loading ? (
            <View className="bg-card rounded-2xl p-8 flex flex-col items-center">
              <View className="i-mdi-loading animate-spin text-5xl text-primary mb-4" />
              <Text className="text-xl text-muted-foreground">加载中...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View className="bg-card rounded-2xl p-8 flex flex-col items-center">
              <View className="i-mdi-inbox text-6xl text-muted-foreground mb-4" />
              <Text className="text-2xl font-semibold text-foreground mb-2">暂无订单</Text>
              <Text className="text-xl text-muted-foreground">快去下单吧</Text>
            </View>
          ) : (
            <View className="flex flex-col space-y-3">
              {filteredOrders.map((order) => (
                <View
                  key={order.id}
                  className="bg-card rounded-2xl p-6 shadow-lg"
                  onClick={() => handleViewOrder(order.id)}
                >
                  <View className="flex flex-row items-start justify-between mb-4">
                    <View className="flex flex-col space-y-1">
                      <Text className="text-2xl font-semibold text-foreground">
                        {order.canteen_location}
                      </Text>
                      <Text className="text-xl text-muted-foreground">
                        {new Date(order.created_at).toLocaleString('zh-CN')}
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-lg ${
                      order.status === 'unpaid' ? 'bg-red-500/10' :
                      order.status === 'pending' ? 'bg-amber-500/10' :
                      order.status === 'accepted' ? 'bg-blue-500/10' :
                      order.status === 'delivering' ? 'bg-primary/10' :
                      order.status === 'completed' ? 'bg-green-500/10' :
                      'bg-muted'
                    }`}>
                      <Text className={`text-xl font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex flex-col space-y-3 mb-4">
                    <View className="flex flex-row items-start">
                      <View className="i-mdi-food text-xl text-primary mr-2 mt-1" />
                      <View className="flex-1">
                        <Text className="text-xl text-foreground">
                          {order.dish_names.join('、')}
                        </Text>
                      </View>
                    </View>

                    <View className="flex flex-row items-start">
                      <View className="i-mdi-map-marker text-xl text-primary mr-2 mt-1" />
                      <View className="flex-1">
                        <Text className="text-xl text-foreground">{order.delivery_address}</Text>
                      </View>
                    </View>

                    {order.courier_id && (
                      <View className="flex flex-row items-start">
                        <View className="i-mdi-bike-fast text-xl text-primary mr-2 mt-1" />
                        <View className="flex-1">
                          <Text className="text-xl text-foreground">
                            {order.status === 'accepted' ? '跑腿小哥已接单，正在购买中' :
                             order.status === 'delivering' ? '跑腿小哥配送中，预计10分钟送达' :
                             order.status === 'completed' ? '已送达' : '等待接单'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View className="border-t border-border pt-4 flex flex-row items-center justify-between">
                    <View className="flex flex-col">
                      <Text className="text-xl text-muted-foreground mb-1">配送费</Text>
                      <Text className="text-3xl font-bold text-primary">
                        ¥{order.delivery_fee}
                      </Text>
                    </View>
                    <View className="flex flex-row items-center">
                      <Text className="text-xl text-primary mr-2">查看详情</Text>
                      <View className="i-mdi-chevron-right text-2xl text-primary" />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 快捷导航 */}
          <View className="mt-4">
            <QuickNav />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
