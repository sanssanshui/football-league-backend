# 后端字符集问题修复指南

## 问题描述

后端API返回的数据中存在UTF-8编码问题，导致：
- 中文字符显示为乱码
- 前端无法正确识别比赛状态
- 竞猜页面无法显示比赛数据

## 修复步骤

### 方法1: 使用SQL脚本（推荐）

```bash
# 1. 进入server目录
cd football-league-backend/server

# 2. 执行SQL脚本
mysql -u root -prootpassword -h localhost -P 3307 < prisma/fix-charset.sql

# 3. 重启后端服务
npm run start:dev
```

### 方法2: 手动执行SQL命令

```bash
# 1. 连接到MySQL
mysql -u root -prootpassword -h localhost -P 3307

# 2. 切换到数据库
USE football_league;

# 3. 修改数据库字符集
ALTER DATABASE football_league CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. 修改主要表的字符集
ALTER TABLE football_match CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE teams CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE guesses CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 5. 退出MySQL
EXIT;

# 6. 重启后端服务
cd football-league-backend/server
npm run start:dev
```

### 方法3: 重建数据库（如果上述方法无效）

```bash
# 1. 停止后端服务 (Ctrl+C)

# 2. 删除并重建数据库
mysql -u root -prootpassword -h localhost -P 3307 -e "DROP DATABASE IF EXISTS football_league; CREATE DATABASE football_league CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. 重新运行Prisma迁移
cd football-league-backend/server
npx prisma migrate deploy

# 4. 重新添加测试数据
npx ts-node prisma/add-test-matches.ts

# 5. 启动后端服务
npm run start:dev

# 6. 启动爬虫同步数据
cd ../scraper
python main.py
```

## 验证修复

### 1. 检查API返回数据

```bash
curl http://localhost:5002/api/matches | python -m json.tool | head -50
```

应该能看到正确的中文字符，而不是乱码。

### 2. 检查比赛状态

```bash
curl -s http://localhost:5002/api/matches | python -c "
import sys, json
data = json.load(sys.stdin)
statuses = {}
for m in data.get('data', []):
    status = m.get('status')
    statuses[status] = statuses.get(status, 0) + 1
print('Match statuses:')
for status, count in statuses.items():
    print(f'  {status}: {count}')
"
```

应该能看到"未开始"、"已完结"等正确的状态。

### 3. 测试前端竞猜页面

1. 访问 http://localhost:3000/guess
2. 应该能看到未来30天内的未开始比赛
3. 点击竞猜按钮应该能正常提交

## 常见问题

### Q1: 执行SQL脚本时提示权限不足

**解决方案**: 确保MySQL用户有ALTER权限

```sql
GRANT ALTER ON football_league.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Q2: 修复后仍然显示乱码

**解决方案**: 
1. 检查MySQL服务器配置文件 `my.cnf` 或 `my.ini`
2. 确保包含以下配置：

```ini
[client]
default-character-set=utf8mb4

[mysql]
default-character-set=utf8mb4

[mysqld]
character-set-server=utf8mb4
collation-server=utf8mb4_unicode_ci
```

3. 重启MySQL服务
4. 重新执行修复步骤

### Q3: 前端仍然无法显示比赛

**解决方案**:
1. 清除浏览器缓存
2. 检查浏览器控制台是否有错误
3. 确认后端服务正常运行
4. 检查前端API地址是否正确

## 预防措施

### 1. 在Prisma Schema中指定字符集

在 `schema.prisma` 的 `datasource` 块中添加：

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  // 添加以下配置
  relationMode = "prisma"
}
```

### 2. 在创建数据库时指定字符集

```sql
CREATE DATABASE football_league 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### 3. 在Prisma迁移中指定字符集

在迁移文件中添加：

```sql
-- CreateTable
CREATE TABLE `users` (
  ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 完成后的检查清单

- [ ] 数据库字符集已修改为 utf8mb4
- [ ] 所有表的字符集已修改为 utf8mb4
- [ ] .env 文件中的连接字符串包含 charset=utf8mb4
- [ ] 后端服务已重启
- [ ] API返回的数据不再有乱码
- [ ] 前端竞猜页面能正常显示比赛
- [ ] 竞猜功能能正常提交和查看

## 需要帮助？

如果按照以上步骤仍然无法解决问题，请检查：
1. MySQL版本是否支持 utf8mb4
2. 数据库连接是否正常
3. Prisma Client是否已重新生成
4. 后端日志是否有错误信息
