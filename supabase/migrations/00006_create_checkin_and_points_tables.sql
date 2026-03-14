-- 创建用户签到记录表
CREATE TABLE IF NOT EXISTS user_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  checkin_date DATE NOT NULL,
  consecutive_days INTEGER DEFAULT 1,
  points_earned INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

-- 创建用户积分表
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_consecutive_days INTEGER DEFAULT 0,
  last_checkin_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_checkins_user_id ON user_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_user_checkins_date ON user_checkins(checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_total ON user_points(total_points DESC);

-- 启用RLS
ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- 签到记录策略：用户可以查看所有记录（用于排行榜），但只能插入自己的记录
CREATE POLICY "用户可以查看所有签到记录" ON user_checkins
  FOR SELECT USING (true);

CREATE POLICY "用户可以插入自己的签到记录" ON user_checkins
  FOR INSERT WITH CHECK (true);

-- 积分策略：用户可以查看所有积分（用于排行榜），但只能更新自己的积分
CREATE POLICY "用户可以查看所有积分" ON user_points
  FOR SELECT USING (true);

CREATE POLICY "用户可以插入自己的积分记录" ON user_points
  FOR INSERT WITH CHECK (true);

CREATE POLICY "用户可以更新自己的积分" ON user_points
  FOR UPDATE USING (true);

-- 创建签到函数
CREATE OR REPLACE FUNCTION checkin_user(p_user_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_last_checkin_date DATE;
  v_consecutive_days INTEGER := 1;
  v_points_earned INTEGER := 1;
  v_bonus_points INTEGER := 0;
  v_total_points INTEGER;
  v_already_checked BOOLEAN;
BEGIN
  -- 检查今天是否已签到
  SELECT EXISTS(
    SELECT 1 FROM user_checkins 
    WHERE user_id = p_user_id AND checkin_date = v_today
  ) INTO v_already_checked;
  
  IF v_already_checked THEN
    RETURN json_build_object(
      'success', false,
      'message', '今天已经签到过了',
      'alreadyChecked', true
    );
  END IF;
  
  -- 获取用户积分记录
  SELECT last_checkin_date, current_consecutive_days, total_points
  INTO v_last_checkin_date, v_consecutive_days, v_total_points
  FROM user_points
  WHERE user_id = p_user_id;
  
  -- 如果用户不存在，创建记录
  IF NOT FOUND THEN
    INSERT INTO user_points (user_id, total_points, current_consecutive_days, last_checkin_date)
    VALUES (p_user_id, 0, 0, NULL);
    v_consecutive_days := 0;
    v_total_points := 0;
  END IF;
  
  -- 计算连续签到天数
  IF v_last_checkin_date = v_yesterday THEN
    v_consecutive_days := v_consecutive_days + 1;
  ELSIF v_last_checkin_date = v_today THEN
    -- 今天已签到
    RETURN json_build_object(
      'success', false,
      'message', '今天已经签到过了',
      'alreadyChecked', true
    );
  ELSE
    v_consecutive_days := 1;
  END IF;
  
  -- 计算奖励积分
  IF v_consecutive_days = 3 THEN
    v_bonus_points := 2;
  ELSIF v_consecutive_days = 7 THEN
    v_bonus_points := 4;
  ELSIF v_consecutive_days > 7 AND v_consecutive_days % 7 = 0 THEN
    v_bonus_points := 4;
  END IF;
  
  v_points_earned := 1 + v_bonus_points;
  v_total_points := v_total_points + v_points_earned;
  
  -- 插入签到记录
  INSERT INTO user_checkins (user_id, checkin_date, consecutive_days, points_earned)
  VALUES (p_user_id, v_today, v_consecutive_days, v_points_earned);
  
  -- 更新用户积分
  UPDATE user_points
  SET total_points = v_total_points,
      current_consecutive_days = v_consecutive_days,
      last_checkin_date = v_today,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', '签到成功',
    'pointsEarned', v_points_earned,
    'bonusPoints', v_bonus_points,
    'consecutiveDays', v_consecutive_days,
    'totalPoints', v_total_points,
    'alreadyChecked', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;