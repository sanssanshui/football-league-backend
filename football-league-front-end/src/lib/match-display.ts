import { SEASON_2025_MATCH_METADATA } from "@/lib/season-2025-schedule";

export type MatchDisplayData = {
  homeTeam: string;
  awayTeam: string;
  timestamp: string;
  round?: string | null;
  score?: string | null;
  location?: string | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
};

type MatchCorrection = {
  round: string;
  score: string;
  location?: string;
  homePenalties?: number;
  awayPenalties?: number;
};

const ROUND_OVERRIDES_2025: Record<string, string> = {
  "2025-10-04": "1/4决赛",
  "2025-10-05": "1/4决赛",
  "2025-10-07": "1/4决赛",
  "2025-10-08": "1/4决赛",
  "2025-10-18": "半决赛",
  "2025-10-19": "半决赛",
  "2025-11-01": "决赛",
};

const MATCH_CORRECTIONS_2025: Record<string, MatchCorrection> = {
  "2025-10-04|南京队|连云港队": { round: "1/4决赛", score: "1-1", homePenalties: 4, awayPenalties: 2 },
  "2025-10-05|徐州队|泰州队": { round: "1/4决赛", score: "1-1", homePenalties: 2, awayPenalties: 4 },
  "2025-10-07|南通队|淮安队": { round: "1/4决赛", score: "5-0" },
  "2025-10-08|盐城队|无锡队": { round: "1/4决赛", score: "0-3" },
  "2025-10-18|南京队|泰州队": { round: "半决赛", score: "1-1", homePenalties: 7, awayPenalties: 8 },
  "2025-10-19|南通队|无锡队": { round: "半决赛", score: "0-0", homePenalties: 4, awayPenalties: 2 },
  "2025-11-01|南通队|泰州队": { round: "决赛", score: "0-0", homePenalties: 3, awayPenalties: 4 },
};

function getDateKey(timestamp: string) {
  return timestamp.slice(0, 10);
}

function getMatchKey(match: Pick<MatchDisplayData, "homeTeam" | "awayTeam" | "timestamp">) {
  return `${getDateKey(match.timestamp)}|${match.homeTeam}|${match.awayTeam}`;
}

export function applyMatchDisplayRules<T extends MatchDisplayData>(match: T): T {
  const matchKey = getMatchKey(match);
  const scheduleMeta = SEASON_2025_MATCH_METADATA[matchKey];
  const correction = MATCH_CORRECTIONS_2025[getMatchKey(match)];
  if (correction) {
    return {
      ...match,
      round: correction.round,
      score: correction.score,
      location: correction.location ?? match.location,
      homePenalties: correction.homePenalties ?? null,
      awayPenalties: correction.awayPenalties ?? null,
    };
  }

  if (scheduleMeta) {
    return {
      ...match,
      round: scheduleMeta.round,
      location: scheduleMeta.location,
    };
  }

  const roundOverride = ROUND_OVERRIDES_2025[getDateKey(match.timestamp)];
  if (roundOverride) {
    return {
      ...match,
      round: roundOverride,
    };
  }

  return match;
}

export function parseRegularScore(score?: string | null) {
  const [homeRaw = "0", awayRaw = "0"] = (score || "0-0").split("-");
  const home = Number.parseInt(homeRaw, 10) || 0;
  const away = Number.parseInt(awayRaw, 10) || 0;
  return { home, away };
}

export function hasPenaltyShootout(match: Pick<MatchDisplayData, "homePenalties" | "awayPenalties">) {
  return typeof match.homePenalties === "number" && typeof match.awayPenalties === "number";
}

export function formatMatchSearchText(match: MatchDisplayData) {
  const date = new Date(match.timestamp);
  const { home, away } = parseRegularScore(match.score);
  const dateKey = getDateKey(match.timestamp);
  const isoDate = dateKey;
  const slashDate = isoDate.replace(/-/g, "/");
  const dotDate = isoDate.replace(/-/g, ".");
  const shortDashDate = isoDate.slice(5);
  const shortSlashDate = slashDate.slice(5);
  const chineseDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const time = `${hour}:${minute}`;
  const round = match.round || "";
  const location = match.location || "";
  const penalties = hasPenaltyShootout(match) ? `${match.homePenalties}-${match.awayPenalties} ${match.homePenalties}:${match.awayPenalties}` : "";

  return [
    match.homeTeam,
    match.awayTeam,
    round,
    location,
    isoDate,
    slashDate,
    dotDate,
    shortDashDate,
    shortSlashDate,
    chineseDate,
    time,
    `${home}-${away}`,
    `${home}:${away}`,
    penalties,
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesSearchQuery(match: MatchDisplayData, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return formatMatchSearchText(match).includes(normalizedQuery);
}
