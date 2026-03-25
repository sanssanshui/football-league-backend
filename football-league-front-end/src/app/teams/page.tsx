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
  coach: string;
  founded: string;
  stadium: string;
  honors: string[];
  stats: { fans: string; matches: string; titles: string };
};

type Player = {
  name: string;
  number: number;
  position: string;
  avatarColor: string;
  team: string;
};

// --- 2. 常量数据 (移植自 HTML) ---
const teamsData: Team[] = [
  {
    id: 't1', name: '国际米兰', short: '国米', logoColor: '#0066b3',
    coach: '西蒙尼·因扎吉', founded: '1908', stadium: '梅阿查球场',
    honors: ['意甲冠军', '欧冠冠军', '世俱杯'],
    stats: { fans: '143万', matches: '463', titles: '66' }
  },
  {
    id: 't2', name: 'AC米兰', short: '米兰', logoColor: '#c91a1a',
    coach: '斯特凡诺·皮奥利', founded: '1899', stadium: '圣西罗球场',
    honors: ['意甲冠军', '欧冠冠军', '欧洲超级杯'],
    stats: { fans: '137万', matches: '452', titles: '58' }
  },
  {
    id: 't3', name: '皇家马德里', short: '皇马', logoColor: '#f7b731',
    coach: '卡洛·安切洛蒂', founded: '1902', stadium: '伯纳乌球场',
    honors: ['西甲冠军', '欧冠冠军', '国王杯'],
    stats: { fans: '911万', matches: '515', titles: '150' }
  },
  {
    id: 't4', name: '巴塞罗那', short: '巴萨', logoColor: '#a50044',
    coach: '哈维·埃尔南德斯', founded: '1899', stadium: '诺坎普球场',
    honors: ['西甲冠军', '欧冠冠军', '国王杯'],
    stats: { fans: '876万', matches: '498', titles: '132' }
  },
  {
    id: 't5', name: '曼联', short: '曼联', logoColor: '#da291c',
    coach: '埃里克·滕哈赫', founded: '1878', stadium: '老特拉福德',
    honors: ['英超冠军', '欧冠冠军', '足总杯'],
    stats: { fans: '607万', matches: '489', titles: '105' }
  },
  {
    id: 't6', name: '利物浦', short: '红军', logoColor: '#c8102e',
    coach: '尤尔根·克洛普', founded: '1892', stadium: '安菲尔德',
    honors: ['英超冠军', '欧冠冠军', '世俱杯'],
    stats: { fans: '532万', matches: '472', titles: '97' }
  },
  {
    id: 't7', name: '拜仁慕尼黑', short: '拜仁', logoColor: '#dc052d',
    coach: '托马斯·图赫尔', founded: '1900', stadium: '安联球场',
    honors: ['德甲冠军', '欧冠冠军', '德国杯'],
    stats: { fans: '689万', matches: '503', titles: '143' }
  },
  {
    id: 't8', name: '巴黎圣日耳曼', short: '巴黎', logoColor: '#004170',
    coach: '路易斯·恩里克', founded: '1970', stadium: '王子公园',
    honors: ['法甲冠军', '法国杯', '法联杯'],
    stats: { fans: '511万', matches: '380', titles: '73' }
  }
];

