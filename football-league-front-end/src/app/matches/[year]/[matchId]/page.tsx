"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, MapPin, Repeat2, ShieldCheck, X, Search, LogIn, User } from "lucide-react";
import { applyMatchDisplayRules, hasPenaltyShootout, parseRegularScore } from "@/lib/match-display";
import TeamBadge from "@/components/team-badge";
import Link from "next/link";
import { useUserStore } from "@/lib/store";

// --- 阵型坐标 ---
const FORMATION_BASE: Record<string, { id: number; role: string; x: number; y: number }[]> = {
  '4-4-2': [
    { id: 1, role: 'GK', x: 5, y: 50 },
    { id: 2, role: 'LB', x: 15, y: 20 }, { id: 3, role: 'LCB', x: 15, y: 40 }, { id: 4, role: 'RCB', x: 15, y: 60 }, { id: 5, role: 'RB', x: 15, y: 80 },
    { id: 6, role: 'LM', x: 30, y: 20 }, { id: 7, role: 'LCM', x: 30, y: 40 }, { id: 8, role: 'RCM', x: 30, y: 60 }, { id: 9, role: 'RM', x: 30, y: 80 },
    { id: 10, role: 'LS', x: 45, y: 35 }, { id: 11, role: 'RS', x: 45, y: 65 }
  ],
  '5-3-2': [
    { id: 1, role: 'GK', x: 5, y: 50 },
    { id: 2, role: 'LWB', x: 15, y: 10 }, { id: 3, role: 'LCB', x: 15, y: 30 }, { id: 4, role: 'CB', x: 15, y: 50 }, { id: 5, role: 'RCB', x: 15, y: 70 }, { id: 12, role: 'RWB', x: 15, y: 90 },
    { id: 6, role: 'LCM', x: 30, y: 30 }, { id: 7, role: 'CM', x: 30, y: 50 }, { id: 8, role: 'RCM', x: 30, y: 70 },
    { id: 10, role: 'LS', x: 45, y: 35 }, { id: 11, role: 'RS', x: 45, y: 65 }
  ],
  '4-3-3': [
    { id: 1, role: 'GK', x: 5, y: 50 },
    { id: 2, role: 'LB', x: 15, y: 20 }, { id: 3, role: 'LCB', x: 15, y: 40 }, { id: 4, role: 'RCB', x: 15, y: 60 }, { id: 5, role: 'RB', x: 15, y: 80 },
    { id: 6, role: 'LCM', x: 30, y: 30 }, { id: 7, role: 'CDM', x: 30, y: 50 }, { id: 8, role: 'RCM', x: 30, y: 70 },
    { id: 10, role: 'LW', x: 45, y: 20 }, { id: 11, role: 'ST', x: 45, y: 50 }, { id: 9, role: 'RW', x: 45, y: 80 }
  ],
  '5-4-1': [
    { id: 1, role: 'GK', x: 5, y: 50 },
    { id: 2, role: 'LWB', x: 15, y: 10 }, { id: 3, role: 'LCB', x: 15, y: 30 }, { id: 4, role: 'CB', x: 15, y: 50 }, { id: 5, role: 'RCB', x: 15, y: 70 }, { id: 12, role: 'RWB', x: 15, y: 90 },
    { id: 6, role: 'LM', x: 30, y: 20 }, { id: 7, role: 'LCM', x: 30, y: 40 }, { id: 8, role: 'RCM', x: 30, y: 60 }, { id: 9, role: 'RM', x: 30, y: 80 },
    { id: 10, role: 'ST', x: 45, y: 50 }
  ]
};

const DEFAULT_PLAYERS: Record<number, { name: string; number: number }> = {
  1: { name: '门将', number: 1 }, 2: { name: '后卫', number: 2 }, 3: { name: '后卫', number: 3 },
  4: { name: '后卫', number: 4 }, 5: { name: '后卫', number: 5 }, 6: { name: '中场', number: 6 },
  7: { name: '中场', number: 7 }, 8: { name: '中场', number: 8 }, 9: { name: '前锋', number: 9 },
  10: { name: '前锋', number: 10 }, 11: { name: '前锋', number: 11 }, 12: { name: '后卫', number: 12 },
};

