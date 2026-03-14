const pages = [
  'pages/home/index',
  'pages/constitution-test/index',
  'pages/food-recommend/index',
  'pages/delivery-express/index',
  'pages/ai-advisor/index',
  'pages/dish-analysis/index',
  'pages/membership/index',
  'pages/order-detail/index',
  'pages/my-orders/index',
  'pages/address-manage/index',
  'pages/courier-center/index',
  'pages/courier-order/index',
  'pages/payment/index',
  'pages/points-ranking/index',
  'pages/weight-lab/index',
  'pages/points-shop/index',
  'pages/dormitory-challenge/index',
  'pages/delivery-publish/index',
  'pages/delivery-my-orders/index',
  'pages/delivery-order-detail/index',
  'pages/delivery-verification/index'
]

export default defineAppConfig({
  pages,
  tabBar: {
    color: '#6B7280',
    selectedColor: '#16A34A',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/constitution-test/index',
        text: '体质测试',
        iconPath: './assets/icons/constitution_unselected.png',
        selectedIconPath: './assets/icons/constitution_selected.png'
      },
      {
        pagePath: 'pages/food-recommend/index',
        text: '天中饮食',
        iconPath: './assets/icons/food_unselected.png',
        selectedIconPath: './assets/icons/food_selected.png'
      },
      {
        pagePath: 'pages/weight-lab/index',
        text: '健康实验室',
        iconPath: './assets/icons/weight_lab_unselected.png',
        selectedIconPath: './assets/icons/weight_lab_selected.png'
      },
      {
        pagePath: 'pages/delivery-express/index',
        text: '饮食速递',
        iconPath: './assets/icons/hand-meal_unselected.png',
        selectedIconPath: './assets/icons/hand-meal_selected.png'
      },
      {
        pagePath: 'pages/ai-advisor/index',
        text: 'AI健康顾问',
        iconPath: './assets/icons/ai_advisor_unselected.png',
        selectedIconPath: './assets/icons/ai_advisor_selected.png'
      }
    ]
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#16A34A',
    navigationBarTitleText: '智体云衡',
    navigationBarTextStyle: 'white'
  }
})
