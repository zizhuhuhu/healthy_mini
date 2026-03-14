import { View, Text, ScrollView, Button, Input, RichText, Image } from '@tarojs/components'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useShareAppMessage, useShareTimeline, navigateTo, switchTab, showToast } from '@tarojs/taro'
import { getUserConstitution, hasCompletedTest } from '@/utils/storage'
import { checkUserMembership } from '@/db/api'
import { sendChatStream } from 'miaoda-taro-utils/chatStream'
import QuickNav from '@/components/QuickNav'
import CheckInButton from '@/components/CheckInButton'

const supabaseUrl = process.env.TARO_APP_SUPABASE_URL

// 根据体质类型推荐问题
const getRecommendedQuestions = (constitutionType: string): string[] => {
  const commonQuestions = [
    '我的体质适合吃什么食物？',
    '我应该避免哪些食物？',
    '适合我的运动方式有哪些？',
    '如何改善我的体质？'
  ]

  const specificQuestions: Record<string, string[]> = {
    '气虚质': ['如何增强体质？', '适合吃什么补气食物？', '容易疲劳怎么办？'],
    '阳虚质': ['如何改善怕冷？', '适合什么温补食物？', '冬天如何保暖？'],
    '阴虚质': ['如何缓解口干？', '适合吃什么滋阴食物？', '晚上睡不好怎么办？'],
    '痰湿质': ['如何减肥？', '适合吃什么祛湿食物？', '如何改善水肿？'],
    '湿热质': ['如何清热？', '需要避免什么食物？', '如何改善口苦？'],
    '血瘀质': ['如何活血？', '适合什么运动？', '如何改善气色？'],
    '气郁质': ['如何调节情绪？', '适合吃什么疏肝食物？', '如何缓解压力？'],
    '特禀质': ['如何预防过敏？', '需要注意什么？', '如何增强免疫力？'],
    '平和质': ['如何保持健康？', '日常饮食建议？', '如何预防疾病？']
  }

  return [...(specificQuestions[constitutionType] || []), ...commonQuestions].slice(0, 6)
}

