"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, User, LogIn, Calendar, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- 1. 类型定义 (与后端 GraphQL 对应) ---
type Team = {
  id: string;
  name: string;
  short: string;
  logoColor: string;
};

type MatchStatus = "待开始" | "进行中" | "已完结";

interface Match {
  id: string;
  round: string;
  datetime: string;
  location: string;
  status: MatchStatus;
  homeTeamId: string;
  homeTeam: string;
  awayTeamId: string;
  awayTeam: string;
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeLogoColor: string;
  awayLogoColor: string;
  score: string;
  timestamp: string;
}

// 模拟获取全部 13 只参赛苏超队伍（全集展示而非4支）
const TEAMS_DATA: Team[] = [
  { id: '1', name: '南京城市', short: '南京', logoColor: '#0066b3' },
  { id: '2', name: '苏州东吴', short: '苏州', logoColor: '#c91a1a' },
  { id: '3', name: '无锡吴钩', short: '无锡', logoColor: '#f7b731' },
  { id: '4', name: '南通支云', short: '南通', logoColor: '#a50044' },
  { id: '5', name: '徐州骁龙', short: '徐州', logoColor: '#8a2be2' },
  { id: '6', name: '常州龙城', short: '常州', logoColor: '#ff8c00' },
  { id: '7', name: '连云港海港', short: '连港', logoColor: '#20b2aa' },
  { id: '8', name: '淮安楚州', short: '淮安', logoColor: '#d2691e' },
  { id: '9', name: '盐城大丰', short: '盐城', logoColor: '#4682b4' },
  { id: '10', name: '扬州瘦西湖', short: '扬州', logoColor: '#9acd32' },
  { id: '11', name: '镇江金山', short: '镇江', logoColor: '#5f9ea0' },
  { id: '12', name: '泰州远大', short: '泰州', logoColor: '#ff4500' },
  { id: '13', name: '宿迁项王', short: '宿迁', logoColor: '#2e8b57' },
];

