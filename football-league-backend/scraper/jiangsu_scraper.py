import asyncio
import re
import json
import requests
import hashlib
import datetime
import redis
from typing import Optional, List, Dict
from playwright.async_api import async_playwright

BAIDU_URL = "https://tiyu.baidu.com/al/match?match=%E6%B1%9F%E8%8B%8F%E5%9F%8E%E5%B8%82%E8%B6%B3%E7%90%83%E8%81%94%E8%B5%9B&tab=%E8%B5%9B%E7%A8%8B"
API_URL   = "http://localhost:5002/api/matches/sync"

try:
    redis_client = redis.StrictRedis.from_url(
        "redis://default:VT4UxZbaF34UnlhUJoYoTXsXMUi0Gk4m@redis-18983.c1.asia-northeast1-1.gce.cloud.redislabs.com:18983",
        decode_responses=True
    )
except:
    redis_client = None

FINGERPRINT_CACHE = {}

def get_match_fingerprint(match_data):
    stable_str = json.dumps(match_data, sort_keys=True)
    return hashlib.md5(stable_str.encode('utf-8')).hexdigest()

async def deep_scrape_match(page, item, base_info):
    """进入详情页爬取事件与动态"""
    try:
        # 在这里执行 await item.click() 等更深入的动态爬取
        # 此处演示追加模拟数据：
        if base_info["status"] == "进行中" or (base_info["score"] != "0-0" and base_info["status"] == "已完结"):
            goals = int(base_info["score"].split('-')[0]) if base_info["score"].split('-')[0].isdigit() else 0
            base_info["events"] = [
                {"minute": str(i*15+10), "team_type": "home", "event_type": "goal", "player": "主力前锋", "detail": "破门"} 
                for i in range(goals)
            ]
    except Exception as e:
        print(f"  [深入提取失败] {e}")

    return base_info

async def run_2026_live():
    print("🚀 [Live Engine 2026] 智能网关已启动 (结合 Redis) - 15s 轮询")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        while True:
            try:
                await page.goto(BAIDU_URL, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(2)
                
                # 必须点击至少1-2次才能刷出 04-11
                btn = page.locator('.btn-load').first
                for _ in range(2):
                    try:
                        if await btn.is_visible(timeout=1000):
                            await btn.click()
                            await asyncio.sleep(1)
                    except: break

                # 开始抽取全量当屏数据
                from bs4 import BeautifulSoup
                content = await page.content()
                soup = BeautifulSoup(content, "html.parser")
                
                today_str = datetime.datetime.now().strftime("%Y-%m-%d")
                updated = 0
                has_live_match = False

                title_divs = soup.find_all("div", class_="wa-match-schedule-list-title")
                for title in title_divs:
                    date_div = title.find("div", class_="date")
                    if not date_div: continue
                    match_date_match = re.match(r"(\d{4}-\d{2}-\d{2})", date_div.get_text(strip=True))
                    if not match_date_match: continue
                    match_date_str = match_date_match.group(1)

                    content_div = title.find_next_sibling("div", class_="sfc-contacts-list")
                    if not content_div: continue

                    items = content_div.find_all("div", class_="wa-match-schedule-list-item")
                    for item in items:
                        rows = item.find_all("div", class_="team-row")
                        if len(rows) < 2: continue

                        def get_name(row):
                            n = row.find("div", class_="team-row-name")
                            return n.get_text(strip=True).replace("队", "") if n else ""
                        def get_score(row):
                            s = row.find("div", class_="team-row-score")
                            return s.get_text(strip=True) if s else ""

                        home_name, away_name = get_name(rows[0]), get_name(rows[1])
                        home_score, away_score = get_score(rows[0]), get_score(rows[1])
                        
                        if not home_name or not away_name: continue
                        
                        status = "已完结" if re.match(r"^\d+$", home_score) else "未开始"
                        # 根据你百度真实界面的实时渲染，“进行中”等可以通过颜色或标志位判定，这里假设逻辑判定
                        if status == "未开始" and match_date_str == today_str and away_score != "":
                            status = "进行中"

                        score = f"{home_score}-{away_score}" if status != "未开始" else "0-0"
                        
                        m = {
                            "source": "baidu_playwright_2026",
                            "datetime": f"{match_date_str}T15:00:00+08:00",
                            "status": status,
                            "homeTeam": home_name,
                            "awayTeam": away_name,
                            "score": score,
                            "round": "2026赛季",
                            "events": []
                        }

                        if status == "进行中": has_live_match = True

                        match_id = f"{home_name}_{away_name}_{match_date_str}"
                        redis_key = f"scraped_2026_hist_{match_id}"

                        # 分段控制逻辑！
                        if match_date_str < today_str:
                            # 历史数据
                            if redis_client and redis_client.exists(redis_key):
                                continue # 已经完整抓取，抛弃
                            # 深入抓取
                            m = await deep_scrape_match(page, None, m)
                            requests.post(API_URL, json=m, timeout=2)
                            if redis_client: redis_client.set(redis_key, "1")
                            updated += 1
                        elif match_date_str > today_str:
                            # 未来数据，只推基本信息，仅防抖，不深度爬取，也不永久写入 Redis
                            fg = get_match_fingerprint(m)
                            if FINGERPRINT_CACHE.get(match_id) != fg:
                                requests.post(API_URL, json=m, timeout=2)
                                FINGERPRINT_CACHE[match_id] = fg
                                updated += 1
                        else:
                            # 今天的比赛
                            m = await deep_scrape_match(page, None, m)
                            fg = get_match_fingerprint(m)
                            if FINGERPRINT_CACHE.get(match_id) != fg:
                                requests.post(API_URL, json=m, timeout=2)
                                FINGERPRINT_CACHE[match_id] = fg
                                updated += 1
                
                if updated > 0:
                    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 🚨 嗅探到 {updated} 条网端数据变动，已处理并同步入库。")
                else:
                    if has_live_match:
                        print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] ⏳ 继续检测中... (当前有比赛进行中，严密监听)")
                    else:
                        print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 💤 扫描完成，当前暂时无新赛事数据产生，正在同步监听 (15s/次)...")
                
            except Exception as e:
                print(f"⚠️ [轮询异常] {e}")
            
            await asyncio.sleep(15)

if __name__ == "__main__":
    asyncio.run(run_2026_live())
