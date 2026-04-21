import asyncio
import time
from threading import Thread

# Import sub-modules
from scrape_2025_full import run_2025_historical
from jiangsu_scraper import run_2026_live
from news_scraper import run_news_aggregator

print("========================================================")
print("🤖 足球赛事 - Playwright集群主控枢纽 (Main Coordinator)")
print("========================================================")

def threaded_news_runner():
    """News scraper is synchronous, run it on a separate background thread"""
    while True:
        try:
            run_news_aggregator()
        except Exception as e:
            print(f"❌ [News] 报错: {e}")
        time.sleep(15)  # 15s 扫描频率 (用户要求)

async def async_main_loop():
    print("🚀 [Main] 正在并发激活 2025与2026 爬虫引擎...")
    
    # 建立并发任务，一起执行 2025 溯源和 2026 监听
    # Playwright 在并发任务下会启动各自独立的浏览器实例，互不干扰
    task_2025 = asyncio.create_task(run_2025_historical())
    task_2026 = asyncio.create_task(run_2026_live())
    
    # 等待无限循环
    await asyncio.gather(task_2025, task_2026)

if __name__ == "__main__":
    # 1. 挂起同步新闻线程
    news_thread = Thread(target=threaded_news_runner, daemon=True)
    news_thread.start()

    # 2. 挂载异步 Playwright 浏览器矩阵
    try:
        asyncio.run(async_main_loop())
    except KeyboardInterrupt:
        print("\n\n🛑 收到中断信号，爬虫矩阵全部离线。")
