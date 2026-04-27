"""懂球帝苏超积分榜结构化抓取。"""

from urllib.parse import urlencode

from dongqiudi_rankings_common import API_BASE, DEFAULT_SEASON, DEFAULT_SEASON_ID, fetch_json, save_snapshot


def build_url(season_id: str = DEFAULT_SEASON_ID) -> str:
    query = urlencode(
        {
            "season_id": season_id,
            "app": "dqd",
            "version": "830",
            "platform": "miniprogram",
            "language": "zh-cn",
            "app_type": "",
        }
    )
    return f"{API_BASE}/standing?{query}"


def normalize_row(row: dict) -> dict:
    return {
        "rank": int(row.get("rank") or 0),
        "team": row.get("team_name") or "",
        "teamId": row.get("team_id") or "",
        "teamLogo": row.get("team_logo") or "",
        "played": int(row.get("matches_total") or 0),
        "wins": int(row.get("matches_won") or 0),
        "draws": int(row.get("matches_draw") or 0),
        "losses": int(row.get("matches_lost") or 0),
        "goalsFor": int(row.get("goals_pro") or 0),
        "goalsAgainst": int(row.get("goals_against") or 0),
        "points": int(row.get("points") or 0),
        "raw": row,
    }


def fetch_standings(season_id: str = DEFAULT_SEASON_ID) -> dict:
    payload = fetch_json(build_url(season_id))
    rounds = payload.get("content", {}).get("rounds", [])
    rows = []
    if rounds:
        rows = [
            normalize_row(row)
            for row in rounds[0].get("content", {}).get("data", [])
            if row.get("team_name")
        ]
    return {
        "source": build_url(season_id),
        "season": DEFAULT_SEASON,
        "seasonId": season_id,
        "description": payload.get("content", {}).get("description", ""),
        "rows": rows,
    }


def run() -> dict:
    payload = fetch_standings()
    rows = payload["rows"]
    path = save_snapshot("dongqiudi_standings", payload)
    print(f"✅ standings rows={len(rows)} -> {path}")
    if rows:
        print(f"  首位: {rows[0]['team']} {rows[0]['points']}分")
    return payload


if __name__ == "__main__":
    run()
