"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = "http://localhost:5002";

interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  match_time: string;
  venue: string;
  home_score: number;
  away_score: number;
  status: number;
  home_team: { id: number; name: string; city: string; logo_url: string | null };
  away_team: { id: number; name: string; city: string; logo_url: string | null };
}

const TEAM_COLORS: Record<string, string> = {
  '南京城市': '#0066b3', '苏州东吴': '#c91a1a', '无锡吴钩': '#f7b731',
  '南通支云': '#a50044', '徐州骁龙': '#8a2be2', '常州龙城': '#ff8c00',
  '连云港海港': '#20b2aa', '淮安楚州': '#d2691e', '盐城大丰': '#4682b4',
  '扬州瘦西湖': '#9acd32', '镇江金山': '#5f9ea0', '泰州远大': '#ff4500', '宿迁项王': '#2e8b57',
};
const getColor = (n: string) => { for (const [k, v] of Object.entries(TEAM_COLORS)) if (n.includes(k)) return v; return '#008000'; };
const getShort = (n: string) => n.replace(/队$/, '').slice(0, 2);

export default function GuessPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [guesses, setGuesses] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!token) { router.replace("/auth"); return; }
    loadMatches();
  }, [token, router]);

  const loadMatches = async () => {
    try {
      const res = await fetch(`${API}/api/matches`);
      const json = await res.json();
      if (json.code === 200 && json.data) {
        const now = new Date();
        const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

        // Filter: status "未开始" AND match_time between now and 3 months from now
        const upcoming = json.data.filter((m: any) => {
          if (m.status !== '未开始') return false;
          const matchTime = new Date(m.timestamp || m.datetime);
          return matchTime >= now && matchTime <= threeMonthsLater;
        });

        // Transform to Match interface
        const transformedMatches = upcoming.map((m: any) => ({
          id: parseInt(m.id),
          home_team_id: parseInt(m.homeTeamId),
          away_team_id: parseInt(m.awayTeamId),
          match_time: m.timestamp || m.datetime,
          venue: m.location || '官方主场',
          home_score: 0,
          away_score: 0,
          status: 0,
          home_team: {
            id: parseInt(m.homeTeamId),
            name: m.homeTeam,
            city: m.homeTeam.slice(0, 2),
            logo_url: m.homeLogoColor
          },
          away_team: {
            id: parseInt(m.awayTeamId),
            name: m.awayTeam,
            city: m.awayTeam.slice(0, 2),
            logo_url: m.awayLogoColor
          }
        }));

        setMatches(transformedMatches);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGuess = async (matchId: number, result: string) => {
    if (!token) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/user/guesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId, guessResult: result }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setMsg({ text: '竞猜提交成功！消耗10积分', ok: true });
        setGuesses(prev => ({ ...prev, [matchId]: result }));
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ text: json.message || '竞猜失败', ok: false });
      }
    } catch {
      setMsg({ text: '网络错误', ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm transition-all">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">2026赛季 · 赛事竞猜</h1>
          <p className="text-white/40 text-xs mt-1">每次消耗 10 积分 · 猜中获得 20 积分</p>
        </div>
        <div className="w-24" />
      </div>

      {/* Message */}
      {msg && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className={`relative z-20 mx-auto w-[600px] mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
            msg.ok ? 'bg-[#008000]/20 border-[#008000]/40 text-[#00ff00]' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
          {msg.text}
        </motion.div>
      )}

      {/* Matches grid */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 pb-10 grid grid-cols-2 gap-6">
        {matches.length === 0 ? (
          <div className="col-span-2 text-center py-20 text-white/30">暂无可竞猜的比赛</div>
        ) : matches.map((m, i) => {
          const dt = new Date(m.match_time);
          const dateStr = `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
          const homeColor = getColor(m.home_team.name);
          const awayColor = getColor(m.away_team.name);
          const homeShort = getShort(m.home_team.name);
          const awayShort = getShort(m.away_team.name);
          const selected = guesses[m.id];
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 hover:border-[#008000]/40 transition-all"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <span className="text-[#00ff00] text-xs font-medium">2026赛季</span>
                <span className="text-white/40 text-xs">{dateStr}</span>
                <span className="px-3 py-1 rounded-full bg-[#ff6700]/20 border border-[#ff6700]/40 text-[#ff6700] text-xs font-semibold">
                  待开始
                </span>
              </div>

              {/* Teams */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: homeColor, boxShadow: `0 0 20px ${homeColor}66` }}>
                    {homeShort}
                  </div>
                  <span className="text-white text-sm font-medium text-center">{m.home_team.name}</span>
                </div>
                <div className="text-center px-4">
                  <span className="text-white/30 text-2xl font-bold">vs</span>
                </div>
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: awayColor, boxShadow: `0 0 20px ${awayColor}66` }}>
                    {awayShort}
                  </div>
                  <span className="text-white text-sm font-medium text-center">{m.away_team.name}</span>
                </div>
              </div>

              {/* Venue */}
              <div className="text-center text-white/30 text-xs mb-4">📍 {m.venue}</div>

              {/* Guess buttons */}
              {selected ? (
                <div className="w-full py-3 rounded-xl bg-gradient-to-r from-[#008000]/30 to-[#00b300]/30 border border-[#008000]/50 text-[#00ff00] font-semibold text-center">
                  已竞猜：{selected}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleGuess(m.id, '主胜')}
                    disabled={submitting}
                    className="py-2 rounded-lg bg-gradient-to-br from-[#ff6700]/20 to-[#ff6700]/10 border border-[#ff6700]/40 text-[#ff6700] text-sm font-semibold hover:bg-[#ff6700]/30 hover:shadow-[0_0_15px_rgba(255,103,0,0.4)] transition-all disabled:opacity-50"
                  >
                    主胜
                  </button>
                  <button
                    onClick={() => handleGuess(m.id, '平局')}
                    disabled={submitting}
                    className="py-2 rounded-lg bg-gradient-to-br from-white/20 to-white/10 border border-white/40 text-white text-sm font-semibold hover:bg-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all disabled:opacity-50"
                  >
                    平局
                  </button>
                  <button
                    onClick={() => handleGuess(m.id, '客胜')}
                    disabled={submitting}
                    className="py-2 rounded-lg bg-gradient-to-br from-[#00b3ff]/20 to-[#00b3ff]/10 border border-[#00b3ff]/40 text-[#00b3ff] text-sm font-semibold hover:bg-[#00b3ff]/30 hover:shadow-[0_0_15px_rgba(0,179,255,0.4)] transition-all disabled:opacity-50"
                  >
                    客胜
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
