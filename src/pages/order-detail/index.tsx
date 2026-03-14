import { View, Text, ScrollView, Button } from '@tarojs/components'
import { useState, useCallback, useEffect } from 'react'
import { useShareAppMessage, useShareTimeline, showToast, getCurrentInstance, makePhoneCall } from '@tarojs/taro'
import { supabase } from '@/client/supabase'
import type { DeliveryOrder } from '@/db/types'
import QuickNav from '@/components/QuickNav'

export default function OrderDetail() {
  useShareAppMessage(() => ({ title: '订单详情 - 智体云衡' }))
  useShareTimeline(() => ({ title: '订单详情 - 智体云衡' }))

  const [order, setOrder] = useState<DeliveryOrder | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载订单详情
  const loadOrderDetail = useCallback(async (orderId: string) => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('delivery_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      console.error('获取订单详情失败:', error)
      showToast({ title: '加载失败', icon: 'none', duration: 2000 })
    } else if (data) {
      setOrder(data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    // 获取路由参数
    const instance = getCurrentInstance()
    const params = instance.router?.params
    
    if (params?.orderId) {
      loadOrderDetail(params.orderId)
    }
  }, [loadOrderDetail])

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
      unpaid: 'text-red-600 bg-red-500/10',
      pending: 'text-amber-600 bg-amber-500/10',
      accepted: 'text-blue-600 bg-blue-500/10',
      delivering: 'text-primary bg-primary/10',
      completed: 'text-green-600 bg-green-500/10',
      cancelled: 'text-muted-foreground bg-muted'
    }
    return colorMap[status] || 'text-foreground bg-muted'
  }

  // 获取订单进度
  const getOrderProgress = (status: string) => {
    const progressMap: Record<string, { step: number; text: string; time: string }[]> = {
      unpaid: [
        { step: 1, text: '订单已创建', time: '等待支付' }
      ],
      pending: [
        { step: 1, text: '订单已创建', time: '已完成' },
        { step: 2, text: '支付成功', time: '已完成' },
        { step: 3, text: '等待接单', time: '进行中' }
      ],
      accepted: [
        { step: 1, text: '订单已创建', time: '已完成' },
        { step: 2, text: '支付成功', time: '已完成' },
        { step: 3, text: '跑腿小哥已接单', time: '已完成' },
        { step: 4, text: '正在购买菜品', time: '进行中' }
      ],
      delivering: [
        { step: 1, text: '订单已创建', time: '已完成' },
        { step: 2, text: '支付成功', time: '已完成' },
        { step: 3, text: '跑腿小哥已接单', time: '已完成' },
        { step: 4, text: '菜品已购买', time: '已完成' },
        { step: 5, text: '配送中', time: '预计10分钟送达' }
      ],
      completed: [
        { step: 1, text: '订单已创建', time: '已完成' },
        { step: 2, text: '支付成功', time: '已完成' },
        { step: 3, text: '跑腿小哥已接单', time: '已完成' },
        { step: 4, text: '菜品已购买', time: '已完成' },
        { step: 5, text: '配送完成', time: '已送达' }
      ],
      cancelled: [
        { step: 1, text: '订单已取消', time: '已取消' }
      ]
    }
    return progressMap[status] || []
  }

  // 联系跑腿小哥（模拟）
  const handleCallCourier = () => {
    showToast({
      title: '拨打电话功能需要真实手机号',
      icon: 'none',
      duration: 2000
    })
  }

  if (loading) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center">
        <View className="i-mdi-loading animate-spin text-6xl text-primary mb-4" />
        <Text className="text-xl text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  if (!order) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center px-4">
        <View className="i-mdi-alert-circle text-6xl text-muted-foreground mb-4" />
        <Text className="text-2xl font-semibold text-foreground mb-2">订单不存在</Text>
        <Text className="text-xl text-muted-foreground">请检查订单号是否正确</Text>
      </View>
    )
  }

  const progress = getOrderProgress(order.status)

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 订单状态 */}
          <View className={`rounded-2xl p-6 mb-4 shadow-lg ${getStatusColor(order.status)}`}>
            <View className="flex flex-col items-center space-y-3">
              <View className={`i-mdi-${
                order.status === 'unpaid' ? 'cash-clock' :
                order.status === 'pending' ? 'clock-outline' :
                order.status === 'accepted' ? 'account-check' :
                order.status === 'delivering' ? 'bike-fast' :
                order.status === 'completed' ? 'check-circle' :
                'close-circle'
              } text-6xl`} />
              <Text className="text-3xl font-bold">
                {getStatusText(order.status)}
              </Text>
              {order.status === 'delivering' && (
                <Text className="text-xl">预计10分钟送达</Text>
              )}
            </View>
          </View>

          {/* 订单进度 */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-timeline-text text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">订单进度</Text>
            </View>

            <View className="flex flex-col space-y-4">
              {progress.map((item, index) => (
                <View key={item.step} className="flex flex-row items-start">
                  <View className="flex flex-col items-center mr-4">
                    <View className={`w-8 h-8 rounded-full flex flex-col items-center justify-center ${
                      item.time === '进行中' ? 'bg-primary' :
                      item.time === '已完成' ? 'bg-green-500' :
                      'bg-muted'
                    }`}>
                      {item.time === '已完成' ? (
                        <View className="i-mdi-check text-xl text-primary-foreground" />
                      ) : (
                        <Text className="text-base text-primary-foreground font-bold">
                          {item.step}
                        </Text>
                      )}
                    </View>
                    {index < progress.length - 1 && (
                      <View className="w-0.5 h-12 bg-border mt-2" />
                    )}
                  </View>
                  <View className="flex-1 flex flex-col space-y-1">
                    <Text className="text-xl font-medium text-foreground">{item.text}</Text>
                    <Text className={`text-xl ${
                      item.time === '进行中' ? 'text-primary' :
                      item.time === '已完成' ? 'text-green-600' :
                      'text-muted-foreground'
                    }`}>
                      {item.time}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 配送信息 */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-map-marker text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">配送信息</Text>
            </View>

            <View className="flex flex-col space-y-3">
              <View className="flex flex-row items-start justify-between">
                <Text className="text-xl text-muted-foreground">收货人</Text>
                <Text className="text-xl text-foreground font-medium">{order.delivery_name}</Text>
              </View>
              <View className="flex flex-row items-start justify-between">
                <Text className="text-xl text-muted-foreground">联系方式</Text>
                <Text className="text-xl text-foreground">{order.delivery_phone}</Text>
              </View>
              <View className="flex flex-row items-start justify-between">
                <Text className="text-xl text-muted-foreground">配送地址</Text>
                <Text className="text-xl text-foreground text-right flex-1 ml-4">
                  {order.delivery_address}
                </Text>
              </View>
            </View>
          </View>

          {/* 订单信息 */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-receipt-text text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">订单信息</Text>
            </View>

            <View className="flex flex-col space-y-3">
              <View className="flex flex-row items-start justify-between">
                <Text className="text-xl text-muted-foreground">取餐食堂</Text>
                <Text className="text-xl text-foreground">{order.canteen_location}</Text>
              </View>
              <View className="flex flex-row items-start justify-between">
                <Text className="text-xl text-muted-foreground">菜品</Text>
                <Text className="text-xl text-foreground text-right flex-1 ml-4">
                  {order.dish_names.join('、')}
                </Text>
              </View>
              {order.notes && (
                <View className="flex flex-row items-start justify-between">
                  <Text className="text-xl text-muted-foreground">备注</Text>
                  <Text className="text-xl text-foreground text-right flex-1 ml-4">
                    {order.notes}
                  </Text>
                </View>
              )}
              <View className="border-t border-border pt-3">
                <View className="flex flex-row items-center justify-between mb-2">
                  <Text className="text-xl text-muted-foreground">配送费</Text>
                  <Text className="text-2xl font-bold text-primary">¥{order.delivery_fee}</Text>
                </View>
                <Text className="text-base text-muted-foreground">
                  餐费送达后现场支付
                </Text>
              </View>
            </View>
          </View>

          {/* 联系跑腿小哥 */}
          {order.courier_id && order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button
              className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl mb-4"
              onClick={handleCallCourier}
            >
              <View className="py-4 flex flex-row items-center justify-center">
                <View className="i-mdi-phone text-2xl mr-2" />
                <Text>联系跑腿小哥</Text>
              </View>
            </Button>
          )}

          {/* 快捷导航 */}
          <QuickNav />
        </View>
      </ScrollView>
    </View>
  )
}
