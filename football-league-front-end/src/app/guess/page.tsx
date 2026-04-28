"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useTransform, AnimatePresence, Variants } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = "http://localhost:5002";

interface MatchRow {
  id: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  homeShort: string;
  awayShort: string;
  status: string;
  score: string | null;
  datetime: string;
  location: string;
}

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
const getColor = (n: string) => { for (const [k, v] of Object.entries(TEAM_COLORS)) if (n.includes(k)) return v; return '#555'; };
const getShort = (n: string) => { for (const [k, v] of Object.entries(TEAM_SHORTS)) if (n.includes(k)) return v; return n.slice(0, 2); };
const normStatus = (s: string) => (s === '未开始' || s === '待开始') ? '待开始' : (s === '已结束' || s === '已完结') ? '已完结' : s;

// 2025赛季静态数据（后端无数据时的 fallback）
const MOCK_2025: MatchRow[] = [
  { id:'101', round:'第1轮',  homeTeam:'南京城市队',   awayTeam:'苏州东吴队',   homeColor:'#0066b3', awayColor:'#c91a1a', homeShort:'南京', awayShort:'苏州', status:'待开始', score:null, datetime:'2025年3月8日',  location:'南京奥体中心' },
  { id:'102', round:'第1轮',  homeTeam:'无锡吴钩队',   awayTeam:'南通支云队',   homeColor:'#f7b731', awayColor:'#a50044', homeShort:'无锡', awayShort:'南通', status:'待开始', score:null, datetime:'2025年3月8日',  location:'无锡体育中心' },
  { id:'103', round:'第1轮',  homeTeam:'徐州骁龙队',   awayTeam:'常州龙城队',   homeColor:'#8a2be2', awayColor:'#ff8c00', homeShort:'徐州', awayShort:'常州', status:'待开始', score:null, datetime:'2025年3月8日',  location:'徐州奥体中心' },
  { id:'104', round:'第1轮',  homeTeam:'连云港海港队', awayTeam:'淮安楚州队',   homeColor:'#20b2aa', awayColor:'#d2691e', homeShort:'连港', awayShort:'淮安', status:'待开始', score:null, datetime:'2025年3月8日',  location:'连云港体育场' },
  { id:'105', round:'第1轮',  homeTeam:'盐城大丰队',   awayTeam:'扬州瘦西湖队', homeColor:'#4682b4', awayColor:'#9acd32', homeShort:'盐城', awayShort:'扬州', status:'待开始', score:null, datetime:'2025年3月8日',  location:'盐城体育场' },
  { id:'106', round:'第1轮',  homeTeam:'镇江金山队',   awayTeam:'泰州远大队',   homeColor:'#5f9ea0', awayColor:'#ff4500', homeShort:'镇江', awayShort:'泰州', status:'待开始', score:null, datetime:'2025年3月8日',  location:'镇江体育中心' },
  { id:'107', round:'第2轮',  homeTeam:'苏州东吴队',   awayTeam:'无锡吴钩队',   homeColor:'#c91a1a', awayColor:'#f7b731', homeShort:'苏州', awayShort:'无锡', status:'待开始', score:null, datetime:'2025年3月15日', location:'苏州奥体中心' },
  { id:'108', round:'第2轮',  homeTeam:'南通支云队',   awayTeam:'徐州骁龙队',   homeColor:'#a50044', awayColor:'#8a2be2', homeShort:'南通', awayShort:'徐州', status:'待开始', score:null, datetime:'2025年3月15日', location:'南通体育场' },
  { id:'109', round:'第2轮',  homeTeam:'常州龙城队',   awayTeam:'连云港海港队', homeColor:'#ff8c00', awayColor:'#20b2aa', homeShort:'常州', awayShort:'连港', status:'待开始', score:null, datetime:'2025年3月15日', location:'常州体育中心' },
  { id:'110', round:'第2轮',  homeTeam:'淮安楚州队',   awayTeam:'盐城大丰队',   homeColor:'#d2691e', awayColor:'#4682b4', homeShort:'淮安', awayShort:'盐城', status:'待开始', score:null, datetime:'2025年3月15日', location:'淮安体育中心' },
  { id:'111', round:'第2轮',  homeTeam:'扬州瘦西湖队', awayTeam:'镇江金山队',   homeColor:'#9acd32', awayColor:'#5f9ea0', homeShort:'扬州', awayShort:'镇江', status:'待开始', score:null, datetime:'2025年3月15日', location:'扬州体育公园' },
  { id:'112', round:'第2轮',  homeTeam:'泰州远大队',   awayTeam:'宿迁项王队',   homeColor:'#ff4500', awayColor:'#2e8b57', homeShort:'泰州', awayShort:'宿迁', status:'待开始', score:null, datetime:'2025年3月15日', location:'泰州体育场' },
  { id:'113', round:'第3轮',  homeTeam:'宿迁项王队',   awayTeam:'南京城市队',   homeColor:'#2e8b57', awayColor:'#0066b3', homeShort:'宿迁', awayShort:'南京', status:'待开始', score:null, datetime:'2025年3月22日', location:'宿迁体育中心' },
  { id:'114', round:'第3轮',  homeTeam:'无锡吴钩队',   awayTeam:'苏州东吴队',   homeColor:'#f7b731', awayColor:'#c91a1a', homeShort:'无锡', awayShort:'苏州', status:'待开始', score:null, datetime:'2025年3月22日', location:'无锡体育中心' },
  { id:'115', round:'第3轮',  homeTeam:'徐州骁龙队',   awayTeam:'南通支云队',   homeColor:'#8a2be2', awayColor:'#a50044', homeShort:'徐州', awayShort:'南通', status:'待开始', score:null, datetime:'2025年3月22日', location:'徐州奥体中心' },
  { id:'116', round:'第3轮',  homeTeam:'连云港海港队', awayTeam:'常州龙城队',   homeColor:'#20b2aa', awayColor:'#ff8c00', homeShort:'连港', awayShort:'常州', status:'待开始', score:null, datetime:'2025年3月22日', location:'连云港体育场' },
  { id:'117', round:'第3轮',  homeTeam:'盐城大丰队',   awayTeam:'淮安楚州队',   homeColor:'#4682b4', awayColor:'#d2691e', homeShort:'盐城', awayShort:'淮安', status:'待开始', score:null, datetime:'2025年3月22日', location:'盐城体育场' },
  { id:'118', round:'第3轮',  homeTeam:'扬州瘦西湖队', awayTeam:'泰州远大队',   homeColor:'#9acd32', awayColor:'#ff4500', homeShort:'扬州', awayShort:'泰州', status:'待开始', score:null, datetime:'2025年3月22日', location:'扬州体育公园' },
  { id:'119', round:'第4轮',  homeTeam:'南京城市队',   awayTeam:'无锡吴钩队',   homeColor:'#0066b3', awayColor:'#f7b731', homeShort:'南京', awayShort:'无锡', status:'待开始', score:null, datetime:'2025年3月29日', location:'南京奥体中心' },
  { id:'120', round:'第4轮',  homeTeam:'苏州东吴队',   awayTeam:'南通支云队',   homeColor:'#c91a1a', awayColor:'#a50044', homeShort:'苏州', awayShort:'南通', status:'待开始', score:null, datetime:'2025年3月29日', location:'苏州奥体中心' },
  { id:'121', round:'第4轮',  homeTeam:'常州龙城队',   awayTeam:'徐州骁龙队',   homeColor:'#ff8c00', awayColor:'#8a2be2', homeShort:'常州', awayShort:'徐州', status:'待开始', score:null, datetime:'2025年3月29日', location:'常州体育中心' },
  { id:'122', round:'第4轮',  homeTeam:'淮安楚州队',   awayTeam:'连云港海港队', homeColor:'#d2691e', awayColor:'#20b2aa', homeShort:'淮安', awayShort:'连港', status:'待开始', score:null, datetime:'2025年3月29日', location:'淮安体育中心' },
  { id:'123', round:'第4轮',  homeTeam:'镇江金山队',   awayTeam:'盐城大丰队',   homeColor:'#5f9ea0', awayColor:'#4682b4', homeShort:'镇江', awayShort:'盐城', status:'待开始', score:null, datetime:'2025年3月29日', location:'镇江体育中心' },
  { id:'124', round:'第4轮',  homeTeam:'泰州远大队',   awayTeam:'扬州瘦西湖队', homeColor:'#ff4500', awayColor:'#9acd32', homeShort:'泰州', awayShort:'扬州', status:'待开始', score:null, datetime:'2025年3月29日', location:'泰州体育场' },
];

