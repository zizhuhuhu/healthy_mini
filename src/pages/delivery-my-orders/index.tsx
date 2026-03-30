import { View, Text, ScrollView, Button } from '@tarojs/components'
import { useState, useCallback } from 'react'
import { useShareAppMessage, useShareTimeline, useDidShow, navigateTo, navigateBack } from '@tarojs/taro'
import { getUserDeliveryExpressOrders } from '@/db/deliveryApi'
import type { DeliveryExpressOrder } from '@/db/types'
import { getCurrentUserId } from '@/utils/user'

// 生成用户ID
// 订单状态配置
const ORDER_STATUS = {
  pending: { name: '待接单', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  accepted: { name: '进行中', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { name: '已完成', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { name: '已取消', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  disputed: { name: '有争议', color: 'text-red-600', bgColor: 'bg-red-100' }
}

export default function DeliveryMyOrders() {
  useShareAppMessage(() => ({ title: '我的订单 - 饮食速递' }))
  useShareTimeline(() => ({ title: '我的订单 - 饮食速递' }))

  const [userId] = useState(() => getCurrentUserId())
  const [activeTab, setActiveTab] = useState<'requested' | 'helped'>('requested')
  const [requestedOrders, setRequestedOrders] = useState<DeliveryExpressOrder[]>([])
  const [helpedOrders, setHelpedOrders] = useState<DeliveryExpressOrder[]>([])
  const [loading, setLoading] = useState(false)

  // 加载订单数据
  const loadOrders = useCallback(async () => {
    if (!userId) {
      setRequestedOrders([])
      setHelpedOrders([])
      return
    }
    setLoading(true)
    try {
      const { requested, helped } = await getUserDeliveryExpressOrders(userId)
      setRequestedOrders(requested)
      setHelpedOrders(helped)
    } catch (error) {
      console.error('加载订单失败:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useDidShow(() => {
    loadOrders()
  })

  // 返回上一页
  const handleGoBack = () => {
    navigateBack()
  }

  // 查看订单详情
  const handleViewOrder = (orderId: string) => {
    navigateTo({ url: `/pages/delivery-order-detail/index?id=${orderId}` })
  }

  // 获取当前显示的订单列表
  const currentOrders = activeTab === 'requested' ? requestedOrders : helpedOrders

  // 按状态分组订单
  const groupedOrders = {
    pending: currentOrders.filter(o => o.status === 'pending'),
    accepted: currentOrders.filter(o => o.status === 'accepted'),
    completed: currentOrders.filter(o => o.status === 'completed'),
    cancelled: currentOrders.filter(o => o.status === 'cancelled')
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 返回按钮 */}
          <View className="mb-4">
            <View
              className="flex flex-row items-center bg-card rounded-2xl px-5 py-4 border border-border active-press"
              onClick={handleGoBack}
            >
              <View className="i-mdi-arrow-left text-2xl text-primary mr-3" />
              <Text className="text-xl font-semibold text-foreground">返回饮食速递</Text>
            </View>
          </View>

          {/* Tab切换 */}
          <View className="flex flex-row items-center bg-card rounded-2xl p-2 mb-6">
            <View
              className={`flex-1 py-3 rounded-xl ${activeTab === 'requested' ? 'bg-primary' : 'bg-transparent'}`}
              onClick={() => setActiveTab('requested')}
            >
              <Text className={`text-center text-xl font-medium ${activeTab === 'requested' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                我发布的
              </Text>
            </View>
            <View
              className={`flex-1 py-3 rounded-xl ${activeTab === 'helped' ? 'bg-primary' : 'bg-transparent'}`}
              onClick={() => setActiveTab('helped')}
            >
              <Text className={`text-center text-xl font-medium ${activeTab === 'helped' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                我帮助的
              </Text>
            </View>
          </View>

          {/* 订单列表 */}
          {loading ? (
            <View className="flex flex-col items-center justify-center py-20">
              <View className="i-mdi-loading animate-spin text-5xl text-primary mb-4" />
              <Text className="text-xl text-muted-foreground">加载中...</Text>
            </View>
          ) : currentOrders.length === 0 ? (
            <View className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl">
              <View className="i-mdi-inbox text-6xl text-muted-foreground mb-4" />
              <Text className="text-2xl font-semibold text-foreground mb-2">暂无订单</Text>
              <Text className="text-xl text-muted-foreground">
                {activeTab === 'requested' ? '去发布需求吧' : '去帮助他人吧'}
              </Text>
            </View>
          ) : (
            <View className="flex flex-col space-y-6">
              {/* 待接单 */}
              {groupedOrders.pending.length > 0 && (
                <View>
                  <View className="flex flex-row items-center mb-3">
                    <View className="w-1 h-6 bg-yellow-600 rounded mr-2" />
                    <Text className="text-2xl font-bold text-foreground">待接单</Text>
                    <Text className="text-xl text-muted-foreground ml-2">({groupedOrders.pending.length})</Text>
                  </View>
                  <View className="flex flex-col space-y-3">
                    {groupedOrders.pending.map((order) => (
                      <View
                        key={order.id}
                        className="bg-card rounded-2xl p-6 border border-border"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <View className="flex flex-row items-start justify-between mb-4">
                          <View className="flex flex-col space-y-2 flex-1">
                            <View className="flex flex-row items-center">
                              <View className="i-mdi-map-marker text-2xl text-primary mr-2" />
                              <Text className="text-xl font-semibold text-foreground">{order.pickup_location}</Text>
                            </View>
                            <View className="flex flex-row items-center">
                              <View className="i-mdi-map-marker-check text-2xl text-green-500 mr-2" />
                              <Text className="text-xl font-semibold text-foreground">{order.delivery_location}</Text>
                            </View>
                          </View>
                          <View className={`px-3 py-1 rounded-full ${ORDER_STATUS[order.status].bgColor}`}>
                            <Text className={`text-lg font-medium ${ORDER_STATUS[order.status].color}`}>
                              {ORDER_STATUS[order.status].name}
                            </Text>
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
                          <View className="flex flex-row items-center">
                            <Text className="text-2xl font-bold text-primary mr-2">¥{order.meal_fee}</Text>
                            {order.tip_credit > 0 && (
                              <View className="flex flex-row items-center bg-yellow-100 px-2 py-1 rounded">
                                <View className="i-mdi-coin text-lg text-yellow-600 mr-1" />
                                <Text className="text-lg font-medium text-yellow-600">+{order.tip_credit}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 进行中 */}
              {groupedOrders.accepted.length > 0 && (
                <View>
                  <View className="flex flex-row items-center mb-3">
                    <View className="w-1 h-6 bg-blue-600 rounded mr-2" />
                    <Text className="text-2xl font-bold text-foreground">进行中</Text>
                    <Text className="text-xl text-muted-foreground ml-2">({groupedOrders.accepted.length})</Text>
                  </View>
                  <View className="flex flex-col space-y-3">
                    {groupedOrders.accepted.map((order) => (
                      <View
                        key={order.id}
                        className="bg-card rounded-2xl p-6 border border-border"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <View className="flex flex-row items-start justify-between mb-4">
                          <View className="flex flex-col space-y-2 flex-1">
                            <View className="flex flex-row items-center">
                              <View className="i-mdi-map-marker text-2xl text-primary mr-2" />
                              <Text className="text-xl font-semibold text-foreground">{order.pickup_location}</Text>
                            </View>
                            <View className="flex flex-row items-center">
                              <View className="i-mdi-map-marker-check text-2xl text-green-500 mr-2" />
                              <Text className="text-xl font-semibold text-foreground">{order.delivery_location}</Text>
                            </View>
                          </View>
                          <View className={`px-3 py-1 rounded-full ${ORDER_STATUS[order.status].bgColor}`}>
                            <Text className={`text-lg font-medium ${ORDER_STATUS[order.status].color}`}>
                              {ORDER_STATUS[order.status].name}
                            </Text>
                          </View>
                        </View>
                        <View className="flex flex-row items-center justify-between pt-4 border-t border-border">
                          <View className="flex flex-col space-y-1">
                            <Text className="text-lg text-muted-foreground">订单号：{order.canteen_order_number}</Text>
                            <Text className="text-lg text-muted-foreground">
                              接单时间：{order.accepted_at ? new Date(order.accepted_at).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </Text>
                          </View>
                          <Button
                            className="bg-primary text-primary-foreground text-xl font-medium rounded-xl px-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewOrder(order.id)
                            }}
                          >
                            <View className="py-3">
                              <Text>查看详情</Text>
                            </View>
                          </Button>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 已完成 */}
              {groupedOrders.completed.length > 0 && (
                <View>
                  <View className="flex flex-row items-center mb-3">
                    <View className="w-1 h-6 bg-green-600 rounded mr-2" />
                    <Text className="text-2xl font-bold text-foreground">已完成</Text>
                    <Text className="text-xl text-muted-foreground ml-2">({groupedOrders.completed.length})</Text>
                  </View>
                  <View className="flex flex-col space-y-3">
                    {groupedOrders.completed.map((order) => (
                      <View
                        key={order.id}
                        className="bg-card rounded-2xl p-6 border border-border"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <View className="flex flex-row items-start justify-between mb-4">
                          <View className="flex flex-col space-y-2 flex-1">
                            <View className="flex flex-row items-center">
                              <View className="i-mdi-map-marker text-2xl text-primary mr-2" />
                              <Text className="text-xl font-semibold text-foreground">{order.pickup_location}</Text>
                            </View>
                            <View className="flex flex-row items-center">
                              <View className="i-mdi-map-marker-check text-2xl text-green-500 mr-2" />
                              <Text className="text-xl font-semibold text-foreground">{order.delivery_location}</Text>
                            </View>
                          </View>
                          <View className={`px-3 py-1 rounded-full ${ORDER_STATUS[order.status].bgColor}`}>
                            <Text className={`text-lg font-medium ${ORDER_STATUS[order.status].color}`}>
                              {ORDER_STATUS[order.status].name}
                            </Text>
                          </View>
                        </View>
                        <View className="flex flex-row items-center justify-between pt-4 border-t border-border">
                          <View className="flex flex-col space-y-1">
                            <Text className="text-lg text-muted-foreground">订单号：{order.canteen_order_number}</Text>
                            <Text className="text-lg text-muted-foreground">
                              完成时间：{order.completed_at ? new Date(order.completed_at).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </Text>
                          </View>
                          <Text className="text-2xl font-bold text-green-600">¥{order.meal_fee}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 已取消 */}
              {groupedOrders.cancelled.length > 0 && (
                <View>
                  <View className="flex flex-row items-center mb-3">
                    <View className="w-1 h-6 bg-gray-600 rounded mr-2" />
                    <Text className="text-2xl font-bold text-foreground">已取消</Text>
                    <Text className="text-xl text-muted-foreground ml-2">({groupedOrders.cancelled.length})</Text>
                  </View>
                  <View className="flex flex-col space-y-3">
                    {groupedOrders.cancelled.map((order) => (
                      <View
                        key={order.id}
                        className="bg-card rounded-2xl p-6 border border-border opacity-60"
                        onClick={() => handleViewOrder(order.id)}
                      >
                        <View className="flex flex-row items-start justify-between mb-4">
                          <View className="flex flex-col space-y-2 flex-1">
                            <View className="flex flex-row items-center">
                              <View className="i-mdi-map-marker text-2xl text-muted-foreground mr-2" />
                              <Text className="text-xl font-semibold text-muted-foreground">{order.pickup_location}</Text>
                            </View>
                            <View className="flex flex-row items-center">
                              <View className="i-mdi-map-marker-check text-2xl text-muted-foreground mr-2" />
                              <Text className="text-xl font-semibold text-muted-foreground">{order.delivery_location}</Text>
                            </View>
                          </View>
                          <View className={`px-3 py-1 rounded-full ${ORDER_STATUS[order.status].bgColor}`}>
                            <Text className={`text-lg font-medium ${ORDER_STATUS[order.status].color}`}>
                              {ORDER_STATUS[order.status].name}
                            </Text>
                          </View>
                        </View>
                        <View className="flex flex-row items-center justify-between pt-4 border-t border-border">
                          <View className="flex flex-col space-y-1">
                            <Text className="text-lg text-muted-foreground">订单号：{order.canteen_order_number}</Text>
                            <Text className="text-lg text-muted-foreground">
                              取消时间：{order.cancelled_at ? new Date(order.cancelled_at).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
