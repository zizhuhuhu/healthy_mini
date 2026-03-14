import { View, Text, ScrollView, Button } from '@tarojs/components'
import { useState, useCallback, useEffect } from 'react'
import { useShareAppMessage, useShareTimeline, showToast, useDidShow } from '@tarojs/taro'
import { getPendingOrders, acceptOrder, getCourierOrders, getCourierEarnings } from '@/db/api'
import type { DeliveryOrder } from '@/db/types'
import QuickNav from '@/components/QuickNav'

// 生成跑腿ID（实际应用中应该从登录系统获取）
const getCourierId = () => {
  let courierId = localStorage.getItem('temp_courier_id')
  if (!courierId) {
    courierId = 'courier_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('temp_courier_id', courierId)
  }
  return courierId
}

export default function CourierCenter() {
  useShareAppMessage(() => ({ title: '接单中心 - 智体云衡' }))
  useShareTimeline(() => ({ title: '接单中心 - 智体云衡' }))

  const [activeTab, setActiveTab] = useState<'pending' | 'my'>('pending')
  const [pendingOrders, setPendingOrders] = useState<DeliveryOrder[]>([])
  const [myOrders, setMyOrders] = useState<DeliveryOrder[]>([])
  const [earnings, setEarnings] = useState<{ total: number; records: any[] }>({ total: 0, records: [] })
  const [loading, setLoading] = useState(true)

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    const courierId = getCourierId()

    if (activeTab === 'pending') {
      // 加载待接单订单
      const orders = await getPendingOrders()
      setPendingOrders(orders)
    } else {
      // 加载我的订单和收入
      const orders = await getCourierOrders(courierId)
      setMyOrders(orders)
      
      const earningsData = await getCourierEarnings(courierId)
      setEarnings(earningsData)
    }

    setLoading(false)
  }, [activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 页面显示时刷新数据
  useDidShow(() => {
    loadData()
  })

  // 接单
  const handleAcceptOrder = async (orderId: string) => {
    const courierId = getCourierId()
    
    showToast({
      title: '接单中...',
      icon: 'loading',
      duration: 10000
    })

    const success = await acceptOrder(orderId, courierId)
    
    if (success) {
      showToast({
        title: '接单成功',
        icon: 'success',
        duration: 2000
      })
      // 刷新列表
      loadData()
    } else {
      showToast({
        title: '接单失败，订单可能已被接',
        icon: 'none',
        duration: 2000
      })
    }
  }

  // 获取订单状态文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
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
      pending: 'text-amber-600',
      accepted: 'text-blue-600',
      delivering: 'text-primary',
      completed: 'text-green-600',
      cancelled: 'text-muted-foreground'
    }
    return colorMap[status] || 'text-foreground'
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 收入统计（仅在我的订单tab显示） */}
          {activeTab === 'my' && (
            <View className="bg-gradient-primary rounded-2xl p-6 mb-4 shadow-lg">
              <View className="flex flex-col items-center space-y-3">
                <View className="i-mdi-cash-multiple text-5xl text-primary-foreground" />
                <Text className="text-xl text-primary-foreground/90">累计收入</Text>
                <Text className="text-5xl font-bold text-primary-foreground">
                  ¥{earnings.total.toFixed(2)}
                </Text>
                <Text className="text-xl text-primary-foreground/80">
                  已完成 {myOrders.filter(o => o.status === 'completed').length} 单
                </Text>
              </View>
            </View>
          )}

          {/* Tab切换 */}
          <View className="bg-card rounded-2xl p-2 mb-4 shadow-lg">
            <View className="flex flex-row gap-2">
              <Button
                className={`flex-1 text-xl font-medium rounded-xl ${
                  activeTab === 'pending'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-foreground'
                }`}
                onClick={() => setActiveTab('pending')}
              >
                <View className="py-3">
                  <Text>待接订单</Text>
                </View>
              </Button>
              <Button
                className={`flex-1 text-xl font-medium rounded-xl ${
                  activeTab === 'my'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-transparent text-foreground'
                }`}
                onClick={() => setActiveTab('my')}
              >
                <View className="py-3">
                  <Text>我的订单</Text>
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
          ) : activeTab === 'pending' ? (
            // 待接订单列表
            pendingOrders.length === 0 ? (
              <View className="bg-card rounded-2xl p-8 flex flex-col items-center">
                <View className="i-mdi-inbox text-6xl text-muted-foreground mb-4" />
                <Text className="text-2xl font-semibold text-foreground mb-2">暂无待接订单</Text>
                <Text className="text-xl text-muted-foreground">请稍后再来看看</Text>
              </View>
            ) : (
              <View className="flex flex-col space-y-3">
                {pendingOrders.map((order) => (
                  <View key={order.id} className="bg-card rounded-2xl p-6 shadow-lg">
                    <View className="flex flex-row items-start justify-between mb-4">
                      <View className="flex flex-col space-y-1">
                        <Text className="text-2xl font-semibold text-foreground">
                          {order.canteen_location}
                        </Text>
                        <Text className="text-xl text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('zh-CN')}
                        </Text>
                      </View>
                      <View className="bg-amber-500/10 px-3 py-1 rounded-lg">
                        <Text className="text-xl font-medium text-amber-600">待接单</Text>
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

                      <View className="flex flex-row items-start">
                        <View className="i-mdi-account text-xl text-primary mr-2 mt-1" />
                        <View className="flex-1">
                          <Text className="text-xl text-foreground">
                            {order.delivery_name} {order.delivery_phone}
                          </Text>
                        </View>
                      </View>

                      {order.notes && (
                        <View className="flex flex-row items-start">
                          <View className="i-mdi-note-text text-xl text-primary mr-2 mt-1" />
                          <View className="flex-1">
                            <Text className="text-xl text-muted-foreground">{order.notes}</Text>
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
                      <Button
                        className="bg-primary text-primary-foreground text-xl font-medium rounded-xl"
                        onClick={() => handleAcceptOrder(order.id)}
                      >
                        <View className="px-8 py-4">
                          <Text>立即接单</Text>
                        </View>
                      </Button>
                    </View>
                  </View>
                ))}
              </View>
            )
          ) : (
            // 我的订单列表
            myOrders.length === 0 ? (
              <View className="bg-card rounded-2xl p-8 flex flex-col items-center">
                <View className="i-mdi-inbox text-6xl text-muted-foreground mb-4" />
                <Text className="text-2xl font-semibold text-foreground mb-2">暂无订单</Text>
                <Text className="text-xl text-muted-foreground">去接单赚取收入吧</Text>
              </View>
            ) : (
              <View className="flex flex-col space-y-3">
                {myOrders.map((order) => (
                  <View key={order.id} className="bg-card rounded-2xl p-6 shadow-lg">
                    <View className="flex flex-row items-start justify-between mb-4">
                      <View className="flex flex-col space-y-1">
                        <Text className="text-2xl font-semibold text-foreground">
                          {order.canteen_location}
                        </Text>
                        <Text className="text-xl text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('zh-CN')}
                        </Text>
                      </View>
                      <View className="bg-primary/10 px-3 py-1 rounded-lg">
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
                    </View>

                    <View className="border-t border-border pt-4 flex flex-row items-center justify-between">
                      <View className="flex flex-col">
                        <Text className="text-xl text-muted-foreground mb-1">配送费</Text>
                        <Text className="text-3xl font-bold text-primary">
                          ¥{order.delivery_fee}
                        </Text>
                      </View>
                      {order.status === 'completed' && (
                        <View className="bg-green-500/10 px-4 py-2 rounded-lg">
                          <Text className="text-xl font-medium text-green-600">
                            已赚 ¥{(order.delivery_fee * 0.8).toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )
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
