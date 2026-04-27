import json
import re
from pathlib import Path
from typing import Iterable

import requests
from bs4 import BeautifulSoup


DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)
API_BASE = "https://sport-data.dongqiudi.com/soccer/biz/data"
DEFAULT_SEASON_ID = "26680"
DEFAULT_SEASON = "2026"
BACKEND_BASE_URL = "http://localhost:5002"


def fetch_html(url: str) -> str:
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=20)
    response.encoding = "utf-8"
    response.raise_for_status()
    return response.text


def fetch_json(url: str) -> dict:
    response = requests.get(url, headers=DEFAULT_HEADERS, timeout=20)
    response.raise_for_status()
    return response.json()


def post_json(url: str, payload: dict) -> dict:
    response = requests.post(url, json=payload, headers=DEFAULT_HEADERS, timeout=15)
    response.raise_for_status()
    return response.json()


def extract_plain_lines(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text("\n", strip=True)
    return [line.strip() for line in text.splitlines() if line.strip()]


def save_snapshot(name: str, payload: dict) -> Path:
    output_path = OUTPUT_DIR / f"{name}.json"
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return output_path


def strip_image_token(value: str) -> str:
    return re.sub(r"^\d*Image", "", value).strip()


def find_section(lines: Iterable[str], header: str) -> list[str]:
    collecting = False
    rows: list[str] = []
    for line in lines:
        if line == header:
            collecting = True
            continue
        if collecting and line.startswith("加载中"):
            break
        if collecting:
            rows.append(line)
    return rows
