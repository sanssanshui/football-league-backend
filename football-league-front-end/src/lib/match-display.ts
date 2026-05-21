interface MatchInput {
  score?: string;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  homeTeam?: string;
  awayTeam?: string;
  round?: string;
  location?: string;
}

interface MatchDisplay {
  score: string;
  homePenalties?: number | null;
  awayPenalties?: number | null;
}

export function applyMatchDisplayRules(match: MatchInput): MatchInput & MatchDisplay {
  return {
    ...match,
    score: match.score || "0:0",
    homePenalties: match.homePenalties ?? null,
    awayPenalties: match.awayPenalties ?? null,
  } as MatchInput & MatchDisplay;
}

export function hasPenaltyShootout(display: MatchDisplay): boolean {
  return display.homePenalties != null && display.awayPenalties != null;
}

export function parseRegularScore(score: string): { home: number; away: number } {
  const parts = score.replace(/\(.*\)$/, "").split(":");
  const home = parseInt(parts[0], 10) || 0;
  const away = parseInt(parts[1], 10) || 0;
  return { home, away };
}

export function matchesSearchQuery(match: MatchInput, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const fields = [
    match.homeTeam,
    match.awayTeam,
    match.round,
    match.location,
    match.score,
  ];
  return fields.some((f) => f?.toLowerCase().includes(q));
}
