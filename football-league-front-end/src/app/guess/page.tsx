"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, MapPin, Trophy } from "lucide-react";
import { useUserStore } from "@/lib/store";

type Match = {
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
};

type GuessRecord = {
  id: number;
  matchId: number;
  guessResult: string;
  status?: string;
  points?: number;
  match?: Match;
};

const API = "http://localhost:5002";

const TEAM_COLORS: Record<string, string> = {
  "南京城市": "#0066b3",
  "苏州东吴": "#c91a1a",
  "无锡吴钩": "#f7b731",
  "南通支云": "#a50044",
  "徐州骁龙": "#8a2be2",
  "常州龙城": "#ff8c00",
  "连云港海港": "#20b2aa",
  "淮安楚州": "#d2691e",
  "盐城大丰": "#4682b4",
  "扬州瘦西湖": "#9acd32",
  "镇江金山": "#5f9ea0",
  "泰州远大": "#ff4500",
  "宿迁项王": "#2e8b57",
};

const getColor = (name: string) => {
  for (const [key, value] of Object.entries(TEAM_COLORS)) {
    if (name.includes(key)) return value;
  }
  return "#008000";
};

const getShort = (name: string) => name.replace(/队$/, "").slice(0, 2);

const MOCK_MATCHES: Match[] = [
  {
    id: 101,
    home_team_id: 1,
    away_team_id: 2,
    match_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    venue: "南京奥体中心",
    home_score: 0,
    away_score: 0,
    status: 0,
    home_team: { id: 1, name: "南京城市", city: "南京", logo_url: null },
    away_team: { id: 2, name: "苏州东吴", city: "苏州", logo_url: null },
  },
  {
    id: 102,
    home_team_id: 3,
    away_team_id: 4,
    match_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    venue: "无锡体育中心",
    home_score: 0,
    away_score: 0,
    status: 0,
    home_team: { id: 3, name: "无锡吴钩", city: "无锡", logo_url: null },
    away_team: { id: 4, name: "南通支云", city: "南通", logo_url: null },
  },
  {
    id: 103,
    home_team_id: 5,
    away_team_id: 6,
    match_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    venue: "徐州奥体中心",
    home_score: 0,
    away_score: 0,
    status: 0,
    home_team: { id: 5, name: "徐州骁龙", city: "徐州", logo_url: null },
    away_team: { id: 6, name: "常州龙城", city: "常州", logo_url: null },
  },
];