export default function MatchDetailPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeSeason, setActiveSeason] = useState<'2025' | '2026'>('2026'); // 新增赛季切换
  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'standings' | 'players'>('schedule'); // 四合一子板块切换 (已移除独立 Teams Tab)
  const [activeTeamId, setActiveTeamId] = useState<string>('0'); // '0' 为全部球队
  const [searchQuery, setSearchQuery] = useState(''); // 新增搜索状态
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- GraphQL Fetch Engine ---
  const fetchMatchesGraphQL = async (season: string) => {
    setLoading(true);
    try {
      const query = `
        query GetMatchesBySeason($season: String!) {
          getMatchesBySeason(season: $season) {
            id
            round
            datetime
            location
            status
            homeTeamId
            homeTeam
            awayTeamId
            awayTeam
            homePossession
            awayPossession
            homeShots
            awayShots
            homeLogoColor
            awayLogoColor
            score
            timestamp
          }
        }
      `;

      const res = await fetch('http://localhost:5002/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { season },
        }),
      });

      const { data, errors } = await res.json();
      if (errors) {
        console.error('GraphQL Errors:', errors);
      } else {
        setMatches(data.getMatchesBySeason);
      }
    } catch (e) {
      console.error('Failed to fetch GraphQL matches:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandings = async (season: string) => {
    try {
      const res = await fetch(`http://localhost:5002/api/matches/standings/${season}`);
      const json = await res.json();
      if (json.code === 200) {
         setStandings(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch standings:', e);
    }
  };

  const fetchPlayers = async (season: string) => {
    try {
      const res = await fetch(`http://localhost:5002/api/matches/players/ranking/${season}`);
      const json = await res.json();
      if (json.code === 200) {
         setPlayers(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch players:', e);
    }
  };

  useEffect(() => {
    setMounted(true);
    // 初次进页面加载 2026 赛季
    fetchMatchesGraphQL(activeSeason);
    fetchStandings(activeSeason);
    fetchPlayers(activeSeason);
    
    // 如果是 2026，我们可以开一个大轮询（类似于 Live Polling）实现无刷新。
    // 这完全替代了以前丑陋死等，真正意义展示实时效果。
    let interval: NodeJS.Timeout;
    if (activeSeason === '2026') {
        interval = setInterval(() => { fetchMatchesGraphQL('2026'); }, 15000); 
    }
    return () => {
        if(interval) clearInterval(interval);
    }
  }, [activeSeason]);

  // 分流渲染数据：基于选择的队伍与搜索文本
  const filteredMatches = matches.filter(m => {
    const matchTeamId = activeTeamId === '0' || String(m.homeTeamId) === activeTeamId || String(m.awayTeamId) === activeTeamId || m.homeTeam.includes(TEAMS_DATA.find(t=>t.id===activeTeamId)?.name || 'NONE') || m.awayTeam.includes(TEAMS_DATA.find(t=>t.id===activeTeamId)?.name || 'NONE');
    const matchSearch = m.homeTeam.includes(searchQuery) || m.awayTeam.includes(searchQuery) || m.round.includes(searchQuery) || m.datetime.includes(searchQuery);
    return matchTeamId && matchSearch;
  });

  if (!mounted) return null;

  return (
    <main 
      className="relative min-h-screen transition-colors duration-300 overflow-x-hidden bg-cover bg-fixed bg-center"
      style={{ backgroundImage: "url('/images/homepage_dark.jpg')" }}
    >
      {/* 极简浅色明亮遮罩，契合主站白净玻璃基调 */}
      <div className="absolute inset-0 bg-white/70 z-0"></div>
      
      {/* ===== 导航栏 ===== */}
      <nav className="w-full h-[80px] bg-white/40 backdrop-blur-md sticky top-0 z-50 border-b border-black/5 shadow-sm">
        <div className="w-[1300px] h-full mx-auto flex items-center justify-between px-0">
          <div className="flex items-center gap-10 ml-5">
            <Link href="/" className="text-[20px] font-medium text-slate-600 hover:text-slate-900 transition-all">
              首页
            </Link>
            <Link href="/matches" className="text-[24px] font-bold text-emerald-600 border-b-2 border-emerald-600 pb-1">
              赛事信息全览
            </Link>
            <Link href="/community" className="text-[20px] font-medium text-slate-600 hover:text-slate-900 transition-all">
              互动
            </Link>
          </div>

          <div className="flex items-center gap-10 mr-5">
            <div className="w-[300px] h-[40px] bg-white/50 backdrop-blur-sm rounded-full flex items-center overflow-hidden border border-slate-300">
              <input 
                type="text" 
                placeholder="探索赛事或队伍..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-none px-5 text-[15px] text-slate-800 placeholder:text-slate-400 font-light"
              />
              <Search className="w-5 h-5 text-slate-400 mr-4" />
            </div>
          </div>
        </div>
      </nav>

      {/* ===== 主内容区 ===== */}
      <div className="relative z-10 px-[120px] pb-[80px] pt-[40px] max-w-[1540px] mx-auto">
        
        {/* === 顶部赛季控制台 (2025/2026切换) === */}
        <div className="flex items-center justify-start gap-5 mb-8">
            <button 
                onClick={() => setActiveSeason('2026')}
                className={`px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition-all shadow-lg ${activeSeason === '2026' ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-400 border border-emerald-300' : 'bg-white/60 text-slate-600 hover:bg-white border border-slate-200'}`}>
                <Activity size={20} className={activeSeason === '2026' ? 'animate-pulse' : ''} /> 2026赛季 (当前实施打榜)
            </button>
            <button 
                onClick={() => setActiveSeason('2025')}
                className={`px-8 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition-all shadow-lg ${activeSeason === '2025' ? 'bg-slate-600 text-white shadow-slate-500/30 ring-2 ring-slate-400 border border-slate-300' : 'bg-white/60 text-slate-600 hover:bg-white border border-slate-200'}`}>
                <Calendar size={20} /> 2025赛季 (静态史料归档)
            </button>
        </div>

        {/* === 顶部四合一子板块切换 === */}
        <div className="flex items-center gap-2 mb-8 bg-white/40 p-2 rounded-full w-fit backdrop-blur-md border border-white/60 shadow-sm">
            {['schedule', 'standings', 'teams', 'players'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab as any)}
                className={`px-6 py-2 rounded-full font-bold text-[15px] transition-all ${
                  activeSubTab === tab ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                {tab === 'schedule' ? '赛程' : tab === 'standings' ? '积分榜' : tab === 'teams' ? '球队榜' : '球员榜'}
              </button>
            ))}
        </div>

        {/* 明亮磨砂玻璃质感的底层容器 */}
        <div className="flex gap-[50px] items-start bg-white/40 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60">
          
          {/* --- 左侧球队列表全集 (300px) --- */}
          <div className="w-[300px] h-[750px] overflow-y-auto overflow-x-hidden bg-white/60 backdrop-blur-md rounded-2xl shadow-inner scrollbar-thin border border-slate-200/50">
            {/* 全部赛事按钮 */}
             <div
                  onClick={() => setActiveTeamId('0')}
                  className={`w-full h-[70px] flex items-center px-[30px] cursor-pointer transition-all border-b border-black/5 ${
                    activeTeamId === '0' ? 'bg-emerald-500/90 text-white shadow-md' : 'hover:bg-slate-100/50 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-[18px] tracking-widest pl-2">🌏 显示全省对局</span>
            </div>

            {TEAMS_DATA.map(team => {
              const shortName = team.name.slice(0, 2);
              return (
                <div
                  key={team.id}
                  onClick={() => setActiveTeamId(team.id)}
                  className={`w-full h-[70px] flex items-center px-[30px] cursor-pointer transition-all border-b border-black/5 ${
                    activeTeamId === team.id ? 'bg-emerald-500/90 text-white shadow-md' : 'hover:bg-slate-100/50 text-slate-700'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-5 text-[15px] font-bold shadow-sm"
                    style={{ backgroundColor: team.logoColor, color: '#fff' }}
                  >
                    {shortName}
                  </div>
                  <span className="font-['Inter'] text-[18px] font-medium whitespace-nowrap">
                    {team.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* --- 右侧比赛巨幕 (1000px) --- */}
          <div className="flex-1 max-h-[750px] overflow-y-auto overflow-x-hidden pr-2 flex flex-col gap-6 scrollbar-thin">
            {activeSubTab === 'standings' ? (
                <div className="w-full bg-white/70 backdrop-blur-2xl border border-white/80 rounded-2xl p-8 shadow-lg">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6">{activeSeason} 赛季积分榜</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 border-emerald-500/20 text-slate-600 font-bold">
                                    <th className="py-4 px-4 w-16">排名</th>
                                    <th className="py-4 px-4">球队</th>
                                    <th className="py-4 px-2 w-16 text-center">场次</th>
                                    <th className="py-4 px-2 w-16 text-center">胜</th>
                                    <th className="py-4 px-2 w-16 text-center">平</th>
                                    <th className="py-4 px-2 w-16 text-center">负</th>
                                    <th className="py-4 px-2 w-24 text-center">进/失</th>
                                    <th className="py-4 px-4 w-20 text-center font-black text-emerald-600">积分</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map((team, index) => (
                                    <tr key={team.teamId} className={`border-b border-black/5 hover:bg-white/60 transition-colors ${index < 3 ? 'font-medium' : ''}`}>
                                        <td className="py-4 px-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-amber-400 text-white' : index === 1 ? 'bg-slate-300 text-slate-700' : index === 2 ? 'bg-amber-700/60 text-white' : 'text-slate-500'}`}>
                                                {team.rank}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-800 text-lg">{team.teamName}</td>
                                        <td className="py-4 px-2 text-center text-slate-600">{team.played}</td>
                                        <td className="py-4 px-2 text-center text-emerald-600">{team.won}</td>
                                        <td className="py-4 px-2 text-center text-slate-500">{team.drawn}</td>
                                        <td className="py-4 px-2 text-center text-red-500">{team.lost}</td>
                                        <td className="py-4 px-2 text-center text-slate-600">{team.goalsFor}/{team.goalsAgainst}</td>
                                        <td className="py-4 px-4 text-center text-2xl font-black text-emerald-600">{team.points}</td>
                                    </tr>
                                ))}
                                {standings.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-500">积分榜暂无数据</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeSubTab === 'players' ? (
                <div className="w-full bg-white/70 backdrop-blur-2xl border border-white/80 rounded-2xl p-8 shadow-lg">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6">{activeSeason} 赛季射手榜 TOP 50</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 border-emerald-500/20 text-slate-600 font-bold">
                                    <th className="py-4 px-4 w-16">排名</th>
                                    <th className="py-4 px-4">球员</th>
                                    <th className="py-4 px-4">所在球队</th>
                                    <th className="py-4 px-4 w-24 text-center font-black text-emerald-600">进球数</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((player, index) => (
                                    <tr key={index} className={`border-b border-black/5 hover:bg-white/60 transition-colors ${index < 3 ? 'font-medium' : ''}`}>
                                        <td className="py-4 px-4">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-amber-400 text-white' : index === 1 ? 'bg-slate-300 text-slate-700' : index === 2 ? 'bg-amber-700/60 text-white' : 'text-slate-500'}`}>
                                                {player.rank}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-slate-800 text-lg flex items-center gap-2">
                                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs text-slate-500">
                                                👕
                                            </div>
                                            {player.name}
                                        </td>
                                        <td className="py-4 px-4 text-slate-600">{player.team}</td>
                                        <td className="py-4 px-4 text-center text-2xl font-black text-emerald-600">{player.goals}</td>
                                    </tr>
                                ))}
                                {players.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-500">射手榜暂无数据（此赛季尚未产生进球）</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeSubTab !== 'schedule' ? (
                <div className="w-full h-[400px] flex flex-col items-center justify-center bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
                    <div className="text-6xl mb-6 opacity-30 grayscale saturate-0">📊</div>
                    <div className="text-2xl font-bold text-slate-700">数据板块即将上线</div>
                    <p className="text-base text-slate-500 mt-3 tracking-widest">请等待后续开发整合数据库聚合能力</p>
                </div>
            ) : loading ? (
                <div className="w-full h-[300px] flex flex-col items-center justify-center bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm animate-pulse">
                     <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                     <p className="text-slate-600 font-medium tracking-wide">GraphQL 数据管道穿梭中... {activeSeason}赛季正在同步</p>
                </div>
            ) : filteredMatches.length === 0 ? (
              <div className="w-full h-[400px] flex flex-col items-center justify-center bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm">
                  <div className="text-6xl mb-6 opacity-30 grayscale saturate-0">🏟️</div>
                  <div className="text-2xl font-bold text-slate-700">在 {activeSeason}赛季 中暂未截获参赛数据</div>
                  <p className="text-base text-slate-500 mt-3 tracking-widest">请等待爬虫引擎的下一轮 Tick 推送</p>
              </div>
            ) : (
              filteredMatches.map(match => {
                const homeShort = match.homeTeam.slice(0, 2).toUpperCase();
                const awayShort = match.awayTeam.slice(0, 2).toUpperCase();
                const isFinished = match.status === '已完结';
                const isLive = match.status === '进行中';
                
                // 转换日期到要求的格式：2026年 4月19日
                const d = new Date(match.timestamp);
                const displayDate = `${d.getFullYear()}年 ${d.getMonth()+1}月${d.getDate()}日`;

                return (
                  <div 
                    onClick={() => router.push(`/matches/${match.id}`)}
                    key={match.id} 
                    className="block w-full cursor-pointer"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`w-full min-h-[160px] bg-white/70 backdrop-blur-2xl border border-transparent rounded-2xl px-[60px] py-6 flex items-center justify-between shadow-lg hover:border-emerald-400 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all ${
                        isFinished ? 'opacity-70' : ''
                      }`}
                    >
                      {/* 左侧：赛事信息 */}
                      <div className="font-['Roboto'] text-sm leading-6 w-[180px]">
                        <div className="font-bold text-xl text-emerald-600 mb-1 tracking-wider">{match.round}</div>
                        <div className="text-slate-700 font-medium">{displayDate}</div>
                        <div className="text-slate-500 mt-1 mb-1 truncate">📍 {match.location}</div>
                        <div className={`font-black text-[16px] inline-flex items-center gap-1 ${
                          isLive ? 'text-amber-500 animate-pulse bg-amber-500/10 px-2 py-0.5 rounded' : isFinished ? 'text-slate-400' : 'text-emerald-500'
                        }`}>
                          {match.status} {isLive && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
                        </div>
                      </div>

                      <div className="font-['Oswald'] text-[24px] tracking-tight font-extrabold flex items-center justify-center flex-1 mx-2 text-slate-800 px-2 lg:px-6">
                        <div className="flex items-center gap-4 w-[160px] justify-end">
                          <span className="truncate text-right">{match.homeTeam}</span>
                          <div
                            className="w-[45px] h-[45px] flex-shrink-0 rounded-full flex items-center justify-center text-[16px] text-white font-bold shadow-md border-2 border-white/50"
                            style={{ backgroundColor: match.homeLogoColor || '#1f4e78' }}
                          >
                            {homeShort}
                          </div>
                        </div>
                        <div className="mx-4 flex flex-col items-center justify-center w-[100px]">
                            <span className={`text-4xl font-black drop-shadow-sm whitespace-nowrap ${isLive ? 'text-emerald-500' : 'text-slate-800'}`}>
                                {/* 修正 Score 格式 */}
                                {match.score ? match.score.replace('-', ' : ') : 'VS'}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 w-[160px] justify-start">
                          <div
                            className="w-[45px] h-[45px] flex-shrink-0 rounded-full flex items-center justify-center text-[16px] text-white font-bold shadow-md border-2 border-white/50"
                            style={{ backgroundColor: match.awayLogoColor || '#8b0000' }}
                          >
                            {awayShort}
                          </div>
                          <span className="truncate text-left">{match.awayTeam}</span>
                        </div>

                        {/* 咪咕直播跳转入口 */}
                        <div className="ml-6 flex flex-col gap-2">
                             <a 
                                href={`https://www.miguvideo.com/p/schedule/index.html?searchKey=${encodeURIComponent(match.homeTeam)}`} 
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-all shadow-sm"
                             >
                                📺 观看直播
                             </a>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}