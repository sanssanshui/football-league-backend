#!/usr/bin/env bash

# 江苏苏超联赛平台一键启动脚本 (伴随式爬虫引擎)
# 启动顺序：NestJS Server -> Python Playwright Scraper

echo "========================================================"
echo "▶️ [1/3] 启动 NestJS 核心后台接口..."
echo "========================================================"
cd server || exit
npm run start:dev &
BACKEND_PID=$!

# 通过健康探针轮询后端是否已就绪
echo ""
echo "⏳ [2/3] 探针监听中：等待 http://localhost:5002/api/matches 就绪响应..."
until curl --output /dev/null --silent --get --fail http://localhost:5002/api/matches; do
    printf '.'
    sleep 2
done

echo ""
echo "========================================================"
echo "✅ [3/3] 后台通信总线已就绪，激活全景爬虫引擎！"
echo "========================================================"
cd ../scraper || exit
source .venv/bin/activate
python3 main.py

# 如果爬虫退出，继续保持后端运行
wait $BACKEND_PID
