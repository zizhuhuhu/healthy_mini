# 百度收银台支付配置指南

## 当前状态

✅ **已完成真实支付接入**
- 已创建支付Edge Function（baidu-payment）
- 已创建支付回调处理（payment-callback）
- 前端已集成swan.requestPolymerPayment API
- 支持微信支付、支付宝、百度钱包

⚠️ **需要配置支付密钥才能使用**

## 配置步骤

### 第一步：申请百度收银台

1. 访问[百度智能小程序开发者平台](https://smartprogram.baidu.com/)
2. 进入"流量与收益" → "支付管理"
3. 点击"申请开通百度收银台"
4. 提交以下资料：
   - 企业营业执照
   - 法人身份证
   - 银行开户许可证
   - 对公账户信息
5. 等待审核（通常1-2周）

### 第二步：获取支付密钥

审核通过后，在支付管理页面获取：

1. **AppKey**：应用密钥
2. **DealId**：财务结算凭证
3. **RSA密钥对**：
   - 点击"生成RSA密钥对"
   - 下载私钥（保密）
   - 上传公钥到百度平台

### 第三步：配置Supabase密钥

在Supabase项目后台配置以下环境变量：

1. 进入Supabase项目
2. 点击左侧菜单"Edge Functions"
3. 点击"Manage secrets"
4. 添加以下三个密钥：

| 密钥名称 | 说明 | 示例值 |
|---------|------|--------|
| `BAIDU_PAY_APPKEY` | 百度收银台AppKey | `1234567890abcdef` |
| `BAIDU_PAY_DEALID` | 百度收银台DealId | `987654321` |
| `BAIDU_PAY_RSA_PRIVATE_KEY` | RSA私钥（完整PEM格式） | `-----BEGIN PRIVATE KEY-----\nMIIE...` |

**重要提示**：
- RSA私钥必须包含完整的PEM格式头尾
- 格式：`-----BEGIN PRIVATE KEY-----\n密钥内容\n-----END PRIVATE KEY-----`
- 不要泄露私钥

### 第四步：配置支付回调URL

在百度开发者平台配置支付回调地址：

1. 进入"支付管理" → "支付配置"
2. 设置支付回调URL：
   ```
   https://your-project-id.supabase.co/functions/v1/payment-callback
   ```
3. 保存配置

### 第五步：测试支付

1. 在百度开发者工具中打开小程序
2. 创建一个跑腿订单
3. 进入支付页面
4. 选择支付方式
5. 点击确认支付
6. 调起百度收银台
7. 使用测试账号完成支付
8. 验证订单状态是否更新

## 支付流程说明

```
用户下单
  ↓
创建订单（status: unpaid）
  ↓
跳转支付页面
  ↓
调用 baidu-payment Edge Function
  ↓
获取支付参数（包含签名）
  ↓
调起 swan.requestPolymerPayment
  ↓
用户完成支付
  ↓
百度回调 payment-callback
  ↓
更新订单状态（status: pending）
  ↓
跳转订单详情页
```

## 环境兼容性

- ✅ 百度智能小程序：完整支付功能
- ⚠️ H5/浏览器：提示"请在百度小程序中使用支付功能"
- ⚠️ 微信小程序：不支持（需要单独接入微信支付）

## 支付方式说明

百度收银台聚合支付支持：
1. **微信支付**：用户使用微信扫码或微信内支付
2. **支付宝**：用户使用支付宝扫码或支付宝内支付
3. **百度钱包**：用户使用百度账号余额支付

用户在支付页面选择支付方式后，百度收银台会自动调起对应的支付渠道。

## 安全注意事项

1. **私钥保护**：
   - 不要将私钥提交到代码仓库
   - 只在Supabase后台配置
   - 定期更换密钥

2. **签名验证**：
   - 所有支付参数必须签名
   - 回调必须验证签名
   - 防止参数篡改

3. **金额验证**：
   - 后端验证订单金额
   - 防止前端篡改金额
   - 记录支付日志

4. **HTTPS**：
   - 生产环境必须使用HTTPS
   - 回调URL必须是HTTPS

## 常见问题

### Q1: 提示"支付功能未配置"？
**A**: 请检查Supabase后台是否正确配置了三个支付密钥。

### Q2: 支付失败，提示"签名错误"？
**A**: 检查RSA私钥格式是否正确，必须包含完整的PEM头尾。

### Q3: 支付成功但订单状态未更新？
**A**: 检查支付回调URL是否正确配置，查看Edge Function日志。

### Q4: 在浏览器中测试支付？
**A**: 百度支付只能在百度智能小程序中使用，浏览器环境会提示错误。

### Q5: 如何测试支付？
**A**: 使用百度提供的测试账号和测试金额进行测试，不会产生真实扣款。

## 技术支持

- [百度智能小程序支付文档](https://smartprogram.baidu.com/docs/develop/function/tune_up_2/)
- [百度收银台API文档](https://dianshang.baidu.com/platform/doclist/index.html#!/doc/nuomiplus_2_base/anchor/term.md)
- [支付安全规范](https://smartprogram.baidu.com/docs/develop/function/tune_up_2_safety/)

## 开发者工具

- [百度开发者工具下载](https://smartprogram.baidu.com/docs/develop/devtools/show_sur/)
- [支付测试工具](https://smartprogram.baidu.com/docs/develop/function/tune_up_2_test/)

## 费率说明

百度收银台会收取一定的手续费，具体费率请咨询百度商务。一般为：
- 微信支付：0.6%
- 支付宝：0.6%
- 百度钱包：0.6%

## 结算周期

- T+1结算：交易成功后第二天到账
- 需要绑定对公账户
- 可在百度平台查看结算明细



### 1. 申请百度收银台
1. 访问百度智能小程序开发者平台
2. 进入"流量与收益" -> "支付管理"
3. 申请开通百度收银台服务
4. 需要提供：
   - 企业营业执照
   - 法人身份证
   - 银行开户许可证
   - 对公账户信息

### 2. 获取支付密钥
申请通过后，在支付管理页面获取：
- AppKey
- DealId（百度收银台分配的财务结算凭证）
- RSA私钥和公钥

### 3. 配置环境变量
在 `.env` 文件中添加：
```
TARO_APP_BAIDU_PAY_APPKEY=your_appkey
TARO_APP_BAIDU_PAY_DEALID=your_dealid
TARO_APP_BAIDU_PAY_RSA_PRIVATE_KEY=your_rsa_private_key
```

### 4. 创建支付Edge Function
创建 `supabase/functions/baidu-payment/index.ts`：

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, paymentMethod, amount } = await req.json()

    // 1. 生成订单号
    const orderNo = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 2. 调用百度收银台API
    // 参考文档：https://smartprogram.baidu.com/docs/develop/function/tune_up_2/
    const paymentData = {
      dealId: Deno.env.get('BAIDU_PAY_DEALID'),
      appKey: Deno.env.get('BAIDU_PAY_APPKEY'),
      totalAmount: amount * 100, // 转换为分
      tpOrderId: orderNo,
      dealTitle: '跑腿订单配送费',
      signFieldsRange: 1,
      bizInfo: JSON.stringify({
        orderId: orderId,
        paymentMethod: paymentMethod
      })
    }

    // 3. 生成签名
    // 使用RSA私钥对参数进行签名
    // const sign = generateRSASign(paymentData, privateKey)

    // 4. 返回支付参数给前端
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          orderNo: orderNo,
          paymentData: paymentData,
          // sign: sign
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

### 5. 修改前端支付代码
在 `src/pages/payment/index.tsx` 中：

```typescript
// 替换模拟支付为真实支付
const handlePay = async () => {
  setPaying(true)

  try {
    // 调用Edge Function获取支付参数
    const { data, error } = await supabase.functions.invoke('baidu-payment', {
      body: {
        orderId: orderId,
        paymentMethod: paymentMethod,
        amount: orderInfo.deliveryFee
      }
    })

    if (error) throw error

    // 调起百度收银台
    swan.requestPolymerPayment({
      orderInfo: data.paymentData,
      success: async (res) => {
        // 支付成功
        await updateOrderStatus(orderId, 'pending')
        showToast({ title: '支付成功', icon: 'success' })
        redirectTo({ url: '/pages/order-detail/index?orderId=' + orderId })
      },
      fail: (err) => {
        // 支付失败
        showToast({ title: '支付失败', icon: 'none' })
        setPaying(false)
      }
    })
  } catch (error) {
    showToast({ title: '支付异常', icon: 'none' })
    setPaying(false)
  }
}
```

### 6. 配置支付回调
在百度开发者平台配置支付回调URL：
- 回调URL：`https://your-project.supabase.co/functions/v1/payment-callback`
- 创建对应的Edge Function处理支付结果通知

### 7. 测试
1. 使用百度提供的测试账号进行测试
2. 测试各种支付场景：成功、失败、取消
3. 验证订单状态更新是否正确

## 参考文档
- [百度智能小程序支付接入指南](https://smartprogram.baidu.com/docs/develop/function/tune_up_2/)
- [百度收银台API文档](https://dianshang.baidu.com/platform/doclist/index.html#!/doc/nuomiplus_2_base/anchor/term.md)
- [支付安全规范](https://smartprogram.baidu.com/docs/develop/function/tune_up_2_safety/)

## 注意事项
1. 支付金额单位为分，需要乘以100
2. 所有支付参数必须进行RSA签名
3. 支付回调必须验证签名
4. 生产环境必须使用HTTPS
5. 妥善保管支付密钥，不要提交到代码仓库

## 当前实现
目前使用模拟支付，适用于开发和演示环境。真实支付需要企业资质和商户账号。
