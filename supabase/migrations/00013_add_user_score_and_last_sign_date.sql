-- 为user_points表添加user_score和last_sign_date字段
ALTER TABLE user_points 
ADD COLUMN IF NOT EXISTS user_score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sign_date DATE;

-- 将现有的total_points数据迁移到user_score
UPDATE user_points SET user_score = total_points WHERE user_score = 0;

-- 添加注释
COMMENT ON COLUMN user_points.user_score IS '用户积分（签到累加）';
COMMENT ON COLUMN user_points.last_sign_date IS '最后签到日期';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_points_last_sign_date ON user_points(last_sign_date);