import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 生成RSA签名
async function generateSign(params: Record<string, any>, privateKey: string): Promise<string> {
  // 1. 按照key的字典序排序
  const sortedKeys = Object.keys(params).sort()
  
  // 2. 拼接成待签名字符串
  const signStr = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  console.log('待签名字符串:', signStr)
  
  // 3. 使用RSA-SHA256签名
  try {
    // 解析PEM格式的私钥
    const pemHeader = '-----BEGIN PRIVATE KEY-----'
    const pemFooter = '-----END PRIVATE KEY-----'
    const pemContents = privateKey
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '')
    
    // Base64解码
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
    
    // 导入私钥
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    )
    
    // 签名
    const encoder = new TextEncoder()
    const data = encoder.encode(signStr)
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      data
    )
    
    // Base64编码
    const signatureArray = new Uint8Array(signature)
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
    
    return signatureBase64
  } catch (error) {
    console.error('签名失败:', error)
    throw new Error('签名失败: ' + error.message)
  }
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, amount, orderInfo } = await req.json()

    console.log('收到支付请求:', { orderId, amount, orderInfo })

    // 验证参数
    if (!orderId || !amount) {
      throw new Error('缺少必要参数')
    }

    // 获取环境变量
    const appKey = Deno.env.get('BAIDU_PAY_APPKEY')
    const dealId = Deno.env.get('BAIDU_PAY_DEALID')
    const privateKey = Deno.env.get('BAIDU_PAY_RSA_PRIVATE_KEY')

    if (!appKey || !dealId || !privateKey) {
      throw new Error('支付配置未完成，请在Supabase后台配置支付密钥')
    }

    // 生成订单号（使用时间戳+随机数）
    const tpOrderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 构建支付参数
    const paymentParams: Record<string, any> = {
      dealId: dealId,
      appKey: appKey,
      totalAmount: Math.round(amount * 100), // 转换为分
      tpOrderId: tpOrderId,
      dealTitle: '跑腿订单配送费',
      signFieldsRange: 1,
      bizInfo: JSON.stringify({
        orderId: orderId,
        orderInfo: orderInfo
      })
    }

    console.log('支付参数:', paymentParams)

    // 生成签名
    const sign = await generateSign(paymentParams, privateKey)
    
    console.log('签名结果:', sign)

    // 返回支付参数给前端
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orderInfo: {
            ...paymentParams,
            rsaSign: sign
          },
          tpOrderId: tpOrderId
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('支付处理失败:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || '支付处理失败',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
