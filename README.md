# 江苏城市足球联赛 (苏超) 平台 v2.1

## 🧑‍💻 队友快速跑通指南 (本地运行)

### 前置环境要求
1. **Node.js** (推荐 v18+), **pnpm**
2. **Python 3.9+** (带有 pip)
3. **MySQL** 数据库服务本地运行

---

### Step 1: 数据库与后端初始化
```bash
cd football-league-backend/server

# 安装后端依赖
npm install

# 配置环境变量
# 如果没有 .env 文件，请复制一份
cp .env.example .env 
# [在 .env 中确保包含以下行，并修改为你本地的 MySQL 密码]
# DATABASE_URL="mysql://root:你的密码@localhost:3306/football_league?schema=public"

# 重置并拉取最新的数据库结构与初始种子数据
npx prisma migrate reset --force

# 回到后端根目录
cd ..
```

### Step 2: 爬虫 Python 环境配置
```bash
cd football-league-backend/scraper

# 创建并激活虚拟环境
python3 -m venv .venv
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

---

### 🚀 一键整体启动

本平台采用全栈联动架构，日常开发只需开两个终端：

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
