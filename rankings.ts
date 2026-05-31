export interface RankEntry {
  userId: string;
  username: string;
  wins: number;
  games: number;
}

const rankings = new Map<string, RankEntry>();

export function recordWin(userId: string, username: string): void {
  const entry = rankings.get(userId) ?? { userId, username, wins: 0, games: 0 };
  entry.username = username;
  entry.wins += 1;
  entry.games += 1;
  rankings.set(userId, entry);
}

export function recordGame(userId: string, username: string): void {
  const entry = rankings.get(userId) ?? { userId, username, wins: 0, games: 0 };
  entry.username = username;
  entry.games += 1;
  rankings.set(userId, entry);
}

export function getTopRankings(limit = 10): RankEntry[] {
  return [...rankings.values()]
    .sort((a, b) => b.wins - a.wins || b.games - a.games)
    .slice(0, limit);
}

export function getUserRank(userId: string): { entry: RankEntry; position: number } | null {
  const sorted = [...rankings.values()].sort((a, b) => b.wins - a.wins);
  const pos = sorted.findIndex((e) => e.userId === userId);
  if (pos === -1) return null;
  return { entry: sorted[pos], position: pos + 1 };
}
