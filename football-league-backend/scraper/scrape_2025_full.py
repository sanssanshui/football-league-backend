import asyncio
import requests
import redis
import hashlib
from playwright.async_api import async_playwright
from scrape_2026_detail_bundle import scrape_match_detail
from scrape_2026_schedule_dongqiudi import fetch_dongqiudi_schedule_api

API_URL = "http://localhost:5002/api/matches/sync"

# 懂球帝 2025 赛季 ID
DONGQIUDI_2025_REGULAR_SEASON_ID = "24531"   # 常规赛 (16轮)
DONGQIUDI_2025_KNOCKOUT_SEASON_ID = "25680"  # 淘汰赛 (1/4决赛、半决赛、决赛)

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


async def run_2025_historical():
    print("\n==================================")
    print("🕰️ [History 2025] Full Scrape Starting...")
    print("==================================")

    # 从懂球帝 API 获取 2025 赛季数据（常规赛 + 淘汰赛）
    overview_matches = []
    for season_id in [DONGQIUDI_2025_REGULAR_SEASON_ID, DONGQIUDI_2025_KNOCKOUT_SEASON_ID]:
        try:
            rows = fetch_dongqiudi_schedule_api(season_id=season_id)
            for row in rows:
                time_str = (row.get("time") or "15:00").replace("：", ":")
                try:
                    hour, minute = time_str.split(":")[:2]
                    iso_time = f"{row['date']}T{int(hour):02d}:{int(minute):02d}:00+08:00"
                except Exception:
                    iso_time = f"{row['date']}T15:00:00+08:00"

                home_score = (row.get("homeScore") or "").strip()
                away_score = (row.get("awayScore") or "").strip()
                score = f"{home_score}-{away_score}" if home_score and away_score else "0-0"
                status_raw = row.get("status", "")
                status = "已完结" if status_raw in ("已结束", "已完结") else "未开始"

                m = {
                    "source": "baidu_history_2025_full",
                    "datetime": iso_time,
                    "status": status,
                    "homeTeam": row["homeName"],
                    "awayTeam": row["awayName"],
                    "score": score,
                    "round": row.get("round", "2025苏超"),
                    "match_url": row.get("detailUrl", ""),
                }
                # 淘汰赛点球修正
                date_key = row["date"]
                home_short = row["homeName"].replace("队", "")
                away_short = row["awayName"].replace("队", "")
                correction = KNOCKOUT_FIXTURES_2025.get((date_key, home_short, away_short))
                if correction:
                    m["round"] = correction["round"]
                    m["score"] = correction["score"]
                    if "penaltyCountHome" in correction:
                        m["penaltyCountHome"] = correction["penaltyCountHome"]
                    if "penaltyCountAway" in correction:
                        m["penaltyCountAway"] = correction["penaltyCountAway"]
                overview_matches.append(m)
        except Exception as e:
            print(f"  [懂球帝 API 失败 season={season_id}] {e}")

    print(f"[History] Extracted {len(overview_matches)} matches for 2025.")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        ok = 0
        for m in overview_matches:
            m_hash = get_match_hash(m['homeTeam'], m['awayTeam'], m['datetime'][:10])
            if redis_client and redis_client.sismember("scraped_2025_full", m_hash):
                continue

            # Deep Scraping（仅已完结比赛）
            if m['status'] == '已完结' and m.get('match_url'):
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
