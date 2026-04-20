"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, User, Eye, Share2 } from "lucide-react";
import { motion } from "framer-motion";

interface NewsDetail {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  read_count: number;
  cover_url?: string;
  team?: { name: string };
}

export default function NewsPage() {
  const params = useParams();
  const router = useRouter();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        const res = await fetch(`http://localhost:5002/api/news`); // 暂时通过列表过滤，后续可增加单条查询接口
        const json = await res.json();
        if (json.code === 200 && json.data) {
          const item = json.data.find((n: any) => n.id === parseInt(params.newsId as string));
          setNews(item || null);
        }
      } catch (err) {
        console.error("Failed to load news detail", err);
      } finally {
        setLoading(false);
      }
    };

    if (params.newsId) fetchNewsDetail();
  }, [params.newsId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-800">未找到相关新闻</h1>
        <Link href="/" className="mt-4 text-emerald-600 hover:underline flex items-center">
          <ChevronLeft className="w-4 h-4" /> 返回首页
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* 导航 */}
      <nav className="w-full h-16 bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto h-full flex items-center px-4">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-emerald-600 flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-5 h-5" /> 返回
          </button>
        </div>
      </nav>

      {/* 内容区域 */}
      <motion.article 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto mt-10 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/*封面图 */}
        {news.cover_url && (
            <div className="w-full h-[400px] bg-cover bg-center" style={{ backgroundImage: `url(${news.cover_url})` }} />
        )}

        <div className="p-8 md:p-12">
          {/* 标签 */}
          {news.team && (
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full mb-6">
              # {news.team.name}
            </span>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-8">
            {news.title}
          </h1>

          {/* 元数据 */}
          <div className="flex flex-wrap items-center gap-6 text-gray-500 text-sm mb-10 pb-8 border-b border-gray-100">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(news.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              苏超官方资讯
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {news.read_count} 次阅读
            </div>
            <button className="ml-auto text-emerald-600 hover:bg-emerald-50 p-2 rounded-full transition-colors flex items-center gap-1">
              <Share2 className="w-4 h-4" /> 分享
            </button>
          </div>

          {/* 正文 */}
          <div className="prose prose-emerald lg:prose-xl max-w-none text-gray-700 leading-relaxed space-y-6">
            {news.content.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </motion.article>

      {/* 底栏推荐 */}
      <div className="max-w-4xl mx-auto mt-12 px-4">
        <h3 className="text-xl font-bold text-gray-800 mb-6">更多精彩推荐</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 这里可以放置基于个性化算法推荐的其他简报 */}
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-emerald-200 transition-all cursor-pointer">
                <div className="text-xs text-emerald-600 font-bold mb-2 uppercase tracking-wider">最新发布</div>
                <div className="text-gray-800 font-medium">苏超 2026 赛季赛程表正式出炉，揭幕战地点选定！</div>
            </div>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-emerald-200 transition-all cursor-pointer">
                <div className="text-xs text-amber-600 font-bold mb-2 uppercase tracking-wider">热门头条</div>
                <div className="text-gray-800 font-medium">专访南通支云核心：我们已经准备好迎接挑战</div>
            </div>
        </div>
      </div>
    </main>
  );
}
