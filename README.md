# 江苏城市足球联赛 (苏超) [非官方]  v2.1


### Step 1: 切换分支
```bash
cd <项目目录>
git checkout develop
```

### Step 2: 爬虫 Python 环境配置
```bash
cd football-league-backend/scraper

# 创建并激活虚拟环境
python -m venv .venv
source .venv/bin/activate  # Windows 下使用 .venv\Scripts\activate

# 安装全量依赖 (包含 Playwright内核 和 Redis)
pip install -r requirements.txt
playwright install chromium

# 下载完后退出虚拟环境
deactivate
cd ../../
```

### Step 3: 前端初始化
```bash
cd football-league-front-end

# 安装前端依赖
pnpm install

cd ..
```
### Step 4: 后端初始化
```bash
cd football-league-backend/server
npm install
# 确保你的本地 MySQL 已启动，修改 .env 中的数据库密码
npx prisma db push    # 同步表结构
```
---

### 一键整体启动

本平台采用联动架构，日常开发只需开两个终端：

**终端 1: 启动服务与爬虫中枢 (后端)**
```bash
cd football-league-backend
# 执行一键启动脚本 (会自动拉起 NestJS 后端 + Python 多线程 Redis 爬虫)
chmod +x start.sh  # 首次需要赋予权限
./start.sh
```

**终端 2: 启动前端 (Next.js)**
```bash
cd football-league-front-end
pnpm dev
```

> **系统地址**: 
> 🌐 前端: http://localhost:3000 
> ⚙️ 后端接口: http://localhost:5002
> 📊 GraphQL: http://localhost:5002/graphql
