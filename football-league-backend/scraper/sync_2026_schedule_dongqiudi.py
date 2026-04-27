"""One-shot Dongqiudi schedule sync for filling Baidu schedule gaps."""

from scrape_2026_schedule_dongqiudi import fetch_dongqiudi_schedule_api
from scrape_2026_sync_client import sync_to_backend


def run() -> None:
    matches = fetch_dongqiudi_schedule_api()
    synced = 0
    for match in matches:
        if sync_to_backend(match, {"events": [], "stats": {}, "lineups": {"home": [], "away": [], "coaches": {}}, "textLives": []}):
            synced += 1
    print(f"✅ Dongqiudi schedule one-shot synced {synced}/{len(matches)} matches")


if __name__ == "__main__":
    run()
