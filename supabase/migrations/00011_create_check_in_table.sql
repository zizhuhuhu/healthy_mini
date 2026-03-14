-- 创建签到记录表
CREATE TABLE IF NOT EXISTS check_in_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  points_earned INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, check_in_date)
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_check_in_records_user_id ON check_in_records(user_id);
CREATE INDEX IF NOT EXISTS idx_check_in_records_date ON check_in_records(check_in_date);

-- 添加注释
COMMENT ON TABLE check_in_records IS '签到记录表';
COMMENT ON COLUMN check_in_records.user_id IS '用户ID';
COMMENT ON COLUMN check_in_records.check_in_date IS '签到日期';
COMMENT ON COLUMN check_in_records.points_earned IS '获得积分';

-- RLS策略
ALTER TABLE check_in_records ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看和插入自己的签到记录
CREATE POLICY "允许查看签到记录" ON check_in_records FOR SELECT USING (true);
CREATE POLICY "允许插入签到记录" ON check_in_records FOR INSERT WITH CHECK (true);