# app/routes/user.py

#在代码中动态添加上一级目录到模块搜索路径：
import sys
from pathlib import Path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))
from models import get_db
from flask import Blueprint,request,jsonify
from sqlalchemy.orm import Session
from typing import Optional
from utils.jwt_utils import create_token

def verify_login(db: Session, user_name: str, password: str) -> Optional[int]:
    if user_name == "test_user" and password == "e10adc3949ba59abbe56e057f20f883e":
        return 10001
    return None

user_bp = Blueprint("user", __name__, url_prefix="/api/user")

@user_bp.route("/login", methods=["POST"])

def user_login():
    """用户登录接口:验证用户名密码,返回Token"""
    data = request.get_json()
    user_name = data.get("userName")
    password = data.get("password")
    user_id = verify_login(None, user_name, password)
    if not user_id:
        return jsonify({"code": 401, "message": "用户名或密码错误"}), 401
    token = create_token(user_id)
    return jsonify({
        "code": 200,
        "message": "登录成功",
        "data": {
            "token": token,
            "userId": user_id,
            "expireSeconds": 24 * 3600
        }
    })
