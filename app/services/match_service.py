from curses.panel import new_panel
from datetime import datetime
from app.models import match_model
from app.extensions import db

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

def create_player(name, team_id, position, jersey_number):
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
def delete_standing(team_id):
    standing = match_model.Standing.query.filter_by(team_id=team_id).first()
    if standing:
        db.session.delete(standing)
        db.session.commit()