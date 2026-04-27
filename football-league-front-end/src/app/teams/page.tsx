"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { Search, Users, Shield, Goal, Star, Shirt, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TeamBadge from "@/components/team-badge";
import { TEAM_LIST } from "@/lib/team-branding";

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
  return {
    id: teamName,
    name: teamName,
    rosterSize: 0,
    positionSummary: {},
    players: [],
  };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamRoster[]>(TEAM_LIST.map((team) => emptyRoster(team.name)));
  const [activeTeamName, setActiveTeamName] = useState(TEAM_LIST[0]?.name || "南京队");
  const [query, setQuery] = useState("");
  const [activePosition, setActivePosition] = useState("全部");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:5002/api/matches/teams/rosters");
        const json = await res.json();
        if (!alive || json.code !== 200) return;
        const byName = new Map<string, TeamRoster>((json.data || []).map((team: TeamRoster) => [team.name, team]));
        setTeams(TEAM_LIST.map((team) => byName.get(team.name) || emptyRoster(team.name)));
      } catch (error) {
        console.error(error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeTeam = teams.find((team) => team.name === activeTeamName) || teams[0] || emptyRoster("南京队");
  const availablePositions = useMemo(() => {
    const set = new Set(activeTeam.players.map((player) => player.position || "未分组"));
    return ["全部", ...POSITION_ORDER.filter((position) => set.has(position)), ...Array.from(set).filter((position) => !POSITION_ORDER.includes(position))];
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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href="/" className="text-xl font-black text-slate-800">首页</Link>
            <Link href="/matches" className="font-bold text-slate-500 transition-colors hover:text-emerald-600">赛事资讯</Link>
            <Link href="/teams" className="border-b-2 border-emerald-500 pb-1 font-black text-emerald-600">球队阵容</Link>
            <Link href="/community" className="font-bold text-slate-500 transition-colors hover:text-emerald-600">互动社区</Link>
          </div>
          <div className="flex h-11 w-80 items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-5">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索球队、球员或号码"
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl grid-cols-[300px_1fr] gap-8 px-6 py-10">
        <aside className="sticky top-28 h-[calc(100vh-8rem)] overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3 px-3 py-2">
            <Users className="h-5 w-5 text-emerald-500" />
            <div>
              <div className="text-lg font-black text-slate-800">江苏 13 队</div>
              <div className="text-xs font-bold text-slate-400">阵容数据看板</div>
            </div>
          </div>
          <div className="h-[calc(100%-4rem)] overflow-y-auto pr-1">
            {teams.map((team) => (
              <button
                key={team.name}
                type="button"
                onClick={() => {
                  setActiveTeamName(team.name);
                  setActivePosition("全部");
                }}
                className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${activeTeamName === team.name ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <TeamBadge teamName={team.name} season="2026" className="h-10 w-10 shrink-0 bg-white/80" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">{team.name}</div>
                  <div className={`text-xs font-bold ${activeTeamName === team.name ? "text-emerald-50" : "text-slate-400"}`}>{team.rosterSize || 0} 名球员</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-8 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_340px]">
              <div className="p-10">
                <div className="mb-8 flex items-center gap-6">
                  <TeamBadge teamName={activeTeam.name} season="2026" className="h-24 w-24" priority />
                  <div>
                    <h1 className="text-5xl font-black tracking-tight text-slate-900">{activeTeam.name}</h1>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <InfoTile icon={Users} label="阵容人数" value={activeTeam.rosterSize || activeTeam.players.length} />
                  <InfoTile icon={Goal} label="前锋" value={activeTeam.positionSummary["前锋"] || 0} />
                  <InfoTile icon={Star} label="中场" value={activeTeam.positionSummary["中场"] || 0} />
                  <InfoTile icon={Shield} label="后卫/门将" value={(activeTeam.positionSummary["后卫"] || 0) + (activeTeam.positionSummary["门将"] || 0)} />
                </div>
              </div>
              <div className="border-l border-slate-100 bg-slate-50 p-8">
                <div className="mb-5 text-sm font-black uppercase tracking-[0.22em] text-slate-400">阵容规模 TOP 3</div>
                <div className="space-y-4">
                  {topRosterTeams.map((team, index) => (
                    <div key={team.name} className="flex items-center gap-4 rounded-2xl bg-white p-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">{index + 1}</div>
                      <TeamBadge teamName={team.name} season="2026" className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-black text-slate-800">{team.name}</div>
                        <div className="text-xs font-bold text-slate-400">{team.rosterSize} 名球员</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            {availablePositions.map((position) => (
              <button
                key={position}
                type="button"
                onClick={() => setActivePosition(position)}
                className={`rounded-full px-5 py-3 text-sm font-black transition-all ${activePosition === position ? "bg-slate-900 text-white shadow-lg" : "border border-slate-200 bg-white text-slate-500 hover:text-slate-900"}`}
              >
                {position}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={`${activeTeam.name}-${activePosition}-${query}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              {loading ? (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-12 text-center font-black text-slate-400">正在读取阵容数据...</div>
              ) : filteredPlayers.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-12 text-center font-black text-slate-400">当前筛选下暂无球员数据，请先运行阵容爬虫同步</div>
              ) : (
                Object.entries(groupedPlayers).map(([position, players]) => (
                  <div key={position}>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      <h2 className="text-2xl font-black text-slate-800">{position}</h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-400">{players.length}</span>
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
                          className="group flex items-center gap-4 rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl"
                        >
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                            {player.avatarUrl ? (
                              <div
                                role="img"
                                aria-label={player.name}
                                className="h-full w-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${player.avatarUrl})` }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-300"><UserRound className="h-8 w-8" /></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-lg font-black text-slate-800 group-hover:text-emerald-600">{player.name}</div>
                            <div className="mt-2 flex items-center gap-2 text-xs font-black text-slate-400">
                              <Shirt className="h-4 w-4" />
                              <span>{player.number ? `${player.number} 号` : "暂无号码"}</span>
                              <span className="h-1 w-1 rounded-full bg-slate-300" />
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <Icon className="mb-4 h-5 w-5 text-emerald-500" />
      <div className="mb-1 text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="text-3xl font-black text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}
