import {View, Text, Input, Button} from '@tarojs/components'
import {useState} from 'react'
import Taro, {redirectTo, showToast, switchTab} from '@tarojs/taro'
import {STORAGE_KEY_REDIRECT_PATH} from '@/components/RouteGuard'
import {useAuth} from '@/contexts/AuthContext'
import {syncUserIdFromAuth} from '@/utils/user'

type AuthMode = 'signin' | 'signup'

function isTabBarPath(path: string): boolean {
  const app = Taro.getApp()
  const tabBarList = app?.config?.tabBar?.list || []
  const purePath = path.split('?')[0]
  return tabBarList.some((item: {pagePath: string}) => `/${item.pagePath}` === purePath)
}

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,24}$/.test(username)
}

export default function Login() {
  const {signInWithUsername, signUpWithUsername} = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const goAfterLogin = (): void => {
    const redirectPath = Taro.getStorageSync(STORAGE_KEY_REDIRECT_PATH) || '/pages/home/index'
    Taro.removeStorageSync(STORAGE_KEY_REDIRECT_PATH)

    if (isTabBarPath(redirectPath)) {
      switchTab({url: redirectPath.split('?')[0]})
      return
    }

    redirectTo({url: redirectPath})
  }

  const handleSubmit = async (): Promise<void> => {
    const account = username.trim()

    if (!isValidUsername(account)) {
      showToast({
        title: '用户名需为3-24位字母数字下划线',
        icon: 'none',
        duration: 2500
      })
      return
    }

    if (password.length < 6) {
      showToast({
        title: '密码至少6位',
        icon: 'none',
        duration: 2000
      })
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      showToast({
        title: '两次输入的密码不一致',
        icon: 'none',
        duration: 2000
      })
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const {error} = await signUpWithUsername(account, password)
        if (error) {
          showToast({
            title: error.message || '注册失败',
            icon: 'none',
            duration: 2500
          })
          return
        }

        showToast({
          title: '注册成功，请登录',
          icon: 'success',
          duration: 1500
        })
        setMode('signin')
        setConfirmPassword('')
        return
      }

      const {error} = await signInWithUsername(account, password)
      if (error) {
        showToast({
          title: error.message || '登录失败',
          icon: 'none',
          duration: 2500
        })
        return
      }

      await syncUserIdFromAuth()

      showToast({
        title: '登录成功',
        icon: 'success',
        duration: 1000
      })

      setTimeout(() => {
        goAfterLogin()
      }, 300)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="min-h-screen bg-background px-5 py-8">
      <View className="bg-card rounded-2xl p-6 border border-border shadow-sm">
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground">账号登录</Text>
          <Text className="block text-lg text-muted-foreground mt-2">
            先登录后可同步记录、积分和AI使用数据
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-lg text-foreground mb-2 block">用户名</Text>
          <View className="bg-input border border-border rounded-xl px-4 py-3">
            <Input
              className="text-lg text-foreground"
              placeholder="3-24位字母数字下划线"
              value={username}
              onInput={(e) => setUsername(e.detail.value)}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-lg text-foreground mb-2 block">密码</Text>
          <View className="bg-input border border-border rounded-xl px-4 py-3">
            <Input
              className="text-lg text-foreground"
              placeholder="至少6位"
              password
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
          </View>
        </View>

        {mode === 'signup' && (
          <View className="mb-4">
            <Text className="text-lg text-foreground mb-2 block">确认密码</Text>
            <View className="bg-input border border-border rounded-xl px-4 py-3">
              <Input
                className="text-lg text-foreground"
                placeholder="再次输入密码"
                password
                value={confirmPassword}
                onInput={(e) => setConfirmPassword(e.detail.value)}
              />
            </View>
          </View>
        )}

        <Button
          className="w-full bg-primary text-primary-foreground text-xl font-semibold rounded-xl"
          loading={loading}
          disabled={loading}
          onClick={handleSubmit}>
          <View className="py-2">
            <Text>{mode === 'signin' ? '登录' : '注册'}</Text>
          </View>
        </Button>

        <View className="mt-5 flex flex-row items-center justify-center">
          <Text className="text-base text-muted-foreground">
            {mode === 'signin' ? '还没有账号？' : '已有账号？'}
          </Text>
          <Text
            className="text-base text-primary ml-1"
            onClick={() => {
              if (loading) {
                return
              }
              setMode(mode === 'signin' ? 'signup' : 'signin')
            }}>
            {mode === 'signin' ? '去注册' : '去登录'}
          </Text>
        </View>
      </View>
    </View>
  )
}
