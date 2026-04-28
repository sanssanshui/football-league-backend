"""Baidu player ranking cross-sync for missing avatars."""

import sys
from urllib.parse import quote

from dongqiudi_rankings_common import BACKEND_BASE_URL, fetch_json, post_json, save_snapshot


MATCH_NAME = "江苏城市足球联赛"
BAIDU_API = "https://tiyu.baidu.com/al/api/match/playerRanking"
TAB_MAP = {
    "goals": "10",
    "penalties": "14",
    "yellow_cards": "20",
    "red_cards": "21",
}


def build_url(tab_id: str) -> str:
    return f"{BAIDU_API}?match={quote(MATCH_NAME)}&tabId={tab_id}&stageId=00&newStyle=1"


def strip_u21(name: str) -> str:
    return name.replace("(U21)", "").replace("（U21）", "").strip()


def fetch_existing_names(category: str) -> dict[tuple[str, str], str]:
    try:
        payload = fetch_json(f"{BACKEND_BASE_URL}/api/matches/players/ranking/2026/{category}")
    except Exception:
        return {}

    names: dict[tuple[str, str], str] = {}
    for row in payload.get("data", []):
        name = row.get("name", "")
        team = row.get("team", "")
        if name and team:
            names[(strip_u21(name), team)] = name
    return names


def normalize_row(row: dict, preferred_names: dict[tuple[str, str], str]) -> dict:
    raw_name = row.get("playerName") or ""
    team = row.get("teamName") or ""
    name = preferred_names.get((strip_u21(raw_name), team), raw_name)
    return {
        "rank": int(row.get("shooterRank") or 0) or None,
        "name": name,
        "team": team,
        "value": int(row.get("score") or 0),
        "avatarUrl": row.get("logo") or "",
        "externalSource": "baidu",
        "externalId": row.get("playerId") or "",
        "position": row.get("position") or "",
        "raw": row,
    }


def fetch_baidu_player_rankings() -> dict:
    categories: dict[str, dict] = {}
    for category, tab_id in TAB_MAP.items():
        preferred_names = fetch_existing_names(category)
        payload = fetch_json(build_url(tab_id))
        rows = [
            normalize_row(row, preferred_names)
            for row in payload.get("data", {}).get("data", [])
            if row.get("playerName")
        ]
        for index, row in enumerate(rows, start=1):
            row["rank"] = row["rank"] or index
        categories[category] = {
            "sourceUrl": build_url(tab_id),
            "rows": rows,
        }

    return {
        "source": "baidu",
        "season": "2026",
        "categories": categories,
    }


def sync_categories(payload: dict) -> None:
    for category, data in payload["categories"].items():
        result = post_json(
            f"{BACKEND_BASE_URL}/api/matches/rankings/players/sync",
            {
                "season": payload["season"],
                "category": category,
                "source": "baidu",
                "rows": data["rows"],
            },
        )
        print(f"  ✅ 百度头像交叉入库 {category}: {len(data['rows'])} 行 -> {result}")


def run(sync: bool = False) -> dict:
    payload = fetch_baidu_player_rankings()
    path = save_snapshot("baidu_player_rankings", payload)
    total = sum(len(data["rows"]) for data in payload["categories"].values())
    print(f"✅ baidu player rankings categories={len(payload['categories'])} rows={total} -> {path}")
    for category, data in payload["categories"].items():
        preview = data["rows"][0] if data["rows"] else {}
        print(f"  {category}: {len(data['rows'])} 行，首位: {preview.get('name', '无')} {preview.get('avatarUrl', '')}")
    if sync:
        sync_categories(payload)
    return payload


if __name__ == "__main__":
    run(sync="--sync" in sys.argv)
