from os import read
from re import match

from pyparsing import Opt
from app.models.base_model import BaseModel
from app.extensions import db
from typing import Optional

from app.routes import user

class Comment(BaseModel):
    """聊天室/评论表"""
    __tablename__ = "comment"

    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="SET NULL"), comment="用户ID")
    match_id = db.Column(db.Integer, db.ForeignKey("match.id", ondelete="CASCADE"), comment="赛事ID")
    content = db.Column(db.String(500), nullable=False, comment="评论内容")
    user_nickname = db.Column(db.String(20), nullable=True, comment="用户昵称（冗余存储）")

    def __init__(self,
                 user_id: int,
                 match_id: int,
                 content: str,
                 user_nickname: Optional[str] = None,
                 **kwargs):
        self.user_id = user_id
        self.match_id = match_id
        self.content = content
        self.user_nickname = user_nickname
        super().__init__(**kwargs)

class Vote(BaseModel):
    """MVP投票表"""
    __tablename__ = "vote"

    match_id = db.Column(db.Integer, db.ForeignKey("match.id", ondelete="CASCADE"), comment="赛事ID")
    player_id = db.Column(db.Integer, db.ForeignKey("player.id", ondelete="SET NULL"), comment="球员ID")
    vote_count = db.Column(db.Integer, default=0, comment="得票数")
    __table_args__ = (db.UniqueConstraint("match_id", "player_id", name="uk_match_player"),)

    def __init__(self,
                 match_id: int,
                 player_id: int,
                 vote_count: int = 0,
                 **kwargs):
        self.match_id = match_id,
        self.player_id = player_id,
        self.vote_count = vote_count,
        super().__init__(**kwargs)

class News(BaseModel):
    """新闻表"""
    __tablename__ = "news"

    title = db.Column(db.String(100), nullable=False, comment="新闻标题")
    cover_url = db.Column(db.String(255), nullable=True, comment="封面图URL")
    content = db.Column(db.Text, nullable=False, comment="新闻内容")
    team_id = db.Column(db.Integer, db.ForeignKey("team.id", ondelete="SET NULL"), comment="关联球队ID")
    read_count = db.Column(db.Integer, default=0, comment="阅读量")

    def __init__(self,
                 title: str,
                 content: str,
                 team_id: int,
                 read_count: int = 0,
                 cover_url: Optional[str] = None,
                 **kwargs):
        self.title = title
        self.cover_url = cover_url
        self.content = content
        self.team_id = team_id
        self.read_count = read_count
        super().__init__(**kwargs)

class Guess(BaseModel):
    """赛事竞猜表"""
    __tablename__ = "guess"

    user_id = db.Column(db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), comment="用户ID")
    match_id = db.Column(db.Integer, db.ForeignKey("match.id", ondelete="CASCADE"), comment="赛事ID")
    guess_result = db.Column(db.String(10), nullable=False, comment="竞猜结果（胜/平/负）")
    score_cost = db.Column(db.Integer, nullable=False, comment="消耗积分")
    score_reward = db.Column(db.Integer, nullable=True, comment="奖励积分")
    status = db.Column(db.SmallInteger, default=0, comment="状态：0-未开奖，1-猜对，2-猜错")
    __table_args__ = (db.UniqueConstraint("user_id", "match_id", name="uk_user_match_guess"),)

    def __init__(self,
                 user_id: int,
                 match_id: int,
                 guess_result: str,
                 score_cost: int,
                 score_reward: Optional[int] = None,
                 status: int = 0,
                 **kwargs):
        self.user_id = user_id,
        self.match_id = match_id,
        self.guess_result = guess_result,
        self.score_cost = score_cost,
        self.score_reward = score_reward,
        self.status = status,
        super().__init__(**kwargs)