const playersData: Record<string, Player[]> = {
  t1: [
    { name: '劳塔罗·马丁内斯', number: 10, position: '前锋', avatarColor: '#b5651d', team: '国际米兰' },
    { name: '尼科洛·巴雷拉', number: 23, position: '中场', avatarColor: '#2a6f97', team: '国际米兰' },
    { name: '亚历山德罗·巴斯托尼', number: 95, position: '后卫', avatarColor: '#4a7c59', team: '国际米兰' },
    { name: '亚恩·索默', number: 1, position: '门将', avatarColor: '#9c89b8', team: '国际米兰' },
    { name: '亨里克·姆希塔良', number: 22, position: '中场', avatarColor: '#b5838d', team: '国际米兰' },
    { name: '马库斯·图拉姆', number: 9, position: '前锋', avatarColor: '#6d6875', team: '国际米兰' },
  ],
  t2: [
    { name: '拉斐尔·莱奥', number: 10, position: '前锋', avatarColor: '#b5651d', team: 'AC米兰' },
    { name: '迈克·迈尼昂', number: 16, position: '门将', avatarColor: '#2a6f97', team: 'AC米兰' },
    { name: '特奥·埃尔南德斯', number: 19, position: '后卫', avatarColor: '#4a7c59', team: 'AC米兰' },
    { name: '桑德罗·托纳利', number: 8, position: '中场', avatarColor: '#9c89b8', team: 'AC米兰' },
    { name: '奥利维尔·吉鲁', number: 9, position: '前锋', avatarColor: '#b5838d', team: 'AC米兰' },
  ],
  t3: [
    { name: '卡里姆·本泽马', number: 9, position: '前锋', avatarColor: '#b5651d', team: '皇家马德里' },
    { name: '卢卡·莫德里奇', number: 10, position: '中场', avatarColor: '#2a6f97', team: '皇家马德里' },
    { name: '维尼修斯·儒尼奥尔', number: 7, position: '前锋', avatarColor: '#4a7c59', team: '皇家马德里' },
    { name: '安东尼奥·吕迪格', number: 22, position: '后卫', avatarColor: '#9c89b8', team: '皇家马德里' },
    { name: '蒂博·库尔图瓦', number: 1, position: '门将', avatarColor: '#b5838d', team: '皇家马德里' },
  ],
  t4: [
    { name: '罗伯特·莱万多夫斯基', number: 9, position: '前锋', avatarColor: '#b5651d', team: '巴塞罗那' },
    { name: '佩德里', number: 8, position: '中场', avatarColor: '#2a6f97', team: '巴塞罗那' },
    { name: '加维', number: 6, position: '中场', avatarColor: '#4a7c59', team: '巴塞罗那' },
    { name: '罗纳德·阿劳霍', number: 4, position: '后卫', avatarColor: '#9c89b8', team: '巴塞罗那' },
    { name: '马克-安德烈·特尔施特根', number: 1, position: '门将', avatarColor: '#b5838d', team: '巴塞罗那' },
  ],
  t5: [
    { name: '布鲁诺·费尔南德斯', number: 8, position: '中场', avatarColor: '#b5651d', team: '曼联' },
    { name: '马库斯·拉什福德', number: 10, position: '前锋', avatarColor: '#2a6f97', team: '曼联' },
    { name: '卡塞米罗', number: 18, position: '中场', avatarColor: '#4a7c59', team: '曼联' },
    { name: '利桑德罗·马丁内斯', number: 6, position: '后卫', avatarColor: '#9c89b8', team: '曼联' },
    { name: '安德烈·奥纳纳', number: 24, position: '门将', avatarColor: '#b5838d', team: '曼联' },
  ],
  t6: [
    { name: '穆罕默德·萨拉赫', number: 11, position: '前锋', avatarColor: '#b5651d', team: '利物浦' },
    { name: '维吉尔·范戴克', number: 4, position: '后卫', avatarColor: '#2a6f97', team: '利物浦' },
    { name: '阿利松·贝克尔', number: 1, position: '门将', avatarColor: '#4a7c59', team: '利物浦' },
    { name: '达尔文·努涅斯', number: 9, position: '前锋', avatarColor: '#9c89b8', team: '利物浦' },
  ],
  t7: [
    { name: '哈里·凯恩', number: 9, position: '前锋', avatarColor: '#b5651d', team: '拜仁慕尼黑' },
    { name: '托马斯·穆勒', number: 25, position: '中场', avatarColor: '#2a6f97', team: '拜仁慕尼黑' },
    { name: '约书亚·基米希', number: 6, position: '中场', avatarColor: '#4a7c59', team: '拜仁慕尼黑' },
    { name: '马泰斯·德利赫特', number: 4, position: '后卫', avatarColor: '#9c89b8', team: '拜仁慕尼黑' },
    { name: '曼努埃尔·诺伊尔', number: 1, position: '门将', avatarColor: '#b5838d', team: '拜仁慕尼黑' },
  ],
  t8: [
    { name: '基利安·姆巴佩', number: 7, position: '前锋', avatarColor: '#b5651d', team: '巴黎圣日耳曼' },
    { name: '奥斯曼·登贝莱', number: 10, position: '前锋', avatarColor: '#2a6f97', team: '巴黎圣日耳曼' },
    { name: '马尔科·维拉蒂', number: 6, position: '中场', avatarColor: '#4a7c59', team: '巴黎圣日耳曼' },
    { name: '马尔基尼奥斯', number: 5, position: '后卫', avatarColor: '#9c89b8', team: '巴黎圣日耳曼' },
    { name: '多纳鲁马', number: 99, position: '门将', avatarColor: '#b5838d', team: '巴黎圣日耳曼' },
  ]
};

