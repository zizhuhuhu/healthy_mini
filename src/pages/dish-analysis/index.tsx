import { View, Text, ScrollView, Image, Input, Button, RichText } from '@tarojs/components'
import { useState, useCallback } from 'react'
import Taro, { useShareAppMessage, useShareTimeline, chooseImage, showToast, navigateTo, switchTab } from '@tarojs/taro'
import { getUserConstitution, hasCompletedTest } from '@/utils/storage'
import { imageToBase64, compressImage } from '@/utils/imageUtils'
import { sendChatStream } from 'miaoda-taro-utils/chatStream'
import { saveDishAnalysisRecord } from '@/db/api'
import CheckInButton from '@/components/CheckInButton'

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL

export default function DishAnalysis() {
  useShareAppMessage(() => ({ title: 'AI菜品分析 - 智体云衡' }))
  useShareTimeline(() => ({ title: 'AI菜品分析 - 智体云衡' }))

  const [imageUrl, setImageUrl] = useState<string>('')
  const [dishName, setDishName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [flavor, setFlavor] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const [showResult, setShowResult] = useState(false)

  // 选择图片
  const handleChooseImage = useCallback(async () => {
    try {
      const res = await chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        setImageUrl(res.tempFilePaths[0])
        showToast({
          title: '图片已选择',
          icon: 'success',
          duration: 1500
        })
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      showToast({
        title: '选择图片失败',
        icon: 'none',
        duration: 2000
      })
    }
  }, [])

  // 开始分析
  const handleAnalyze = useCallback(async () => {
    // 验证输入
    if (!imageUrl) {
      showToast({
        title: '请先选择菜品图片',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!dishName.trim()) {
      showToast({
        title: '请输入菜品名称',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!ingredients.trim()) {
      showToast({
        title: '请输入菜品组成',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (!flavor.trim()) {
      showToast({
        title: '请输入菜品口味',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 检查是否完成体质测试
    if (!hasCompletedTest()) {
      showToast({
        title: '请先完成体质测试',
        icon: 'none',
        duration: 2000
      })
      return
    }

    const userData = getUserConstitution()
    if (!userData) {
      showToast({
        title: '无法获取用户信息',
        icon: 'none',
        duration: 2000
      })
      return
    }

    setAnalyzing(true)
    setAnalysisResult('')
    setShowResult(false)

    try {
      // 1. 压缩图片
      const compressedPath = await compressImage(imageUrl, 0.8)

      // 2. 转换为 Base64
      const base64Image = await imageToBase64(compressedPath)

      // 3. 构建分析提示词
      const analysisPrompt = `请分析以下菜品的营养信息和体质适配度：

菜品名称：${dishName}
主要成分：${ingredients}
口味：${flavor}
用户体质：${userData.constitutionType}
用户BMI：${userData.bmi.toFixed(1)}

请提供以下信息：
1. 每100g热量（千卡）
2. 9种中医体质的适配度（0-100%）：气虚质、阳虚质、阴虚质、痰湿质、湿热质、血瘀质、气郁质、特禀质、平和质
3. 是否适合该用户食用
4. 详细分析说明

请用清晰的格式返回，包含具体数值和建议。`

      let fullResponse = ''

      // 4. 发送流式请求
      sendChatStream({
        endpoint: `${supabaseUrl}/functions/v1/ai-dish-analysis`,
        appId: '',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        onUpdate: (rawData: string) => {
          try {
            if (rawData !== '[DONE]') {
              const data = JSON.parse(rawData)
              const content = data.choices?.[0]?.delta?.content || ''
              fullResponse += content
              setAnalysisResult(fullResponse)
            }
          } catch (e) {
            console.error('解析流数据失败:', e)
          }
        },
        onComplete: async () => {
          setAnalyzing(false)
          setShowResult(true)

          // 保存分析记录到数据库
          try {
            await saveDishAnalysisRecord({
              user_id: 'test_user_001',
              dish_image_url: imageUrl,
              dish_name: dishName,
              ingredients,
              flavor,
              calories_per_100g: null,
              constitution_compatibility: null,
              is_suitable: null,
              analysis_result: fullResponse
            })
          } catch (error) {
            console.error('保存分析记录失败:', error)
          }

          showToast({
            title: '分析完成',
            icon: 'success',
            duration: 2000
          })
        },
        onError: (error: Error) => {
          console.error('分析出错:', error)
          setAnalyzing(false)
          showToast({
            title: 'AI分析失败，请重试',
            icon: 'none',
            duration: 2000
          })
        }
      })
    } catch (error) {
      console.error('图片处理失败:', error)
      setAnalyzing(false)
      showToast({
        title: '图片处理失败',
        icon: 'none',
        duration: 2000
      })
    }
  }, [imageUrl, dishName, ingredients, flavor])

  // 重置表单
  const handleReset = useCallback(() => {
    setImageUrl('')
    setDishName('')
    setIngredients('')
    setFlavor('')
    setAnalysisResult('')
    setShowResult(false)
  }, [])

  return (
    <View className="min-h-screen bg-background">
      <ScrollView className="w-full" scrollY>
        <View className="px-4 py-6">
          {/* 顶部：返回首页按钮 + 签到按钮 */}
          <View className="flex flex-row items-center justify-between mb-6">
            <View
              className="flex flex-row items-center bg-card rounded-full px-5 py-2 border border-border shadow-sm"
              onClick={() => switchTab({ url: '/pages/home/index' })}
            >
              <View className="i-mdi-home text-2xl text-primary mr-1" />
              <Text className="text-xl font-medium text-foreground">首页</Text>
            </View>
            
            <CheckInButton onPointsUpdate={() => {}} />
          </View>

          {/* 学校AI分析标识 */}
          <View className="glass rounded-3xl p-7 mb-6 shadow-soft">
            <View className="flex flex-col items-center space-y-3">
              <Image
                src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a354990-fbb2-4357-82aa-0c94b6fde357.jpg"
                mode="aspectFit"
                className="w-64 h-64"
                style={{ backgroundColor: 'transparent' }}
              />
              <Text className="text-3xl font-extrabold text-foreground text-center" style={{ letterSpacing: '2px' }}>
                AI菜品分析
              </Text>
              <Text className="text-xl font-bold text-muted-foreground text-center" style={{ letterSpacing: '1px' }}>
                天津中医药大学
              </Text>
              <Text className="text-xl font-medium text-muted-foreground text-center" style={{ letterSpacing: '0.5px' }}>
                智能识别 · 营养分析
              </Text>
            </View>
          </View>

          {/* 功能介绍 */}
          <View className="bg-card rounded-2xl p-6 mb-6 border border-border">
            <View className="flex flex-col items-center space-y-3">
              <View className="i-mdi-camera-plus text-6xl text-primary" />
              <Text className="text-3xl font-bold text-foreground">AI菜品分析</Text>
              <Text className="text-xl text-muted-foreground text-center leading-relaxed">
                拍照上传菜品，AI智能分析热量和体质适配度
              </Text>
            </View>
          </View>

          {/* 图片上传区域 */}
          <View className="bg-card rounded-2xl p-6 mb-4 border border-border">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-image text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">菜品照片</Text>
            </View>

            {!imageUrl ? (
              <View
                className="w-full h-64 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border"
                onClick={handleChooseImage}
              >
                <View className="i-mdi-camera-plus text-6xl text-muted-foreground mb-3" />
                <Text className="text-xl text-muted-foreground">点击拍照或选择图片</Text>
              </View>
            ) : (
              <View className="relative">
                <Image
                  src={imageUrl}
                  className="w-full h-64 rounded-xl"
                  mode="aspectFill"
                />
                <View
                  className="absolute top-2 right-2 w-10 h-10 bg-destructive rounded-full flex flex-col items-center justify-center"
                  onClick={() => setImageUrl('')}
                >
                  <View className="i-mdi-close text-2xl text-destructive-foreground" />
                </View>
              </View>
            )}
          </View>

          {/* 菜品信息输入 */}
          <View className="bg-card rounded-2xl p-6 mb-4 border border-border">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-text-box text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">菜品信息</Text>
            </View>

            <View className="flex flex-col space-y-4">
              {/* 菜品名称 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground">菜品名称</Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Input
                    className="w-full text-xl text-foreground"
                    placeholder="例如：宫保鸡丁"
                    value={dishName}
                    onInput={(e) => setDishName(e.detail.value)}
                  />
                </View>
              </View>

              {/* 菜品组成 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground">主要成分</Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Input
                    className="w-full text-xl text-foreground"
                    placeholder="例如：鸡肉、花生、辣椒、葱姜蒜"
                    value={ingredients}
                    onInput={(e) => setIngredients(e.detail.value)}
                  />
                </View>
              </View>

              {/* 口味 */}
              <View className="flex flex-col space-y-2">
                <Text className="text-xl text-foreground">口味特点</Text>
                <View className="bg-input rounded-xl border border-border px-4 py-3">
                  <Input
                    className="w-full text-xl text-foreground"
                    placeholder="例如：麻辣、咸鲜、微甜"
                    value={flavor}
                    onInput={(e) => setFlavor(e.detail.value)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 操作按钮 */}
          <View className="flex flex-col gap-3 mb-4">
            <Button
              className="w-full text-primary-foreground text-xl font-medium rounded-xl bg-[#63a948] bg-none"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              <View className="py-4 flex flex-row items-center justify-center">
                {analyzing && (
                  <View className="i-mdi-loading animate-spin text-2xl mr-2" />
                )}
                <Text>{analyzing ? '分析中...' : '开始AI分析'}</Text>
              </View>
            </Button>

            <Button
              className="w-full bg-card text-foreground border border-border text-xl rounded-xl"
              onClick={handleReset}
            >
              <View className="py-4">
                <Text>重置</Text>
              </View>
            </Button>
          </View>

          {/* 分析结果 */}
          {showResult && analysisResult && (
            <View className="bg-card rounded-2xl p-6 mb-4 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-chart-box text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">分析结果</Text>
              </View>
              <View className="bg-muted rounded-xl p-4">
                <RichText
                  nodes={analysisResult.replace(/\n/g, '<br/>')}
                  className="text-xl text-foreground leading-relaxed"
                />
              </View>
            </View>
          )}

          {/* 正在分析提示 */}
          {analyzing && analysisResult && (
            <View className="bg-card rounded-2xl p-6 mb-4 border border-border">
              <View className="flex flex-row items-center mb-4">
                <View className="i-mdi-loading animate-spin text-2xl text-primary mr-2" />
                <Text className="text-2xl font-semibold text-foreground">AI正在分析...</Text>
              </View>
              <View className="bg-muted rounded-xl p-4">
                <RichText
                  nodes={analysisResult.replace(/\n/g, '<br/>')}
                  className="text-xl text-foreground leading-relaxed"
                />
              </View>
            </View>
          )}

          {/* 功能说明 */}
          <View className="bg-card rounded-2xl p-6 mb-4">
            <View className="flex flex-row items-center mb-4">
              <View className="i-mdi-information text-2xl text-primary mr-2" />
              <Text className="text-2xl font-semibold text-foreground">分析内容</Text>
            </View>
            <View className="flex flex-col space-y-3">
              <View className="flex flex-row items-start">
                <View className="i-mdi-check-circle text-xl text-primary mr-2 mt-1" />
                <Text className="flex-1 text-xl text-foreground leading-relaxed">
                  每100g热量分析（千卡）
                </Text>
              </View>
              <View className="flex flex-row items-start">
                <View className="i-mdi-check-circle text-xl text-primary mr-2 mt-1" />
                <Text className="flex-1 text-xl text-foreground leading-relaxed">
                  9种体质适配度评分（0-100%）
                </Text>
              </View>
              <View className="flex flex-row items-start">
                <View className="i-mdi-check-circle text-xl text-primary mr-2 mt-1" />
                <Text className="flex-1 text-xl text-foreground leading-relaxed">
                  是否适合您的体质食用
                </Text>
              </View>
              <View className="flex flex-row items-start">
                <View className="i-mdi-check-circle text-xl text-primary mr-2 mt-1" />
                <Text className="flex-1 text-xl text-foreground leading-relaxed">
                  详细的营养分析和建议
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
