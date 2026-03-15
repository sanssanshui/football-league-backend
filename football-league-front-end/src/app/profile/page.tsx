"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Trophy, History, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/lib/store";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002";

// 类型定义 - 完全匹配后端返回字段
interface Team {
  id: number;
  name: string;
  city: string;
  logo_url: string;
}

interface GuessRecord {
  id: number;
  user_id: number;
  match_id: number;
  guess_result: string;
  isCorrect: boolean | null;
  score_cost: number;
  score_reward: number | null;
  status: number;
  createdAt: string;
  match: {
    id: number;
    home_team: { id: number; name: string };
    away_team: { id: number; name: string };
    home_score: number;
    away_score: number;
    match_time: string;
    status: number;
  };
}

interface UserProfile {
  id: number;
  username: string;
  score: number;
  avatar_url: string | null;
  createdAt: string;
  focusTeams: Team[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { user_id, token, username, logout } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [guesses, setGuesses] = useState<GuessRecord[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);

  // 页面初始化：处理客户端hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // 校验登录态：修复时序问题，只有客户端挂载完成且无token才跳登录页
  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.replace("/auth"); // 用replace代替push，避免用户回退又回到个人中心
    }
  }, [mounted, token, router]);

  // 获取个人中心数据：只有token和user_id都存在才请求
  useEffect(() => {
    if (!mounted || !user_id || !token) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const headers = {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // 1. 获取用户个人信息
        const profileRes = await fetch(`${API_URL}/api/user/profile`, { headers });
        const profileData = await profileRes.json();
        if (profileData.code === 200) {
          setProfile(profileData.data);
          setSelectedTeamIds(profileData.data.focusTeams.map((t: Team) => t.id));
        } else if (profileData.code === 401) {
          // token无效，退出登录并跳登录页
          logout();
          router.replace("/auth");
        }

        // 2. 获取所有球队列表
        const teamsRes = await fetch(`${API_URL}/api/user/teams`, { headers });
        const teamsData = await teamsRes.json();
        if (teamsData.code === 200) {
          setAllTeams(teamsData.data);
        }

        // 3. 获取竞猜记录
        const guessesRes = await fetch(`${API_URL}/api/user/guesses`, { headers });
        const guessesData = await guessesRes.json();
        if (guessesData.code === 200) {
          setGuesses(guessesData.data);
        }
      } catch (err) {
        console.error("获取个人中心数据失败", err);
        alert("请求后端失败，请检查后端服务是否启动在5002端口，且已开启跨域");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [mounted, user_id, token, router, logout]);

  // 保存关注球队
  const handleSaveFocusTeams = async () => {
    if (!token) return;
    setSubmitLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/user/focus-teams`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamIds: selectedTeamIds }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setProfile(prev => prev ? { ...prev, focusTeams: data.data.focusTeams } : null);
        alert("关注球队保存成功");
      } else {
        alert(data.message || "保存失败");
      }
    } catch (err) {
      console.error("保存失败", err);
      alert("网络请求失败，请检查后端服务");
    } finally {
      setSubmitLoading(false);
    }
  };

  // 竞猜结果文本映射
  const getGuessResultText = (result: string) => {
    const map: Record<string, string> = {
      home_win: "主队胜",
      away_win: "客队胜",
      draw: "平局",
    };
    return map[result] || result;
  };

  // 比赛状态文本映射
  const getMatchStatusText = (status: number) => {
    const map: Record<number, string> = {
      0: "未开赛",
      1: "进行中",
      2: "已结束"
    };
    return map[status] || "未知";
  };

  // 未挂载完成，不渲染任何内容，避免hydration错误
  if (!mounted) return null;

  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">加载个人中心数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 顶部返回栏 */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回主页
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            退出登录
          </Button>
        </div>

        {/* 用户信息头部 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-3xl font-bold flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                  {username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div>{username}</div>
                  <CardDescription className="text-white/80 text-base mt-1">
                    绿茵会员 · 累计积分 <span className="font-bold text-2xl">{profile?.score || 0}</span>
                  </CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        {/* 核心功能 Tabs */}
        <Tabs defaultValue="focus" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-8 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
            <TabsTrigger 
              value="focus" 
              className="text-base py-3 flex items-center gap-2 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-gray-700 dark:text-gray-300 font-medium"
            >
              <Star size={16} />
              关注球队
            </TabsTrigger>
            <TabsTrigger 
              value="score" 
              className="text-base py-3 flex items-center gap-2 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-gray-700 dark:text-gray-300 font-medium"
            >
              <Trophy size={16} />
              我的积分
            </TabsTrigger>
            <TabsTrigger 
              value="guesses" 
              className="text-base py-3 flex items-center gap-2 rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-gray-700 dark:text-gray-300 font-medium"
            >
              <History size={16} />
              竞猜记录
            </TabsTrigger>
          </TabsList>

          {/* 关注球队 Tab */}
          <TabsContent value="focus" className="space-y-6">
            <Card className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white text-xl font-bold">我的关注球队</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  选择你支持的江苏城市球队，获取专属赛事推荐
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allTeams.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    暂无球队数据，请检查后端接口
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {allTeams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Checkbox
                          id={`team-${team.id}`}
                          checked={selectedTeamIds.includes(team.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTeamIds(prev => [...prev, team.id]);
                            } else {
                              setSelectedTeamIds(prev => prev.filter(id => id !== team.id));
                            }
                          }}
                          className="w-5 h-5 text-emerald-600 dark:text-emerald-500"
                        />
                        <label
                          htmlFor={`team-${team.id}`}
                          className="flex-1 text-base font-medium cursor-pointer text-gray-800 dark:text-gray-200"
                        >
                          {team.name}
                          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                            {team.city}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  onClick={handleSaveFocusTeams}
                  disabled={submitLoading}
                  className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {submitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  保存关注设置
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 我的积分 Tab */}
          <TabsContent value="score" className="space-y-6">
            <Card className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white text-xl font-bold">积分明细</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  积分可通过参与投票、竞猜正确等互动行为获取
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-8">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">当前总积分</p>
                      <p className="text-5xl font-bold text-emerald-500">{profile?.score || 0}</p>
                    </div>
                  </div>
                  <Separator className="my-6 bg-gray-200 dark:bg-slate-700" />
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
                          +10分
                        </Badge>
                        <span className="text-gray-800 dark:text-gray-200">参与赛事 MVP 投票</span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">每次参与+10分</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
                          +50分
                        </Badge>
                        <span className="text-gray-800 dark:text-gray-200">赛事竞猜正确</span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">竞猜正确+50分</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600">
                          +0分
                        </Badge>
                        <span className="text-gray-800 dark:text-gray-200">赛事竞猜错误</span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">不加分不扣分</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 竞猜记录 Tab */}
          <TabsContent value="guesses" className="space-y-6">
            <Card className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white text-xl font-bold">我的竞猜记录</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400">
                  查看你参与的所有赛事竞猜结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {guesses.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    暂无竞猜记录，快去参与赛事竞猜吧！
                  </div>
                ) : (
                  <div className="space-y-4">
                    {guesses.map((guess) => (
                      <div
                        key={guess.id}
                        className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800"
                      >
                        <div className="flex flex-wrap justify-between items-start mb-3 gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-gray-700 dark:text-gray-300">
                              {new Date(guess.match.match_time).toLocaleDateString()}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900">
                              {getMatchStatusText(guess.match.status)}
                            </Badge>
                            {guess.match.status === 2 ? (
                              guess.isCorrect ? (
                                <Badge className="bg-green-500 text-white">竞猜正确</Badge>
                              ) : (
                                <Badge variant="destructive">竞猜错误</Badge>
                              )
                            ) : null}
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            竞猜时间：{new Date(guess.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex-1 text-right">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{guess.match.home_team.name}</span>
                          </div>
                          <div className="mx-6 flex items-center gap-2">
                            <span className="text-xl font-bold text-gray-900 dark:text-white">{guess.match.home_score}</span>
                            <span className="text-gray-400">:</span>
                            <span className="text-xl font-bold text-gray-900 dark:text-white">{guess.match.away_score}</span>
                          </div>
                          <div className="flex-1">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{guess.match.away_team.name}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                          <span>我的竞猜：<span className="font-medium">{getGuessResultText(guess.guess_result)}</span></span>
                          <span>投入积分：<span className="font-medium">{guess.score_cost}</span></span>
                          {guess.score_reward !== null && (
                            <span>获得积分：<span className={`font-medium ${guess.score_reward > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>{guess.score_reward}</span></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 底部返回首页按钮 */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="px-8 py-2 text-emerald-600 border-emerald-500 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回首页
          </Button>
        </div>

      </div>
    </div>
  );
}