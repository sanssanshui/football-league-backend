# 后端运行状态检查

## 当前状态

✅ **后端服务**: 正常运行在 http://localhost:5002
✅ **数据库连接**: 正常
✅ **API路由**: 所有路由正确映射
✅ **爬虫服务**: 正常同步数据

## 发现的问题

### 1. 字符编码问题

API返回的数据中存在UTF-8编码问题，导致中文字符显示为乱码：
- 状态字段显示为乱码而不是"未开始"、"已完结"等
- 球队名称显示为乱码
- 场地名称显示为乱码

**原因**: 数据库字符集配置可能不正确

**解决方案**:

1. 检查MySQL数据库字符集配置
2. 确保数据库、表和字段都使用 `utf8mb4` 字符集
3. 检查Prisma连接字符串是否包含字符集参数

### 2. 前端数据筛选逻辑

前端代码正确实现了数据筛选逻辑：
- 筛选状态为"未开始"的比赛
- 筛选未来30天内的比赛
- 正确转换数据格式

但由于后端返回的状态字段是乱码，前端无法正确识别"未开始"状态。

## 修复步骤

### 步骤1: 修复数据库字符集

```sql
-- 检查当前字符集
SHOW VARIABLES LIKE 'character_set%';

-- 修改数据库字符集
ALTER DATABASE football_league CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 修改表字符集
ALTER TABLE football_match CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE teams CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE guesses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 步骤2: 更新Prisma连接字符串

在 `.env` 文件中添加字符集参数：

```env
DATABASE_URL="mysql://root:rootpassword@localhost:3307/football_league?schema=public&charset=utf8mb4"
```

### 步骤3: 重新生成Prisma Client

```bash
cd football-league-backend/server
npx prisma generate
```

### 步骤4: 重启后端服务

```bash
npm run start:dev
```

## 测试竞猜功能

修复字符集问题后，按以下步骤测试：

1. **访问竞猜页面**: http://localhost:3000/guess
2. **检查比赛列表**: 应该能看到未来30天内的未开始比赛
3. **提交竞猜**: 点击"主胜"、"平局"或"客胜"按钮
4. **查看竞猜记录**: 访问个人中心查看竞猜记录

## 当前数据统计

- 总比赛数: 91场
- 已完结: 12场
- 未开始: 79场（但由于字符集问题无法正确识别）

## 建议

1. **立即修复字符集问题** - 这是最紧急的问题
2. **清理重复数据** - 爬虫在不断同步相同的数据
3. **优化爬虫频率** - 可以降低同步频率，避免不必要的数据库写入
4. **添加数据验证** - 在数据入库前验证字符编码

## 快速修复命令

```bash
# 1. 停止当前服务 (Ctrl+C)

# 2. 连接到MySQL
mysql -u root -prootpassword -h localhost -P 3307

# 3. 执行字符集修复
USE football_league;
ALTER DATABASE football_league CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE football_match CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE teams CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE guesses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. 退出MySQL
EXIT;

# 5. 更新.env文件
# 在DATABASE_URL末尾添加 &charset=utf8mb4

# 6. 重启服务
cd football-league-backend/server
npm run start:dev
```
