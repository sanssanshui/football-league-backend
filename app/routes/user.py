import sys
from pathlib import Path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from typing import Optional
from app.models import get_db  # 数据库会话依赖
from app.services.user_service import user_service  # 业务逻辑服务
from app.utils.auth_middleware import get_current_user  # 认证中间件
from app.utils.jwt_utils import create_token

# 创建蓝图（接口前缀：/api/user）
user_bp = Blueprint("user", __name__, url_prefix="/api/user")

@user_bp.route("/register", methods=["POST"])
def user_register():
    """
    用户注册接口
    请求体：{username: str, password: str, phone: optional[str]}
    响应：{code: int, message: str, data: optional[dict]}
    """
    db: Session = next(get_db())
    data = request.get_json()
    
    # 校验必填参数
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"code": 400, "message": "用户名和密码不能为空"}), 400
    
    try:
        # 调用业务逻辑
        result = user_service.register_user(db, username, password, data.get("phone"))
        return jsonify({
            "code": 200,
            "message": "注册成功",
            "data": result
        })
    except ValueError as e:
        return jsonify({"code": 400, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"code": 500, "message": f"注册失败：{str(e)}"}), 500

@user_bp.route("/login", methods=["POST"])
def user_login():
    """
    用户登录接口:验证用户名密码,返回Token
    请求体：{username: str, password: str}
    响应：{code: int, message: str, data: optional[dict]}
    """
    db: Session = next(get_db())
    data = request.get_json()
    user_name = data.get("username")
    password = data.get("password")
    
    if not user_name or not password:
        return jsonify({"code": 400, "message": "用户名和密码不能为空"}), 400
    
    # 调用业务逻辑
    result = user_service.login_user(db, user_name, password)
    if not result:
        return jsonify({"code": 401, "message": "用户名或密码错误"}), 401
    
    return jsonify({
        "code": 200,
        "message": "登录成功",
        "data": result
    })

@user_bp.route("/info", methods=["GET"])
def get_user_info():
    """
    查询个人信息接口（需登录）
    请求头：Authorization: Bearer {token}
    响应：{code: int, message: str, data: optional[dict]}
    """
    try:
        # 验证Token，获取当前登录用户ID
        user_id: int = get_current_user()
        db: Session = next(get_db())
        
        # 调用业务逻辑
        user_info = user_service.get_user_info(db, user_id)
        if not user_info:
            return jsonify({"code": 404, "message": "用户不存在"}), 404
        
        return jsonify({
            "code": 200,
            "message": "查询成功",
            "data": user_info
        })
    except Exception as e:
        return jsonify({"code": 401, "message": str(e)}), 401

@user_bp.route("/info", methods=["PUT"])
def update_user_info():
    """
    修改个人信息接口（需登录）
    请求头：Authorization: Bearer {token}
    请求体：{avatar_url: optional[str], focus_team_id: optional[int], is_add: optional[bool]}
    响应：{code: int, message: str, data: optional[dict]}
    """
    try:
        user_id: int = get_current_user()
        db: Session = next(get_db())
        update_data = request.get_json()
        
        # 调用业务逻辑
        updated_info = user_service.update_user_info(db, user_id, update_data)
        if not updated_info:
            return jsonify({"code": 404, "message": "用户不存在"}), 404
        
        return jsonify({
            "code": 200,
            "message": "更新成功",
            "data": updated_info
        })
    except Exception as e:
        return jsonify({"code": 400, "message": str(e)}), 400

@user_bp.route("/collect", methods=["POST"])
def collect_match():
    """
    收藏赛事接口（需登录）
    请求头：Authorization: Bearer {token}
    请求体：{match_id: int}
    响应：{code: int, message: str, data: optional[dict]}
    """
    try:
        user_id: int = get_current_user()
        db: Session = next(get_db())
        data = request.get_json()
        match_id = data.get("match_id")
        
        if not match_id or not isinstance(match_id, int):
            return jsonify({"code": 400, "message": "请提供有效的赛事ID"}), 400
        
        # 调用业务逻辑
        result = user_service.collect_match(db, user_id, match_id)
        return jsonify({
            "code": 200,
            "message": result["message"],
            "data": result
        })
    except ValueError as e:
        return jsonify({"code": 400, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"code": 500, "message": f"收藏失败：{str(e)}"}), 500

@user_bp.route("/collect", methods=["DELETE"])
def cancel_collect():
    """
    取消收藏接口（需登录）
    请求头：Authorization: Bearer {token}
    请求参数：?collection_id=int 或 ?match_id=int
    响应：{code: int, message: str, data: optional[dict]}
    """
    try:
        user_id: int = get_current_user()
        db: Session = next(get_db())
        
        # 获取请求参数
        collection_id = request.args.get("collection_id", type=int)
        match_id = request.args.get("match_id", type=int)
        
        # 调用业务逻辑
        result = user_service.cancel_collect(db, user_id, collection_id, match_id)
        return jsonify({
            "code": 200,
            "message": result["message"],
            "data": result
        })
    except ValueError as e:
        return jsonify({"code": 400, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"code": 500, "message": f"取消收藏失败：{str(e)}"}), 500

@user_bp.route("/collect/list", methods=["GET"])
def get_collect_list():
    """
    查询收藏列表接口（需登录）
    请求头：Authorization: Bearer {token}
    请求参数：?page=int&page_size=int
    响应：{code: int, message: str, data: optional[dict]}
    """
    try:
        user_id: int = get_current_user()
        db: Session = next(get_db())
        
        # 获取分页参数（默认第1页，每页10条）
        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 10, type=int)
        page = max(page, 1)
        page_size = min(page_size, 50)  # 限制最大每页条数
        
        # 调用业务逻辑
        result = user_service.get_collect_list(db, user_id, page, page_size)
        return jsonify({
            "code": 200,
            "message": "查询成功",
            "data": result
        })
    except Exception as e:
        return jsonify({"code": 500, "message": f"查询失败：{str(e)}"}), 500