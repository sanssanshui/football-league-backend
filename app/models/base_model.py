from datetime import datetime
#from app.extensions import db
from extensions import db

class BaseModel(db.Model):
    """基础模型（所有表共享字段）"""
    __abstract__ = True  # 标记为抽象类，不创建实际数据表

    id = db.Column(db.Integer, primary_key=True, autoincrement=True, comment="主键ID")
    create_time = db.Column(db.DateTime, default=datetime.now, comment="创建时间")
    update_time = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")