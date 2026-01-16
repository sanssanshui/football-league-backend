from flask_sqlalchemy import SQLAlchemy

# 只初始化数据库核心ORM，删除所有Redis相关代码，彻底解决redis依赖报错
db = SQLAlchemy()

# 统一初始化扩展（只初始化数据库）
def init_extensions(app):
    db.init_app(app)
    print("✅ 扩展组件初始化完成（已关联数据库）")