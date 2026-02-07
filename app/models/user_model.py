from app.models.base_model import BaseModel
from app.models.match_model import Match  # 导入赛事模型用于关联
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from typing import List

class User(BaseModel):
    """用户表"""
    __tablename__ = "user"

    username = db.Column(db.String(20), unique=True, nullable=False, comment="用户名")
    password = db.Column(db.String(128), nullable=False, comment="加密密码")
    openid = db.Column(db.String(50), unique=True, nullable=True, comment="微信标识")
    focus_teams = db.Column(db.String(255), default="", comment="关注球队ID（逗号分隔）")
    score = db.Column(db.Integer, default=0, comment="球迷积分")
    avatar_url = db.Column(db.String(255), nullable=True, comment="头像URL")

    # 关联用户收藏表（一对多：一个用户可收藏多个赛事）
    collections = db.relationship("UserCollection", backref="user", cascade="all, delete-orphan")

    # 密码加密（存储时调用）
    def set_password(self, password):
        self.password = generate_password_hash(password, method="pbkdf2:sha256")

    # 密码验证（登录时调用）
    def check_password(self, password):
        return check_password_hash(self.password, password)

    # 解析关注球队ID为列表
    def get_focus_teams(self) -> List[int]:
        if not self.focus_teams:
            return []
        return [int(team_id) for team_id in self.focus_teams.split(",") if team_id.isdigit()]

    # 更新关注球队（添加/移除）
    def update_focus_teams(self, team_id: int, is_add: bool = True):
        current_teams = self.get_focus_teams()
        if is_add and team_id not in current_teams:
            current_teams.append(team_id)
        elif not is_add and team_id in current_teams:
            current_teams.remove(team_id)
        self.focus_teams = ",".join(map(str, current_teams)) if current_teams else ""

class UserCollection(BaseModel):
    """用户收藏表（收藏赛事）"""
    __tablename__ = "user_collection"

    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), comment="用户ID")
    match_id = db.Column(db.Integer, db.ForeignKey("match.id", ondelete="CASCADE"), comment="赛事ID")
    # 联合唯一约束：同一用户不能重复收藏同一赛事
    __table_args__ = (db.UniqueConstraint("user_id", "match_id", name="uk_user_match"),)

    # 关联赛事表（便于查询收藏的赛事详情）
    match = db.relationship("Match", backref="collections")