-- 创建用户信用信息表
CREATE TABLE delivery_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL UNIQUE,
  credit_score INTEGER NOT NULL DEFAULT 5,
  total_help_count INTEGER NOT NULL DEFAULT 0,
  total_request_count INTEGER NOT NULL DEFAULT 0,
  positive_review_count INTEGER NOT NULL DEFAULT 0,
  negative_review_count INTEGER NOT NULL DEFAULT 0,
  credit_level TEXT NOT NULL DEFAULT 'bronze',
  free_help_count INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  real_name TEXT,
  student_id TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建订单表
CREATE TABLE delivery_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_number TEXT NOT NULL UNIQUE,
  requester_id TEXT NOT NULL,
  helper_id TEXT,
  pickup_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  canteen_order_number TEXT NOT NULL,
  meal_fee DECIMAL(10, 2) NOT NULL,
  tip_credit INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  requester_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  helper_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- 创建评价表
CREATE TABLE delivery_reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES delivery_orders(id),
  reviewer_id TEXT NOT NULL,
  reviewee_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建成就表
CREATE TABLE delivery_achievements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_desc TEXT NOT NULL,
  reward_type TEXT,
  reward_value INTEGER,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- 创建争议表
CREATE TABLE delivery_disputes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL REFERENCES delivery_orders(id),
  initiator_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resolution TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建社交动态表
CREATE TABLE delivery_moments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  order_id TEXT REFERENCES delivery_orders(id),
  image_url TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建点赞表
CREATE TABLE delivery_moment_likes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  moment_id TEXT NOT NULL REFERENCES delivery_moments(id),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

-- 创建索引
CREATE INDEX idx_delivery_users_user_id ON delivery_users(user_id);
CREATE INDEX idx_delivery_users_credit_level ON delivery_users(credit_level);
CREATE INDEX idx_delivery_orders_requester ON delivery_orders(requester_id);
CREATE INDEX idx_delivery_orders_helper ON delivery_orders(helper_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_reviews_order ON delivery_reviews(order_id);
CREATE INDEX idx_delivery_achievements_user ON delivery_achievements(user_id);
CREATE INDEX idx_delivery_disputes_order ON delivery_disputes(order_id);
CREATE INDEX idx_delivery_moments_user ON delivery_moments(user_id);

-- 启用RLS
ALTER TABLE delivery_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_moment_likes ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Allow all operations on delivery_users" ON delivery_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on delivery_orders" ON delivery_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on delivery_reviews" ON delivery_reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on delivery_achievements" ON delivery_achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on delivery_disputes" ON delivery_disputes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on delivery_moments" ON delivery_moments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on delivery_moment_likes" ON delivery_moment_likes FOR ALL USING (true) WITH CHECK (true);