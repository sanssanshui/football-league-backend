# app/models/__init__.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import Config

# 拼接MySQL连接地址（格式：mysql+pymysql://user:password@host:port/database?charset=xxx）
SQLALCHEMY_DATABASE_URL = (
    f"mysql+pymysql://{Config.MYSQL_CONFIG['user']}:"
    f"{Config.MYSQL_CONFIG['password']}@"
    f"{Config.MYSQL_CONFIG['host']}:"
    f"{Config.MYSQL_CONFIG['port']}/"
    f"{Config.MYSQL_CONFIG['database']}?"
    f"charset={Config.MYSQL_CONFIG['charset']}"
)

# 初始化数据库引擎（连接池默认开启，pool_pre_ping确保连接有效，避免超时）
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

# 创建会话本地类（每次请求创建一个独立会话，用完自动关闭，避免数据冲突）
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类（所有数据模型类必须继承此类，后续创建数据库表依赖它）
Base = declarative_base()

# 依赖函数：供FastAPI接口注入数据库会话（后续接口开发时使用）
def get_db():
    db = SessionLocal()
    try:
        yield db  # 提供会话给接口使用
    finally:
        db.close()  # 接口执行完毕后，自动关闭会话