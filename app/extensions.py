from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from redis import Redis 

# 初始化核心扩展（先创建对象，后续绑定app）
db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*")  # 仅创建对象，不提前绑定app
redis_client = None

# 统一初始化扩展
def init_extensions(app):
    global redis_client
    # 1. 初始化数据库
    db.init_app(app)
    # 2. 初始化SocketIO（必须在app上下文内执行init_app）
    socketio.init_app(app)  # 关键：在此处绑定app，确保socketio.server被初始化
    # 3. 初始化Redis（容错处理）
    redis_config = app.config.get("REDIS_CONFIG")
    if redis_config:
        try:
            redis_client = Redis(
                host=redis_config["host"],
                port=redis_config["port"],
                username=redis_config.get("username","default"),
                password=redis_config["password"],
                decode_responses=redis_config.get("decode_responses",True)          
            )
            redis_client.ping()  # 测试Redis连接（若不需要可删除）
            print("✅ Redis客户端初始化成功")
        except Exception as e:
            redis_client = None
            print(f"⚠️ Redis客户端初始化失败，错误：{str(e)}（不影响核心功能）")
    print("✅ 扩展组件初始化完成（已关联数据库）")