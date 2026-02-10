from curses.panel import new_panel
from re import match
from flask import Blueprint, request, jsonify
from matplotlib.pyplot import draw
from app.models.match_model import Match
from app.services import match_service

team_bp = Blueprint('team', __name__, url_prefix = '/teams')
match_bp = Blueprint('match', __name__, url_prefix = '/matches')
player_bp = Blueprint('player', __name__, url_prefix = '/players')
standing_bp = Blueprint('standing', __name__, url_prefix = '/standings')
    
#创建
@team_bp.route('', methods=['POST'])
def create_team():
    data = request.json
    if not data:
        return jsonify({
            'code': 400,
            'message': 'No JSON data provided',
            'data': {}
        }), 400
    try:
        new_team = match_service.create_team(
            name = data['name'],
            city = data['city'],
            logo_url = data.get('logo_url', None) # 没有数据就默认为None
        )
        return jsonify({
            'code': 200,
            'message': '创建成功',
            'data': {
                'team_id': new_team.id,
                'name': new_team.name,
                'city': new_team.city,
                'logo_url': new_team.logo_url
            }
        }), 200
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
            'data': {}
        }), 400
    
@match_bp.route('', methods=['POST'])
def create_match():
    data = request.json
    if data is None:
        return jsonify({
            'code': 400,
            'message': 'No JSON data provided',
            'data': {}
        }), 400
    try:
        new_match = match_service.create_match(
            home_team_id = data['home_team_id'],
            away_team_id = data['away_team_id'],
            match_time = data['match_time'],
            venue = data.get('venue', None),
            home_score = data.get('home_score', 0),
            away_score = data.get('away_score', 0),
            status = data.get('status', 0),
            possession_rate_home = data.get('possession_rate_home', 0),
            shot_count_home = data.get('shot_count_home', 0),
            shot_count_away = data.get('shot_count_away', 0)
        )
        return jsonify({
            'code': 200,
            'message': '创建成功',
            'data': {
                'match_id': new_match.id,
                'home_team_id': new_match.home_team_id,
                'away_team_id': new_match.away_team_id,
                'match_time': new_match.match_time,
                'venue': new_match.venue,
                'home_score': new_match.home_score,
                'away_score': new_match.away_score,
                'status': new_match.status,
                'possession_rate_home': new_match.possession_rate_home,
                'shot_count_home': new_match.shot_count_home,
                'shot_count_away': new_match.shot_count_away
            }
        }), 200
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
            'data': {}
        }), 400
    
@player_bp.route('', methods=['POST'])
def create_player():
    data = request.json
    if not data:
        return jsonify({
            'code': 400,
            'message': 'No JSON data provided',
            'data': {}
        }), 400
    try:
        new_player = match_service.create_player(
            name = data['name'],
            team_id = data['team_id'], 
            position = data.get('position', ''),
            jersey_number = data.get('jersey_number', 0)
        )
        return jsonify({
            'code': 200,
            'message': '创建成功',
            'data': {
                'player_id': new_player.id,
                'name': new_player.name,
                'team_id': new_player.team_id,
                'position': new_player.position,
                'jersey_number': new_player.jersey_number
            }
        }), 200
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
            'data': {}
        }), 400
    
@standing_bp.route('', methods=['POST'])
def create_standing():
    data = request.json
    if not data:
        return jsonify({
            'code': 400,
            'message': 'No JSON data provided',
            'data': {}
        }), 400
    try:
        new_standing = match_service.create_standing(
            team_id = data['team_id'],
            wins = data.get('wins', 0),
            draws = data.get('draws', 0),
            losses = data.get('losses', 0),
            points = data.get('points', 0)  # 默认0分
        )
        return jsonify({
            'code': 200,
            'message': '创建成功',
            'data': {
                'standing_id': new_standing.id,
                'team_id': new_standing.team_id,
                'wins': new_standing.wins,
                'draws': new_standing.draws,
                'losses': new_standing.losses,
                'points': new_standing.points
            }
        }), 200
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
            'data': {}
        }), 400

#删除
@team_bp.route('/<int:team_id>', methods=['DELETE'])
def delete_team(team_id):
    try:
        match_service.delete_team(team_id)
        return jsonify({
            'code': 200,
            'message': '删除成功',
            'data': {}
        }), 200
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
            'data': {}
        }), 400

@match_bp.route('/<int:match_id>', methods=['DELETE'])
def delete_match(match_id):
    try:
        match_service.delete_match(match_id)
        return jsonify({
            'code': 200,
            'message': '删除成功',
            'data': {}
        }), 200
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
            'data': {}
        }), 400

@player_bp.route('/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    try:
        match_service.delete_player(player_id)
        return jsonify({
            'code': 200,
            'message': '删除成功',
            'data': {}
        }), 200
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
            'data': {}
        }), 400

@standing_bp.route('/<int:standing_id>', methods=['DELETE'])
def delete_standing(standing_id):
    try:
        match_service.delete_standing(standing_id)
        return jsonify({
            'code': 200,
            'message': '删除成功',
            'data': {}
        }), 200
    except ValueError as e:
        return jsonify({
            'code': 400,
            'message': str(e),
            'data': {}
        }), 400

