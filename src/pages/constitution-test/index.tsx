import { View, Text, Picker, Input, Image, Button } from '@tarojs/components'
import { useState, useCallback, useEffect } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, showToast, navigateTo, useDidShow } from '@tarojs/taro'
import { useTabBarPageClass } from '@/hooks/useTabBarPageClass'
import { getAllConstitutionTypes, getConstitutionTypeByName } from '@/db/api'
import type { ConstitutionType } from '@/db/types'
import { withRouteGuard } from '@/components/RouteGuard'
import { calculateBMI, getBMICategory, getExerciseRecommendation } from '@/utils/bmi'
import { saveUserConstitution, type UserConstitutionData } from '@/utils/storage'
import CheckInButton from '@/components/CheckInButton'

function ConstitutionTest() {
  useTabBarPageClass()
  useShareAppMessage(() => ({ title: '体质测试 - 智体云衡' }))
  useShareTimeline(() => ({ title: '体质测试 - 智体云衡' }))

  const [hasTested, setHasTested] = useState<boolean | null>(null)
  const [constitutionTypes, setConstitutionTypes] = useState<ConstitutionType[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedConstitution, setSelectedConstitution] = useState<ConstitutionType | null>(null)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [bmi, setBmi] = useState(0)
  const [showResults, setShowResults] = useState(false)

  // 加载体质类型数据
  const loadConstitutionTypes = useCallback(async () => {
    const types = await getAllConstitutionTypes()
    setConstitutionTypes(types)
  }, [])

  useEffect(() => {
    loadConstitutionTypes()
  }, [loadConstitutionTypes])

  const handleTestChoice = (tested: boolean) => {
    setHasTested(tested)
    setShowResults(false)
  }

  const handleConstitutionChange = (e: any) => {
    const index = Number(e.detail.value)
    setSelectedIndex(index)
  }

  const handleWeightChange = (e: any) => {
    setWeight(e.detail.value)
  }

  const handleHeightChange = (e: any) => {
    setHeight(e.detail.value)
  }

  const handleSubmit = async () => {
    if (constitutionTypes.length === 0) {
      showToast({ title: '数据加载中，请稍候', icon: 'none' })
      return
    }

    const selectedType = constitutionTypes[selectedIndex]
    if (!selectedType) {
      showToast({ title: '请选择体质类型', icon: 'none' })
      return
    }

    const weightNum = Number.parseFloat(weight)
    const heightNum = Number.parseFloat(height)

    if (!weightNum || weightNum <= 0 || weightNum > 300) {
      showToast({ title: '请输入有效的体重（1-300kg）', icon: 'none' })
      return
    }

    if (!heightNum || heightNum <= 0 || heightNum > 250) {
      showToast({ title: '请输入有效的身高（1-250cm）', icon: 'none' })
      return
    }

    const calculatedBMI = calculateBMI(weightNum, heightNum)
    setBmi(calculatedBMI)
    setSelectedConstitution(selectedType)
    setShowResults(true)

    // 保存用户体质数据到本地存储
    const userData: UserConstitutionData = {
      constitutionType: selectedType.name,
      weight: weightNum,
      height: heightNum,
      bmi: calculatedBMI,
      testDate: new Date().toISOString()
    }
    saveUserConstitution(userData)

    showToast({ title: '分析完成', icon: 'success' })
  }

  const bmiCategory = bmi > 0 ? getBMICategory(bmi) : null
  const exerciseRecommendation = bmi > 0 ? getExerciseRecommendation(bmi) : ''

  return (
    <View className="min-h-screen bg-background">
      <View className="w-full px-4 py-6">
        {/* 顶部：返回首页按钮 + 签到按钮 */}
        <View className="flex flex-row items-center justify-between mb-6">
          <View
            className="flex flex-row items-center bg-card rounded-full px-5 py-2 border border-border shadow-sm"
            onClick={() => navigateTo({ url: '/pages/home/index' })}
          >
            <View className="i-mdi-home text-2xl text-primary mr-1" />
            <Text className="text-xl font-medium text-foreground">首页</Text>
          </View>
          
          <CheckInButton onPointsUpdate={() => {}} />
        </View>

        {/* 学校专业背书 */}
        <View className="bg-gradient-deep rounded-3xl p-8 mb-6 shadow-medium">
          <View className="flex flex-col items-center space-y-4">
            <Image
              src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a354990-fbb2-4357-82aa-0c94b6fde357.jpg"
              mode="aspectFit"
              className="w-64 h-64"
              style={{ backgroundColor: 'transparent' }}
            />
            <Text className="text-3xl font-extrabold text-primary-foreground text-center" style={{ letterSpacing: '2px' }}>
              中医体质辨识
            </Text>
            <Text className="text-2xl font-bold text-primary-foreground/95 text-center" style={{ letterSpacing: '1px' }}>
              天津中医药大学
            </Text>
            <Text className="text-xl font-medium text-primary-foreground/90 text-center" style={{ letterSpacing: '0.5px' }}>
              专业指导 · 权威认证
            </Text>
          </View>
        </View>

        {/* 步骤1：询问是否做过测试 */}
        {hasTested === null && (
          <View className="bg-card rounded-2xl p-6 border border-border">
            <View className="flex flex-col items-center space-y-4">
              <View className="i-mdi-help-circle text-6xl text-primary" />
              <Text className="text-2xl font-semibold text-foreground">
                您是否做过体质测试？
              </Text>
              <View className="flex flex-col gap-3 w-full mt-4">
                <Button
                  className="w-full text-primary-foreground text-xl font-medium rounded-xl btn-deep-green bg-[#63a948f2] bg-none"
                  onClick={() => handleTestChoice(false)}
                >
                  <View className="py-4">
                    <Text>我需要测试</Text>
                  </View>
                </Button>
                <Button
                  className="w-full bg-card text-foreground border border-border text-xl rounded-xl"
                  onClick={() => handleTestChoice(true)}
                >
                  <View className="py-4">
                    <Text>我已经知道体质类型</Text>
                  </View>
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* 步骤2：未做过测试 - 显示二维码 */}
        {hasTested === false && (
          <View className="bg-card rounded-2xl p-6 border border-border">
            <View className="flex flex-col items-center space-y-4">
              <View className="i-mdi-qrcode-scan text-5xl text-primary" />
              <Text className="text-2xl font-semibold text-foreground">
                扫描二维码完成测试
              </Text>
              <Text className="text-xl text-muted-foreground text-center">
                请点击下方二维码查看大图，长按识别进入测试
              </Text>
              <View 
                className="w-64 h-64 bg-muted rounded-xl flex flex-col items-center justify-center my-4"
                onClick={() => {
                  // 点击二维码预览，预览模式下可以长按识别
                  Taro.previewImage({
                    urls: ['https://miaoda-conversation-file.cdn.bcebos.com/user-9vb194n0joqo/conv-9vb1brdn5tkw/20260225/file-9vc9pyevltkw.jpg'],
                    current: 'https://miaoda-conversation-file.cdn.bcebos.com/user-9vb194n0joqo/conv-9vb1brdn5tkw/20260225/file-9vc9pyevltkw.jpg'
                  })
                }}
              >
                <Image
                  src="https://miaoda-conversation-file.cdn.bcebos.com/user-9vb194n0joqo/conv-9vb1brdn5tkw/20260225/file-9vc9pyevltkw.jpg"
                  className="w-full h-full"
                  mode="aspectFit"
                />
              </View>
              <View className="bg-primary/10 rounded-xl p-4 w-full">
                <View className="flex flex-col space-y-2">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-information text-xl text-primary mr-2" />
                    <Text className="text-xl font-semibold text-primary">使用说明</Text>
                  </View>
                  <Text className="text-xl text-foreground leading-relaxed">
                    1. 点击上方二维码查看大图
                  </Text>
                  <Text className="text-xl text-foreground leading-relaxed">
                    2. 长按二维码识别进入测试
                  </Text>
                  <Text className="text-xl text-foreground leading-relaxed">
                    3. 完成测试后返回此页面
                  </Text>
                </View>
              </View>
              <Button
                className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl mt-4"
                onClick={() => setHasTested(true)}
              >
                <View className="py-4">
                  <Text>我已完成测试</Text>
                </View>
              </Button>
            </View>
          </View>
        )}

        {/* 步骤3：选择体质类型和输入体格数据 */}
        {hasTested === true && !showResults && (
          <View className="flex flex-col space-y-4">
            {/* 体质类型选择 */}
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-account-heart text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">选择体质类型</Text>
              </View>
              <Picker
                mode="selector"
                range={constitutionTypes.map(t => t.name)}
                value={selectedIndex}
                onChange={handleConstitutionChange}
              >
                <View className="bg-input rounded-xl border border-border px-4 py-4">
                  <View className="flex flex-row items-center justify-between">
                    <Text className="text-xl text-foreground">
                      {constitutionTypes[selectedIndex]?.name || '请选择体质类型'}
                    </Text>
                    <View className="i-mdi-chevron-down text-2xl text-muted-foreground" />
                  </View>
                </View>
              </Picker>
              {constitutionTypes[selectedIndex] && (
                <View className="mt-4 p-4 bg-muted rounded-xl">
                  <Text className="text-xl text-foreground leading-relaxed">
                    {constitutionTypes[selectedIndex].description}
                  </Text>
                </View>
              )}
            </View>

            {/* 体格测量 */}
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-human-male-height text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">体格测量</Text>
              </View>
              <View className="flex flex-col space-y-4">
                <View className="flex flex-col space-y-2">
                  <Text className="text-xl text-foreground">体重（kg）</Text>
                  <View className="bg-input rounded-xl border border-border px-4 py-4">
                    <Input
                      type="digit"
                      placeholder="请输入体重"
                      value={weight}
                      onInput={handleWeightChange}
                      className="text-xl text-foreground"
                    />
                  </View>
                </View>
                <View className="flex flex-col space-y-2">
                  <Text className="text-xl text-foreground">身高（cm）</Text>
                  <View className="bg-input rounded-xl border border-border px-4 py-4">
                    <Input
                      type="digit"
                      placeholder="请输入身高"
                      value={height}
                      onInput={handleHeightChange}
                      className="text-xl text-foreground"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* 提交按钮 */}
            <Button
              className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl"
              onClick={handleSubmit}
            >
              <View className="py-4">
                <Text>生成健康建议</Text>
              </View>
            </Button>
          </View>
        )}

        {/* 步骤4：显示结果 */}
        {showResults && selectedConstitution && bmiCategory && (
          <View className="flex flex-col space-y-4">
            {/* 成功提示 */}
            <View className="bg-primary/10 rounded-2xl p-4 border-2 border-primary">
              <View className="flex flex-row items-center">
                <View className="i-mdi-check-circle text-2xl text-primary mr-2" />
                <Text className="text-xl text-primary font-semibold">
                  体质测试已完成！现在可以查看个性化饮食推荐
                </Text>
              </View>
            </View>

            {/* BMI结果 */}
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-chart-line text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">BMI分析</Text>
              </View>
              <View className="flex flex-col items-center space-y-3 py-4">
                <Text className="text-5xl font-bold text-primary">{bmi}</Text>
                <Text className={`text-2xl font-semibold ${bmiCategory.color}`}>
                  {bmiCategory.category}
                </Text>
                <Text className="text-xl text-muted-foreground text-center">
                  {bmiCategory.description}
                </Text>
              </View>
            </View>

            {/* 体质特征 */}
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-account-details text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">
                  {selectedConstitution.name}特征
                </Text>
              </View>
              <Text className="text-xl text-foreground leading-relaxed">
                {selectedConstitution.description}
              </Text>
            </View>

            {/* 饮食建议 */}
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-food-apple text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">饮食建议</Text>
              </View>
              <View className="flex flex-col space-y-4">
                <View className="flex flex-col space-y-2">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-check-circle text-xl text-primary mr-2" />
                    <Text className="text-xl font-semibold text-foreground">适宜食用</Text>
                  </View>
                  <Text className="text-xl text-foreground leading-relaxed pl-7">
                    {selectedConstitution.suitable_foods}
                  </Text>
                </View>
                <View className="flex flex-col space-y-2">
                  <View className="flex flex-row items-center">
                    <View className="i-mdi-close-circle text-xl text-destructive mr-2" />
                    <Text className="text-xl font-semibold text-foreground">避免食用</Text>
                  </View>
                  <Text className="text-xl text-foreground leading-relaxed pl-7">
                    {selectedConstitution.avoid_foods}
                  </Text>
                </View>
              </View>
            </View>

            {/* 运动建议 */}
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-run text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">运动建议</Text>
              </View>
              <View className="flex flex-col space-y-4">
                <View className="flex flex-col space-y-2">
                  <Text className="text-xl font-semibold text-foreground">
                    根据体质推荐
                  </Text>
                  <Text className="text-xl text-foreground leading-relaxed">
                    {selectedConstitution.recommended_exercises}
                  </Text>
                </View>
                <View className="flex flex-col space-y-2">
                  <Text className="text-xl font-semibold text-foreground">
                    根据BMI推荐
                  </Text>
                  <Text className="text-xl text-foreground leading-relaxed">
                    {exerciseRecommendation}
                  </Text>
                </View>
              </View>
            </View>

            {/* 重新测试按钮 */}
            <Button
              className="w-full bg-card text-foreground border border-border text-xl rounded-xl"
              onClick={() => {
                setHasTested(null)
                setShowResults(false)
                setWeight('')
                setHeight('')
                setBmi(0)
              }}
            >
              <View className="py-4">
                <Text>重新测试</Text>
              </View>
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

export default withRouteGuard(ConstitutionTest)
