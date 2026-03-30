import { View, Text, ScrollView, Button } from '@tarojs/components'
import { useState, useCallback } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useDidShow, navigateBack, getCurrentInstance } from '@tarojs/taro'
import { confirmDeliveryExpressOrder } from '@/db/deliveryApi'
import { supabase } from '@/client/supabase'
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

export default function DeliveryOrderDetail() {
  useShareAppMessage(() => ({ title: '订单详情 - 饮食速递' }))
  useShareTimeline(() => ({ title: '订单详情 - 饮食速递' }))

  const instance = getCurrentInstance()
  const orderId = instance.router?.params?.id || ''
  const [userId] = useState(() => getCurrentUserId())
  const [order, setOrder] = useState<DeliveryExpressOrder | null>(null)
  const [loading, setLoading] = useState(false)

  // 加载订单详情
  const loadOrderDetail = useCallback(async () => {
    if (!orderId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('delivery_orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle()

      if (error) {
        console.error('加载订单详情失败:', error)
        Taro.showToast({ title: '加载失败', icon: 'none' })
        return
      }

      setOrder(data)
    } catch (error) {
      console.error('加载订单详情失败:', error)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useDidShow(() => {
    loadOrderDetail()
  })

  // 返回上一页
  const handleGoBack = () => {
    navigateBack()
  }

  // 确认完成
  const handleConfirm = async () => {
    if (!order) return
    if (!userId) {
      Taro.showToast({ title: '请先登录后再操作', icon: 'none' })
      return
    }

    const role = order.requester_id === userId ? 'requester' : 'helper'
    const result = await confirmDeliveryExpressOrder(order.id, userId, role)
    
    Taro.showToast({
      title: result.message,
      icon: result.success ? 'success' : 'none'
    })

    if (result.success) {
      loadOrderDetail()
    }
  }

  // 取消订单
  const handleCancel = async () => {
    if (!order) return

    Taro.showModal({
      title: '确认取消',
      content: '取消订单后将解冻信用分，确定要取消吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 更新订单状态为已取消
            await supabase
              .from('delivery_orders')
              .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
              })
              .eq('id', order.id)

            // 退还信用分
            const { data: user } = await supabase
              .from('delivery_users')
              .select('credit_score')
              .eq('user_id', order.requester_id)
              .maybeSingle()

            if (user) {
              await supabase
                .from('delivery_users')
                .update({
                  credit_score: user.credit_score + 1 + order.tip_credit,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', order.requester_id)
            }

            Taro.showToast({ title: '订单已取消', icon: 'success' })
            loadOrderDetail()
          } catch (error) {
            console.error('取消订单失败:', error)
            Taro.showToast({ title: '取消失败', icon: 'none' })
          }
        }
      }
    })
  }

  if (loading || !order) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center">
        <View className="i-mdi-loading animate-spin text-5xl text-primary mb-4" />
        <Text className="text-xl text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  const isRequester = order.requester_id === userId
  const statusConfig = ORDER_STATUS[order.status]

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
              <Text className="text-xl font-semibold text-foreground">返回订单列表</Text>
            </View>
          </View>

          {/* 订单状态 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            <View className="flex flex-row items-center justify-between mb-4">
              <Text className="text-2xl font-bold text-foreground">订单状态</Text>
              <View className={`px-4 py-2 rounded-full ${statusConfig.bgColor}`}>
                <Text className={`text-xl font-bold ${statusConfig.color}`}>
                  {statusConfig.name}
                </Text>
              </View>
            </View>
            <View className="flex flex-col space-y-2">
              <Text className="text-lg text-muted-foreground">
                订单号：{order.order_number}
              </Text>
              <Text className="text-lg text-muted-foreground">
                创建时间：{new Date(order.created_at).toLocaleString('zh-CN')}
              </Text>
              {order.accepted_at && (
                <Text className="text-lg text-muted-foreground">
                  接单时间：{new Date(order.accepted_at).toLocaleString('zh-CN')}
                </Text>
              )}
              {order.completed_at && (
                <Text className="text-lg text-muted-foreground">
                  完成时间：{new Date(order.completed_at).toLocaleString('zh-CN')}
                </Text>
              )}
            </View>
          </View>

          {/* 配送信息 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            <Text className="text-2xl font-bold text-foreground mb-4">配送信息</Text>
            <View className="flex flex-col space-y-4">
              <View className="flex flex-row items-start">
                <View className="i-mdi-map-marker text-2xl text-primary mr-3 mt-1" />
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-lg text-muted-foreground">取餐地点</Text>
                  <Text className="text-xl font-semibold text-foreground">{order.pickup_location}</Text>
                </View>
              </View>
              <View className="flex flex-row items-start">
                <View className="i-mdi-map-marker-check text-2xl text-green-500 mr-3 mt-1" />
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-lg text-muted-foreground">送达地点</Text>
                  <Text className="text-xl font-semibold text-foreground">{order.delivery_location}</Text>
                </View>
              </View>
              <View className="flex flex-row items-start">
                <View className="i-mdi-barcode text-2xl text-primary mr-3 mt-1" />
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-lg text-muted-foreground">取餐码</Text>
                  <Text className="text-xl font-semibold text-foreground">{order.canteen_order_number}</Text>
                </View>
              </View>
              {order.notes && (
                <View className="flex flex-row items-start">
                  <View className="i-mdi-note-text text-2xl text-primary mr-3 mt-1" />
                  <View className="flex-1 flex flex-col space-y-1">
                    <Text className="text-lg text-muted-foreground">备注</Text>
                    <Text className="text-xl font-semibold text-foreground">{order.notes}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 费用信息 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            <Text className="text-2xl font-bold text-foreground mb-4">费用信息</Text>
            <View className="flex flex-col space-y-3">
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xl text-muted-foreground">餐费</Text>
                <Text className="text-xl font-semibold text-foreground">¥{order.meal_fee}</Text>
              </View>
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xl text-muted-foreground">基础信用</Text>
                <Text className="text-xl font-semibold text-foreground">1点</Text>
              </View>
              {order.tip_credit > 0 && (
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-xl text-muted-foreground">小费信用</Text>
                  <Text className="text-xl font-semibold text-yellow-600">+{order.tip_credit}点</Text>
                </View>
              )}
              <View className="flex flex-row items-center justify-between pt-3 border-t border-border">
                <Text className="text-2xl font-bold text-foreground">总计信用</Text>
                <Text className="text-2xl font-bold text-primary">{1 + order.tip_credit}点</Text>
              </View>
            </View>
          </View>

          {/* 确认状态 */}
          {order.status === 'accepted' && (
            <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
              <Text className="text-2xl font-bold text-foreground mb-4">确认状态</Text>
              <View className="flex flex-col space-y-3">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-xl text-muted-foreground">求助者确认</Text>
                  <View className="flex flex-row items-center">
                    {order.requester_confirmed ? (
                      <>
                        <View className="i-mdi-check-circle text-2xl text-green-500 mr-2" />
                        <Text className="text-xl font-semibold text-green-600">已确认</Text>
                      </>
                    ) : (
                      <>
                        <View className="i-mdi-clock-outline text-2xl text-yellow-600 mr-2" />
                        <Text className="text-xl font-semibold text-yellow-600">待确认</Text>
                      </>
                    )}
                  </View>
                </View>
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-xl text-muted-foreground">帮助者确认</Text>
                  <View className="flex flex-row items-center">
                    {order.helper_confirmed ? (
                      <>
                        <View className="i-mdi-check-circle text-2xl text-green-500 mr-2" />
                        <Text className="text-xl font-semibold text-green-600">已确认</Text>
                      </>
                    ) : (
                      <>
                        <View className="i-mdi-clock-outline text-2xl text-yellow-600 mr-2" />
                        <Text className="text-xl font-semibold text-yellow-600">待确认</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 操作按钮 */}
          {order.status === 'pending' && isRequester && (
            <Button
              className="w-full bg-destructive text-destructive-foreground text-2xl font-bold rounded-xl mb-4"
              onClick={handleCancel}
            >
              <View className="py-5">
                <Text>取消订单</Text>
              </View>
            </Button>
          )}

          {order.status === 'accepted' && (
            <Button
              className="w-full bg-primary text-primary-foreground text-2xl font-bold rounded-xl mb-4"
              onClick={handleConfirm}
            >
              <View className="py-5">
                <Text>
                  {isRequester
                    ? order.requester_confirmed ? '已确认收货' : '确认收货'
                    : order.helper_confirmed ? '已确认送达' : '确认送达'}
                </Text>
              </View>
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
