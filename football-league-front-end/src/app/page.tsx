"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Search, User, LogIn, ChevronLeft, ChevronRight } from "lucide-react";

// --- 1. 类型定义 ---
type MatchStatus = "未开始" | "进行中" | "已结束";

interface Match {
  date: string;
  round: string;
  team1: string;
  team2: string;
  status: MatchStatus;
  score: string | null;
  timestamp: Date;
}

// --- 2. 常量数据 (移植自 HTML) ---

const carouselImages = [
  { url: '/images/pexels-markusspiske-114296.jpg', title: '苏超第13轮焦点战：南京城市 vs 苏州东吴' },
  { url: '/images/pexels-natsuko-aoyama-53087545-12256528.jpg', title: '全省各地青训热潮：苏超新星辈出' },
  { url: '/images/1.jpg', title: '主场氛围拉满：南通支云主场坐地三万球迷' },
  { url: '/images/2.jpg', title: '战术大讨论：本赛季苏超谁能最终封王？' }
];

const pageSize = 4;

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // --- 状态管理 ---
  // 轮播图
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  // 赛事筛选
  const [currentStatus, setCurrentStatus] = useState<MatchStatus>('未开始');
  const [currentPage, setCurrentPage] = useState(1);
  const [showingAll, setShowingAll] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [newsList, setNewsList] = useState<{id: number, title: string}[]>([]);

  useEffect(() => {
    setMounted(true);
    const currentHour = new Date().getHours();
    const userHasLocalPreference = localStorage.getItem("theme");
    if (!userHasLocalPreference || userHasLocalPreference === "system") {
      setTheme(currentHour >= 19 || currentHour < 6 ? "dark" : "light");
    }

    const fetchMatches = async () => {
      try {
        const res = await fetch('http://localhost:5002/api/matches');
        const json = await res.json();
        if (json.code === 200 && json.data) {
          const apiMatches = json.data.map((m: any) => {
             const d = new Date(m.timestamp);
             const displayDate = `${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
             return {
                date: displayDate,
                round: m.round,
                team1: m.homeTeam,
                team2: m.awayTeam,
                status: m.status as MatchStatus,
                score: m.score,
                timestamp: d
             };
          });
          setMatches(apiMatches);
        }
      } catch (err) {
        console.error("Failed to load matches", err);
      }
    };

    const fetchNews = async () => {
      try {
        // 模拟从本地存储获取登录用户的 ID (个性化推荐引擎入口)
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
        const userId = savedUser ? JSON.parse(savedUser).id : "";
        
        const res = await fetch(`http://localhost:5002/api/news?userId=${userId}`);
        const json = await res.json();
        if (json.code === 200 && json.data) {
           setNewsList(json.data);
        }
      } catch (err) {
        console.error("Failed to load news", err);
      }
    };

    fetchMatches();
    fetchNews();
  }, [setTheme]);

  // --- 交互逻辑 ---

  // 轮播图逻辑
  const handlePrevCarousel = () => {
    setCurrentImgIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };
  const handleNextCarousel = () => {
    setCurrentImgIndex((prev) => (prev + 1) % carouselImages.length);
  };

  // 赛事数据处理
  const sortByDate = (arr: Match[]) => arr.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const getPaginatedMatches = (status: MatchStatus, page: number) => {
    let filtered = matches.filter(m => m.status === status);
    filtered = sortByDate(filtered);
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filtered.slice(start, end);
    return { data: pageData, total, hasPrev: page > 1, hasNext: end < total };
  };

  const switchStatus = (status: MatchStatus) => {
    setCurrentStatus(status);
    setCurrentPage(1);
    setShowingAll(false);
  };

  const handlePrevPage = () => {
    if (showingAll) return;
    const { hasPrev } = getPaginatedMatches(currentStatus, currentPage);
    if (hasPrev) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (showingAll) return;
    const { hasNext } = getPaginatedMatches(currentStatus, currentPage);
    if (hasNext) setCurrentPage(prev => prev + 1);
  };

  const handleShowAll = () => {
    setShowingAll(true);
  };

  // 获取当前渲染的赛事
  let currentMatches: Match[] = [];
  let hasPrev = false;
  let hasNext = false;

  if (showingAll) {
    currentMatches = sortByDate([...matches]);
  } else {
    const result = getPaginatedMatches(currentStatus, currentPage);
    currentMatches = result.data;
    hasPrev = result.hasPrev;
    hasNext = result.hasNext;
  }

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen bg-white transition-colors duration-300 overflow-x-hidden">
      
      {/* ===== 复刻 HTML 导航栏 ===== */}
      <nav className="w-full h-[80px] bg-[#008000] sticky top-0 z-50 shadow-md">
        <div className="w-[1200px] h-full mx-auto flex items-center justify-between px-0">
          <div className="flex items-center gap-10 ml-5">
            <Link href="/" className="text-[24px] font-bold text-white border-b-2 border-white pb-1">
              首页
            </Link>
            <Link href="/matches" className="text-[20px] font-medium text-white hover:font-bold transition-all">
              赛事信息全览
            </Link>
            <Link href="/community" className="text-[20px] font-medium text-white hover:font-bold transition-all">
              互动
            </Link>
          </div>

          <div className="flex items-center gap-10 mr-5">
            <div className="w-[400px] h-[40px] bg-white rounded-lg flex items-center overflow-hidden">
              <input 
                type="text" 
                placeholder="搜索比赛、球队、球员..."
                className="w-full h-full border-none outline-none px-5 text-[16px] text-[#333] placeholder:text-[#aaa] font-light"
              />
              <Search className="w-5 h-5 text-gray-400 mr-4" />
            </div>
            <Link href="/auth" className="text-[20px] font-medium text-white hover:font-bold transition-all whitespace-nowrap flex items-center gap-1">
              <LogIn className="w-5 h-5" /> 登录
            </Link>
            <Link href="/profile" className="text-[20px] font-medium text-white hover:font-bold transition-all whitespace-nowrap flex items-center gap-1">
              <User className="w-5 h-5" /> 个人中心
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== 复刻 HTML Hero 区域 ===== */}
      <div className="w-[1200px] mx-auto mt-10 flex bg-[#0b0b0b]">
        {/* 轮播图 */}
        <Link 
          href={`/news/${newsList[currentImgIndex]?.id || '#'}`}
          className="relative w-[800px] h-[400px] overflow-hidden bg-cover bg-center group block"
          style={{ backgroundImage: `url('${carouselImages[currentImgIndex].url}')` }}
        >
          {/* 图片标题 */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent z-20">
            <h3 className="text-white text-2xl font-bold">{carouselImages[currentImgIndex].title}</h3>
          </div>
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-black/60 pointer-events-none z-10" />
          
          {/* 左箭头 */}
          <button 
            onClick={handlePrevCarousel}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-[#008000] cursor-pointer z-20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#008000] hover:text-white select-none"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          {/* 右箭头 */}
          <button 
            onClick={handleNextCarousel}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-[#008000] cursor-pointer z-20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#008000] hover:text-white select-none"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </Link>

        {/* 右侧新闻列表 */}
        <div className="w-[400px] bg-black/75 backdrop-blur-sm p-4 px-5 flex flex-col justify-center">
          <ul className="list-none space-y-0">
            {(newsList.length > 0 ? newsList : [
              { id: 1, title: "等待新闻聚合爬虫推送..." },
              { id: 2, title: "这里将展示最新真实的联赛前线战报" }
            ]).map((news) => (
              <li 
                key={news.id}
                className="text-white text-base leading-[2.2] border-b border-dashed border-white/20 hover:text-[#008000] hover:text-[20px] hover:font-semibold hover:underline hover:border-[#008000] transition-all cursor-pointer truncate whitespace-nowrap"
              >
                <Link href={`/news/${news.id}`}>{news.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ===== 复刻 HTML 赛事区域 ===== */}
      <div className="w-[1200px] mx-auto mt-[60px] mb-[50px]">
        <div className="flex justify-between items-baseline mb-6">
          <h2 className="text-xl font-semibold text-[#111]">赛事</h2>
          <button 
            onClick={handleShowAll}
            className="text-base text-[#666] hover:text-[#008000] hover:border-b border-[#008000] cursor-pointer transition-colors"
          >
            全部赛事 &gt;
          </button>
        </div>

        {/* Tab 按钮 */}
        <div className="flex gap-2 mb-7">
          <button
            onClick={() => switchStatus('未开始')}
            className={`px-5 py-2 rounded-full text-base font-medium cursor-pointer transition-colors ${
              currentStatus === '未开始' && !showingAll
                ? 'bg-[#008000] text-white font-semibold'
                : 'bg-[#f0f0f0] text-[#333] hover:bg-[#008000] hover:text-white'
            }`}
          >
            待开始
          </button>
          <button
            onClick={() => switchStatus('进行中')}
            className={`px-5 py-2 rounded-full text-base font-medium cursor-pointer transition-colors ${
              currentStatus === '进行中' && !showingAll
                ? 'bg-[#008000] text-white font-semibold'
                : 'bg-[#f0f0f0] text-[#333] hover:bg-[#008000] hover:text-white'
            }`}
          >
            进行中
          </button>
          <button
            onClick={() => switchStatus('已结束')}
            className={`px-5 py-2 rounded-full text-base font-medium cursor-pointer transition-colors ${
              currentStatus === '已结束' && !showingAll
                ? 'bg-[#008000] text-white font-semibold'
                : 'bg-[#f0f0f0] text-[#333] hover:bg-[#008000] hover:text-white'
            }`}
          >
            已结束
          </button>
        </div>

        {/* 卡片容器 */}
        <div className="relative w-full">
          {/* 左箭头 */}
          <button
            onClick={handlePrevPage}
            className={`absolute left-[-22px] top-1/2 -translate-y-1/2 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-[#008000] cursor-pointer z-20 transition-all border border-[#ddd] hover:bg-[#008000] hover:text-white ${
              showingAll || !hasPrev ? 'opacity-30 pointer-events-none bg-[#ccc] text-[#666]' : 'opacity-0 hover:opacity-100'
            }`}
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          {/* 卡片网格 */}
          <div className="grid grid-cols-4 gap-5 justify-center">
            {currentMatches.length === 0 ? (
              <div className="col-span-4 text-center py-10 text-[#888]">暂无赛事</div>
            ) : (
              currentMatches.map((m, index) => {
                // ========== 核心修复：明确声明string类型 ==========
                let statusText: string;
                if (m.status === '进行中') {
                  statusText = '⚡ 进行中';
                } else if (m.status === '已结束' && m.score) {
                  statusText = `已结束 ${m.score}`;
                } else {
                  statusText = m.status;
                }
                
                return (
                  <motion.div
                    key={`${m.team1}-${m.team2}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-[250px] h-[170px] bg-[#f9f9f9] border border-[#e0e0e0] p-4 px-5 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="text-xs text-[#6c6c6c] mb-3">{m.date} · {m.round}</div>
                    <div className="text-base font-semibold flex items-center justify-between mb-2">
                      <span className="truncate max-w-[90px]">{m.team1}</span>
                      <span className="font-normal text-[#888] mx-1">vs</span>
                      <span className="truncate max-w-[90px]">{m.team2}</span>
                    </div>
                    <div className={`text-sm font-medium ${m.status === '已结束' ? 'text-[#aaa]' : 'text-[#ff6700]'}`}>
                      {statusText}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* 右箭头 */}
          <button
            onClick={handleNextPage}
            className={`absolute right-[-22px] top-1/2 -translate-y-1/2 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center text-[#008000] cursor-pointer z-20 transition-all border border-[#ddd] hover:bg-[#008000] hover:text-white ${
              showingAll || !hasNext ? 'opacity-30 pointer-events-none bg-[#ccc] text-[#666]' : 'opacity-0 hover:opacity-100'
            }`}
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* 底部占位 */}
      <div className="h-[60px]"></div>
    </main>
  );
}