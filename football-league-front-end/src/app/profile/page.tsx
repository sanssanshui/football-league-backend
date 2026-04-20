"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store";
import { motion, useMotionValue, useTransform, Variants } from "framer-motion";

// ✅ 保持原有的常量和接口定义不变
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const STORAGE_KEY = 'followedTeams';

interface TeamBase {
  id: string;
  name: string;
  short: string;
  logoColor: string;
  coach: string;
  founded: string;
  stadium: string;
  honors: string[];
}

interface BackendTeam {
  id: number;
  name: string;
  city: string;
  logo_url: string;
}

interface GuessRecord {
  id: number;
  match: {
    home_team: { name: string };
    away_team: { name: string };
    home_score: number;
    away_score: number;
    match_time: string;
  };
  guess_result: string;
  score_cost: number;
  score_reward: number | null;
  isCorrect: boolean | null;
}

interface UserProfile {
  id: number;
  username: string;
  score: number;
  avatar_url: string | null;
  focusTeams: BackendTeam[];
}

const teamsFullData: TeamBase[] = [
  { id: 't1', name: '国际米兰', short: '国米', logoColor: '#0066b3', coach: '西蒙尼·因扎吉', founded: '1908', stadium: '梅阿查球场', honors: ['意甲冠军', '欧冠冠军', '世俱杯'] },
  { id: 't2', name: 'AC米兰', short: '米兰', logoColor: '#c91a1a', coach: '斯特凡诺·皮奥利', founded: '1899', stadium: '圣西罗球场', honors: ['意甲冠军', '欧冠冠军', '欧洲超级杯'] },
  { id: 't3', name: '皇家马德里', short: '皇马', logoColor: '#f7b731', coach: '卡洛·安切洛蒂', founded: '1902', stadium: '伯纳乌球场', honors: ['西甲冠军', '欧冠冠军', '国王杯'] },
  { id: 't4', name: '巴塞罗那', short: '巴萨', logoColor: '#a50044', coach: '哈维·埃尔南德斯', founded: '1899', stadium: '诺坎普球场', honors: ['西甲冠军', '欧冠冠军', '国王杯'] },
  { id: 't5', name: '曼联', short: '曼联', logoColor: '#da291c', coach: '埃里克·滕哈赫', founded: '1878', stadium: '老特拉福德', honors: ['英超冠军', '欧冠冠军', '足总杯'] },
  { id: 't6', name: '利物浦', short: '红军', logoColor: '#c8102e', coach: '尤尔根·克洛普', founded: '1892', stadium: '安菲尔德', honors: ['英超冠军', '欧冠冠军', '世俱杯'] },
  { id: 't7', name: '拜仁慕尼黑', short: '拜仁', logoColor: '#dc052d', coach: '托马斯·图赫尔', founded: '1900', stadium: '安联球场', honors: ['德甲冠军', '欧冠冠军', '德国杯'] },
  { id: 't8', name: '巴黎圣日耳曼', short: '巴黎', logoColor: '#004170', coach: '路易斯·恩里克', founded: '1970', stadium: '王子公园', honors: ['法甲冠军', '法国杯', '法联杯'] },
];

const getGuessResultText = (result: string) => {
  const map: Record<string, string> = { home_win: "主队胜", away_win: "客队胜", draw: "平局" };
  return map[result] || result;
};

