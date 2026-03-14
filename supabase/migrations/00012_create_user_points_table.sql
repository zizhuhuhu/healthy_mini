-- 创建用户积分表
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_total_points ON user_points(total_points DESC);

-- 添加注释
COMMENT ON TABLE user_points IS '用户积分表';
COMMENT ON COLUMN user_points.user_id IS '用户ID';
COMMENT ON COLUMN user_points.total_points IS '总积分';

-- 启用RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略：允许所有人读取和写入（因为是匿名用户系统）
CREATE POLICY "允许所有人查看积分" ON user_points FOR SELECT USING (true);
CREATE POLICY "允许所有人更新积分" ON user_points FOR UPDATE USING (true);
CREATE POLICY "允许所有人插入积分" ON user_points FOR INSERT WITH CHECK (true);