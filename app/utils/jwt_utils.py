# app/utils/jwt_utils.py

#在代码中动态添加上一级目录到模块搜索路径：
import sys
from pathlib import Path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

import jwt
from datetime import datetime, timedelta
from config import Config

def create_token(user_id: int, expire_hours: int = 24):
    """生成JWT Token:包含用户ID,设置过期时间"""
    payload = {
        "exp": datetime.utcnow() + timedelta(hours=expire_hours),
        "sub": str(user_id)
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
    return token

def verify_token(token: str) -> int or None:
    """验证Token:有效返回用户ID,无效返回None"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
        return user_id
    except jwt.ExpiredSignatureError:
        print("JWT Token已过期")
        return None
    except jwt.InvalidTokenError:
        print("JWT Token无效")
        return None