// --- 动画变体 ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 15 } 
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const { user_id, token, username, logout } = useUserStore();
  
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allTeams, setAllTeams] = useState<BackendTeam[]>([]);
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'focus' | 'score' | 'guesses'>('focus');

  // --- 视差效果 (Parallax) 设置 ---
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 2;
    const y = (clientY / window.innerHeight - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  // 背景移动范围更大（反方向）
  const bgX = useTransform(mouseX, [-1, 1], [-20, 20]);
  const bgY = useTransform(mouseY, [-1, 1], [-20, 20]);
  
  // 前景卡片移动范围较小
  const cardX = useTransform(mouseX, [-1, 1], [15, -15]);
  const cardY = useTransform(mouseY, [-1, 1], [15, -15]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!token) router.replace("/auth");
  }, [mounted, token, router]);

  const getFollowedTeams = () => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveFollowedTeams = (ids: string[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  };

  useEffect(() => {
    if (!mounted || !user_id || !token) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const headers = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const profileRes = await fetch(`${API_URL}/api/user/profile`, { headers });
        const profileData = await profileRes.json();
        if (profileData.code === 200) {
          setProfile(profileData.data);
          const backendFocusIds = profileData.data.focusTeams.map((t: BackendTeam) => String(t.id));
          const localFocusIds = getFollowedTeams();
          const finalIds = backendFocusIds.length > 0 ? backendFocusIds : localFocusIds;
          setSelectedTeamIds(finalIds);
          saveFollowedTeams(finalIds);
        } else if (profileData.code === 401) {
          logout();
          router.replace("/auth");
        }

        const teamsRes = await fetch(`${API_URL}/api/user/teams`, { headers });
        const teamsData = await teamsRes.json();
        if (teamsData.code === 200) setAllTeams(teamsData.data);

        const guessesRes = await fetch(`${API_URL}/api/user/guesses`, { headers });
        const guessesData = await guessesRes.json();
        if (guessesData.code === 200) setGuesses(guessesData.data);
      } catch (err) {
        console.error("获取个人中心数据失败", err);
        setSelectedTeamIds(getFollowedTeams());
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [mounted, user_id, token, router, logout]);

  const handleUnfollowTeam = (teamId: string) => {
    const newFollowed = selectedTeamIds.filter(id => id !== teamId);
    setSelectedTeamIds(newFollowed);
    saveFollowedTeams(newFollowed);
    
    (async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/user/focus-teams`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teamIds: newFollowed.map(id => Number(id)) }),
        });
        const data = await res.json();
        if (data.code === 200) {
          setProfile(prev => prev ? { ...prev, focusTeams: data.data.focusTeams } : null);
        }
      } catch (e) {
        console.error("同步后端关注数据失败", e);
      }
    })();
  };

  const handleSaveFocusTeams = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/user/focus-teams`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamIds: selectedTeamIds.map(id => Number(id)) }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setProfile(prev => prev ? { ...prev, focusTeams: data.data.focusTeams } : null);
        saveFollowedTeams(selectedTeamIds);
        alert("关注球队保存成功");
      } else {
        alert(data.message || "保存失败");
      }
    } catch (err) {
      console.error("保存失败", err);
      alert("网络请求失败，请检查后端服务");
    }
  };

  const getTeamFullInfo = (teamId: string) => {
    return teamsFullData.find(t => t.id === teamId) || null;
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black font-sans relative overflow-hidden">
        {/* 背景加载图 */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
          style={{ backgroundImage: "url('/images/pexels-markusspiske-114296.jpg')" }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4 bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="w-12 h-12 border-4 border-[#008000] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,128,0,0.5)]" />
          <p className="text-white/80 font-medium tracking-wider">初始化空间中...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex justify-center items-center font-sans overflow-hidden relative"
      onMouseMove={handleMouseMove}
    >
      {/* 1. 动态视差背景层 */}
      <motion.div
        className="absolute inset-[-50px] z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/pexels-markusspiske-114296.jpg')",
          x: bgX,
          y: bgY,
        }}
      />
      {/* 背景暗化遮罩，确保文字可读性 */}
      <div className="absolute inset-0 bg-black/50 z-0 pointer-events-none" />

      {/* 2. 悬浮的顶部导航（独立玻璃条） */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-8 left-8 right-8 z-20 flex justify-between items-center"
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-full text-white transition-all shadow-lg"
        >
          <span>←</span> 返回
        </button>
        <div className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          🔔
        </div>
      </motion.div>

      {/* 3. 主内容区域 (带有视差微动) */}
      <motion.div 
        style={{ x: cardX, y: cardY }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-[1200px] h-[750px] flex gap-8 p-4"
      >
        
        {/* 左侧侧边栏：垂直玻璃容器 */}
        <motion.div 
          variants={itemVariants}
          className="w-[280px] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[32px] flex flex-col items-center pt-12 pb-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] shrink-0"
        >
          <div className="relative mb-6">
             <div className="w-24 h-24 bg-gradient-to-tr from-[#008000] to-[#00ff00] rounded-full p-1 shadow-[0_0_20px_rgba(0,128,0,0.4)]">
                <div className="w-full h-full bg-[#1a1a1a] rounded-full border-2 border-transparent">
                  {/* Avatar img can go here */}
                </div>
             </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-wide mb-10">
            {username || '球迷用户'}
          </div>
          
          <div className="w-full px-6 flex flex-col gap-3">
            {[
              { id: 'focus', label: '关注球队', icon: '⚽' },
              { id: 'score', label: '个人积分', icon: '⭐' },
              { id: 'guesses', label: '竞猜记录', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-3 text-lg py-3 px-6 rounded-2xl transition-all duration-300 overflow-hidden ${
                  activeTab === tab.id 
                    ? 'text-white shadow-[0_4px_20px_rgba(0,128,0,0.3)]' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {/* 选中状态的发光背景 */}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute inset-0 bg-[#008000]/80 border border-[#008000] rounded-2xl -z-10"
                  />
                )}
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* 右侧主视窗：宽大玻璃面板 */}
        <motion.div 
          variants={itemVariants}
          className="flex-1 bg-black/30 backdrop-blur-xl border border-white/10 rounded-[32px] p-10 overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.4)] custom-scrollbar"
        >
          {activeTab === 'focus' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="text-3xl font-bold text-white mb-8 tracking-wide">关注球队</div>
              
              {selectedTeamIds.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/20 p-12 text-center rounded-[24px] backdrop-blur-sm">
                  <div className="text-6xl mb-4 opacity-80">⚽</div>
                  <div className="text-xl font-medium text-white mb-2">暂无关注的球队</div>
                  <div className="text-white/50">去“球队/球员”页面选择你心仪的球队关注吧～</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {selectedTeamIds.map(teamId => {
                    const team = getTeamFullInfo(teamId);
                    if (!team) return null;
                    const logoInitial = team.short.charAt(0).toUpperCase();
                    return (
                      <motion.div 
                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        key={teamId} 
                        className="bg-white/5 border border-white/10 rounded-[20px] p-5 flex items-center gap-5 transition-all"
                      >
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white uppercase shrink-0 shadow-lg"
                          style={{ backgroundColor: team.logoColor, boxShadow: `0 0 15px ${team.logoColor}60` }}
                        >
                          {logoInitial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xl font-bold text-white mb-1">{team.name}</div>
                          <div className="text-xs text-white/60 leading-relaxed mb-3 truncate">
                            {team.coach} · {team.stadium} · {team.founded}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {team.honors.slice(0, 2).map((h, i) => (
                              <span key={i} className="bg-white/10 text-white/90 px-3 py-1 rounded-full text-[10px] backdrop-blur-md border border-white/5">
                                {h}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnfollowTeam(teamId)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/80 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0 group"
                          title="取消关注"
                        >
                          <span className="group-hover:rotate-90 transition-transform">×</span>
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="mt-12 pt-8 border-t border-white/10">
                 <p className="text-lg font-medium text-white mb-5">想要修改关注列表？</p>
                 <div className="flex flex-wrap gap-3 mb-8">
                     {allTeams.map(t => {
                       const isSelected = selectedTeamIds.includes(String(t.id));
                       return (
                         <motion.button
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                           key={t.id}
                           onClick={() => {
                               const teamId = String(t.id);
                               if(isSelected) {
                                   setSelectedTeamIds(prev => prev.filter(id => id !== teamId));
                               } else {
                                   setSelectedTeamIds(prev => [...prev, teamId]);
                               }
                           }}
                           className={`px-5 py-2 text-sm rounded-full backdrop-blur-md border transition-all duration-300 ${
                               isSelected 
                               ? 'bg-[#008000]/80 text-white border-[#008000] shadow-[0_0_15px_rgba(0,128,0,0.5)]' 
                               : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                           }`}
                         >
                             {isSelected ? '✓ ' : ''}{t.name}
                         </motion.button>
                       )
                     })}
                 </div>
                 <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveFocusTeams}
                  className="bg-gradient-to-r from-[#008000] to-[#00b300] text-white px-8 py-3 rounded-xl font-medium shadow-[0_4px_20px_rgba(0,128,0,0.4)] hover:shadow-[0_4px_25px_rgba(0,128,0,0.6)] transition-all"
                 >
                     保存关注设置
                 </motion.button>
              </div>
            </motion.div>
          )}

          {activeTab === 'score' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="text-3xl font-bold text-white mb-8 tracking-wide">个人积分</div>
              
              <div className="w-full bg-gradient-to-br from-[#008000]/40 to-black/40 backdrop-blur-md border border-[#008000]/30 rounded-[24px] p-8 mb-6 shadow-lg">
                <div className="flex items-center gap-3 text-xl font-medium text-white mb-4">
                  <span className="text-2xl">⭐</span> 积分余额
                </div>
                <div className="flex items-end gap-4 mb-2">
                  <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                    {profile?.score || 0}
                  </span>
                  <span className="text-white/60 mb-2">分</span>
                </div>
                <div className="text-sm text-white/50">
                  累计获得：3500 分 <span className="mx-2">|</span> 已使用：{3500 - (profile?.score || 0)} 分
                </div>
              </div>

              <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-[24px] p-8">
                <div className="flex items-center gap-3 text-lg font-medium text-white mb-6">
                  📋 积分明细
                </div>
                <div className="space-y-4">
                  {['05月15日 竞猜曼联胜 +20分', '05月13日 竞猜比分 +50分', '05月12日 参与竞猜 +10分'].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                      <span className="text-white/80">{item.split(' ')[1]}</span>
                      <div className="text-right">
                        <div className="text-[#00ff00] font-medium">{item.split(' ')[2]}</div>
                        <div className="text-xs text-white/40">{item.split(' ')[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'guesses' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <div className="text-3xl font-bold text-white mb-8 tracking-wide">竞猜记录</div>
              
              {guesses.length === 0 ? (
                 <div className="text-center py-20 text-white/40 text-lg">暂无竞猜记录，快去预测比赛吧！</div>
              ) : (
                  <div className="space-y-5">
                      {guesses.map((guess) => (
                          <motion.div 
                            whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.08)' }}
                            key={guess.id} 
                            className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-[20px] p-6 transition-all"
                          >
                              <div className="flex justify-between items-center mb-3">
                                <div className="text-xl font-bold text-white">
                                    {guess.match.home_team.name} <span className="text-white/40 px-2">vs</span> {guess.match.away_team.name}
                                </div>
                                <div className="text-sm text-white/50 bg-white/10 px-3 py-1 rounded-full">
                                  {new Date(guess.match.match_time).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-white/70">
                                  <div className="bg-black/30 px-4 py-2 rounded-lg border border-white/5">
                                    我的竞猜: <span className="text-white font-medium ml-1">{getGuessResultText(guess.guess_result)}</span>
                                  </div>
                                  <div>消耗 <span className="text-yellow-400">{guess.score_cost}</span> 积分</div>
                                  <div className="mx-2 text-white/20">|</div>
                                  <div>赛果: <span className="text-white font-medium">{guess.match.home_score} - {guess.match.away_score}</span></div>
                                  
                                  <div className="ml-auto">
                                    {guess.isCorrect === true && (
                                        <span className="bg-[#008000]/20 text-[#00ff00] border border-[#008000]/50 px-4 py-1.5 rounded-full font-medium">
                                          赢取 +{guess.score_reward} 积分
                                        </span>
                                    )}
                                    {guess.isCorrect === false && (
                                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-1.5 rounded-full">未中奖</span>
                                    )}
                                  </div>
                              </div>
                          </motion.div>
                      ))}
                  </div>
              )}
            </motion.div>
          )}

        </motion.div>
      </motion.div>

      {/* 隐藏原生滚动条的 CSS，建议放到你的 globals.css 中 */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}} />
    </div>
  );
}