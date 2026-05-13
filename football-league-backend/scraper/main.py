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
    
    # 等待所有任务
    await asyncio.gather(task_2025, task_2026)


def run_rankings_snapshots():
    print("📊 [Main] 开始抓取懂球帝榜单快照...")
    run_standings_snapshot()
    run_player_rankings_snapshot()
    run_team_rankings_snapshot()

if __name__ == "__main__":
    try:
        run_rankings_snapshots()
        asyncio.run(async_main_loop())
    except KeyboardInterrupt:
        print("\n\n🛑 收到中断信号，爬虫矩阵全部离线。")
