from flask import request, jsonify
from app.utils.jwt_utils import verify_token

def get_current_user():
    """Flask 版 Token 验证中间件"""
    auth_header = request.headers.get("Authorization")
    # 1. 检查 Header 格式
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({
            "code": 401,
            "message": "未提供有效Token"
        }), 401
    
    # 2. 提取 Token
    token = auth_header.split(" ")[1]
    # 3. 验证 Token
    user_id = verify_token(token)
    if not user_id:
        return jsonify({
            "code": 401,
            "message": "未登录或Token已过期/无效,请重新登录"
        }), 401
    
    return user_id