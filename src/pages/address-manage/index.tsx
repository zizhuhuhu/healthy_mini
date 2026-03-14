import { View, Text } from '@tarojs/components'
import { useShareAppMessage, useShareTimeline } from '@tarojs/taro'

export default function AddressManage() {
  useShareAppMessage(() => ({ title: '地址管理 - 智体云衡' }))
  useShareTimeline(() => ({ title: '地址管理 - 智体云衡' }))

  return (
    <View className="min-h-screen bg-gradient-subtle">
      <View className="px-4 py-6">
        <Text className="text-2xl text-foreground">地址管理</Text>
      </View>
    </View>
  )
}
