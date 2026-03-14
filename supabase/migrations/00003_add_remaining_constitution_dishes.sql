-- 为气虚质和平和质补充菜品
INSERT INTO dishes (name, canteen_name, window_location, price, calories, protein, flavor, suitable_constitutions) VALUES
('海鲜番茄焗饭', '校外', '校外', 18.0, 520, 25.0, '酸甜鲜香', ARRAY['气虚质', '平和质']),
('番茄意面', '清真食堂', '三楼', 19.9, 480, 12.0, '酸甜', ARRAY['气虚质', '平和质']);

-- 插入阳虚质菜品
INSERT INTO dishes (name, canteen_name, window_location, price, calories, protein, flavor, suitable_constitutions) VALUES
('羊杂面', '五味食堂', '一楼朱家小馆', 12.0, 450, 25.0, '浓郁', ARRAY['阳虚质']),
('猪肉茴香饺子', '清真食堂', '三楼手工水饺', 16.0, 420, 18.0, '咸香', ARRAY['阳虚质']),
('炸鸡蛋饼', '五味食堂', '一楼营养快餐', 2.5, 180, 8.0, '香酥', ARRAY['阳虚质']),
('鲜烫牛肉米线', '五味食堂', '一楼鲜烫牛肉米线', 19.9, 520, 32.0, '鲜辣', ARRAY['阳虚质']),
('五谷渔粉', '五味食堂', '三楼', 15.0, 420, 28.0, '鲜香', ARRAY['阳虚质']),
('关东煮', '夜市', '夜市', 5.0, 180, 8.0, '咸鲜', ARRAY['阳虚质', '血瘀质', '痰湿质', '湿热质']);

-- 插入血瘀质菜品
INSERT INTO dishes (name, canteen_name, window_location, price, calories, protein, flavor, suitable_constitutions) VALUES
('猪肉', '若邻食堂', '一楼自选菜', 8.0, 280, 20.0, '咸香', ARRAY['血瘀质']);

-- 插入气郁质菜品
INSERT INTO dishes (name, canteen_name, window_location, price, calories, protein, flavor, suitable_constitutions) VALUES
('猪肉茴香饺子', '清真食堂', '三楼手工水饺', 16.0, 420, 18.0, '咸香', ARRAY['气郁质']);

-- 插入阴虚质菜品
INSERT INTO dishes (name, canteen_name, window_location, price, calories, protein, flavor, suitable_constitutions) VALUES
('烤鸭饭', '五味食堂', '二楼', 12.0, 520, 28.0, '咸香', ARRAY['阴虚质', '湿热质']),
('茼蒿鸭肉', '若邻食堂', '一楼自选菜', 10.0, 220, 18.0, '清淡', ARRAY['阴虚质', '痰湿质', '湿热质']),
('八宝粥', '五味食堂', '一楼', 3.0, 180, 4.0, '清甜', ARRAY['阴虚质']);

-- 插入血虚质菜品（大部分已存在，无需重复插入）

-- 插入痰湿质菜品
INSERT INTO dishes (name, canteen_name, window_location, price, calories, protein, flavor, suitable_constitutions) VALUES
('麻辣烫', '汇金城', '外卖', 13.5, 380, 18.0, '麻辣', ARRAY['痰湿质', '湿热质']),
('减脂餐', '清真食堂', '三楼', 14.0, 280, 22.0, '清淡', ARRAY['痰湿质', '湿热质']),
('拌凉菜凉面', '夜市', '夜市', 5.0, 220, 6.0, '清爽', ARRAY['痰湿质', '湿热质']),
('西兰花青菜', '若邻食堂', '一楼自选菜', 6.0, 80, 3.0, '清淡', ARRAY['痰湿质', '湿热质']);

-- 插入湿热质菜品
INSERT INTO dishes (name, canteen_name, window_location, price, calories, protein, flavor, suitable_constitutions) VALUES
('吉阿婆番茄麻辣烫', '五味食堂', '三楼吉阿婆', 14.9, 380, 18.0, '酸辣', ARRAY['湿热质']);

-- 插入特禀质菜品（已有鸡蛋饼）

