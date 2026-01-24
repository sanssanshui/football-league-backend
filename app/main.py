from app import create_app
from extensions import socketio
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
