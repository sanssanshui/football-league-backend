import hashlib
from typing import Any, Dict, Optional

import redis


SCHEDULE_URL = "https://tiyu.baidu.com/al/match?match=%E6%B1%9F%E8%8B%8F%E5%9F%8E%E5%B8%82%E8%B6%B3%E7%90%83%E8%81%94%E8%B5%9B&tab=%E8%B5%9B%E7%A8%8B"
API_SYNC_URL = "http://localhost:5002/api/matches/sync"
BAIDU_MOBILE_UA = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 "
    "Mobile/15E148 Safari/604.1"
)

try:
    redis_client = redis.StrictRedis.from_url(
        "redis://default:VT4UxZbaF34UnlhUJoYoTXsXMUi0Gk4m@redis-18983.c1.asia-northeast1-1.gce.cloud.redislabs.com:18983",
        decode_responses=True,
    )
    redis_client.ping()
    print("✅ [Redis] 连接成功")
except Exception:
    redis_client = None
    print("⚠️ [Redis] 不可用")


def get_match_key(home: str, away: str, match_date: str) -> str:
    return f"{home}_{away}_{match_date}"


def get_match_hash(home: str, away: str, match_date: str) -> str:
    return hashlib.md5(get_match_key(home, away, match_date).encode("utf-8")).hexdigest()


def get_state_cache_key(match: Dict[str, Any]) -> str:
    return f"match_state:2026:{get_match_key(match['homeName'], match['awayName'], match['date'])}"


def get_detail_lock_key(match: Dict[str, Any], bucket: str) -> str:
    return f"match_detail_lock:2026:{bucket}:{get_match_hash(match['homeName'], match['awayName'], match['date'])}"


def should_scrape_detail(match: Dict[str, Any]) -> bool:
    return match.get("status") in {"已结束", "进行中", "已完结"}


def normalize_status(raw_status: Optional[str]) -> str:
    status = (raw_status or "").strip()
    if status == "已结束":
        return "已完结"
    if status == "未开赛":
        return "待开始"
    return status or "待开始"
