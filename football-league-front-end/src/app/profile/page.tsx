"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store";

// ✅ 修复：和后端端口统一为5000
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

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ 修复：登录态校验，确保mounted后再判断，避免水合错误
  useEffect(() => {
    if (!mounted) return;
    // 无token直接跳登录页
    if (!token) {
      router.replace("/auth");
    }
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
          // 401直接登出跳登录页
          logout();
          router.replace("/auth");
        }

        const teamsRes = await fetch(`${API_URL}/api/user/teams`, { headers });
        const teamsData = await teamsRes.json();
        if (teamsData.code === 200) {
          setAllTeams(teamsData.data);
        }

        const guessesRes = await fetch(`${API_URL}/api/user/guesses`, { headers });
        const guessesData = await guessesRes.json();
        if (guessesData.code === 200) {
          setGuesses(guessesData.data);
        }
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
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f2] font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#008000] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">加载个人中心数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex justify-center items-center font-sans">
      <div className="w-[1200px] h-[800px] bg-white shadow-lg flex flex-col overflow-hidden rounded-lg">
        <div className="w-full h-[60px] bg-[#F5F5F5] flex items-center justify-between px-5 shrink-0">
          <button
            onClick={() => router.back()}
            className="text-[16px] text-[#333333] hover:text-[#008000] transition-colors"
          >
            ← 返回
          </button>
          
          <div className="w-6 h-6 bg-[#b0b0b0] rounded-full flex items-center justify-center text-white text-xs cursor-default">
            🔔
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-[240px] bg-[#F5F5F5] flex flex-col items-center pt-10 shrink-0">
            <div className="w-20 h-20 bg-[#E0E0E0] rounded-full mb-5"></div>
            <div className="text-xl font-medium text-[#1e1e1e] mb-8">
              {username || '球迷用户'}
            </div>
            
            <button
              onClick={() => setActiveTab('focus')}
              className={`text-base text-center py-1.5 px-5 rounded-full transition-all cursor-pointer mb-3 ${
                activeTab === 'focus' ? 'bg-[#008000] text-white font-medium' : 'text-[#333] hover:bg-[#d0d0d0]'
              }`}
            >
              关注球队
            </button>
            <button
              onClick={() => setActiveTab('score')}
              className={`text-base text-center py-1.5 px-5 rounded-full transition-all cursor-pointer mb-3 ${
                activeTab === 'score' ? 'bg-[#008000] text-white font-medium' : 'text-[#333] hover:bg-[#d0d0d0]'
              }`}
            >
              个人积分
            </button>
            <button
              onClick={() => setActiveTab('guesses')}
              className={`text-base text-center py-1.5 px-5 rounded-full transition-all cursor-pointer ${
                activeTab === 'guesses' ? 'bg-[#008000] text-white font-medium' : 'text-[#333] hover:bg-[#d0d0d0]'
              }`}
            >
              竞猜记录
            </button>
          </div>

          <div className="w-[960px] bg-white p-5 overflow-y-auto">
            
            {activeTab === 'focus' && (
              <div>
                <div className="text-2xl font-semibold text-[#1e1e1e] mb-5">关注球队</div>
                
                {selectedTeamIds.length === 0 ? (
                  <div className="bg-[#F9F9F9] border border-dashed border-[#aaa] p-10 text-center rounded-lg text-[#666]">
                    <div className="text-5xl mb-3">⚽</div>
                    <div className="text-lg font-medium mb-2">暂无关注的球队</div>
                    <div className="text-[#888]">去“球队/球员”页面选择你心仪的球队关注吧～</div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {selectedTeamIds.map(teamId => {
                      const team = getTeamFullInfo(teamId);
                      if (!team) return null;
                      const logoInitial = team.short.charAt(0).toUpperCase();
                      return (
                        <div key={teamId} className="w-full bg-[#F9F9F9] border border-[#E0E0E0] rounded-md p-5 flex items-center gap-5">
                          <div 
                            className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-2xl font-bold text-white uppercase shrink-0"
                            style={{ backgroundColor: team.logoColor }}
                          >
                            {logoInitial}
                          </div>
                          <div className="flex-1">
                            <div className="text-xl font-semibold text-[#008000] mb-2">{team.name}</div>
                            <div className="text-sm text-[#444] leading-relaxed mb-3">
                              主教练：{team.coach} · 主场：{team.stadium}<br/>
                              成立年份：{team.founded}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {team.honors.slice(0, 3).map((h, i) => (
                                <span key={i} className="bg-[#ffd966] text-[#006600] px-3 py-1 rounded-full font-semibold text-xs">
                                  {h}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnfollowTeam(teamId)}
                            className="ml-auto bg-transparent border border-[#008000] text-[#008000] text-sm px-5 py-1.5 rounded-full cursor-pointer hover:bg-[#008000] hover:text-white transition-colors shrink-0"
                          >
                            取消关注
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-gray-200">
                   <p className="text-sm text-gray-500 mb-3">想要修改关注列表？</p>
                   <div className="flex flex-wrap gap-2 mb-4">
                       {allTeams.map(t => (
                           <button
                            key={t.id}
                            onClick={() => {
                                const teamId = String(t.id);
                                if(selectedTeamIds.includes(teamId)) {
                                    setSelectedTeamIds(prev => prev.filter(id => id !== teamId));
                                } else {
                                    setSelectedTeamIds(prev => [...prev, teamId]);
                                }
                            }}
                            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                selectedTeamIds.includes(String(t.id)) 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                                : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                            }`}
                           >
                               {selectedTeamIds.includes(String(t.id)) ? '✓ ' : ''}{t.name}
                           </button>
                       ))}
                   </div>
                   <button
                    onClick={handleSaveFocusTeams}
                    className="bg-[#008000] hover:bg-[#006600] text-white px-5 py-2 rounded-md transition-colors"
                   >
                       保存关注设置
                   </button>
                </div>
              </div>
            )}

            {activeTab === 'score' && (
              <div>
                <div className="text-2xl font-semibold text-[#1e1e1e] mb-5">个人积分</div>
                
                <div className="w-full bg-[#F9F9F9] border border-[#E0E0E0] rounded-md p-5 mb-5">
                  <div className="text-lg font-semibold text-[#008000] mb-3">⭐ 积分余额</div>
                  <div className="text-sm text-[#444]">
                    当前可用积分：<span className="text-2xl font-bold text-[#008000]">{profile?.score || 0}</span> 分<br/>
                    累计获得：3500 分 · 已使用：{3500 - (profile?.score || 0)} 分
                  </div>
                </div>

                <div className="w-full bg-[#F9F9F9] border border-[#E0E0E0] rounded-md p-5">
                  <div className="text-lg font-semibold text-[#008000] mb-3">📋 积分明细</div>
                  <div className="text-sm text-[#444] space-y-2">
                    <div>05月15日 竞猜曼联胜 +20分</div>
                    <div>05月13日 竞猜比分 +50分</div>
                    <div>05月12日 参与竞猜 +10分</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'guesses' && (
              <div>
                <div className="text-2xl font-semibold text-[#1e1e1e] mb-5">竞猜记录</div>
                
                {guesses.length === 0 ? (
                   <div className="text-center py-12 text-gray-500">暂无竞猜记录</div>
                ) : (
                    <div className="space-y-5">
                        {guesses.map((guess) => (
                            <div key={guess.id} className="w-full bg-[#F9F9F9] border border-[#E0E0E0] rounded-md p-5">
                                <div className="text-lg font-semibold text-[#008000] mb-2">
                                    {new Date(guess.match.match_time).toLocaleDateString()} {guess.match.home_team.name} vs {guess.match.away_team.name}
                                </div>
                                <div className="text-sm text-[#444]">
                                    竞猜：{getGuessResultText(guess.guess_result)} · 消耗{guess.score_cost}积分 · 
                                    结果：{guess.match.home_score}-{guess.match.away_score}
                                    {guess.isCorrect === true && (
                                        <span className="text-[#008000] font-medium ml-2">+{guess.score_reward}积分</span>
                                    )}
                                    {guess.isCorrect === false && (
                                        <span className="text-red-600 font-medium ml-2">未中奖</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}