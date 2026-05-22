import asyncio

# Import sub-modules
from scrape_2025_full import run_2025_historical
from scrape_2026_sync import run_2026_engine
from scrape_ranking_standings import run as run_standings_snapshot
from scrape_ranking_players import run as run_player_rankings_snapshot
from scrape_ranking_teams import run as run_team_rankings_snapshot

print("========================================================")
print("🤖 足球赛事 - Playwright集群主控枢纽 (Main Coordinator)")
print("  📌 新闻爬取暂时关闭, 专注赛事数据同步")
print("========================================================")

async def async_main_loop():
    print("🚀 [Main] 正在并发激活 2025历史 + 2026实时 爬虫引擎...")
    
    # 建立并发任务
    task_2025 = asyncio.create_task(run_2025_historical())
    task_2026 = asyncio.create_task(run_2026_engine())
    task_rankings = asyncio.create_task(run_periodic_rankings())
    
    # 等待所有任务
    await asyncio.gather(task_2025, task_2026, task_rankings)


def run_rankings_snapshots():
    print("📊 [Main] 开始抓取懂球帝榜单快照...")
    run_standings_snapshot()
    run_player_rankings_snapshot(sync=True)
    run_team_rankings_snapshot(sync=True)

async def run_periodic_rankings():
    while True:
        try:
            await asyncio.to_thread(run_rankings_snapshots)
        except Exception as e:
            print(f"❌ [Main] Rankings sync failed: {e}")
        # 每小时同步一次榜单
        await asyncio.sleep(3600)

if __name__ == "__main__":
    try:
        asyncio.run(async_main_loop())
    except KeyboardInterrupt:
        print("\n\n🛑 收到中断信号，爬虫矩阵全部离线。")