type LineupPlayer = {
  name: string;
  player?: string | { name?: string; playerName?: string };
  playerName?: string;
  number?: number | string;
  jerseyNumber?: number | string;
  jersey_number?: number | string;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  externalId?: string | null;
  external_id?: string | null;
  profileUrl?: string | null;
  x?: number;
  y?: number;
  position?: string | null;
  order?: number;
  inferredFromRoster?: boolean;
  event?: {
    hasYellow?: boolean;
    type?: string;
    time?: string;
  };
};

type MatchEventItem = {
  team?: string;
  side?: string;
  team_type?: string;
  teamType?: string;
  event_type?: string;
  eventType?: string;
  player?: string;
  detail?: string;
  content?: string;
  minute?: string | number;
};

type TextLiveItem = {
  time?: string;
  content?: string;
};

type MatchDetail = {

  homeTeam: string;
  awayTeam: string;
  homeLogoColor?: string;
  awayLogoColor?: string;
  status: string;
  datetime: string;
  location?: string;
  score?: string;
  round?: string;
  timestamp: string;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  homePossession?: number;
  awayPossession?: number;
  homeAttack?: number;
  awayAttack?: number;
  homeDangerousAttack?: number;
  awayDangerousAttack?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homeShotsOffTarget?: number;
  awayShotsOffTarget?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeRedCards?: number;
  awayRedCards?: number;
  events?: MatchEventItem[];
  textLives?: TextLiveItem[];
  referee?: string | null;
  lineupHome?: { formation?: string; players?: Record<number, LineupPlayer> | LineupPlayer[]; referee?: string | null };
  lineupAway?: { formation?: string; players?: Record<number, LineupPlayer> | LineupPlayer[]; referee?: string | null };
};

function buildFormationSlots(formation: string) {
  if (FORMATION_BASE[formation]) return FORMATION_BASE[formation];
  const lines = formation.split("-").map((part) => Number(part)).filter((num) => Number.isFinite(num) && num > 0);
  if (!lines.length) return FORMATION_BASE["4-4-2"];
  const xByLine = [15, 30, 45, 48];
  const slots = [{ id: 1, role: "GK", x: 5, y: 50 }];
  let id = 2;
  lines.forEach((count, lineIndex) => {
    for (let i = 0; i < count; i += 1) {
      slots.push({
        id,
        role: `L${lineIndex + 1}`,
        x: xByLine[lineIndex] ?? Math.min(48, 15 + lineIndex * 12),
        y: ((i + 1) / (count + 1)) * 100,
      });
      id += 1;
    }
  });
  return slots.slice(0, 11);
}

function hasScrapedPoint(player: LineupPlayer) {
  return Number.isFinite(Number(player.x)) && Number.isFinite(Number(player.y));
}

function getLineupPlayerName(player: LineupPlayer) {
  if (typeof player.player === "object") {
    return player.player.name || player.player.playerName || player.name || player.playerName || "";
  }
  return player.name || player.playerName || (typeof player.player === "string" ? player.player : "") || "";
}

function getLineupPlayerNumber(player: LineupPlayer) {
  return player.number || player.jerseyNumber || player.jersey_number || "";
}

function isPlaceholderPlayer(player: LineupPlayer) {
  return ["门将", "后卫", "中场", "前锋"].includes(getLineupPlayerName(player));
}

function parseFormationLines(formation: string) {
  const lines = formation
    .split("-")
    .map((part) => Number(part))
    .filter((num) => Number.isFinite(num) && num > 0);
  return lines.length ? [1, ...lines].slice(0, 5) : [1, 4, 4, 2];
}

function lineXPositions(side: "home" | "away", lineCount: number) {
  const start = 7;
  const end = 43;
  const positions = Array.from({ length: lineCount }, (_, index) => {
    if (lineCount === 1) return start;
    return start + ((end - start) * index) / (lineCount - 1);
  });
  return side === "home" ? positions : positions.map((x) => 100 - x);
}

