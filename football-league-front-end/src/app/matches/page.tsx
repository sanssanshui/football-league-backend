"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, User, LogIn } from "lucide-react";

// --- 1. 类型定义 (严格对应 HTML 数据结构) ---
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
  timestamp: Date;
}

// --- 2. 常量数据 (移植自 HTML) ---
const teamsData: Team[] = [
  { id: 't1', name: '国际米兰', short: '国米', logoColor: '#0066b3' },
  { id: 't2', name: 'AC米兰', short: '米兰', logoColor: '#c91a1a' },
  { id: 't3', name: '皇家马德里', short: '皇马', logoColor: '#f7b731' },
  { id: 't4', name: '巴塞罗那', short: '巴萨', logoColor: '#a50044' },
  { id: 't5', name: '曼联', short: '曼联', logoColor: '#da291c' },
  { id: 't6', name: '利物浦', short: '红军', logoColor: '#c8102e' },
  { id: 't7', name: '拜仁慕尼黑', short: '拜仁', logoColor: '#dc052d' },
  { id: 't8', name: '巴黎圣日耳曼', short: '巴黎', logoColor: '#004170' }
];

const matchesData: Match[] = [
  { id: 'm1', round: '第1轮', datetime: '5月20日 19:30', location: '梅阿查球场', status: '待开始', homeTeamId: 't1', homeTeam: '国际米兰', awayTeamId: 't2', awayTeam: 'AC米兰', homePossession: 54, awayPossession: 46, homeShots: 8, awayShots: 3, homeLogoColor: '#0066b3', awayLogoColor: '#c91a1a', timestamp: new Date(2026, 4, 20, 19, 30) },
  { id: 'm2', round: '第3轮', datetime: '5月25日 21:00', location: '梅阿查球场', status: '进行中', homeTeamId: 't1', homeTeam: '国际米兰', awayTeamId: 't4', awayTeam: '巴塞罗那', homePossession: 61, awayPossession: 39, homeShots: 12, awayShots: 5, homeLogoColor: '#0066b3', awayLogoColor: '#a50044', timestamp: new Date(2026, 4, 25, 21, 0) },
  { id: 'm3', round: '第5轮', datetime: '5月28日 18:00', location: '安联球场', status: '已完结', homeTeamId: 't7', homeTeam: '拜仁慕尼黑', awayTeamId: 't1', awayTeam: '国际米兰', homePossession: 58, awayPossession: 42, homeShots: 14, awayShots: 6, homeLogoColor: '#dc052d', awayLogoColor: '#0066b3', timestamp: new Date(2026, 4, 28, 18, 0) },
  { id: 'm4', round: '第2轮', datetime: '6月2日 20:45', location: '梅阿查球场', status: '待开始', homeTeamId: 't1', homeTeam: '国际米兰', awayTeamId: 't5', awayTeam: '曼联', homePossession: 52, awayPossession: 48, homeShots: 9, awayShots: 7, homeLogoColor: '#0066b3', awayLogoColor: '#da291c', timestamp: new Date(2026, 5, 2, 20, 45) },
  { id: 'm5', round: '第2轮', datetime: '5月22日 19:30', location: '圣西罗球场', status: '待开始', homeTeamId: 't2', homeTeam: 'AC米兰', awayTeamId: 't8', awayTeam: '巴黎圣日耳曼', homePossession: 47, awayPossession: 53, homeShots: 6, awayShots: 9, homeLogoColor: '#c91a1a', awayLogoColor: '#004170', timestamp: new Date(2026, 4, 22, 19, 30) },
  { id: 'm6', round: '第4轮', datetime: '5月26日 21:00', location: '安联球场', status: '进行中', homeTeamId: 't7', homeTeam: '拜仁慕尼黑', awayTeamId: 't2', awayTeam: 'AC米兰', homePossession: 64, awayPossession: 36, homeShots: 15, awayShots: 2, homeLogoColor: '#dc052d', awayLogoColor: '#c91a1a', timestamp: new Date(2026, 4, 26, 21, 0) },
  { id: 'm7', round: '第3轮', datetime: '5月30日 18:30', location: '圣西罗球场', status: '已完结', homeTeamId: 't2', homeTeam: 'AC米兰', awayTeamId: 't3', awayTeam: '皇家马德里', homePossession: 44, awayPossession: 56, homeShots: 7, awayShots: 11, homeLogoColor: '#c91a1a', awayLogoColor: '#f7b731', timestamp: new Date(2026, 4, 30, 18, 30) },
  { id: 'm8', round: '第1轮', datetime: '5月23日 22:00', location: '伯纳乌', status: '已完结', homeTeamId: 't3', homeTeam: '皇家马德里', awayTeamId: 't6', awayTeam: '利物浦', homePossession: 55, awayPossession: 45, homeShots: 13, awayShots: 8, homeLogoColor: '#f7b731', awayLogoColor: '#c8102e', timestamp: new Date(2026, 4, 23, 22, 0) },
  { id: 'm9', round: '第4轮', datetime: '5月29日 20:00', location: '诺坎普', status: '待开始', homeTeamId: 't4', homeTeam: '巴塞罗那', awayTeamId: 't3', awayTeam: '皇家马德里', homePossession: 51, awayPossession: 49, homeShots: 10, awayShots: 10, homeLogoColor: '#a50044', awayLogoColor: '#f7b731', timestamp: new Date(2026, 4, 29, 20, 0) },
  { id: 'm10', round: '第6轮', datetime: '6月5日 19:30', location: '老特拉福德', status: '待开始', homeTeamId: 't5', homeTeam: '曼联', awayTeamId: 't7', awayTeam: '拜仁慕尼黑', homePossession: 48, awayPossession: 52, homeShots: 7, awayShots: 9, homeLogoColor: '#da291c', awayLogoColor: '#dc052d', timestamp: new Date(2026, 5, 5, 19, 30) },
  { id: 'm11', round: '第7轮', datetime: '6月8日 21:00', location: '王子公园', status: '进行中', homeTeamId: 't8', homeTeam: '巴黎圣日耳曼', awayTeamId: 't6', awayTeam: '利物浦', homePossession: 59, awayPossession: 41, homeShots: 11, awayShots: 4, homeLogoColor: '#004170', awayLogoColor: '#c8102e', timestamp: new Date(2026, 5, 8, 21, 0) },
];

