"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, User, LogIn, Send, CalendarDays, MapPin } from "lucide-react";
import { useUserStore } from "@/lib/store";

const API = "http://localhost:5002";

// --- 1. 类型定义 ---
type QuizMatch = {
  id: number;
  date: string;
  time: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  homePlayers: string[];
  awayPlayers: string[];
};

type ChatRoom = {
  id: number;
  name: string;
  matchName: string;
  online: number;
  tag: string;
  tone: 'home' | 'away' | 'neutral';
};

type ChatMessage = {
  id: number;
  author: string;
  text: string;
  isOwn: boolean;
  time: string;
  type: 'text' | 'system' | 'event';
  highlight?: boolean;
};

// --- 2. 常量数据 ---
const quizMatches: QuizMatch[] = [
  {
    id: 101,
    date: '05月13日', time: '19:30', round: '第5轮',
    homeTeam: '苏州东吴', awayTeam: '南京城市',
    homePlayers: ['戴琳', '吉翔', '高驰', '李智超'],
    awayPlayers: ['曹海清', '孙国梁', '汪嵩', '马辅渔']
  },
  {
    id: 102,
    date: '05月20日', time: '21:00', round: '第6轮',
    homeTeam: '无锡吴钩', awayTeam: '南通支云',
    homePlayers: ['高志林', '王佳豪', '谢志伟', '李松益'],
    awayPlayers: ['陈彬彬', '刘伟', '黄聪', '杨明洋']
  },
  {
    id: 103,
    date: '05月27日', time: '18:30', round: '第7轮',
    homeTeam: '徐州骁龙', awayTeam: '常州龙城',
    homePlayers: ['谢维超', '张昊', '刘欢', '赵明剑'],
    awayPlayers: ['李昂', '蒋哲', '王睿', '刘军']
  },
  {
    id: 104,
    date: '06月03日', time: '19:00', round: '第8轮',
    homeTeam: '连云港海港', awayTeam: '淮安楚州',
    homePlayers: ['郭毅', '张晨', '刘洋', '陈宇'],
    awayPlayers: ['王鹏', '赵鑫', '孙斌', '周健']
  },
  {
    id: 105,
    date: '06月10日', time: '19:30', round: '第9轮',
    homeTeam: '盐城大丰', awayTeam: '扬州瘦西湖',
    homePlayers: ['陈涛', '李浩', '张磊', '黄博'],
    awayPlayers: ['杨硕', '刘凯', '郑宇', '吴迪']
  },
];

const chatRooms: ChatRoom[] = [
  { id: 1, name: '南京城市 vs 苏州东吴', matchName: '江苏城市足球联赛 第5轮', online: 1284, tag: '热聊中', tone: 'home' },
  { id: 2, name: '无锡吴钩 vs 南通支云', matchName: '江苏城市足球联赛 第6轮', online: 964, tag: '焦点战', tone: 'away' },
  { id: 3, name: '球迷总聊天室', matchName: '全平台实时互动', online: 3821, tag: '推荐', tone: 'neutral' },
];

const initialMessages: ChatMessage[] = [
  { id: 1, author: '系统', text: '比赛即将开始，欢迎进入聊天室互动。', isOwn: false, time: '19:00', type: 'system', highlight: true },
  { id: 2, author: '球迷A', text: '这场南京城市主场优势很明显。', isOwn: false, time: '19:01', type: 'text' },
  { id: 3, author: '我', text: '我觉得今晚会是一场 2-1。', isOwn: true, time: '19:02', type: 'text' },
  { id: 4, author: '系统', text: '第 12 分钟：南京城市获得一次前场任意球。', isOwn: false, time: '19:12', type: 'event', highlight: true },
  { id: 5, author: '球迷B', text: '进攻节奏起来了！', isOwn: false, time: '19:13', type: 'text' },
  { id: 6, author: '我', text: '这个球真的有机会！', isOwn: true, time: '19:13', type: 'text' },
];

