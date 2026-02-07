import sys
from pathlib import Path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

import jwt
import time
from datetime import datetime, timedelta
from app.config import Config  # 修正：从app.config导入
from utils.jwt_utils import create_token, verify_token

def test_jwt():
    try:
        user_id = 1
        expire_hours = 0.001
        token = create_token(user_id, expire_hours)
        
        # 1. 验证生成的Token正常
        verify_id = verify_token(token)
        if user_id == verify_id:
            print("✅ 生成的Token正常")
        else:
            print("❌ 生成的Token验证失败")
        
        # 2. 过期后验证Token
        time.sleep(5)
        verify_id = verify_token(token)
        if verify_id is None:
            print("✅ Token过期验证成功（verify_id为None）")
        else:
            print("❌ Token过期验证失败")
        
        # 3. 验证无效Token
        verify_id = verify_token("abc.token.invalid")
        if verify_id is None:
            print("✅ 无效Token验证成功（verify_id为None）")
        else:
            print("❌ 无效Token验证失败")

    except Exception as e:
        print(f"❌ 测试失败：{str(e)}")

if __name__ == '__main__':
    test_jwt()