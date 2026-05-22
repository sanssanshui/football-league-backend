"use client";

import { ReactNode, useState, useEffect, useRef, type ComponentType } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Search, Calendar, Activity, Trophy, MapPin, ChevronRight, Clock, Star, CircleDot, Square, ShieldAlert, PlayCircle, LogIn, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { applyMatchDisplayRules, hasPenaltyShootout, matchesSearchQuery, parseRegularScore } from "@/lib/match-display";
import TeamBadge from "@/components/team-badge";
import { TEAM_LIST } from "@/lib/team-branding";
import { useUserStore } from "@/lib/store";

// --- 1. 类型定义 ---
type MatchStatus = "待开始" | "进行中" | "已完结";
interface Match {
  id: string; round: string; datetime: string; location: string; status: MatchStatus;
  homeTeamId: string; homeTeam: string; awayTeamId: string; awayTeam: string;
  homePossession: number; awayPossession: number; homeLogoColor: string; awayLogoColor: string;
  score: string; timestamp: string; homePenalties?: number | null; awayPenalties?: number | null;
}
interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor?: number;
  goalsAgainst?: number;
  gf?: number;
  ga?: number;
  gd?: number;
  points: number;
}
interface PlayerRanking {
  name: string;
  team: string;
  value: number;
  goals?: number;
  avatarUrl?: string | null;
  rank?: number;
  category?: string;
}
interface TeamCategoryRanking {
  teamId: string;
  teamName: string;
  value: number;
  rank?: number;
  category?: string;
}

type TeamRowInsight = TeamCategoryRanking & {
  standing?: Standing;
};

const tabToHash = { schedule: '赛程', standings: '积分榜', players: '球员榜', teams: '球队榜' } as const;
const hashToTab: Record<string, keyof typeof tabToHash> = { 赛程: 'schedule', 积分榜: 'standings', 球员榜: 'players', 球队榜: 'teams' };
const sidebarTabs: Array<{ key: keyof typeof tabToHash; label: string }> = [
  { key: 'schedule', label: '赛程一览' },
  { key: 'standings', label: '联赛积分榜' },
  { key: 'players', label: '球员榜' },
  { key: 'teams', label: '球队榜' },
];
const playerRankingTabs = [
  { key: 'goals', label: '射手', unit: '球', icon: CircleDot },
  { key: 'yellow_cards', label: '黄牌', unit: '张', icon: Square },
  { key: 'red_cards', label: '红牌', unit: '张', icon: ShieldAlert },
  { key: 'penalties', label: '点球', unit: '球', icon: Star },
];
const teamRankingTabs = [
  { key: 'goals_for', label: '进球', unit: '球' },
  { key: 'goals_against', label: '失球', unit: '球' },
  { key: 'yellow_cards', label: '黄牌', unit: '张' },
  { key: 'red_cards', label: '红牌', unit: '张' },
  { key: 'penalties', label: '点球', unit: '球' },
  { key: 'shots', label: '射门', unit: '次' },
  { key: 'shots_on_target', label: '射正', unit: '次' },
  { key: 'corners', label: '角球', unit: '个' },
];

function buildMiguScheduleUrl(match: Match) {
  const date = new Date(match.timestamp).toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replaceAll('/', '-');
  const keyword = `${date} ${match.homeTeam} ${match.awayTeam} 江苏城市足球联赛`;
  const encoded = encodeURIComponent(keyword);
  return `https://www.miguvideo.com/p/schedule?keyword=${encoded}&searchText=${encoded}`;
}

