import { View, Text, ScrollView, Button, Image } from '@tarojs/components'
import { useState, useCallback } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, useDidShow, navigateTo, switchTab, showToast, showModal } from '@tarojs/taro'
import { getAllVirtualItems, getUserItems, purchaseVirtualItem, toggleItemActive, getUserWeightStats } from '@/db/api'
import type { VirtualItem, WeightCheckinStats } from '@/db/types'
import CheckInButton from '@/components/CheckInButton'

export default function PointsShop() {
  useShareAppMessage(() => ({ title: '积分商城 - 智体云衡' }))
  useShareTimeline(() => ({ title: '积分商城 - 智体云衡' }))

  const [userId] = useState(() => Taro.getStorageSync('user_id') || `user_${Date.now()}`)
  const [allItems, setAllItems] = useState<VirtualItem[]>([])
  const [userItems, setUserItems] = useState<Array<VirtualItem & { is_active: boolean }>>([])
  const [stats, setStats] = useState<WeightCheckinStats | null>(null)
  const [activeTab, setActiveTab] = useState<'shop' | 'my'>('shop')

  useDidShow(() => {
    loadData()
  })

  const loadData = useCallback(async () => {
    const [itemsData, userItemsData, statsData] = await Promise.all([
      getAllVirtualItems(),
      getUserItems(userId),
      getUserWeightStats(userId)
    ])

    setAllItems(itemsData)
    setUserItems(userItemsData)
    setStats(statsData)
  }, [userId])

  const handlePurchase = async (item: VirtualItem) => {
    if (!stats || stats.total_points < item.price) {
      showToast({ title: '积分不足', icon: 'none' })
      return
    }

    showModal({
      title: '确认购买',
      content: `确定花费${item.price}积分购买"${item.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          const result = await purchaseVirtualItem(userId, item.id)
          if (result.success) {
            showToast({ title: result.message, icon: 'success' })
            await loadData()
          } else {
            showToast({ title: result.message, icon: 'none' })
          }
        }
      }
    })
  }

  const handleToggleActive = async (item: VirtualItem & { is_active: boolean }) => {
    const result = await toggleItemActive(userId, item.id, item.type)
    if (result.success) {
      showToast({ title: result.message, icon: 'success' })
      await loadData()
    } else {
      showToast({ title: result.message, icon: 'none' })
    }
  }

  const handleNavigateToHome = () => {
    switchTab({ url: '/pages/home/index' })
  }

  const handleNavigateToWeightLab = () => {
    navigateTo({ url: '/pages/weight-lab/index' })
  }

  const userItemIds = new Set(userItems.map(item => item.id))

  const getItemTypeText = (type: string) => {
    switch (type) {
      case 'chart_skin': return '图表皮肤'
      case 'effect': return '动态特效'
      case 'nickname_icon': return '昵称图标'
      default: return '未知'
    }
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

          {/* 学校积分商城标识 */}
          <View className="glass rounded-3xl p-7 mb-6 shadow-soft">
            <View className="flex flex-col items-center space-y-3">
              <Image
                src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a354990-fbb2-4357-82aa-0c94b6fde357.jpg"
                mode="aspectFit"
                className="w-64 h-64"
                style={{ backgroundColor: 'transparent' }}
              />
              <Text className="text-3xl font-extrabold text-foreground text-center" style={{ letterSpacing: '2px' }}>
                积分商城
              </Text>
              <Text className="text-xl font-bold text-muted-foreground text-center" style={{ letterSpacing: '1px' }}>
                天津中医药大学
              </Text>
              <Text className="text-xl font-medium text-muted-foreground text-center" style={{ letterSpacing: '0.5px' }}>
                积分兑换 · 个性装扮
              </Text>
            </View>
          </View>

          {/* 积分余额卡片 */}
          <View className="bg-gradient-primary rounded-3xl p-7 mb-6 shadow-elegant">
            <View className="flex flex-col items-center space-y-3">
              <Text className="text-xl text-primary-foreground/80">我的积分</Text>
              <Text className="text-6xl font-extrabold text-primary-foreground">
                {stats?.total_points || 0}
              </Text>
              <Button
                className="bg-primary-foreground text-primary text-xl font-medium rounded-xl"
                onClick={handleNavigateToWeightLab}
              >
                <View className="py-3 px-6">
                  <Text>去打卡赚积分</Text>
                </View>
              </Button>
            </View>
          </View>

          {/* 标签切换 */}
          <View className="flex flex-row items-center space-x-3 mb-6">
            <View
              className={`flex-1 py-4 rounded-xl ${activeTab === 'shop' ? 'bg-primary' : 'bg-card'}`}
              onClick={() => setActiveTab('shop')}
            >
              <Text className={`text-2xl font-semibold text-center ${activeTab === 'shop' ? 'text-primary-foreground' : 'text-foreground'}`}>
                商城
              </Text>
            </View>
            <View
              className={`flex-1 py-4 rounded-xl ${activeTab === 'my' ? 'bg-primary' : 'bg-card'}`}
              onClick={() => setActiveTab('my')}
            >
              <Text className={`text-2xl font-semibold text-center ${activeTab === 'my' ? 'text-primary-foreground' : 'text-foreground'}`}>
                我的物品
              </Text>
            </View>
          </View>

          {/* 商城列表 */}
          {activeTab === 'shop' && (
            <View className="flex flex-col space-y-4">
              {allItems.map((item) => {
                const owned = userItemIds.has(item.id)
                return (
                  <View key={item.id} className="bg-card rounded-2xl p-6 border border-border">
                    <View className="flex flex-row items-center">
                      <View className={`${item.icon} text-5xl text-primary mr-4`} />
                      <View className="flex-1 flex flex-col space-y-2">
                        <View className="flex flex-row items-center">
                          <Text className="text-2xl font-semibold text-foreground mr-2">
                            {item.name}
                          </Text>
                          <View className="px-3 py-1 bg-muted rounded-lg">
                            <Text className="text-lg text-muted-foreground">
                              {getItemTypeText(item.type)}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xl text-muted-foreground leading-relaxed">
                          {item.description}
                        </Text>
                        <View className="flex flex-row items-center justify-between mt-2">
                          <View className="flex flex-row items-center">
                            <View className="i-mdi-coin text-2xl text-primary mr-1" />
                            <Text className="text-2xl font-bold text-primary">
                              {item.price}
                            </Text>
                          </View>
                          {owned ? (
                            <View className="px-4 py-2 bg-muted rounded-xl">
                              <Text className="text-lg font-medium text-muted-foreground">已拥有</Text>
                            </View>
                          ) : (
                            <Button
                              className="bg-primary text-primary-foreground text-xl font-medium rounded-xl"
                              onClick={() => handlePurchase(item)}
                            >
                              <View className="py-2 px-4">
                                <Text>购买</Text>
                              </View>
                            </Button>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* 我的物品列表 */}
          {activeTab === 'my' && (
            <View className="flex flex-col space-y-4">
              {userItems.length === 0 ? (
                <View className="bg-card rounded-2xl p-10 border border-border">
                  <View className="flex flex-col items-center space-y-3">
                    <View className="i-mdi-package-variant text-6xl text-muted-foreground" />
                    <Text className="text-2xl font-semibold text-foreground text-center">
                      还没有物品
                    </Text>
                    <Text className="text-xl text-muted-foreground text-center leading-relaxed">
                      去商城看看吧～
                    </Text>
                  </View>
                </View>
              ) : (
                userItems.map((item) => (
                  <View key={item.id} className={`rounded-2xl p-6 border ${item.is_active ? 'bg-gradient-primary border-primary' : 'bg-card border-border'}`}>
                    <View className="flex flex-row items-center">
                      <View className={`${item.icon} text-5xl mr-4 ${item.is_active ? 'text-primary-foreground' : 'text-primary'}`} />
                      <View className="flex-1 flex flex-col space-y-2">
                        <View className="flex flex-row items-center">
                          <Text className={`text-2xl font-semibold mr-2 ${item.is_active ? 'text-primary-foreground' : 'text-foreground'}`}>
                            {item.name}
                          </Text>
                          {item.is_active && (
                            <View className="px-3 py-1 bg-primary-foreground/20 rounded-lg">
                              <Text className="text-lg text-primary-foreground font-medium">使用中</Text>
                            </View>
                          )}
                        </View>
                        <Text className={`text-xl leading-relaxed ${item.is_active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {item.description}
                        </Text>
                        <View className="mt-2">
                          <Button
                            className={`text-xl font-medium rounded-xl ${item.is_active ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'}`}
                            onClick={() => handleToggleActive(item)}
                          >
                            <View className="py-2 px-4">
                              <Text>{item.is_active ? '取消使用' : '使用'}</Text>
                            </View>
                          </Button>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
