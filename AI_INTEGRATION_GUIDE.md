# AI功能集成指南

## 概述

智体云衡小程序已完成AI功能的数据库设计和基础架构，包括：
1. **AI健康顾问**（付费功能）：精通中医体质和体重管理的AI助手
2. **AI菜品分析**：拍照识别菜品，分析热量和体质适配度

## 已完成的准备工作

### 1. 数据库结构
已创建以下数据表：

#### user_memberships（会员表）
```sql
- id: 主键
- user_id: 用户标识
- is_active: 是否激活
- activated_at: 激活时间
- expires_at: 过期时间
- created_at: 创建时间
```

#### ai_conversations（对话记录表）
```sql
- id: 主键
- user_id: 用户标识
- conversation_type: 对话类型（health_advisor / dish_analysis）
- messages: 对话消息（JSONB格式）
- created_at: 创建时间
```

#### dish_analysis_records（菜品分析记录表）
```sql
- id: 主键
- user_id: 用户标识
- dish_image_url: 菜品图片URL
- dish_name: 菜品名称
- ingredients: 菜品组成
- flavor: 口味
- calories_per_100g: 每100g热量
- constitution_compatibility: 9种体质适配度（JSONB）
- is_suitable: 是否适合
- analysis_result: 分析结果
- created_at: 创建时间
```

### 2. 图片存储
已创建Supabase Storage桶：`app-9vb1brdn5tkx_dish_images`

### 3. API密钥注册
已注册千帆API密钥配置：
- QIANFAN_API_KEY
- QIANFAN_SECRET_KEY

### 4. TypeScript类型定义
已在 `src/db/types.ts` 中定义：
- UserMembership
- AIConversation
- DishAnalysisRecord

### 5. 数据库API
已在 `src/db/api.ts` 中实现：
- checkUserMembership()
- activateUserMembership()
- saveDishAnalysisRecord()
- getUserDishAnalysisRecords()

## 实现步骤

### 步骤1：配置千帆API密钥

1. 访问百度智能云千帆平台：https://console.bce.baidu.com/qianfan/
2. 创建应用，获取API Key和Secret Key
3. 在秒哒平台的环境变量中配置：
   - QIANFAN_API_KEY
   - QIANFAN_SECRET_KEY

### 步骤2：创建Edge Functions

#### 2.1 AI健康顾问 Edge Function

创建文件：`supabase/functions/ai-health-advisor/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const QIANFAN_API_KEY = Deno.env.get('QIANFAN_API_KEY')
const QIANFAN_SECRET_KEY = Deno.env.get('QIANFAN_SECRET_KEY')

serve(async (req) => {
  // CORS处理
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { userId, message, userContext } = await req.json()

    // 1. 获取千帆Access Token
    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${QIANFAN_API_KEY}&client_secret=${QIANFAN_SECRET_KEY}`,
      { method: 'POST' }
    )
    const { access_token } = await tokenResponse.json()

    // 2. 构建系统提示词
    const systemPrompt = `你是一位精通中医体质学和体重管理的健康顾问。
用户信息：
- 体质类型：${userContext.constitutionType}
- BMI：${userContext.bmi}
- 身高：${userContext.height}cm
- 体重：${userContext.weight}kg

请根据用户的体质特点和健康数据，提供专业的健康建议。`

    // 3. 调用千帆API
    const aiResponse = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: systemPrompt },
            { role: 'user', content: message }
          ]
        })
      }
    )

    const aiResult = await aiResponse.json()

    return new Response(
      JSON.stringify({ reply: aiResult.result }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
```

#### 2.2 AI菜品分析 Edge Function

创建文件：`supabase/functions/ai-dish-analysis/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const QIANFAN_API_KEY = Deno.env.get('QIANFAN_API_KEY')
const QIANFAN_SECRET_KEY = Deno.env.get('QIANFAN_SECRET_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { dishName, ingredients, flavor, userConstitution } = await req.json()

    // 1. 获取Access Token
    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${QIANFAN_API_KEY}&client_secret=${QIANFAN_SECRET_KEY}`,
      { method: 'POST' }
    )
    const { access_token } = await tokenResponse.json()

    // 2. 构建分析提示词
    const analysisPrompt = `请分析以下菜品的营养信息和体质适配度：

菜品名称：${dishName}
主要成分：${ingredients}
口味：${flavor}
用户体质：${userConstitution}

请提供以下信息（以JSON格式返回）：
1. 每100g热量（千卡）
2. 9种中医体质的适配度（0-100%）：气虚质、阳虚质、阴虚质、痰湿质、湿热质、血瘀质、气郁质、特禀质、平和质
3. 是否适合该用户食用
4. 详细分析说明

返回格式：
{
  "calories_per_100g": 数字,
  "constitution_compatibility": {
    "气虚质": 数字,
    "阳虚质": 数字,
    ...
  },
  "is_suitable": true/false,
  "analysis": "详细说明"
}`

    // 3. 调用千帆API
    const aiResponse = await fetch(
      `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions?access_token=${access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: analysisPrompt }]
        })
      }
    )

    const aiResult = await aiResponse.json()
    
    // 4. 解析AI返回的JSON
    const analysis = JSON.parse(aiResult.result)

    return new Response(
      JSON.stringify(analysis),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
```

### 步骤3：部署Edge Functions

使用秒哒平台的Supabase工具部署：
```bash
supabase_deploy_edge_function --name ai-health-advisor
supabase_deploy_edge_function --name ai-dish-analysis
```

### 步骤4：创建前端页面

#### 4.1 更新路由配置

在 `src/app.config.ts` 中添加新页面：
```typescript
const pages = [
  'pages/home/index',
  'pages/constitution-test/index',
  'pages/food-recommend/index',
  'pages/ai-advisor/index',      // AI健康顾问
  'pages/dish-analysis/index',   // AI菜品分析
  'pages/membership/index'       // 会员开通
]
```

#### 4.2 在首页添加入口

在 `src/pages/home/index.tsx` 中添加两个新功能卡片。

#### 4.3 创建AI健康顾问页面

创建 `src/pages/ai-advisor/index.tsx`，实现对话界面。

#### 4.4 创建AI菜品分析页面

创建 `src/pages/dish-analysis/index.tsx`，实现拍照上传和分析功能。

### 步骤5：实现图片上传

参考 `src/utils/` 中的图片上传工具，实现菜品照片上传到Supabase Storage。

### 步骤6：数据导出

创建导出功能，将 `dish_analysis_records` 表数据导出为Excel格式。

## 使用流程

### AI健康顾问
1. 用户点击"AI健康顾问"入口
2. 检查会员状态，未开通则引导开通
3. 进入对话界面，AI根据用户体质和健康数据提供建议
4. 对话历史保存到数据库

### AI菜品分析
1. 用户点击"AI菜品分析"入口
2. 拍摄或选择菜品照片
3. 输入菜品名称、组成、口味
4. AI分析热量和体质适配度
5. 显示分析结果，保存到数据库

## 注意事项

1. **API配额**：千帆API有调用次数限制，需要监控使用量
2. **错误处理**：实现完善的错误处理和用户提示
3. **数据隐私**：用户健康数据需要妥善保护
4. **会员系统**：可以集成支付功能实现真实付费
5. **数据导出**：定期备份分析数据，提供Excel导出功能

## 后续优化

1. 实现真实的支付系统
2. 优化AI提示词，提高分析准确度
3. 添加数据统计和可视化
4. 实现对话历史管理
5. 添加用户反馈机制
