import { View, Text, ScrollView, Input, Button, Image } from '@tarojs/components'
import { useState, useCallback } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useDidShow, navigateTo, switchTab, showToast, showModal } from '@tarojs/taro'
import { hasCompletedTest } from '@/utils/storage'
import { recordWeight, getUserWeightRecords, getUserWeightStats } from '@/db/api'
import type { WeightRecord, WeightCheckinStats } from '@/db/types'
import WeightChart from '@/components/WeightChart'
import {
  saveWeightRecordLocal,
  getUserWeightRecordsLocal,
  markRecordAsSynced,
  getPendingSyncRecords,
  hasCheckedInTodayLocal
} from '@/utils/weightStorage'

export default function WeightLab() {
  useShareAppMessage(() => ({ title: '健康实验室 - 智体云衡' }))
  useShareTimeline(() => ({ title: '健康实验室 - 智体云衡' }))

  const [userId] = useState(() => Taro.getStorageSync('user_id') || `user_${Date.now()}`)
  const [weight, setWeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [stats, setStats] = useState<WeightCheckinStats | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [timeRange, setTimeRange] = useState<'7' | '30' | 'all'>('7')
  const [hasPendingSync, setHasPendingSync] = useState(false)

  const showGuideDialog = useCallback(() => {
    showModal({
      title: '同学你好！',
      content: '想更科学地管理体重吗？先花1分钟建立你的专属"体质档案"吧～',
      confirmText: '立即测试',
      cancelText: '跳过，直接记录',
      success: (res) => {
        if (res.confirm) {
          // 立即测试：跳转到体质测试
          switchTab({ url: '/pages/constitution-test/index' })
        } else {
          // 跳过，直接记录：询问是否完成过测试
          showModal({
            title: '提示',
            content: '你最近是否完成过体质测试？（比如体育课的体测）',
            confirmText: '是',
            cancelText: '否/不确定',
            success: (res2) => {
              if (res2.confirm) {
                // 选择"是"：引导输入体重（不做任何操作，用户可以直接在页面上输入）
                showToast({
                  title: '太好了！请在下方记录你的体重吧',
                  icon: 'none',
                  duration: 2000
                })
              } else {
                // 选择"否/不确定"：再次温和提示
                showModal({
                  title: '温馨提示',
                  content: '建议先完成测试，结果能帮你更好设定目标哦！',
                  confirmText: '先去测试',
                  cancelText: '暂不测试，直接记录',
                  success: (res3) => {
                    if (res3.confirm) {
                      // 先去测试
                      switchTab({ url: '/pages/constitution-test/index' })
                    } else {
                      // 暂不测试，直接记录
                      showToast({
                        title: '好的，你可以直接开始记录体重',
                        icon: 'none',
                        duration: 2000
                      })
                    }
                  }
                })
              }
            }
          })
        }
      }
    })
  }, [])

  // 首次进入检查是否需要显示引导
  useDidShow(() => {
    loadData()
    checkFirstVisit()
    checkPendingSync()
  })

  const checkFirstVisit = useCallback(async () => {
    const hasVisited = Taro.getStorageSync('weight_lab_visited')
    if (!hasVisited) {
      // 延迟显示引导弹窗，确保页面已加载
      setTimeout(() => {
        showGuideDialog()
      }, 500)
      Taro.setStorageSync('weight_lab_visited', true)
    }
  }, [showGuideDialog])

  // 检查是否有待同步的记录
  const checkPendingSync = useCallback(async () => {
    const pendingRecords = getPendingSyncRecords(userId)
    if (pendingRecords.length > 0) {
      setHasPendingSync(true)
      // 提示用户有未同步的记录
      showModal({
        title: '发现未同步的体重记录',
        content: `您有 ${pendingRecords.length} 条体重记录未同步到云端，是否立即同步？`,
        confirmText: '立即同步',
        cancelText: '稍后同步',
        success: async (res) => {
          if (res.confirm) {
            await syncPendingRecords()
          }
        }
      })
    }
  }, [userId])

  // 同步待同步的记录
  const syncPendingRecords = useCallback(async () => {
    const pendingRecords = getPendingSyncRecords(userId)
    if (pendingRecords.length === 0) return

    showToast({ title: '正在同步...', icon: 'loading', duration: 0 })

    let successCount = 0
    for (const record of pendingRecords) {
      try {
        const result = await recordWeight(userId, record.weight)
        if (result.success) {
          markRecordAsSynced(userId, record.record_date)
          successCount++
        }
      } catch (error) {
        console.error('同步记录失败:', error)
      }
    }

    Taro.hideToast()

    if (successCount > 0) {
      showToast({
        title: `成功同步 ${successCount} 条记录`,
        icon: 'success',
        duration: 2000
      })
      setHasPendingSync(false)
      await loadData()
    } else {
      showToast({
        title: '同步失败，请稍后重试',
        icon: 'none',
        duration: 2000
      })
    }
  }, [userId])

  // 加载数据（优先从本地加载，然后异步请求云端）
  const loadData = useCallback(async () => {
    console.log('=== 开始加载体重数据 ===')
    
    // 1. 优先从本地存储加载数据
    const localRecords = getUserWeightRecordsLocal(userId)
    if (localRecords.length > 0) {
      console.log('从本地存储加载到', localRecords.length, '条记录')
      // 转换为WeightRecord格式
      const formattedRecords: WeightRecord[] = localRecords.map(r => ({
        id: r.id || '',
        user_id: r.user_id,
        weight: r.weight.toString(),
        record_date: r.record_date,
        points_earned: 0,
        created_at: r.created_at
      }))
      setRecords(formattedRecords)
    }

    // 2. 异步请求云端数据
    try {
      const [recordsData, statsData] = await Promise.all([
        getUserWeightRecords(userId),
        getUserWeightStats(userId)
      ])

      console.log('从云端加载到', recordsData.length, '条记录')

      // 3. 对比并更新本地存储
      if (recordsData.length > 0) {
        setRecords(recordsData)
        
        // 更新本地存储（标记为已同步）
        recordsData.forEach(record => {
          saveWeightRecordLocal({
            id: record.id,
            user_id: record.user_id,
            weight: parseFloat(record.weight),
            record_date: record.record_date,
            synced: true,
            created_at: record.created_at
          })
        })
      }

      setStats(statsData)
      console.log('=== 数据加载完成 ===')
    } catch (error) {
      console.error('从云端加载数据失败:', error)
      // 网络异常时，继续使用本地数据
      showToast({
        title: '网络异常，显示本地数据',
        icon: 'none',
        duration: 2000
      })
    }
  }, [userId])

  const handleShowGuide = () => {
    showGuideDialog()
  }

  const handleRecordWeight = async () => {
    if (!weight || isNaN(Number(weight))) {
      showToast({ title: '请输入有效的体重', icon: 'none' })
      return
    }

    const weightNum = Number(weight)
    if (weightNum < 30 || weightNum > 200) {
      showToast({ title: '体重范围应在30-200kg之间', icon: 'none' })
      return
    }

    // 检查今天是否已打卡（先检查本地）
    if (hasCheckedInTodayLocal(userId)) {
      showToast({ title: '今天已经打卡过了哦～明天再来吧！', icon: 'none' })
      return
    }

    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // 1. 先保存到本地存储
    const localRecord = {
      user_id: userId,
      weight: weightNum,
      record_date: today,
      synced: false,
      created_at: now
    }
    saveWeightRecordLocal(localRecord)
    console.log('体重记录已保存到本地存储')

    try {
      // 2. 尝试同步到云端
      const result = await recordWeight(userId, weightNum)
      
      if (result.success) {
        // 同步成功，标记为已同步
        markRecordAsSynced(userId, today)
        
        showToast({
          title: '打卡成功！',
          icon: 'success',
          duration: 2000
        })

        // 重新加载数据
        setWeight('')
        await loadData()
      } else {
        // 同步失败，但数据已保存到本地
        showModal({
          title: '提示',
          content: '数据已暂存本地，将在网络恢复后自动同步',
          showCancel: false,
          confirmText: '知道了'
        })
        
        // 重新加载本地数据
        setWeight('')
        const localRecords = getUserWeightRecordsLocal(userId)
        const formattedRecords: WeightRecord[] = localRecords.map(r => ({
          id: r.id || '',
          user_id: r.user_id,
          weight: r.weight.toString(),
          record_date: r.record_date,
          points_earned: 0,
          created_at: r.created_at
        }))
        setRecords(formattedRecords)
      }
    } catch (error) {
      console.error('同步体重记录失败:', error)
      
      // 网络异常，数据已保存到本地
      showModal({
        title: '网络异常',
        content: '数据已暂存本地，将在网络恢复后自动同步',
        showCancel: false,
        confirmText: '知道了'
      })
      
      // 重新加载本地数据
      setWeight('')
      const localRecords = getUserWeightRecordsLocal(userId)
      const formattedRecords: WeightRecord[] = localRecords.map(r => ({
        id: r.id || '',
        user_id: r.user_id,
        weight: r.weight.toString(),
        record_date: r.record_date,
        points_earned: 0,
        created_at: r.created_at
      }))
      setRecords(formattedRecords)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredRecords = () => {
    if (timeRange === 'all') return records
    const days = timeRange === '7' ? 7 : 30
    return records.slice(0, days)
  }

  const handleNavigateToHome = () => {
    navigateTo({ url: '/pages/home/index' })
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 顶部导航 */}
          <View className="flex flex-row items-center mb-6">
            <View
              className="flex flex-row items-center active-press"
              onClick={handleNavigateToHome}
            >
              <View className="i-mdi-home text-2xl text-primary mr-1" />
              <Text className="text-xl font-medium text-foreground">首页</Text>
            </View>
          </View>

          {/* 引导按钮 - 显示体质测试状态 */}
          {!hasCompletedTest() ? (
            <View className="bg-card rounded-2xl p-5 mb-6 border border-border">
              <View className="flex flex-col items-center space-y-3">
                <View className="i-mdi-lightbulb-on text-5xl text-primary" />
                <Text className="text-xl font-semibold text-foreground text-center">
                  还没完成体质测试？
                </Text>
                <Text className="text-lg text-muted-foreground text-center leading-relaxed">
                  建议先完成测试，结果能帮你更好设定目标哦！
                </Text>
                <Button
                  className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl"
                  onClick={handleShowGuide}
                >
                  <View className="py-3">
                    <Text>查看引导</Text>
                  </View>
                </Button>
              </View>
            </View>
          ) : (
            <View className="bg-gradient-primary rounded-2xl p-5 mb-6">
              <View className="flex flex-col items-center space-y-2">
                <View className="i-mdi-check-circle text-5xl text-primary-foreground" />
                <Text className="text-xl font-semibold text-primary-foreground text-center">
                  已完成体质测试 ✓
                </Text>
                <Text className="text-lg text-primary-foreground/80 text-center leading-relaxed">
                  你的体质档案已建立，可以开始记录体重啦！
                </Text>
              </View>
            </View>
          )}

          {/* 打卡统计卡片 */}
          <View className="bg-gradient-primary rounded-3xl p-7 mb-6 shadow-elegant">
            <View className="flex flex-col space-y-4">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-col space-y-1">
                  <Text className="text-xl text-primary-foreground/80">连续打卡</Text>
                  <Text className="text-5xl font-extrabold text-primary-foreground">
                    {stats?.current_streak || 0}
                  </Text>
                  <Text className="text-xl text-primary-foreground/80">天</Text>
                </View>
                <View className="flex flex-col space-y-1 items-end">
                  <Text className="text-xl text-primary-foreground/80">总打卡</Text>
                  <Text className="text-5xl font-extrabold text-primary-foreground">
                    {stats?.total_checkins || 0}
                  </Text>
                  <Text className="text-xl text-primary-foreground/80">次</Text>
                </View>
              </View>
              <View className="flex flex-row items-center justify-center pt-4 border-t border-primary-foreground/20">
                <View className="flex flex-col space-y-1 items-center">
                  <Text className="text-lg text-primary-foreground/80">最长连续</Text>
                  <Text className="text-2xl font-bold text-primary-foreground">
                    {stats?.max_streak || 0}天
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 体重记录区域 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            <View className="flex flex-row items-center justify-between mb-4">
              <View className="flex flex-row items-center">
                <View className="i-mdi-scale-bathroom text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">记录我的体重</Text>
              </View>
              {hasPendingSync && (
                <View
                  className="flex flex-row items-center bg-warning/10 px-3 py-1 rounded-lg active-press"
                  onClick={syncPendingRecords}
                >
                  <View className="i-mdi-cloud-upload text-lg text-warning mr-1" />
                  <Text className="text-sm text-warning">待同步</Text>
                </View>
              )}
            </View>

            <View className="flex flex-col space-y-4">
              <View className="flex flex-col space-y-2">
                <View className="flex flex-row items-center">
                  <Text className="text-xl text-foreground">体重（kg）</Text>
                  <View className="i-mdi-lightbulb text-xl text-primary ml-2" />
                </View>
                <Text className="text-lg text-muted-foreground leading-relaxed">
                  💡 小贴士：建议晨起空腹测量，每周固定时间，趋势更有参考价值！
                </Text>
                <View className="bg-input rounded-xl border border-border px-4 py-4 w-full">
                  <Input
                    className="w-full text-foreground text-xl"
                    type="digit"
                    placeholder="请输入体重（如：65.5）"
                    value={weight}
                    onInput={(e) => setWeight(e.detail.value)}
                  />
                </View>
              </View>

              <Button
                className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl"
                onClick={handleRecordWeight}
                disabled={loading}
              >
                <View className="py-4">
                  <Text>{loading ? '记录中...' : '打卡记录'}</Text>
                </View>
              </Button>
            </View>
          </View>

          {/* 体重趋势图表 */}
          {records.length > 0 && (
            <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-chart-line text-3xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">体重趋势</Text>
              </View>

              {/* 时间范围切换 */}
              <View className="flex flex-row items-center space-x-3 mb-6">
                <View
                  className={`px-5 py-3 rounded-xl ${timeRange === '7' ? 'bg-primary' : 'bg-muted'}`}
                  onClick={() => setTimeRange('7')}
                >
                  <Text className={`text-xl font-medium ${timeRange === '7' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    最近7天
                  </Text>
                </View>
                <View
                  className={`px-5 py-3 rounded-xl ${timeRange === '30' ? 'bg-primary' : 'bg-muted'}`}
                  onClick={() => setTimeRange('30')}
                >
                  <Text className={`text-xl font-medium ${timeRange === '30' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    最近30天
                  </Text>
                </View>
                <View
                  className={`px-5 py-3 rounded-xl ${timeRange === 'all' ? 'bg-primary' : 'bg-muted'}`}
                  onClick={() => setTimeRange('all')}
                >
                  <Text className={`text-xl font-medium ${timeRange === 'all' ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    全部
                  </Text>
                </View>
              </View>

              {/* 折线图 */}
              <View className="mb-6 flex flex-col items-center">
                <WeightChart
                  data={getFilteredRecords().reverse().map(r => ({
                    date: r.record_date,
                    weight: Number(r.weight)
                  }))}
                  width={330}
                  height={220}
                />
              </View>

              {/* 最新体重显示 */}
              {getFilteredRecords().length > 0 && (
                <View className="bg-gradient-primary rounded-2xl p-6 mb-4">
                  <View className="flex flex-col items-center space-y-2">
                    <Text className="text-xl text-primary-foreground/80">最新体重</Text>
                    <Text className="text-5xl font-extrabold text-primary-foreground">
                      {Number(getFilteredRecords()[0].weight).toFixed(1)} kg
                    </Text>
                    <Text className="text-xl text-primary-foreground/80">
                      {getFilteredRecords()[0].record_date}
                    </Text>
                  </View>
                </View>
              )}

              {/* 体重记录列表 */}
              <View className="flex flex-col space-y-3">
                {getFilteredRecords().map((record, index) => (
                  <View key={record.id} className="flex flex-row items-center justify-between p-4 bg-muted rounded-xl">
                    <View className="flex flex-col space-y-1">
                      <Text className="text-xl font-semibold text-foreground">
                        {Number(record.weight).toFixed(1)} kg
                      </Text>
                      <Text className="text-lg text-muted-foreground">
                        {record.record_date}
                      </Text>
                    </View>
                    {index > 0 && (
                      <View className="flex flex-row items-center">
                        {Number(record.weight) < Number(getFilteredRecords()[index - 1].weight) ? (
                          <>
                            <View className="i-mdi-arrow-down text-2xl text-green-500 mr-1" />
                            <Text className="text-lg font-medium text-green-500">
                              -{(Number(getFilteredRecords()[index - 1].weight) - Number(record.weight)).toFixed(1)}
                            </Text>
                          </>
                        ) : Number(record.weight) > Number(getFilteredRecords()[index - 1].weight) ? (
                          <>
                            <View className="i-mdi-arrow-up text-2xl text-red-500 mr-1" />
                            <Text className="text-lg font-medium text-red-500">
                              +{(Number(record.weight) - Number(getFilteredRecords()[index - 1].weight)).toFixed(1)}
                            </Text>
                          </>
                        ) : (
                          <Text className="text-lg font-medium text-muted-foreground">-</Text>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 健康小贴士 */}
          <View className="glass rounded-2xl p-6 mb-6">
            <View className="flex flex-col items-center space-y-3">
              <View className="i-mdi-heart-pulse text-5xl text-primary" />
              <Text className="text-2xl font-bold text-foreground text-center">健康小贴士</Text>
              <Text className="text-xl text-muted-foreground text-center leading-relaxed">
                体重管理不是一蹴而就的，坚持记录、科学饮食、适量运动，才能达到理想效果。加油！💪
              </Text>
            </View>
          </View>

          {/* 快捷入口 */}
          <View className="flex flex-col space-y-4 mb-6">
            <View
              className="bg-card-warm rounded-2xl p-6 shadow-medium active-press"
              onClick={() => navigateTo({ url: '/pages/points-shop/index' })}
            >
              <View className="flex flex-row items-center">
                <View className="flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center mr-4" style={{ background: 'linear-gradient(135deg, #D4AF37, #F4D03F)' }}>
                  <View className="i-mdi-shopping text-4xl text-primary-foreground" />
                </View>
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-2xl font-bold text-foreground">积分商城</Text>
                  <Text className="text-xl text-muted-foreground">
                    兑换个性化皮肤和特效
                  </Text>
                </View>
                <View className="i-mdi-chevron-right text-3xl text-muted-foreground" />
              </View>
            </View>

            <View
              className="bg-card-warm rounded-2xl p-6 shadow-medium active-press"
              onClick={() => navigateTo({ url: '/pages/dormitory-challenge/index' })}
            >
              <View className="flex flex-row items-center">
                <View className="flex-shrink-0 w-16 h-16 bg-gradient-primary rounded-xl flex flex-col items-center justify-center mr-4">
                  <View className="i-mdi-trophy text-4xl text-primary-foreground" />
                </View>
                <View className="flex-1 flex flex-col space-y-1">
                  <Text className="text-2xl font-bold text-foreground">宿舍挑战榜</Text>
                  <Text className="text-xl text-muted-foreground">
                    和舍友一起打卡PK
                  </Text>
                </View>
                <View className="i-mdi-chevron-right text-3xl text-muted-foreground" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
