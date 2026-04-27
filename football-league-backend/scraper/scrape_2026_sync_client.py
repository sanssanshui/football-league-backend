from typing import Any, Dict, Optional

import requests

from scrape_2026_common import API_SYNC_URL, normalize_status
from schedule_2026_metadata import get_2026_schedule_meta


def build_sync_payload(match: Dict[str, Any], detail: Dict[str, Any]) -> Dict[str, Any]:
    schedule_meta = get_2026_schedule_meta(match) or {}
    time_str = (match.get("time") or "19:40").replace("：", ":")
    try:
        hour, minute = time_str.split(":")[:2]
        iso_time = f"{match['date']}T{int(hour):02d}:{int(minute):02d}:00+08:00"
    except Exception:
        iso_time = f"{match['date']}T19:40:00+08:00"

    home_score = (match.get("homeScore") or "").strip()
    away_score = (match.get("awayScore") or "").strip()
    fallback_score = f"{home_score}-{away_score}" if home_score and away_score and home_score != "-" else "---"
    score = detail.get("score") or fallback_score

    stats = detail.get("stats", {})

    def stat_int(name: str, side: str) -> Optional[int]:
        try:
            return int(str(stats[name][side]).replace("%", "").strip())
        except Exception:
            return None

    def stat_float(name: str, side: str) -> Optional[float]:
        try:
            return float(str(stats[name][side]).replace("%", "").strip())
        except Exception:
            return None

    lineups = detail.get("lineups", {"home": [], "away": [], "coaches": {"home": None, "away": None}})
    lineup_home = {
        "formation": detail.get("homeFormation") or lineups.get("homeFormation"),
        "players": lineups.get("home", []),
        "coach": lineups.get("coaches", {}).get("home"),
        "referee": detail.get("referee") or lineups.get("referee"),
    }
    lineup_away = {
        "formation": detail.get("awayFormation") or lineups.get("awayFormation"),
        "players": lineups.get("away", []),
        "coach": lineups.get("coaches", {}).get("away"),
        "referee": detail.get("referee") or lineups.get("referee"),
    }

    return {
        "source": "baidu_2026_real",
        "datetime": iso_time,
        "status": normalize_status(match.get("status")),
        "homeTeam": match["homeName"],
        "awayTeam": match["awayName"],
        "score": score,
        "round": schedule_meta.get("round") or match.get("round", "2026赛季"),
        "location": detail.get("location") or match.get("location") or schedule_meta.get("venue"),
        "referee": detail.get("referee") or lineups.get("referee"),
        "events": detail.get("events", []),
        "textLives": detail.get("textLives", []),
        "possessionRateHome": stat_float("控球率", "home"),
        "possessionRateAway": stat_float("控球率", "away"),
        "attackHome": stat_int("进攻", "home"),
        "attackAway": stat_int("进攻", "away"),
        "dangerousAttackHome": stat_int("危险进攻", "home"),
        "dangerousAttackAway": stat_int("危险进攻", "away"),
        "shotsOnTargetHome": stat_int("射正", "home"),
        "shotsOnTargetAway": stat_int("射正", "away"),
        "shotsOffTargetHome": stat_int("射偏", "home"),
        "shotsOffTargetAway": stat_int("射偏", "away"),
        "cornerCountHome": stat_int("角球", "home"),
        "cornerCountAway": stat_int("角球", "away"),
        "penaltyCountHome": stat_int("点球", "home"),
        "penaltyCountAway": stat_int("点球", "away"),
        "yellowCardHome": stat_int("黄牌", "home"),
        "yellowCardAway": stat_int("黄牌", "away"),
        "redCardHome": stat_int("红牌", "home"),
        "redCardAway": stat_int("红牌", "away"),
        "homeShots": stat_int("射正", "home"),
        "awayShots": stat_int("射正", "away"),
        "lineupHome": lineup_home,
        "lineupAway": lineup_away,
    }


def sync_to_backend(match: Dict[str, Any], detail: Dict[str, Any]) -> bool:
    payload = build_sync_payload(match, detail)
    try:
        response = requests.post(API_SYNC_URL, json=payload, timeout=10)
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"  ✅ 入库: {match['homeName']} {payload['score']} {match['awayName']} -> matchId={data.get('matchId', '?')}")
            return True
        print(f"  ❌ HTTP {response.status_code}")
    except Exception as exc:
        print(f"  ❌ 异常: {exc}")
    return False
