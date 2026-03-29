import { View, Text, ScrollView, Input, Button } from '@tarojs/components'
import { useState } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useDidShow, navigateBack } from '@tarojs/taro'
import { getOrCreateDeliveryUser, submitVerification } from '@/db/deliveryApi'
import type { DeliveryUser } from '@/db/types'

// 生成用户ID
const getUserId = () => {
  let userId = Taro.getStorageSync('temp_user_id')
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    Taro.setStorageSync('temp_user_id', userId)
  }
  return userId
}

export default function DeliveryVerification() {
  useShareAppMessage(() => ({ title: '实名校园认证 - 饮食速递' }))
  useShareTimeline(() => ({ title: '实名校园认证 - 饮食速递' }))

  const [userId] = useState(() => getUserId())
  const [userInfo, setUserInfo] = useState<DeliveryUser | null>(null)
  const [realName, setRealName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [className, setClassName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [wechatId, setWechatId] = useState('')
  const [loading, setLoading] = useState(false)

  // 加载用户信息
  useDidShow(async () => {
    const user = await getOrCreateDeliveryUser(userId)
    setUserInfo(user)
    
    // 如果已有认证信息，自动填充
    if (user) {
      if (user.real_name) setRealName(user.real_name)
      if (user.student_id) setStudentId(user.student_id)
      if (user.class_name) setClassName(user.class_name)
      if (user.phone_number) setPhoneNumber(user.phone_number)
      if (user.wechat_id) setWechatId(user.wechat_id)
    }
  })

  // 返回上一页
  const handleGoBack = () => {
    navigateBack()
  }

  // 提交认证
  const handleSubmit = async () => {
    // 验证表单
    if (!realName.trim()) {
      Taro.showToast({ title: '请输入真实姓名', icon: 'none' })
      return
    }
    if (!studentId.trim()) {
      Taro.showToast({ title: '请输入学号', icon: 'none' })
      return
    }
    if (!className.trim()) {
      Taro.showToast({ title: '请输入班级', icon: 'none' })
      return
    }
    if (!phoneNumber.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phoneNumber.trim())) {
      Taro.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    setLoading(true)
    try {
      const result = await submitVerification({
        userId,
        realName: realName.trim(),
        studentId: studentId.trim(),
        className: className.trim(),
        phoneNumber: phoneNumber.trim(),
        wechatId: wechatId.trim() || undefined
      })

      if (result.success) {
        Taro.showToast({
          title: result.message,
          icon: 'success',
          duration: 3000
        })
        setTimeout(() => {
          navigateBack()
        }, 3000)
      } else {
        Taro.showToast({
          title: result.message,
          icon: 'none',
          duration: 3000
        })
      }
    } catch (error) {
      console.error('提交认证失败:', error)
      Taro.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  // 认证状态提示
  const getStatusTip = () => {
    if (!userInfo) return null

    if (userInfo.verification_status === 'pending') {
      return (
        <View className="bg-yellow-50 rounded-2xl p-5 mb-6 border border-yellow-200">
          <View className="flex flex-row items-start">
            <View className="i-mdi-clock-outline text-2xl text-yellow-600 mr-3 mt-1" />
            <View className="flex-1 flex flex-col space-y-2">
              <Text className="text-xl font-semibold text-yellow-600">审核中</Text>
              <Text className="text-lg text-foreground leading-relaxed">
                您的认证申请正在审核中，预计1-3个工作日完成审核，请耐心等待
              </Text>
              {userInfo.verification_submitted_at && (
                <Text className="text-lg text-muted-foreground">
                  提交时间：{new Date(userInfo.verification_submitted_at).toLocaleString('zh-CN')}
                </Text>
              )}
            </View>
          </View>
        </View>
      )
    }

    if (userInfo.verification_status === 'approved') {
      return (
        <View className="bg-green-50 rounded-2xl p-5 mb-6 border border-green-200">
          <View className="flex flex-row items-start">
            <View className="i-mdi-check-circle text-2xl text-green-600 mr-3 mt-1" />
            <View className="flex-1 flex flex-col space-y-2">
              <Text className="text-xl font-semibold text-green-600">认证已通过</Text>
              <Text className="text-lg text-foreground leading-relaxed">
                您的实名认证已通过审核，可以正常使用饮食速递功能
              </Text>
              {userInfo.verification_approved_at && (
                <Text className="text-lg text-muted-foreground">
                  通过时间：{new Date(userInfo.verification_approved_at).toLocaleString('zh-CN')}
                </Text>
              )}
            </View>
          </View>
        </View>
      )
    }

    if (userInfo.verification_status === 'rejected') {
      return (
        <View className="bg-red-50 rounded-2xl p-5 mb-6 border border-red-200">
          <View className="flex flex-row items-start">
            <View className="i-mdi-close-circle text-2xl text-red-600 mr-3 mt-1" />
            <View className="flex-1 flex flex-col space-y-2">
              <Text className="text-xl font-semibold text-red-600">认证未通过</Text>
              <Text className="text-lg text-foreground leading-relaxed">
                {userInfo.verification_rejected_reason || '您的认证申请未通过审核，请修改信息后重新提交'}
              </Text>
            </View>
          </View>
        </View>
      )
    }

    return null
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
              <Text className="text-xl font-semibold text-foreground">返回</Text>
            </View>
          </View>

          {/* 认证状态提示 */}
          {getStatusTip()}

          {/* 说明卡片 */}
          <View className="bg-primary/10 rounded-2xl p-5 mb-6 border border-primary/20">
            <View className="flex flex-row items-start">
              <View className="i-mdi-information text-2xl text-primary mr-3 mt-1" />
              <View className="flex-1 flex flex-col space-y-2">
                <Text className="text-xl font-semibold text-primary">认证说明</Text>
                <Text className="text-lg text-foreground leading-relaxed">
                  • 为确保平台安全，所有用户需完成实名校园认证
                </Text>
                <Text className="text-lg text-foreground leading-relaxed">
                  • 您的个人信息仅用于确认本校学生身份，防止诈骗
                </Text>
                <Text className="text-lg text-foreground leading-relaxed">
                  • 后台将严格保密您的数据，不会泄露给第三方
                </Text>
                <Text className="text-lg text-foreground leading-relaxed">
                  • 提交后1-3个工作日内完成审核
                </Text>
              </View>
            </View>
          </View>

          {/* 认证表单 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            <Text className="text-2xl font-bold text-foreground mb-6">认证信息</Text>

            {/* 真实姓名 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-account text-2xl text-primary mr-2" />
                <Text className="text-xl font-semibold text-foreground">真实姓名</Text>
                <Text className="text-lg text-red-500 ml-1">*</Text>
              </View>
              <View className="bg-input rounded-xl border border-border px-4 py-2">
                <Input
                  className="w-full text-xl text-foreground"
                  placeholder="请输入真实姓名"
                  value={realName}
                  onInput={(e) => setRealName(e.detail.value)}
                  disabled={userInfo?.verification_status === 'approved'}
                />
              </View>
            </View>

            {/* 学号 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-card-account-details text-2xl text-primary mr-2" />
                <Text className="text-xl font-semibold text-foreground">学号</Text>
                <Text className="text-lg text-red-500 ml-1">*</Text>
              </View>
              <View className="bg-input rounded-xl border border-border px-4 py-2">
                <Input
                  className="w-full text-xl text-foreground"
                  placeholder="请输入学号"
                  value={studentId}
                  onInput={(e) => setStudentId(e.detail.value)}
                  disabled={userInfo?.verification_status === 'approved'}
                />
              </View>
            </View>

            {/* 班级 */}
            <View className="mb-6">
              <View className="flex flex-row items-center mb-3">
                <View className="i-mdi-school text-2xl text-primary mr-2" />
                <Text className="text-xl font-semibold text-foreground">班级</Text>
                <Text className="text-lg text-red-500 ml-1">*</Text>
              </View>
              <View className="bg-input rounded-xl border border-border px-4 py-2">
                <Input
                  className="w-full text-xl text-foreground"
                  placeholder="如：2021级计算机1班"
                  value={className}
                  onInput={(e) => setClassName(e.detail.value)}
                  disabled={userInfo?.verification_status === 'approved'}
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
                  value={phoneNumber}
                  onInput={(e) => setPhoneNumber(e.detail.value)}
                  disabled={userInfo?.verification_status === 'approved'}
                />
              </View>
              <Text className="text-lg text-muted-foreground mt-2">
                用于接单后联系，请填写真实手机号
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
                  value={wechatId}
                  onInput={(e) => setWechatId(e.detail.value)}
                  disabled={userInfo?.verification_status === 'approved'}
                />
              </View>
              <Text className="text-lg text-muted-foreground mt-2">
                方便通过微信联系
              </Text>
            </View>
          </View>

          {/* 隐私声明 */}
          <View className="bg-muted rounded-2xl p-5 mb-6">
            <View className="flex flex-row items-start">
              <View className="i-mdi-shield-check text-2xl text-primary mr-3 mt-1" />
              <View className="flex-1 flex flex-col space-y-2">
                <Text className="text-xl font-semibold text-foreground">隐私保护承诺</Text>
                <Text className="text-lg text-muted-foreground leading-relaxed">
                  我们承诺严格保护您的个人信息，所有数据仅用于校园身份验证，不会用于其他用途。您的信息将加密存储，仅授权管理员可在审核时查看。我们不会将您的信息泄露、出售或提供给任何第三方。
                </Text>
              </View>
            </View>
          </View>

          {/* 提交按钮 */}
          {userInfo?.verification_status !== 'approved' && (
            <Button
              className="w-full bg-primary text-primary-foreground text-2xl font-bold rounded-xl mb-4"
              onClick={handleSubmit}
              disabled={loading || userInfo?.verification_status === 'pending'}
            >
              <View className="py-5">
                <Text>
                  {loading 
                    ? '提交中...' 
                    : userInfo?.verification_status === 'pending' 
                      ? '审核中，请耐心等待' 
                      : '提交认证'}
                </Text>
              </View>
            </Button>
          )}

          {/* 温馨提示 */}
          <View className="bg-card rounded-2xl p-5 border border-border">
            <Text className="text-xl font-semibold text-foreground mb-3">温馨提示</Text>
            <View className="flex flex-col space-y-2">
              <Text className="text-lg text-muted-foreground leading-relaxed">
                • 请确保填写的信息真实有效，虚假信息将无法通过审核
              </Text>
              <Text className="text-lg text-muted-foreground leading-relaxed">
                • 审核通过后，您的认证信息将无法修改
              </Text>
              <Text className="text-lg text-muted-foreground leading-relaxed">
                • 如有疑问，请联系平台客服
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
