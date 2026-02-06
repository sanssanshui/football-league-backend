#from app.models.base_model import BaseModel
#from app.extensions import db
from models.base_model import BaseModel
from extensions import db

class Team(BaseModel):
    """球队表"""
    __tablename__ = "team"
    __table_args__ = {'mysql_charset': 'utf8mb4'}
    name = db.Column(db.String(20), unique=True, nullable=False, comment="球队名称")
    city = db.Column(db.String(20), nullable=False, comment="所属城市")
    logo_url = db.Column(db.String(255), nullable=True, comment="球队logo URL")

class Match(BaseModel):
    """赛事表"""
    __tablename__ = "football_match"

    home_team_id = db.Column(db.Integer, db.ForeignKey("team.id", ondelete="SET NULL"), comment="主队ID")
    away_team_id = db.Column(db.Integer, db.ForeignKey("team.id", ondelete="SET NULL"), comment="客队ID")
    match_time = db.Column(db.DateTime, nullable=False, comment="比赛时间")
    venue = db.Column(db.String(50), nullable=True, comment="比赛场地")
    home_score = db.Column(db.Integer, default=0, comment="主队得分")
    away_score = db.Column(db.Integer, default=0, comment="客队得分")
    status = db.Column(db.SmallInteger, default=0, comment="赛事状态：0-未开始，1-进行中，2-已结束")
    possession_rate_home = db.Column(db.Float, nullable=True, comment="主队控球率（%）")
    shot_count_home = db.Column(db.Integer, nullable=True, comment="主队射门次数")
    shot_count_away = db.Column(db.Integer, nullable=True, comment="客队射门次数")

    # 关联球队表（便于查询）
    home_team = db.relationship("Team", foreign_keys=[home_team_id], backref="home_matches")
    away_team = db.relationship("Team", foreign_keys=[away_team_id], backref="away_matches")

class Player(BaseModel):
    """球员表"""
    __tablename__ = "player"

    name = db.Column(db.String(20), nullable=False, comment="球员姓名")
    team_id = db.Column(db.Integer, db.ForeignKey("team.id", ondelete="SET NULL"), comment="所属球队ID")
    position = db.Column(db.String(10), nullable=True, comment="场上位置（前锋/中场等）")
    jersey_number = db.Column(db.Integer, nullable=True, comment="球衣号码")

class Standing(BaseModel):
    """积分榜表"""
    __tablename__ = "standing"

    team_id = db.Column(db.Integer, db.ForeignKey("team.id", ondelete="CASCADE"), comment="球队ID")
    wins = db.Column(db.Integer, default=0, comment="胜场")
    draws = db.Column(db.Integer, default=0, comment="平场")
    losses = db.Column(db.Integer, default=0, comment="负场")
    points = db.Column(db.Integer, default=0, comment="积分")
    __table_args__ = (db.UniqueConstraint("team_id", name="uk_team_standing"),)