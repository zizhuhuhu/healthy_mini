-- 创建体质类型表
CREATE TABLE constitution_types (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  suitable_foods TEXT NOT NULL,
  avoid_foods TEXT NOT NULL,
  recommended_exercises TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建菜品表
CREATE TABLE dishes (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  canteen_name TEXT NOT NULL,
  window_location TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  calories INTEGER NOT NULL,
  protein DECIMAL(10, 2) NOT NULL,
  flavor TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入9种体质类型数据
INSERT INTO constitution_types (name, description, suitable_foods, avoid_foods, recommended_exercises) VALUES
('平和质', '阴阳气血调和，体态适中，面色红润，精力充沛', '五谷杂粮、新鲜蔬菜、水果、鱼肉、豆制品', '过于油腻、辛辣刺激的食物', '各种有氧运动如慢跑、游泳、太极拳、瑜伽'),
('气虚质', '元气不足，易疲乏，气短懒言，易出汗', '山药、红枣、桂圆、鸡肉、牛肉、小米粥', '生冷寒凉、油腻难消化的食物', '轻度有氧运动如散步、八段锦、太极拳'),
('阳虚质', '阳气不足，畏寒怕冷，手脚冰凉', '羊肉、生姜、韭菜、核桃、桂圆、红枣', '生冷寒凉、冰镇饮料、苦瓜、绿豆', '温和运动如慢跑、快走、太极拳，避免大汗淋漓'),
('阴虚质', '阴液亏少，口燥咽干，手足心热', '百合、银耳、梨、鸭肉、海参、枸杞', '辛辣燥热、煎炸烧烤、羊肉、辣椒', '中小强度运动如游泳、太极拳、瑜伽'),
('痰湿质', '痰湿凝聚，体形肥胖，腹部肥满松软', '薏米、冬瓜、海带、山楂、白萝卜、茯苓', '甜食、油腻、肥肉、油炸食品、冷饮', '有氧运动如快走、慢跑、游泳、爬山'),
('湿热质', '湿热内蕴，面部油光，口苦口臭', '绿豆、苦瓜、冬瓜、黄瓜、芹菜、莲藕', '辛辣刺激、油炸烧烤、甜食、酒类', '中高强度运动如跑步、球类运动、游泳'),
('血瘀质', '血行不畅，肤色晦暗，易有瘀斑', '山楂、黑木耳、红花、桃仁、红糖、醋', '寒凉、油腻、过咸的食物', '有氧运动如慢跑、游泳、舞蹈、太极拳'),
('气郁质', '气机郁滞，情绪低落，多愁善感', '玫瑰花茶、柑橘、香蕉、小麦、百合', '辛辣刺激、咖啡、浓茶', '户外运动如跑步、登山、瑜伽、舞蹈'),
('特禀质', '先天禀赋不足，易过敏，适应能力差', '益气固表的食物如红枣、蜂蜜、山药', '易过敏食物如海鲜、花生、牛奶、芒果', '温和运动如太极拳、八段锦、散步');

-- 插入示例菜品数据
INSERT INTO dishes (name, canteen_name, window_location, price, calories, protein, flavor, image_url) VALUES
('清蒸鲈鱼', '第一食堂', '3号窗口', 18.00, 320, 28.5, '清淡鲜美', NULL),
('红烧牛肉', '第一食堂', '5号窗口', 15.00, 450, 32.0, '浓郁香醇', NULL),
('蒜蓉西兰花', '第二食堂', '2号窗口', 8.00, 120, 4.5, '清爽健康', NULL),
('番茄炒蛋', '第二食堂', '1号窗口', 10.00, 280, 12.0, '酸甜可口', NULL),
('小米粥', '第三食堂', '早餐窗口', 3.00, 150, 3.5, '清淡养胃', NULL),
('山药排骨汤', '第三食堂', '4号窗口', 16.00, 380, 25.0, '鲜香滋补', NULL),
('凉拌黄瓜', '第一食堂', '凉菜窗口', 6.00, 80, 1.5, '清爽开胃', NULL),
('麻辣香锅', '第二食堂', '6号窗口', 20.00, 650, 18.0, '麻辣鲜香', NULL),
('薏米红豆粥', '第三食堂', '早餐窗口', 5.00, 180, 5.0, '清甜祛湿', NULL),
('清炒芦笋', '第一食堂', '2号窗口', 9.00, 100, 3.0, '清淡爽口', NULL),
('糖醋里脊', '第二食堂', '5号窗口', 14.00, 520, 22.0, '酸甜适中', NULL),
('冬瓜海带汤', '第三食堂', '汤品窗口', 7.00, 90, 2.5, '清淡利水', NULL);

-- 设置RLS策略（公开访问，无需登录）
ALTER TABLE constitution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取体质类型
CREATE POLICY "允许所有人查看体质类型" ON constitution_types
  FOR SELECT USING (true);

-- 允许所有人读取菜品
CREATE POLICY "允许所有人查看菜品" ON dishes
  FOR SELECT USING (true);