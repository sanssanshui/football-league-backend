from flask import Flask
from app.config import config_dict
from app.extensions import init_extensions, db
import os

def create_app(config_name="dev"):
    """创建并初始化Flask应用（纯净版，无冗余校验）"""
    app = Flask(__name__)
    # 加载配置
    config = config_dict.get(config_name, config_dict["dev"])
    app.config.from_object(config)
    print(f"当前环境：{'开发环境' if config_name == 'dev' else '生产环境'}")
    # 初始化数据库
    init_extensions(app)
    # 数据库连接测试【修复SQLAlchemy2.0语法，最简写法，零报错】
    with app.app_context():
        try:
            db.session.execute(db.text("SELECT 1"))  # flask-sqlalchemy原生适配写法
            db.session.commit()
            print("✅ MySQL数据库连接成功！")
        except Exception as e:
            raise Exception(f"❌ 数据库连接失败：{str(e)}")
    # 根路由
    @app.route("/")
    def index():
        return {"code": 200, "message": "足球联赛后端服务启动成功"}

    return app

if __name__ == "__main__":
    app = create_app(config_name=os.getenv("FLASK_ENV", "dev"))
    app.run(host="0.0.0.0", port=5000, debug=app.config["DEBUG"])