export default function PlayerTeamPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState<string>('t1');
  const [followStatus, setFollowStatus] = useState<Record<string, boolean>>({
    t1: false, t2: false, t3: false, t4: false,
    t5: false, t6: false, t7: false, t8: false
  });
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 从 localStorage 加载关注状态
    const stored = localStorage.getItem('followedTeams');
    if (stored) {
      try {
        const followedArr = JSON.parse(stored);
        const newStatus: Record<string, boolean> = {
          t1: false, t2: false, t3: false, t4: false,
          t5: false, t6: false, t7: false, t8: false
        };
        followedArr.forEach((id: string) => {
          if (newStatus.hasOwnProperty(id)) newStatus[id] = true;
        });
        setFollowStatus(newStatus);
      } catch (e) {
        console.warn('解析关注数据失败，将重置');
        localStorage.removeItem('followedTeams');
      }
    }
  }, []);

  // 保存关注状态到 localStorage
  const saveFollowStatus = (newStatus: Record<string, boolean>) => {
    const followed = Object.keys(newStatus).filter(id => newStatus[id]);
    localStorage.setItem('followedTeams', JSON.stringify(followed));
  };

  // 切换关注状态
  const toggleFollow = (teamId: string) => {
    const newStatus = { ...followStatus, [teamId]: !followStatus[teamId] };
    setFollowStatus(newStatus);
    saveFollowStatus(newStatus);
  };

  // 获取当前球队和球员数据
  const currentTeam = teamsData.find(t => t.id === activeTeamId);
  const currentPlayers = playersData[activeTeamId] || [];

  if (!mounted || !currentTeam) return null;

  return (
    <main className="relative min-h-screen bg-white transition-colors duration-300 overflow-x-hidden">
      
      {/* ===== 复刻 HTML 导航栏 ===== */}
      <nav className="w-full h-[80px] bg-[#008000] sticky top-0 z-50 shadow-md">
        <div className="w-[1300px] h-full mx-auto flex items-center justify-between px-0">
          <div className="flex items-center gap-10 ml-5">
            <Link href="/" className="text-[20px] font-medium text-white hover:font-bold transition-all">
              首页
            </Link>
            <Link href="/matches" className="text-[20px] font-medium text-white hover:font-bold transition-all">
              赛事
            </Link>
            <Link href="/teams" className="text-[24px] font-bold text-white border-b-2 border-white pb-1">
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
      <div className="px-[100px] pb-[80px] pt-[60px] max-w-[1540px] mx-auto">
        <div className="flex gap-[50px] items-start">
          
          {/* --- 左侧球队列表 (250px) --- */}
          <div className="w-[260px] h-[700px] overflow-y-auto overflow-x-hidden bg-[#f5f5f5] rounded scrollbar-thin">
            {teamsData.map(team => {
              const logoChar = team.short.charAt(0);
              return (
                <div
                  key={team.id}
                  onClick={() => setActiveTeamId(team.id)}
                  className={`w-[250px] h-[70px] flex items-center px-4 cursor-pointer transition-colors border-b border-white/10 mx-auto ${
                    activeTeamId === team.id ? 'bg-[#006600]' : 'bg-[#008000]'
                  } hover:bg-[#006600]`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center mr-4 text-lg font-bold uppercase flex-shrink-0"
                    style={{ backgroundColor: team.logoColor, color: '#006600' }}
                  >
                    {logoChar}
                  </div>
                  <span className="font-['Inter'] text-[18px] font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px]">
                    {team.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* --- 右侧内容 (990px) --- */}
          <div className="w-[990px] flex flex-col gap-[50px]">
            
            {/* 球队介绍 */}
            <div className="bg-[#f9f9f9] border border-[#e0e0e0] px-8 py-5 font-['Roboto'] flex flex-wrap justify-between items-center">
              <div className="flex flex-col gap-2">
                <div className="text-[28px] font-bold text-[#1e1e1e]">{currentTeam.name}</div>
                <div className="flex gap-10 mt-2.5">
                  <span className="bg-[#008000] text-white px-3 py-1 rounded-full text-sm font-medium">粉丝 {currentTeam.stats.fans}</span>
                  <span className="bg-[#008000] text-white px-3 py-1 rounded-full text-sm font-medium">场次 {currentTeam.stats.matches}</span>
                  <span className="bg-[#008000] text-white px-3 py-1 rounded-full text-sm font-medium">荣誉 {currentTeam.stats.titles}</span>
                </div>
                <div className="flex gap-3.5 flex-wrap mt-2">
                  {currentTeam.honors.map((honor, i) => (
                    <span key={i} className="bg-[#ffd966] text-[#006600] px-3 py-1 rounded-full font-semibold text-sm">
                      {honor}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-3 text-base text-[#333]">
                <div className="flex justify-end mb-1.5">
                  <button
                    onClick={() => toggleFollow(currentTeam.id)}
                    onMouseEnter={() => setIsHoveringFollow(true)}
                    onMouseLeave={() => setIsHoveringFollow(false)}
                    className={`${
                      followStatus[currentTeam.id] ? 'bg-[#aaa]' : 'bg-[#f90]'
                    } text-white border-none rounded-full px-6 py-2 font-['Inter'] text-[15px] font-semibold cursor-pointer transition-colors shadow-[0_2px_4px_rgba(0,0,0,0.1)] tracking-wide`}
                  >
                    {followStatus[currentTeam.id] ? (isHoveringFollow ? '取消关注' : '已关注') : '+关注'}
                  </button>
                </div>
                <p className="m-0 leading-6"><strong className="text-[#008000]">主教练：</strong>{currentTeam.coach}</p>
                <p className="m-0 leading-6"><strong className="text-[#008000]">成立年份：</strong>{currentTeam.founded}</p>
                <p className="m-0 leading-6"><strong className="text-[#008000]">主场：</strong>{currentTeam.stadium}</p>
              </div>
            </div>

            {/* 球员卡片网格 */}
            <div className="grid grid-cols-3 gap-7.5">
              {currentPlayers.map((player, index) => {
                const initial = player.name.charAt(0);
                return (
                  <div
                    key={index}
                    className="w-full h-[200px] bg-white border border-[#e0e0e0] px-5 py-5 flex items-center gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.05)] transition-shadow"
                  >
                    <div
                      className="w-[100px] h-[100px] rounded-full flex items-center justify-center text-[36px] font-bold text-white uppercase flex-shrink-0 bg-cover bg-center"
                      style={{ backgroundColor: player.avatarColor }}
                    >
                      {initial}
                    </div>
                    <div className="font-['Roboto'] flex flex-col gap-1.5 leading-5 overflow-hidden">
                      <span className="text-[18px] font-bold text-[#111] whitespace-nowrap overflow-hidden text-ellipsis">
                        {player.name}
                      </span>
                      <span className="text-sm text-[#008000] font-semibold">球衣号码：{player.number}</span>
                      <span className="text-sm text-[#555]">场上位置：{player.position}</span>
                      <span className="text-sm text-[#777] whitespace-nowrap overflow-hidden text-ellipsis">
                        所属队伍：{player.team}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>

      {/* 底部占位 */}
      <div className="h-[20px]"></div>
    </main>
  );
}