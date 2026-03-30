import { View, Text } from '@tarojs/components'
import { useState, useEffect, useCallback } from 'react'
import Taro from '@tarojs/taro'
import { supabase } from '@/client/supabase'
import { getCurrentUserId } from '@/utils/user'

interface CheckInButtonProps {
  onPointsUpdate?: (points: number) => void
}

// 生成用户ID
export default function CheckInButton({ onPointsUpdate }: CheckInButtonProps) {
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  const userId = getCurrentUserId()

  // 检查今日是否已签到
  const checkTodayStatus = useCallback(async () => {
    setChecking(true)
    if (!userId) {
      setHasCheckedIn(false)
      setChecking(false)
      return
    }
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // 查询用户数据，检查last_sign_date是否为今天
      const { data, error } = await supabase
        .from('user_points')
        .select('last_sign_date')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('检查签到状态失败:', error)
        setHasCheckedIn(false)
      } else {
        // 如果last_sign_date等于今天，说明已签到
        setHasCheckedIn(data?.last_sign_date === today)
      }
    } catch (error) {
      console.error('检查签到状态异常:', error)
      setHasCheckedIn(false)
    } finally {
      setChecking(false)
    }
  }, [userId])

  useEffect(() => {
    checkTodayStatus()
  }, [checkTodayStatus])

  // 处理签到
  const handleCheckIn = async () => {
    if (loading) return
    if (!userId) {
      Taro.showToast({
        title: '请先登录后再签到',
        icon: 'none',
        duration: 2000
      })
      return
    }

    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // 第一步：获取用户当前数据
      const { data: userData, error: fetchError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (fetchError) {
        console.error('获取用户数据失败:', fetchError)
        throw new Error('获取用户数据失败')
      }

      // 检查今天是否已签到
      if (userData && userData.last_sign_date === today) {
        setHasCheckedIn(true)
        Taro.showToast({
          title: '今日已签到，明天再来哦',
          icon: 'none',
          duration: 2000
        })
        setLoading(false)
        return
      }

      // 第二步：计算新积分
      const oldScore = userData?.user_score || 0
      const newScore = oldScore + 1
      
      // 调试日志
      console.log('=== 签到调试信息 ===')
      console.log('用户ID:', userId)
      console.log('签到日期:', today)
      console.log('old_score:', oldScore)
      console.log('new_score:', newScore)
      console.log('==================')

      // 第三步：更新数据库
      if (userData) {
        // 更新现有用户数据：user_score = user_score + 1，更新last_sign_date
        const { error: updateError } = await supabase
          .from('user_points')
          .update({
            user_score: newScore,
            last_sign_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('更新积分失败:', updateError)
          throw new Error('积分更新失败')
        }
      } else {
        // 创建新用户数据
        const { error: createError } = await supabase
          .from('user_points')
          .insert({
            user_id: userId,
            user_score: newScore,
            last_sign_date: today
          })

        if (createError) {
          console.error('创建用户数据失败:', createError)
          throw new Error('用户数据创建失败')
        }
      }

      // 第四步：插入签到记录（用于统计）
      await supabase
        .from('check_in_records')
        .insert({
          user_id: userId,
          check_in_date: today,
          points_earned: 1
        })

      // 第五步：签到成功
      setHasCheckedIn(true)
      
      // 第六步：显示签到成功提示
      Taro.showToast({
        title: '签到成功，积分+1',
        icon: 'success',
        duration: 2000
      })

      // 第七步：刷新用户数据（重新拉取最新的user_score）
      setTimeout(async () => {
        const { data: refreshedData } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()

        if (refreshedData) {
          console.log('刷新后的积分:', refreshedData.user_score)
          // 通知父组件更新积分显示
          if (onPointsUpdate) {
            onPointsUpdate(refreshedData.user_score)
          }
        }
      }, 500)

    } catch (error) {
      console.error('签到失败:', error)
      Taro.showToast({
        title: '签到失败，请重试',
        icon: 'none',
        duration: 2000
      })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <View className="flex flex-row items-center bg-card rounded-full px-6 py-3 border border-border shadow-soft">
        <View className="i-mdi-loading animate-spin text-2xl text-primary mr-2" />
        <Text className="text-xl font-medium text-muted-foreground">检查中...</Text>
      </View>
    )
  }

  return (
    <View
      className={`flex flex-row items-center rounded-full px-6 py-3 shadow-soft ${
        loading ? 'opacity-70' : 'active-press'
      } ${
        hasCheckedIn 
          ? 'bg-muted border border-border' 
          : 'bg-gradient-primary'
      }`}
      onClick={handleCheckIn}
    >
      {loading ? (
        <>
          <View className="i-mdi-loading animate-spin text-2xl text-white mr-2" />
          <Text className="text-xl font-semibold text-white">签到中...</Text>
        </>
      ) : hasCheckedIn ? (
        <>
          <View className="i-mdi-check-circle text-2xl text-muted-foreground mr-2" />
          <Text className="text-xl font-semibold text-muted-foreground">已签到</Text>
        </>
      ) : (
        <>
          <View className="i-mdi-calendar-check text-2xl text-white mr-2" />
          <Text className="text-xl font-semibold text-white">每日签到</Text>
        </>
      )}
    </View>
  )
}
