# app/utils/auth_middleware.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt_utils import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/login")

def get_current_user(token: str = Depends(oauth2_scheme)) -> int:
    """依赖函数:验证Token,返回当前登录用户ID"""
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或Token已过期/无效,请重新登录",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id