const PAGE_SIZE = 6;
const itemV: Variants = { hidden:{opacity:0,y:16}, visible:{opacity:1,y:0,transition:{type:"spring",stiffness:120,damping:16}} };
const containerV: Variants = { hidden:{opacity:0}, visible:{opacity:1,transition:{staggerChildren:0.06}} };

export default function GuessPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [allMatches, setAllMatches] = useState<MatchRow[]>([]);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [choice, setChoice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const bgX = useTransform(mouseX, [-1, 1], [-15, 15]);
  const bgY = useTransform(mouseY, [-1, 1], [-15, 15]);
  const onMouseMove = (e: React.MouseEvent) => {
    mouseX.set((e.clientX / window.innerWidth - 0.5) * 2);
    mouseY.set((e.clientY / window.innerHeight - 0.5) * 2);
  };

  useEffect(() => {
    setMounted(true);
    const load = async () => {
      try {
        const res = await fetch(`${API}/api/matches`);
        const json = await res.json();
        if (json.code === 200 && json.data?.length > 0) {
          const rows: MatchRow[] = json.data.map((m: any, i: number) => {
            const d = new Date(m.timestamp || m.match_time || m.datetime);
            return {
              id: String(m.id || i),
              round: m.round || '',
              homeTeam: m.homeTeam || m.home_team?.name || '',
              awayTeam: m.awayTeam || m.away_team?.name || '',
              homeColor: m.homeLogoColor || getColor(m.homeTeam || ''),
              awayColor: m.awayLogoColor || getColor(m.awayTeam || ''),
              homeShort: getShort(m.homeTeam || ''),
              awayShort: getShort(m.awayTeam || ''),
              status: normStatus(m.status),
              score: m.score || null,
              datetime: isNaN(d.getTime()) ? '' : `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`,
              location: m.location || m.venue || '',
            };
          });
          setAllMatches(rows);
          return;
        }
      } catch { /* fall through to mock */ }
      setAllMatches(MOCK_2025);
    };
    load();
  }, []);

  const totalPages = Math.ceil(allMatches.length / PAGE_SIZE);
  const paged = allMatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

const handleGuess = async (matchId: string, guessResult: string) => {
  const { token: currentToken } = useUserStore.getState();
  if (!currentToken) {
    setMsg({ text: '请先登录后再参与竞猜', ok: false });
    return;
  }
  setSubmitting(true);
  setMsg(null);
  let res: Response;
  try {
    res = await fetch(`${API}/api/user/guesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ matchId: Number(matchId), guessResult }),
    });
  } catch {
    setMsg({ text: '无法连接到服务器，请确认后端已启动（端口5002）', ok: false });
    setSubmitting(false);
    return;
  }
  try {
    const json = await res.json();
    if (json.code === 200) {
      setMsg({ text: '竞猜成功！消耗10积分，结果将在比赛结束后公布', ok: true });
      setDoneIds(prev => new Set(prev).add(matchId));
      setOpenId(null);
      setChoice('');
    } else if (res.status === 401 || json.code === 401) {
      setMsg({ text: '登录已过期，请重新登录', ok: false });
    } else {
      setMsg({ text: json.message || '竞猜失败', ok: false });
    }
  } catch {
    setMsg({ text: '服务器响应异常，请稍后重试', ok: false });
  } finally {
    setSubmitting(false);
  }
};

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans" onMouseMove={onMouseMove}>
      <motion.div className="fixed inset-[-30px] z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')", x: bgX, y: bgY }} />
      <div className="fixed inset-0 bg-black/60 z-0 pointer-events-none" />

      {/* Top bar */}
      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}
        className="sticky top-0 z-50 w-full h-[64px] bg-black/30 backdrop-blur-xl border-b border-white/10 flex items-center px-8 justify-between">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white text-sm transition-all">
          ← 返回
        </button>
        <h1 className="text-white font-bold text-xl tracking-wide">2025赛季 · 赛事竞猜</h1>
        <div className="text-xs text-white/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          每次消耗 10 积分 · 猜中获得 20 积分
        </div>
      </motion.div>

      <div className="relative z-10 w-[1100px] mx-auto py-10 px-4">
        {/* Global message */}
        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className={`mb-6 px-5 py-3 rounded-xl text-sm font-medium border ${msg.ok ? 'bg-[#008000]/20 border-[#008000]/40 text-[#00ff00]' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Match grid */}
        <motion.div key={page} variants={containerV} initial="hidden" animate="visible"
          className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
          {paged.map(m => {
            const isOpen = openId === m.id;
            const done = doneIds.has(m.id);
            return (
              <motion.div key={m.id} variants={itemV} layout
                className={`bg-black/40 backdrop-blur-2xl border rounded-[24px] p-6 transition-all ${isOpen ? 'border-[#008000]/60 shadow-[0_0_24px_rgba(0,128,0,0.2)]' : 'border-white/10 hover:border-white/20'}`}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-xs text-[#00ff00] font-medium">{m.round}</span>
                    <span className="text-xs text-white/30 ml-2">{m.datetime}</span>
                  </div>
                  {done
                    ? <span className="text-[10px] text-[#00ff00] bg-[#008000]/20 border border-[#008000]/30 px-2.5 py-1 rounded-full">已竞猜</span>
                    : <span className="text-[10px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded-full">待开始</span>
                  }
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
                      style={{ backgroundColor: m.homeColor, boxShadow: `0 0 14px ${m.homeColor}60` }}>
                      {m.homeShort}
                    </div>
                    <span className="text-sm text-white/80 text-center leading-tight">{m.homeTeam}</span>
                  </div>
                  <div className="text-white/20 text-lg font-light px-4">vs</div>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
                      style={{ backgroundColor: m.awayColor, boxShadow: `0 0 14px ${m.awayColor}60` }}>
                      {m.awayShort}
                    </div>
                    <span className="text-sm text-white/80 text-center leading-tight">{m.awayTeam}</span>
                  </div>
                </div>

                {/* Location */}
                {m.location && <div className="text-xs text-white/30 text-center mb-4">📍 {m.location}</div>}

                {/* Action */}
                {done ? (
                  <div className="text-center text-xs text-white/30 py-2">竞猜已提交，等待比赛结果</div>
                ) : !isOpen ? (
                  <button onClick={() => { setOpenId(m.id); setChoice(''); setMsg(null); }}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-[#008000]/20 hover:border-[#008000]/40 hover:text-white text-sm transition-all">
                    参与竞猜
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {[{ val:'home_win', label:'主队胜' }, { val:'draw', label:'平局' }, { val:'away_win', label:'客队胜' }].map(opt => (
                        <button key={opt.val} onClick={() => setChoice(opt.val)}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${choice === opt.val ? 'bg-[#008000]/80 border-[#008000] text-white shadow-[0_0_12px_rgba(0,128,0,0.4)]' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setOpenId(null); setChoice(''); }}
                        className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm hover:bg-white/10 transition-all">
                        取消
                      </button>
                      <button disabled={!choice || submitting} onClick={() => handleGuess(m.id, choice)}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#008000] to-[#00b300] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(0,128,0,0.5)] transition-all">
                        {submitting ? '提交中...' : '确认竞猜'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${p === page ? 'bg-[#008000]/80 border border-[#008000] text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center text-white/30 text-xs mt-3">{page} / {totalPages} 页 · 共 {allMatches.length} 场比赛</div>
      </div>
    </div>
  );
}
