import { View, Text, ScrollView, Button, Input, Textarea, Picker } from '@tarojs/components'
import { useState } from 'react'
import { useShareAppMessage, useShareTimeline, showToast, navigateTo } from '@tarojs/taro'
import { createDeliveryOrder } from '@/db/api'
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

// 食堂列表
const canteens = [
  '五味食堂1楼',
  '五味食堂2楼',
  '五味食堂3楼',
  '清真食堂1楼',
  '清真食堂2楼',
  '清真食堂3楼',
  '若邻食堂1楼',
  '若邻食堂2楼'
]

// 配送时间选项
const deliveryTimes = [
  '尽快送达',
  '11:30-12:00',
  '12:00-12:30',
  '12:30-13:00',
  '17:30-18:00',
  '18:00-18:30',
  '18:30-19:00'
]

export default function CourierOrder() {
  useShareAppMessage(() => ({ title: '发布跑腿订单 - 智体云衡' }))
  useShareTimeline(() => ({ title: '发布跑腿订单 - 智体云衡' }))

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [canteenIndex, setCanteenIndex] = useState(0)
  const [dishNames, setDishNames] = useState('')
  const [timeIndex, setTimeIndex] = useState(0)
  const [notes, setNotes] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('3')

  // 提交订单
  const handleSubmit = async () => {
    // 验证必填项
    if (!name.trim()) {
      showToast({ title: '请输入姓名', icon: 'none', duration: 2000 })
      return
    }
    if (!phone.trim()) {
      showToast({ title: '请输入联系方式', icon: 'none', duration: 2000 })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      showToast({ title: '请输入正确的手机号', icon: 'none', duration: 2000 })
      return
    }
    if (!address.trim()) {
      showToast({ title: '请输入配送地址', icon: 'none', duration: 2000 })
      return
    }
    if (!dishNames.trim()) {
      showToast({ title: '请输入需要代购的菜品', icon: 'none', duration: 2000 })
      return
    }
    if (!deliveryFee || Number(deliveryFee) <= 0) {
      showToast({ title: '请输入有效的配送费', icon: 'none', duration: 2000 })
      return
    }

    // 显示加载提示
    showToast({
      title: '创建订单中...',
      icon: 'loading',
      duration: 10000
    })

    // 创建订单
    const userId = getUserId()
    const dishNamesArray = dishNames.split(/[,，、]/).map(d => d.trim()).filter(d => d)
    
    const order = await createDeliveryOrder({
      user_id: userId,
      dish_ids: dishNamesArray.map((_, i) => `dish_${i}`),
      dish_names: dishNamesArray,
      total_price: 0, // 餐费待定
      delivery_fee: Number(deliveryFee),
      delivery_address_id: null as any, // 临时订单不需要地址ID
      delivery_address: address,
      delivery_name: name,
      delivery_phone: phone,
      canteen_location: canteens[canteenIndex],
      notes: notes || `期望送达时间：${deliveryTimes[timeIndex]}`
    })

    if (order) {
      // 订单创建成功，跳转到支付页面
      const orderInfo = {
        name,
        phone,
        address,
        canteen: canteens[canteenIndex],
        dishNames: dishNames,
        deliveryFee: deliveryFee,
        time: deliveryTimes[timeIndex]
      }

      navigateTo({
        url: `/pages/payment/index?orderId=${order.id}&orderInfo=${encodeURIComponent(JSON.stringify(orderInfo))}`
      })
    } else {
      showToast({
        title: '创建订单失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  }

  // 取消
  const handleCancel = () => {
    navigateTo({ url: '/pages/delivery-express/index' })
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 顶部提示 */}
          <View className="bg-primary/10 rounded-2xl p-4 mb-4 border border-primary/20">
            <View className="flex flex-row items-start">
              <View className="i-mdi-information text-2xl text-primary mr-2 mt-1" />
              <View className="flex-1">
                <Text className="text-xl text-foreground font-medium mb-2">温馨提示</Text>
                <Text className="text-xl text-foreground/80 leading-relaxed">
                  填写您的需求，跑腿小哥会帮您购买并送达指定地点
                </Text>
              </View>
            </View>
          </View>

          {/* 用户信息 */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-account text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">用户信息</Text>
            </View>

            <View className="flex flex-col space-y-4">
              {/* 姓名 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground font-medium">
                  姓名 <Text className="text-destructive">*</Text>
                </Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Input
                    className="w-full text-xl text-foreground"
                    placeholder="请输入您的姓名"
                    value={name}
                    onInput={(e) => setName(e.detail.value)}
                  />
                </View>
              </View>

              {/* 联系方式 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground font-medium">
                  联系方式 <Text className="text-destructive">*</Text>
                </Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Input
                    className="w-full text-xl text-foreground"
                    placeholder="请输入手机号"
                    type="number"
                    maxlength={11}
                    value={phone}
                    onInput={(e) => setPhone(e.detail.value)}
                  />
                </View>
              </View>

              {/* 配送地址 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground font-medium">
                  配送地址 <Text className="text-destructive">*</Text>
                </Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Input
                    className="w-full text-xl text-foreground"
                    placeholder="例如：东校区1号宿舍楼301"
                    value={address}
                    onInput={(e) => setAddress(e.detail.value)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 订单信息 */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-clipboard-list text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">订单信息</Text>
            </View>

            <View className="flex flex-col space-y-4">
              {/* 食堂选择 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground font-medium">
                  取餐食堂 <Text className="text-destructive">*</Text>
                </Text>
                <Picker
                  mode="selector"
                  range={canteens}
                  value={canteenIndex}
                  onChange={(e) => setCanteenIndex(Number(e.detail.value))}
                >
                  <View className="bg-input rounded-xl border border-border px-4 py-3 flex flex-row items-center justify-between">
                    <Text className="text-xl text-foreground">{canteens[canteenIndex]}</Text>
                    <View className="i-mdi-chevron-down text-2xl text-muted-foreground" />
                  </View>
                </Picker>
              </View>

              {/* 菜品输入 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground font-medium">
                  需要代购的菜品 <Text className="text-destructive">*</Text>
                </Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Textarea
                    className="w-full text-xl text-foreground"
                    placeholder="请输入菜品名称，多个菜品用逗号分隔&#10;例如：宫保鸡丁，番茄炒蛋，米饭"
                    value={dishNames}
                    onInput={(e) => setDishNames(e.detail.value)}
                    style={{ minHeight: '120px' }}
                  />
                </View>
              </View>

              {/* 期望送达时间 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground font-medium">期望送达时间</Text>
                <Picker
                  mode="selector"
                  range={deliveryTimes}
                  value={timeIndex}
                  onChange={(e) => setTimeIndex(Number(e.detail.value))}
                >
                  <View className="bg-input rounded-xl border border-border px-4 py-3 flex flex-row items-center justify-between">
                    <Text className="text-xl text-foreground">{deliveryTimes[timeIndex]}</Text>
                    <View className="i-mdi-chevron-down text-2xl text-muted-foreground" />
                  </View>
                </Picker>
              </View>

              {/* 配送费 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground font-medium">配送费（元）</Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Input
                    className="w-full text-xl text-foreground"
                    placeholder="建议3-5元"
                    type="digit"
                    value={deliveryFee}
                    onInput={(e) => setDeliveryFee(e.detail.value)}
                  />
                </View>
                <Text className="text-base text-muted-foreground">
                  配送费越高，订单越容易被接单
                </Text>
              </View>

              {/* 备注 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground font-medium">备注信息</Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Textarea
                    className="w-full text-xl text-foreground"
                    placeholder="其他需要说明的信息（选填）"
                    value={notes}
                    onInput={(e) => setNotes(e.detail.value)}
                    style={{ minHeight: '80px' }}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 费用说明 */}
          <View className="bg-card rounded-2xl p-6 mb-4 shadow-lg">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-cash text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">费用说明</Text>
            </View>
            <View className="flex flex-col space-y-3">
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xl text-muted-foreground">餐费</Text>
                <Text className="text-xl text-foreground">实际支付</Text>
              </View>
              <View className="flex flex-row items-center justify-between">
                <Text className="text-xl text-muted-foreground">配送费</Text>
                <Text className="text-2xl font-bold text-primary">¥{deliveryFee || '0'}</Text>
              </View>
              <View className="border-t border-border pt-3">
                <Text className="text-base text-muted-foreground leading-relaxed">
                  跑腿小哥会先帮您购买菜品，送达后您需支付餐费+配送费
                </Text>
              </View>
            </View>
          </View>

          {/* 底部按钮 */}
          <View className="flex flex-row gap-3 mb-4">
            <Button
              className="flex-1 bg-card border-2 border-border text-foreground text-xl font-medium rounded-xl"
              onClick={handleCancel}
            >
              <View className="py-4">
                <Text>取消</Text>
              </View>
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground text-xl font-medium rounded-xl"
              onClick={handleSubmit}
            >
              <View className="py-4">
                <Text>提交订单</Text>
              </View>
            </Button>
          </View>

          {/* 快捷导航 */}
          <QuickNav />
        </View>
      </ScrollView>
    </View>
  )
}
