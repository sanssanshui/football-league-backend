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

### `start-project.bat` 一键启动脚本说明
在项目根目录下直接运行 `start-project.bat`，脚本会按预设顺序自动完成项目启动所需的准备工作，并尽量减少手动切换目录和输入命令的步骤。建议在运行前确认相关依赖已安装完成，且本地数据库(MySQL等)已正常启动。


**终端 1: 启动服务与爬虫中枢 (后端)**
```bash
# 首先，回到你的特性分支 (假如你还在 feature/news-list)
git checkout feature/news-list

# 【关键动作】将远程最新的 develop 变化强行“接”到你现在的代码下面
git pull --rebase origin develop
```
*⚠️ **注意**：如果出现冲突（CONFLICT），打开编辑器手动解决冲突后文件，然后运行 `git add .`，最后执行 `git rebase --continue`。*

**5️. 推送你的分支到远程并申请合并 (PR/MR)**
本地一切正常后，把你的分支推送到云端：
```bash
git push origin feature/news-list
```

**6️. 在线提交 Pull Request (PR)**
在 GitHub/GitLab 上提交 PR，申请将 `feature/news-list` 合并到 `develop` 分支。代码 Review 通过并合并后，你就可以删除本地的特性分支去接下一个需求了！

### 📄 开源许可证 (License)
本项目采用 [MIT License](LICENSE) 授权。 版权所有 (c) 2026 足球联盟项目组。