export default function MatchDetailPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string>('t1');

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- 数据筛选逻辑 ---
  const filteredMatches = matchesData
    .filter(m => m.homeTeamId === activeTeamId || m.awayTeamId === activeTeamId)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen bg-white transition-colors duration-300 overflow-x-hidden">
      
      {/* ===== 复刻 HTML 导航栏 ===== */}
      <nav className="w-full h-[80px] bg-[#008000] sticky top-0 z-50 shadow-md">
        <div className="w-[1300px] h-full mx-auto flex items-center justify-between px-0">
          <div className="flex items-center gap-10 ml-5">
            <Link href="/" className="text-[20px] font-medium text-white hover:font-bold transition-all">
              首页
            </Link>
            <Link href="/matches" className="text-[24px] font-bold text-white border-b-2 border-white pb-1">
              赛事
            </Link>
            <Link href="/teams" className="text-[20px] font-medium text-white hover:font-bold transition-all">
              球员/球队
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

      {/* ===== 复刻 HTML 主内容区 ===== */}
      <div className="px-[120px] pb-[80px] pt-[60px] max-w-[1540px] mx-auto">
        <div className="flex gap-[50px] items-start">
          
          {/* --- 左侧球队列表 (250px) --- */}
          <div className="w-[250px] h-[700px] overflow-y-auto overflow-x-hidden bg-[#f5f5f5] rounded scrollbar-thin">
            {teamsData.map(team => {
              const shortName = team.name.slice(0, 2);
              return (
                <div
                  key={team.id}
                  onClick={() => setActiveTeamId(team.id)}
                  className={`w-[250px] h-[70px] flex items-center px-[30px] cursor-pointer transition-colors border-b border-white/10 ${
                    activeTeamId === team.id ? 'bg-[#006600]' : 'bg-[#008000]'
                  } hover:bg-[#006600]`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mr-5 text-base font-bold uppercase"
                    style={{ backgroundColor: team.logoColor, color: '#fff' }}
                  >
                    {shortName}
                  </div>
                  <span className="font-['Inter'] text-[20px] font-medium text-white whitespace-nowrap">
                    {team.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* --- 右侧比赛卡片 (1000px) --- */}
          <div className="w-[1000px] max-h-[780px] overflow-y-auto overflow-x-hidden pr-1.5 flex flex-col gap-5 scrollbar-thin">
            {filteredMatches.length === 0 ? (
              <div className="w-full py-10 text-center text-[#888]">暂无该队比赛</div>
            ) : (
              filteredMatches.map(match => {
                const homeShort = match.homeTeam.slice(0, 2).toUpperCase();
                const awayShort = match.awayTeam.slice(0, 2).toUpperCase();
                const isFinished = match.status === '已完结';
                const isLive = match.status === '进行中';
                
                return (
                  <div
                    key={match.id}
                    className={`w-[1000px] min-h-[150px] bg-white border border-[#e6e6e6] px-[100px] py-6 flex items-center justify-between shadow-[0_2px_6px_rgba(0,0,0,0.02)] transition-all box-border ${
                      isFinished ? 'text-black/50' : ''
                    }`}
                  >
                    {/* 左侧：赛事信息 */}
                    <div className="font-['Roboto'] text-base leading-5 w-[160px]">
                      <div className="font-medium mb-1 text-black/50">{match.round}</div>
                      <div className="text-black/70">{match.datetime}</div>
                      <div className="text-sm text-black/55 mt-1 mb-0.5">🏟️ {match.location}</div>
                      <div className={`font-semibold mt-1 ${
                        isLive ? 'text-[#FF6700]' : isFinished ? 'text-black/50' : 'text-black opacity-80'
                      }`}>
                        {match.status}
                      </div>
                    </div>

                    {/* 中间：对阵双方 */}
                    <div className="font-['Roboto'] text-[20px] font-medium flex items-center justify-center flex-1 mx-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm text-white font-bold uppercase"
                          style={{ backgroundColor: match.homeLogoColor || '#008000' }}
                        >
                          {homeShort}
                        </div>
                        <span>{match.homeTeam}</span>
                      </div>
                      <span className={`mx-10 font-semibold ${isFinished ? 'text-black/40' : 'text-[#444]'}`}>vs</span>
                      <div className="flex items-center gap-3">
                        <span>{match.awayTeam}</span>
                        <div
                          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm text-white font-bold uppercase"
                          style={{ backgroundColor: match.awayLogoColor || '#cc6b2c' }}
                        >
                          {awayShort}
                        </div>
                      </div>
                    </div>

                    {/* 右侧：数据统计 */}
                    <div className="font-['Roboto'] text-base leading-5 w-[180px] text-right">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-black/65">主队控球率：</span>
                        <span className="font-medium">{match.homePossession}%</span>
                      </div>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-black/65">主队射门：</span>
                        <span className={`font-semibold ${isFinished ? 'text-[#2e7d32]/60' : 'text-[#2e7d32]'}`}>
                          {match.homeShots}
                        </span>
                      </div>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-black/65">客队控球率：</span>
                        <span className="font-medium">{match.awayPossession}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/65">客队射门：</span>
                        <span className="font-medium">{match.awayShots}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

      {/* 底部占位 */}
      <div className="h-[20px]"></div>
    </main>
  );
}