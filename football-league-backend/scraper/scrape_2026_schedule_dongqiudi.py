import asyncio
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List

import requests


DONGQIUDI_SCHEDULE_URL = "https://m.dongqiudi.com/stat/233595/rankingSchedule"
DONGQIUDI_SCHEDULE_API = "https://sport-data.dongqiudi.com/soccer/biz/data/schedule?season_id=26680&app=dqd&version=830&platform=miniprogram&language=zh-cn&app_type="
DONGQIUDI_HEADERS = {"User-Agent": "Mozilla/5.0"}


def normalize_team_name(name: str) -> str:
    name = re.sub(r"Image|\s+", "", name).strip()
    return name if name.endswith("队") else f"{name}队"


def parse_schedule_text(text: str) -> List[Dict[str, Any]]:
    round_match = re.search(r"第(\d+)轮", text)
    round_name = f"第{round_match.group(1)}轮" if round_match else ""
    rows: List[Dict[str, Any]] = []
    pattern = re.compile(
        r"(?P<date>\d{2}-\d{2})\s+"
        r"(?P<time>\d{1,2}:\d{2})\s+"
        r"(?P<home>[\u4e00-\u9fa5A-Za-z]+队).*?"
        r"(?P<score>VS|\d+\s*-\s*\d+).*?"
        r"(?P<away>[\u4e00-\u9fa5A-Za-z]+队)"
    )

    for match in pattern.finditer(text):
        score = match.group("score").replace(" ", "")
        home_score = ""
        away_score = ""
        status = "未开赛"
        if score != "VS" and "-" in score:
            home_score, away_score = score.split("-", 1)
            status = "已结束"

        rows.append(
            {
                "detailUrl": "",
                "date": f"2026-{match.group('date')}",
                "time": match.group("time"),
                "round": round_name,
                "homeName": normalize_team_name(match.group("home")),
                "awayName": normalize_team_name(match.group("away")),
                "homeScore": home_score,
                "awayScore": away_score,
                "status": status,
                "source": "dongqiudi",
            }
        )
    return rows


def local_datetime_from_utc(value: str) -> tuple[str, str]:
    try:
        dt = datetime.strptime(value, "%Y-%m-%d %H:%M:%S") + timedelta(hours=8)
        return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")
    except Exception:
        return "", "19:40"


def normalize_status(status: str) -> str:
    if status == "Played":
        return "已结束"
    if status in {"Playing", "Live"}:
        return "进行中"
    return "未开赛"


def parse_api_match(row: Dict[str, Any], round_name: str) -> Dict[str, Any]:
    date, time = local_datetime_from_utc(row.get("start_play", ""))
    home_score = str(row.get("fs_A") or row.get("score_A") or "").strip()
    away_score = str(row.get("fs_B") or row.get("score_B") or "").strip()
    return {
        "detailUrl": "",
        "date": date,
        "time": time,
        "round": round_name,
        "homeName": normalize_team_name(row.get("team_A_name", "")),
        "awayName": normalize_team_name(row.get("team_B_name", "")),
        "homeScore": home_score,
        "awayScore": away_score,
        "status": normalize_status(row.get("status", "")),
        "source": "dongqiudi_api",
        "externalMatchId": row.get("match_id"),
    }


def fetch_dongqiudi_schedule_api() -> List[Dict[str, Any]]:
    response = requests.get(DONGQIUDI_SCHEDULE_API, headers=DONGQIUDI_HEADERS, timeout=20)
    response.raise_for_status()
    payload = response.json()
    rounds = payload.get("content", {}).get("rounds", [])
    by_key: dict[str, Dict[str, Any]] = {}

    for round_item in rounds:
        round_name = round_item.get("name", "")
        round_url = round_item.get("url")
        if not round_url:
            continue
        round_response = requests.get(round_url, headers=DONGQIUDI_HEADERS, timeout=20)
        round_response.raise_for_status()
        round_payload = round_response.json()
        for row in round_payload.get("content", {}).get("matches", []):
            match = parse_api_match(row, round_name)
            if not match["date"] or not match["homeName"] or not match["awayName"]:
                continue
            key = f"{match['date']}|{match['homeName']}|{match['awayName']}"
            by_key[key] = match

    return list(by_key.values())


async def extract_dongqiudi_schedule(page, rounds_back: int = 4, rounds_forward: int = 2) -> List[Dict[str, Any]]:
    print("📅 [Fallback] 懂球帝赛程兜底解析...")
    try:
        rows = fetch_dongqiudi_schedule_api()
        print(f"  懂球帝 API 兜底提取 {len(rows)} 场")
        return rows
    except Exception as exc:
        print(f"  ⚠️ 懂球帝 API 兜底失败，降级页面解析: {exc}")

    await page.goto(DONGQIUDI_SCHEDULE_URL, wait_until="domcontentloaded", timeout=20000)
    await asyncio.sleep(1)

    snapshots: list[str] = []

    async def capture() -> None:
        snapshots.append(await page.evaluate("() => document.body.innerText"))

    await capture()
    for _ in range(rounds_back):
        clicked = await page.evaluate(
            """
            () => {
                const btn = Array.from(document.querySelectorAll('button, a, div, span'))
                    .find(el => (el.textContent || '').trim() === '上一轮');
                if (!btn) return false;
                btn.click();
                return true;
            }
            """
        )
        if not clicked:
            break
        await asyncio.sleep(0.8)
        await capture()

    for _ in range(rounds_forward):
        clicked = await page.evaluate(
            """
            () => {
                const btn = Array.from(document.querySelectorAll('button, a, div, span'))
                    .find(el => (el.textContent || '').trim() === '下一轮');
                if (!btn) return false;
                btn.click();
                return true;
            }
            """
        )
        if not clicked:
            break
        await asyncio.sleep(0.8)
        await capture()

    by_key: dict[str, Dict[str, Any]] = {}
    for snapshot in snapshots:
        for row in parse_schedule_text(snapshot):
            key = f"{row['date']}|{row['homeName']}|{row['awayName']}"
            by_key[key] = row

    rows = list(by_key.values())
    print(f"  懂球帝兜底提取 {len(rows)} 场")
    return rows
