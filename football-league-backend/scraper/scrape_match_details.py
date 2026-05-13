"""
历史详情回填器

用途:
- 对已存在 detailUrl 的比赛做一次性深度回填
- 复用 2026 共享的赛况/阵容/直播解析器
"""

import asyncio
import re
from typing import Any, Dict

from playwright.async_api import async_playwright

from scrape_2026_common import BAIDU_MOBILE_UA, redis_client
from scrape_2026_detail_bundle import scrape_match_detail
from scrape_2026_sync_client import sync_to_backend


BAIDU_URL = "https://tiyu.baidu.com/al/match?match=%E6%B1%9F%E8%8B%8F%E5%9F%8E%E5%B8%82%E8%B6%B3%E7%90%83%E8%81%94%E8%B5%9B&tab=%E8%B5%9B%E7%A8%8B"


async def extract_all_match_links(page) -> list[str]:
    await page.goto(BAIDU_URL, wait_until="networkidle", timeout=60000)
    for _ in range(5):
        try:
            button = page.locator(".btn-load").first
            if await button.is_visible():
                await button.click()
                await asyncio.sleep(1)
            else:
                break
        except Exception:
            break

    return await page.evaluate(
        """
        () => [...new Set(Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href && href.includes('matchId=')))]
        """
    )


def build_match_stub(detail_url: str) -> Dict[str, Any]:
    match_id = re.search(r"matchId=([^&]+)", detail_url)
    return {
        "detailUrl": detail_url,
        "date": "2026-01-01",
        "time": "19:40",
        "round": "2026赛季",
        "homeName": "Unknown",
        "awayName": "Unknown",
        "status": "已结束",
        "matchId": match_id.group(1) if match_id else detail_url,
    }


async def run_details_scraper() -> None:
    print("\n" + "=" * 50)
    print("🎯 [Match Details Backfill] Shared Detail Parsers")
    print("=" * 50)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(user_agent=BAIDU_MOBILE_UA)
        schedule_page = await context.new_page()
        detail_page = await context.new_page()

        match_links = await extract_all_match_links(schedule_page)
        print(f"✅ Found {len(match_links)} match detail links.")

        scraped_count = 0
        for detail_url in match_links:
            match = build_match_stub(detail_url)
            redis_key = f"scraped_details_full:{match['matchId']}"
            if redis_client and redis_client.get(redis_key):
                continue

            detail = await scrape_match_detail(detail_page, detail_url, match["homeName"], match["awayName"])
            meta = detail.get("meta", {})
            match["homeName"] = meta.get("homeTeam") or match["homeName"]
            match["awayName"] = meta.get("awayTeam") or match["awayName"]
            if sync_to_backend(match, detail):
                scraped_count += 1
                if redis_client:
                    redis_client.set(redis_key, "1")
            await asyncio.sleep(1)

        print(f"\n✨ Finished! Deeply scraped {scraped_count} matches.")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(run_details_scraper())
