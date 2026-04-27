"""百度体育江苏城市联赛球队阵容抓取。

运行:
  python scrape_team_rosters_baidu.py --sync

页面首屏 HTML 中包含 San 的 s-data JSON，里面已经有阵容、号码、头像和 playerId，
无需启动浏览器即可稳定提取。
"""

import html
import json
import re
import sys
from typing import Any, Dict, List

from dongqiudi_rankings_common import BACKEND_BASE_URL, fetch_html, post_json, save_snapshot


TEAM_URLS = {
    "盐城队": "https://tiyu.baidu.com/al/team?id=64d2ea03a72f47aee54ef3c52c08775e&tab=%E9%98%B5%E5%AE%B9",
    "徐州队": "https://tiyu.baidu.com/al/team?id=1fa2999165aceac3f5ce9062c1927b5c&tab=%E9%98%B5%E5%AE%B9",
    "无锡队": "https://tiyu.baidu.com/al/team?id=bec4c9984404ff48e19184c7c08d741f&tab=%E9%98%B5%E5%AE%B9",
    "常州队": "https://tiyu.baidu.com/al/team?id=8764eaa76d7ebb23e914d908993cdc58&tab=%E9%98%B5%E5%AE%B9",
    "宿迁队": "https://tiyu.baidu.com/al/team?id=74a79feb7de36640f7ecef79760c2f7d&tab=%E9%98%B5%E5%AE%B9",
    "苏州队": "https://tiyu.baidu.com/al/team?id=189ed8f694bef160c164b6b8d8cac28a&tab=%E9%98%B5%E5%AE%B9",
    "淮安队": "https://tiyu.baidu.com/al/team?id=beb854cbf40be04a73b4881da70c1997&tab=%E9%98%B5%E5%AE%B9",
    "扬州队": "https://tiyu.baidu.com/al/team?id=3c0f3bfb360f662e53675d5a51a71a1d&tab=%E9%98%B5%E5%AE%B9",
    "连云港队": "https://tiyu.baidu.com/al/team?id=985259beea7c5a921bc346a1f9149a3e&tab=%E9%98%B5%E5%AE%B9",
    "南通队": "https://tiyu.baidu.com/al/team?id=48d0f5b5b0aadd8d12c1eeb7ef5b5e84&tab=%E9%98%B5%E5%AE%B9",
    "镇江队": "https://tiyu.baidu.com/al/team?id=5f0b650f7a2152975515d3177c43cee5&tab=%E9%98%B5%E5%AE%B9",
    "南京队": "https://tiyu.baidu.com/al/team?id=e3e09c0731502b62b123f73c17cff26b&tab=%E9%98%B5%E5%AE%B9",
    "泰州队": "https://tiyu.baidu.com/al/team?id=8700f7ffe3b9559a00149fb92483f919&tab=%E9%98%B5%E5%AE%B9",
}


def extract_s_data(page_html: str) -> Dict[str, Any]:
    match = re.search(r"<!--s-data:(.*?)-->", page_html, re.S)
    if not match:
        raise ValueError("未找到百度体育 s-data")
    return json.loads(html.unescape(match.group(1)))


def parse_roster(team_name: str, url: str) -> Dict[str, Any]:
    payload = extract_s_data(fetch_html(url))
    data = payload.get("data", {})
    header = data.get("header", {})
    players: List[Dict[str, Any]] = []

    for tab in data.get("tabsList", []):
        groups = tab.get("data")
        if not isinstance(groups, list):
            continue
        for group in groups:
            position = group.get("position") or "未分组"
            for player in group.get("data", []):
                if not player.get("name"):
                    continue
                number = player.get("number")
                players.append(
                    {
                        "name": player.get("name"),
                        "position": position,
                        "number": int(number) if str(number).isdigit() else None,
                        "avatarUrl": player.get("avatar"),
                        "externalSource": "baidu",
                        "externalId": player.get("playerId"),
                        "profileUrl": f"https://tiyu.baidu.com{player.get('link', '')}" if player.get("link") else None,
                    }
                )

    return {
        "teamName": header.get("name") or team_name,
        "englishName": header.get("description"),
        "logoUrl": header.get("logo"),
        "sourceUrl": url,
        "players": players,
    }


def fetch_all_rosters() -> Dict[str, Any]:
    teams = []
    for team_name, url in TEAM_URLS.items():
        try:
            team = parse_roster(team_name, url)
            teams.append(team)
            print(f"✅ {team['teamName']}: {len(team['players'])} 名球员")
        except Exception as exc:
            print(f"⚠️ {team_name} 抓取失败: {exc}")

    return {
        "source": "baidu",
        "teams": teams,
    }


def sync_rosters(payload: Dict[str, Any]) -> None:
    total_players = 0
    for team in payload["teams"]:
        result = post_json(
            f"{BACKEND_BASE_URL}/api/matches/teams/rosters/sync",
            {"source": payload["source"], "teams": [team]},
        )
        total_players += result.get("players", 0)
        print(f"📦 入库 {team['teamName']}: {result}")
    print(f"✅ 分批入库完成: teams={len(payload['teams'])} players={total_players}")


def run(sync: bool = False) -> Dict[str, Any]:
    payload = fetch_all_rosters()
    path = save_snapshot("baidu_team_rosters", payload)
    total = sum(len(team["players"]) for team in payload["teams"])
    print(f"✅ roster teams={len(payload['teams'])} players={total} -> {path}")
    if sync:
        sync_rosters(payload)
    return payload


if __name__ == "__main__":
    run(sync="--sync" in sys.argv)
