import asyncio
import re
import json
import requests
import redis
import hashlib
import time
from typing import Optional, List, Dict
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from scrape_2026_detail_bundle import scrape_match_detail

BAIDU_URL = "https://tiyu.baidu.com/al/match?match=%E6%B1%9F%E8%8B%8F%E5%9F%8E%E5%B8%82%E8%B6%B3%E7%90%83%E8%81%94%E8%B5%9B&tab=%E8%B5%9B%E7%A8%8B"
API_URL   = "http://localhost:5002/api/matches/sync"
STOP_DATE = "2025-05-10"

KNOCKOUT_FIXTURES_2025 = {
    ("2025-10-04", "南京", "连云港"): {"round": "1/4决赛", "score": "1-1", "penaltyCountHome": 4, "penaltyCountAway": 2},
    ("2025-10-05", "徐州", "泰州"): {"round": "1/4决赛", "score": "1-1", "penaltyCountHome": 2, "penaltyCountAway": 4},
    ("2025-10-07", "南通", "淮安"): {"round": "1/4决赛", "score": "5-0"},
    ("2025-10-08", "盐城", "无锡"): {"round": "1/4决赛", "score": "0-3"},
    ("2025-10-18", "南京", "泰州"): {"round": "半决赛", "score": "1-1", "penaltyCountHome": 7, "penaltyCountAway": 8},
    ("2025-10-19", "南通", "无锡"): {"round": "半决赛", "score": "0-0", "penaltyCountHome": 4, "penaltyCountAway": 2},
    ("2025-11-01", "南通", "泰州"): {"round": "决赛", "score": "0-0", "penaltyCountHome": 3, "penaltyCountAway": 4},
}

# Redis Deduplication
try:
    redis_client = redis.StrictRedis.from_url(
        "redis://default:VT4UxZbaF34UnlhUJoYoTXsXMUi0Gk4m@redis-18983.c1.asia-northeast1-1.gce.cloud.redislabs.com:18983",
        decode_responses=True
    )
except Exception as e:
    print(f"[Redis] 连接失败: {e}")
    redis_client = None

def get_match_hash(home, away, match_date):
    return hashlib.md5(f"{home}_{away}_{match_date}".encode('utf-8')).hexdigest()

async def search_lineup_on_web(home, away, match_date):
    """Fallback search for lineup using Baidu Search"""
    print(f"  [Fallback Search] Searching lineup for {home} vs {away} on {match_date}...")
    query = f"2025 苏超 {match_date} {home}vs{away} 首发阵容"
    search_url = f"https://www.baidu.com/s?wd={query}"
    
    # We'll just return a placeholder or try to extract from the first few results
    # In a real scenario, we'd crawl the search results.
    # For now, we'll return a message or try a simple crawl if possible.
    return f"Lineup search initiated for {query}. Check news archives for May 10 2025."

async def deep_scrape_match(browser, match_url, base_info):
    """Dives into the match detail page to extract events, stats, text live, and lineup."""
    page = await browser.new_page()
    try:
        print(f"  [Deep Scrape] Entering details for {base_info['homeTeam']} vs {base_info['awayTeam']}...")
        detail = await scrape_match_detail(page, match_url, base_info["homeTeam"], base_info["awayTeam"])
        stats = detail.get("stats", {})

        def stat_int(name, side):
            try:
                return int(str(stats[name][side]).replace("%", "").strip())
            except Exception:
                return None

        def stat_float(name, side):
            try:
                return float(str(stats[name][side]).replace("%", "").strip())
            except Exception:
                return None

        lineups = detail.get("lineups", {"home": [], "away": [], "coaches": {"home": None, "away": None}})
        base_info.update({
            "score": detail.get("score") or base_info.get("score"),
            "location": detail.get("location") or base_info.get("location"),
            "events": detail.get("events", []),
            "textLives": detail.get("textLives", []),
            "possessionRateHome": stat_float("控球率", "home"),
            "possessionRateAway": stat_float("控球率", "away"),
            "attackHome": stat_int("进攻", "home"),
            "attackAway": stat_int("进攻", "away"),
            "dangerousAttackHome": stat_int("危险进攻", "home"),
            "dangerousAttackAway": stat_int("危险进攻", "away"),
            "shotsOnTargetHome": stat_int("射正", "home"),
            "shotsOnTargetAway": stat_int("射正", "away"),
            "shotsOffTargetHome": stat_int("射偏", "home"),
            "shotsOffTargetAway": stat_int("射偏", "away"),
            "cornerCountHome": stat_int("角球", "home"),
            "cornerCountAway": stat_int("角球", "away"),
            "penaltyCountHome": stat_int("点球", "home"),
            "penaltyCountAway": stat_int("点球", "away"),
            "yellowCardHome": stat_int("黄牌", "home"),
            "yellowCardAway": stat_int("黄牌", "away"),
            "redCardHome": stat_int("红牌", "home"),
            "redCardAway": stat_int("红牌", "away"),
            "homeShots": stat_int("射正", "home"),
            "awayShots": stat_int("射正", "away"),
            "lineupHome": {
                "formation": detail.get("homeFormation") or lineups.get("homeFormation"),
                "players": lineups.get("home", []),
                "coach": lineups.get("coaches", {}).get("home"),
                "referee": detail.get("referee"),
            },
            "lineupAway": {
                "formation": detail.get("awayFormation") or lineups.get("awayFormation"),
                "players": lineups.get("away", []),
                "coach": lineups.get("coaches", {}).get("away"),
                "referee": detail.get("referee"),
            },
        })

        correction = KNOCKOUT_FIXTURES_2025.get((base_info['datetime'][:10], base_info['homeTeam'], base_info['awayTeam']))
        if correction:
            base_info["round"] = correction["round"]
            base_info["score"] = correction["score"]
            if "penaltyCountHome" in correction:
                base_info["penaltyCountHome"] = correction["penaltyCountHome"]
            if "penaltyCountAway" in correction:
                base_info["penaltyCountAway"] = correction["penaltyCountAway"]

    except Exception as e:
        print(f"  [深入提取失败] {e}")
    finally:
        await page.close()

    return base_info

