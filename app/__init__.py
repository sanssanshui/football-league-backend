from flask import Flask, request
from config import config_dict
from app.extensions import init_extensions, db, socketio
from app.routes.user import user_bp
from app.utils.jwt_utils import verify_token

def create_app(config_name="dev"):
    app = Flask(__name__)
    # 1.加载配置
    config = config_dict.get(config_name, config_dict["dev"])
    app.config.from_object(config)
    print(f"当前环境：{'开发环境' if config_name == 'dev' else 'production'}")

    # 2.初始化扩展（数据库，Redis,SocketIO）
    init_extensions(app)

    # 3.测试数据库连接
    with app.app_context():
        try:
            db.session.execute(db.text("SELECT 1"))  # flask-sqlalchemy原生适配写法
            db.session.commit()
            print("MySQL数据库连接成功！")
        except Exception as e:
            print(f"MySQL数据库连接失败，错误：{str(e)}")

    # 4.注册路由（正确的蓝图注册方式）
    app.register_blueprint(user_bp) 

    # 5.注册临时的SocketIO 事件（Test)
    @socketio.on('connect')
    def handle_connect():
        token = request.args.get('token')
        user_id = verify_token(token) if token else "None"
        if not user_id:
            print("SocketIO连接失败，未提供有效的token")
            return False  # 拒绝连接
        print(f"用户 {user_id} 已通过WebSocket认证")

    @socketio.on('ping_event')
    def handle_ping(data):
        print(f"收到客户端ping事件，数据：{data}")
        socketio.emit('pong_event', {'msg': 'Ping from server', 'data': data})

    # 6.注册根路由
    @app.route("/")
    def index():
        return {"code": 200, "message": "足球联赛后端服务启动成功"}

    return app

