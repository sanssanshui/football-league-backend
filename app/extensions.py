from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from redis import Redis 
# 只初始化数据库核心ORM，删除所有Redis相关代码，彻底解决redis依赖报错
db = SQLAlchemy()
# 初始化SocketIO
socketio = SocketIO(cors_allowed_origins="*")
#初始化Redis
redis_client = None
# 统一初始化扩展（只初始化数据库）
def init_extensions(app):
    global redis_client
    db.init_app(app)
    socketio.init_app(app)
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
        print(" Redis客户端初始化成功")
      except Exception as e:
        print(f" Redis客户端初始化失败，错误：{str(e)}")

    print(" 扩展组件初始化完成（已关联数据库）")
