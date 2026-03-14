import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 获取百度支付回调参数
    const params = await req.json()
    
    console.log('收到支付回调:', params)

    // 验证签名（实际应用中需要验证）
    // const isValid = verifySign(params)
    // if (!isValid) {
    //   throw new Error('签名验证失败')
    // }

    // 解析bizInfo获取订单ID
    let orderId = ''
    try {
      const bizInfo = JSON.parse(params.bizInfo || '{}')
      orderId = bizInfo.orderId
    } catch (e) {
      console.error('解析bizInfo失败:', e)
    }

    if (!orderId) {
      throw new Error('订单ID不存在')
    }

    // 初始化Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 更新订单状态
    const { error } = await supabase
      .from('delivery_orders')
      .update({ 
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) {
      console.error('更新订单状态失败:', error)
      throw error
    }

    console.log('订单状态更新成功:', orderId)

    // 返回成功响应给百度
    return new Response(
      JSON.stringify({
        errno: 0,
        msg: 'success',
        data: {}
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('支付回调处理失败:', error)
    return new Response(
      JSON.stringify({ 
        errno: 1,
        msg: error.message || '处理失败',
        data: {}
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // 百度要求返回200
      }
    )
  }
})