function playerSortValue(player: LineupPlayer, side: "home" | "away") {
  if (hasScrapedPoint(player)) {
    const depth = Number(player.y);
    return side === "home" ? depth : 100 - depth;
  }
  const position = player.position || "";
  if (position.includes("门将")) return 0;
  if (position.includes("后卫")) return 25;
  if (position.includes("中场")) return 55;
  if (position.includes("前锋") || position.includes("中锋")) return 85;
  return Number(player.order || 99);
}

function laneSortValue(player: LineupPlayer) {
  return hasScrapedPoint(player) ? Number(player.x) : Number(player.order || 99);
}

function distributeLineY(playersInLine: LineupPlayer[]) {
  const sorted = [...playersInLine].sort((a, b) => laneSortValue(a) - laneSortValue(b));
  return sorted.map((player, index) => {
    const count = sorted.length;
    if (count === 1) return { player, y: 50 };
    if (count === 2) return { player, y: 35 + 30 * index };
    const y = 12 + (76 * index) / (count - 1);
    return { player, y };
  });
}

function layoutByFormation(players: LineupPlayer[], formation: string, side: "home" | "away") {
  const lineCounts = parseFormationLines(formation);
  const xPositions = lineXPositions(side, lineCounts.length);
  const sortedPlayers = [...players].sort((a, b) => {
    const depthDiff = playerSortValue(a, side) - playerSortValue(b, side);
    return Math.abs(depthDiff) > 0.01 ? depthDiff : laneSortValue(a) - laneSortValue(b);
  });

  const layout: { id: number; x: number; y: number; player: LineupPlayer }[] = [];
  let cursor = 0;
  lineCounts.forEach((count, lineIndex) => {
    const linePlayers = sortedPlayers.slice(cursor, cursor + count);
    cursor += count;
    distributeLineY(linePlayers).forEach(({ player, y }, playerIndex) => {
      layout.push({
        id: lineIndex * 10 + playerIndex + 1,
        x: xPositions[lineIndex],
        y,
        player,
      });
    });
  });

  sortedPlayers.slice(cursor).forEach((player, index) => {
    layout.push({
      id: 90 + index,
      x: side === "home" ? 47 : 53,
      y: 18 + index * 8,
      player,
    });
  });

  return layout;
}

function normalizeLineupPlayers(
  players: Record<number, LineupPlayer> | LineupPlayer[] | undefined,
  formation: string,
  side: "home" | "away",
) {
  const slots = buildFormationSlots(formation);
  if (!players) {
    return slots.map((slot) => ({ ...slot, player: DEFAULT_PLAYERS[slot.id] as LineupPlayer }));
  }
  const list = Array.isArray(players)
    ? players
    : Object.entries(players).map(([key, value]) => ({ ...value, order: value.order ?? Number(key) }));

  const sourcePlayers = list
    .filter((player) => !player.inferredFromRoster)
    .filter((player) => getLineupPlayerName(player as LineupPlayer) && !isPlaceholderPlayer(player as LineupPlayer))
    .slice(0, 11);

  const renderPlayers = sourcePlayers.length
    ? sourcePlayers
    : list.filter((player) => getLineupPlayerName(player as LineupPlayer)).slice(0, 11);

  return layoutByFormation(renderPlayers as LineupPlayer[], formation, side);
}

function getEventType(event: MatchEventItem) {
  return event.event_type || event.eventType || "other";
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    goal: "进球",
    penalty_goal: "点球",
    penalty_missed: "点球不进",
    own_goal: "乌龙球",
    yellow_card: "黄牌",
    red_card: "红牌",
    substitution: "换人",
  };
  return labels[type] || "事件";
}

