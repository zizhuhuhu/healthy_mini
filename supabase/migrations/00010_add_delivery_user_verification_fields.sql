-- 添加用户认证相关字段
ALTER TABLE delivery_users
ADD COLUMN IF NOT EXISTS class_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS wechat_id TEXT,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_rejected_reason TEXT;

-- 添加订单联系方式字段
ALTER TABLE delivery_orders
ADD COLUMN IF NOT EXISTS requester_phone TEXT,
ADD COLUMN IF NOT EXISTS requester_wechat TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_delivery_users_verification_status ON delivery_users(verification_status);
CREATE INDEX IF NOT EXISTS idx_delivery_users_phone_number ON delivery_users(phone_number);

-- 添加注释
COMMENT ON COLUMN delivery_users.class_name IS '班级名称';
COMMENT ON COLUMN delivery_users.phone_number IS '手机号码';
COMMENT ON COLUMN delivery_users.wechat_id IS '微信号';
COMMENT ON COLUMN delivery_users.verification_status IS '认证状态：pending待审核、approved已通过、rejected已拒绝';
COMMENT ON COLUMN delivery_users.verification_submitted_at IS '提交认证时间';
COMMENT ON COLUMN delivery_users.verification_approved_at IS '认证通过时间';
COMMENT ON COLUMN delivery_users.verification_rejected_reason IS '认证拒绝原因';
COMMENT ON COLUMN delivery_orders.requester_phone IS '求助者手机号';
COMMENT ON COLUMN delivery_orders.requester_wechat IS '求助者微信号';