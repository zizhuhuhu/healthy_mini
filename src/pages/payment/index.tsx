import { View, Text, ScrollView, Button } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useShareAppMessage, useShareTimeline, showToast, showModal, redirectTo, getCurrentInstance, getEnv } from '@tarojs/taro'
import { updateOrderStatus } from '@/db/api'
import { supabase } from '@/client/supabase'

// 声明百度小程序API
declare const swan: {
  requestPolymerPayment: (options: {
    orderInfo: any
    success?: (res: any) => void
    fail?: (err: any) => void
    complete?: () => void
  }) => void
}

export default function Payment() {
  useShareAppMessage(() => ({ title: '订单支付 - 智体云衡' }))
  useShareTimeline(() => ({ title: '订单支付 - 智体云衡' }))

  const [orderId, setOrderId] = useState('')
  const [orderInfo, setOrderInfo] = useState<any>(null)
  const [paying, setPaying] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | 'baidu'>('wechat')

  useEffect(() => {
    // 获取路由参数
    const instance = getCurrentInstance()
    const params = instance.router?.params
    
    if (params?.orderId) {
      setOrderId(params.orderId)
      // 解析订单信息
      if (params.orderInfo) {
        try {
          const info = JSON.parse(decodeURIComponent(params.orderInfo))
          setOrderInfo(info)
        } catch (e) {
          console.error('解析订单信息失败:', e)
        }
      }
    }
  }, [])

  // 支付
  const handlePay = async () => {
    // 显示支付方式选择
    const paymentNames = {
      wechat: '微信支付',
      alipay: '支付宝',
      baidu: '百度钱包'
    }

    showModal({
      title: '确认支付',
      content: `使用${paymentNames[paymentMethod]}支付 ¥${orderInfo.deliveryFee}？`,
      success: async (res) => {
        if (res.confirm) {
          setPaying(true)

          try {
            // 检查运行环境
            const env = getEnv()
            
            if (env !== 'SWAN') {
              // 非百度小程序环境，提示用户
              showToast({
                title: '请在百度小程序中使用支付功能',
                icon: 'none',
                duration: 3000
              })
              setPaying(false)
              return
            }

            // 调用Edge Function获取支付参数
            console.log('调用支付接口，订单ID:', orderId)
            
            const { data, error } = await supabase.functions.invoke('baidu-payment', {
              body: {
                orderId: orderId,
                amount: orderInfo.deliveryFee,
                orderInfo: {
                  canteen: orderInfo.canteen,
                  dishNames: orderInfo.dishNames,
                  address: orderInfo.address
                }
              }
            })

            if (error) {
              console.error('获取支付参数失败:', error)
              throw error
            }

            console.log('支付参数获取成功:', data)

            if (!data.success) {
              throw new Error(data.error || '获取支付参数失败')
            }

            // 调起百度收银台
            swan.requestPolymerPayment({
              orderInfo: data.data.orderInfo,
              success: async (payRes) => {
                console.log('支付成功:', payRes)
                
                // 更新订单状态为待接单
                const success = await updateOrderStatus(orderId, 'pending')
                if (success) {
                  showToast({
                    title: '支付成功',
                    icon: 'success',
                    duration: 2000
                  })

                  // 延迟跳转
                  setTimeout(() => {
                    redirectTo({ url: '/pages/order-detail/index?orderId=' + orderId })
                  }, 2000)
                } else {
                  showToast({
                    title: '订单状态更新失败',
                    icon: 'none',
                    duration: 2000
                  })
                  setPaying(false)
                }
              },
              fail: (err) => {
                console.error('支付失败:', err)
                showToast({
                  title: err.errMsg || '支付失败',
                  icon: 'none',
                  duration: 2000
                })
                setPaying(false)
              },
              complete: () => {
                console.log('支付流程完成')
              }
            })
          } catch (error: any) {
            console.error('支付异常:', error)
            
            // 显示详细错误信息
            let errorMsg = '支付失败'
            if (error.message) {
              errorMsg = error.message
            } else if (error.error) {
              errorMsg = error.error
            }
            
            // 如果是配置错误，给出提示
            if (errorMsg.includes('配置')) {
              errorMsg = '支付功能未配置，请联系管理员在Supabase后台配置支付密钥'
            }
            
            showToast({
              title: errorMsg,
              icon: 'none',
              duration: 3000
            })
            setPaying(false)
          }
        }
      }
    })
  }

  if (!orderInfo) {
    return (
      <View className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center">
        <View className="i-mdi-loading animate-spin text-6xl text-primary mb-4" />
        <Text className="text-xl text-muted-foreground">加载中...</Text>
      </View>
    )
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 支付金额 */}
          <View className="bg-card rounded-2xl p-8 mb-4 shadow-lg">
            <View className="flex flex-col items-center space-y-4">
              <View className="i-mdi-cash-multiple text-6xl text-primary" />
              <Text className="text-xl text-muted-foreground">支付金额</Text>
              <Text className="text-5xl font-bold text-primary">¥{orderInfo.deliveryFee}</Text>
              <Text className="text-base text-muted-foreground">
                （配送费，餐费送达后支付）
              </Text>
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
                <Text className="text-xl text-muted-foreground">收货人</Text>
                <Text className="text-xl text-foreground font-medium">{orderInfo.name}</Text>
              </View>
              <View className="flex flex-row items-start justify-between">
                <Text className="text-xl text-muted-foreground">联系方式</Text>
                <Text className="text-xl text-foreground">{orderInfo.phone}</Text>
              </View>
              <View className="flex flex-row items-start justify-between">
                <Text className="text-xl text-muted-foreground">配送地址</Text>
                <Text className="text-xl text-foreground text-right flex-1 ml-4">
                  {orderInfo.address}
                </Text>
              </View>
              <View className="border-t border-border pt-3">
                <View className="flex flex-row items-start justify-between mb-2">
                  <Text className="text-xl text-muted-foreground">取餐食堂</Text>
                  <Text className="text-xl text-foreground">{orderInfo.canteen}</Text>
                </View>
                <View className="flex flex-row items-start justify-between">
                  <Text className="text-xl text-muted-foreground">菜品</Text>
                  <Text className="text-xl text-foreground text-right flex-1 ml-4">
                    {orderInfo.dishNames}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 支付方式 */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-credit-card text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">支付方式</Text>
            </View>

            <View className="flex flex-col space-y-3">
              {/* 微信支付 */}
              <View
                className={`rounded-xl p-4 border-2 ${
                  paymentMethod === 'wechat'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-input border-border'
                }`}
                onClick={() => setPaymentMethod('wechat')}
              >
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-wechat text-3xl text-green-600 mr-3" />
                    <Text className="text-xl text-foreground font-medium">微信支付</Text>
                  </View>
                  {paymentMethod === 'wechat' && (
                    <View className="i-mdi-check-circle text-2xl text-primary" />
                  )}
                </View>
              </View>

              {/* 支付宝 */}
              <View
                className={`rounded-xl p-4 border-2 ${
                  paymentMethod === 'alipay'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-input border-border'
                }`}
                onClick={() => setPaymentMethod('alipay')}
              >
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-alpha-a-circle text-3xl text-blue-600 mr-3" />
                    <Text className="text-xl text-foreground font-medium">支付宝</Text>
                  </View>
                  {paymentMethod === 'alipay' && (
                    <View className="i-mdi-check-circle text-2xl text-primary" />
                  )}
                </View>
              </View>

              {/* 百度钱包 */}
              <View
                className={`rounded-xl p-4 border-2 ${
                  paymentMethod === 'baidu'
                    ? 'bg-primary/10 border-primary'
                    : 'bg-input border-border'
                }`}
                onClick={() => setPaymentMethod('baidu')}
              >
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-alpha-b-circle text-3xl text-blue-500 mr-3" />
                    <Text className="text-xl text-foreground font-medium">百度钱包</Text>
                  </View>
                  {paymentMethod === 'baidu' && (
                    <View className="i-mdi-check-circle text-2xl text-primary" />
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* 温馨提示 */}
          <View className="bg-primary/10 rounded-2xl p-4 mb-4 border border-primary/20">
            <View className="flex flex-row items-start">
              <View className="i-mdi-information text-2xl text-primary mr-2 mt-1" />
              <View className="flex-1">
                <Text className="text-xl text-foreground font-medium mb-2">温馨提示</Text>
                <Text className="text-xl text-foreground/80 leading-relaxed">
                  支付配送费后，跑腿小哥会帮您购买菜品并送达。餐费在送达后现场支付给跑腿小哥。
                </Text>
              </View>
            </View>
          </View>

          {/* 支付按钮 */}
          <Button
            className="w-full bg-primary text-primary-foreground text-2xl font-bold rounded-xl mb-4"
            onClick={handlePay}
            disabled={paying}
          >
            <View className="py-5 flex flex-row items-center justify-center">
              {paying ? (
                <>
                  <View className="i-mdi-loading animate-spin text-3xl mr-2" />
                  <Text>支付中...</Text>
                </>
              ) : (
                <>
                  <View className="i-mdi-check-circle text-3xl mr-2" />
                  <Text>确认支付 ¥{orderInfo.deliveryFee}</Text>
                </>
              )}
            </View>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
