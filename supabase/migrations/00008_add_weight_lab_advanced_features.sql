-- 创建虚拟物品表
CREATE TABLE IF NOT EXISTS virtual_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- 'chart_skin', 'effect', 'nickname_icon'
  price INTEGER NOT NULL, -- 积分价格
  icon TEXT NOT NULL,
  preview_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建用户拥有的虚拟物品表
CREATE TABLE IF NOT EXISTS user_items (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES virtual_items(id),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE, -- 是否正在使用
  UNIQUE(user_id, item_id)
);

-- 创建宿舍信息表
CREATE TABLE IF NOT EXISTS dormitory_info (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  dormitory_name TEXT NOT NULL, -- 宿舍名称，如"1号楼301"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建宿舍挑战榜视图（按宿舍统计连续打卡天数）
CREATE OR REPLACE VIEW dormitory_rankings AS
SELECT 
  d.dormitory_name,
  COUNT(DISTINCT w.user_id) as member_count,
  COALESCE(AVG(w.current_streak), 0) as avg_streak,
  COALESCE(MAX(w.current_streak), 0) as max_streak,
  COALESCE(SUM(w.total_points), 0) as total_points
FROM dormitory_info d
LEFT JOIN weight_checkin_stats w ON d.user_id = w.user_id
GROUP BY d.dormitory_name
ORDER BY avg_streak DESC, total_points DESC;

-- 插入初始虚拟物品数据
INSERT INTO virtual_items (id, name, description, type, price, icon) VALUES
  ('skin_gradient_blue', '蓝色渐变皮肤', '清新的蓝色渐变图表皮肤', 'chart_skin', 50, 'i-mdi-palette'),
  ('skin_gradient_purple', '紫色渐变皮肤', '神秘的紫色渐变图表皮肤', 'chart_skin', 50, 'i-mdi-palette'),
  ('skin_gradient_orange', '橙色渐变皮肤', '活力的橙色渐变图表皮肤', 'chart_skin', 50, 'i-mdi-palette'),
  ('effect_sparkle', '闪耀特效', '打卡时显示闪耀动画', 'effect', 100, 'i-mdi-star'),
  ('effect_confetti', '彩纸特效', '打卡时显示彩纸飞舞', 'effect', 100, 'i-mdi-party-popper'),
  ('icon_crown', '皇冠图标', '专属皇冠昵称图标', 'nickname_icon', 80, 'i-mdi-crown'),
  ('icon_fire', '火焰图标', '专属火焰昵称图标', 'nickname_icon', 80, 'i-mdi-fire'),
  ('icon_heart', '爱心图标', '专属爱心昵称图标', 'nickname_icon', 80, 'i-mdi-heart')
ON CONFLICT (id) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_dormitory_info_user ON dormitory_info(user_id);
CREATE INDEX IF NOT EXISTS idx_dormitory_info_name ON dormitory_info(dormitory_name);

-- 启用RLS
ALTER TABLE virtual_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dormitory_info ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Allow all operations on virtual_items" ON virtual_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on user_items" ON user_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on dormitory_info" ON dormitory_info FOR ALL USING (true) WITH CHECK (true);