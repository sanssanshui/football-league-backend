from flask import Blueprint, request, jsonify
from app.models.match_model import Match
from app.services import match_service

team_bp = Blueprint('team', __name__, url_prefix = '/teams')
match_bp = Blueprint('match', __name__, url_prefix = '/matches')
player_bp = Blueprint('player', __name__, url_prefix = '/players')
standing_bp = Blueprint('standing', __name__, url_prefix = '/standings')
    
@team_bp.route('', methods=['POST'])
def create_team():
    data = request.json
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
    try:
        new_team = match_service.create_team(
            name = data['name'],
            city = data['city'],
            logo_url = data.get('logo_url', None) # 没有数据就默认为None
        )
        return jsonify({'team_id': new_team.id}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@match_bp.route('', methods=['POST'])
def create_match():
    data = request.json
    if data is None:
        return jsonify({'error': 'No JSON data provided'}), 400
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
        return jsonify({'match_id': new_match.id}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@player_bp.route('', methods=['POST'])
def create_player():
    data = request.json
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
    try:
        new_player = match_service.create_player(
            name = data['name'],
            team_id = data['team_id'], 
            position = data['position'],
            jersey_number = data['jersey_number']
        )
        return jsonify({'player_id': new_player.id}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
@standing_bp.route('', methods=['POST'])
def create_standing():
    data = request.json
    if not data:
        return jsonify({'error': 'No JSON data provided'}), 400
    try:
        new_standing = match_service.create_standing(
            team_id = data['team_id'],
            wins = data.get('wins', 0),
            draws = data.get('draws', 0),
            losses = data.get('losses', 0),
            points = data.get('points', 0)  # 默认0分
        )
        return jsonify({'standing_id': new_standing.id}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@team_bp.route('/<int:team_id>', methods=['DELETE'])
def delete_team(team_id):
    try:
        match_service.delete_team(team_id)
        return '', 204  # 204表示成功删除
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@match_bp.route('/<int:match_id>', methods=['DELETE'])
def delete_match(match_id):
    try:
        match_service.delete_match(match_id)
        return '', 204  
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@player_bp.route('/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    try:
        match_service.delete_player(player_id)
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@standing_bp.route('/<int:standing_id>', methods=['DELETE'])
def delete_standing(standing_id):
    try:
        match_service.delete_standing(standing_id)
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 400