// --- GlassSegmentedTabs ---
function GlassSegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string; icon?: ComponentType<{ className?: string }> }[];
  active: T;
  onChange: (key: T) => void;
}) {
  const activeIdx = tabs.findIndex((t) => t.key === active);
  return (
    <div className="relative flex items-center gap-1 rounded-2xl bg-white/5 border border-white/10 p-1">
      {activeIdx >= 0 && (
        <motion.div
          className="absolute top-1 bottom-1 rounded-xl bg-white/10 border border-white/20"
          layoutId="glass-tab-indicator"
          style={{ left: `calc(${(activeIdx / tabs.length) * 100}% + 4px)`, width: `calc(${100 / tabs.length}% - 8px)` }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      )}
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
              active === t.key ? 'text-[#00ff00]' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Status badge ---
function StatusBadge({ status }: { status: MatchStatus }) {
  if (status === '已完结') return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#008000]/30 bg-[#008000]/20 px-2.5 py-0.5 text-xs font-bold text-[#00ff00]">
      已完结
    </span>
  );
  if (status === '进行中') return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
      进行中
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/50">
      待开始
    </span>
  );
}

// --- Match card ---
function MatchCard({ match, year }: { match: Match; year: string }) {
  const router = useRouter();
  const display = applyMatchDisplayRules(match);
  const regularScore = parseRegularScore(display.score);
  const hasPenalties = hasPenaltyShootout(display);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => router.push(`/matches/${year}/${match.id}`)}
      className="group cursor-pointer rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-xl px-6 py-5 transition-all hover:border-[#008000]/50 hover:bg-black/60"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white/40 tracking-widest">{match.round}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="flex items-center justify-between gap-4">
        {/* Home */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamBadge teamName={match.homeTeam} season={year} className="h-12 w-12" />
          <span className="text-center text-sm font-bold text-white leading-tight">{match.homeTeam}</span>
        </div>
        {/* Score */}
        <div className="flex flex-col items-center gap-1 min-w-[80px]">
          {match.status === '待开始' ? (
            <>
              <div className="flex items-center gap-1 text-white/30">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{match.datetime}</span>
              </div>
              <span className="text-2xl font-black text-white/20">VS</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black tabular-nums text-white">{regularScore.home}</span>
                <span className="text-xl font-black text-white/30">:</span>
                <span className="text-4xl font-black tabular-nums text-white">{regularScore.away}</span>
              </div>
              {hasPenalties && (
                <span className="text-[10px] font-black tracking-widest text-white/40">
                  点球统计 [{display.homePenalties}]:[{display.awayPenalties}]
                </span>
              )}
            </>
          )}
        </div>
        {/* Away */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <TeamBadge teamName={match.awayTeam} season={year} className="h-12 w-12" />
          <span className="text-center text-sm font-bold text-white leading-tight">{match.awayTeam}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 text-xs text-white/30">
        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{match.location}</span>
        {match.status === '已完结' && (
          <a
            href={buildMiguScheduleUrl(match)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-white/30 hover:text-[#00ff00] transition-colors"
          >
            <PlayCircle className="h-3 w-3" /> 回放
          </a>
        )}
      </div>
    </motion.div>
  );
}

// --- Standings panel ---
function StandingsPanel({ standings }: { standings: Standing[] }) {
  const rankBadge = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    if (rank === 2) return 'bg-white/10 text-white/60 border border-white/20';
    if (rank === 3) return 'bg-amber-700/20 text-amber-600 border border-amber-700/30';
    return 'bg-white/5 text-white/30 border border-white/10';
  };
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
      <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem_3rem] gap-x-3 px-6 py-3 text-xs font-bold text-white/40 border-b border-white/5">
        <span>#</span><span>球队</span><span className="text-center">赛</span>
        <span className="text-center text-[#00ff00]">胜</span>
        <span className="text-center">平</span>
        <span className="text-center text-red-400">负</span>
        <span className="text-center text-[#00ff00]">积分</span>
      </div>
      {standings.map((row, idx) => {
        const rank = idx + 1;
        return (
          <div
            key={row.teamId || row.teamName}
            className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem_3rem] gap-x-3 items-center px-6 py-3 border-b border-white/5 hover:bg-white/5 transition-colors last:border-0"
          >
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${rankBadge(rank)}`}>{rank}</span>
            <div className="flex items-center gap-2 min-w-0">
              <TeamBadge teamName={row.teamName} season="2026" className="h-6 w-6 shrink-0" />
              <span className="truncate text-sm font-bold text-white">{row.teamName}</span>
            </div>
            <span className="text-center text-sm text-white/60">{row.played}</span>
            <span className="text-center text-sm font-bold text-[#00ff00]">{row.won}</span>
            <span className="text-center text-sm text-white/60">{row.drawn}</span>
            <span className="text-center text-sm font-bold text-red-400">{row.lost}</span>
            <span className="text-center text-base font-black text-[#00ff00]">{row.points}</span>
          </div>
        );
      })}
    </div>
  );
}

// --- Players panel ---
function PlayersPanel({ players, unit }: { players: PlayerRanking[]; unit: string }) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
      {players.map((p, idx) => {
        const rank = idx + 1;
        return (
          <div
            key={`${p.name}-${p.team}-${idx}`}
            className="flex items-center gap-4 border-b border-white/5 bg-white/5 px-5 py-3 hover:bg-white/10 transition-colors last:border-0"
          >
            <span className={`w-6 text-center text-sm font-black ${rank <= 3 ? 'text-[#00ff00]' : 'text-white/30'}`}>{rank}</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 border border-white/10">
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-black text-white/50">{p.name.slice(0, 1)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-bold text-white">{p.name}</div>
              <div className="truncate text-xs text-white/40">{p.team}</div>
            </div>
            <span className="text-lg font-black text-[#00ff00] tabular-nums">{p.value}</span>
            <span className="text-xs text-white/30">{unit}</span>
          </div>
        );
      })}
      {players.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-white/20">
          <Trophy className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-bold">暂无数据</p>
        </div>
      )}
    </div>
  );
}

// --- Teams panel ---
function TeamsPanel({ teams, unit }: { teams: TeamRowInsight[]; unit: string }) {
  const max = Math.max(...teams.map((t) => t.value), 1);
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
      {teams.map((t, idx) => (
        <div
          key={`${t.teamId}-${idx}`}
          className="flex items-center gap-4 border-b border-white/5 px-5 py-3 hover:bg-white/5 transition-colors last:border-0"
        >
          <span className={`w-6 text-center text-sm font-black ${idx < 3 ? 'text-[#00ff00]' : 'text-white/30'}`}>{idx + 1}</span>
          <TeamBadge teamName={t.teamName} season="2026" className="h-8 w-8 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center justify-between">
              <span className="truncate text-sm font-bold text-white">{t.teamName}</span>
              <span className="ml-2 text-sm font-black text-[#00ff00] tabular-nums shrink-0">{t.value} {unit}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#008000] transition-all duration-700"
                style={{ width: `${(t.value / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      {teams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-white/20">
          <Activity className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-bold">暂无数据</p>
        </div>
      )}
    </div>
  );
}

// --- Main page ---
export default function MatchesYearPage() {
  const params = useParams();
  const router = useRouter();
  const { username } = useUserStore();
  const year = (params?.year as string) || '2026';

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof typeof tabToHash>('schedule');
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [playerRankings, setPlayerRankings] = useState<Record<string, PlayerRanking[]>>({});
  const [teamRankings, setTeamRankings] = useState<Record<string, TeamRowInsight[]>>({});
  const [activePlayerTab, setActivePlayerTab] = useState<string>('goals');
  const [activeTeamTab, setActiveTeamTab] = useState<string>('goals_for');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('全部');
  const [loading, setLoading] = useState(true);

  // Sync hash to tab
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace('#', '');
    if (hash && hashToTab[hash]) setActiveTab(hashToTab[hash]);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch matches and standings
  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [matchRes, standRes] = await Promise.all([
          fetch(`http://localhost:5002/api/matches?year=${year}`),
          fetch(`http://localhost:5002/api/matches/standings/${year}`),
        ]);
        const matchJson = await matchRes.json();
        const standJson = await standRes.json();
        if (!alive) return;
        if (matchJson.code === 200 && matchJson.data) {
          setMatches(matchJson.data.map((m: any) => applyMatchDisplayRules(m) as Match));
        }
        if (standJson.code === 200 && standJson.data) {
          setStandings(standJson.data);
        }
      } catch (e) { console.error(e); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [mounted, year]);

  // Fetch player rankings
  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    (async () => {
      const results: Record<string, PlayerRanking[]> = {};
      await Promise.all(
        playerRankingTabs.map(async (tab) => {
          try {
            const res = await fetch(`http://localhost:5002/api/matches/rankings/players/${tab.key}?year=${year}`);
            const json = await res.json();
            if (alive && json.code === 200 && json.data) results[tab.key] = json.data;
          } catch { /* ignore */ }
        })
      );
      if (alive) setPlayerRankings(results);
    })();
    return () => { alive = false; };
  }, [mounted, year]);

  // Fetch team rankings
  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    (async () => {
      const results: Record<string, TeamRowInsight[]> = {};
      await Promise.all(
        teamRankingTabs.map(async (tab) => {
          try {
            const res = await fetch(`http://localhost:5002/api/matches/rankings/teams/${tab.key}?year=${year}`);
            const json = await res.json();
            if (alive && json.code === 200 && json.data) results[tab.key] = json.data;
          } catch { /* ignore */ }
        })
      );
      if (alive) setTeamRankings(results);
    })();
    return () => { alive = false; };
  }, [mounted, year]);

  const handleTabChange = (tab: keyof typeof tabToHash) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tabToHash[tab]}`);
  };

  const teamNames = ['全部', ...Array.from(new Set(matches.flatMap((m) => [m.homeTeam, m.awayTeam]))).sort()];

  const filteredMatches = matches.filter((m) => {
    const teamOk = selectedTeam === '全部' || m.homeTeam === selectedTeam || m.awayTeam === selectedTeam;
    const searchOk = !searchQuery || matchesSearchQuery(m, searchQuery);
    return teamOk && searchOk;
  });

  const seasons = ['2026', '2025'];

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen text-white">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/pexels-markusspiske-114296.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-black/70" />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] text-white/75 hover:text-white transition-all">首页</Link>
            <Link href="/matches" className="text-[17px] text-white border-b-2 border-[#00ff00] pb-0.5">赛事</Link>
            <Link href="/teams" className="text-[17px] text-white/75 hover:text-white transition-all">球员/球队</Link>
            <Link href="/community?tab=quiz" className="text-[17px] text-white/75 hover:text-white transition-all">互动</Link>
            <Link href="/shop" className="text-[17px] text-white/75 hover:text-white transition-all">周边商城</Link>
            <Link href="/analysis/upload" className="text-[17px] text-white/75 hover:text-white transition-all">视频分析</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[280px] h-[36px] bg-white/10 rounded-full flex items-center border border-white/20 overflow-hidden">
              <input
                type="text"
                placeholder="搜索比赛、球队、球员..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-full bg-transparent outline-none px-4 text-[13px] text-white placeholder:text-white/40"
              />
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

      {/* Main content */}
      <div className="relative z-10 w-[1200px] mx-auto px-4 py-10">
        {/* Season selector */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-sm font-bold text-white/40 mr-2">赛季</span>
          {seasons.map((s) => (
            <button
              key={s}
              onClick={() => router.push(`/matches/${s}#${tabToHash[activeTab]}`)}
              className={`rounded-full px-5 py-2 text-sm font-bold border transition-all ${
                s === year
                  ? s === '2026'
                    ? 'bg-[#008000]/80 text-white border-[#008000]'
                    : 'bg-white/10 text-white border-white/20'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-8 items-start">
          {/* Sidebar */}
          <aside className="w-[220px] shrink-0">
            <div className="rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-2xl p-3 flex flex-col gap-1">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition-all ${
                    activeTab === tab.key
                      ? 'bg-[#008000]/80 text-white border border-[#008000]'
                      : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {/* Schedule */}
              {activeTab === 'schedule' && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  {/* Team filter */}
                  <div className="rounded-[2rem] border border-white/10 bg-black/40 backdrop-blur-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {teamNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => setSelectedTeam(name)}
                          className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                            selectedTeam === name
                              ? 'bg-[#008000]/80 text-white'
                              : 'text-white/60 hover:bg-white/5'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-24">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#008000] border-t-transparent" />
                    </div>
                  ) : filteredMatches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-white/20">
                      <Calendar className="h-12 w-12 mb-4 opacity-30" />
                      <p className="text-lg font-bold">暂无赛事数据</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                      <AnimatePresence>
                        {filteredMatches.map((match) => (
                          <MatchCard key={match.id} match={match} year={year} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Standings */}
              {activeTab === 'standings' && (
                <motion.div
                  key="standings"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-24">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#008000] border-t-transparent" />
                    </div>
                  ) : (
                    <StandingsPanel standings={standings} />
                  )}
                </motion.div>
              )}

              {/* Players */}
              {activeTab === 'players' && (
                <motion.div
                  key="players"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <GlassSegmentedTabs
                    tabs={playerRankingTabs.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))}
                    active={activePlayerTab}
                    onChange={setActivePlayerTab}
                  />
                  <PlayersPanel
                    players={playerRankings[activePlayerTab] || []}
                    unit={playerRankingTabs.find((t) => t.key === activePlayerTab)?.unit || ''}
                  />
                </motion.div>
              )}

              {/* Teams */}
              {activeTab === 'teams' && (
                <motion.div
                  key="teams"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-4"
                >
                  <GlassSegmentedTabs
                    tabs={teamRankingTabs.map((t) => ({ key: t.key, label: t.label }))}
                    active={activeTeamTab}
                    onChange={setActiveTeamTab}
                  />
                  <TeamsPanel
                    teams={teamRankings[activeTeamTab] || []}
                    unit={teamRankingTabs.find((t) => t.key === activeTeamTab)?.unit || ''}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
