# start.py - 统一启动脚本，自动加载.env配置
import os
from dotenv import load_dotenv

# 优先加载本地.env文件（关键：覆盖config.py的默认值）
load_dotenv(override=True)

# 导入并运行原启动文件
from app import main
exec(open("app/run.py").read())