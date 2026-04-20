import redis
import hashlib

API_SYNC_URL = "http://localhost:5002/api/news/sync"

# 连接第二个专用 Redis 数据库 (News 专属)
try:
    redis_news = redis.StrictRedis.from_url(
        "redis://default:AJw13arDqwq3SWdespz8VWIr1VWlxXlG@redis-16794.c334.asia-southeast2-1.gce.cloud.redislabs.com:16794",
        decode_responses=True
    )
    print("✅ [News Redis] 已成功挂载第二个新闻缓存库")
except Exception as e:
    print(f"❌ [News Redis] 连接失败: {e}")
    redis_news = None

def get_news_fingerprint(title, content):
    """生成新闻内容的唯一识别码"""
    return hashlib.md5(f"{title}_{content[:50]}".encode('utf-8')).hexdigest()

def run_news_aggregator():
    print("🚀 [News Engine] 探针正在云端扫描最新赛场资讯...")
    
    # 这里是经过筛选的高质量“实战级”模拟数据（后续可直接接入本地宝/懂球帝爬取节点）
    mock_news = [
        {"title": "苏超第13轮战报：南京城市 2-1 绝杀苏州东吴，重返争冠集团！", "content": "在一场大雨中的激战中，南京队由替补前场打入世界波，彻底引燃了主场球迷。"},
        {"title": "咪咕视频宣布：苏超本周 4 场核心战将提供高清直播信号", "content": "球迷可通过咪咕体育频道实时观看自己主队的身影，享受专业级解说。"},
        {"title": "裁判报告出炉：上轮徐州骁龙的点球判罚为百分之百误判", "content": "联赛纪律委员会表示由于助理裁判视线受阻，导致了这次极其关键的争议判罚。"},
        {"title": "南通支云主教练：我们的目标是 2026 赛季全胜夺冠", "content": "主教练在赛后发布会上表现出了极强的侵略性，并表示引援工作已全面铺开。"},
        {"title": "常州龙城老将遗憾宣布退役，曾为江苏球队征战十载", "content": "这位功勋后卫将在下周的告别赛中最后一次披挂上阵，全城球迷正筹备欢送仪式。"}
    ]
    
    payload = []
    skipped = 0
    for news in mock_news:
        fingerprint = get_news_fingerprint(news['title'], news['content'])
        
        # Redis 深度去重检查
        if redis_news and redis_news.exists(f"news:id:{fingerprint}"):
            skipped += 1
            continue
            
        payload.append(news)
        print(f"  > [聚合新动态] {news['title']}")
        
        # 记录指纹，防止重复推送
        if redis_news:
            redis_news.setex(f"news:id:{fingerprint}", 86400 * 7, "1") # 缓存 7 天

    if not payload:
        print(f"  💤 今日快讯网端暂无新动态 ({skipped} 条已存在)，等待 15s 后下一次扫描...")
        return

    try:
        res = requests.post(API_SYNC_URL, json=payload, timeout=5)
        if res.status_code in [200, 201]:
            print(f"✅ 成功实时同步 {res.json().get('added')} 条独家前线快讯！")
    except Exception as e:
        print(f"❌ 通信总线入库失败: {e}")

if __name__ == "__main__":
    run_news_aggregator()
