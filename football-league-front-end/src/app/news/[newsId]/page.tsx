"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, User, Eye, Share2, Search, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useUserStore } from "@/lib/store";

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
  const { username } = useUserStore();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        const res = await fetch(`http://localhost:5002/api/news/${params.newsId}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
          setNews(json.data);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0a0a0a] to-[#111]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ff00]" />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-[#0a0a0a] to-[#111]">
        <h1 className="text-2xl font-bold text-white">未找到相关新闻</h1>
        <Link href="/" className="mt-4 text-[#00ff00] hover:underline flex items-center">
          <ChevronLeft className="w-4 h-4" /> 返回首页
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] pb-20 text-white">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] text-white/75 hover:text-white transition-all">首页</Link>
            <Link href="/matches" className="text-[17px] text-white/75 hover:text-white transition-all">赛事</Link>
            <Link href="/teams" className="text-[17px] text-white/75 hover:text-white transition-all">球员/球队</Link>
            <Link href="/community?tab=quiz" className="text-[17px] text-white/75 hover:text-white transition-all">互动</Link>
            <Link href="/shop" className="text-[17px] text-white/75 hover:text-white transition-all">周边商城</Link>
            <Link href="/analysis/upload" className="text-[17px] text-white/75 hover:text-white transition-all">视频分析</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[280px] h-[36px] bg-white/10 rounded-full flex items-center border border-white/20 overflow-hidden">
              <input type="text" placeholder="搜索比赛、球队、球员..." className="w-full h-full bg-transparent outline-none px-4 text-[13px] text-white placeholder:text-white/40" />
              <Search className="w-4 h-4 text-white/40 mr-3 shrink-0" />
            </div>
            <Link href="/auth" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
              <LogIn className="w-4 h-4" /> 登录
            </Link>
            <Link href="/profile" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
              <User className="w-4 h-4" /> {username || "个人中心"}
            </Link>
          </div>
        </div>
      </nav>

      {/* 内容区域 */}
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto mt-10 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
      >
        {news.cover_url && (
          <div className="w-full h-[400px] bg-cover bg-center" style={{ backgroundImage: `url(${news.cover_url})` }} />
        )}

        <div className="p-8 md:p-12">
          {news.team && (
            <span className="inline-block px-3 py-1 bg-[#008000]/20 text-[#00ff00] text-sm font-medium rounded-full border border-[#008000]/40 mb-6">
              # {news.team.name}
            </span>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-8">
            {news.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-white/40 text-sm mb-10 pb-8 border-b border-white/10">
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
            <button className="ml-auto text-[#00ff00]/70 hover:text-[#00ff00] p-2 rounded-full transition-colors flex items-center gap-1">
              <Share2 className="w-4 h-4" /> 分享
            </button>
          </div>

          <div className="text-white/80 leading-relaxed space-y-6 text-[17px]">
            {news.content.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </motion.article>

      {/* 底栏推荐 */}
      <div className="max-w-4xl mx-auto mt-12 px-4">
        <h3 className="text-xl font-bold text-white mb-6">更多精彩推荐</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 hover:border-[#008000]/50 transition-all cursor-pointer">
            <div className="text-xs text-[#00ff00] font-bold mb-2 uppercase tracking-wider">最新发布</div>
            <div className="text-white/80 font-medium">苏超 2026 赛季赛程表正式出炉，揭幕战地点选定！</div>
          </div>
          <div className="p-4 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 hover:border-[#008000]/50 transition-all cursor-pointer">
            <div className="text-xs text-amber-400 font-bold mb-2 uppercase tracking-wider">热门头条</div>
            <div className="text-white/80 font-medium">专访南通支云核心：我们已经准备好迎接挑战</div>
          </div>
        </div>
      </div>
    </main>
  );
}
