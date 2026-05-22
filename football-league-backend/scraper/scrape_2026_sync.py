"""
2026 赛季苏超同步编排器

职责:
1. 发现赛程
2. 判断比赛是否需要深度抓取
3. 组合赛况 / 阵容 / 直播子抓取器
4. 调用后端同步接口

说明:
- 实时比赛: 高频更新
- 已完赛比赛: 状态变化后补抓一次
- 未开赛比赛: 仅同步基础赛程，不跑详情页
"""

import asyncio
import sys
from typing import Any, Dict, List

from playwright.async_api import async_playwright

from scrape_2026_common import (
    BAIDU_MOBILE_UA,
    get_state_cache_key,
    redis_client,
    should_scrape_detail,
)
from scrape_2026_detail_bundle import scrape_match_detail
from scrape_2026_schedule import extract_schedule, merge_with_dongqiudi_fallback
from scrape_2026_sync_client import sync_to_backend


MEMORY_SYNCED_FINISHED: set[str] = set()
DETAIL_SYNC_VERSION = "detail-v2"


def build_state_fingerprint(match: Dict[str, Any]) -> str:
    return f"{DETAIL_SYNC_VERSION}|{match.get('status', '')}|{match.get('homeScore', '')}-{match.get('awayScore', '')}"


def detail_has_required_content(detail: Dict[str, Any]) -> bool:
    lineups = detail.get("lineups") or {}
    home_count = len(lineups.get("home") or [])
    away_count = len(lineups.get("away") or [])
    has_complete_lineups = home_count >= 11 and away_count >= 11
    has_match_feed = bool(detail.get("events")) or bool(detail.get("textLives"))
    has_stats = bool(detail.get("stats"))
    return has_match_feed and has_stats and has_complete_lineups


def should_skip_finished_match(match: Dict[str, Any], state_fingerprint: str) -> bool:
    if match.get("status") not in {"已结束", "已完结"}:
        return False

    state_key = get_state_cache_key(match)
    if redis_client:
        cached = redis_client.get(state_key)
        return cached == state_fingerprint

    return state_key in MEMORY_SYNCED_FINISHED


def mark_match_state(match: Dict[str, Any], state_fingerprint: str) -> None:
    state_key = get_state_cache_key(match)
    if redis_client:
        redis_client.set(state_key, state_fingerprint)
    if match.get("status") in {"已结束", "已完结"}:
        MEMORY_SYNCED_FINISHED.add(state_key)


async def collect_matches(page, cycle: int) -> List[Dict[str, Any]]:
    matches = await extract_schedule(page)
    matches = await merge_with_dongqiudi_fallback(page, matches)
    return matches


async def process_match(page, match: Dict[str, Any]) -> bool:
    state_fingerprint = build_state_fingerprint(match)
    if should_skip_finished_match(match, state_fingerprint):
        return False

    detail: Dict[str, Any] = {"events": [], "stats": {}, "lineups": {"home": [], "away": [], "coaches": {}}, "textLives": []}
    if match.get("detailUrl") and should_scrape_detail(match):
        detail = await scrape_match_detail(page, match["detailUrl"], match["homeName"], match["awayName"])

    ok = sync_to_backend(match, detail)
    if ok:
        if match.get("status") in {"已结束", "已完结"} and should_scrape_detail(match):
            if detail_has_required_content(detail):
                mark_match_state(match, state_fingerprint)
            else:
                lineups = detail.get("lineups") or {}
                print(
                    "  ↻ 详情不完整，保留为可重试: "
                    f"events={len(detail.get('events') or [])}, "
                    f"live={len(detail.get('textLives') or [])}, "
                    f"stats={len(detail.get('stats') or {})}, "
                    f"lineup={len(lineups.get('home') or [])}/{len(lineups.get('away') or [])}"
                )
        else:
            mark_match_state(match, state_fingerprint)
    return ok


async def run_2026_engine(run_once: bool = False, interval_seconds: int = 10) -> None:
    print("=" * 60)
    print("🚀 [2026 Orchestrator] 苏超实时/历史同步引擎启动")
    print("=" * 60)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=BAIDU_MOBILE_UA)
        schedule_page = await context.new_page()
        detail_page = await context.new_page()

        cycle = 0
        while True:
            cycle += 1
            print(f"\n{'=' * 60}")
            print(f"📡 [Cycle {cycle}]")
            print(f"{'=' * 60}")
            try:
                matches = await collect_matches(schedule_page, cycle)
                if not matches:
                    print("⚠️ 无比赛数据")
                else:
                    synced = 0
                    for match in matches:
                        try:
                            if await process_match(detail_page, match):
                                synced += 1
                        except Exception as exc:
                            print(f"  ⚠️ 单场同步失败 {match['homeName']} vs {match['awayName']}: {exc}")
                    print(f"\n📦 本轮同步/更新 {synced} 场")
            except Exception as exc:
                print(f"⚠️ 调度错误: {exc}")

            if run_once:
                print("✅ 单轮同步完成")
                break

            print(f"💤 休眠 {interval_seconds}s...")
            await asyncio.sleep(interval_seconds)


if __name__ == "__main__":
    once = "--once" in sys.argv
    interval = 10
    for arg in sys.argv:
        if arg.startswith("--interval="):
            try:
                interval = max(3, int(arg.split("=", 1)[1]))
            except ValueError:
                interval = 10
    asyncio.run(run_2026_engine(run_once=once, interval_seconds=interval))
