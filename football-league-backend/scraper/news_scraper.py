import asyncio
import redis
import hashlib
import requests
import json
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# URL for Su Chao News on Baidu Tiyu
NEWS_URL = "https://tiyu.baidu.com/al/match?match=%E6%B1%9F%E8%8B%8F%E5%9F%8E%E5%B8%82%E8%B6%B3%E7%90%83%E8%81%94%E8%B5%9B&tab=%E6%96%B0%E9%97%BB"
API_SYNC_URL = "http://localhost:5002/api/news/sync"

# 连接第二个专用 Redis 数据库 (News 专属)
try:
    redis_news = redis.StrictRedis.from_url(
        "redis://default:AJw13arDqwq3SWdespz8VWIr1VWlxXlG@redis-16794.c334.asia-southeast2-1.gce.cloud.redislabs.com:16794",
        decode_responses=True
    )
    print("✅ [News Redis] 已成功挂载新闻缓存库")
except Exception as e:
    print(f"❌ [News Redis] 连接失败: {e}")
    redis_news = None

def get_news_fingerprint(title, content):
    """生成新闻内容的唯一识别码"""
    return hashlib.md5(f"{title}_{content[:50]}".encode('utf-8')).hexdigest()

async def scrape_baidu_news():
    """从百度体育抓取苏超相关新闻"""
    print("🚀 [News Engine] 正在从百度体育同步最新赛场资讯...")
    
    news_list = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/04.1"
        )
        page = await context.new_page()
        
        try:
            await page.goto(NEWS_URL, wait_until="domcontentloaded", timeout=30000)
            await asyncio.sleep(2) # 等待渲染
            
            content = await page.content()
            soup = BeautifulSoup(content, "html.parser")
            
            # 百度体育移动端新闻列表使用以下三种主要类
            selectors = [
                ".wa-tiyu-news-no-img-item",
                ".wa-tiyu-news-single-item",
                ".wa-tiyu-news-multi-item"
            ]
            
            for selector in selectors:
                items = soup.select(selector)
                for item in items:
                    # 标题通常在 single/multi 的内层 div 或 no-img 的 p 中
                    title_elem = item.select_one(".title") or item.select_one("p")
                    if not title_elem: continue
                    
                    title = title_elem.get_text(strip=True)
                    
                    # 过滤逻辑：只需要关于 “苏超” 或 “江苏城市足球联赛” 的信息
                    if "苏超" not in title and "江苏" not in title:
                        continue
                    
                    link = item.get("href", "")
                    if link and not link.startswith("http"):
                        link = f"https://tiyu.baidu.com{link}"
                    
                    img_elem = item.select_one("img")
                    cover_url = img_elem["src"] if img_elem else ""
                    
                    desc_elem = item.select_one(".desc")
                    content_text = desc_elem.get_text(strip=True) if desc_elem else f"查看详情: {link}"
                    
                    news_list.append({
                        "title": title,
                        "content": content_text,
                        "cover_url": cover_url,
                        "source_url": link
                    })
                
        except Exception as e:
            print(f"❌ [Scrape Error] 抓取失败: {e}")
        finally:
            await browser.close()
            
    return news_list

async def run_news_aggregator():
    news_data = await scrape_baidu_news()
    
    if not news_data:
        print("💤 未发现苏超相关新动态")
        return

    payload = []
    skipped = 0
    for news in news_data:
        fingerprint = get_news_fingerprint(news['title'], news['content'])
        
        # Redis 深度去重检查
        if redis_news and redis_news.exists(f"news:id:{fingerprint}"):
            skipped += 1
            continue
            
        payload.append(news)
        print(f"  > [发现新动态] {news['title']}")
        
        # 记录指纹，防止重复推送
        if redis_news:
            redis_news.setex(f"news:id:{fingerprint}", 86400 * 7, "1") # 缓存 7 天

    if not payload:
        print(f"  💤 今日快讯暂无新变动 ({skipped} 条已存在)")
        return

    try:
        res = requests.post(API_SYNC_URL, json=payload, timeout=5)
        if res.status_code in [200, 201]:
            print(f"✅ 成功实时同步 {res.json().get('added', len(payload))} 条独家前线快讯！")
        else:
            print(f"⚠️ 同步返回状态码: {res.status_code}")
    except Exception as e:
        print(f"❌ 通信总线入库失败: {e}")

if __name__ == "__main__":
    asyncio.run(run_news_aggregator())

