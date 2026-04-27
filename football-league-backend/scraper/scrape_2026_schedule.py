import asyncio
from typing import Any, Dict, List

from scrape_2026_common import SCHEDULE_URL
from scrape_2026_schedule_dongqiudi import extract_dongqiudi_schedule


async def load_all_schedule(page) -> None:
    """加载赛程页并点击“更早比赛”直到 04-11 出现。"""
    for attempt in range(3):
        try:
            await page.goto(SCHEDULE_URL, wait_until="networkidle", timeout=30000)
            break
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(2)

    await asyncio.sleep(2)

    for i in range(12):
        has_0411 = await page.evaluate("() => document.body.textContent.indexOf('04-11') >= 0")
        if has_0411:
            print(f"  ✅ 04-11数据已加载 (尝试了 {i} 次点击)")
            break

        print(f"  ⏳ 尝试触发第 {i + 1} 次 '更早比赛'...")
        try:
            await page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(0.5)
            clicked = await page.evaluate(
                """
                () => {
                    const findAndClick = (selector, isText = false) => {
                        const els = isText
                            ? Array.from(document.querySelectorAll('div, span, a, button')).filter(el => el.textContent.includes(selector))
                            : document.querySelectorAll(selector);
                        if (els.length > 0) {
                            els[0].click();
                            return true;
                        }
                        return false;
                    };

                    if (findAndClick('更早比赛', true)) return true;
                    if (findAndClick('.btn-load')) return true;
                    return false;
                }
                """
            )
            if not clicked:
                print("  ❌ 页面上未找到 '更早比赛' 按钮")
                break
            await asyncio.sleep(2)
        except Exception as exc:
            print(f"  ⚠️ 加载异常: {exc}")
            break
    else:
        print("  ⚠️ 达到最大尝试次数，可能未能在顶端找到04-11数据")


async def extract_schedule(page) -> List[Dict[str, Any]]:
    print("📅 [Schedule] 加载赛程...")
    await load_all_schedule(page)

    matches = await page.evaluate(
        """
        () => {
            const results = [];
            const allNodes = Array.from(document.querySelectorAll('.wa-match-schedule-list-title, .wa-tiyu-schedule-item, .btn-load'));
            let currentDate = null;

            for (const node of allNodes) {
                if (node.classList.contains('wa-match-schedule-list-title')) {
                    const dateEl = node.querySelector('.date');
                    if (dateEl) {
                        const dateText = dateEl.textContent.trim();
                        const dm = dateText.match(/(\\d{2})-(\\d{2})/);
                        if (dm) currentDate = `2026-${dm[1]}-${dm[2]}`;
                    }
                    continue;
                }

                if (!currentDate || !node.classList.contains('wa-tiyu-schedule-item')) continue;

                const rows = node.querySelectorAll('.team-row');
                if (rows.length < 2) continue;

                const homeNameEl = rows[0].querySelector('.team-row-name');
                const homeScoreEl = rows[0].querySelector('.team-row-score');
                const awayNameEl = rows[1].querySelector('.team-row-name');
                const awayScoreEl = rows[1].querySelector('.team-row-score');
                if (!homeNameEl || !awayNameEl) continue;

                const text = node.textContent.trim();
                const timeMatch = text.match(/(\\d{1,2}:\\d{2})/);
                const roundMatch = text.match(/(第\\d+轮)/);

                let status = '待开始';
                if (text.includes('已结束')) status = '已结束';
                else if (text.includes('进行中')) status = '进行中';
                else if (text.includes('未开赛')) status = '未开赛';

                results.push({
                    detailUrl: node.href,
                    date: currentDate,
                    time: timeMatch ? timeMatch[1] : '19:40',
                    round: roundMatch ? roundMatch[1] : '',
                    homeName: homeNameEl.textContent.trim(),
                    awayName: awayNameEl.textContent.trim(),
                    homeScore: homeScoreEl ? homeScoreEl.textContent.trim() : '',
                    awayScore: awayScoreEl ? awayScoreEl.textContent.trim() : '',
                    status,
                });
            }

            return results;
        }
        """
    )

    print(f"  共提取 {len(matches)} 场比赛:")
    for match in matches:
        score = f"{match['homeScore']}-{match['awayScore']}" if match["homeScore"] else "vs"
        print(
            f"    {match['date']} {match['time']} {match['round']} "
            f"{match['homeName']} {score} {match['awayName']} [{match['status']}]"
        )
    return matches


async def merge_with_dongqiudi_fallback(page, matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    try:
        fallback_matches = await extract_dongqiudi_schedule(page)
    except Exception as exc:
        print(f"  ⚠️ 懂球帝兜底失败: {exc}")
        return matches

    by_key = {f"{match['date']}|{match['homeName']}|{match['awayName']}": match for match in matches}
    added = 0
    for fallback in fallback_matches:
        key = f"{fallback['date']}|{fallback['homeName']}|{fallback['awayName']}"
        if key in by_key:
            continue
        by_key[key] = fallback
        added += 1

    if added:
        print(f"  ✅ 懂球帝兜底补充 {added} 场赛程")
    return list(by_key.values())