-- 更新已存在菜品的体质关联（添加新的体质类型）
UPDATE dishes SET suitable_constitutions = array_cat(suitable_constitutions, ARRAY['阳虚质']) 
WHERE name IN ('红糖包', '猪蹄饭', '糖糕', '卤肉包', '青椒饼', '煎香豆腐', '鸡蛋饼', '云吞', '椒麻鸡丝拌面', '火腿炒饭', '方便面', '辣肉拌面', '咸菜面', '豌杂面', '油条', '全家福', '蒸饺', '粥', '麻辣烫', '旋转小火锅', '地三鲜', '牛肉面', '香辣地锅鱼块', '黑椒鸡片', '串串香', '脆皮鸡饭', '鱼香肉丝', '小蛋糕', '焖面', '北京烤鸭', '香菇炖鸡', '馋嘴鱼', '煎饼', '水果捞', '炒生菜', '麻酱鸡丝拌面', '轻食', '纸包鱼', '火锅', '饺子猪肉双拼16个', '干拌豌杂面', '夏威夷披萨', '炸鸡', '汉堡')
AND NOT (suitable_constitutions @> ARRAY['阳虚质']);

UPDATE dishes SET suitable_constitutions = array_cat(suitable_constitutions, ARRAY['血瘀质']) 
WHERE name IN ('红糖包', '卤肉包', '西红柿鸡蛋面', '云吞', '椒麻鸡丝拌面', '全家福', '蒸饺', '西兰花', '酸汤鱼粉', '麻辣烫', '北京烤鸭', '炒生菜', '猪肉白菜饺子', '焖面', '水果捞', '纸包鱼', '火锅', '饺子猪肉双拼16个')
AND NOT (suitable_constitutions @> ARRAY['血瘀质']);

UPDATE dishes SET suitable_constitutions = array_cat(suitable_constitutions, ARRAY['气郁质']) 
WHERE name IN ('卤肉包', '西红柿鸡蛋面', '云吞', '椒麻鸡丝拌面', '蒸饺', '西兰花', '北京烤鸭', '猪肉白菜饺子', '焖面', '水果捞', '纸包鱼', '鸡蛋瘦肉肠粉', '火锅', '饺子猪肉双拼16个')
AND NOT (suitable_constitutions @> ARRAY['气郁质']);

UPDATE dishes SET suitable_constitutions = array_cat(suitable_constitutions, ARRAY['阴虚质']) 
WHERE name IN ('水煮蛋', '牛奶燕麦粥', '西红柿鸡蛋面', '黄焖鸡米饭', '鸡蛋饼', '云吞', '黑米粥', '火腿炒饭', '清汤面', '轻食', '黑椒鸡片', '鸡蛋瘦肉肠粉', '牛肉面', '蒸饺', '卤肉包', '麻辣烫', '番茄面', '酸汤鱼粉', '煎饼', '芋泥金沙披萨')
AND NOT (suitable_constitutions @> ARRAY['阴虚质']);

UPDATE dishes SET suitable_constitutions = array_cat(suitable_constitutions, ARRAY['血虚质']) 
WHERE name IN ('云吞', '黑米粥', '蒸饺', '全家福', '粥', '焖面', '饺子猪肉双拼16个')
AND NOT (suitable_constitutions @> ARRAY['血虚质']);

UPDATE dishes SET suitable_constitutions = array_cat(suitable_constitutions, ARRAY['痰湿质']) 
WHERE name IN ('青椒饼', '椒麻鸡丝拌面', '清汤面', '黄焖鸡米饭', '轻食', '串串香', '牛肉面', '煎饼', '小蛋糕', '焖面', '甜辣味麻辣烫', '香辣地锅鱼块', '火锅', '饺子猪肉双拼16个', '红糖方糕', '纸包鱼', '牛肉米线', '番茄牛肉面')
AND NOT (suitable_constitutions @> ARRAY['痰湿质']);

UPDATE dishes SET suitable_constitutions = array_cat(suitable_constitutions, ARRAY['湿热质']) 
WHERE name IN ('清汤面', '轻食', '煎饼', '红糖方糕', '火锅', '饺子猪肉双拼16个', '纸包鱼', '牛肉米线', '番茄牛肉面', '辣白菜石锅拌饭', '海鲜番茄焗饭')
AND NOT (suitable_constitutions @> ARRAY['湿热质']);

UPDATE dishes SET suitable_constitutions = array_cat(suitable_constitutions, ARRAY['特禀质']) 
WHERE name = '鸡蛋饼'
AND NOT (suitable_constitutions @> ARRAY['特禀质']);
