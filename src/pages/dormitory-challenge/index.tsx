import { View, Text, ScrollView, Input, Button, Image } from '@tarojs/components'
import { useState, useCallback } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useDidShow, switchTab, showToast, showModal } from '@tarojs/taro'
import { getDormitoryRankings, getUserDormitory, setUserDormitory, getDormitoryMembers } from '@/db/api'
import type { DormitoryRanking, DormitoryInfo } from '@/db/types'
import CheckInButton from '@/components/CheckInButton'

export default function DormitoryChallenge() {
  useShareAppMessage(() => ({ title: '宿舍挑战榜 - 智体云衡' }))
  useShareTimeline(() => ({ title: '宿舍挑战榜 - 智体云衡' }))

  const [userId] = useState(() => Taro.getStorageSync('user_id') || `user_${Date.now()}`)
  const [rankings, setRankings] = useState<DormitoryRanking[]>([])
  const [userDorm, setUserDorm] = useState<DormitoryInfo | null>(null)
  const [dormInput, setDormInput] = useState('')
  const [showSetDorm, setShowSetDorm] = useState(false)
  const [selectedDorm, setSelectedDorm] = useState<string | null>(null)
  const [dormMembers, setDormMembers] = useState<Array<{ user_id: string; current_streak: number; total_points: number }>>([])

  useDidShow(() => {
    loadData()
  })

  const loadData = useCallback(async () => {
    const [rankingsData, userDormData] = await Promise.all([
      getDormitoryRankings(),
      getUserDormitory(userId)
    ])

    setRankings(rankingsData)
    setUserDorm(userDormData)
    
    if (!userDormData) {
      setShowSetDorm(true)
    }
  }, [userId])

  const handleSetDormitory = async () => {
    if (!dormInput.trim()) {
      showToast({ title: '请输入宿舍名称', icon: 'none' })
      return
    }

    const result = await setUserDormitory(userId, dormInput.trim())
    if (result.success) {
      showToast({ title: result.message, icon: 'success' })
      setShowSetDorm(false)
      await loadData()
    } else {
      showToast({ title: result.message, icon: 'none' })
    }
  }

  const handleViewDormMembers = async (dormName: string) => {
    const members = await getDormitoryMembers(dormName)
    setDormMembers(members)
    setSelectedDorm(dormName)
  }

  const handleNavigateToHome = () => {
    switchTab({ url: '/pages/home/index' })
  }

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 顶部导航 */}
          <View className="flex flex-row items-center justify-between mb-6">
            <View
              className="flex flex-row items-center active-press"
              onClick={handleNavigateToHome}
            >
              <View className="i-mdi-home text-2xl text-primary mr-1" />
              <Text className="text-xl font-medium text-foreground">首页</Text>
            </View>
            
            <CheckInButton onPointsUpdate={() => {}} />
          </View>

          {/* 学校宿舍挑战榜标识 */}
          <View className="glass rounded-3xl p-7 mb-6 shadow-soft">
            <View className="flex flex-col items-center space-y-3">
              <Image
                src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a354990-fbb2-4357-82aa-0c94b6fde357.jpg"
                mode="aspectFit"
                className="w-64 h-64"
                style={{ backgroundColor: 'transparent' }}
              />
              <Text className="text-3xl font-extrabold text-foreground text-center" style={{ letterSpacing: '2px' }}>
                宿舍挑战榜
              </Text>
              <Text className="text-xl font-bold text-muted-foreground text-center" style={{ letterSpacing: '1px' }}>
                天津中医药大学
              </Text>
              <Text className="text-xl font-medium text-muted-foreground text-center" style={{ letterSpacing: '0.5px' }}>
                宿舍PK · 共同进步
              </Text>
            </View>
          </View>

          {/* 设置宿舍信息 */}
          {showSetDorm && (
            <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
              <View className="flex flex-col space-y-4">
                <View className="flex flex-row items-center">
                  <View className="i-mdi-home-account text-2xl text-primary mr-2" />
                  <Text className="text-2xl font-semibold text-foreground">设置我的宿舍</Text>
                </View>
                <Text className="text-xl text-muted-foreground leading-relaxed">
                  加入宿舍挑战，和舍友一起打卡！
                </Text>
                <View className="bg-input rounded-xl border border-border px-4 py-4 w-full">
                  <Input
                    className="w-full text-foreground text-xl"
                    placeholder="请输入宿舍名称（如：1号楼301）"
                    value={dormInput}
                    onInput={(e) => setDormInput(e.detail.value)}
                  />
                </View>
                <Button
                  className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl"
                  onClick={handleSetDormitory}
                >
                  <View className="py-4">
                    <Text>加入宿舍</Text>
                  </View>
                </Button>
              </View>
            </View>
          )}

          {/* 我的宿舍信息 */}
          {userDorm && (
            <View className="bg-gradient-primary rounded-3xl p-7 mb-6 shadow-elegant">
              <View className="flex flex-col items-center space-y-3">
                <View className="i-mdi-home-heart text-6xl text-primary-foreground" />
                <Text className="text-xl text-primary-foreground/80">我的宿舍</Text>
                <Text className="text-4xl font-extrabold text-primary-foreground">
                  {userDorm.dormitory_name}
                </Text>
                <Button
                  className="bg-primary-foreground text-primary text-xl font-medium rounded-xl"
                  onClick={() => handleViewDormMembers(userDorm.dormitory_name)}
                >
                  <View className="py-3 px-6">
                    <Text>查看舍友动态</Text>
                  </View>
                </Button>
              </View>
            </View>
          )}

          {/* 宿舍排行榜 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-trophy text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">宿舍排行榜</Text>
            </View>

            <View className="flex flex-col space-y-3">
              {rankings.length === 0 ? (
                <View className="flex flex-col items-center py-10">
                  <View className="i-mdi-trophy-outline text-6xl text-muted-foreground mb-3" />
                  <Text className="text-xl text-muted-foreground">暂无排行数据</Text>
                </View>
              ) : (
                rankings.map((ranking, index) => (
                  <View
                    key={ranking.dormitory_name}
                    className={`flex flex-row items-center p-5 rounded-xl ${index < 3 ? 'bg-gradient-primary' : 'bg-muted'}`}
                    onClick={() => handleViewDormMembers(ranking.dormitory_name)}
                  >
                    {/* 排名 */}
                    <View className="flex-shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center mr-4" style={{ background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#E5E7EB' }}>
                      <Text className={`text-3xl font-extrabold ${index < 3 ? 'text-white' : 'text-foreground'}`}>
                        {index + 1}
                      </Text>
                    </View>

                    {/* 宿舍信息 */}
                    <View className="flex-1 flex flex-col space-y-1">
                      <Text className={`text-2xl font-semibold ${index < 3 ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {ranking.dormitory_name}
                      </Text>
                      <View className="flex flex-row items-center space-x-4">
                        <Text className={`text-lg ${index < 3 ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {ranking.member_count}人
                        </Text>
                        <Text className={`text-lg ${index < 3 ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          平均{Math.round(ranking.avg_streak)}天
                        </Text>
                      </View>
                    </View>

                    {/* 总积分 */}
                    <View className="flex flex-col items-end space-y-1">
                      <Text className={`text-xl ${index < 3 ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        总积分
                      </Text>
                      <Text className={`text-3xl font-bold ${index < 3 ? 'text-primary-foreground' : 'text-primary'}`}>
                        {ranking.total_points}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* 舍友动态弹窗 */}
          {selectedDorm && dormMembers.length > 0 && (
            <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
              <View className="flex flex-row items-center justify-between mb-4">
                <View className="flex flex-row items-center">
                  <View className="i-mdi-account-group text-2xl text-primary mr-2" />
                  <Text className="text-2xl font-semibold text-foreground">{selectedDorm} 舍友动态</Text>
                </View>
                <View
                  className="i-mdi-close text-2xl text-muted-foreground"
                  onClick={() => setSelectedDorm(null)}
                />
              </View>

              <View className="flex flex-col space-y-3">
                {dormMembers.map((member, index) => (
                  <View key={member.user_id} className="flex flex-row items-center p-4 bg-muted rounded-xl">
                    <View className="flex-shrink-0 w-12 h-12 bg-primary rounded-full flex flex-col items-center justify-center mr-4">
                      <Text className="text-xl font-bold text-primary-foreground">
                        {index + 1}
                      </Text>
                    </View>
                    <View className="flex-1 flex flex-col space-y-1">
                      <Text className="text-xl font-semibold text-foreground">
                        用户 {member.user_id.slice(-6)}
                      </Text>
                      <Text className="text-lg text-muted-foreground">
                        连续打卡 {member.current_streak} 天
                      </Text>
                    </View>
                    <View className="flex flex-col items-end space-y-1">
                      <View className="i-mdi-fire text-3xl text-primary" />
                      <Text className="text-lg font-medium text-primary">
                        {member.total_points}分
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 挑战说明 */}
          <View className="glass rounded-2xl p-6 mb-6">
            <View className="flex flex-col items-center space-y-3">
              <View className="i-mdi-information text-5xl text-primary" />
              <Text className="text-2xl font-bold text-foreground text-center">挑战说明</Text>
              <Text className="text-xl text-muted-foreground text-center leading-relaxed">
                • 宿舍排名按平均连续打卡天数排序{'\n'}
                • 仅展示舍友的打卡天数，不显示具体体重{'\n'}
                • 和舍友一起坚持，共同进步！💪
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
