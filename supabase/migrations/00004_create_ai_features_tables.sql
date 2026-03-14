-- 创建会员表
CREATE TABLE IF NOT EXISTS user_memberships (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT FALSE,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建AI对话记录表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_type TEXT NOT NULL, -- 'health_advisor' 或 'dish_analysis'
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建菜品分析记录表
CREATE TABLE IF NOT EXISTS dish_analysis_records (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  dish_image_url TEXT,
  dish_name TEXT NOT NULL,
  ingredients TEXT NOT NULL,
  flavor TEXT NOT NULL,
  calories_per_100g NUMERIC,
  constitution_compatibility JSONB, -- 9种体质的适配度
  is_suitable BOOLEAN,
  analysis_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_type ON ai_conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_dish_analysis_user_id ON dish_analysis_records(user_id);
CREATE INDEX IF NOT EXISTS idx_dish_analysis_created_at ON dish_analysis_records(created_at DESC);

-- 设置RLS策略（无登录系统，允许所有操作）
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_analysis_records ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户访问
CREATE POLICY "允许所有用户访问会员信息" ON user_memberships FOR ALL USING (true);
CREATE POLICY "允许所有用户访问对话记录" ON ai_conversations FOR ALL USING (true);
CREATE POLICY "允许所有用户访问分析记录" ON dish_analysis_records FOR ALL USING (true);

-- 创建图片存储桶（用于菜品照片）
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-9vb1brdn5tkx_dish_images', 'app-9vb1brdn5tkx_dish_images', true)
ON CONFLICT (id) DO NOTHING;

-- 设置存储桶策略
CREATE POLICY "允许所有用户上传菜品图片" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'app-9vb1brdn5tkx_dish_images');

CREATE POLICY "允许所有用户查看菜品图片" ON storage.objects
FOR SELECT USING (bucket_id = 'app-9vb1brdn5tkx_dish_images');

-- 插入测试会员数据（用于演示）
INSERT INTO user_memberships (user_id, is_active, activated_at)
VALUES ('test_user_001', true, NOW())
ON CONFLICT (user_id) DO NOTHING;
