import { View, Text, ScrollView, Input, Button, Picker } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useDidShow, navigateBack, navigateTo } from '@tarojs/taro'
import { createDeliveryExpressOrder, getOrCreateDeliveryUser } from '@/db/deliveryApi'
import { getCurrentUserId } from '@/utils/user'

// 生成用户ID
// 常用取餐地点
const PICKUP_LOCATIONS = [
  '五味食堂1楼',
  '五味食堂2楼',
  '五味食堂3楼',
  '清真食堂1楼',
  '清真食堂2楼',
  '若邻食堂1楼',
  '若邻食堂2楼',
  '校门外奶茶店',
  '校门外便利店',
  '其他'
]

// 常用送达地点
const DELIVERY_LOCATIONS = [
  '1号宿舍楼',
  '2号宿舍楼',
  '3号宿舍楼',
  '4号宿舍楼',
  '5号宿舍楼',
  '6号宿舍楼',
  '教学楼',
  '图书馆',
  '其他'
]

export default function DeliveryPublish() {
  useShareAppMessage(() => ({ title: '发布需求 - 饮食速递' }))
  useShareTimeline(() => ({ title: '发布需求 - 饮食速递' }))

  const [userId] = useState(() => getCurrentUserId())
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupLocationIndex, setPickupLocationIndex] = useState(0)
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [deliveryLocationIndex, setDeliveryLocationIndex] = useState(0)
  const [canteenOrderNumber, setCanteenOrderNumber] = useState('')
  const [mealFee, setMealFee] = useState('')
  const [tipCredit, setTipCredit] = useState(0)
  const [notes, setNotes] = useState('')
  const [requesterPhone, setRequesterPhone] = useState('')
  const [requesterWechat, setRequesterWechat] = useState('')
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  // 加载用户信息
  useDidShow(async () => {
    if (!userId) {
      return
    }
    const user = await getOrCreateDeliveryUser(userId)
    setUserInfo(user)
    
    // 如果已认证，自动填充手机号和微信号
    if (user && user.verification_status === 'approved') {
      if (user.phone_number) setRequesterPhone(user.phone_number)
      if (user.wechat_id) setRequesterWechat(user.wechat_id)
    }
  })

  // 选择取餐地点
  const handlePickupLocationChange = (e: any) => {
    const index = e.detail.value
    setPickupLocationIndex(index)
    setPickupLocation(PICKUP_LOCATIONS[index])
  }

  // 选择送达地点
  const handleDeliveryLocationChange = (e: any) => {
    const index = e.detail.value
    setDeliveryLocationIndex(index)
    setDeliveryLocation(DELIVERY_LOCATIONS[index])
  }

  // 发布需求
  const handlePublish = async () => {
    if (!userId) {
      Taro.showToast({ title: '请先登录后再发布', icon: 'none' })
      return
    }
    // 验证表单
    if (!pickupLocation) {
      Taro.showToast({ title: '请选择取餐地点', icon: 'none' })
      return
    }
    if (!deliveryLocation) {
      Taro.showToast({ title: '请选择送达地点', icon: 'none' })
      return
    }
    if (!canteenOrderNumber.trim()) {
      Taro.showToast({ title: '请输入取餐码/订单号', icon: 'none' })
      return
    }
    if (!mealFee || Number(mealFee) <= 0) {
      Taro.showToast({ title: '请输入正确的餐费', icon: 'none' })
      return
    }
    if (!requesterPhone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(requesterPhone.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      // 创建订单
      const result = await createDeliveryExpressOrder({
        userId,
        pickupLocation,
        deliveryLocation,
        canteenOrderNumber: canteenOrderNumber.trim(),
        mealFee: Number(mealFee),
        tipCredit,
        notes: notes.trim() || undefined,
        requesterPhone: requesterPhone.trim(),
        requesterWechat: requesterWechat.trim() || undefined
      })

      if (result.success) {
        Taro.showToast({
          title: result.message,
          icon: 'success',
          duration: 2000
        })
        setTimeout(() => {
          navigateBack()
        }, 2000)
      } else {
        Taro.showToast({
          title: result.message,
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('发布需求失败:', error)
      Taro.showToast({ title: '发布失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 返回上一页
  const handleGoBack = () => {
    navigateBack()
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

          {/* 提示卡片 */}
          {userInfo && userInfo.verification_status === 'approved' && (
            <View className="bg-primary/10 rounded-2xl p-5 mb-6 border border-primary/20">
              <View className="flex flex-row items-start">
                <View className="i-mdi-information text-2xl text-primary mr-3 mt-1" />
                <View className="flex-1 flex flex-col space-y-2">
                  <Text className="text-xl font-semibold text-primary">发布需求说明</Text>
                  <Text className="text-lg text-foreground leading-relaxed">
                    发布需求将冻结1点信用{tipCredit > 0 && `+${tipCredit}点小费`}，完成后转给帮助者
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 表单 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            {/* 取餐地点 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-map-marker text-2xl text-primary mr-2" />
                <Text className="text-xl font-semibold text-foreground">取餐地点</Text>
                <Text className="text-lg text-red-500 ml-1">*</Text>
              </View>
              <Picker
                mode="selector"
                range={PICKUP_LOCATIONS}
                value={pickupLocationIndex}
                onChange={handlePickupLocationChange}
              >
                <View className="bg-input rounded-xl border border-border px-4 py-4">
                  <Text className={`text-xl ${pickupLocation ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {pickupLocation || '请选择取餐地点'}
                  </Text>
                </View>
              </Picker>
              <Text className="text-lg text-muted-foreground mt-2">
                如：XX食堂X窗口、校门外XX奶茶店
              </Text>
            </View>

            {/* 送达地点 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-map-marker-check text-2xl text-green-500 mr-2" />
                <Text className="text-xl font-semibold text-foreground">送达地点</Text>
                <Text className="text-lg text-red-500 ml-1">*</Text>
              </View>
              <Picker
                mode="selector"
                range={DELIVERY_LOCATIONS}
                value={deliveryLocationIndex}
                onChange={handleDeliveryLocationChange}
              >
                <View className="bg-input rounded-xl border border-border px-4 py-4">
                  <Text className={`text-xl ${deliveryLocation ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {deliveryLocation || '请选择送达地点'}
                  </Text>
                </View>
              </Picker>
              <Text className="text-lg text-muted-foreground mt-2">
                宿舍楼栋+楼层，具体房号接单后私聊
              </Text>
            </View>

            {/* 取餐码/订单号 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-barcode text-2xl text-primary mr-2" />
                <Text className="text-xl font-semibold text-foreground">取餐码/订单号</Text>
                <Text className="text-lg text-red-500 ml-1">*</Text>
              </View>
              <View className="bg-input rounded-xl border border-border px-4 py-2">
                <Input
                  className="w-full text-xl text-foreground"
                  placeholder="请输入取餐码或订单号"
                  value={canteenOrderNumber}
                  onInput={(e) => setCanteenOrderNumber(e.detail.value)}
                />
              </View>
            </View>

            {/* 餐费 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-currency-cny text-2xl text-primary mr-2" />
                <Text className="text-xl font-semibold text-foreground">餐费</Text>
                <Text className="text-lg text-red-500 ml-1">*</Text>
              </View>
              <View className="bg-input rounded-xl border border-border px-4 py-2">
                <Input
                  className="w-full text-xl text-foreground"
                  placeholder="请输入餐费金额"
                  type="digit"
                  value={mealFee}
                  onInput={(e) => setMealFee(e.detail.value)}
                />
              </View>
              <Text className="text-lg text-muted-foreground mt-2">
                帮助者送达后，您需支付此金额
              </Text>
            </View>

            {/* 小费信用 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-coin text-2xl text-yellow-600 mr-2" />
                <Text className="text-xl font-semibold text-foreground">小费信用（可选）</Text>
              </View>
              <View className="flex flex-row items-center space-x-3">
                <View
                  className={`flex-1 py-4 rounded-xl border-2 ${tipCredit === 0 ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}
                  onClick={() => setTipCredit(0)}
                >
                  <Text className={`text-center text-xl font-medium ${tipCredit === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    无小费
                  </Text>
                </View>
                <View
                  className={`flex-1 py-4 rounded-xl border-2 ${tipCredit === 1 ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}
                  onClick={() => setTipCredit(1)}
                >
                  <Text className={`text-center text-xl font-medium ${tipCredit === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                    +1信用
                  </Text>
                </View>
                <View
                  className={`flex-1 py-4 rounded-xl border-2 ${tipCredit === 2 ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}
                  onClick={() => setTipCredit(2)}
                >
                  <Text className={`text-center text-xl font-medium ${tipCredit === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                    +2信用
                  </Text>
                </View>
              </View>
              <Text className="text-lg text-muted-foreground mt-2">
                紧急或重量大的订单，可额外加信用吸引更快接单
              </Text>
            </View>

            {/* 备注 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-note-text text-2xl text-primary mr-2" />
                <Text className="text-xl font-semibold text-foreground">备注（可选）</Text>
              </View>
              <View className="bg-input rounded-xl border border-border px-4 py-2">
                <Input
                  className="w-full text-xl text-foreground"
                  placeholder="如：需要餐具、不要辣椒等"
                  value={notes}
                  onInput={(e) => setNotes(e.detail.value)}
                />
              </View>
            </View>

            {/* 手机号 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-phone text-2xl text-primary mr-2" />
                <Text className="text-xl font-semibold text-foreground">手机号</Text>
                <Text className="text-lg text-red-500 ml-1">*</Text>
              </View>
              <View className="bg-input rounded-xl border border-border px-4 py-2">
                <Input
                  className="w-full text-xl text-foreground"
                  placeholder="请输入手机号"
                  type="number"
                  maxlength={11}
                  value={requesterPhone}
                  onInput={(e) => setRequesterPhone(e.detail.value)}
                />
              </View>
              <Text className="text-lg text-muted-foreground mt-2">
                接单后帮助者可联系您，用于确认金额和交易
              </Text>
            </View>

            {/* 微信号 */}
            <View>
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-wechat text-2xl text-green-500 mr-2" />
                <Text className="text-xl font-semibold text-foreground">微信号（可选）</Text>
              </View>
              <View className="bg-input rounded-xl border border-border px-4 py-2">
                <Input
                  className="w-full text-xl text-foreground"
                  placeholder="请输入微信号"
                  value={requesterWechat}
                  onInput={(e) => setRequesterWechat(e.detail.value)}
                />
              </View>
              <Text className="text-lg text-muted-foreground mt-2">
                方便帮助者通过微信联系您
              </Text>
            </View>
          </View>

          {/* 安全声明 */}
          <View className="bg-yellow-50 rounded-2xl p-5 mb-6 border border-yellow-200">
            <View className="flex flex-row items-start">
              <View className="i-mdi-shield-alert text-2xl text-yellow-600 mr-3 mt-1" />
              <View className="flex-1 flex flex-col space-y-2">
                <Text className="text-xl font-semibold text-yellow-600">安全提示</Text>
                <Text className="text-lg text-foreground leading-relaxed">
                  • 金额往来请私下联系确认后交易
                </Text>
                <Text className="text-lg text-foreground leading-relaxed">
                  • 若出现诈骗将被判为失信，严重者依法处置
                </Text>
                <Text className="text-lg text-foreground leading-relaxed">
                  • 平台已对所有用户进行实名校园认证
                </Text>
              </View>
            </View>
          </View>

          {/* 费用明细 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            <Text className="text-2xl font-bold text-foreground mb-4">费用明细</Text>
            <View className="flex flex-col space-y-3">
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xl text-muted-foreground">基础信用</Text>
                <Text className="text-xl font-semibold text-foreground">1点</Text>
              </View>
              {tipCredit > 0 && (
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-xl text-muted-foreground">小费信用</Text>
                  <Text className="text-xl font-semibold text-yellow-600">+{tipCredit}点</Text>
                </View>
              )}
              <View className="flex flex-row items-center justify-between pt-3 border-t border-border">
                <Text className="text-2xl font-bold text-foreground">需冻结信用</Text>
                <Text className="text-2xl font-bold text-primary">{1 + tipCredit}点</Text>
              </View>
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xl text-muted-foreground">餐费（送达后支付）</Text>
                <Text className="text-xl font-semibold text-foreground">¥{mealFee || '0'}</Text>
              </View>
            </View>
          </View>

          {/* 发布按钮 */}
          <Button
            className="w-full bg-primary text-primary-foreground text-2xl font-bold rounded-xl mb-4"
            onClick={handlePublish}
            disabled={loading}
          >
            <View className="py-5">
              <Text>{loading ? '发布中...' : '发布需求'}</Text>
            </View>
          </Button>

          {/* 免责声明 */}
          <View className="bg-muted rounded-2xl p-5">
            <Text className="text-lg text-muted-foreground leading-relaxed">
              温馨提示：平台为纯公益互助服务，不承担食品本身质量责任。帮助者有义务妥善取送，重大过失将导致信用分大幅降低。发布需求即表示您已阅读并同意相关规则。
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
