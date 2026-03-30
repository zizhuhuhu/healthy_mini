import { View, Text, Button, Image, Input } from '@tarojs/components'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { chooseImage, navigateTo, redirectTo, showToast, useDidShow } from '@tarojs/taro'
import { withRouteGuard } from '@/components/RouteGuard'
import { getProfile, useAuth, type Profile as UserProfile } from '@/contexts/AuthContext'
import { checkUserMembership, getUserOrders, getUserPoints, getUserWeightStats } from '@/db/api'
import { supabase } from '@/client/supabase'
import { compressImage, imageToBase64 } from '@/utils/imageUtils'

function Profile() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [totalPoints, setTotalPoints] = useState(0)
  const [isMember, setIsMember] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [totalCheckins, setTotalCheckins] = useState(0)
  const [ordersCount, setOrdersCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  // --- 1. 派生数据变量 ---
  const username = useMemo(() => String(profile?.username || '-'), [profile])
  const avatarUrl = useMemo(() => {
    const value = profile?.['avatar_url']
    return typeof value === 'string' ? value : ''
  }, [profile])
  const userTag = useMemo(() => (user?.id ? `ID-${user.id.slice(-6)}` : 'ID------'), [user?.id])

  // --- 2. 核心逻辑函数 ---
  
  // 加载面板数据
  const loadDashboard = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [profileData, points, membership, stats, orders] = await Promise.all([
        getProfile(user.id),
        getUserPoints(user.id),
        checkUserMembership(user.id),
        getUserWeightStats(user.id),
        getUserOrders(user.id, 100)
      ])
      setProfile(profileData)
      setTotalPoints(points?.user_score || 0)
      setIsMember(Boolean(membership?.is_active))
      setCurrentStreak(stats?.current_streak || 0)
      setTotalCheckins(stats?.total_checkins || 0)
      setOrdersCount(orders.length)
      setPendingOrdersCount(orders.filter((o) => o.status === 'pending' || o.status === 'unpaid').length)
      setCompletedOrdersCount(orders.filter((o) => o.status === 'completed').length)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const handleChangeAvatar = async () => {
    if (!user?.id) return

    try {
      const res = await chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const imagePath = res.tempFilePaths?.[0]
      if (!imagePath) return

      setSavingAvatar(true)
      const compressedPath = await compressImage(imagePath, 0.7)
      const avatarData = await imageToBase64(compressedPath)

      // profiles.username is NOT NULL; provide fallback for first-time upsert.
      const fallbackUsername =
        (typeof profile?.username === 'string' && profile.username.trim()) ||
        `user_${user.id.replace(/-/g, '').slice(0, 12)}`

      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, username: fallbackUsername, avatar_url: avatarData },
          { onConflict: 'id' }
        )

      if (error) throw error

      setProfile((prev) => ({
        ...(prev || {}),
        id: user.id,
        username: (prev?.username as string) || fallbackUsername,
        avatar_url: avatarData
      } as UserProfile))

      showToast({ title: '头像更新成功', icon: 'success' })
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : '更新头像失败'
      showToast({ title: msg, icon: 'none', duration: 3000 })
      console.error('Avatar Update Error:', e)
    } finally {
      setSavingAvatar(false)
    }
  }
  const handleSaveUsername = async () => {
    if (!user?.id || !profile) return
    const nextUsername = usernameInput.trim()
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(nextUsername)) {
      showToast({ title: '格式错误(3-24位字母数字下划线)', icon: 'none' })
      return
    }
    setSavingUsername(true)
    try {
      const { error } = await supabase.from('profiles').update({ username: nextUsername }).eq('id', user.id)
      if (error) throw error
      setProfile({ ...profile, username: nextUsername })
      setEditingUsername(false)
      showToast({ title: '保存成功', icon: 'success' })
    } catch (e) {
      showToast({ title: '保存失败', icon: 'none' })
    } finally {
      setSavingUsername(false)
    }
  }

  // 修改密码
  const handleChangePassword = async () => {
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      showToast({ title: '密码过短或两次不一致', icon: 'none' })
      return
    }
    setSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword(''); setConfirmPassword('')
      showToast({ title: '密码已更新', icon: 'success' })
    } catch (e) {
      showToast({ title: '更新失败', icon: 'none' })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    redirectTo({ url: '/pages/login/index' })
  }

  // --- 3. 生命周期 ---
  useEffect(() => { loadDashboard() }, [loadDashboard])
  useDidShow(() => { loadDashboard() })
  useEffect(() => { setUsernameInput(username === '-' ? '' : username) }, [username])

  return (
    <View className="min-h-screen bg-slate-50 px-4 py-6 pb-20">
      {/* 1. 顶部导航 */}
      <View className="mb-6 flex flex-row items-center justify-between">
        <View 
          className="flex flex-row items-center rounded-full bg-white px-4 py-2 shadow-sm border border-slate-100"
          onClick={() => navigateTo({url: '/pages/home/index'})}
        >
          <View className="i-mdi-chevron-left mr-1 text-lg text-slate-600" />
          <Text className="text-sm font-medium text-slate-600">回首页</Text>
        </View>
        <View className={`i-mdi-loading text-xl text-primary ${loading ? 'animate-spin' : 'opacity-0'}`} />
      </View>

      {/* 2. 用户卡片 */}
      <View className="relative mb-6 overflow-hidden rounded-3xl bg-white p-6 shadow-md border border-slate-100">
        <View className="flex flex-row items-center">
          <View className="relative mr-4 h-20 w-20 overflow-hidden rounded-full bg-slate-100 border-2 border-primary/10">
            {avatarUrl ? (
              <Image src={avatarUrl} mode="aspectFill" className="h-full w-full" />
            ) : (
              <View className="i-mdi-account text-5xl text-slate-300 m-auto mt-3" />
            )}
            <View 
              className="absolute bottom-0 w-full bg-black/40 py-1 text-center"
              onClick={handleChangeAvatar}
            >
              <Text className="text-[10px] text-white font-bold">{savingAvatar ? '...' : '更换'}</Text>
            </View>
          </View>
          <View className="flex-1">
            <View className="flex flex-row items-center">
              <Text className="text-2xl font-bold text-slate-800">{username}</Text>
              {isMember && (
                <View className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 border border-amber-200">
                  <Text className="text-[10px] font-bold text-amber-700">VIP</Text>
                </View>
              )}
            </View>
            <Text className="mt-1 text-xs text-slate-400 font-mono">{userTag}</Text>
          </View>
          <Button
            className="h-8 rounded-full bg-slate-50 px-4 text-xs font-medium text-slate-600 border border-slate-200"
            onClick={() => setEditingUsername(true)}
          >
            编辑
          </Button>
        </View>

        {editingUsername && (
          <View className="mt-4 rounded-xl bg-slate-50 p-3 border border-dashed border-slate-200">
            <Input
              className="h-10 text-base text-slate-800"
              value={usernameInput}
              maxLength={24}
              placeholder="输入新用户名"
              onInput={(e) => setUsernameInput(e.detail.value)}
            />
            <View className="mt-3 flex flex-row gap-2">
              <Button className="flex-1 h-9 rounded-lg bg-white text-sm" onClick={() => setEditingUsername(false)}>取消</Button>
              <Button className="flex-1 h-9 rounded-lg bg-primary text-sm text-white" loading={savingUsername} onClick={handleSaveUsername}>保存</Button>
            </View>
          </View>
        )}
      </View>

      {/* 3. 数据磁贴 */}
      <View className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: '我的积分', value: totalPoints, color: 'text-primary' },
          { label: '连续签到', value: currentStreak, color: 'text-slate-800' },
          { label: '累计签到', value: totalCheckins, color: 'text-slate-800' }
        ].map((item, i) => (
          <View key={i} className="flex flex-col items-center justify-center rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
            <Text className={`text-xl font-bold ${item.color}`}>{item.value}</Text>
            <Text className="mt-1 text-[11px] text-slate-400">{item.label}</Text>
          </View>
        ))}
      </View>

      {/* 4. 订单入口 */}
      <View className="mb-6 rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <View className="mb-4 flex flex-row items-center justify-between px-1">
          <Text className="text-base font-bold text-slate-800">我的订单</Text>
          <Text className="text-xs text-slate-400" onClick={() => navigateTo({url: '/pages/my-orders/index'})}>全部 &gt;</Text>
        </View>
        <View className="flex flex-row justify-around py-2">
          <View className="relative flex flex-col items-center" onClick={() => navigateTo({url: '/pages/my-orders/index'})}>
             <View className="i-mdi-wallet-outline text-2xl text-slate-600" />
             <Text className="mt-2 text-xs text-slate-600">待付款</Text>
             {pendingOrdersCount > 0 && (
               <View className="absolute -right-3 -top-1 rounded-full bg-red-500 px-1.5 min-w-[16px] text-center border-2 border-white">
                 <Text className="text-[9px] text-white leading-none">{pendingOrdersCount}</Text>
               </View>
             )}
          </View>
          <View className="flex flex-col items-center" onClick={() => navigateTo({url: '/pages/my-orders/index'})}>
             <View className="i-mdi-truck-delivery-outline text-2xl text-slate-600" />
             <Text className="mt-2 text-xs text-slate-600">待收货</Text>
          </View>
          <View className="flex flex-col items-center" onClick={() => navigateTo({url: '/pages/my-orders/index'})}>
             <View className="i-mdi-check-circle-outline text-2xl text-slate-600" />
             <Text className="mt-2 text-xs text-slate-600">已完成</Text>
             <Text className="mt-0.5 text-[10px] text-slate-300">{completedOrdersCount}</Text>
          </View>
        </View>
      </View>

      {/* 5. 功能列表 */}
      <View className="mb-6 overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100">
        {[
          { icon: 'i-mdi-map-marker-outline', label: '地址管理', url: '/pages/address-manage/index' },
          { icon: 'i-mdi-crown-outline', label: '会员中心', url: '/pages/membership/index' },
          { icon: 'i-mdi-run-fast', label: '跑腿中心', url: '/pages/courier-center/index' },
          { icon: 'i-mdi-refresh', label: '刷新数据', action: loadDashboard },
        ].map((item, index, arr) => (
          <View 
            key={index}
            className={`flex flex-row items-center p-4 active:bg-slate-50 ${index !== arr.length - 1 ? 'border-b border-slate-50' : ''}`}
            onClick={() => item.action ? item.action() : navigateTo({url: item.url!})}
          >
            <View className={`${item.icon} mr-3 text-xl text-slate-400`} />
            <Text className="flex-1 text-sm text-slate-700">{item.label}</Text>
            <View className="i-mdi-chevron-right text-slate-300" />
          </View>
        ))}
      </View>

      {/* 6. 账号安全 */}
      <View className="mb-6 rounded-3xl bg-slate-100/50 p-5 border border-slate-200/50">
        <Text className="mb-3 block text-sm font-bold text-slate-500">账号安全</Text>
        <View className="flex flex-col gap-3">
          <Input
            className="h-11 rounded-xl bg-white px-4 text-sm border border-slate-200"
            password placeholder="新密码" value={newPassword}
            onInput={(e) => setNewPassword(e.detail.value)}
          />
          <Input
            className="h-11 rounded-xl bg-white px-4 text-sm border border-slate-200"
            password placeholder="确认新密码" value={confirmPassword}
            onInput={(e) => setConfirmPassword(e.detail.value)}
          />
          <Button
            className="h-11 rounded-xl bg-slate-800 text-sm font-bold text-white active:bg-slate-700"
            loading={savingPassword} onClick={handleChangePassword}
          >
            更新密码
          </Button>
        </View>
      </View>

      {/* 7. 退出登录 */}
      <Button
        className="w-full rounded-2xl bg-white py-2 text-base font-medium text-red-500 shadow-sm border border-red-50"
        onClick={handleSignOut}
      >
        退出登录
      </Button>
    </View>
  )
}

export default withRouteGuard(Profile)

