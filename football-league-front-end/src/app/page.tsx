"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Search, User, LogIn, ChevronLeft, ChevronRight, Trophy, Swords, BarChart3, Dumbbell } from "lucide-react";
import { useUserStore } from "@/lib/store";

interface NormalizedMatch {
  id: string; round: string; homeTeam: string; awayTeam: string;
  homeColor: string; awayColor: string; homeShort: string; awayShort: string;
  status: string; score: string | null; datetime: string; location: string;
}
interface StandingRow { rank: number; team: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number; }

const TEAM_COLORS: Record<string, string> = {
  '南京城市': '#0066b3', '苏州东吴': '#c91a1a', '无锡吴钩': '#f7b731',
  '南通支云': '#a50044', '徐州骁龙': '#8a2be2', '常州龙城': '#ff8c00',
  '连云港海港': '#20b2aa', '淮安楚州': '#d2691e', '盐城大丰': '#4682b4',
  '扬州瘦西湖': '#9acd32', '镇江金山': '#5f9ea0', '泰州远大': '#ff4500', '宿迁项王': '#2e8b57',
};
const TEAM_SHORTS: Record<string, string> = {
  '南京城市': '南京', '苏州东吴': '苏州', '无锡吴钩': '无锡', '南通支云': '南通',
  '徐州骁龙': '徐州', '常州龙城': '常州', '连云港海港': '连港', '淮安楚州': '淮安',
  '盐城大丰': '盐城', '扬州瘦西湖': '扬州', '镇江金山': '镇江', '泰州远大': '泰州', '宿迁项王': '宿迁',
};
const getColor = (n: string) => { for (const [k, v] of Object.entries(TEAM_COLORS)) if (n.includes(k)) return v; return '#666'; };
const getShort = (n: string) => { for (const [k, v] of Object.entries(TEAM_SHORTS)) if (n.includes(k)) return v; return n.slice(0, 2); };
const normStatus = (s: string) => (s === '未开始' || s === '待开始') ? '待开始' : (s === '已结束' || s === '已完结') ? '已完结' : s;

const MOCK_MATCHES: NormalizedMatch[] = [
  { id:'m1', round:'第1轮', homeTeam:'苏州东吴',   awayTeam:'无锡吴钩',   homeColor:'#c91a1a', awayColor:'#f7b731', homeShort:'苏州', awayShort:'无锡', status:'已完结', score:'0:0', datetime:'2026年3月5日',  location:'苏州奥体中心' },
  { id:'m2', round:'第2轮', homeTeam:'南京城市',   awayTeam:'苏州东吴',   homeColor:'#0066b3', awayColor:'#c91a1a', homeShort:'南京', awayShort:'苏州', status:'已完结', score:'2:1', datetime:'2026年3月10日', location:'南京奥体中心' },
  { id:'m3', round:'第3轮', homeTeam:'无锡吴钩',   awayTeam:'南通支云',   homeColor:'#f7b731', awayColor:'#a50044', homeShort:'无锡', awayShort:'南通', status:'待开始', score:null,  datetime:'2026年3月15日', location:'无锡体育中心' },
  { id:'m4', round:'第4轮', homeTeam:'徐州骁龙',   awayTeam:'常州龙城',   homeColor:'#8a2be2', awayColor:'#ff8c00', homeShort:'徐州', awayShort:'常州', status:'待开始', score:null,  datetime:'2026年3月20日', location:'徐州奥体中心' },
  { id:'m5', round:'第5轮', homeTeam:'连云港海港', awayTeam:'淮安楚州',   homeColor:'#20b2aa', awayColor:'#d2691e', homeShort:'连港', awayShort:'淮安', status:'待开始', score:null,  datetime:'2026年3月25日', location:'连云港体育场' },
  { id:'m6', round:'第6轮', homeTeam:'盐城大丰',   awayTeam:'扬州瘦西湖', homeColor:'#4682b4', awayColor:'#9acd32', homeShort:'盐城', awayShort:'扬州', status:'待开始', score:null,  datetime:'2026年4月1日',  location:'盐城体育场' },
];
const MOCK_STANDINGS: StandingRow[] = [
  { rank:1, team:'南京城市', played:8, won:6, drawn:1, lost:1, gf:18, ga:7,  points:19 },
  { rank:2, team:'苏州东吴', played:8, won:5, drawn:2, lost:1, gf:15, ga:8,  points:17 },
  { rank:3, team:'无锡吴钩', played:8, won:5, drawn:1, lost:2, gf:14, ga:9,  points:16 },
  { rank:4, team:'南通支云', played:8, won:4, drawn:2, lost:2, gf:12, ga:10, points:14 },
  { rank:5, team:'徐州骁龙', played:8, won:3, drawn:3, lost:2, gf:10, ga:9,  points:12 },
];
const CAROUSEL = [
  { url:'/images/pexels-markusspiske-114296.jpg',           title:'苏超第13轮焦点战：南京城市 vs 苏州东吴' },
  { url:'/images/pexels-natsuko-aoyama-53087545-12256528.jpg', title:'全省各地青训热潮：苏超新星辈出' },
  { url:'/images/1.jpg', title:'主场氛围拉满：南通支云主场坐地三万球迷' },
  { url:'/images/2.jpg', title:'战术大讨论：本赛季苏超谁能最终封王？' },
];

