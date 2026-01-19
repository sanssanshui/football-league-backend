# app/routes/user.py

#在代码中动态添加上一级目录到模块搜索路径：
import sys
from pathlib import Path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models import get_db
from utils.jwt_utils import create_token

# 模拟验证函数(后续由后端A实现真实逻辑)
def verify_login(db: Session, user_name: str, password: str) -> int or None:
    if user_name == "test_user" and password == "e10adc3949ba59abbe56e057f20f883e":
        return 10001
    return None

router = APIRouter(prefix="/api/user", tags=["用户模块"])

class LoginRequest(BaseModel):
    userName: str
    password: str

@router.post("/login")
def user_login(request: LoginRequest, db: Session = Depends(get_db)):
    """用户登录接口:验证用户名密码,返回Token"""
    user_id = verify_login(db, request.userName, request.password)
    if not user_id:
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    token = create_token(user_id)
    return {
        "code": 200,
        "message": "登录成功",
        "data": {
            "token": token,
            "userId": user_id,
            "expireSeconds": 24 * 3600
        }
    }