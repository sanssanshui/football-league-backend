from typing import Any, Dict

from scrape_2026_detail_lineup import scrape_lineup
from scrape_2026_detail_live import scrape_live_text
from scrape_2026_detail_situation import scrape_situation


async def scrape_match_detail(page, detail_url: str, home: str, away: str) -> Dict[str, Any]:
    print(f"\n  🔍 [Detail] {home} vs {away}")
    situation = await scrape_situation(page, detail_url)
    lineup = await scrape_lineup(page, detail_url)
    home_count = len(lineup.get("home", []))
    away_count = len(lineup.get("away", []))
    if home_count and away_count and (home_count != 11 or away_count != 11):
        print(f"    ⚠️ 首发阵容抓取不完整: 主 {home_count}/11, 客 {away_count}/11，继续同步事件/直播")
    live_text = await scrape_live_text(page, detail_url)

    print(f"    ⭐ 头部比分: {situation.get('score')}")
    print(f"    ⚽ 事件: {len(situation.get('events', []))} 条")
    print(f"    📊 统计: {len(situation.get('stats', {}))} 项")
    print(
        f"    👥 阵容: 主 {home_count} 人, "
        f"客 {away_count} 人"
    )
    print(f"    📡 直播: {len(live_text)} 条")

    return {
        "meta": situation.get("meta", {}),
        "score": situation.get("score"),
        "events": situation.get("events", []),
        "stats": situation.get("stats", {}),
        "lineups": lineup,
        "lineupComplete": home_count >= 11 and away_count >= 11,
        "textLives": live_text,
        "homeFormation": lineup.get("homeFormation"),
        "awayFormation": lineup.get("awayFormation"),
        "referee": lineup.get("referee"),
        "location": lineup.get("location") or situation.get("meta", {}).get("location"),
    }
