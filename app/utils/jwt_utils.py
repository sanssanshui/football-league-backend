# app/utils/jwt_utils.py
import sys
from pathlib import Path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

import jwt
from datetime import datetime, timedelta
from app.config import Config  # 修正：从app.config导入
from typing import Optional

def create_token(user_id: int, expire_hours: int = 24):
    """生成JWT Token:包含用户ID,设置过期时间"""
    payload = {
        "exp": datetime.utcnow() + timedelta(hours=expire_hours),
        "sub": str(user_id)
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
    return token

def verify_token(token: str) -> Optional[int]:
    """验证Token:有效返回用户ID,无效返回None"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
        return user_id
    except jwt.ExpiredSignatureError:
        # 移除print，仅返回None
        return None
    except jwt.InvalidTokenError:
        # 移除print，仅返回None
        return None