async def _click_to_earliest(page):
    """Stays clicking 'Earlier' until STOP_DATE is reached."""
    print(f"[History] Navigating back to {STOP_DATE}...")
    while True:
        btn = page.locator('.btn-load').first
        try:
            if not await btn.is_visible(timeout=2000): break
        except: break

        await btn.scroll_into_view_if_needed()
        await btn.click()
        await asyncio.sleep(1) # Slow down to avoid being blocked
        
        content = await page.content()
        dates = re.findall(r'2025-\d{2}-\d{2}', content)
        if dates:
            earliest = min(dates)
            if earliest <= STOP_DATE:
                print(f"  ✅ Reached target date: {earliest}")
                break

async def _extract_overview_matches(page):
    """Extracts all matches from the current DOM that belong to 2025."""
    content = await page.content()
    soup = BeautifulSoup(content, "html.parser")
    results = []

    items = soup.find_all("div", class_="wa-match-schedule-list-item")
    for item in items:
        # Find the parent title for date
        parent_title = item.find_previous("div", class_="wa-match-schedule-list-title")
        if not parent_title: continue
        date_div = parent_title.find("div", class_="date")
        if not date_div: continue
        match_date = re.match(r"(\d{4}-\d{2}-\d{2})", date_div.get_text(strip=True))
        if not match_date: continue
        match_date = match_date.group(1)

        if "2025" not in match_date: continue
        if match_date < STOP_DATE: continue

        # Extract details
        dc = item.find("div", class_="vs-info-date-content")
        time_str = "15:00"
        round_name = "2025苏超"
        if dc:
            paras = dc.find_all("p")
            if paras: time_str = paras[0].get_text(strip=True) or "15:00"
            if len(paras) >= 2: round_name = paras[1].get_text(strip=True)

        rows = item.find_all("div", class_="team-row")
        if len(rows) < 2: continue
        
        home_name = rows[0].find("div", class_="team-row-name").get_text(strip=True).replace("队", "")
        away_name = rows[1].find("div", class_="team-row-name").get_text(strip=True).replace("队", "")
        home_score = rows[0].find("div", class_="team-row-score").get_text(strip=True)
        away_score = rows[1].find("div", class_="team-row-score").get_text(strip=True)
        
        status = "已完结" if re.match(r"^\d+$", home_score) else "未开始"
        score = f"{home_score}-{away_score}" if status == "已完结" else "0-0"
        
        # ISO Time
        try:
            parts = time_str.replace("：", ":").split(":")[:2]
            iso_time = f"{match_date}T{int(parts[0]):02d}:{int(parts[1]):02d}:00+08:00"
        except:
            iso_time = f"{match_date}T15:00:00+08:00"

        # Match Link
        link_el = item.find("a", href=True)
        match_url = f"https://tiyu.baidu.com{link_el['href']}" if link_el else ""

        results.append({
            "source": "baidu_history_2025_full",
            "datetime": iso_time,
            "status": status,
            "homeTeam": home_name,
            "awayTeam": away_name,
            "score": score,
            "round": round_name,
            "match_url": match_url
        })
        correction = KNOCKOUT_FIXTURES_2025.get((match_date, home_name, away_name))
        if correction:
            results[-1]["round"] = correction["round"]
            results[-1]["score"] = correction["score"]
            results[-1]["penaltyCountHome"] = correction.get("penaltyCountHome")
            results[-1]["penaltyCountAway"] = correction.get("penaltyCountAway")
    return results

async def run_2025_historical():
    print("\n==================================")
    print("🕰️ [History 2025] Full Scrape Starting...")
    print("==================================")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto(BAIDU_URL, wait_until="networkidle", timeout=60000)
        await _click_to_earliest(page)

        overview_matches = await _extract_overview_matches(page)
        print(f"[History] Extracted {len(overview_matches)} matches for 2025.")

        ok = 0
        for m in overview_matches:
            m_hash = get_match_hash(m['homeTeam'], m['awayTeam'], m['datetime'][:10])
            if redis_client and redis_client.sismember("scraped_2025_full", m_hash):
                continue

            # Deep Scraping
            if m['match_url']:
                m = await deep_scrape_match(browser, m['match_url'], m)

            # Sync to Backend
            try:
                res = requests.post(API_URL, json=m, timeout=10)
                if res.status_code in [200, 201]:
                    if redis_client:
                        redis_client.sadd("scraped_2025_full", m_hash)
                    ok += 1
                    print(f"  [Sync Success] {m['homeTeam']} vs {m['awayTeam']}")
                else:
                    print(f"  [Sync Failed] {m['homeTeam']} vs {m['awayTeam']} - {res.status_code}")
            except Exception as e:
                print(f"  [Sync Error] {e}")

        print(f"[History] 🎯 Finished! Synced {ok} matches.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_2025_historical())