export default function GuessPage() {
  const router = useRouter();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [records, setRecords] = useState<GuessRecord[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<10 | 20 | 50 | 100>(10);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!token) {
      router.replace("/auth");
      return;
    }
    void Promise.all([loadMatches(), loadRecords()]);
  }, [token, router]);

  const loadMatches = async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch(`${API}/api/matches`);
      const json = await res.json();
      if (json.code === 200 && Array.isArray(json.data)) {
        const toSafeNumber = (value: unknown, fallback = 0) => {
          const n = Number(value);
          return Number.isFinite(n) ? n : fallback;
        };
        const toSafeString = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value : fallback);
        const transformedMatches = json.data
          .slice(0, 12)
          .map((m: any) => {
            const homeName = toSafeString(m.homeTeam || m.home_team?.name, "主队");
            const awayName = toSafeString(m.awayTeam || m.away_team?.name, "客队");
            const matchTime = toSafeString(m.timestamp || m.datetime || m.match_time, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
            return {
              id: toSafeNumber(m.id, Date.now()),
              home_team_id: toSafeNumber(m.homeTeamId || m.home_team_id, 0),
              away_team_id: toSafeNumber(m.awayTeamId || m.away_team_id, 0),
              match_time: matchTime,
              venue: toSafeString(m.location || m.venue, "官方主场"),
              home_score: toSafeNumber(m.home_score, 0),
              away_score: toSafeNumber(m.away_score, 0),
              status: toSafeNumber(m.status, 0),
              home_team: {
                id: toSafeNumber(m.homeTeamId || m.home_team_id, 0),
                name: homeName,
                city: homeName.slice(0, 2),
                logo_url: m.homeLogoColor || m.home_team?.logo_url || null,
              },
              away_team: {
                id: toSafeNumber(m.awayTeamId || m.away_team_id, 0),
                name: awayName,
                city: awayName.slice(0, 2),
                logo_url: m.awayLogoColor || m.away_team?.logo_url || null,
              },
            } as Match;
          })
          .filter((match: Match) => Number.isFinite(match.id) && match.home_team.name !== "主队" && match.away_team.name !== "客队");

        setMatches(transformedMatches.length > 0 ? transformedMatches : MOCK_MATCHES);
        if (!selectedMatchId && (transformedMatches.length > 0 ? transformedMatches : MOCK_MATCHES).length > 0) {
          setSelectedMatchId((transformedMatches.length > 0 ? transformedMatches : MOCK_MATCHES)[0].id);
        }
      } else {
        setMatches(MOCK_MATCHES);
        if (!selectedMatchId) setSelectedMatchId(MOCK_MATCHES[0].id);
      }
    } catch (error) {
      console.error(error);
      setMatches(MOCK_MATCHES);
      if (!selectedMatchId) {
        setSelectedMatchId(MOCK_MATCHES[0].id);
      }
    } finally {
      setLoadingMatches(false);
    }
  };

  const loadRecords = async () => {
    setLoadingRecords(true);
    try {
      const res = await fetch(`${API}/api/user/guesses`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      if (json.code === 200) {
        setRecords(Array.isArray(json.data) ? json.data : []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const submitGuess = async (matchId: number, result: string) => {
    if (!token) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/user/guesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ matchId, guessResult: result, points: selectedPoints }),
      });
      const json = await res.json();
      if (json.code === 200) {
        setMsg({ text: `竞猜提交成功！消耗 ${selectedPoints} 积分`, ok: true });
        await loadRecords();
        setTimeout(() => setMsg(null), 3000);
      } else {
        setMsg({ text: json.message || "竞猜失败", ok: false });
      }
    } catch {
      setMsg({ text: "网络错误", ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMatch = useMemo(() => matches.find((match) => match.id === selectedMatchId) || null, [matches, selectedMatchId]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div
        className="fixed inset-0 z-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/pexels-eslames1-31160101.jpg')" }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-white/70 via-white/80 to-white" />

      <div className="relative z-10 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </button>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight">2026 赛季 · 赛事竞猜</h1>
            <p className="mt-1 text-xs font-medium text-white/50">每次消耗 10 积分 · 猜中获得 20 积分</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-xs font-bold text-slate-900">
            <CircleDollarSign className="h-4 w-4" />
            积分玩法
          </div>
        </div>
      </div>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-[1.35fr_0.85fr] text-slate-900">
        <section className="space-y-4">
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium ${msg.ok ? "border-emerald-200 bg-emerald-50 text-slate-900" : "border-red-200 bg-red-50 text-slate-900"}`}
            >
              {msg.text}
            </motion.div>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">可竞猜比赛</h2>
                <p className="mt-1 text-sm text-slate-600">请选择一场比赛并提交胜平负预测</p>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                {loadingMatches ? "加载中..." : `${matches.length} 场待竞猜`}
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">积分选择</span>
              <div className="flex flex-wrap gap-3">
                {[10, 20, 50, 100].map((points) => (
                  <button
                    key={points}
                    type="button"
                    onClick={() => setSelectedPoints(points as 10 | 20 | 50 | 100)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${selectedPoints === points ? "border-emerald-600 bg-emerald-50 text-slate-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"}`}
                  >
                    {points}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {matches.length === 0 && !loadingMatches ? (
                <div className="col-span-2 rounded-3xl border border-dashed border-slate-300 px-6 py-16 text-center text-sm text-slate-500">
                  暂无可竞猜的比赛
                </div>
              ) : (
                matches.map((match, index) => {
                  const dt = new Date(match.match_time);
                  const selected = selectedMatchId === match.id;
                  return (
                    <motion.button
                      key={match.id}
                      type="button"
                      onClick={() => setSelectedMatchId(match.id)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={`rounded-3xl border p-5 text-left transition-all ${selected ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700">2026 赛季</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          待开始
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <TeamChip name={match.home_team.name} color={getColor(match.home_team.name)} short={getShort(match.home_team.name)} />
                        <div className="px-2 text-center text-sm font-black uppercase tracking-[0.35em] text-slate-400">VS</div>
                        <TeamChip name={match.away_team.name} color={getColor(match.away_team.name)} short={getShort(match.away_team.name)} />
                      </div>

                      <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                        <InfoRow icon={CalendarDays} text={`${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`} />
                        <InfoRow icon={Clock3} text={dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
                        <InfoRow icon={MapPin} text={match.venue} />
                        <InfoRow icon={Trophy} text="胜 / 平 / 负" />
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">竞猜面板</h3>
                <p className="text-sm text-slate-600">当前选择的比赛</p>
              </div>
            </div>

            {selectedMatch ? (
              <>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <TeamChip name={selectedMatch.home_team.name} color={getColor(selectedMatch.home_team.name)} short={getShort(selectedMatch.home_team.name)} compact />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">VS</span>
                    <TeamChip name={selectedMatch.away_team.name} color={getColor(selectedMatch.away_team.name)} short={getShort(selectedMatch.away_team.name)} compact />
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <InfoRow icon={CalendarDays} text={new Date(selectedMatch.match_time).toLocaleString()} />
                    <InfoRow icon={MapPin} text={selectedMatch.venue} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <GuessButton disabled={submitting} onClick={() => submitGuess(selectedMatch.id, "主胜")} label="主胜" tone="home" />
                  <GuessButton disabled={submitting} onClick={() => submitGuess(selectedMatch.id, "平局")} label="平局" tone="draw" />
                  <GuessButton disabled={submitting} onClick={() => submitGuess(selectedMatch.id, "客胜")} label="客胜" tone="away" />
                </div>
              </>
            ) : loadingMatches ? (
              <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                正在加载可竞猜赛事...
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
                暂无可竞猜赛事，请稍后再来
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">我的竞猜记录</h3>
                <p className="text-sm text-slate-600">实时查看提交状态</p>
              </div>
              <button
                type="button"
                onClick={() => void loadRecords()}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                刷新
              </button>
            </div>

            {loadingRecords ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">加载竞猜记录中...</div>
            ) : records.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">暂无竞猜记录</div>
            ) : (
              <div className="space-y-3">
                {records.slice(0, 6).map((record) => {
                  const match = record.match || matches.find((item) => item.id === record.matchId);
                  return (
                    <div key={record.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{match ? `${match.home_team.name} vs ${match.away_team.name}` : `比赛 #${record.matchId}`}</div>
                          <div className="mt-1 text-xs text-slate-600">竞猜结果：{record.guessResult}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${record.status === "win" ? "bg-emerald-100 text-slate-900" : record.status === "lose" ? "bg-red-100 text-slate-900" : "bg-slate-100 text-slate-700"}`}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {record.status || "pending"}
                          </span>
                          <span className="text-xs text-slate-500">{typeof record.points === "number" ? `${record.points} 分` : "未结算"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function TeamChip({ name, color, short, compact = false }: { name: string; color: string; short: string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`${compact ? "h-11 w-11 text-sm" : "h-14 w-14 text-base"} flex shrink-0 items-center justify-center rounded-2xl font-black text-white`}
        style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}55` }}
      >
        {short}
      </div>
      <div className="min-w-0">
        <div className={`truncate font-bold text-slate-900 ${compact ? "text-sm" : "text-base"}`}>{name}</div>
        <div className="mt-0.5 text-[11px] font-medium text-slate-500">江苏城市足球联赛</div>
      </div>
    </div>
  );
}

function GuessButton({
  disabled,
  onClick,
  label,
  tone,
}: {
  disabled?: boolean;
  onClick: () => void;
  label: string;
  tone: "home" | "draw" | "away";
}) {
  const tones = {
    home: "border-emerald-300 bg-emerald-50 text-slate-900 hover:bg-emerald-100",
    draw: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    away: "border-sky-300 bg-sky-50 text-slate-900 hover:bg-sky-100",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

function InfoRow({ icon: Icon, text }: { icon: typeof CalendarDays; text: string }) {
  return (
    <div className="flex items-center gap-2 truncate text-slate-600">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="truncate">{text}</span>
    </div>
  );
}
