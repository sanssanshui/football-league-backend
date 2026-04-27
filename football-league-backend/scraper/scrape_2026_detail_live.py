import asyncio
from typing import Any, Dict, List

from scrape_2026_detail_situation import build_tab_url


async def scrape_live_text(page, detail_url: str) -> List[Dict[str, Any]]:
    await page.goto(build_tab_url(detail_url, "%E7%9B%B4%E6%92%AD"), wait_until="domcontentloaded", timeout=15000)
    await asyncio.sleep(2)

    return await page.evaluate(
        """
        () => {
            const results = [];
            const items = document.querySelectorAll('.wa-match-live-item, .live-item, [class*="live-item"]');
            for (const item of items) {
                const timeEl = item.querySelector('.time, [class*="time"]');
                const contentEl = item.querySelector('.content, [class*="content"]');
                const time = (timeEl ? timeEl.textContent.trim() : '').slice(0, 20);
                const content = contentEl ? contentEl.textContent.trim() : item.textContent.trim();
                if (!content) continue;
                results.push({ time, content });
            }
            return results;
        }
        """
    )