#修改
@team_bp.route('/<int:team_id>', methods=['PUT'])
def update_team(team_id):
    data = request.json
    if not data:
        return jsonify({
            'code': 400,
            'message': 'No update data provided',
            'data': {}
        }), 400
    updated_team = match_service.update_team(
        team_id,
        name = data.get('name'),
        city = data.get('city'),
        logo_url = data.get('logo_url')
    )
    return jsonify({
        'code': 200,
        'message': '更新成功',
        'data': updated_team.serialize()
    }), 200

@match_bp.route('/<int:match_id>', methods=['PUT'])
def update_match(match_id):
    data = request.json
    if not data:
        return jsonify({
            'code': 400,
            'message': 'No update data provided',
            'data': {}
        }), 400
    updated_match = match_service.update_match(
        match_id,
        home_team_id = data.get('home_team_id'),
        away_team_id = data.get('away_team_id'),
        match_time = data.get('match_time'),
        venue = data.get('venue'),
        home_score = data.get('home_score'),
        away_score = data.get('away_score'),
        status = data.get('status'),
        possession_rate_home = data.get('possession_rate_home'),
        shot_count_home = data.get('shot_count_home'),
        shot_count_away = data.get('shot_count_away')
    )
    return jsonify({
        'code': 200,
        'message': '更新成功',
        'data': updated_match.serialize()
    }), 200

@player_bp.route('/<int:player_id>', methods=['PUT'])
def update_player(player_id):
    data = request.json
    if not data:
        return jsonify({
            'code': 400,
            'message': 'No update data provided',
            'data': {}
        }), 400
    updated_player = match_service.update_player(
        player_id,
        name = data.get('name'),
        team_id = data.get('team_id'),
        position = data.get('position'),
        jersey_number = data.get('jersey_number')
    )
    return jsonify({
        'code': 200,
        'message': '更新成功',
        'data': updated_player.serialize()
    }), 200

@standing_bp.route('/<int:standing_id>', methods=['PUT'])
def update_standing(standing_id):
    data = request.json
    if not data:
        return jsonify({
            'code': 400,
            'message': 'No update data provided',
            'data': {}
        }), 400
    updated_standing = match_service.update_standing(
        standing_id,
        team_id = data.get('team_id'),
        wins = data.get('wins'),
        draws = data.get('draws'),
        losses = data.get('losses'),
        points = data.get('points')
    )
    return jsonify({
        'code': 200,
        'message': '更新成功',
        'data': updated_standing.serialize()
    }), 200

#查询
@team_bp.route('/<int:team_id>', methods=['GET'])
def get_team(team_id):
    team = match_service.get_team(team_id)
    if not team:
        return jsonify({
            'code': 404,
            'message': 'Team not found',
            'data': {}
        }), 404
    return jsonify({
        'code': 200,
        'message': '查询成功',
        'data': team.serialize()
    }), 200

@team_bp.route('', methods=['GET'])
def get_all_teams():
    teams = match_service.get_all_teams()
    teams_data = [team.serialize() for team in teams]
    return jsonify({
        'code': 200,
        'message': '查询成功',
        'data': {
            'teams': teams_data
        }
    }), 200

@match_bp.route('/<int:match_id>', methods=['GET'])
def get_match(match_id):
    match = match_service.get_match(match_id)
    if not match:
        return jsonify({
            'code': 404,
            'message': 'Match not found',
            'data': {}
        }), 404
    return jsonify({
        'code': 200,
        'message': '查询成功',
        'data': match.serialize()
    }), 200

@match_bp.route('', methods=['GET'])
def get_all_matches():
    matches = match_service.get_all_matches()
    matches_data = [match.serialize() for match in matches]
    return jsonify({
        'code': 200,
        'message': '查询成功',
        'data': {
            'matches': matches_data
        }
    }), 200

@player_bp.route('/<int:player_id>', methods=['GET'])
def get_player(player_id):
    player = match_service.get_team(player_id)
    if not player:
        return jsonify({
            'code': 404,
            'message': 'Player not found',
            'data': {}
        }), 404
    return jsonify({
        'code': 200,
        'message': '查询成功',
        'data': player.serialize()
    }), 200

@player_bp.route('', methods=['GET'])
def get_all_players():
    players = match_service.get_all_teams()
    players_data = [player.serialize() for player in players]
    return jsonify({
        'code': 200,
        'message': '查询成功',
        'data': {
            'players': players_data
        }
    }), 200

@standing_bp.route('/<int:standing_id>', methods=['GET'])
def get_standing(standing_id):
    standing = match_service.get_team(standing_id)
    if not standing:
        return jsonify({
            'code': 404,
            'message': 'Standing not found',
            'data': {}
        }), 404
    return jsonify({
        'code': 200,
        'message': '查询成功',
        'data': standing.serialize()
    }), 200

@standing_bp.route('', methods=['GET'])
def get_all_standings():
    standings = match_service.get_all_standings()
    standings_data = [standing.serialize() for standing in standings]
    return jsonify({
        'code': 200,
        'message': '查询成功',
        'data': {
            'standings': standings_data
        }
    }), 200