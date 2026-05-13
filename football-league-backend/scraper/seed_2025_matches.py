"""One-shot script to seed all 2025 苏超 match data directly into the backend."""
import requests
from datetime import datetime, timedelta

API_URL = "http://localhost:5002/api/matches/sync"
HEADERS = {"User-Agent": "Mozilla/5.0"}

SUZHOU_TEAMS = {
    "镇江队", "苏州队", "常州队", "泰州队", "徐州队", "盐城队",
    "淮安队", "连云港队", "南通队", "南京队", "无锡队", "扬州队",
    "宿迁队",
}

# Penalty shootout corrections for knockout matches
PENALTY_CORRECTIONS = {
    ("2025-10-04", "南京队", "连云港队"): {"penaltyCountHome": 4, "penaltyCountAway": 2},
    ("2025-10-05", "徐州队", "泰州队"):   {"penaltyCountHome": 2, "penaltyCountAway": 4},
    ("2025-10-18", "南京队", "泰州队"):   {"penaltyCountHome": 7, "penaltyCountAway": 8},
    ("2025-10-19", "南通队", "无锡队"):   {"penaltyCountHome": 4, "penaltyCountAway": 2},
    ("2025-11-01", "南通队", "泰州队"):   {"penaltyCountHome": 3, "penaltyCountAway": 4},
}

DONGQIUDI_SCHEDULE_API_2025 = "https://sport-data.dongqiudi.com/soccer/biz/data/schedule?season_id=24531&app=dqd&platform=miniprogram&version=830&lang=zh-cn"
DONGQIUDI_SCHEDULE_API_2025_KO = "https://sport-data.dongqiudi.com/soccer/biz/data/schedule?season_id=25680&app=dqd&platform=miniprogram&version=830&lang=zh-cn"


def utc_to_cst_iso(utc_str: str) -> str:
    """Convert '2025-05-10 07:00:00' UTC to '2025-05-10T15:00:00+08:00' CST."""
    try:
        dt = datetime.strptime(utc_str, "%Y-%m-%d %H:%M:%S") + timedelta(hours=8)
        return dt.strftime("%Y-%m-%dT%H:%M:%S+08:00")
    except Exception:
        return "2025-05-10T15:00:00+08:00"


def fetch_season_matches(api_url: str) -> list:
    r = requests.get(api_url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    rounds = r.json().get("content", {}).get("rounds", [])
    matches = []
    for rnd in rounds:
        rname = rnd.get("name", "")
        rurl = rnd.get("url", "")
        if not rurl:
            continue
        r2 = requests.get(rurl, headers=HEADERS, timeout=30)
        r2.raise_for_status()
        for m in r2.json().get("content", {}).get("matches", []):
            home = m.get("team_A_name", "")
            away = m.get("team_B_name", "")
            # Filter to only 苏超 teams
            if home not in SUZHOU_TEAMS or away not in SUZHOU_TEAMS:
                continue
            matches.append({
                "round": rname,
                "date_utc": m.get("start_play", ""),
                "home": home,
                "away": away,
                "home_score": str(m.get("fs_A") or m.get("score_A") or ""),
                "away_score": str(m.get("fs_B") or m.get("score_B") or ""),
                "status": m.get("status", ""),
            })
    return matches


def build_payload(m: dict) -> dict:
    iso_time = utc_to_cst_iso(m["date_utc"])
    date_key = iso_time[:10]
    home_score = m["home_score"].strip()
    away_score = m["away_score"].strip()
    is_played = m["status"] == "Played"
    score = f"{home_score}-{away_score}" if is_played and home_score and away_score else "0-0"
    status = "已完结" if is_played else "未开始"

    payload = {
        "source": "baidu_history_2025_full",
        "datetime": iso_time,
        "status": status,
        "homeTeam": m["home"],
        "awayTeam": m["away"],
        "score": score,
        "round": m["round"],
    }

    pen = PENALTY_CORRECTIONS.get((date_key, m["home"], m["away"]))
    if pen:
        payload["penaltyCountHome"] = pen["penaltyCountHome"]
        payload["penaltyCountAway"] = pen["penaltyCountAway"]

    return payload


def run():
    print("📡 Fetching 2025 regular season matches...")
    regular = fetch_season_matches(DONGQIUDI_SCHEDULE_API_2025)
    print(f"  Got {len(regular)} regular season matches")

    print("📡 Fetching 2025 knockout matches...")
    knockout = fetch_season_matches(DONGQIUDI_SCHEDULE_API_2025_KO)
    print(f"  Got {len(knockout)} knockout matches")

    all_matches = regular + knockout
    print(f"\n🚀 Syncing {len(all_matches)} matches to backend...")

    ok = 0
    fail = 0
    for m in all_matches:
        payload = build_payload(m)
        try:
            res = requests.post(API_URL, json=payload, timeout=10)
            if res.status_code in (200, 201):
                ok += 1
                print(f"  ✅ {payload['round']} | {payload['homeTeam']} {payload['score']} {payload['awayTeam']}")
            else:
                fail += 1
                print(f"  ❌ {payload['homeTeam']} vs {payload['awayTeam']} -> {res.status_code}: {res.text[:80]}")
        except Exception as e:
            fail += 1
            print(f"  ❌ {payload['homeTeam']} vs {payload['awayTeam']} -> {e}")

    print(f"\n✅ Done: {ok} synced, {fail} failed")


if __name__ == "__main__":
    run()
