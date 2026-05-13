"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, User, LogIn, Send, CalendarDays, MapPin, Image as ImageIcon, Paperclip, Smile, Bell, BellOff, Brain, TrendingUp, Shield, Zap, Target, ChevronDown, ChevronUp } from "lucide-react";
import { useUserStore } from "@/lib/store";
import { connectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

const API = "http://localhost:5002";

// --- 类型定义 ---
type QuizMatch = {
  id: string;
  date: string;
  time: string;
  round: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  season: string;
  timestamp: string;
};

type MatchStatus = 0 | 1 | 2; // 0=未开始, 1=进行中, 2=已结束

type PredictionFactor = {
  label: string;
  homeValue: string | number;
  awayValue: string | number;
  winner: 'home' | 'away' | 'draw';
};

type MatchPrediction = {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  homeStrength: number;
  awayStrength: number;
  homeStats: { points: number; wins: number; draws: number; losses: number; goals: number; conceded: number };
  awayStats: { points: number; wins: number; draws: number; losses: number; goals: number; conceded: number };
  factors: PredictionFactor[];
  prediction: string;
  confidence: number;
};

type ChatRoom = {
  id: number;
  name: string;
  type: string;
  status: string; // 'active' | 'upcoming' | 'closed'
  online_count: number;
  subscriberCount: number;
  isSubscribed: boolean;
  match: {
    id: number;
    status: MatchStatus;
    match_time: string;
    home_team: { id: number; name: string };
    away_team: { id: number; name: string };
    home_score: number | null;
    away_score: number | null;
  } | null;
};

type ChatMessage = {
  id: number;
  room_id: number;
  user_id: number;
  username: string;
  avatar_url?: string | null;
  type: 'TEXT' | 'SYSTEM' | 'EVENT' | 'IMAGE' | 'FILE' | 'EMOJI';
  content: string;
  reply_to?: number | null;
  created_at: string;
};

const EMOJI_LIST = ['😀','😂','🥰','😎','🤔','😮','😢','😡','👍','👎','🎉','⚽','🏆','🔥','💪','👏'];

function getMatchStatusLabel(room: ChatRoom): { label: string; color: string } {
  if (room.type === 'global') return { label: '在线', color: 'text-emerald-600 bg-emerald-50' };
  const s = room.status;
  if (s === 'closed') return { label: '已结束', color: 'text-gray-400 bg-gray-100' };
  if (s === 'upcoming') return { label: '未开始', color: 'text-blue-600 bg-blue-50' };
  if (s === 'active') return { label: '进行中', color: 'text-emerald-700 bg-emerald-50' };
  return { label: '热聊中', color: 'text-emerald-700 bg-emerald-50' };
}

function groupRoomsByRound(rooms: ChatRoom[]): { round: string; rooms: ChatRoom[] }[] {
  const globalRooms = rooms.filter(r => r.type === 'global');
  const matchRooms = rooms.filter(r => r.type !== 'global');

  const roundMap = new Map<string, { date: Date; label: string; rooms: ChatRoom[] }>();
  for (const room of matchRooms) {
    const matchTime = room.match?.match_time;
    if (matchTime) {
      const d = new Date(matchTime);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${d.getMonth() + 1}月${d.getDate()}日`;
      if (!roundMap.has(dateKey)) {
        roundMap.set(dateKey, { date: d, label, rooms: [] });
      }
      roundMap.get(dateKey)!.rooms.push(room);
    }
  }

  // Sort by date ascending
  const sortedEntries = Array.from(roundMap.entries()).sort((a, b) => a[1].date.getTime() - b[1].date.getTime());

  const groups: { round: string; rooms: ChatRoom[] }[] = [];
  if (globalRooms.length > 0) groups.push({ round: '总聊天室', rooms: globalRooms });
  for (const [, { label, rooms: rs }] of sortedEntries) {
    groups.push({ round: label, rooms: rs });
  }
  return groups;
}

function MessageBubble({ msg, currentUserId }: { msg: ChatMessage; currentUserId: number | null }) {
  const isOwn = msg.user_id === currentUserId;

  if (msg.type === 'SYSTEM' || msg.type === 'EVENT') {
    return (
      <div className="flex justify-center my-2">
        <span className={`text-xs px-4 py-1.5 rounded-full ${msg.type === 'EVENT' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
          {msg.content}
        </span>
      </div>
    );
  }

  const renderContent = () => {
    if (msg.type === 'IMAGE') {
      return (
        <img
          src={msg.content}
          alt="图片"
          className="max-w-[300px] max-h-[300px] rounded-lg cursor-pointer object-contain"
          onClick={() => window.open(msg.content, '_blank')}
        />
      );
    }
    if (msg.type === 'FILE') {
      try {
        const fileData = JSON.parse(msg.content);
        const sizeInMB = (fileData.size / (1024 * 1024)).toFixed(2);
        return (
          <a
            href={fileData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 underline"
          >
            <Paperclip className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span className="font-medium">{fileData.name}</span>
              <span className="text-xs opacity-70">{sizeInMB} MB</span>
            </div>
          </a>
        );
      } catch {
        // Fallback for old format (just URL string)
        return (
          <a
            href={msg.content}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
          >
            <Paperclip className="w-3 h-3" />下载文件
          </a>
        );
      }
    }
    if (msg.type === 'EMOJI') return <span className="text-3xl">{msg.content}</span>;
    return <span className="break-words">{msg.content}</span>;
  };

  return (
    <div className={`flex gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Link href={`/profile?userId=${msg.user_id}`} className="shrink-0">
        <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-400 transition">
          {msg.avatar_url ? (
            <img src={msg.avatar_url} alt={msg.username} className="w-full h-full object-cover" />
          ) : (
            <span>{msg.username?.[0]?.toUpperCase() || '?'}</span>
          )}
        </div>
      </Link>
      <div className={`flex flex-col max-w-[65%] ${isOwn ? 'items-end' : ''}`}>
        <span className="text-[11px] text-slate-400 mb-1">{msg.username} · {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isOwn ? 'bg-[#008000] text-white' : 'bg-white text-slate-800 border border-slate-200'} shadow-sm`}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const searchParams = useSearchParams();
  const { token, userId, username, avatar_url } = useUserStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'quiz' | 'chat'>('quiz');

  // 聊天室状态
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'TEXT' | 'SYSTEM' | 'EVENT'>('all');
  const [showEmoji, setShowEmoji] = useState(false);
  const [onlineCount, setOnlineCount] = useState<Record<number, number>>({});
  const [subscriberCounts, setSubscriberCounts] = useState<Record<number, number>>({});
  const [subscribedRooms, setSubscribedRooms] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const activeRoomIdRef = useRef<number | null>(null);

  // Keep activeRoomIdRef in sync with activeRoomId
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  // 竞猜状态
  const [upcomingMatches, setUpcomingMatches] = useState<QuizMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [guessSelections, setGuessSelections] = useState<Record<string, { result: string; score: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<number>(10);
  const [predictions, setPredictions] = useState<Record<string, MatchPrediction | null>>({});
  const [predLoading, setPredLoading] = useState<Record<string, boolean>>({});
  const [expandedPred, setExpandedPred] = useState<Record<string, boolean>>({});


  useEffect(() => {
    setMounted(true);
    const tab = searchParams.get('tab');
    if (tab === 'quiz' || tab === 'chat') setActiveTab(tab);
  }, [searchParams]);

  // 加载聊天室列表
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API}/api/chat/rooms`, { headers });
      const json = await res.json();
      if (json.code === 200 && Array.isArray(json.data)) {
        const data: ChatRoom[] = json.data;
        setRooms(data);
        const counts: Record<number, number> = {};
        const subCounts: Record<number, number> = {};
        const subSet = new Set<number>();
        for (const r of data) {
          counts[r.id] = r.online_count;
          subCounts[r.id] = r.subscriberCount;
          if (r.isSubscribed) subSet.add(r.id);
        }
        setOnlineCount(counts);
        setSubscriberCounts(subCounts);
        setSubscribedRooms(subSet);
        if (!activeRoomId && data.length > 0) {
          const globalRoom = data.find(r => r.type === 'global');
          setActiveRoomId(globalRoom?.id ?? data[0].id);
        }
      }
    } catch (e) {
      console.error('加载聊天室失败', e);
    } finally {
      setRoomsLoading(false);
    }
  }, [token, activeRoomId]);

  // 加载消息历史
  const loadMessages = useCallback(async (roomId: number) => {
    if (!token) return;
    setMessagesLoading(true);
    try {
      const res = await fetch(`${API}/api/chat/rooms/${roomId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) setMessages(json.data.items ?? []);
    } catch (e) {
      console.error('加载消息失败', e);
    } finally {
      setMessagesLoading(false);
    }
  }, [token]);

  // WebSocket 连接
  useEffect(() => {
    if (!token || activeTab !== 'chat') return;

    console.log('[Chat] Initializing WebSocket connection');
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Chat] Socket connected, joining room:', activeRoomIdRef.current);
      if (activeRoomIdRef.current) {
        socket.emit('joinRoom', { roomId: activeRoomIdRef.current });
      }
    });

    socket.on('newMessage', (msg: ChatMessage) => {
      console.log('[Chat] Received newMessage:', msg);
      setMessages(prev => [...prev, msg]);
    });

    socket.on('onlineCount', ({ roomId, count }: { roomId: number; count: number }) => {
      setOnlineCount(prev => ({ ...prev, [roomId]: count }));
    });

    socket.on('subscriberCount', ({ roomId, count }: { roomId: number; count: number }) => {
      setSubscriberCounts(prev => ({ ...prev, [roomId]: count }));
    });

    socket.on('connect_error', (error) => {
      console.error('[Chat] Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected:', reason);
    });

    return () => {
      socket.off('connect');
      socket.off('newMessage');
      socket.off('onlineCount');
      socket.off('subscriberCount');
      socket.off('connect_error');
      socket.off('disconnect');
    };
  }, [token, activeTab]);

  // 切换聊天室时加入/离开房间
  useEffect(() => {
    if (!activeRoomId || !socketRef.current) return;
    const socket = socketRef.current;

    console.log('[Chat] Switching to room:', activeRoomId, 'Socket connected:', socket.connected);
    socket.emit('joinRoom', { roomId: activeRoomId });
    loadMessages(activeRoomId);

    return () => {
      socket.emit('leaveRoom', { roomId: activeRoomId });
    };
  }, [activeRoomId, loadMessages]);

  // 进入聊天tab时加载房间
  useEffect(() => {
    if (activeTab === 'chat') loadRooms();
    if (activeTab === 'quiz') loadUpcomingMatches();
  }, [activeTab, token]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadUpcomingMatches = async () => {
    setMatchesLoading(true);
    try {
      const res = await fetch(`${API}/api/matches/upcoming/2026`);
      const json = await res.json();
      if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
        setUpcomingMatches(json.data as QuizMatch[]);
      }
    } catch (e) {
      console.error('加载2026赛程失败', e);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleSendMessage = async (type: 'TEXT' | 'EMOJI' = 'TEXT', content?: string) => {
    const text = content ?? inputMessage.trim();
    if (!text || !activeRoomId || !token) return;
    if (!userId) { alert('请先登录'); return; }

    console.log('[Chat] Sending message:', { roomId: activeRoomId, type, content: text, socketConnected: socketRef.current?.connected });

    setSending(true);
    try {
      socketRef.current?.emit('sendMessage', { roomId: activeRoomId, type, content: text });
      if (type === 'TEXT') setInputMessage('');
      setShowEmoji(false);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'IMAGE' | 'FILE') => {
    if (!token || !activeRoomId) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const json = await res.json();
      if (json.code === 200 && json.data?.url) {
        // Store file metadata as JSON string for FILE type
        const content = type === 'FILE'
          ? JSON.stringify({ url: json.data.url, name: json.data.originalName || file.name, size: json.data.size || file.size })
          : json.data.url;
        socketRef.current?.emit('sendMessage', { roomId: activeRoomId, type, content });
      }
    } catch (e) { console.error('上传失败', e); }
  };

  const handleSubscribe = async (roomId: number) => {
    if (!token) { alert('请先登录'); return; }
    const isSubbed = subscribedRooms.has(roomId);
    try {
      const res = await fetch(`${API}/api/chat/rooms/${roomId}/subscribe`, {
        method: isSubbed ? 'DELETE' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.code === 200) {
        setSubscribedRooms(prev => {
          const next = new Set(prev);
          isSubbed ? next.delete(roomId) : next.add(roomId);
          return next;
        });
        setSubscriberCounts(prev => ({ ...prev, [roomId]: json.data.subscriberCount }));
      }
    } catch (e) { console.error('预约操作失败', e); }
  };

  const handleGuessSubmit = async () => {
    if (!token) { alert('请先登录'); return; }
    const selections = Object.entries(guessSelections).filter(([, v]) => v.result);
    if (selections.length === 0) { alert('请至少选择一场比赛进行竞猜'); return; }
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
    } catch { alert('提交失败，请重试'); }
    finally { setSubmitting(false); }
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const visibleMessages = messages.filter(m => filter === 'all' ? true : m.type === filter);
  const roomGroups = groupRoomsByRound(rooms);

  if (!mounted) return null;

  return (
    <main className="relative min-h-screen text-white overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/pexels-tomfisk-3448250 2.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-black/70" />
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] text-white/75 hover:text-white transition-all">首页</Link>
            <Link href="/matches" className="text-[17px] text-white/75 hover:text-white transition-all">赛事</Link>
            <Link href="/teams" className="text-[17px] text-white/75 hover:text-white transition-all">球员/球队</Link>
            <Link href="/community?tab=quiz" className="text-[17px] text-white border-b-2 border-[#00ff00] pb-0.5 transition-all">互动</Link>
            <Link href="/shop" className="text-[17px] text-white/75 hover:text-white transition-all">周边商城</Link>
            <Link href="/analysis/upload" className="text-[17px] text-white/75 hover:text-white transition-all">视频分析</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[280px] h-[36px] bg-white/10 rounded-full flex items-center border border-white/20 overflow-hidden">
              <input type="text" placeholder="搜索比赛、球队、球员..." className="w-full h-full bg-transparent outline-none px-4 text-[13px] text-white placeholder:text-white/40" />
              <Search className="w-4 h-4 text-white/40 mr-3 shrink-0" />
            </div>
            <Link href="/auth" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap"><LogIn className="w-4 h-4" /> 登录</Link>
            <Link href="/profile" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap"><User className="w-4 h-4" /> 个人中心</Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 px-[120px] pb-[80px] pt-[60px] max-w-[1540px] mx-auto">
        <div className="flex gap-[50px] items-start">
          <div className="w-[250px] rounded-2xl overflow-hidden shrink-0 border border-white/10 bg-black/40 backdrop-blur-xl">
            {(['quiz', 'chat'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full h-[70px] flex items-center justify-center cursor-pointer transition-all border-b border-white/10 text-[18px] font-medium text-white ${activeTab === tab ? 'bg-[#008000]/80 text-[20px] font-bold border-l-2 border-l-[#00ff00]' : 'hover:bg-white/5 hover:text-[20px] hover:font-bold'}`}>
                {tab === 'quiz' ? '赛事竞猜' : '聊天室'}
              </button>
            ))}
          </div>

          <div className="w-[1000px] min-h-[700px] bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-[30px]">

            {/* ===== 聊天室 ===== */}
            {activeTab === 'chat' && (
              <div className="flex h-[700px] gap-4">
                {/* 左侧房间列表 */}
                <div className="w-[260px] shrink-0 rounded-2xl border border-white/10 bg-black/30 p-3 overflow-y-auto">
                  <div className="mb-2 text-sm font-bold text-white/60 px-1">聊天室房间</div>
                  {roomsLoading ? (
                    <div className="text-center text-xs text-white/30 py-8">加载中...</div>
                  ) : roomGroups.length === 0 ? (
                    <div className="text-center text-xs text-white/30 py-8">暂无聊天室</div>
                  ) : roomGroups.map(group => (
                    <div key={group.round} className="mb-3">
                      <div className="text-[11px] font-semibold text-white/30 px-1 mb-1 uppercase tracking-wide">{group.round}</div>
                      {group.rooms.map(room => {
                        const { label, color } = getMatchStatusLabel(room);
                        const isClosed = room.status === 'closed';
                        const isUpcoming = room.status === 'upcoming';
                        const isSelected = room.id === activeRoomId;
                        return (
                          <button
                            key={room.id}
                            type="button"
                            onClick={() => !isClosed && setActiveRoomId(room.id)}
                            disabled={isClosed}
                            className={`w-full rounded-xl border p-3 text-left transition mb-2 ${isClosed ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/5' : isSelected ? 'border-[#008000] bg-[#008000]/20 shadow-[0_0_12px_rgba(0,128,0,0.2)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <div className={`truncate text-xs font-bold ${isClosed ? 'text-white/30' : 'text-white'}`}>{room.name}</div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>{label}</span>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/30">
                              <span>在线 {(onlineCount[room.id] ?? room.online_count).toLocaleString()}</span>
                              {isUpcoming && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); handleSubscribe(room.id); }}
                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleSubscribe(room.id); } }}
                                  className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold transition cursor-pointer ${subscribedRooms.has(room.id) ? 'bg-[#008000]/30 text-[#00ff00]' : 'bg-white/10 text-white/50 hover:bg-[#008000]/20 hover:text-[#00ff00]'}`}
                                >
                                  {subscribedRooms.has(room.id) ? <BellOff className="w-2.5 h-2.5" /> : <Bell className="w-2.5 h-2.5" />}
                                  {subscribedRooms.has(room.id) ? '取消' : '预约'} {subscriberCounts[room.id] ?? room.subscriberCount}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* 右侧聊天区 */}
                <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                  {!activeRoom ? (
                    <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
                      {token ? '请选择一个聊天室' : <span>请先<Link href="/auth" className="text-[#00ff00] underline mx-1">登录</Link>后进入聊天室</span>}
                    </div>
                  ) : (
                    <>
                      {/* 头部 */}
                      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-3">
                        <div>
                          <h3 className="text-base font-bold text-white">{activeRoom.name}</h3>
                          {activeRoom.match && (
                            <p className="text-xs text-white/40">
                              {activeRoom.match.home_team?.name} vs {activeRoom.match.away_team?.name}
                              {activeRoom.match.home_score != null && ` · ${activeRoom.match.home_score}:${activeRoom.match.away_score}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-[#008000]/40 bg-[#008000]/20 px-3 py-1 text-xs font-bold text-[#00ff00]">
                            在线 {(onlineCount[activeRoom.id] ?? activeRoom.online_count).toLocaleString()}
                          </span>
                          {activeRoom.status === 'upcoming' && (
                            <button
                              onClick={() => handleSubscribe(activeRoom.id)}
                              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${subscribedRooms.has(activeRoom.id) ? 'bg-[#008000]/30 text-[#00ff00] hover:bg-red-500/20 hover:text-red-400' : 'bg-white/10 text-white/60 hover:bg-[#008000]/20 hover:text-[#00ff00]'}`}
                            >
                              {subscribedRooms.has(activeRoom.id) ? <><BellOff className="w-3 h-3" />取消预约</> : <><Bell className="w-3 h-3" />预约</>}
                              <span className="ml-0.5">{subscriberCounts[activeRoom.id] ?? activeRoom.subscriberCount}人</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 消息过滤 */}
                      <div className="flex gap-2 border-b border-white/10 px-4 py-2">
                        {(['all', 'TEXT', 'SYSTEM', 'EVENT'] as const).map(f => (
                          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${filter === f ? 'bg-[#008000]/80 text-white border border-[#008000]' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                            {f === 'all' ? '全部' : f === 'TEXT' ? '聊天' : f === 'SYSTEM' ? '系统' : '比赛事件'}
                          </button>
                        ))}
                      </div>

                      {/* 消息列表 */}
                      <div className="flex-1 overflow-y-auto bg-black/20 p-4">
                        {messagesLoading ? (
                          <div className="text-center text-xs text-white/30 py-8">加载消息中...</div>
                        ) : visibleMessages.length === 0 ? (
                          <div className="text-center text-xs text-white/30 py-8">暂无消息，快来发言吧！</div>
                        ) : visibleMessages.map(msg => (
                          <MessageBubble key={msg.id} msg={msg} currentUserId={userId} />
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* 输入区 */}
                      {activeRoom.status === 'closed' ? (
                        <div className="border-t border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/30">比赛已结束，聊天室已关闭</div>
                      ) : !token ? (
                        <div className="border-t border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/50">
                          <Link href="/auth" className="text-[#00ff00] underline">登录</Link>后参与聊天
                        </div>
                      ) : (
                        <div className="border-t border-white/10 bg-black/20 p-3">
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {['进球了！', '裁判有争议', '防守太强了', '继续压上', '加油！'].map(text => (
                              <button key={text} type="button" onClick={() => setInputMessage(text)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white">{text}</button>
                            ))}
                          </div>
                          {showEmoji && (
                            <div className="mb-2 flex flex-wrap gap-1 p-2 bg-black/30 rounded-xl border border-white/10">
                              {EMOJI_LIST.map(e => (
                                <button key={e} type="button" onClick={() => handleSendMessage('EMOJI', e)} className="text-xl hover:scale-125 transition-transform p-0.5">{e}</button>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2 items-center">
                            <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 rounded-full hover:bg-white/10 text-white/40 transition" title="发送图片">
                              <ImageIcon className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-white/10 text-white/40 transition" title="发送文件">
                              <Paperclip className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setShowEmoji(v => !v)} className={`p-2 rounded-full transition ${showEmoji ? 'bg-[#008000]/30 text-[#00ff00]' : 'hover:bg-white/10 text-white/40'}`} title="表情">
                              <Smile className="w-4 h-4" />
                            </button>
                            <input
                              type="text"
                              value={inputMessage}
                              onChange={e => setInputMessage(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                              placeholder="输入聊天内容..."
                              className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00ff00]/50"
                            />
                            <button onClick={() => handleSendMessage()} disabled={sending || !inputMessage.trim()} className="flex h-[38px] w-20 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#008000] to-[#00b300] text-sm font-semibold text-white transition-all hover:shadow-[0_4px_12px_rgba(0,128,0,0.4)] disabled:opacity-50">
                              <Send className="h-3.5 w-3.5" />发送
                            </button>
                          </div>
                          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'IMAGE'); e.target.value = ''; }} />
                          <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'FILE'); e.target.value = ''; }} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===== 赛事竞猜 ===== */}
            {activeTab === 'quiz' && (
              <div className="font-sans text-white">
                {/* 顶部标题栏 */}
                <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#00ff00]/20 bg-gradient-to-r from-black/60 to-[#001a00]/60 px-5 py-4 backdrop-blur-sm" style={{ boxShadow: '0 0 30px rgba(0,255,0,0.05), inset 0 0 30px rgba(0,255,0,0.02)' }}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="w-5 h-5 text-[#00ff00]" />
                      <h3 className="text-xl font-bold text-white tracking-wide">AI 赛事竞猜</h3>
                      <span className="rounded-full border border-[#00ff00]/40 bg-[#00ff00]/10 px-2 py-0.5 text-[10px] font-bold text-[#00ff00] tracking-widest">BETA</span>
                    </div>
                    <p className="text-sm text-white/40">基于真实积分榜数据，AI 智能预测赛果，供参考竞猜</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/30 mb-1">每次消耗积分</div>
                    <div className="flex gap-1.5">
                      {[10, 20, 50, 100].map(points => (
                        <button key={points} type="button" onClick={() => setSelectedPoints(points)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${selectedPoints === points ? 'border-[#00ff00]/60 bg-[#00ff00]/15 text-[#00ff00] shadow-[0_0_10px_rgba(0,255,0,0.2)]' : 'border-white/15 bg-white/5 text-white/40 hover:border-white/30 hover:text-white/70'}`}>{points}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 比赛卡片列表 */}
                <div className="space-y-4">
                  {matchesLoading ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-10 flex flex-col items-center gap-3">
                      <div className="h-8 w-8 rounded-full border-2 border-[#00ff00]/30 border-t-[#00ff00] animate-spin" />
                      <span className="text-sm text-white/40">正在加载 2026 赛季赛程...</span>
                    </div>
                  ) : upcomingMatches.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-white/40">暂无可竞猜的比赛</div>
                  ) : upcomingMatches.map(match => {
                    const selection = guessSelections[match.id] || { result: '', score: '' };
                    const pred = predictions[match.id];
                    const loading = predLoading[match.id];
                    const expanded = expandedPred[match.id];

                    const fetchPrediction = async () => {
                      if (pred || loading) return;
                      setPredLoading(prev => ({ ...prev, [match.id]: true }));
                      try {
                        const home = encodeURIComponent(match.homeTeam);
                        const away = encodeURIComponent(match.awayTeam);
                        const res = await fetch(`${API}/api/matches/prediction/${home}/${away}`);
                        const json = await res.json();
                        if (json.code === 200) {
                          setPredictions(prev => ({ ...prev, [match.id]: json.data }));
                          setExpandedPred(prev => ({ ...prev, [match.id]: true }));
                        }
                      } catch { /* ignore */ } finally {
                        setPredLoading(prev => ({ ...prev, [match.id]: false }));
                      }
                    };

                    const confidenceColor = !pred ? '#ffffff' : pred.confidence >= 70 ? '#00ff88' : pred.confidence >= 50 ? '#ffd700' : '#ff6b6b';
                    const predLabel = !pred ? '' : pred.prediction === 'home' ? `${match.homeTeam} 胜` : pred.prediction === 'away' ? `${match.awayTeam} 胜` : '平局';

                    return (
                      <div key={match.id} className="rounded-2xl border border-white/10 bg-gradient-to-b from-black/50 to-black/30 overflow-hidden backdrop-blur-sm transition-all" style={{ boxShadow: pred ? '0 0 20px rgba(0,255,0,0.06)' : 'none' }}>
                        {/* 卡片头部：轮次 + 时间 */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md border border-[#00ff00]/30 bg-[#00ff00]/10 px-2 py-0.5 text-[11px] font-bold text-[#00ff00] tracking-wider">{match.round}</span>
                            <span className="text-xs text-white/30">已开售</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/40">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{match.date} {match.time}</span>
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{match.venue || '官方主场'}</span>
                          </div>
                        </div>

                        {/* 队伍对阵 */}
                        <div className="px-5 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 text-center">
                              <div className="text-lg font-black text-white tracking-wide">{match.homeTeam}</div>
                              <div className="mt-1 text-[11px] text-white/30 tracking-widest">主队</div>
                              {pred && <div className="mt-2 text-2xl font-black" style={{ color: '#00ddff' }}>{pred.homeStrength}<span className="text-xs font-normal text-white/30 ml-0.5">分</span></div>}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="text-sm font-black tracking-[0.4em] text-white/20">VS</div>
                              {pred && (
                                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-white/40">
                                  综合实力
                                </div>
                              )}
                            </div>
                            <div className="flex-1 text-center">
                              <div className="text-lg font-black text-white tracking-wide">{match.awayTeam}</div>
                              <div className="mt-1 text-[11px] text-white/30 tracking-widest">客队</div>
                              {pred && <div className="mt-2 text-2xl font-black" style={{ color: '#ff6b6b' }}>{pred.awayStrength}<span className="text-xs font-normal text-white/30 ml-0.5">分</span></div>}
                            </div>
                          </div>
                        </div>

                        {/* AI 预测区域 */}
                        {!pred && !loading && (
                          <div className="mx-5 mb-4 rounded-xl border border-dashed border-[#00ff00]/20 bg-[#00ff00]/5 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-white/40">
                              <Brain className="w-4 h-4 text-[#00ff00]/50" />
                              <span>AI 智能预测尚未加载</span>
                            </div>
                            <button onClick={fetchPrediction} className="rounded-lg border border-[#00ff00]/40 bg-[#00ff00]/10 px-3 py-1.5 text-xs font-bold text-[#00ff00] transition hover:bg-[#00ff00]/20 hover:shadow-[0_0_12px_rgba(0,255,0,0.2)]">
                              获取预测
                            </button>
                          </div>
                        )}

                        {loading && (
                          <div className="mx-5 mb-4 rounded-xl border border-[#00ff00]/20 bg-black/30 px-4 py-4 flex items-center justify-center gap-3">
                            <div className="h-4 w-4 rounded-full border-2 border-[#00ff00]/30 border-t-[#00ff00] animate-spin" />
                            <span className="text-sm text-white/40">AI 正在分析赛事数据...</span>
                          </div>
                        )}

                        {pred && (
                          <div className="mx-5 mb-4 rounded-xl border border-[#00ff00]/15 bg-black/40 overflow-hidden">
                            {/* 预测结论横幅 */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5" style={{ background: `linear-gradient(90deg, ${confidenceColor}10, transparent)` }}>
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4" style={{ color: confidenceColor }} />
                                <span className="text-sm font-bold text-white">AI 预测：</span>
                                <span className="text-sm font-black" style={{ color: confidenceColor }}>{predLabel}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-white/30">置信度</span>
                                  <span className="text-sm font-bold" style={{ color: confidenceColor }}>{pred.confidence}%</span>
                                </div>
                                <button onClick={() => setExpandedPred(prev => ({ ...prev, [match.id]: !expanded }))} className="rounded-lg border border-white/10 bg-white/5 p-1 text-white/40 hover:text-white/70 transition">
                                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {/* 胜平负概率条 */}
                            <div className="px-4 py-3">
                              <div className="mb-2 flex justify-between text-[11px] text-white/40">
                                <span>主胜 {pred.homeWinPct}%</span>
                                <span>平局 {pred.drawPct}%</span>
                                <span>客胜 {pred.awayWinPct}%</span>
                              </div>
                              <div className="flex h-3 w-full overflow-hidden rounded-full">
                                <div className="transition-all duration-700" style={{ width: `${pred.homeWinPct}%`, background: 'linear-gradient(90deg, #00ddff, #0088ff)' }} />
                                <div className="transition-all duration-700" style={{ width: `${pred.drawPct}%`, background: 'linear-gradient(90deg, #888, #aaa)' }} />
                                <div className="transition-all duration-700" style={{ width: `${pred.awayWinPct}%`, background: 'linear-gradient(90deg, #ff6b6b, #ff4444)' }} />
                              </div>
                            </div>

                            {/* 展开详情 */}
                            {expanded && (
                              <div className="border-t border-white/5 px-4 pb-4 pt-3">
                                {/* 关键因素对比 */}
                                <div className="mb-3 flex items-center gap-1.5 text-xs text-white/40">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  <span className="font-semibold tracking-wider">关键数据对比</span>
                                </div>
                                <div className="space-y-2">
                                  {pred.factors.map((f, i) => (
                                    <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
                                      <div className={`text-right font-bold ${f.winner === 'home' ? 'text-[#00ddff]' : 'text-white/50'}`}>{f.homeValue}</div>
                                      <div className="w-[80px] text-center text-[10px] text-white/25 tracking-wide">{f.label}</div>
                                      <div className={`text-left font-bold ${f.winner === 'away' ? 'text-[#ff6b6b]' : 'text-white/50'}`}>{f.awayValue}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* 球队战绩速览 */}
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {[
                                    { label: match.homeTeam, stats: pred.homeStats, color: '#00ddff' },
                                    { label: match.awayTeam, stats: pred.awayStats, color: '#ff6b6b' },
                                  ].map(({ label, stats, color }) => (
                                    <div key={label} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
                                      <div className="mb-1.5 text-[11px] font-bold" style={{ color }}>{label}</div>
                                      <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-white/40">
                                        <div><div className="font-bold text-white/70">{stats.wins}</div><div>胜</div></div>
                                        <div><div className="font-bold text-white/70">{stats.draws}</div><div>平</div></div>
                                        <div><div className="font-bold text-white/70">{stats.losses}</div><div>负</div></div>
                                      </div>
                                      <div className="mt-1.5 flex justify-between text-[10px] text-white/30">
                                        <span>进球 <span className="text-white/60">{stats.goals}</span></span>
                                        <span>失球 <span className="text-white/60">{stats.conceded}</span></span>
                                        <span>积分 <span style={{ color }}>{stats.points}</span></span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* 主客场优势提示 */}
                                <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#ffd700]/15 bg-[#ffd700]/5 px-3 py-2 text-[11px] text-[#ffd700]/70">
                                  <Zap className="w-3 h-3 shrink-0 text-[#ffd700]/50" />
                                  <span>主场优势已纳入计算，主队胜率额外 +6%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 竞猜操作区 */}
                        <div className="border-t border-white/5 bg-black/20 px-5 py-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-white/20" />
                              <span className="text-xs text-white/30">选择结果：</span>
                            </div>
                            <div className="flex gap-2">
                              {['主胜', '平局', '客胜'].map(r => {
                                const isSelected = selection.result === r;
                                const isPredicted = pred && (
                                  (r === '主胜' && pred.prediction === 'home') ||
                                  (r === '平局' && pred.prediction === 'draw') ||
                                  (r === '客胜' && pred.prediction === 'away')
                                );
                                return (
                                  <label key={r} className={`relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all ${isSelected ? 'border-[#00ff00]/60 bg-[#00ff00]/15 text-[#00ff00] shadow-[0_0_10px_rgba(0,255,0,0.15)]' : 'border-white/15 bg-white/5 text-white/50 hover:border-white/30 hover:text-white/80'}`}>
                                    <input type="radio" name={`bet${match.id}`} className="sr-only" checked={isSelected} onChange={() => setGuessSelections(prev => ({ ...prev, [match.id]: { ...prev[match.id], result: r } }))} />
                                    {r}
                                    {isPredicted && <span className="ml-0.5 text-[9px] font-bold text-[#00ff00]/70">AI</span>}
                                  </label>
                                );
                              })}
                            </div>
                            <input type="text" placeholder="比分 如2-1" value={selection.score ?? ''} onChange={e => setGuessSelections(prev => ({ ...prev, [match.id]: { result: prev[match.id]?.result ?? '', score: e.target.value } }))} className="w-[100px] rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-center text-sm text-white placeholder:text-white/20 outline-none focus:border-[#00ff00]/40 focus:shadow-[0_0_8px_rgba(0,255,0,0.1)]" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 底部提交栏 */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-black/50 to-[#001a00]/40 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold text-white/60">确认竞猜</div>
                    <div className="text-xs text-white/30 mt-0.5">已选 {Object.values(guessSelections).filter(v => v.result).length} 场 · 消耗 {Object.values(guessSelections).filter(v => v.result).length * selectedPoints} 积分</div>
                  </div>
                  <button onClick={handleGuessSubmit} disabled={submitting} className="rounded-xl bg-gradient-to-r from-[#008000] to-[#00b300] px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)] disabled:opacity-50">
                    {submitting ? '提交中...' : '确认竞猜'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-[20px]" />
    </main>
  );
}
