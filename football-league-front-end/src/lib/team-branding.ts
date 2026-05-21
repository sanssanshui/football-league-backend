export type SeasonYear = "2025" | "2026";

export type TeamMeta = {
  id: string;
  name: string;
  short: string;
  slug: string;
  logoColor: string;
};

export const TEAM_LIST: TeamMeta[] = [
  { id: "1", name: "南京队", short: "南京", slug: "nanjing", logoColor: "#0066b3" },
  { id: "2", name: "苏州队", short: "苏州", slug: "suzhou", logoColor: "#c91a1a" },
  { id: "3", name: "无锡队", short: "无锡", slug: "wuxi", logoColor: "#f7b731" },
  { id: "4", name: "南通队", short: "南通", slug: "nantong", logoColor: "#a50044" },
  { id: "5", name: "徐州队", short: "徐州", slug: "xuzhou", logoColor: "#8a2be2" },
  { id: "6", name: "常州队", short: "常州", slug: "changzhou", logoColor: "#ff8c00" },
  { id: "7", name: "连云港队", short: "连港", slug: "lianyungang", logoColor: "#20b2aa" },
  { id: "8", name: "淮安队", short: "淮安", slug: "huaian", logoColor: "#d2691e" },
  { id: "9", name: "盐城队", short: "盐城", slug: "yancheng", logoColor: "#4682b4" },
  { id: "10", name: "扬州队", short: "扬州", slug: "yangzhou", logoColor: "#9acd32" },
  { id: "11", name: "镇江队", short: "镇江", slug: "zhenjiang", logoColor: "#5f9ea0" },
  { id: "12", name: "泰州队", short: "泰州", slug: "taizhou", logoColor: "#ff4500" },
  { id: "13", name: "宿迁队", short: "宿迁", slug: "suqian", logoColor: "#2e8b57" },
];

const TEAM_MAP = new Map(TEAM_LIST.map((team) => [team.name, team]));

export function normalizeSeasonYear(season?: string): SeasonYear {
  return season === "2025" ? "2025" : "2026";
}

export function getTeamMeta(teamName?: string | null) {
  if (!teamName) return undefined;
  return TEAM_MAP.get(teamName);
}

export function getTeamBadgePath(teamName: string, season?: string) {
  const team = getTeamMeta(teamName);
  const year = normalizeSeasonYear(season);
  return team ? `/images/team-badges/${year}/${team.slug}.webp` : "";
}
