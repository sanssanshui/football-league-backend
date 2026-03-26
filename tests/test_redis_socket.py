import time
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from app import create_app
from app import extensions
from app.utils.jwt_utils import create_token,verify_token

app = create_app(config_name="dev")

def test_redis_crud():
    """测试Redis的基本CRUD操作"""
    print("\n======= [1/2] 开始测试 Redis 连接与 CRUD =======")

    redis_client = extensions.redis_client
    if redis_client is None:
        print(" Redis客户端未初始化，无法进行测试")
        return
    
    #1.Test Redis Connection
    try:
        is_connected = redis_client.ping()
        print(f" Redis连接测试成功，状态：{is_connected}")
    except Exception as e:
       print(f" Redis连接测试失败，错误：{str(e)}")
       return
    
    #2. Create 
    key = "football_test_key"
    value = "Nanjing_Team_2026"
    redis_client.set(key, value,ex=30)
    print(f" [Create] Redis写入数据成功，键：{key}，值：{value}")

    #3. Search
    result = redis_client.get(key)
    if result == value:
        print(f" [Search] Redis读取数据成功，键：{key}，值：{result}")
    else:
        print(f" [Search] Redis读取数据失败，预期值：{value}，实际值：{result}")    

    #4. Update - Redis set 同名key 即为更新
    new_value = "Nanjing_Team_Updated_2026"
    redis_client.set(key, new_value,ex=30)
    updated_result = redis_client.get(key)
    if updated_result == new_value:
        print(f" [Update] Redis更新数据成功，键：{key}，新值：{updated_result}")
    else:
        print(f" [Update] Redis更新数据失败，预期值：{new_value}，实际值：{updated_result}")
    #5. Delete
    redis_client.delete(key)
    deleted_result = redis_client.get(key)
    if deleted_result is None:
        print(f" [Delete] Redis删除数据成功，键：{key}")
    else:
        print(f" [Delete] Redis删除数据失败，键：{key}，值：{deleted_result}")

def test_socketio():
   """测试SocketIO的基本通信功能"""
   print("\n======= [2/2] 开始测试 SocketIO 通信 =======")

   token = create_token(user_id=10001)
   print(f"DEBUG: 测试脚本生成的 Token: {token}")
   check = verify_token(token)
   print(f"DEBUG: 验证生成的 Token，得到 user_id: {check}")
   socketio = extensions.socketio
   print(" 创建SocketIO测试客户端...")
   client = socketio.test_client(app,query_string=f"token={token}")
   
   # 1. Test Connection
   if client.is_connected():
        print(" SocketIO客户端连接成功")
   
   # 2. Push a ping event
   test_msg = {"msg":"Hello from test client","timestamp":time.time()}
   print(f" [Server] 发送ping_event事件，数据：{test_msg}")
   client.emit('ping_event', test_msg)

   # 3.Pull for pong_event response
   received_data = client.get_received()

   if received_data:
       for msg in received_data:
           if msg['name'] == 'pong_event':
               print(f" [Client] 收到pong_event事件，数据：{msg['args'][0]}")
               print(" SocketIO通信测试成功")
               return
             
   print(" SocketIO通信认证测试失败")

if __name__ == "__main__":
    
      with app.app_context():
        try:
            test_redis_crud()
            test_socketio()
            print("\n======= Redis与SocketIO测试全部通过！所有功能正常！ =======")
        except Exception as e:
            print(f"\n======= Redis与SocketIO测试失败，错误：{str(e)} =======")