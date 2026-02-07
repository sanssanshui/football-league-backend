import time
import sys
from pathlib import Path

# 调整路径，确保能导入app模块
sys.path.append(str(Path(__file__).parent.parent))
from app import create_app, extensions
from app.utils.jwt_utils import create_token, verify_token

# 初始化应用
app = create_app(config_name="dev")

def test_redis_crud():
    print("\n======= [1/2] 开始测试 Redis 连接与 CRUD =======")
    redis_client = extensions.redis_client
    if not redis_client:
        print(" ❌ Redis客户端未初始化")
        return False

    # 测试Redis连接
    if not redis_client.ping():
        print(" ❌ Redis连接失败")
        return False
    print(" ✅ Redis连接测试成功")

    # CRUD操作
    key = "football_test_key"
    value = "Nanjing_Team_2026"
    redis_client.set(key, value, ex=30)
    print(f" ✅ [Create] 写入成功：{key} = {value}")

    # 读取并兼容bytes/str类型
    result = redis_client.get(key)
    result_str = result.decode("utf-8") if isinstance(result, bytes) else result
    if result_str == value:
        print(f" ✅ [Search] 读取成功：{key} = {result_str}")
    else:
        print(f" ❌ [Search] 读取失败")
        return False

    # 更新操作
    new_value = "Nanjing_Team_Updated_2026"
    redis_client.set(key, new_value, ex=30)
    updated_result = redis_client.get(key)
    updated_result_str = updated_result.decode("utf-8") if isinstance(updated_result, bytes) else updated_result
    if updated_result_str == new_value:
        print(f" ✅ [Update] 更新成功：{key} = {updated_result_str}")
    else:
        print(f" ❌ [Update] 更新失败")
        return False

    # 删除操作
    redis_client.delete(key)
    if not redis_client.get(key):
        print(f" ✅ [Delete] 删除成功：{key}")
    else:
        print(f" ❌ [Delete] 删除失败")
        return False
    return True

def test_socketio():
    print("\n======= [2/2] 开始测试 SocketIO 通信 =======")
    # 生成并验证Token
    token = create_token(10001)
    check = verify_token(token)
    print(f"DEBUG: Token 验证通过，user_id={check}")

    # 获取SocketIO实例
    socketio = extensions.socketio
    if not socketio:
        print(" ❌ SocketIO实例未初始化")
        return False

    # 创建测试客户端
    client = socketio.test_client(
        app,
        query_string=f"token={token}",
        headers={"Content-Type": "application/json"}
    )
    if not client.is_connected():
        print(" ❌ SocketIO连接失败")
        return False
    print(" ✅ SocketIO客户端连接成功")

    # 发送ping事件
    test_msg = {"msg": "Hello from test client", "timestamp": time.time()}
    client.emit('ping_event', test_msg)
    print(f" 📤 发送ping_event: {test_msg}")

    # 核心修复：移除timeout参数，手动实现5秒超时等待（适配低版本flask-socketio）
    received_data = None
    # 循环50次，每次等待0.1秒，总计5秒超时
    for _ in range(50):
        received_data = client.get_received()  # 这里彻底移除了timeout参数！
        if received_data:
            break
        time.sleep(0.1)

    # 检查是否收到pong响应
    if received_data:
        for msg in received_data:
            if msg['name'] == 'pong_event':
                print(f" 📥 收到pong_event: {msg['args'][0]}")
                print(" ✅ SocketIO通信测试成功")
                client.disconnect()
                return True
    print(" ❌ 未收到pong_event响应")
    client.disconnect()
    return False

if __name__ == "__main__":
    # 进入应用上下文执行测试
    with app.app_context():
        redis_ok = test_redis_crud()
        socketio_ok = test_socketio()
        # 输出最终测试结果
        if redis_ok and socketio_ok:
            print("\n======= ✅ 所有测试通过！Redis和SocketIO功能正常！ =======")
        else:
            print("\n======= ❌ 部分测试失败，请检查日志！ =======")