"use client";

import { ReactNode, useState, useEffect, useRef, type ComponentType } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Search, Calendar, Activity, Trophy, MapPin, ChevronRight, Clock, Star, CircleDot, Square, ShieldAlert, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { applyMatchDisplayRules, hasPenaltyShootout, matchesSearchQuery, parseRegularScore } from "@/lib/match-display";
import TeamBadge from "@/components/team-badge";
import { TEAM_LIST } from "@/lib/team-branding";

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

export default function MatchListingPage() {
  const router = useRouter();
  const params = useParams();
  const urlYear = params?.year as string;
  const [mounted, setMounted] = useState(false);
  
  const initialSeason = (urlYear === '2025' || urlYear === '2026') ? urlYear : '2026';
  const [activeSeason, setActiveSeason] = useState<'2025' | '2026'>(initialSeason);
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'standings' | 'players' | 'teams'>('schedule');
  const [activeTeamName, setActiveTeamName] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [players, setPlayers] = useState<PlayerRanking[]>([]);
  const [teamRankings, setTeamRankings] = useState<TeamCategoryRanking[]>([]);
  const [activePlayerRankCategory, setActivePlayerRankCategory] = useState('goals');
  const [activeTeamRankCategory, setActiveTeamRankCategory] = useState('goals_for');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.location.hash) {
      const cleanHash = decodeURIComponent(window.location.hash.replace('#', ''));
      if (hashToTab[cleanHash]) setActiveSubTab(hashToTab[cleanHash]);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      const currentHash = window.location.hash;
      const targetHash = `#${encodeURIComponent(tabToHash[activeSubTab])}`;
      if (currentHash !== targetHash) window.location.hash = targetHash;
    }
  }, [activeSubTab, mounted]);

  useEffect(() => {
    if (mounted && (urlYear === '2025' || urlYear === '2026') && urlYear !== activeSeason) {
      setActiveSeason(urlYear);
    }
  }, [activeSeason, mounted, urlYear]);

  const fetchMatchesGraphQL = async (season: string) => {
    setLoading(true);
    try {
      const query = `query GetMatchesBySeason($season: String!) { getMatchesBySeason(season: $season) { id round datetime location status homeTeamId homeTeam awayTeamId awayTeam score timestamp homeLogoColor awayLogoColor homePenalties awayPenalties } }`;
      const res = await fetch('http://localhost:5002/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { season } }),
      });
      const json = await res.json();
      setMatches((json.data?.getMatchesBySeason || []).map(applyMatchDisplayRules));
    } catch (e) { 
      console.error("GraphQL Error:", e); 
      setMatches([]);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchStandings = async (season: string) => {
    try {
      const res = await fetch(`http://localhost:5002/api/matches/standings/${season}`);
      const json = await res.json();
      if (json.code === 200) setStandings(json.data);
    } catch (e) { console.error(e); }
  };

  const fetchPlayers = async (season: string, category: string) => {
    try {
      const res = await fetch(`http://localhost:5002/api/matches/players/ranking/${season}/${category}`);
      const json = await res.json();
      if (json.code === 200) setPlayers(json.data);
    } catch (e) { console.error(e); }
  };

  const fetchTeamRankings = async (season: string, category: string) => {
    try {
      const res = await fetch(`http://localhost:5002/api/matches/teams/ranking/${season}/${category}`);
      const json = await res.json();
      if (json.code === 200) setTeamRankings(json.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (mounted) {
      fetchMatchesGraphQL(activeSeason);
      fetchStandings(activeSeason);
      fetchPlayers(activeSeason, activePlayerRankCategory);
      fetchTeamRankings(activeSeason, activeTeamRankCategory);
    }
  }, [activeSeason, activePlayerRankCategory, activeTeamRankCategory, mounted]);

  const filteredMatches = matches.filter(m => {
    const matchTeam = activeTeamName === 'ALL' || m.homeTeam.includes(activeTeamName) || m.awayTeam.includes(activeTeamName);
    const matchSearch = matchesSearchQuery(m, searchQuery);
    return matchTeam && matchSearch;
  });

  const filteredPlayers = players.filter((player) => {
    const teamMatch = activeTeamName === 'ALL' || player.team?.includes(activeTeamName);
    const searchMatch = !searchQuery || player.name?.includes(searchQuery) || player.team?.includes(searchQuery);
    return teamMatch && searchMatch;
  });

  const filteredTeamRankings = teamRankings.filter((team) => {
    const teamMatch = activeTeamName === 'ALL' || team.teamName?.includes(activeTeamName);
    const searchMatch = !searchQuery || team.teamName?.includes(searchQuery);
    return teamMatch && searchMatch;
  });
  const activePlayerTab = playerRankingTabs.find((tab) => tab.key === activePlayerRankCategory) || playerRankingTabs[0];
  const activeTeamTab = teamRankingTabs.find((tab) => tab.key === activeTeamRankCategory) || teamRankingTabs[0];
  const maxTeamRankingValue = Math.max(...filteredTeamRankings.map((team) => team.value || 0), 1);
  const standingByName = new Map(standings.map((team) => [team.teamName, team]));
  const teamRowsWithInsights: TeamRowInsight[] = filteredTeamRankings.map((team) => ({
    ...team,
    standing: standingByName.get(team.teamName),
  }));

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/images/background.jpg')" }}>
      {/* 白色磨砂玻璃遮罩 */}
      <div className="absolute inset-0 bg-white/55 backdrop-blur-[2px] z-0" />
      {/* 顶部导航 */}
      <nav className="w-full h-20 bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-8">
          <div className="flex items-center gap-12">
            <Link href="/" className="text-2xl font-black text-slate-800 tracking-tighter group">
                <span className="group-hover:text-emerald-600 transition-colors">首页</span>
            </Link>
            <div className="flex items-center gap-8">
                <Link href="/matches" className="font-black text-emerald-600 border-b-2 border-emerald-600 pb-1">赛事资讯</Link>
                <Link href="/community" className="font-bold text-slate-400 hover:text-slate-800 transition-colors">互动社区</Link>
            </div>
          </div>
          <div className="w-80 h-11 bg-slate-100 rounded-full flex items-center px-5 border border-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shadow-inner">
            <input 
              type="text" placeholder="搜索比赛、日期、轮次或球队..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-700 placeholder:text-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {/* 赛季切换控制台 */}
        <div className="flex items-center gap-4 mb-10">
            <button 
                onClick={() => router.push(`/matches/2026#${tabToHash[activeSubTab]}`)} 
                className={`px-10 py-4 rounded-[1.5rem] font-black text-sm flex items-center gap-3 transition-all ${activeSeason === '2026' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                <Activity size={20} className={activeSeason === '2026' ? 'animate-pulse' : ''} /> 2026 赛季
            </button>
            <button 
                onClick={() => router.push(`/matches/2025#${tabToHash[activeSubTab]}`)} 
                className={`px-10 py-4 rounded-[1.5rem] font-black text-sm flex items-center gap-3 transition-all ${activeSeason === '2025' ? 'bg-slate-800 text-white shadow-xl shadow-slate-800/20' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                <Calendar size={20} /> 2025 赛季
            </button>
        </div>

        {/* 主内容布局 */}
        <div className="flex gap-10 items-start">
          {/* 左侧筛选侧边栏 */}
          <div className="w-80 space-y-4 sticky top-32">
            {/* Tab 切换 */}
            <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50">
                {sidebarTabs.map((tab) => (
                    <button 
                        key={tab.key} 
                        onClick={() => setActiveSubTab(tab.key)} 
                        className={`w-full px-6 py-4 rounded-[1.2rem] text-left font-black text-sm transition-all flex items-center justify-between group ${activeSubTab === tab.key ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {tab.label}
                        <ChevronRight size={18} className={`${activeSubTab === tab.key ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all'}`} />
                    </button>
                ))}
            </div>

            {/* 球队筛选 */}
            <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div onClick={() => setActiveTeamName('ALL')} className={`w-full px-6 py-4 rounded-[1.2rem] text-left font-black text-sm cursor-pointer transition-all ${activeTeamName === 'ALL' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>全部球队</div>
                <div className="max-h-[500px] overflow-y-auto scrollbar-hide py-2 space-y-1">
                    {TEAM_LIST.map((team, idx) => (
                        <div key={team.id || idx} onClick={() => setActiveTeamName(team.name)} className={`w-full px-6 py-3 rounded-[1rem] text-left font-bold text-sm cursor-pointer transition-all flex items-center gap-4 group ${activeTeamName === team.name ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <TeamBadge teamName={team.name} season={activeSeason} className="w-7 h-7 shrink-0" imageClassName="p-[10%]" />
                            {team.name}
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* 右侧主内容视窗 */}
          <div className="flex-1 min-h-[800px]">
             <AnimatePresence mode="wait">
                {activeSubTab === 'schedule' ? (
                    <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        {loading ? (
                            <div className="animate-pulse space-y-6">{[1,2,3].map(i=><div key={i} className="h-44 bg-white rounded-[2.5rem] border border-slate-200"></div>)}</div>
                        ) : filteredMatches.length === 0 ? (
                            <div className="bg-white rounded-[2.5rem] p-24 text-center border border-slate-200 shadow-sm">
                                <div className="text-7xl mb-8 opacity-20">🏟️</div>
                                <div className="text-2xl font-black text-slate-800 mb-2">未发现该赛季相关数据</div>
                                <p className="text-slate-400 font-medium tracking-widest">请等待爬虫引擎的下一轮 Tick 更新</p>
                            </div>
                        ) : (
                            filteredMatches.map((match, idx) => {
                                const regularScore = parseRegularScore(match.score);
                                const hasPenalties = hasPenaltyShootout(match);

                                return (
                                    <motion.div 
                                        key={match.id || idx} 
                                        onClick={() => router.push(`/matches/${activeSeason}/${match.id}`)} 
                                        className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)] hover:shadow-2xl hover:border-emerald-200 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center justify-between mb-8">
                                            <Badge className="bg-slate-100 text-slate-500 border-none font-black px-5 py-1.5">{match.round}</Badge>
                                            <div className="flex items-center gap-6 text-slate-400 text-xs font-black uppercase tracking-widest">
                                                <span className="flex items-center gap-2"><Clock size={16} className="text-emerald-500" /> {new Date(match.timestamp).toLocaleDateString('zh-CN')}</span>
                                                <span className="flex items-center gap-2"><MapPin size={16} className="text-emerald-500" /> {match.location || '江苏官方对局点'}</span>
                                                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black shadow-sm ${
                                                    match.status === '已完结'
                                                        ? 'border border-emerald-100 bg-emerald-50 text-emerald-600'
                                                        : match.status === '进行中'
                                                            ? 'border border-rose-100 bg-rose-50 text-rose-500'
                                                            : 'border border-slate-200 bg-slate-50 text-slate-500'
                                                }`}>
                                                    <span className={`h-2 w-2 rounded-full ${match.status === '已完结' ? 'bg-emerald-500' : match.status === '进行中' ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
                                                    {match.status}
                                                </span>
                                                <a
                                                    href={buildMiguScheduleUrl(match)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(event) => event.stopPropagation()}
                                                    className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[11px] font-black text-emerald-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20"
                                                >
                                                    <PlayCircle size={15} />
                                                    咪咕直播
                                                </a>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-around">
                                            <div className="flex flex-col items-center gap-5 flex-1">
                                                <TeamBadge teamName={match.homeTeam} season={activeSeason} className="w-20 h-20 transition-transform group-hover:scale-110" priority={idx < 4} />
                                                <span className="text-2xl font-black text-slate-800">{match.homeTeam}</span>
                                            </div>
                                            <div className="px-12 flex flex-col items-center gap-3 group-hover:scale-110 transition-transform">
                                                <div className="text-6xl font-black text-slate-800 tabular-nums drop-shadow-sm">
                                                    {`${regularScore.home} : ${regularScore.away}`}
                                                </div>
                                                {hasPenalties && (
                                                    <div className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-black tracking-[0.24em] text-slate-500 uppercase">
                                                        点球 [{match.homePenalties}] : [{match.awayPenalties}]
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-center gap-5 flex-1">
                                                <TeamBadge teamName={match.awayTeam} season={activeSeason} className="w-20 h-20 transition-transform group-hover:scale-110" priority={idx < 4} />
                                                <span className="text-2xl font-black text-slate-800">{match.awayTeam}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </motion.div>
                ) : activeSubTab === 'standings' ? (
                    <motion.div key="standings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white rounded-[2.5rem] p-12 border border-slate-200 shadow-2xl shadow-slate-200/50">
                        <h3 className="text-3xl font-black text-slate-800 mb-10 flex items-center gap-4"><Trophy className="text-amber-400 w-8 h-8" /> {activeSeason} 联赛积分榜</h3>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                    <th className="pb-8 px-4 w-20">排名</th><th className="pb-8">球队</th><th className="pb-8 text-center">赛</th><th className="pb-8 text-center">胜</th><th className="pb-8 text-center">平</th><th className="pb-8 text-center">负</th><th className="pb-8 text-center">进/失</th><th className="pb-8 text-right pr-6">积分</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map((team, idx) => (
                                    <tr key={team.teamId || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-8 px-4">
                                            <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-lg ${idx === 0 ? 'bg-yellow-400 text-white shadow-yellow-200' : idx === 1 ? 'bg-slate-300 text-slate-700' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td className="py-8 font-black text-slate-800 text-xl group-hover:text-emerald-600 transition-colors">{team.teamName}</td>
                                        <td className="py-8 text-center font-bold text-slate-500">{team.played}</td>
                                        <td className="py-8 text-center font-black text-emerald-600 text-xl">{team.won}</td>
                                        <td className="py-8 text-center font-bold text-slate-500">{team.drawn}</td>
                                        <td className="py-8 text-center font-bold text-red-500">{team.lost}</td>
                                        <td className="py-8 text-center font-bold text-slate-400 tabular-nums">{team.goalsFor ?? team.gf ?? 0}/{team.goalsAgainst ?? team.ga ?? 0}</td>
                                        <td className="py-8 text-right pr-6 font-black text-4xl text-emerald-600 tabular-nums">{team.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                ) : activeSubTab === 'players' ? (
                    <motion.div key="players" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white rounded-[2.5rem] p-12 border border-slate-200 shadow-2xl shadow-slate-200/50">
                        <div className="flex flex-col gap-6 mb-10">
                            <h3 className="text-3xl font-black text-slate-800 flex items-center gap-4"><Star className="text-emerald-400 w-8 h-8" /> {activeSeason} 球员榜</h3>
                            <GlassSegmentedTabs
                                tabs={playerRankingTabs}
                                activeKey={activePlayerRankCategory}
                                layoutId="player-ranking-glass"
                                onChange={setActivePlayerRankCategory}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {filteredPlayers.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between p-8 rounded-[1.8rem] bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
                                    <div className="flex items-center gap-8">
                                        <span className={`text-4xl font-black italic transition-colors ${idx < 3 ? 'text-emerald-500' : 'text-slate-200'}`}>{idx + 1}</span>
                                        <div
                                            className="w-14 h-14 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden text-slate-400 font-black"
                                            style={p.avatarUrl ? { backgroundImage: `url(${p.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                                        >
                                            {!p.avatarUrl && p.name.slice(0, 1)}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-2xl group-hover:text-emerald-600 transition-colors">{p.name}</div>
                                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{p.team}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-5xl font-black text-emerald-500 tabular-nums">{p.value ?? p.goals ?? 0}</div>
                                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{activePlayerTab.unit}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {filteredPlayers.length === 0 && (
                            <div className="mt-8 rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 px-8 py-12 text-center text-slate-400 font-bold">
                                当前筛选条件下暂无球员榜数据
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="teams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-12 border border-slate-200 shadow-2xl shadow-slate-200/50">
                            <div className="flex flex-col gap-6 mb-8">
                                <div className="flex items-center">
                                    <h3 className="text-3xl font-black text-slate-800 flex items-center gap-4"><Trophy className="text-emerald-500 w-8 h-8" /> {activeSeason} 球队榜</h3>
                                </div>
                                <GlassSegmentedTabs
                                    tabs={teamRankingTabs}
                                    activeKey={activeTeamRankCategory}
                                    layoutId="team-ranking-glass"
                                    onChange={setActiveTeamRankCategory}
                                />
                            </div>
                            <div className="overflow-hidden rounded-[2rem] border border-slate-100">
                                <div className="grid grid-cols-[76px_1.4fr_1fr_72px_86px_92px] items-center bg-slate-50 px-6 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                                    <span>排名</span>
                                    <span>球队</span>
                                    <span>{activeTeamTab.label}对比</span>
                                    <span className="text-center">赛</span>
                                    <span className="text-center">进/失</span>
                                    <span className="text-right">积分</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {teamRowsWithInsights.map((team, idx) => {
                                        const standing = team.standing;
                                        const goalsFor = standing?.goalsFor ?? standing?.gf ?? 0;
                                        const goalsAgainst = standing?.goalsAgainst ?? standing?.ga ?? 0;
                                        const percent = Math.max((team.value / maxTeamRankingValue) * 100, team.value > 0 ? 8 : 0);
                                        return (
                                            <motion.div
                                                key={team.teamId || team.teamName || idx}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.025 }}
                                                className="grid grid-cols-[76px_1.4fr_1fr_72px_86px_92px] items-center px-6 py-5 transition-colors hover:bg-emerald-50/50"
                                            >
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black shadow-lg ${idx === 0 ? 'bg-yellow-400 text-white shadow-yellow-200' : idx === 1 ? 'bg-slate-300 text-slate-700 shadow-slate-200' : idx === 2 ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-slate-100 text-slate-500 shadow-slate-100'}`}>{idx + 1}</div>
                                                <div className="flex items-center gap-4">
                                                    <TeamBadge teamName={team.teamName} season={activeSeason} className="h-11 w-11 shrink-0" />
                                                    <div>
                                                        <div className="text-lg font-black text-slate-800">{team.teamName}</div>
                                                        <div className="mt-1 text-xs font-bold text-slate-400">净胜球 {standing?.gd ?? goalsFor - goalsAgainst}</div>
                                                    </div>
                                                </div>
                                                <div className="pr-8">
                                                    <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-400">
                                                        <span>{activeTeamTab.label}</span>
                                                        <span className="text-emerald-600 tabular-nums">{team.value}{activeTeamTab.unit}</span>
                                                    </div>
                                                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percent}%` }}
                                                            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                                                            className="h-full rounded-full bg-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-center text-lg font-black text-slate-600 tabular-nums">{standing?.played ?? "-"}</div>
                                                <div className="text-center text-lg font-black text-slate-600 tabular-nums">{goalsFor}/{goalsAgainst}</div>
                                                <div className="text-right text-3xl font-black text-emerald-600 tabular-nums">{standing?.points ?? "-"}</div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                            {filteredTeamRankings.length === 0 && (
                                <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 px-8 py-12 text-center text-slate-400 font-bold">
                                    当前筛选条件下暂无球队榜数据
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
    return <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black transition-all ${className}`}>{children}</span>;
}

type GlassSegment = {
    key: string;
    label: string;
    icon?: ComponentType<{ className?: string }>;
};

function GlassSegmentedTabs({
    tabs,
    activeKey,
    layoutId,
    onChange,
}: {
    tabs: GlassSegment[];
    activeKey: string;
    layoutId: string;
    onChange: (key: string) => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const activeKeyRef = useRef(activeKey);
    const activeIndex = Math.max(tabs.findIndex((tab) => tab.key === activeKey), 0);
    const [indicator, setIndicator] = useState({ left: 8, top: 8, width: 0, height: 56 });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        activeKeyRef.current = activeKey;
    }, [activeKey]);

    useEffect(() => {
        const measure = () => {
            const activeButton = buttonRefs.current[activeIndex];
            if (!activeButton) return;
            setIndicator({
                left: activeButton.offsetLeft,
                top: activeButton.offsetTop,
                width: activeButton.offsetWidth,
                height: activeButton.offsetHeight,
            });
        };

        measure();
        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        if (trackRef.current && resizeObserver) resizeObserver.observe(trackRef.current);
        window.addEventListener('resize', measure);
        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [activeIndex, tabs.length]);

    const selectNearestTab = (clientX: number) => {
        let nearestIndex = activeIndex;
        let nearestDistance = Number.POSITIVE_INFINITY;

        buttonRefs.current.forEach((button, index) => {
            if (!button) return;
            const rect = button.getBoundingClientRect();
            const center = rect.left + rect.width / 2;
            const distance = Math.abs(center - clientX);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        const nextKey = tabs[nearestIndex]?.key;
        if (nextKey && nextKey !== activeKeyRef.current) {
            activeKeyRef.current = nextKey;
            onChange(nextKey);
        }
    };

    return (
        <div className="overflow-x-auto rounded-[2rem]">
            <div
                ref={trackRef}
                onPointerDown={(event) => {
                    setIsDragging(true);
                    event.currentTarget.setPointerCapture(event.pointerId);
                    selectNearestTab(event.clientX);
                }}
                onPointerMove={(event) => {
                    if (!isDragging) return;
                    selectNearestTab(event.clientX);
                }}
                onPointerUp={(event) => {
                    setIsDragging(false);
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    selectNearestTab(event.clientX);
                }}
                onPointerCancel={() => setIsDragging(false)}
                className="relative flex min-w-full gap-2 rounded-[2rem] border border-white/70 bg-slate-100/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_18px_45px_rgba(148,163,184,0.18)] backdrop-blur-xl"
            >
                <motion.div
                    key={layoutId}
                    animate={indicator}
                    transition={isDragging ? { type: 'spring', stiffness: 760, damping: 54, mass: 0.45 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }}
                    className="pointer-events-none absolute z-10 rounded-[1.45rem] border border-white/90 bg-white/[0.82] shadow-[0_16px_32px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl"
                />
                {tabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = activeKey === tab.key;

                    return (
                        <button
                            key={tab.key}
                            ref={(node) => {
                                buttonRefs.current[index] = node;
                            }}
                            type="button"
                            onClick={() => onChange(tab.key)}
                            className={`relative z-20 flex h-14 flex-1 basis-28 cursor-pointer select-none items-center justify-center gap-2 rounded-[1.45rem] px-4 text-sm font-black transition-colors duration-300 ${isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            {Icon && <Icon className={`h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} />}
                            <span className="truncate">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function TeamMetric({ label, value, accent = 'text-slate-800' }: { label: string; value: string | number; accent?: string }) {
    return (
        <div className="rounded-[1.4rem] bg-white border border-slate-100 px-5 py-4">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-300 mb-2">{label}</div>
            <div className={`text-2xl font-black tabular-nums ${accent}`}>{value}</div>
        </div>
    );
}
