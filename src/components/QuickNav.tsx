import { View, Text, Button } from '@tarojs/components'
import { navigateTo, switchTab } from '@tarojs/taro'

// 快捷导航组件
export default function QuickNav() {
  const navItems = [
    { icon: 'i-mdi-clipboard-text', text: '体质测试', url: '/pages/constitution-test/index', isTab: true },
    { icon: 'i-mdi-food', text: '天中饮食', url: '/pages/food-recommend/index', isTab: true },
    { icon: 'i-mdi-moped', text: '饮食速递', url: '/pages/delivery-express/index', isTab: true },
    { icon: 'i-mdi-robot', text: 'AI健康顾问', url: '/pages/ai-advisor/index', isTab: true },
    { icon: 'i-mdi-camera-plus', text: 'AI菜品分析', url: '/pages/dish-analysis/index', isTab: true },
    { icon: 'i-mdi-home', text: '首页', url: '/pages/home/index', isTab: false },
    { icon: 'i-mdi-crown', text: '会员中心', url: '/pages/membership/index', isTab: false },
    { icon: 'i-mdi-receipt-text', text: '我的订单', url: '/pages/my-orders/index', isTab: false },
    { icon: 'i-mdi-run-fast', text: '发布跑腿', url: '/pages/courier-order/index', isTab: false },
    { icon: 'i-mdi-bike-fast', text: '接单中心', url: '/pages/courier-center/index', isTab: false }
  ]

  const handleNav = (url: string, isTab: boolean) => {
    if (isTab) {
      switchTab({ url })
    } else {
      navigateTo({ url })
    }
  }

  return (
    <View className="bg-card rounded-2xl p-4 shadow-lg">
      <View className="flex flex-row items-center mb-3">
        <View className="i-mdi-navigation text-xl text-primary mr-2" />
        <Text className="text-xl font-semibold text-foreground">快捷导航</Text>
      </View>
      <View className="flex flex-row flex-wrap gap-2">
        {navItems.map((item, index) => (
          <Button
            key={index}
            className="bg-muted text-foreground text-xl rounded-xl"
            style={{ width: 'calc(33.333% - 6px)' }}
            onClick={() => handleNav(item.url, item.isTab)}
          >
            <View className="py-3 flex flex-col items-center justify-center space-y-1">
              <View className={`${item.icon} text-2xl text-primary`} />
              <Text className="text-base">{item.text}</Text>
            </View>
          </Button>
        ))}
      </View>
    </View>
  )
}
