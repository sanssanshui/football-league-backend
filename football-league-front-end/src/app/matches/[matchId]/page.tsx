"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, PlayCircle, MessageSquare, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// 赛事详情数据类型
interface Team {
  id: number;
  name: string;
  logo_url: string;
  score: number;
  stats: {
    shots: number;
    shotsOnTarget: number;
    possession: number;
    corners: number;
    fouls: number;
  };
}

interface MatchEvent {
  id: number;
  time: string;
  team: "home" | "away";
  type: "goal" | "yellow" | "red" | "substitution";
  player: string;
  assist?: string;
}

interface MatchDetail {
  id: number;
  home_team: Team;
  away_team: Team;
  match_time: string;
  status: 0 | 1 | 2;
  league: string;
  round: string;
  events: MatchEvent[];
  liveLine: string[];
}

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !matchId) return;
    // 模拟加载赛事详情数据
    const fetchMatchDetail = async () => {
      setLoading(true);
      setTimeout(() => {
        setMatchDetail({
          id: Number(matchId),
          home_team: {
            id: 1,
            name: "曼城",
            logo_url: "/images/mancity.png",
            score: 2,
            stats: {
              shots: 15,
              shotsOnTarget: 7,
              possession: 58,
              corners: 8,
              fouls: 12,
            }
          },
          away_team: {
            id: 2,
            name: "皇家马德里",
            logo_url: "/images/realmadrid.png",
            score: 1,
            stats: {
              shots: 10,
              shotsOnTarget: 4,
              possession: 42,
              corners: 3,
              fouls: 18,
            }
          },
          match_time: "2026-03-24 20:00",
          status: 1,
          league: "欧冠联赛",
          round: "半决赛首回合",
          events: [
            { id: 1, time: "23'", team: "home", type: "goal", player: "哈兰德", assist: "德布劳内" },
            { id: 2, time: "36'", team: "away", type: "yellow", player: "卡马文加" },
            { id: 3, time: "52'", team: "away", type: "goal", player: "贝林厄姆" },
            { id: 4, time: "67'", team: "home", type: "goal", player: "福登" },
          ],
          liveLine: [
            "67' 进球！曼城福登禁区内推射破门，比分2-1！",
            "65' 皇马换人：巴尔韦德换下莫德里奇",
            "52' 进球！皇马贝林厄姆头球破门，比分扳平1-1！",
            "45' 下半场比赛开始",
            "23' 进球！曼城哈兰德接德布劳内传中头球破门，比分1-0！",
            "0' 比赛开始！",
          ]
        });
        setLoading(false);
      }, 500);
    };
    fetchMatchDetail();
  }, [mounted, matchId]);

  if (!mounted) return null;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">加载赛事详情中...</p>
        </div>
      </div>
    );
  }
  if (!matchDetail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">赛事不存在</h2>
          <Button onClick={() => router.push('/matches')}>返回赛事列表</Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 返回栏 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/matches')}
            className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回赛事列表
          </Button>
        </div>

        {/* 赛事头部对阵信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="text-center mb-8">
                <Badge className="bg-white/20 text-white border-none mb-2">{matchDetail.league}</Badge>
                <p className="text-white/80">{matchDetail.round} · {matchDetail.match_time}</p>
              </div>

              {/* 对阵双方 */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
                    <span className="text-3xl font-bold">{matchDetail.home_team.name.charAt(0)}</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{matchDetail.home_team.name}</h2>
                </div>

                {/* 比分 */}
                <div className="mx-8 flex flex-col items-center">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl md:text-7xl font-bold">{matchDetail.home_team.score}</span>
                    <span className="text-3xl md:text-5xl font-bold text-white/60">:</span>
                    <span className="text-5xl md:text-7xl font-bold">{matchDetail.away_team.score}</span>
                  </div>
                  {matchDetail.status === 1 && (
                    <span className="mt-2 text-white/80 font-medium animate-pulse flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                      直播中 67'
                    </span>
                  )}
                </div>

                {/* 客队 */}
                <div className="flex flex-col items-center text-center flex-1">
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
                    <span className="text-3xl font-bold">{matchDetail.away_team.name.charAt(0)}</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{matchDetail.away_team.name}</h2>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-center gap-4 mt-8 flex-wrap">
                <Button className="bg-white text-emerald-700 hover:bg-white/90">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  观看直播
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/10">
                  <Target className="w-4 h-4 mr-2" />
                  赛事竞猜
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/10">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  进入聊天室
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 赛事详情Tabs */}
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-8 bg-gray-100 dark:bg-slate-800">
            <TabsTrigger value="events" className="font-medium">比赛事件</TabsTrigger>
            <TabsTrigger value="stats" className="font-medium">技术统计</TabsTrigger>
            <TabsTrigger value="live" className="font-medium">文字直播</TabsTrigger>
            <TabsTrigger value="lineup" className="font-medium">首发阵容</TabsTrigger>
          </TabsList>

          {/* 比赛事件 */}
          <TabsContent value="events" className="space-y-6">
            <Card className="border border-gray-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl font-bold">比赛事件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700 -translate-x-1/2"></div>
                  <div className="space-y-8">
                    {matchDetail.events.map((event) => (
                      <div key={event.id} className={`relative flex items-center ${event.team === 'away' ? 'flex-row-reverse' : ''}`}>
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-950 z-10"></div>
                        <div className={`w-5/12 ${event.team === 'away' ? 'text-left' : 'text-right'}`}>
                          <div className={`inline-flex items-center gap-2 p-3 rounded-lg ${event.team === 'home' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                            <span className="font-bold text-gray-900 dark:text-white">{event.time}</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {event.type === 'goal' && `⚽ ${event.player} 进球！`}
                              {event.type === 'yellow' && `🟨 ${event.player} 黄牌`}
                              {event.type === 'red' && `🟥 ${event.player} 红牌`}
                              {event.type === 'substitution' && `🔄 ${event.player} 换人`}
                              {event.assist && ` (助攻: ${event.assist})`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 技术统计 */}
          <TabsContent value="stats" className="space-y-6">
            <Card className="border border-gray-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-center">全场技术统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 控球率 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold">{matchDetail.home_team.stats.possession}%</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">控球率</span>
                    <span className="text-xl font-bold">{matchDetail.away_team.stats.possession}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="flex h-full">
                      <div className="h-full bg-blue-500" style={{ width: `${matchDetail.home_team.stats.possession}%` }}></div>
                      <div className="h-full bg-red-500" style={{ width: `${matchDetail.away_team.stats.possession}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* 射门数据 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{matchDetail.home_team.stats.shots}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">射门次数</span>
                    <span className="font-bold">{matchDetail.away_team.stats.shots}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{matchDetail.home_team.stats.shotsOnTarget}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">射正次数</span>
                    <span className="font-bold">{matchDetail.away_team.stats.shotsOnTarget}</span>
                  </div>
                </div>

                {/* 角球&犯规 */}
                <div className="flex items-center justify-between">
                  <span className="font-bold">{matchDetail.home_team.stats.corners}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">角球数</span>
                  <span className="font-bold">{matchDetail.away_team.stats.corners}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{matchDetail.home_team.stats.fouls}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">犯规数</span>
                  <span className="font-bold">{matchDetail.away_team.stats.fouls}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 文字直播 */}
          <TabsContent value="live" className="space-y-6">
            <Card className="border border-gray-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl font-bold">文字直播</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {matchDetail.liveLine.map((line, index) => (
                  <div key={index} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border-l-4 border-emerald-500">
                    <p className="text-gray-800 dark:text-gray-200">{line}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 首发阵容 */}
          <TabsContent value="lineup" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-gray-200 dark:border-slate-800">
                <CardHeader className="bg-blue-50 dark:bg-blue-900/20 rounded-t-lg">
                  <CardTitle className="text-xl font-bold text-center">{matchDetail.home_team.name} 首发阵容</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    阵容数据加载中...
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-gray-200 dark:border-slate-800">
                <CardHeader className="bg-red-50 dark:bg-red-900/20 rounded-t-lg">
                  <CardTitle className="text-xl font-bold text-center">{matchDetail.away_team.name} 首发阵容</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    阵容数据加载中...
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}