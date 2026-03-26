from ctypes import pointer
from curses.panel import new_panel
from datetime import datetime
from re import match
from app.models import match_model
from app.extensions import db
from sqlalchemy import desc, and_, or_

#创建Team、Match、Player、Standing表的数据
def create_team(name, city, logo_url):
    new_team = match_model.Team(
        name = name,
        city = city,
        logo_url = logo_url
    )
    db.session.add(new_team)
    db.session.commit()
    return new_team

def create_match(home_team_id, away_team_id, match_time, 
                 venue = None, home_score = 0, away_score = 0,
                 status = 0, possession_rate_home = 0, shot_count_home = 0,
                 shot_count_away = 0):
    if home_team_id == away_team_id:
        raise ValueError("主客队ID不能相同")
    
    new_match = match_model.Match(
        home_team_id = home_team_id,
        away_team_id = away_team_id,
        match_time = datetime.strptime(match_time, '%Y-%m-%d %H:%M:%S'),
        venue = venue,
        home_score = home_score,
        away_score = away_score,
        status = status,
        possession_rate_home = possession_rate_home,
        shot_count_home = shot_count_home,
        shot_count_away = shot_count_away
    )
    db.session.add(new_match)
    db.session.commit()
    return new_match

def create_player(name, team_id, position = "", jersey_number = 0):
    new_player = match_model.Player(
        name = name,
        team_id = team_id,
        position = position,
        jersey_number = jersey_number
    )
    db.session.add(new_player)
    db.session.commit()
    return new_player

def create_standing(team_id, wins = 0, draws = 0, losses = 0, points = 0):
    new_standing = match_model.Standing(
        team_id = team_id,
        wins = wins,
        draws = draws,
        losses = losses,
        points = points
    )
    db.session.add(new_standing)
    db.session.commit()
    return new_standing

#删除Team、Match、Player、Standing表中的数据
def delete_team(team_id):
    team = match_model.Team.query.get(team_id)
    if not team:
        raise ValueError("目标球队不存在")
    # 删除关联球员
    match_model.Player.query.filter_by(team_id = team_id).delete()
    # 删除球队本身
    db.session.delete(team)
    db.session.commit()

def delete_match(match_id):
    match = match_model.Match.query.get(match_id)
    if not match:
        raise ValueError("目标比赛不存在")
    db.session.delete(match)
    db.session.commit()

def delete_player(player_id):
    player = match_model.Player.query.get(player_id)
    if not player:
        raise ValueError("目标球员不存在")
    db.session.delete(player)
    db.session.commit()

#通常不建议直接删除积分记录
def delete_standing(standing_id):
    standing = match_model.Standing.query.filter_by(team_id = standing_id).first()
    if standing:
        db.session.delete(standing)
        db.session.commit()

#修改Team、Match、Player、Standing表中的数据
def update_team(team_id, **kwargs):
    team = match_model.Team.query.get(team_id)
    if not team:
        raise ValueError("目标球队不存在")
    for key, value in kwargs.items():
        if hasattr(team, key):
            setattr(team, key, value)
    db.session.commit()
    return team

def update_match(match_id, **kwargs):
    match = match_model.Team.query.get(match_id)
    if not match:
        raise ValueError("目标比赛不存在")
    for key, value in kwargs.items():
        if hasattr(match, key):
            setattr(match, key, value)
    db.session.commit()
    return match

def update_player(player_id, **kwargs):
    player = match_model.Team.query.get(player_id)
    if not player:
        raise ValueError("目标球员不存在")
    for key, value in kwargs.items():
        if hasattr(player, key):
            setattr(player, key, value)
    db.session.commit()
    return player

def update_standing(standing_id, **kwargs):
    standing = match_model.Team.query.get(standing_id)
    if not standing:
        raise ValueError("积分记录不存在")
    for key, value in kwargs.items():
        if hasattr(standing, key):
            setattr(standing, key, value)
    db.session.commit()
    return standing

#查询Team、Match、Player、Standing表中的数据
def get_team(team_id):
    return match_model.Team.query.get(team_id)

def get_all_teams():
    return match_model.Team.query.all()

def get_match(match_id):
    return match_model.Match.query.get(match_id)

def get_all_matches(team_id = None, status = None):
    query = match_model.Match.query
    if team_id:
        query = query.filter(
            or_(match_model.Match.home_team_id == team_id, 
                match_model.Match.away_team_id == team_id)
        )
    if status:
        query = query.filter_by(status = status)
    return query.all()

def get_player(player_id):
    return match_model.Player.query.get(player_id)

def get_all_players(team_id = None):
    query = match_model.Player.query
    if team_id:
        query = query.filter_by(team_id = team_id)
    return query.all()

def get_standing(standing_id):
    return match_model.Standing.query.get(standing_id)

def get_all_standings():
    # 按积分降序，胜场降序，平场降序
    query = match_model.Standing.query.order_by(
        match_model.Standing.points.desc(),
        match_model.Standing.wins.desc(),
        match_model.Standing.draws.desc()
    )
    return query.all()