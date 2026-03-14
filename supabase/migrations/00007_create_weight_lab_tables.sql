-- 创建体重记录表
CREATE TABLE IF NOT EXISTS weight_records (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL, -- 体重（kg）
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, record_date) -- 每天只能记录一次
);

-- 创建成就定义表
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_reward INTEGER NOT NULL DEFAULT 0,
  condition_type TEXT NOT NULL, -- 'first_record', 'streak_3', 'streak_7', 'stable_weight'
  condition_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建用户成就记录表
CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- 创建体重打卡统计表
CREATE TABLE IF NOT EXISTS weight_checkin_stats (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0, -- 当前连续打卡天数
  max_streak INTEGER NOT NULL DEFAULT 0, -- 最大连续打卡天数
  total_checkins INTEGER NOT NULL DEFAULT 0, -- 总打卡次数
  total_points INTEGER NOT NULL DEFAULT 0, -- 总积分
  last_checkin_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 插入初始成就数据
INSERT INTO achievement_definitions (id, name, description, icon, points_reward, condition_type, condition_value) VALUES
  ('starter', '启航者', '完成首次体重记录', 'i-mdi-rocket-launch', 5, 'first_record', 1),
  ('streak_3', '三天打鱼', '连续打卡3天', 'i-mdi-fire', 3, 'streak_3', 3),
  ('streak_7', '周而复始', '连续打卡7天', 'i-mdi-trophy', 5, 'streak_7', 7),
  ('streak_14', '坚持不懈', '连续打卡14天', 'i-mdi-medal', 10, 'streak_14', 14),
  ('streak_30', '月度冠军', '连续打卡30天', 'i-mdi-crown', 20, 'streak_30', 30),
  ('stable_weight', '稳如泰山', '体重波动保持在2kg内超过14天', 'i-mdi-mountain', 15, 'stable_weight', 14)
ON CONFLICT (id) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_weight_records_user_date ON weight_records(user_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_checkin_stats_user ON weight_checkin_stats(user_id);

-- 启用RLS
ALTER TABLE weight_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_checkin_stats ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略（允许所有操作，因为是演示应用）
CREATE POLICY "Allow all operations on weight_records" ON weight_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on achievement_definitions" ON achievement_definitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on user_achievements" ON user_achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on weight_checkin_stats" ON weight_checkin_stats FOR ALL USING (true) WITH CHECK (true);