const CARDS = [
  { id: 0, label: '赛事模块', icon: Swords,   color: '#0066b3' },
  { id: 1, label: '赛事竞猜', icon: Trophy,   color: '#008000' },
  { id: 2, label: '积分榜',   icon: BarChart3, color: '#8a2be2' },
  { id: 3, label: '模拟赛场', icon: Dumbbell,  color: '#c91a1a' },
];

function getCardTransform(offset: number) {
  const abs = Math.abs(offset);
  if (abs === 0) return { rotateY: 0,   x: 0,    z: 0,    scale: 1,    opacity: 1,    zIndex: 10 };
  if (abs === 1) return { rotateY: offset < 0 ? 42 : -42, x: offset * 340, z: -180, scale: 0.82, opacity: 0.65, zIndex: 5 };
  return              { rotateY: offset < 0 ? 60 : -60, x: offset * 480, z: -380, scale: 0.65, opacity: 0.3,  zIndex: 1 };
}

const rankColor = (r: number) => r === 1 ? 'text-yellow-400' : r === 2 ? 'text-slate-300' : r === 3 ? 'text-amber-600' : 'text-white/50';

export default function Home() {
  const router = useRouter();
  const { username } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [activeStatus, setActiveStatus] = useState('待开始');
  const [page, setPage] = useState(1);
  const [matches, setMatches] = useState<NormalizedMatch[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [newsList, setNewsList] = useState<{ id: number; title: string }[]>([]);
  const [activeCard, setActiveCard] = useState(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgX = useTransform(mouseX, [-1, 1], [-15, 15]);
  const bgY = useTransform(mouseY, [-1, 1], [-15, 15]);

  const onMouseMove = (e: React.MouseEvent) => {
    mouseX.set((e.clientX / window.innerWidth - 0.5) * 2);
    mouseY.set((e.clientY / window.innerHeight - 0.5) * 2);
  };

  const prev = useCallback(() => setActiveCard(c => (c - 1 + CARDS.length) % CARDS.length), []);
  const next = useCallback(() => setActiveCard(c => (c + 1) % CARDS.length), []);

  useEffect(() => {
    setMounted(true);
    const fetchMatches = async () => {
      try {
        const res = await fetch('http://localhost:5002/api/matches');
        const json = await res.json();
        if (json.code === 200 && json.data?.length > 0) {
          setMatches(json.data.map((m: any, i: number) => {
            const d = new Date(m.timestamp);
            return {
              id: m.id || String(i), round: m.round,
              homeTeam: m.homeTeam, awayTeam: m.awayTeam,
              homeColor: m.homeLogoColor || getColor(m.homeTeam),
              awayColor: m.awayLogoColor || getColor(m.awayTeam),
              homeShort: getShort(m.homeTeam), awayShort: getShort(m.awayTeam),
              status: normStatus(m.status), score: m.score,
              datetime: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`,
              location: m.location || '',
            };
          }));
        }
      } catch { /* use mock */ }
    };
    const fetchStandings = async () => {
      try {
        const res = await fetch('http://localhost:5002/api/matches/standings/2026');
        const json = await res.json();
        if (json.code === 200 && json.data?.length > 0) {
          setStandings(json.data.slice(0, 5).map((r: any, i: number) => ({
            rank: r.rank ?? r.position ?? i + 1,
            team: r.team ?? r.team_name ?? r.teamName ?? r.name ?? '',
            played: r.played ?? r.games_played ?? 0,
            won: r.won ?? r.wins ?? 0,
            drawn: r.drawn ?? r.draws ?? 0,
            lost: r.lost ?? r.losses ?? 0,
            gf: r.gf ?? r.goals_for ?? 0,
            ga: r.ga ?? r.goals_against ?? 0,
            points: r.points ?? 0,
          })));
        }
      } catch { /* use mock */ }
    };
    const fetchNews = async () => {
      try {
        const res = await fetch('http://localhost:5002/api/news');
        const json = await res.json();
        if (json.code === 200 && json.data?.length > 0) setNewsList(json.data);
      } catch { /* use mock */ }
    };
    fetchMatches(); fetchStandings(); fetchNews();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setImgIdx(p => (p + 1) % CAROUSEL.length), 5000);
    return () => clearInterval(t);
  }, []);

  const allMatches = matches.length > 0 ? matches : MOCK_MATCHES;
  const allStandings = standings.length > 0 ? standings : MOCK_STANDINGS;
  const filtered = allMatches.filter(m => m.status === activeStatus);
  const paged = filtered.slice((page - 1) * 4, page * 4);
  const totalPages = Math.ceil(filtered.length / 4);
  const switchStatus = (s: string) => { setActiveStatus(s); setPage(1); };

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans" onMouseMove={onMouseMove}>
      {/* Parallax background */}
      <motion.div
        className="fixed inset-[-30px] z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')", x: bgX, y: bgY }}
      />
      <div className="fixed inset-0 bg-black/60 z-0 pointer-events-none" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[22px] font-bold text-white border-b-2 border-[#00ff00] pb-0.5">首页</Link>
            <Link href="/matches" className="text-[17px] text-white/75 hover:text-white transition-all">赛事信息全览</Link>
            <Link href="/community?tab=quiz" className="text-[17px] text-white/75 hover:text-white transition-all">互动</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[300px] h-[36px] bg-white/10 rounded-full flex items-center border border-white/20 overflow-hidden">
              <input type="text" placeholder="搜索比赛、球队、球员..."
                className="w-full h-full bg-transparent outline-none px-4 text-[13px] text-white placeholder:text-white/40" />
              <Search className="w-4 h-4 text-white/40 mr-3 shrink-0" />
            </div>
            <Link href="/auth" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
              <LogIn className="w-4 h-4" /> 登录
            </Link>
            <Link href="/profile" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
              <User className="w-4 h-4" /> {username || '个人中心'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 w-[1200px] mx-auto px-4 py-10 space-y-10">
        {/* Hero: Carousel + News */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex gap-6 h-[400px]">
          {/* Carousel */}
          <div className="relative flex-1 rounded-[24px] overflow-hidden group">
            <div className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={{ backgroundImage: `url('${CAROUSEL[imgIdx].url}')` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
              <div className="text-xs text-[#00ff00] font-medium mb-2 tracking-widest uppercase">苏超联赛 · 焦点战报</div>
              <h3 className="text-white text-2xl font-bold">{CAROUSEL[imgIdx].title}</h3>
            </div>
            <button onClick={() => setImgIdx(p => (p - 1 + CAROUSEL.length) % CAROUSEL.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-[#008000] backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all z-10">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setImgIdx(p => (p + 1) % CAROUSEL.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-[#008000] backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all z-10">
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 right-6 flex gap-1.5 z-10">
              {CAROUSEL.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === imgIdx ? 'bg-[#00ff00] w-5' : 'bg-white/40 w-2'}`} />
              ))}
            </div>
          </div>
          {/* News */}
          <div className="w-[340px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[24px] p-6 flex flex-col">
            <div className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-[#008000] rounded-full inline-block" /> 最新战报
            </div>
            <ul className="space-y-0 flex-1 overflow-hidden">
              {(newsList.length > 0 ? newsList : [
                { id: 1, title: '南京城市2-1力克苏州东吴，积分榜领跑' },
                { id: 2, title: '苏超第3轮：无锡吴钩主场迎战南通支云' },
                { id: 3, title: '徐州骁龙引援消息：郑智执教首季备战' },
                { id: 4, title: '苏超联赛积分榜：南京城市暂居榜首' },
                { id: 5, title: '连云港海港主场首胜，球迷热情高涨' },
                { id: 6, title: '苏超青训计划：13支球队共育新星' },
              ]).map(n => (
                <li key={n.id} className="border-b border-white/5 last:border-0">
                  <Link href={`/news/${n.id}`}
                    className="block py-2.5 text-sm text-white/70 hover:text-[#00ff00] transition-colors truncate">
                    {n.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Cover Flow Carousel */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex flex-col items-center">
          <div className="relative w-full h-[520px] flex items-center justify-center" style={{ perspective: '1200px' }}>
            {CARDS.map((card, i) => {
              const offset = i - activeCard;
              const t = getCardTransform(offset);
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.id}
                  animate={{ rotateY: t.rotateY, x: t.x, z: t.z, scale: t.scale, opacity: t.opacity }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  style={{ zIndex: t.zIndex, transformStyle: 'preserve-3d', position: 'absolute' }}
                  onClick={() => offset !== 0 && setActiveCard(i)}
                  className={`w-[560px] bg-black/50 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden ${offset !== 0 ? 'cursor-pointer' : ''}`}
                >
                  {/* Card header */}
                  <div className="px-8 pt-8 pb-4 flex items-center gap-3 border-b border-white/10">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: card.color + '33', border: `1px solid ${card.color}66` }}>
                      <Icon className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <h2 className="text-xl font-bold text-white">{card.label}</h2>
                  </div>

                  {/* Card body */}
                  <div className="px-8 py-6 h-[380px] overflow-hidden">
                    {card.id === 0 && (
                      <MatchesCardBody
                        paged={paged} activeStatus={activeStatus} switchStatus={switchStatus}
                        page={page} totalPages={totalPages} setPage={setPage}
                      />
                    )}
                    {card.id === 1 && <GuessCardBody router={router} />}
                    {card.id === 2 && <StandingsCardBody allStandings={allStandings} />}
                    {card.id === 3 && <SimCardBody router={router} />}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Navigation capsule */}
          <div className="flex items-center gap-4 mt-6 px-6 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full">
            <button onClick={prev}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {CARDS.map((c, i) => (
                <button key={c.id} onClick={() => setActiveCard(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === activeCard ? 'w-6 bg-[#00ff00]' : 'w-2 bg-white/30'}`} />
              ))}
            </div>
            <button onClick={next}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card label */}
          <p className="mt-3 text-white/40 text-sm tracking-widest">{CARDS[activeCard].label}</p>
        </motion.div>
      </div>
    </div>
  );
}

function MatchesCardBody({ paged, activeStatus, switchStatus, page, totalPages, setPage }: {
  paged: NormalizedMatch[]; activeStatus: string;
  switchStatus: (s: string) => void; page: number; totalPages: number; setPage: (fn: (p: number) => number) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-4">
        {['待开始', '进行中', '已完结'].map(s => (
          <button key={s} onClick={() => switchStatus(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeStatus === s
                ? 'bg-[#0066b3]/80 text-white border border-[#0066b3] shadow-[0_0_12px_rgba(0,102,179,0.4)]'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
            }`}>
            {s}
          </button>
        ))}
        <Link href="/matches" className="ml-auto text-xs text-white/40 hover:text-[#00ff00] transition-colors self-center">全部 →</Link>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        {paged.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-sm">暂无{activeStatus}赛事</div>
        ) : paged.map(m => (
          <div key={m.id} className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 hover:bg-white/10 transition-all">
            <span className="text-xs text-white/30 w-14 shrink-0">{m.round}</span>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <span className="text-sm text-white/80 font-medium">{m.homeTeam}</span>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: m.homeColor }}>
                {m.homeShort}
              </div>
            </div>
            <div className="mx-3 text-center w-12 shrink-0">
              {m.score ? <span className="text-base font-black text-white">{m.score}</span>
                : <span className="text-white/30 text-xs">vs</span>}
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: m.awayColor }}>
                {m.awayShort}
              </div>
              <span className="text-sm text-white/80 font-medium">{m.awayTeam}</span>
            </div>
            <span className={`text-xs w-14 text-right shrink-0 ${m.status === '进行中' ? 'text-[#00ff00]' : m.status === '已完结' ? 'text-white/30' : 'text-orange-400'}`}>
              {m.status === '进行中' ? '⚡进行中' : m.status}
            </span>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 disabled:opacity-30 transition-all">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-white/40 text-xs">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/15 disabled:opacity-30 transition-all">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function GuessCardBody({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="w-20 h-20 rounded-full bg-[#008000]/20 border border-[#008000]/40 flex items-center justify-center">
        <Trophy className="w-10 h-10 text-[#00ff00]" />
      </div>
      <div className="text-center">
        <h3 className="text-white text-xl font-bold mb-2">预测比赛结果</h3>
        <p className="text-white/50 text-sm">每次消耗 10 积分 · 猜中获得 20 积分</p>
        <p className="text-white/30 text-xs mt-1">2025赛季 · 78场比赛等你竞猜</p>
      </div>
      <button onClick={() => router.push('/community?tab=quiz')}
        className="px-10 py-3 bg-gradient-to-r from-[#008000] to-[#00b300] text-white font-semibold rounded-xl shadow-[0_4px_20px_rgba(0,128,0,0.4)] hover:shadow-[0_4px_28px_rgba(0,128,0,0.6)] transition-all text-base">
        ⚽ 进入竞猜
      </button>
    </div>
  );
}

function StandingsCardBody({ allStandings }: { allStandings: StandingRow[] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[36px_1fr_44px_44px_44px_44px_52px] text-xs text-white/30 px-3 pb-2 border-b border-white/5 mb-1">
        <span>#</span><span>球队</span>
        <span className="text-center">赛</span><span className="text-center">胜</span>
        <span className="text-center">平</span><span className="text-center">负</span>
        <span className="text-center font-bold">积分</span>
      </div>
      <div className="flex-1 space-y-1 overflow-hidden">
        {allStandings.map(row => (
          <div key={row.rank}
            className="grid grid-cols-[36px_1fr_44px_44px_44px_44px_52px] items-center px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all">
            <span className={`text-sm font-bold ${rankColor(row.rank)}`}>{row.rank}</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: TEAM_COLORS[row.team] || '#666' }}>
                {(TEAM_SHORTS[row.team] || row.team || '?')[0]}
              </div>
              <span className="text-white text-sm font-medium truncate">{row.team}</span>
            </div>
            <span className="text-center text-white/60 text-sm">{row.played}</span>
            <span className="text-center text-white/60 text-sm">{row.won}</span>
            <span className="text-center text-white/60 text-sm">{row.drawn}</span>
            <span className="text-center text-white/60 text-sm">{row.lost}</span>
            <span className="text-center text-white font-bold text-base">{row.points}</span>
          </div>
        ))}
      </div>
      <Link href="/matches" className="mt-3 text-center text-xs text-white/30 hover:text-[#00ff00] transition-colors">
        查看完整积分榜 →
      </Link>
    </div>
  );
}

function SimCardBody({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      {/* Virtual player avatars */}
      <div className="flex -space-x-3">
        {['#0066b3','#c91a1a','#f7b731','#008000','#8a2be2'].map((c, i) => (
          <div key={i} className="w-12 h-12 rounded-full border-2 border-black/60 flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: c, zIndex: 5 - i }}>
            {['甲','乙','丙','丁','戊'][i]}
          </div>
        ))}
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xl"
          style={{ zIndex: 0 }}>+</div>
      </div>
      <div className="text-center">
        <h3 className="text-white text-xl font-bold mb-1">模拟赛场</h3>
        <p className="text-white/50 text-sm">上传体能数据，匹配对手，开启虚拟对决</p>
        <p className="text-white/30 text-xs mt-1">响应全民健身号召 · 苏超精神走进生活</p>
      </div>
      <div className="flex gap-3 w-full">
        <button onClick={() => router.push('/sim/upload')}
          className="flex-1 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20 transition-all">
          📋 上传体能信息
        </button>
        <button onClick={() => router.push('/sim/match')}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#c91a1a] to-[#ff4444] text-white text-sm font-semibold hover:shadow-[0_0_20px_rgba(201,26,26,0.5)] transition-all">
          ⚔️ 寻找对手PK
        </button>
      </div>
    </div>
  );
}