export default function CommunityPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { token } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'quiz' | 'chat'>('quiz');

  // 赛事竞猜状态
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<{ name: string; side: 'home' | 'away' } | null>(null);

  // 聊天室状态
  const [rooms] = useState<ChatRoom[]>(chatRooms);
  const [activeRoomId, setActiveRoomId] = useState<number>(chatRooms[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'text' | 'system' | 'event'>('all');

  // 竞猜状态
  const [selectedPoints, setSelectedPoints] = useState('10积分');
  const [upcomingMatches, setUpcomingMatches] = useState<QuizMatch[]>(quizMatches);
  const [guessSelections, setGuessSelections] = useState<Record<number, { result: string; score: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tab = searchParams.get('tab');
    if (tab === 'quiz' || tab === 'chat') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'quiz') {
      loadUpcomingMatches();
    }
  }, [activeTab]);

  const loadUpcomingMatches = async () => {
    // 保留本地可用赛事，避免后端异常导致页面空白
    setUpcomingMatches(quizMatches);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API}/api/matches`, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.code === 200 && Array.isArray(json.data)) {
        const toSafeString = (value: unknown, fallback: string) => (typeof value === 'string' && value.trim() ? value : fallback);
        const transformed = json.data.slice(0, 20).map((m: any, index: number) => {
          const rawDate = toSafeString(m.timestamp || m.datetime || m.match_time, new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString());
          const dateObj = new Date(rawDate);
          const safeDate = Number.isNaN(dateObj.getTime()) ? `05月${String(index + 13).padStart(2, '0')}日` : `${String(dateObj.getMonth() + 1).padStart(2, '0')}月${String(dateObj.getDate()).padStart(2, '0')}日`;
          const safeTime = Number.isNaN(dateObj.getTime()) ? '19:30' : `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
          const homeTeam = toSafeString(m.homeTeam || m.home_team?.name || m.homeTeamName, '主队');
          const awayTeam = toSafeString(m.awayTeam || m.away_team?.name || m.awayTeamName, '客队');
          return {
            id: toSafeString(m.id, `match-${index}`) as unknown as number,
            date: safeDate,
            time: safeTime,
            round: toSafeString(m.round || m.stage || `第${index + 1}轮`, `第${index + 1}轮`),
            homeTeam,
            awayTeam,
            homePlayers: [homeTeam.slice(0, 2), '核心球员', '前锋', '门将'],
            awayPlayers: [awayTeam.slice(0, 2), '核心球员', '前锋', '门将'],
          } as QuizMatch;
        });
        if (transformed.length > 0) setUpcomingMatches(transformed);
      }
    } catch (e) {
      console.error('加载可竞猜比赛失败：', e);
    }
  };

  const handleGuessSubmit = async () => {
    if (!token) {
      alert('请先登录');
      return;
    }
    const selections = Object.entries(guessSelections).filter(([_, v]) => v.result);
    if (selections.length === 0) {
      alert('请至少选择一场比赛进行竞猜');
      return;
    }
    setSubmitting(true);
    try {
      for (const [matchId, selection] of selections) {
        await fetch(`${API}/api/user/guesses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ matchId: Number(matchId), guessResult: selection.result }),
        });
      }
      alert('竞猜提交成功！');
      setGuessSelections({});
      loadUpcomingMatches();
    } catch (e) {
      alert('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 交互逻辑
  const handlePrevMatch = () => {
    setCurrentMatchIndex((prev) => (prev - 1 + quizMatches.length) % quizMatches.length);
    setSelectedPlayer(null);
  };
  const handleNextMatch = () => {
    setCurrentMatchIndex((prev) => (prev + 1) % quizMatches.length);
    setSelectedPlayer(null);
  };

  const handleVote = () => {
    if (!selectedPlayer) {
      alert('请选择一名球员');
      return;
    }
    alert(`您已为 ${selectedPlayer.name} 投票！`);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      author: '我',
      text: inputMessage,
      isOwn: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
  };

  const activeRoom = rooms.find((room) => room.id === activeRoomId) || rooms[0];
  const visibleMessages = messages.filter((message) => filter === 'all' ? true : message.type === filter);

  if (!mounted) return null;

  const currentMatch = upcomingMatches[currentMatchIndex] || quizMatches[currentMatchIndex];
  // 路由匹配：当前页面路径是 /community
  const isActive = pathname === '/community' || pathname === '/community/';

  return (
    <main className="relative min-h-screen bg-white transition-colors duration-300 overflow-x-hidden">
      
      {/* 导航栏：互动按钮指向正确的 /community 路径 */}
      <nav className="w-full h-[80px] bg-[#008000] sticky top-0 z-50 shadow-md">
        <div className="w-[1300px] h-full mx-auto flex items-center justify-between px-0">
          <div className="flex items-center gap-10 ml-5">
            <Link 
              href="/" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all"
            >
              首页
            </Link>
            <Link 
              href="/matches" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all"
            >
              赛事
            </Link>
            <Link 
              href="/teams" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all"
            >
              球员/球队
            </Link>
            {/* 核心：href固定为 /community，和文件路径完全匹配 */}
            <Link 
              href="/community?tab=quiz" 
              className={`${
                isActive 
                  ? 'text-[24px] font-bold text-white border-b-2 border-white pb-1' 
                  : 'text-[20px] font-medium text-white hover:font-bold transition-all'
              }`}
            >
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
            <Link 
              href="/auth" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all whitespace-nowrap flex items-center gap-1"
            >
              <LogIn className="w-5 h-5" /> 登录
            </Link>
            <Link 
              href="/profile" 
              className="text-[20px] font-medium text-white hover:font-bold transition-all whitespace-nowrap flex items-center gap-1"
            >
              <User className="w-5 h-5" /> 个人中心
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="px-[120px] pb-[80px] pt-[60px] max-w-[1540px] mx-auto">
        <div className="flex gap-[50px] items-start">
          
          {/* 左侧选项卡 */}
          <div className="w-[250px] rounded overflow-hidden shrink-0">
            {(['quiz', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full h-[70px] flex items-center justify-center cursor-pointer transition-all border-b border-white/10 text-[18px] font-medium text-white ${
                  activeTab === tab
                    ? 'bg-[#006600] text-[20px] font-bold'
                    : 'bg-[#008000] hover:text-[20px] hover:font-bold'
                }`}
              >
                {tab === 'quiz' ? '赛事竞猜' : '聊天室'}
              </button>
            ))}
          </div>

          {/* 右侧内容区 */}
              <div className="w-[1000px] min-h-[700px] bg-white border border-[#e0e0e0] p-[30px]">
            
            {activeTab === 'chat' && (
              <div className="flex h-[700px] flex-col gap-4">
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 text-sm font-bold text-slate-900">聊天室房间</div>
                    <div className="space-y-3">
                      {rooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => setActiveRoomId(room.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${activeRoomId === room.id ? 'border-emerald-500 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">{room.name}</div>
                              <div className="mt-1 truncate text-xs text-slate-500">{room.matchName}</div>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">{room.tag}</span>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span>在线 {room.online.toLocaleString()}</span>
                            <span>{room.tone === 'home' ? '主队热区' : room.tone === 'away' ? '客队热区' : '全局房间'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{activeRoom.name}</h3>
                        <p className="text-sm text-slate-600">{activeRoom.matchName}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                        在线 {activeRoom.online.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
                      {(['all', 'text', 'system', 'event'] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFilter(item)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filter === item ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {item === 'all' ? '全部消息' : item === 'text' ? '聊天' : item === 'system' ? '系统' : '比赛事件'}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto bg-[#fafafa] p-5">
                      {visibleMessages.map((msg) => (
                        <div key={msg.id} className={`flex items-start gap-3 ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-white ${msg.type === 'system' ? 'bg-slate-500' : msg.type === 'event' ? 'bg-amber-500' : 'bg-[#008000]'}`}>
                            {msg.author.charAt(0)}
                          </div>
                          <div className={`max-w-[560px] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${msg.highlight ? 'border border-amber-200 bg-amber-50 text-slate-900' : msg.isOwn ? 'bg-[#008000] text-white' : 'bg-white text-[#333]'} shadow-sm`}>
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold opacity-80">
                              <span>{msg.author}</span>
                              <span>{msg.time}</span>
                              <span className="rounded-full bg-black/5 px-2 py-0.5">{msg.type === 'system' ? '系统' : msg.type === 'event' ? '事件' : '消息'}</span>
                            </div>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-4">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {['进球了！', '裁判有争议', '防守太强了', '继续压上', '加油！'].map((text) => (
                          <button key={text} type="button" onClick={() => setInputMessage(text)} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                            {text}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="输入聊天内容..."
                          className="flex-1 rounded-full border border-slate-300 px-4 py-3 text-base outline-none focus:border-[#008000]"
                        />
                        <button
                          onClick={handleSendMessage}
                          className="flex h-[50px] w-24 items-center justify-center gap-1 rounded-full bg-[#008000] text-base font-semibold text-white transition-colors hover:bg-[#006600]"
                        >
                          <Send className="h-4 w-4" />
                          发送
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 赛事竞猜模块 */}
            {activeTab === 'quiz' && (
              <div className="font-sans text-slate-900">
                <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">赛事竞猜</h3>
                    <p className="text-sm text-slate-600">从列表中选择一场比赛，进行胜平负竞猜</p>
                  </div>
                  <div className="text-sm text-slate-500">每次消耗 10 / 20 / 50 / 100 积分</div>
                </div>

                <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-800">积分选择</div>
                  <div className="flex flex-wrap gap-3">
                    {[10, 20, 50, 100].map((points) => (
                      <button
                        key={points}
                        type="button"
                        onClick={() => setSelectedPoints(points as 10 | 20 | 50 | 100)}
                        className={`rounded-full border px-4 py-2 text-sm font-bold transition ${selectedPoints === points ? "border-emerald-600 bg-emerald-50 text-slate-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                      >
                        {points}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {upcomingMatches.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">暂无可竞猜的比赛</div>
                  ) : upcomingMatches.map((match) => {
                    const selection = guessSelections[match.id] || { result: '', score: '' };
                    const displayDate = `${match.date} ${match.time}`;
                    return (
                      <div key={`${match.date}-${match.time}-${match.homeTeam}-${match.awayTeam}-${match.round}`} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="text-xs font-bold text-emerald-700">{match.round || '赛事竞猜'}</div>
                          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">已开售</div>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 text-center">
                            <div className="text-base font-bold text-slate-900">{match.homeTeam || '主队'}</div>
                            <div className="mt-1 text-xs text-slate-500">主队</div>
                          </div>
                          <div className="px-2 text-center text-sm font-black uppercase tracking-[0.35em] text-slate-400">VS</div>
                          <div className="flex-1 text-center">
                            <div className="text-base font-bold text-slate-900">{match.awayTeam || '客队'}</div>
                            <div className="mt-1 text-xs text-slate-500">客队</div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                          <div className="flex items-center gap-2 truncate"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{displayDate}</span></div>
                          <div className="flex items-center gap-2 truncate"><MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{match.homePlayers?.[0] ? `${match.homePlayers[0]} / ${match.awayPlayers?.[0] || ''}` : '官方主场'}</span></div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <div className="flex gap-2">
                            <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              <input
                                type="radio"
                                name={`bet${match.id}`}
                                className="w-4 h-4 accent-emerald-600"
                                checked={selection.result === '主胜'}
                                onChange={() => setGuessSelections(prev => ({ ...prev, [match.id]: { ...prev[match.id], result: '主胜' } }))}
                              /> 主胜
                            </label>
                            <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              <input
                                type="radio"
                                name={`bet${match.id}`}
                                className="w-4 h-4 accent-emerald-600"
                                checked={selection.result === '平局'}
                                onChange={() => setGuessSelections(prev => ({ ...prev, [match.id]: { ...prev[match.id], result: '平局' } }))}
                              /> 平局
                            </label>
                            <label className="flex items-center gap-1.5 whitespace-nowrap cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              <input
                                type="radio"
                                name={`bet${match.id}`}
                                className="w-4 h-4 accent-emerald-600"
                                checked={selection.result === '客胜'}
                                onChange={() => setGuessSelections(prev => ({ ...prev, [match.id]: { ...prev[match.id], result: '客胜' } }))}
                              /> 客胜
                            </label>
                          </div>
                          <input
                            type="text"
                            placeholder="如2-1"
                            value={selection.score ?? ''}
                            onChange={(e) => setGuessSelections(prev => ({ ...prev, [match.id]: { result: prev[match.id]?.result ?? '', score: e.target.value } }))}
                            className="w-[90px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm text-slate-900 outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="text-sm font-semibold text-slate-800">确认竞猜前请先选择积分</div>
                  <button
                    onClick={handleGuessSubmit}
                    disabled={submitting}
                    className="w-[140px] rounded-full bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submitting ? '提交中...' : '确认竞猜'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <div className="h-[20px]"></div>
    </main>
  );
}