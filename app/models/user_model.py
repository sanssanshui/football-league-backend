from re import A
from app.models.base_model import BaseModel
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, Any

class User(BaseModel):
    """用户表"""
    __tablename__ = "user"

    username = db.Column(db.String(20), unique=True, nullable=False, comment="用户名")
    password = db.Column(db.String(128), nullable=False, comment="加密密码")
    openid = db.Column(db.String(50), unique=True, nullable=True, comment="微信标识")
    focus_teams = db.Column(db.String(255), default="", comment="关注球队ID（逗号分隔）")
    score = db.Column(db.Integer, default=0, comment="球迷积分")
    avatar_url = db.Column(db.String(255), nullable=True, comment="头像URL")

    def __init__(self, username: str, 
                 password: str = "", 
                 openid: Optional[str] = None, 
                 focus_teams: Optional[str] = None, 
                 score: Optional[int] = None, 
                 avatar_url: Optional[str] = None, 
                 **kwargs):
        self.username = username
        self.password = password
        self.openid = openid
        self.focus_teams = focus_teams
        self.score = score
        self.avatar_url = avatar_url
        super().__init__(**kwargs)

    # 密码加密（存储时调用）
    def set_password(self, password):
        self.password = generate_password_hash(password, method="pbkdf2:sha256")

    # 密码验证（登录时调用）
    def check_password(self, password):
        return check_password_hash(self.password, password)

class UserCollection(BaseModel):
    """用户收藏表（收藏赛事）"""
    __tablename__ = "user_collection"

    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), comment="用户ID")
    match_id = db.Column(db.Integer, db.ForeignKey("match.id", ondelete="CASCADE"), comment="赛事ID")
    # 联合唯一约束：同一用户不能重复收藏同一赛事
    __table_args__ = (db.UniqueConstraint("user_id", "match_id", name="uk_user_match"),)

    def __init__(self,
                 user_id: int,
                 match_id: int,
                 **kwargs):
        self.user_id = user_id
        self.match_id = match_id
        super().__init__(**kwargs)