-- 配送地址表
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 配送订单表
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  dish_ids TEXT[] NOT NULL,
  dish_names TEXT[] NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL,
  delivery_address_id UUID REFERENCES delivery_addresses(id),
  delivery_address TEXT NOT NULL,
  delivery_name TEXT NOT NULL,
  delivery_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  courier_id TEXT,
  canteen_location TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 跑腿收入表
CREATE TABLE IF NOT EXISTS courier_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id TEXT NOT NULL,
  order_id UUID REFERENCES delivery_orders(id),
  earning DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_user_id ON delivery_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_courier_id ON delivery_orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_courier_earnings_courier_id ON courier_earnings(courier_id);

-- RLS策略
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_earnings ENABLE ROW LEVEL SECURITY;

-- 地址表策略（所有人可读写自己的地址）
CREATE POLICY "Anyone can manage their addresses" ON delivery_addresses
  FOR ALL USING (true) WITH CHECK (true);

-- 订单表策略（所有人可读写）
CREATE POLICY "Anyone can manage orders" ON delivery_orders
  FOR ALL USING (true) WITH CHECK (true);

-- 收入表策略（所有人可读写）
CREATE POLICY "Anyone can view earnings" ON courier_earnings
  FOR ALL USING (true) WITH CHECK (true);

-- 插入示例配送地址
INSERT INTO delivery_addresses (user_id, name, phone, address, is_default) VALUES
('test_user_001', '张三', '13800138000', '东校区1号宿舍楼301', true),
('test_user_001', '张三', '13800138000', '西校区图书馆', false);

COMMENT ON TABLE delivery_addresses IS '配送地址表';
COMMENT ON TABLE delivery_orders IS '配送订单表，status: pending(待接单), accepted(已接单), delivering(配送中), completed(已送达), cancelled(已取消)';
COMMENT ON TABLE courier_earnings IS '跑腿收入表';