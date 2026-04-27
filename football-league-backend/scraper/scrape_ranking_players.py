"""懂球帝苏超球员榜抓取并可同步入库。"""

import sys
from urllib.parse import urlencode

from dongqiudi_rankings_common import (
    API_BASE,
    BACKEND_BASE_URL,
    DEFAULT_SEASON,
    DEFAULT_SEASON_ID,
    fetch_json,
    post_json,
    save_snapshot,
)


TYPE_MAP = {
    "goals": "goals",
    "yellow_cards": "yellow_cards",
    "red_cards": "red_cards",
    "goal_penalty": "penalties",
}


def build_types_url(season_id: str = DEFAULT_SEASON_ID) -> str:
    query = urlencode(
        {
            "season_id": season_id,
            "app": "dqd",
            "version": "830",
            "platform": "miniprogram",
            "language": "zh-cn",
            "app_type": "",
            "type": "person",
        }
    )
    return f"{API_BASE}/ranking/person?{query}"


def normalize_row(row: dict) -> dict:
    return {
        "rank": int(row.get("rank") or 0),
        "name": row.get("person_name") or "",
        "team": row.get("team_name") or row.get("row_1") or "",
        "value": int(row.get("count") or row.get("row_2") or 0),
        "avatarUrl": row.get("person_logo") or "",
        "externalSource": "dongqiudi",
        "externalId": row.get("person_id") or "",
        "teamExternalId": row.get("team_id") or "",
        "teamLogo": row.get("team_logo") or "",
        "raw": row,
    }


def fetch_player_rankings(season_id: str = DEFAULT_SEASON_ID) -> dict:
    types_payload = fetch_json(build_types_url(season_id))
    categories: dict[str, dict] = {}
    for item in types_payload.get("content", {}).get("data", []):
        dqd_type = item.get("type")
        category = TYPE_MAP.get(dqd_type)
        if not category:
            continue

        rows_payload = fetch_json(item["url"])
        rows = [
            normalize_row(row)
            for row in rows_payload.get("content", {}).get("data", [])
            if row.get("person_name")
        ]
        categories[category] = {
            "label": item.get("name"),
            "sourceType": dqd_type,
            "sourceUrl": item.get("url"),
            "rows": rows,
        }

    return {
        "source": build_types_url(season_id),
        "season": DEFAULT_SEASON,
        "seasonId": season_id,
        "categories": categories,
    }


def sync_categories(payload: dict) -> None:
    for category, data in payload["categories"].items():
        sync_payload = {
            "season": payload["season"],
            "category": category,
            "source": "dongqiudi",
            "rows": data["rows"],
        }
        result = post_json(f"{BACKEND_BASE_URL}/api/matches/rankings/players/sync", sync_payload)
        print(f"  ✅ 入库球员榜 {category}: {len(data['rows'])} 行 -> {result}")


def run(sync: bool = False) -> dict:
    payload = fetch_player_rankings()
    path = save_snapshot("dongqiudi_player_rankings", payload)
    total = sum(len(data["rows"]) for data in payload["categories"].values())
    print(f"✅ player rankings categories={len(payload['categories'])} rows={total} -> {path}")
    for category, data in payload["categories"].items():
        preview = data["rows"][0] if data["rows"] else {}
        print(f"  {category}: {len(data['rows'])} 行，首位: {preview.get('name', '无')} {preview.get('value', '')}")
    if sync:
        sync_categories(payload)
    return payload


if __name__ == "__main__":
    run(sync="--sync" in sys.argv)
