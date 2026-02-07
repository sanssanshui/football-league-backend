import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import create_app
from app.extensions import socketio  # ✅ 只保留这一个socketio导入（同步实例）

if __name__ == '__main__':
    app = create_app(config_name=os.getenv("FLASK_ENV", "dev"))
    # 启动同步SocketIO服务
    socketio.run(
        app, 
        host="0.0.0.0", 
        port=5000, 
        debug=True, 
        allow_unsafe_werkzeug=True
    )