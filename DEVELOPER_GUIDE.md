# 👨‍💻 Developer Guide: Architecture & Module Locations
# 👨‍💻 开发者地图：架构分层与模块导航

[English](#english) | [中文说明](#%E4%B8%AD%E6%96%87%E8%AF%B4%E6%98%8E)

---

## English

This guide is designed to help you, as a developer, navigate the frontend and backend codebases. It serves as a map to locate where specific features are implemented and where you should write new code.

### 🌟 1. System Overview
- **`football-league-front-end/`**: The Next.js React Application that renders the user interface.
- **`football-league-backend/`**: The NestJS API application that handles business logic and database queries.

### 🖥 2. Frontend Development (`football-league-front-end/`)
- **`src/app/`**: Contains the page routing and layouts (App Router). Create new folders here for new pages (e.g. `src/app/matches/page.tsx`).
- **`src/components/`**: UI components that are reused.
  - **`ui/`**: Automatically generated Shadcn/UI components. Do not manually edit.
  - **Root**: Your custom business components (e.g., `Navbar.tsx`).

### ⚙️ 3. Backend Development (`football-league-backend/server/`)
- **`src/prisma/`**: Connects to the database (`schema.prisma`).
- **`src/auth/`**: Handles Login, Registration, JWT.
- **Feature Modules** (e.g., `src/users/`):
  - `controller.ts`: API endpoints.
  - `service.ts`: Business logic and Prisma DB calls.

---

## 中文说明

这份《开发者指南》是团队队友们的代码导航图。目的是为了让你快速明确：“如果要开发XXX功能，我该去哪个文件夹里写代码？”。

### 🌟 1. 系统概览 (双轨架构)
整个足球赛事项目分为两个完全独立的仓库级别文件夹：
- **`football-league-front-end/`**: 基于 Next.js 的高级前端展示层。
- **`football-league-backend/`**: 基于 NestJS 微服务模式的后端核心业务层。

### 🖥 2. 前端开发区 (`football-league-front-end/`)
前端使用最前沿的 **Next.js App Router** 架构。

#### 核心目录解释
- **`src/app/`**: 存放所有页面的路由规则。
  - **你在哪里写新页面？**：如果你要新增一个比赛列表页 `/matches`，你只需要新建文件夹 `src/app/matches/` 然后在里面创建一个 `page.tsx`。
  - **`src/app/page.tsx`**: 我们的项目主视觉入口（那个很酷的带有毛玻璃和视频背景的主页）。
  - **`src/app/auth/page.tsx`**: 负责登录注册的主页面（它通过客户端请求访问我们刚才 Docker 中的数据库）。
  - **`src/app/layout.tsx`**: 全局挂载点（Navbar导航栏就是在这里注入的）。

- **`src/components/`**: 提取的高可复用 UI 组件。
  - **`src/components/ui/`**: 存放通过 `shadcn/ui` 自动生成的原子组件（按钮、表单）。**一般不需要你手动修改。**
  - **`src/components/` (根目录)**: 存放我们团队自己写的业务组件，比如比赛卡片 (`MatchCard.tsx`)。当你写好组件后，就在页面里去 `import` 它。

### ⚙️ 3. 后端开发区 (`football-league-backend/server/`)
后端采用具有依赖注入特性的 **NestJS** 框架。非常像后端的 Angular 或是 Spring Boot。每个功能（鉴权、用户、比赛）都有自己独立的模块夹。

#### 核心模块解释
- **`src/prisma/`**: 这里是数据库的心脏部分。当业务需要新增数据库字段或新建表时，请修改 `server/prisma/schema.prisma` 然后重新运行 `npx prisma db push`。
- **业务模块** (例如 `src/users/`):
  - **`*.controller.ts`**: 用于对外暴露具体的 API 路由接口（比如开放一个 `GET /api/user/info`）。你如果要接新接口，写在这里。
  - **`*.service.ts`**: 专注各种复杂的业务逻辑计算。所有和数据库 Prisma 进行增删改查的操作，全都写在 Service 里供 Controller 调用。

### 🔐 4. 前后端联调极简流程
1. **约定接口数据**: 商定好功能所需的 JSON 结构。
2. **写后端**: 使用命令 `npx nest g module match && npx nest g controller match && npx nest g service match` 一键生成后端结构代码。进 `match.service.ts` 里连接 Prisma 获取数据。
3. **接前端**: 在页面的 `useEffect` 或者 Next.js 组件里，通过 `NEXT_PUBLIC_API_URL` 地址发起数据请求并绑定给 UI 组件。
4. **测试流程**: 第一步提到的启动 MySQL Docker 容器并本地双启动后，接口就跑通了！
