"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { Search, Users, Shield, Goal, Star, Shirt, UserRound, Heart, LogIn, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TeamBadge from "@/components/team-badge";
import { TEAM_LIST } from "@/lib/team-branding";
import { useUserStore } from "@/lib/store";

type Player = {
  id: string;
  name: string;
  position: string;
  number?: number | null;
  avatarUrl?: string | null;
  externalId?: string | null;
};

type TeamRoster = {
  id: string;
  name: string;
  city?: string;
  rosterSize: number;
  positionSummary: Record<string, number>;
  players: Player[];
};

const POSITION_ORDER = ["门将", "后卫", "中场", "前锋", "未分组"];

function emptyRoster(teamName: string): TeamRoster {
  return { id: teamName, name: teamName, rosterSize: 0, positionSummary: {}, players: [] };
}

export default function TeamsPage() {
  const { token, username } = useUserStore();
  const [teams, setTeams] = useState<TeamRoster[]>(TEAM_LIST.map((team) => emptyRoster(team.name)));
  const [activeTeamName, setActiveTeamName] = useState(TEAM_LIST[0]?.name || "南京");
  const [query, setQuery] = useState("");
  const [activePosition, setActivePosition] = useState("全部");
  const [loading, setLoading] = useState(true);
  const [followedTeamIds, setFollowedTeamIds] = useState<number[]>([]);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:5002/api/matches/teams/rosters");
        const json = await res.json();
        if (!alive || json.code !== 200) return;
        const byName = new Map<string, TeamRoster>(
          (json.data || []).map((team: TeamRoster) => {
            const cleanName = team.name.trim().replace(/队$/, "");
            return [cleanName, team];
          })
        );
        setTeams(TEAM_LIST.map((team) => byName.get(team.name) || emptyRoster(team.name)));
      } catch (error) {
        console.error(error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch("http://localhost:5002/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.code === 200 && json.data?.focusTeams) {
          setFollowedTeamIds(json.data.focusTeams.map((t: any) => t.id));
        }
      } catch (e) { console.error(e); }
    })();
  }, [token]);

  const toggleFollow = async (teamId: number) => {
    if (!token) { alert("请先登录"); return; }
    setFollowLoading(true);
    try {
      const newIds = followedTeamIds.includes(teamId)
        ? followedTeamIds.filter((id) => id !== teamId)
        : [...followedTeamIds, teamId];
      const res = await fetch("http://localhost:5002/api/user/focus-teams", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamIds: newIds }),
      });
      const json = await res.json();
      if (json.code === 200) setFollowedTeamIds(newIds);
    } catch (e) { console.error(e); }
    finally { setFollowLoading(false); }
  };

  const activeTeam = teams.find((team) => team.name === activeTeamName) || teams[0] || emptyRoster("南京");
  const availablePositions = useMemo(() => {
    const set = new Set(activeTeam.players.map((player) => player.position || "未分组"));
    return ["全部", ...POSITION_ORDER.filter((p) => set.has(p)), ...Array.from(set).filter((p) => !POSITION_ORDER.includes(p))];
  }, [activeTeam.players]);

  const filteredPlayers = activeTeam.players.filter((player) => {
    const matchPosition = activePosition === "全部" || player.position === activePosition;
    const matchQuery = !query || player.name.includes(query) || activeTeam.name.includes(query) || String(player.number || "").includes(query);
    return matchPosition && matchQuery;
  });

  const groupedPlayers = POSITION_ORDER.concat(availablePositions).reduce<Record<string, Player[]>>((acc, position) => {
    if (position === "全部" || acc[position]) return acc;
    const rows = filteredPlayers.filter((player) => (player.position || "未分组") === position);
    if (rows.length) acc[position] = rows;
    return acc;
  }, {});

  const topRosterTeams = [...teams].sort((a, b) => b.rosterSize - a.rosterSize).slice(0, 3);

  return (
    <main className="relative min-h-screen text-white">
      <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/pexels-natsuko-aoyama-53087545-12256528.jpg')" }} />
      <div className="fixed inset-0 z-0 bg-black/70" />
      {/* 导航栏 */}
      <nav className="sticky top-0 z-50 w-full h-[68px] bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="w-[1200px] h-full mx-auto flex items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[17px] text-white/75 hover:text-white transition-all">首页</Link>
            <Link href="/matches" className="text-[17px] text-white/75 hover:text-white transition-all">赛事</Link>
            <Link href="/teams" className="text-[17px] text-white border-b-2 border-[#00ff00] pb-0.5 transition-all">球员/球队</Link>
            <Link href="/community?tab=quiz" className="text-[17px] text-white/75 hover:text-white transition-all">互动</Link>
            <Link href="/shop" className="text-[17px] text-white/75 hover:text-white transition-all">周边商城</Link>
            <Link href="/analysis/upload" className="text-[17px] text-white/75 hover:text-white transition-all">视频分析</Link>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-[280px] h-[36px] bg-white/10 rounded-full flex items-center border border-white/20 overflow-hidden">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索球队、球员或号码"
                className="w-full h-full bg-transparent outline-none px-4 text-[13px] text-white placeholder:text-white/40"
              />
              <Search className="w-4 h-4 text-white/40 mr-3 shrink-0" />
            </div>
            <Link href="/auth" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
              <LogIn className="w-4 h-4" /> 登录
            </Link>
            <Link href="/profile" className="flex items-center gap-1 text-white/75 hover:text-white text-[15px] transition-all whitespace-nowrap">
              <User className="w-4 h-4" /> {username || "个人中心"}
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-[300px_1fr] gap-8 px-6 py-10">
        {/* 侧边栏 */}
        <aside className="sticky top-[84px] h-[calc(100vh-6rem)] overflow-hidden rounded-[2rem] border border-white/20 bg-black/70 backdrop-blur-2xl p-4">
          <div className="mb-4 flex items-center gap-3 px-3 py-2">
            <Users className="h-5 w-5 text-[#00ff00]" />
            <div>
              <div className="text-lg font-black text-white">江苏 13 队</div>
              <div className="text-xs font-bold text-white/40">阵容数据看板</div>
            </div>
          </div>
          <div className="h-[calc(100%-4rem)] overflow-y-auto pr-1">
            {teams.map((team) => (
              <button
                key={team.name}
                type="button"
                onClick={() => { setActiveTeamName(team.name); setActivePosition("全部"); }}
                className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${activeTeamName === team.name
                    ? "bg-[#008000]/80 text-white border border-[#008000] shadow-[0_0_12px_rgba(0,128,0,0.3)]"
                    : "text-white/80 hover:bg-white/10 border border-transparent"
                  }`}
              >
                <TeamBadge teamName={team.name} season="2026" className="h-10 w-10 shrink-0 bg-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">{team.name}</div>
                  <div className={`text-xs font-bold ${activeTeamName === team.name ? "text-white/70" : "text-white/60"}`}>{team.rosterSize || 0} 名球员</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* 主内容 */}
        <section className="min-w-0">
          <div className="mb-8 overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/75 backdrop-blur-xl">
            <div className="grid grid-cols-[1fr_340px]">
              <div className="p-10">
                <div className="mb-8 flex items-center gap-6">
                  <TeamBadge teamName={activeTeam.name} season="2026" className="h-24 w-24" priority />
                  <div className="flex-1">
                    <h1 className="text-5xl font-black tracking-tight text-white">{activeTeam.name}</h1>
                  </div>
                  <button
                    onClick={() => { const teamId = parseInt(activeTeam.id); if (!isNaN(teamId)) toggleFollow(teamId); }}
                    disabled={followLoading}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-50 ${followedTeamIds.includes(parseInt(activeTeam.id))
                        ? "bg-red-500/80 text-white hover:bg-red-600 border border-red-500/50"
                        : "bg-gradient-to-r from-[#008000] to-[#00b300] text-white hover:shadow-[0_4px_20px_rgba(0,128,0,0.4)]"
                      }`}
                  >
                    <Heart className={`w-4 h-4 ${followedTeamIds.includes(parseInt(activeTeam.id)) ? "fill-current" : ""}`} />
                    {followedTeamIds.includes(parseInt(activeTeam.id)) ? "取消关注" : "关注球队"}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <InfoTile icon={Users} label="阵容人数" value={activeTeam.rosterSize || activeTeam.players.length} />
                  <InfoTile icon={Goal} label="前锋" value={activeTeam.positionSummary["前锋"] || 0} />
                  <InfoTile icon={Star} label="中场" value={activeTeam.positionSummary["中场"] || 0} />
                  <InfoTile icon={Shield} label="后卫/门将" value={(activeTeam.positionSummary["后卫"] || 0) + (activeTeam.positionSummary["门将"] || 0)} />
                </div>
              </div>
              <div className="border-l border-white/10 bg-white/5 p-8">
                <div className="mb-5 text-sm font-black uppercase tracking-[0.22em] text-white/40">阵容规模 TOP 3</div>
                <div className="space-y-4">
                  {topRosterTeams.map((team, index) => (
                    <div key={team.name} className="flex items-center gap-4 rounded-2xl bg-black/30 border border-white/10 p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-black text-white">{index + 1}</div>
                      <TeamBadge teamName={team.name} season="2026" className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-black text-white">{team.name}</div>
                        <div className="text-xs font-bold text-white/40">{team.rosterSize} 名球员</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 位置筛选 */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {availablePositions.map((position) => (
              <button
                key={position}
                type="button"
                onClick={() => setActivePosition(position)}
                className={`rounded-full px-5 py-3 text-sm font-black transition-all ${activePosition === position
                    ? "bg-[#008000]/80 text-white border border-[#008000] shadow-[0_0_12px_rgba(0,128,0,0.3)]"
                    : "border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-white/30"
                  }`}
              >
                {position}
              </button>
            ))}
          </div>

          {/* 球员列表 */}
          <AnimatePresence mode="wait">
            <motion.div key={`${activeTeam.name}-${activePosition}-${query}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              {loading ? (
                <div className="rounded-[2rem] border border-white/10 bg-black/40 p-12 text-center font-black text-white/40">正在读取阵容数据...</div>
              ) : filteredPlayers.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-white/10 bg-black/20 p-12 text-center font-black text-white/40">当前筛选下暂无球员数据，请先运行阵容爬虫同步</div>
              ) : (
                Object.entries(groupedPlayers).map(([position, players]) => (
                  <div key={position}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-[#00ff00]" />
                      <h2 className="text-2xl font-black text-white">{position}</h2>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/40">{players.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                      {players.map((player, index) => (
                        <motion.a
                          key={`${player.id}-${player.name}`}
                          href={player.externalId ? `https://tiyu.baidu.com/al/player?id=${player.externalId}&tab=%E8%B5%84%E6%96%99` : undefined}
                          target="_blank"
                          rel="noreferrer"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.015 }}
                          className="group flex items-center gap-4 rounded-[1.6rem] border border-white/20 bg-black/70 backdrop-blur-sm p-5 transition-all hover:-translate-y-1 hover:border-[#008000]/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-black/85"
                        >
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/10">
                            {player.avatarUrl ? (
                              <div
                                role="img"
                                aria-label={player.name}
                                className="h-full w-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${player.avatarUrl})` }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-white/20">
                                <UserRound className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-lg font-black text-white group-hover:text-[#00ff00] transition-colors">{player.name}</div>
                            <div className="mt-2 flex items-center gap-2 text-xs font-black text-white/70">
                              <Shirt className="h-4 w-4" />
                              <span>{player.number ? `${player.number} 号` : "暂无号码"}</span>
                              <span className="h-1 w-1 rounded-full bg-white/20" />
                              <span>{player.position}</span>
                            </div>
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <Icon className="mb-4 h-5 w-5 text-[#00ff00]" />
      <div className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-white/40">{label}</div>
      <div className="text-3xl font-black text-white tabular-nums">{value}</div>
    </div>
  );
}