function EventMarker({ type, minute }: { type: string; minute?: string | number }) {
  if (type === "yellow_card" || type === "red_card") {
    return (
      <div className={`relative z-10 flex h-12 w-14 items-center justify-center rounded-lg text-sm font-black text-white shadow-lg ${type === "yellow_card" ? "bg-amber-400" : "bg-red-500"}`}>
        {minute}&apos;
      </div>
    );
  }
  if (type === "goal" || type === "penalty_goal" || type === "own_goal") {
    const borderColor = type === "penalty_goal" ? "border-emerald-500" : type === "own_goal" ? "border-fuchsia-500" : "border-amber-400";
    const extraLabel = type === "penalty_goal" ? "点球" : type === "own_goal" ? "乌龙" : "";
    return (
      <div className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 ${borderColor} bg-black/60 shadow-lg`}>
        <span className="text-xl">⚽️</span>
        {extraLabel && <span className="absolute -top-3 text-[10px] font-black text-white bg-black px-1.5 py-0.5 rounded">{extraLabel}</span>}
        <span className="absolute -bottom-5 flex items-center justify-center text-[12px] font-black text-white bg-black/80 px-2 py-0.5 rounded shadow-sm border border-white/10">{minute}&apos;</span>
      </div>
    );
  }
  if (type === "substitution") {
    return (
      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-100 bg-black/60 shadow-lg">
        <Repeat2 className="h-7 w-7 text-emerald-500" />
        <span className="absolute -bottom-5 flex items-center justify-center text-[12px] font-black text-white bg-black/80 px-2 py-0.5 rounded shadow-sm border border-white/10">{minute}&apos;</span>
      </div>
    );
  }
  if (type === "penalty_missed") {
    return (
      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-emerald-500 bg-black/60 shadow-lg">
        <span className="absolute -top-3 text-[10px] font-black text-white bg-black px-1.5 py-0.5 rounded">罚丢</span>
        <span className="text-sm font-black text-white">{minute}&apos;</span>
        <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"><X className="h-3 w-3" /></span>
      </div>
    );
  }
  return (
    <div className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-slate-500 bg-black/60 shadow-lg`}>
      <span className="text-sm font-black text-white">{minute}&apos;</span>
    </div>
  );
}

function EventCard({ event, align }: { event: MatchEventItem; align: "left" | "right" }) {
  const type = getEventType(event);
  let detail = event.detail || event.content || "";
  let player = event.player || "未知球员";

  if (type === "substitution") {
    if (detail.includes("换人，")) {
      const parts = detail.split("换人，");
      detail = parts[1].trim();
      player = "换人";
    } else if (detail.includes("↑") && detail.includes("↓")) {
      player = "换人";
    }
  }

  return (
    <div className={`rounded-2xl bg-white/5 border border-white/10 px-6 py-4 ${align === "left" ? "text-right" : "text-left"}`}>
      <div className="text-xs font-black tracking-[0.18em] text-white/40">{eventLabel(type)}</div>
      <div className="mt-1 text-lg font-black text-white">{player}</div>
      {detail && <div className="mt-1 text-sm font-bold text-white/60">{detail}</div>}
    </div>
  );
}

// --- 统计条组件 (百度风格) ---
function StatBar({ label, home, away }: { label: string; home: number; away: number }) {
  const total = (home + away) || 1;
  const homeW = Math.max((home / total) * 100, 2);
  const awayW = Math.max((away / total) * 100, 2);
  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-black text-white w-16 text-left tabular-nums">{home}</span>
        <span className="text-xs font-bold text-white/40 tracking-widest uppercase">{label}</span>
        <span className="text-lg font-black text-white w-16 text-right tabular-nums">{away}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1 flex justify-end"><div className="h-2 rounded-full bg-red-400 transition-all duration-700" style={{ width: `${homeW}%` }} /></div>
        <div className="w-1" />
        <div className="flex-1"><div className="h-2 rounded-full bg-blue-400 transition-all duration-700" style={{ width: `${awayW}%` }} /></div>
      </div>
    </div>
  );
}

