import argparse
import asyncio
import base64
import urllib.parse
from typing import Any, Dict, List

import requests
from playwright.async_api import async_playwright

from scrape_2026_common import BAIDU_MOBILE_UA, API_SYNC_URL
from scrape_2026_detail_bundle import scrape_match_detail
from scrape_2026_sync_client import build_sync_payload


MATCHES_API_URL = "http://localhost:5002/api/matches"
MATCH_NAME = "江苏省城市足球联赛"


def normalize_team_name(name: str) -> str:
    cleaned = (name or "").strip()
    return cleaned if cleaned.endswith("队") else f"{cleaned}队"


def make_baidu_detail_url(match: Dict[str, Any]) -> str:
    date = str(match["timestamp"])[:10]
    home = normalize_team_name(match["homeTeam"])
    away = normalize_team_name(match["awayTeam"])
    raw_id = f"{MATCH_NAME}#{date}#{home}vs{away}"
    match_id = urllib.parse.quote(base64.b64encode(raw_id.encode("utf-8")).decode("ascii"))
    return f"https://tiyu.baidu.com/al/live/detail?matchId={match_id}&tab=%E8%B5%9B%E5%86%B5"


def api_match_to_sync_stub(match: Dict[str, Any]) -> Dict[str, Any]:
    timestamp = str(match["timestamp"])
    date = timestamp[:10]
    time = timestamp[11:16] if len(timestamp) >= 16 else "19:35"
    regular = str(match.get("score") or "0-0").replace(":", "-").replace("：", "-")
    home_score, away_score = "0", "0"
    if "-" in regular:
        home_score, away_score = regular.split("-", 1)

    return {
        "date": date,
        "time": time,
        "status": match.get("status") or "已结束",
        "homeName": match["homeTeam"],
        "awayName": match["awayTeam"],
        "homeScore": home_score.strip(),
        "awayScore": away_score.strip(),
        "round": match.get("round") or f"{date[:4]}赛季",
        "location": match.get("location"),
    }


def load_matches(year: str) -> List[Dict[str, Any]]:
    response = requests.get(MATCHES_API_URL, timeout=20)
    response.raise_for_status()
    payload = response.json()
    rows = payload.get("data", [])
    return [row for row in rows if str(row.get("timestamp", "")).startswith(str(year))]


async def backfill_year(year: str, limit: int = 0, include_future: bool = False, sleep_seconds: float = 0.8) -> None:
    rows = load_matches(year)
    if not include_future:
        rows = [row for row in rows if row.get("status") in {"已完结", "进行中"}]
    if limit:
        rows = rows[:limit]

    print(f"Backfill {year}: {len(rows)} matches", flush=True)
    ok = 0
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=BAIDU_MOBILE_UA)
        page = await context.new_page()

        for index, match in enumerate(rows, start=1):
            detail_url = make_baidu_detail_url(match)
            stub = api_match_to_sync_stub(match)
            print(f"[{index}/{len(rows)}] {stub['date']} {stub['homeName']} vs {stub['awayName']}", flush=True)
            try:
                detail = await asyncio.wait_for(
                    scrape_match_detail(page, detail_url, stub["homeName"], stub["awayName"]),
                    timeout=55,
                )
                payload = build_sync_payload(stub, detail)
                payload["source"] = f"baidu_{year}_generated_match_id_backfill"
                payload["score"] = f"{stub['homeScore']}-{stub['awayScore']}"
                payload["round"] = stub["round"]
                payload["location"] = detail.get("location") or stub.get("location")
                response = requests.post(API_SYNC_URL, json=payload, timeout=20)
                success = response.status_code in {200, 201} and response.json().get("success")
                print(
                    f"  sync={success} events={len(payload.get('events', []))} "
                    f"stats={sum(1 for key in payload.keys() if key.endswith('Home') or key.endswith('Away'))} "
                    f"live={len(payload.get('textLives', []))}",
                    flush=True,
                )
                ok += 1 if success else 0
            except Exception as exc:
                print(f"  failed: {exc}", flush=True)
                try:
                    await page.close()
                except Exception:
                    pass
                page = await context.new_page()
            await asyncio.sleep(sleep_seconds)

        await browser.close()
    print(f"Backfill {year} done: {ok}/{len(rows)} synced", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", required=True, choices=["2025", "2026"])
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--include-future", action="store_true")
    parser.add_argument("--sleep", type=float, default=0.8)
    args = parser.parse_args()
    asyncio.run(backfill_year(args.year, args.limit, args.include_future, args.sleep))


if __name__ == "__main__":
    main()
