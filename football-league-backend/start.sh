#!/usr/bin/env bash
set -euo pipefail

# 江苏苏超联赛平台一键启动脚本
# 约定：所有 Python 爬虫只使用 scraper/.venv，不在其他目录创建虚拟环境。
#
# 环境变量：
#   AUTO_SYNC=1              只启动后端和实时爬虫，不执行启动前同步
#   SYNC_2025_DETAILS=1     启动时额外回填 2025 赛程详情（耗时较长，默认关闭）
#   DETAIL_SLEEP=0.25       详情回填请求间隔

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
SCRAPER_DIR="$ROOT_DIR/scraper"

# ===================== 自动识别系统路径（我加的）=====================
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || -d "$SCRAPER_DIR/.venv/Scripts" ]]; then
    PYTHON_BIN="$SCRAPER_DIR/.venv/Scripts/python.exe"
else
    PYTHON_BIN="$SCRAPER_DIR/.venv/bin/python"
fi
# ====================================================================

BACKEND_URL="http://localhost:5002/api/matches"
AUTO_SYNC="${AUTO_SYNC:-1}"
SYNC_2025_DETAILS="${SYNC_2025_DETAILS:-0}"
DETAIL_SLEEP="${DETAIL_SLEEP:-0.25}"

if [ ! -x "$PYTHON_BIN" ]; then
  echo "❌ 未找到 scraper 虚拟环境：$PYTHON_BIN"
  echo "   请先在 football-league-backend/scraper 内创建并安装 .venv。"
  exit 1
fi

cleanup() {
  if [ -n "${BACKEND_PID:-}" ] && kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "========================================================"
echo "▶[1/4] 启动 NestJS 后端接口..."
echo "========================================================"
cd "$SERVER_DIR"
npm run start:dev &
BACKEND_PID=$!

echo ""
echo "⏳ [2/4] 等待后端就绪：$BACKEND_URL"
until curl --output /dev/null --silent --get --fail "$BACKEND_URL"; do
  printf '.'
  sleep 2
done

echo ""
echo "========================================================"
echo "后端已就绪"
echo "========================================================"

cd "$SCRAPER_DIR"

if [ "$AUTO_SYNC" = "1" ]; then
  echo "========================================================"
  echo "🔄 [3/4] 启动前同步：球队阵容、2026赛程与已完赛详情"
  echo "========================================================"
  "$PYTHON_BIN" scrape_team_rosters_baidu.py --sync
  "$PYTHON_BIN" sync_2026_schedule_dongqiudi.py
  "$PYTHON_BIN" backfill_match_details_baidu.py --year 2026 --sleep "$DETAIL_SLEEP"

  if [ "$SYNC_2025_DETAILS" = "1" ]; then
    echo "========================================================"
    echo "📚 额外同步 2025 赛程详情"
    echo "========================================================"
    "$PYTHON_BIN" backfill_match_details_baidu.py --year 2025 --sleep "$DETAIL_SLEEP"
  fi
else
  echo "⏭️ AUTO_SYNC=0，跳过启动前同步。"
fi

echo "========================================================"
echo "🤖 [4/4] 启动实时爬虫主控，后端保持运行..."
echo "========================================================"
"$PYTHON_BIN" main.py

wait "$BACKEND_PID"