// --- 球员节点 ---
function PlayerNode({ player, x, y, borderColor }: { player: LineupPlayer; x: number; y: number; borderColor: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatar = player.avatarUrl || player.avatar_url || player.avatar || null;
  const number = getLineupPlayerNumber(player);
  const name = getLineupPlayerName(player);
  const rawProfileUrl = player.profileUrl || null;
  const profileUrl = rawProfileUrl && /^https?:\/\//.test(rawProfileUrl) ? rawProfileUrl : null;
  const safeAvatar = avatar && !imageFailed && !avatar.includes('/player.png') && !avatar.includes('static.open.baidu.com')
    ? avatar
    : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (profileUrl) {
      window.open(profileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group transition-all duration-500 ${profileUrl ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={handleClick}
      title={profileUrl ? "点击查看球员详情" : ""}
    >
      <div className="relative">
        <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full border-[3px] shadow-lg overflow-hidden bg-white/90 ${borderColor} group-hover:scale-110 transition-transform z-10 relative flex items-center justify-center`}>
          {safeAvatar ? (
            <img src={safeAvatar} alt={name} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
          ) : (
            <span className="text-xs md:text-sm font-black text-slate-900">{number}</span>
          )}
        </div>
        {player.event && (
          <div className="absolute -top-1 -right-3 flex items-center bg-black/60 rounded-full px-1 py-0.5 shadow-sm text-[9px] font-bold z-20 border border-white/20">
            {player.event.hasYellow && <span className="w-2 h-2.5 bg-yellow-400 rounded-sm mr-1" />}
            {player.event.type === 'sub_out' && <span className="text-red-500 mr-0.5 font-black">⬇</span>}
            {player.event.time && <span className="text-gray-800">{player.event.time}</span>}
          </div>
        )}
      </div>
      <div className="mt-1 flex items-center justify-center text-white drop-shadow-md whitespace-nowrap">
        <span className="text-[10px] md:text-xs font-semibold tracking-wide bg-black/30 px-1.5 rounded-sm">{number ? `${number}.` : ""}{name}</span>
      </div>
    </div>
  );
}

export default function MatchDetailPage() {
  const { matchId, year } = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'live' | 'lineup'>('stats');
  const backUrl = `/matches/${year || '2026'}#赛程`;
  const { username } = useUserStore();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || !matchId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5002/api/matches/${matchId}`);
        const json = await res.json();
        if (json.code === 200 && json.data) setMatchDetail(applyMatchDisplayRules(json.data));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [mounted, matchId]);

  if (!mounted) return null;
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0a0a0a] to-[#111]">
      <div className="w-14 h-14 border-4 border-[#008000] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!matchDetail) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#0a0a0a] to-[#111]">
      <div className="text-center p-12 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl">
        <div className="text-5xl mb-6">📵</div>
        <h2 className="text-2xl font-black text-white mb-4">暂无赛事数据</h2>
        <button onClick={() => router.push(backUrl)} className="bg-gradient-to-r from-[#008000] to-[#00b300] text-white px-8 py-3 rounded-xl font-bold">返回列表</button>
      </div>
    </div>
  );

  const tabs = [
    { key: 'events', label: '赛事事件' },
    { key: 'stats', label: '技术统计' },
    { key: 'live', label: '文字直播' },
    { key: 'lineup', label: '首发阵容' },
  ] as const;

  const homeFormation = matchDetail.lineupHome?.formation || '4-4-2';
  const awayFormation = matchDetail.lineupAway?.formation || '4-4-2';
  const homePlayers = normalizeLineupPlayers(matchDetail.lineupHome?.players, homeFormation, "home");
  const awayPlayers = normalizeLineupPlayers(matchDetail.lineupAway?.players, awayFormation, "away");
  const referee = matchDetail.referee || matchDetail.lineupHome?.referee || matchDetail.lineupAway?.referee;
  const regularScore = parseRegularScore(matchDetail.score);
  const hasPenalties = hasPenaltyShootout(matchDetail);
  const events = (matchDetail.events ?? []).filter(e => getEventType(e) !== "other");
  const textLives = matchDetail.textLives ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#111] text-white">
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] text-white/75 hover:text-white transition-all">首页</Link>
            <Link href="/matches" className="text-[17px] text-white border-b-2 border-[#00ff00] pb-0.5">赛事</Link>
            <Link href="/teams" className="text-[17px] text-white/75 hover:text-white transition-all">球员/球队</Link>
            <Link href="/community?tab=quiz" className="text-[17px] text-white/75 hover:text-white transition-all">互动</Link>
            <Link href="/shop" className="text-[17px] text-white/75 hover:text-white transition-all">周边商城</Link>
            <Link href="/analysis/upload" className="text-[17px] text-white/75 hover:text-white transition-all">视频分析</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[280px] h-[36px] bg-white/10 rounded-full flex items-center border border-white/20 overflow-hidden">
              <input type="text" placeholder="搜索比赛、球队、球员..." className="w-full h-full bg-transparent outline-none px-4 text-[13px] text-white placeholder:text-white/40" />
              <Search className="w-4 h-4 text-white/40 mr-3 shrink-0" />
            </div>
            <Link href="/auth" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap"><LogIn className="w-4 h-4" /> 登录</Link>
            <Link href="/profile" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap"><User className="w-4 h-4" /> {username || '个人中心'}</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* 返回 + 状态 */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push(backUrl)} className="group flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white hover:border-[#008000]/50 px-5 py-3 rounded-2xl transition-all">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold">返回 {year} 赛季</span>
          </button>
          <div className="flex items-center gap-2 bg-[#008000]/20 px-5 py-2 rounded-full border border-[#008000]/30">
            <ShieldCheck className="text-[#00ff00] w-4 h-4" />
            <span className="text-[#00ff00] font-bold text-sm">{matchDetail.status}</span>
          </div>
        </div>

        {/* 对阵头部 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 md:p-16 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-col items-center flex-1">
              <TeamBadge teamName={matchDetail.homeTeam} season={String(year || "2026")} className="w-24 h-24 mb-4" priority />
              <h2 className="text-3xl font-black text-white">{matchDetail.homeTeam}</h2>
              <p className="text-white/40 font-bold text-xs tracking-widest mt-1">HOME</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-8">
                <span className="text-7xl md:text-8xl font-black text-white tabular-nums">{regularScore.home}</span>
                <span className="text-4xl font-black text-[#00ff00]">:</span>
                <span className="text-7xl md:text-8xl font-black text-white tabular-nums">{regularScore.away}</span>
              </div>
              {hasPenalties && (
                <div className="mt-4 rounded-full bg-white/10 px-5 py-2 text-xs font-black tracking-[0.24em] text-white/50 uppercase">
                  点球统计 [{matchDetail.homePenalties}] : [{matchDetail.awayPenalties}]
                </div>
              )}
              <div className="mt-6 flex items-center gap-4 text-white/60 text-sm font-bold">
                <span className="flex items-center gap-1"><Clock size={16} className="text-[#00ff00]" />{matchDetail.datetime}</span>
                <span className="flex items-center gap-1"><MapPin size={16} className="text-[#00ff00]" />{matchDetail.location || '官方主场'}</span>
              </div>
              {referee && <div className="mt-3 text-xs font-black tracking-[0.22em] text-white/40">裁判 {referee}</div>}
              <div className="mt-3 text-xs font-black uppercase tracking-[0.3em] text-white/40">{matchDetail.round || `${year}赛季`}</div>
            </div>
            <div className="flex flex-col items-center flex-1">
              <TeamBadge teamName={matchDetail.awayTeam} season={String(year || "2026")} className="w-24 h-24 mb-4" priority />
              <h2 className="text-3xl font-black text-white">{matchDetail.awayTeam}</h2>
              <p className="text-white/40 font-bold text-xs tracking-widest mt-1">AWAY</p>
            </div>
          </div>
        </motion.div>

        {/* TAB 栏 - 紧贴内容 */}
        <div className="bg-black/40 backdrop-blur-xl border border-b-0 border-white/10 rounded-t-[2rem] px-4 pt-4 flex gap-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex-1 py-4 rounded-t-2xl font-black text-sm transition-all ${activeTab === t.key ? 'bg-[#008000]/80 text-white border border-[#008000] shadow-lg' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 内容区 - 紧贴 TAB */}
        <div className="bg-black/40 backdrop-blur-xl border border-t-0 border-white/10 rounded-b-[2rem] p-8 md:p-12 min-h-[500px]">

          {/* ===== 技术统计 (百度风格) ===== */}
          {activeTab === 'stats' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="font-black text-white">{matchDetail.homeTeam}</span></div>
                <h3 className="text-xl font-black text-white">技术统计</h3>
                <div className="flex items-center gap-3"><span className="font-black text-white">{matchDetail.awayTeam}</span><div className="w-3 h-3 rounded-full bg-blue-400" /></div>
              </div>
              <div className="divide-y divide-white/5">
                <StatBar label="进球" home={regularScore.home} away={regularScore.away} />
                <StatBar label="控球率" home={matchDetail.homePossession || 50} away={matchDetail.awayPossession || 50} />
                <StatBar label="进攻" home={matchDetail.homeAttack || 0} away={matchDetail.awayAttack || 0} />
                <StatBar label="危险进攻" home={matchDetail.homeDangerousAttack || 0} away={matchDetail.awayDangerousAttack || 0} />
                <StatBar label="射正" home={matchDetail.homeShotsOnTarget || 0} away={matchDetail.awayShotsOnTarget || 0} />
                <StatBar label="射偏" home={matchDetail.homeShotsOffTarget || 0} away={matchDetail.awayShotsOffTarget || 0} />
                <StatBar label="角球" home={matchDetail.homeCorners || 0} away={matchDetail.awayCorners || 0} />
                <StatBar label="点球" home={matchDetail.homePenalties || 0} away={matchDetail.awayPenalties || 0} />
                <StatBar label="黄牌" home={matchDetail.homeYellowCards || 0} away={matchDetail.awayYellowCards || 0} />
                <StatBar label="红牌" home={matchDetail.homeRedCards || 0} away={matchDetail.awayRedCards || 0} />
              </div>
            </div>
          )}

          {/* ===== 赛事事件 (时间轴) ===== */}
          {activeTab === 'events' && (
            <div>
              <h3 className="text-xl font-black text-white mb-8">赛事事件</h3>
              {events.length > 0 ? (
                <div className="relative pb-8">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-white/20 -translate-x-1/2" />
                  {events.map((ev: MatchEventItem, idx: number) => {
                    const teamType = ev.team_type || ev.teamType || ev.side;
                    const isHome = ev.team === matchDetail.homeTeam || teamType === 'home';
                    const type = getEventType(ev);
                    return (
                      <div key={idx} className="relative grid grid-cols-[1fr_72px_1fr] items-center gap-5 mb-6">
                        <div className={isHome ? "" : "opacity-0 pointer-events-none"}>
                          {isHome && <EventCard event={ev} align="left" />}
                        </div>
                        <div className="flex justify-center">
                          <EventMarker type={type} minute={ev.minute} />
                        </div>
                        <div className={!isHome ? "" : "opacity-0 pointer-events-none"}>
                          {!isHome && <EventCard event={ev} align="right" />}
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-10 grid grid-cols-2 gap-4 text-sm font-bold text-white/50 md:grid-cols-4">
                    <div className="flex items-center justify-center gap-2"><EventMarker type="goal" minute="" /><span>进球</span></div>
                    <div className="flex items-center justify-center gap-2"><EventMarker type="penalty_goal" minute="" /><span>点球</span></div>
                    <div className="flex items-center justify-center gap-2"><EventMarker type="penalty_missed" minute="" /><span>点球不进</span></div>
                    <div className="flex items-center justify-center gap-2"><EventMarker type="own_goal" minute="" /><span>乌龙球</span></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-white/20">
                  <div className="text-7xl mb-6 opacity-30">📋</div>
                  <p className="text-xl font-black">暂无赛事事件数据</p>
                  <p className="text-sm text-white/40 mt-2">赛事详情爬取后将自动同步至此</p>
                </div>
              )}
            </div>
          )}

          {/* ===== 文字直播 ===== */}
          {activeTab === 'live' && (
            <div>
              <h3 className="text-xl font-black text-white mb-8">文字直播</h3>
              {textLives.length > 0 ? (
                <div className="space-y-0">
                  {textLives.map((item: TextLiveItem, idx: number) => {
                    const cleanTime = (item.time || '').replace(/纳米数据\s*/g, '').replace(/纳米直播\s*/g, '');
                    const cleanContent = (item.content || '').replace(/纳米数据\s*/g, '').replace(/纳米直播\s*/g, '');
                    return (
                    <div key={idx} className="flex items-start gap-6 py-5 border-b border-white/5 hover:bg-white/5 transition-colors">
                      <div className="flex-shrink-0 flex items-center gap-2 pt-1">
                        <div className="w-2 h-2 rounded-full bg-white/30" />
                        <span className="text-xs text-white/40 font-bold whitespace-normal max-w-[120px]">{cleanTime}</span>
                      </div>
                      <p className="text-white/80 font-bold text-base leading-relaxed">{cleanContent}</p>
                    </div>
                  )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-white/20">
                  <div className="text-7xl mb-6 opacity-30">📡</div>
                  <p className="text-xl font-black">暂无文字直播内容</p>
                  <p className="text-sm text-white/40 mt-2">比赛开始后将实时同步比赛文字播报</p>
                </div>
              )}
            </div>
          )}

          {/* ===== 首发阵容 (球场渲染) ===== */}
          {activeTab === 'lineup' && (
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-5xl flex justify-between items-center mb-4 px-6 py-2 bg-black/40 backdrop-blur-xl border border-[#008000]/30 rounded-full">
                <span className="text-[#00ff00] font-extrabold text-lg tracking-wider">{matchDetail.homeTeam} ({homeFormation})</span>
                <span className="text-white/30 font-black italic">VS</span>
                <span className="text-[#00ff00] font-extrabold text-lg tracking-wider">{matchDetail.awayTeam} ({awayFormation})</span>
              </div>
              <div className="w-full max-w-5xl overflow-x-auto rounded-xl shadow-lg">
                <div className="relative w-full aspect-[2/1] min-w-[700px] bg-[#4a8a31] overflow-hidden border-[4px] border-white/90">
                  {/* 草地条纹 */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div key={i} className={`flex-1 h-full ${i % 2 === 0 ? 'bg-white/[0.04]' : 'bg-transparent'}`} />
                    ))}
                  </div>
                  {/* 球场线条 */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-70" viewBox="0 0 240 120" preserveAspectRatio="none">
                    <g stroke="#ffffff" strokeWidth="1.2" fill="none">
                      <rect x="2" y="2" width="236" height="116" />
                      <line x1="120" y1="2" x2="120" y2="118" />
                      <circle cx="120" cy="60" r="18" />
                      <circle cx="120" cy="60" r="1" fill="#ffffff" />
                      <rect x="2" y="25" width="30" height="70" />
                      <rect x="2" y="42" width="10" height="36" />
                      <circle cx="22" cy="60" r="1" fill="#ffffff" />
                      <path d="M 32 45 A 18 18 0 0 1 32 75" />
                      <rect x="208" y="25" width="30" height="70" />
                      <rect x="228" y="42" width="10" height="36" />
                      <circle cx="218" cy="60" r="1" fill="#ffffff" />
                      <path d="M 208 45 A 18 18 0 0 0 208 75" />
                      <path d="M 2 8 A 6 6 0 0 0 8 2" />
                      <path d="M 2 112 A 6 6 0 0 1 8 118" />
                      <path d="M 238 8 A 6 6 0 0 1 232 2" />
                      <path d="M 238 112 A 6 6 0 0 0 232 118" />
                    </g>
                  </svg>
                  {/* 主队球员 */}
                  {homePlayers.map((pos) => {
                    const p = pos.player;
                    if (!p) return null;
                    return <PlayerNode key={`h-${pos.id}-${p.name}`} player={p} x={pos.x} y={pos.y} borderColor="border-red-500" />;
                  })}
                  {/* 客队球员 (镜像) */}
                  {awayPlayers.map((pos) => {
                    const p = pos.player;
                    if (!p) return null;
                    return <PlayerNode key={`a-${pos.id}-${p.name}`} player={p} x={pos.x} y={pos.y} borderColor="border-blue-500" />;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
