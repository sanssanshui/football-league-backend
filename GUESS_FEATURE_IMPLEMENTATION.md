# 赛事竞猜功能实现文档

## 功能概述

赛事竞猜功能允许用户对未开赛的比赛进行预测，消耗积分参与竞猜，比赛结束后根据结果获得积分奖励或扣除。

## 核心流程

### 1. 数据流

```
爬虫 (scraper) → 后端API (NestJS) → 数据库 (MySQL/Prisma) → 前端 (Next.js)
```

### 2. 竞猜流程

1. **查看可竞猜比赛**
   - 前端从 `/api/matches` 获取所有比赛
   - 筛选 `status === "未开始"` 且在未来30天内的比赛
   - 展示在竞猜页面

2. **提交竞猜**
   - 用户选择 "主胜"、"平局" 或 "客胜"
   - 调用 `POST /api/user/guesses` 提交竞猜
   - 扣除10积分，创建竞猜记录

3. **比赛结束评估**
   - 定时任务每小时检查已结束的比赛
   - 调用 `UsersService.evaluateGuesses()` 评估竞猜结果
   - 猜对：奖励20积分
   - 猜错：不返还积分

4. **查看竞猜记录**
   - 个人中心显示所有竞猜记录
   - 显示竞猜结果、比赛结果、积分变化

## 技术实现

### 后端 API

#### 1. 竞猜相关接口

**提交竞猜**
```typescript
POST /api/user/guesses
Headers: Authorization: Bearer <token>
Body: { matchId: number, guessResult: string }
Response: { code: 200, message: "竞猜提交成功", data: Guess }
```

**获取竞猜记录**
```typescript
GET /api/user/guesses
Headers: Authorization: Bearer <token>
Response: { code: 200, data: Guess[] }
```

**清空竞猜记录**
```typescript
DELETE /api/user/guesses
Headers: Authorization: Bearer <token>
Response: { code: 200, message: "竞猜记录已清空" }
```

#### 2. 数据模型

```prisma
model Guess {
  id           Int      @id @default(autoincrement())
  user_id      Int
  match_id     Int
  guess_result String   @db.VarChar(10)  // "主胜", "平局", "客胜"
  score_cost   Int      @default(0)      // 消耗积分
  score_reward Int?                      // 奖励积分
  status       Int      @default(0)      // 0=未评估, 1=已评估
  isCorrect    Boolean?                  // 是否猜对
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user  User  @relation(fields: [user_id], references: [id])
  match Match @relation(fields: [match_id], references: [id])

  @@unique([user_id, match_id])
}
```

#### 3. 定时任务

```typescript
@Cron(CronExpression.EVERY_HOUR)
async evaluateFinishedMatches() {
  // 查找所有已结束且有未评估竞猜的比赛
  const finishedMatches = await this.prisma.match.findMany({
    where: {
      status: 2,  // 已结束
      guesses: { some: { status: 0 } }  // 有未评估的竞猜
    }
  });

  // 评估每场比赛的竞猜
  for (const match of finishedMatches) {
    await this.usersService.evaluateGuesses(match.id);
  }
}
```

### 前端实现

#### 1. 竞猜页面 (`/guess`)

**核心功能**
- 展示未来30天内未开赛的比赛
- 三个按钮：主胜、平局、客胜
- 提交后显示"已竞猜"状态
- 实时反馈竞猜结果

**关键代码**
```typescript
const loadMatches = async () => {
  const res = await fetch(`${API}/api/matches`);
  const json = await res.json();
  
  // 筛选未开赛的比赛
  const upcoming = json.data.filter((m: any) => {
    if (m.status !== '未开始') return false;
    const matchTime = new Date(m.timestamp);
    return matchTime >= now && matchTime <= oneMonthLater;
  });
  
  setMatches(upcoming);
};

const handleGuess = async (matchId: number, result: string) => {
  const res = await fetch(`${API}/api/user/guesses`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ matchId, guessResult: result }),
  });
  // 处理响应...
};
```

#### 2. 个人中心 (`/profile`)

**竞猜记录展示**
- 显示所有竞猜记录
- 显示比赛结果和竞猜结果对比
- 显示积分变化（+20 或 -10）
- 区分三种状态：
  - ✓ 猜对了 +20分 (绿色)
  - ✗ 猜错了 (红色)
  - ⏳ 等待比赛结果 (橙色)

**积分明细**
- 显示所有竞猜的积分变化
- 累计获得积分
- 已使用积分

## 数据同步

### 爬虫数据更新

爬虫实时更新比赛数据：
- 未开赛比赛：仅同步基础信息
- 进行中比赛：高频更新比分和统计
- 已结束比赛：状态变化后补抓一次

### 比赛状态

```typescript
status: 0  // 未开始 - 可竞猜
status: 1  // 进行中 - 不可竞猜
status: 2  // 已结束 - 触发评估
status: 3  // 已取消
```

## 测试数据

使用 `prisma/add-test-matches.ts` 添加测试比赛：

```bash
cd football-league-backend/server
npx ts-node prisma/add-test-matches.ts
```

这会创建10场未来30天内的测试比赛，用于测试竞猜功能。

## 积分规则

- **竞猜消耗**: 10积分/次
- **猜对奖励**: 20积分
- **猜错惩罚**: 不返还积分
- **净收益**: 猜对 +10积分，猜错 -10积分
- **积分不足**: 自动补充到100积分

## 注意事项

1. **唯一性约束**: 每个用户每场比赛只能竞猜一次
2. **时间限制**: 只能对未开赛的比赛进行竞猜
3. **自动评估**: 比赛结束后1小时内自动评估
4. **积分保护**: 积分不足时自动补充，确保用户可以继续竞猜

## 未来优化

1. 添加竞猜统计（胜率、连胜等）
2. 添加竞猜排行榜
3. 支持更多竞猜类型（比分、进球数等）
4. 添加竞猜分析和推荐
5. 实时推送比赛结果和竞猜结果