export default function AIAdvisor() {
  useShareAppMessage(() => ({ title: 'AI健康顾问 - 智体云衡' }))
  useShareTimeline(() => ({ title: 'AI健康顾问 - 智体云衡' }))

  const [hasTest, setHasTest] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chatStarted, setChatStarted] = useState(false)
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>>([])
  const [inputText, setInputText] = useState('')
  const [isResponding, setIsResponding] = useState(false)
  const [recommendedQuestions, setRecommendedQuestions] = useState<string[]>([])
  
  // 使用ref保存当前AI回复的完整内容
  const currentResponseRef = useRef('')
  // 使用state显示正在生成的内容
  const [streamingContent, setStreamingContent] = useState('')

  // 检查用户状态
  const checkStatus = useCallback(async () => {
    setLoading(true)

    // 检查是否完成体质测试
    const completed = hasCompletedTest()
    setHasTest(completed)

    if (!completed) {
      setLoading(false)
      return
    }

    // 检查会员状态（使用测试用户ID）
    const userData = getUserConstitution()
    const userId = 'test_user_001' // 实际应用中应该使用真实的用户ID
    const membership = await checkUserMembership(userId)
    setIsMember(membership?.is_active || false)

    setLoading(false)
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleGoToTest = () => {
    navigateTo({ url: '/pages/constitution-test/index' })
  }

  const handleOpenMembership = () => {
    navigateTo({ url: '/pages/membership/index' })
  }

  const handleStartChat = () => {
    const userData = getUserConstitution()
    if (!userData) {
      showToast({
        title: '无法获取用户信息',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 构建系统提示词
    const systemMessage = {
      role: 'system' as const,
      content: `你是一位精通中医体质学和体重管理的健康顾问。
用户信息：
- 体质类型：${userData.constitutionType}
- BMI：${userData.bmi.toFixed(1)}
- 身高：${userData.height}cm
- 体重：${userData.weight}kg

请根据用户的体质特点和健康数据，提供专业的健康建议。回答要简洁明了，重点突出。`
    }

    // 生成推荐问题
    const questions = getRecommendedQuestions(userData.constitutionType)
    setRecommendedQuestions(questions)

    setMessages([systemMessage])
    setChatStarted(true)
  }

  // 发送消息（支持直接传入问题文本）
  const handleSendMessage = useCallback((questionText?: string) => {
    const textToSend = questionText || inputText.trim()
    
    if (!textToSend || isResponding) {
      return
    }

    const userMessage = {
      role: 'user' as const,
      content: textToSend
    }

    // 添加用户消息
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputText('')
    setIsResponding(true)
    
    // 重置ref和streaming state
    currentResponseRef.current = ''
    setStreamingContent('')

    // 调用AI
    sendChatStream({
      endpoint: `${supabaseUrl}/functions/v1/ai-health-advisor`,
      appId: '',
      messages: newMessages,
      onUpdate: (rawData: string) => {
        try {
          if (rawData !== '[DONE]') {
            const data = JSON.parse(rawData)
            const content = data.choices?.[0]?.delta?.content || ''
            // 累积到ref中
            currentResponseRef.current += content
            // 更新流式显示内容
            setStreamingContent(currentResponseRef.current)
          }
        } catch (e) {
          console.error('解析流数据失败:', e)
        }
      },
      onComplete: () => {
        setIsResponding(false)
        // 使用ref中保存的完整内容添加到消息列表
        const finalContent = currentResponseRef.current
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: finalContent
        }])
        // 清空流式内容
        setStreamingContent('')
        currentResponseRef.current = ''
      },
      onError: (error: Error) => {
        console.error('AI回复出错:', error)
        setIsResponding(false)
        setStreamingContent('')
        currentResponseRef.current = ''
        showToast({
          title: 'AI回复失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    })
  }, [inputText, messages, isResponding])

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

          {/* 学校AI顾问标识 */}
          <View className="glass rounded-3xl p-7 mb-6 shadow-soft">
            <View className="flex flex-col items-center space-y-3">
              <Image
                src="https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2a354990-fbb2-4357-82aa-0c94b6fde357.jpg"
                mode="aspectFit"
                className="w-64 h-64"
                style={{ backgroundColor: 'transparent' }}
              />
              <Text className="text-3xl font-extrabold text-foreground text-center" style={{ letterSpacing: '2px' }}>
                AI健康顾问
              </Text>
              <Text className="text-xl font-bold text-muted-foreground text-center" style={{ letterSpacing: '1px' }}>
                天津中医药大学
              </Text>
              <Text className="text-xl font-medium text-muted-foreground text-center" style={{ letterSpacing: '0.5px' }}>
                智能问诊 · 专业指导
              </Text>
            </View>
          </View>

          {/* 功能介绍 */}
          <View className="rounded-2xl p-6 mb-6 bg-gradient-primary shadow-medium">
            <View className="flex flex-col items-center space-y-4">
              <View className="i-mdi-robot text-6xl text-primary-foreground" />
              <Text className="text-3xl font-bold text-primary-foreground" style={{ letterSpacing: '1px' }}>
                AI健康顾问
              </Text>
              <Text className="text-xl text-primary-foreground/90 text-center leading-relaxed">
                精通中医体质学和体重管理的专业AI助手，为您提供个性化的健康建议和饮食指导
              </Text>
            </View>
          </View>

          {/* 加载状态 */}
          {loading && (
            <View className="flex flex-col items-center py-12">
              <View className="i-mdi-loading animate-spin text-5xl text-primary mb-4" />
              <Text className="text-xl text-muted-foreground">加载中...</Text>
            </View>
          )}

          {/* 未完成测试提示 */}
          {!loading && !hasTest && (
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-col items-center space-y-4">
                <View className="i-mdi-alert-circle text-6xl text-amber-600" />
                <Text className="text-2xl font-semibold text-foreground">
                  请先完成体质测试
                </Text>
                <Text className="text-xl text-muted-foreground text-center">
                  AI健康顾问需要了解您的体质信息，才能提供个性化建议
                </Text>
                <Button
                  className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl mt-4"
                  onClick={handleGoToTest}
                >
                  <View className="py-4">
                    <Text>前往体质测试</Text>
                  </View>
                </Button>
              </View>
            </View>
          )}

          {/* 未开通会员提示 */}
          {!loading && hasTest && !isMember && (
            <View className="bg-card rounded-2xl p-6 border border-border">
              <View className="flex flex-col items-center space-y-4">
                <View className="i-mdi-crown text-6xl text-amber-600" />
                <Text className="text-2xl font-semibold text-foreground">
                  开通会员享受AI服务
                </Text>
                <Text className="text-xl text-muted-foreground text-center">
                  AI健康顾问是会员专享功能，开通后即可享受专业的健康咨询服务
                </Text>

                {/* 会员权益 */}
                <View className="w-full bg-muted rounded-xl p-4 mt-4">
                  <Text className="text-xl font-semibold text-foreground mb-3">会员权益</Text>
                  <View className="flex flex-col space-y-3">
                    <View className="flex flex-row items-start">
                      <View className="i-mdi-check-circle text-xl text-primary mr-2 mt-1" />
                      <Text className="flex-1 text-xl text-foreground">
                        24小时AI健康顾问在线咨询
                      </Text>
                    </View>
                    <View className="flex flex-row items-start">
                      <View className="i-mdi-check-circle text-xl text-primary mr-2 mt-1" />
                      <Text className="flex-1 text-xl text-foreground">
                        基于体质和BMI的个性化建议
                      </Text>
                    </View>
                    <View className="flex flex-row items-start">
                      <View className="i-mdi-check-circle text-xl text-primary mr-2 mt-1" />
                      <Text className="flex-1 text-xl text-foreground">
                        饮食、运动、作息全方位指导
                      </Text>
                    </View>
                    <View className="flex flex-row items-start">
                      <View className="i-mdi-check-circle text-xl text-primary mr-2 mt-1" />
                      <Text className="flex-1 text-xl text-foreground">
                        对话历史保存，随时查看
                      </Text>
                    </View>
                  </View>
                </View>

                <Button
                  className="w-full bg-primary text-primary-foreground text-xl font-medium rounded-xl mt-4"
                  onClick={handleOpenMembership}
                >
                  <View className="py-4">
                    <Text>立即开通会员</Text>
                  </View>
                </Button>
              </View>
            </View>
          )}

          {/* 已开通会员 - 显示对话界面 */}
          {!loading && hasTest && isMember && (
            <View className="flex flex-col space-y-4">
              {!chatStarted ? (
                <>
                  {/* 用户信息卡片 */}
                  <View className="bg-card rounded-2xl p-6 border border-border">
                    <View className="flex flex-row items-center mb-4">
                      <View className="i-mdi-account-circle text-3xl text-primary mr-2" />
                      <Text className="text-2xl font-semibold text-foreground">您的健康档案</Text>
                    </View>
                    <View className="flex flex-col space-y-2">
                      {(() => {
                        const userData = getUserConstitution()
                        if (!userData) return null
                        return (
                          <>
                            <View className="flex flex-row items-center justify-between">
                              <Text className="text-xl text-muted-foreground">体质类型</Text>
                              <Text className="text-xl font-semibold text-foreground">
                                {userData.constitutionType}
                              </Text>
                            </View>
                            <View className="flex flex-row items-center justify-between">
                              <Text className="text-xl text-muted-foreground">BMI指数</Text>
                              <Text className="text-xl font-semibold text-foreground">
                                {userData.bmi.toFixed(1)}
                              </Text>
                            </View>
                            <View className="flex flex-row items-center justify-between">
                              <Text className="text-xl text-muted-foreground">身高</Text>
                              <Text className="text-xl font-semibold text-foreground">
                                {userData.height} cm
                              </Text>
                            </View>
                            <View className="flex flex-row items-center justify-between">
                              <Text className="text-xl text-muted-foreground">体重</Text>
                              <Text className="text-xl font-semibold text-foreground">
                                {userData.weight} kg
                              </Text>
                            </View>
                          </>
                        )
                      })()}
                    </View>
                  </View>

                  {/* 开始对话按钮 */}
                  <View className="bg-card rounded-2xl p-6 border border-border">
                    <View className="flex flex-col items-center space-y-4">
                      <View className="i-mdi-chat text-6xl text-primary" />
                      <Text className="text-2xl font-semibold text-foreground">
                        开始AI健康咨询
                      </Text>
                      <Text className="text-xl text-muted-foreground text-center">
                        AI已了解您的体质和健康信息，随时为您提供专业建议
                      </Text>
                      <Button
                        className="w-full text-primary-foreground text-xl font-medium rounded-xl bg-[#63a948] bg-none"
                        onClick={handleStartChat}
                      >
                        <View className="py-4">
                          <Text>开始对话</Text>
                        </View>
                      </Button>
                    </View>
                  </View>

                  {/* 功能预览 */}
                  <View className="bg-card rounded-2xl p-6">
                    <View className="flex flex-row items-center mb-4">
                      <View className="i-mdi-information text-2xl text-primary mr-2" />
                      <Text className="text-2xl font-semibold text-foreground">AI可以帮您</Text>
                    </View>
                    <View className="flex flex-col space-y-3">
                      <Text className="text-xl text-foreground leading-relaxed">
                        • 根据您的{getUserConstitution()?.constitutionType}体质特点，推荐适合的食物和运动
                      </Text>
                      <Text className="text-xl text-foreground leading-relaxed">
                        • 分析您的BMI指数，提供体重管理建议
                      </Text>
                      <Text className="text-xl text-foreground leading-relaxed">
                        • 解答关于中医体质、饮食营养的各种问题
                      </Text>
                      <Text className="text-xl text-foreground leading-relaxed">
                        • 制定个性化的健康改善计划
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* 推荐问题（仅在没有消息时显示） */}
                  {messages.filter(msg => msg.role !== 'system').length === 0 && recommendedQuestions.length > 0 && (
                    <View className="bg-card rounded-2xl p-6 mb-4 border border-border">
                      <View className="flex flex-row items-center mb-4">
                        <View className="i-mdi-lightbulb text-2xl text-primary mr-2" />
                        <Text className="text-2xl font-semibold text-foreground">推荐问题</Text>
                      </View>
                      <View className="flex flex-col space-y-2">
                        {recommendedQuestions.map((question, index) => (
                          <Button
                            key={index}
                            className="w-full bg-primary/10 border border-primary/20 rounded-xl"
                            onClick={() => handleSendMessage(question)}
                            disabled={isResponding}
                          >
                            <View className="py-3 px-4 flex flex-row items-center justify-start">
                              <View className="i-mdi-chat-question text-xl text-primary mr-2" />
                              <Text className="flex-1 text-left text-xl text-foreground font-medium">{question}</Text>
                            </View>
                          </Button>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* 对话界面 */}
                  <View className="bg-card rounded-2xl p-4 border border-border mb-4" style={{ minHeight: '60vh' }}>
                    <ScrollView className="w-full" scrollY style={{ height: '50vh' }}>
                      <View className="flex flex-col space-y-4 pb-4">
                        {messages.filter(msg => msg.role !== 'system').map((msg, index) => (
                          <View
                            key={index}
                            className={`flex flex-row ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <View
                              className={`max-w-4/5 rounded-2xl p-4 ${
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground'
                              }`}
                            >
                              <RichText
                                nodes={msg.content.replace(/\n/g, '<br/>')}
                                className="text-xl leading-relaxed"
                              />
                            </View>
                          </View>
                        ))}
                        {/* 显示正在生成的回复（流式内容） */}
                        {isResponding && streamingContent && (
                          <View className="flex flex-row justify-start">
                            <View className="max-w-4/5 rounded-2xl p-4 bg-muted text-foreground">
                              <RichText
                                nodes={streamingContent.replace(/\n/g, '<br/>')}
                                className="text-xl leading-relaxed"
                              />
                            </View>
                          </View>
                        )}
                        {/* 加载指示器（仅在还没有内容时显示） */}
                        {isResponding && !streamingContent && (
                          <View className="flex flex-row justify-start">
                            <View className="rounded-2xl p-4 bg-muted">
                              <View className="flex flex-row items-center space-x-2">
                                <View className="i-mdi-loading animate-spin text-2xl text-primary" />
                                <Text className="text-xl text-muted-foreground">AI正在思考...</Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    </ScrollView>
                  </View>

                  {/* 输入框 */}
                  <View className="bg-card rounded-2xl p-4 border border-border mb-4">
                    <View className="flex flex-row items-center space-x-2">
                      <View className="flex-1 bg-input rounded-xl border border-border px-4 py-3">
                        <Input
                          className="w-full text-xl text-foreground"
                          placeholder="输入您的问题..."
                          value={inputText}
                          onInput={(e) => setInputText(e.detail.value)}
                          disabled={isResponding}
                        />
                      </View>
                      <Button
                        className="bg-primary text-primary-foreground rounded-xl"
                        onClick={() => handleSendMessage()}
                        disabled={isResponding || !inputText.trim()}
                      >
                        <View className="px-6 py-3">
                          <View className="i-mdi-send text-2xl" />
                        </View>
                      </Button>
                    </View>
                  </View>

                  {/* 快捷导航 */}
                  <QuickNav />
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
