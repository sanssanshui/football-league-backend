# Football League Platform ⚽️

[English](#english) | [中文说明](#%E4%B8%AD%E6%96%87%E8%AF%B4%E6%98%8E)

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-10-ea2845?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" />
</div>

<br />

---

## English

A modern, dynamic football platform providing live scores, news, interactive communities, and an immersive user experience akin to FIFA's digital presence.

### 🏛 Architecture
- **Frontend**: Next.js (App Router), Tailwind CSS, React Zustand, Framer Motion.
- **Backend**: NestJS, Prisma ORM, MySQL, JWT Authentication.
- **Deployment**: Vercel for Frontend, Docker on Cloud Servers for Backend.

### 🚀 Getting Started (Local Development)
#### Backend Setup (with Docker)
1. `cd football-league-backend`
2. Run MySQL in Docker: `docker-compose up -d`
3. `cd server` and `npm install`
4. Setup `.env`: `DATABASE_URL="mysql://root:rootpassword@localhost:3306/football_league"`
5. `npx prisma db push`
6. Start the backend application in development mode:
   ```bash
   cd server
   npm run start:dev
   ```
   *(Server runs on port 5000)*

#### Frontend Setup
1. `cd football-league-front-end`
2. `pnpm install`
3. Setup `.env.local`: `NEXT_PUBLIC_API_URL="http://localhost:5000"`
4. Start: `pnpm dev` (runs on port 3000)

### 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. Copyright (c) 2026 Football League Platform.

---

## 中文说明

足球动态联盟极客版——一个现代化的足球赛事平台，提供比分、新闻资讯、球迷互动的沉浸式数字体验（类似 FIFA 官方视觉标准）。

### 🏛 架构技术栈
- **前端技术**: Next.js (App Router 机制), Tailwind CSS 配合 shadcn/ui 组件, 状态管理基于 Zustand, 动画采用 Framer Motion。
- **后端架构**: NestJS 微服务架构, Prisma ORM, MySQL 数据库, 采用标准 JWT 动态鉴权。
- **部署策略**: 前端接入 Vercel 边缘网络加速部署，后端数据库通过 Docker 独立容器化运行。

### 🚀 启动指引（致开发者队友们）
我们在保证“开箱即用”的前提下极大地简化了部署流程。无论你是接手前端还是后端，按照以下步骤一定会体验到启动的喜悦！

#### 第一步：启动后端与数据库 (Docker版)
你的本地可能没有 MySQL 配置环境，别担心，我们用 Docker 一键解决：
1. 进入后端目录：`cd football-league-backend`
2. **启动 MySQL 数据库容器**：`docker-compose up -d`  *(这一步会自动拉取数据库并在后台运行)*
3. 进入服务逻辑层：`cd server` 并安装依赖 `npm install`
4. **初始化数据表**：运行 `npx prisma db push` （会自动将我们的表结构推送到刚才启动的 Docker 数据库中）
5. **开启后端服务**：`npm run start:dev` *(此时后端接口将在 `http://localhost:5000` 监听)*

#### 第二步：启动前端项目
1. 进入前端目录：`cd football-league-front-end`
2. 安装依赖：`pnpm install`
3. **开启前端服务**：`pnpm dev`
4. 打开浏览器访问 `http://localhost:3000`！

*(如果你在过程中遇到登录/注册，请放手测试，数据已经安全存入了你本地的 Docker 容器中。成功登录后顶部导航栏会动态变成你的用户名头像！)*。

---

## 🤝 团队协作指南 (Collaboration Guidelines)

为了保证前后端团队（尤其是 Mac 与 Windows 混合平台团队）的高效协作，请遵循以下规范：

### 1. 跨平台开发 (Mac vs Windows)
*   **换行符问题 (CRLF vs LF):** 我们已经在根目录配置了 `.gitattributes` 文件（`* text=auto eol=lf`）。Git 会在提交时自动将换行符转为 `LF`，拉取时保持 `LF`，请确保你的编辑器（VSCode / WebStorm）右下角也设置为 `LF` 结尾，以避免不必要的冲突。
*   **终端乱码问题 (类似 `G T git：mai`)**: 如果你是 Mac 用户并使用了 Oh-my-zsh（如 Agnoster 主题），由于缺乏特定字体，终端可能会显示乱码。解决办法：
    1. 前往 GitHub 下载并安装配置 [Powerline Fonts](https://github.com/powerline/fonts)（或更推荐直接安装 Nerd Fonts，如 `Hack Nerd Font`）。
    2. 将 Mac 自带终端或 iTerm2 的字体设置为安装好的 Powerline/Nerd 字体即可恢复正常显示。

### 2. 企业级联调与 Git 分支架构策略 (Microservices Ready)
随着项目的演进和未来的微服务拆分，作为全栈 Monorepo 项目，强烈建议整个团队遵循以下 Git 工作流规范进行协作：

#### 🌳 主干分支 (常驻分支)
*   `main` **(生产环境分支)**: 必须是绝对稳定、随时可部署到生产环境(`Prod`)的代码。所有部署触发都来自于此，**严禁向此分支直接 push 代码**。
*   `develop` **(集成测试分支)**: 前后端及所有微服务汇总的主干。你的功能在本地自测通过后，均通过 Pull Request (PR) 合并到此分支。

#### 🌿 辅助分支 (临时分支)
*   **特性分支 (Feature Branches)** - *从 `develop` 提取，合并回 `develop`*
    *   **规范化命名**: `feature/<模块或微服务名>-<短描述>` (推荐使用 `feature/` 或缩写 `feat/`)
    *   前端需求：`feature/frontend-login-ui` 或 `feat/web-dashboard`
    *   后端微服务需求：`feature/auth-service-jwt` 或 `feat/match-engine-api`
*   **发布流水线分支 (Release Branches)** - *从 `develop` 提取，合并回 `main` 和 `develop`*
    *   **命名方式**: `release/v1.0.0`。
    *   当 `develop` 积攒了足够的特性准备上线前，拉取发布分支进行 UAT、回归测试和文档补全，绝对不能在 Release 分支开发新业务。
*   **紧急修复分支 (Hotfix Branches)** - *从 `main` 提取，紧急合并回 `main` 和 `develop`*
    *   **命名方式**: `hotfix/fix-user-login-crash`。
    *   遇到生产环境严重级 Bug 时，必须在此分支修复。修复完成后立马打 Tag 部署。

#### 📝 Commit 提交规范建议 (Angular Convention)
提交信息必须清晰传达本次操作的范围与模块：
*   `feat(auth-svc): 新增手机号注册和图形验证码接口`
*   `fix(frontend): 修复亮色模式下草坪背景过度虚化引申的文字不清问题`
*   **(可选前缀)**: `docs:`(文档), `style:`(代码格式), `refactor:`(重构), `test:`(测试), `chore:`(工程依赖)

#### 🚀 全栈联调与测试最佳实践
- **如何获取最新联调环境**: 当你想拉起前端和最新后端（或网关）微服务时，推荐命令组合：`git fetch && git checkout develop && git pull origin develop`，随后一次性重启多组 Docker 容器/本地实例。
- **本地代码防污染**: 切记联调测试之前用 `git stash` 暂存本地未完成的工作，或者在自己独立的子功能分支里启动项目。

### 📄 开源许可证 (License)
本项目采用 [MIT License](LICENSE) 授权。 版权所有 (c) 2026 足球联盟项目组。
