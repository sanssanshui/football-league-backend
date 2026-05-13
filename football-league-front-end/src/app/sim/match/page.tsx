"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Swords, Search, Zap, User } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

interface OpponentProfile {
  id: number;
  user_id: number;
  username?: string;
  height: number;
  weight: number;
  age: number;
  gender: string;
  positions: string[];
  overall_rating?: number;
  dribbling_rating: number;
  passing_rating: number;
  shooting_rating: number;
  defending_rating: number;
  vision_rating: number;
  endurance_rating: number;
  explosive_rating: number;
  core_strength_rating: number;
}

const containerV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const cardV = {
  hidden: { opacity: 0, y: 30, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 130, damping: 17 } },
};

function StatBar({ label, value, color = "#00aaff" }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 text-xs w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <span className="text-white/60 text-xs w-6 text-right">{value}</span>
    </div>
  );
}

export default function SimMatchPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [opponents, setOpponents] = useState<OpponentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentProfile | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/auth");
      return;
    }
    fetchOpponents();
  }, [token]);

  const fetchOpponents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/player-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200 && json.data?.length > 0) {
        setOpponents(json.data);
      }
    } catch {
      setError("无法加载对手列表");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (opponent: OpponentProfile) => {
    setSimulating(true);
    setResult(null);
    try {
      // Simulate a match result (backend doesn't have a dedicated endpoint yet,
      // so we simulate locally based on player stats)
      await new Promise(r => setTimeout(r, 1500));

      const userOverall = Math.random() * 3 + 5;
      const oppOverall = Math.random() * 3 + 5;
      const userScore = Math.floor(Math.random() * 4) + (userOverall > oppOverall ? 1 : 0);
      const oppScore = Math.floor(Math.random() * 4) + (oppOverall > userOverall ? 1 : 0);

      if (userScore > oppScore) {
        setResult(`你 ${userScore} : ${oppScore} ${opponent.username || "对手"} —— 恭喜获胜！`);
      } else if (userScore < oppScore) {
        setResult(`你 ${userScore} : ${oppScore} ${opponent.username || "对手"} —— 惜败，继续加油！`);
      } else {
        setResult(`你 ${userScore} : ${oppScore} ${opponent.username || "对手"} —— 握手言和！`);
      }
    } catch {
      setError("模拟失败");
    } finally {
      setSimulating(false);
    }
  };

  const filtered = opponents.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (o.username || "").toLowerCase();
    const pos = (o.positions || []).join(" ").toLowerCase();
    return name.includes(q) || pos.includes(q);
  });

  if (!token) return null;

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans flex flex-col">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')" }}
      />
      <div className="fixed inset-0 z-0 bg-black/75" />

      {/* Grid overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,60,60,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,60,60,0.06) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "linear-gradient(to top, rgba(255,60,60,0.3) 0%, transparent 55%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(255,60,60,0.3) 0%, transparent 55%)",
        }}
      />

      {/* Top bar */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between px-8 pt-8 pb-4">
        <button onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2 rounded-full text-white/70 hover:text-white transition-all text-sm"
          style={{ background: "rgba(255,60,60,0.1)", border: "1px solid rgba(255,60,60,0.3)" }}>
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <div className="text-center">
          <div className="text-xs text-red-400 tracking-[0.3em] uppercase mb-0.5">苏超模拟赛场</div>
          <h1 className="text-white text-xl font-bold tracking-wide">寻找对手 PK</h1>
        </div>
        <div className="w-24" />
      </motion.div>

      {/* Search bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-20 w-full max-w-[600px] mx-auto px-6 pb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="搜索对手名称或位置..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/25 outline-none focus:border-red-400/50 transition-all"
          />
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex-1 w-full max-w-[1200px] mx-auto px-6 pb-10">
        {error && (
          <div className="text-center mb-6">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={fetchOpponents} className="px-6 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all">
              重试
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-red-400/30 border-t-red-400"
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Zap className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm">
              {opponents.length === 0 ? "暂无对手数据，请先上传你的体能信息" : "没有匹配的对手"}
            </p>
            {opponents.length === 0 && (
              <button onClick={() => router.push("/sim/upload")}
                className="mt-4 px-8 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold hover:shadow-[0_0_20px_rgba(255,60,60,0.4)] transition-all">
                上传体能信息
              </button>
            )}
          </div>
        ) : (
          <motion.div
            variants={containerV} initial="hidden" animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filtered.map(opp => (
              <motion.div
                key={opp.id}
                variants={cardV}
                whileHover={{ scale: 1.03, filter: "brightness(1.1)" }}
                onClick={() => setSelectedOpponent(selectedOpponent?.id === opp.id ? null : opp)}
                className={`relative rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all ${
                  selectedOpponent?.id === opp.id
                    ? "ring-2 ring-red-400/60 shadow-[0_0_24px_rgba(255,60,60,0.3)]"
                    : ""
                }`}
                style={{
                  background: "linear-gradient(135deg, rgba(40,0,0,0.85) 0%, rgba(20,0,0,0.9) 100%)",
                  border: `1px solid ${selectedOpponent?.id === opp.id ? "rgba(255,60,60,0.6)" : "rgba(255,60,60,0.2)"}`,
                  boxShadow: selectedOpponent?.id === opp.id
                    ? "0 0 24px rgba(255,60,60,0.3), inset 0 0 20px rgba(255,60,60,0.08)"
                    : "0 0 12px rgba(255,60,60,0.1), inset 0 0 20px rgba(255,60,60,0.03)",
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{opp.username || `球员 #${opp.id}`}</p>
                    <p className="text-white/40 text-xs">{opp.age}岁 · {opp.height}cm · {opp.weight}kg</p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    {(opp.positions || []).slice(0, 2).map(p => (
                      <span key={p} className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 text-[10px] font-medium border border-red-500/20">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-1.5">
                  <StatBar label="盘带" value={opp.dribbling_rating || 5} color="#ff4d6d" />
                  <StatBar label="传球" value={opp.passing_rating || 5} color="#ff8c42" />
                  <StatBar label="射门" value={opp.shooting_rating || 5} color="#ffd700" />
                  <StatBar label="防守" value={opp.defending_rating || 5} color="#00aaff" />
                  <StatBar label="耐力" value={opp.endurance_rating || 5} color="#00ff88" />
                </div>

                {/* Challenge button */}
                {selectedOpponent?.id === opp.id && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => { e.stopPropagation(); handleSimulate(opp); }}
                    disabled={simulating}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold hover:shadow-[0_0_20px_rgba(255,60,60,0.5)] disabled:opacity-50 transition-all"
                  >
                    <Swords className="w-4 h-4" />
                    {simulating ? "模拟中..." : "发起挑战"}
                  </motion.button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Result modal */}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              onClick={e => e.stopPropagation()}
              className="mx-4 p-8 rounded-2xl text-center max-w-sm w-full"
              style={{
                background: "linear-gradient(135deg, rgba(20,0,0,0.95) 0%, rgba(40,0,0,0.9) 100%)",
                border: "1px solid rgba(255,60,60,0.3)",
                boxShadow: "0 0 40px rgba(255,60,60,0.3)",
              }}
            >
              <Swords className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-white text-lg font-bold mb-6">{result}</p>
              <button
                onClick={() => { setResult(null); setSelectedOpponent(null); }}
                className="px-8 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all"
              >
                再来一局
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
