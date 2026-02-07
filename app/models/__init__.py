# app/models/__init__.py

#在代码中动态添加上一级目录到模块搜索路径：
import sys
from pathlib import Path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import Config

# 拼接MySQL连接地址
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{Config.MYSQL_CONFIG['user']}:{Config.MYSQL_CONFIG['password']}@{Config.MYSQL_CONFIG['host']}:{Config.MYSQL_CONFIG['port']}/{Config.MYSQL_CONFIG['database']}?charset={Config.MYSQL_CONFIG['charset']}"

# 初始化数据库引擎(连接池默认开启)
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)

# 创建会话本地类(每次请求创建一个会话,用完关闭)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类(所有数据模型类需继承此类)
Base = declarative_base()

# 依赖函数:获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db  # 提供会话给接口使用
    finally:
        db.close()  # 接口执行完关闭会话