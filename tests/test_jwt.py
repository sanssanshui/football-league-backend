import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
import jwt
import time
from datetime import datetime, timedelta
from app.config import Config
from app.utils.jwt_utils import create_token, verify_token

def test_jwt():
    try:
        user_id = 1
        expire_hours = 0.001
        token = create_token(user_id, expire_hours)
        #确认生成的Token正常
        verify_id = verify_token(token)
        if user_id == verify_id:
            print("生成的Token正常")
        #过期后验证过期的Token
        time.sleep(5)
        verify_id = verify_token(token)
        if verify_id == None:
            print("verify_id为None")
        #验证无效Token
        verify_id = verify_token("abc.token.invalid")
        if verify_id == None:
            print("verify_id为None")
    except jwt.ExpiredSignatureError:
        print("JWT Token已过期")
    except jwt.InvalidTokenError:
        print("JWT Token无效")
    except Exception as e:
        print(e)

if __name__ == '__main__':
    test_jwt()