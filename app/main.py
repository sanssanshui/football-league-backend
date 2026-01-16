from flask import Flask
#from app.config import config_dict
#from app.extensions import init_extensions, db
from config import config_dict
from extensions import init_extensions, db
import os


# ==============================================
#                 主程序入口
# ==============================================

if __name__ == '__main__':
    #1. 获取环境配置
    env = os.getenv("FLASK_ENV", "dev")
    app = create_app(config_name=env)
    #2. 启动服务
    print(f"服务正在启动，port=5000...")
    socketio.run(app, host="0.0.0.0", port=5000,debug=True,allow_unsafe_werkzeug=True)
