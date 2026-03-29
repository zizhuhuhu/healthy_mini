import { View, Text, ScrollView } from '@tarojs/components'
import { useState, useCallback, useEffect } from 'react'
import { useShareAppMessage, useShareTimeline, useDidShow, switchTab, getStorageSync, setStorageSync } from '@tarojs/taro'
import { getPointsRanking, getUserPoints } from '@/db/api'
import type { UserPoints } from '@/db/types'
import CheckInButton from '@/components/CheckInButton'

// 生成用户ID
const getUserId = () => {
  let userId = getStorageSync('temp_user_id')
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    setStorageSync('temp_user_id', userId)
  }
  return userId
}

export default function PointsRanking() {
  useShareAppMessage(() => ({ title: '积分排行榜 - 智体云衡' }))
  useShareTimeline(() => ({ title: '积分排行榜 - 智体云衡' }))

  const [rankings, setRankings] = useState<UserPoints[]>([])
  const [myPoints, setMyPoints] = useState<UserPoints | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载排行榜数据
  const loadRankings = useCallback(async () => {
    setLoading(true)
    const userId = getUserId()
    
    // 获取排行榜（使用user_score字段）
    const rankingData = await getPointsRanking(100)
    setRankings(rankingData)
    
    // 获取我的积分（使用user_score字段）
    const myPointsData = await getUserPoints(userId)
    setMyPoints(myPointsData)
    
    console.log('排行榜-我的积分(user_score):', myPointsData?.user_score)
    
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRankings()
  }, [loadRankings])

  // 页面显示时刷新
  useDidShow(() => {
    loadRankings()
  })

  // 获取排名边框样式
  const getRankBorderClass = (rank: number) => {
    if (rank === 1) return 'border-rank-gold'
    if (rank === 2) return 'border-rank-silver'
    if (rank === 3) return 'border-rank-bronze'
    return 'border-border'
  }

  // 获取排名图标
  const getRankIcon = (rank: number) => {
    if (rank === 1) return 'i-mdi-trophy text-4xl' // 金色
    if (rank === 2) return 'i-mdi-medal text-4xl' // 银色
    if (rank === 3) return 'i-mdi-medal text-4xl' // 铜色
    return ''
  }

  // 获取排名图标颜色
  const getRankIconColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500'
    if (rank === 2) return 'text-gray-400'
    if (rank === 3) return 'text-orange-600'
    return ''
  }

  // 获取我的排名
  const getMyRank = () => {
    if (!myPoints) return null
    const userId = getUserId()
    const index = rankings.findIndex(r => r.user_id === userId)
    return index >= 0 ? index + 1 : null
  }

  // 积分更新回调
  const handlePointsUpdate = (points: number) => {
    loadRankings()
  }

  return (
    <View className="min-h-screen bg-background">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 顶部：返回按钮 + 签到按钮 */}
          <View className="flex flex-row items-center justify-between mb-6">
            <View
              className="flex flex-row items-center bg-card rounded-full px-5 py-2 border border-border shadow-sm"
              onClick={() => switchTab({ url: '/pages/home/index' })}
            >
              <View className="i-mdi-arrow-left text-2xl text-foreground mr-1" />
              <Text className="text-xl font-medium text-foreground">返回</Text>
            </View>
            
            <CheckInButton onPointsUpdate={handlePointsUpdate} />
          </View>

          {/* 我的积分卡片 */}
          {myPoints && (
            <View className="bg-gradient-primary rounded-2xl p-6 mb-6">
              <View className="flex flex-col items-center space-y-3">
                <View className="i-mdi-account-circle text-6xl text-primary-foreground" />
                <Text className="text-2xl font-semibold text-primary-foreground">
                  我的积分
                </Text>
                <Text className="text-5xl font-bold text-primary-foreground">
                  {myPoints.user_score || 0}
                </Text>
                <View className="flex flex-col items-center">
                  <Text className="text-xl text-primary-foreground/80">我的排名</Text>
                  <Text className="text-2xl font-bold text-primary-foreground">
                    {getMyRank() || '-'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 排行榜标题 */}
          <View className="flex flex-row items-center justify-between mb-4">
            <View className="flex flex-row items-center">
              <View className="i-mdi-trophy-variant text-3xl text-primary mr-2" />
              <Text className="text-2xl font-bold text-foreground">积分排行榜</Text>
            </View>
            <Text className="text-xl text-muted-foreground">TOP 100</Text>
          </View>

          {/* 排行榜列表 */}
          {loading ? (
            <View className="bg-card rounded-2xl p-8 flex flex-col items-center border border-border">
              <View className="i-mdi-loading animate-spin text-5xl text-primary mb-4" />
              <Text className="text-xl text-muted-foreground">加载中...</Text>
            </View>
          ) : rankings.length === 0 ? (
            <View className="bg-card rounded-2xl p-8 flex flex-col items-center border border-border">
              <View className="i-mdi-emoticon-sad text-6xl text-muted-foreground mb-4" />
              <Text className="text-2xl font-semibold text-foreground mb-2">暂无排行数据</Text>
              <Text className="text-xl text-muted-foreground">快来签到成为第一名吧</Text>
            </View>
          ) : (
            <View className="flex flex-col space-y-3">
              {rankings.slice(0, 10).map((user, index) => {
                const rank = index + 1
                const isMyself = user.user_id === getUserId()
                
                return (
                  <View
                    key={user.id}
                    className={`bg-card rounded-2xl p-5 border-2 ${getRankBorderClass(rank)} ${
                      isMyself ? 'bg-primary/5' : ''
                    }`}
                  >
                    <View className="flex flex-row items-center justify-between">
                      <View className="flex flex-row items-center flex-1">
                        {/* 排名 */}
                        <View className="w-16 flex flex-col items-center justify-center mr-4">
                          {rank <= 3 ? (
                            <View className={`${getRankIcon(rank)} ${getRankIconColor(rank)}`} />
                          ) : (
                            <Text className="text-3xl font-bold text-muted-foreground">
                              {rank}
                            </Text>
                          )}
                        </View>

                        {/* 用户信息 */}
                        <View className="flex-1 flex flex-col space-y-1">
                          <View className="flex flex-row items-center">
                            <Text className="text-xl font-semibold text-foreground">
                              用户 {user.user_id.slice(-6)}
                            </Text>
                            {isMyself && (
                              <View className="ml-2 px-2 py-0.5 bg-primary rounded-full">
                                <Text className="text-base text-primary-foreground">我</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* 积分 */}
                        <View className="flex flex-col items-end">
                          <Text className="text-3xl font-bold text-primary">
                            {user.user_score || 0}
                          </Text>
                          <Text className="text-base text-muted-foreground">积分</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* 底部提示 */}
          <View className="mt-6 bg-primary/10 rounded-2xl p-5 border border-primary/20">
            <View className="flex flex-row items-start">
              <View className="i-mdi-information text-2xl text-primary mr-3 mt-1" />
              <View className="flex-1">
                <Text className="text-xl text-foreground leading-relaxed">
                  该积分可在日后兑换栏目健康餐品，功能即将上线，敬请期待～
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
