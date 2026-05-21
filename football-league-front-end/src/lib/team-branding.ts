interface TeamMeta {
  name: string;
  logoColor: string;
  shortName?: string;
  /** Pinyin filename (without extension) for badge image lookup */
  pinyin?: string;
}

/** Chinese name → pinyin filename mapping */
const PINYIN: Record<string, string> = {
  "苏州": "suzhou", "南京": "nanjing", "无锡": "wuxi", "常州": "changzhou",
  "南通": "nantong", "徐州": "xuzhou", "扬州": "yangzhou", "镇江": "zhenjiang",
  "泰州": "taizhou", "盐城": "yancheng", "淮安": "huaian", "连云港": "lianyungang",
  "宿迁": "suqian",
};

const TEAM_META: Record<string, TeamMeta> = {
  "苏州": { name: "苏州", logoColor: "#1e40af", shortName: "苏州", pinyin: "suzhou" },
  "南京": { name: "南京", logoColor: "#dc2626", shortName: "南京", pinyin: "nanjing" },
  "无锡": { name: "无锡", logoColor: "#16a34a", shortName: "无锡", pinyin: "wuxi" },
  "常州": { name: "常州", logoColor: "#ea580c", shortName: "常州", pinyin: "changzhou" },
  "南通": { name: "南通", logoColor: "#7c3aed", shortName: "南通", pinyin: "nantong" },
  "徐州": { name: "徐州", logoColor: "#0891b2", shortName: "徐州", pinyin: "xuzhou" },
  "扬州": { name: "扬州", logoColor: "#d97706", shortName: "扬州", pinyin: "yangzhou" },
  "镇江": { name: "镇江", logoColor: "#4f46e5", shortName: "镇江", pinyin: "zhenjiang" },
  "泰州": { name: "泰州", logoColor: "#be123c", shortName: "泰州", pinyin: "taizhou" },
  "盐城": { name: "盐城", logoColor: "#059669", shortName: "盐城", pinyin: "yancheng" },
  "淮安": { name: "淮安", logoColor: "#b45309", shortName: "淮安", pinyin: "huaian" },
  "连云港": { name: "连云港", logoColor: "#1d4ed8", shortName: "连云港", pinyin: "lianyungang" },
  "宿迁": { name: "宿迁", logoColor: "#a21caf", shortName: "宿迁", pinyin: "suqian" },
};

export const TEAM_LIST = Object.values(TEAM_META);

export function getTeamMeta(teamName: string): TeamMeta | undefined {
  // Exact match first
  if (TEAM_META[teamName]) return TEAM_META[teamName];
  // Partial match (e.g., "南京城市" contains "南京")
  for (const [key, meta] of Object.entries(TEAM_META)) {
    if (teamName.includes(key)) return meta;
  }
  return undefined;
}

export function getTeamBadgePath(teamName: string, season?: string): string | null {
  const team = getTeamMeta(teamName);
  if (!team) return null;
  const seasonStr = season || "2026";
  const pinyin = team.pinyin || PINYIN[team.name] || team.name;
  return `/images/team-badges/${seasonStr}/${pinyin}.webp`;
}
