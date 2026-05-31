export interface KPlayer {
  id: string;
  username: string;
  score: number;
}

export interface KGame {
  channelId: string;
  players: KPlayer[];
  currentIndex: number;
  lastWord: string;
  lastLetters: string;
  usedWords: Set<string>;
  phase: "joining" | "playing" | "ended";
  turnTimer: NodeJS.Timeout | null;
  joinTimer: NodeJS.Timeout | null;
}

const games = new Map<string, KGame>();

export function createKaladont(channelId: string): KGame {
  const g: KGame = {
    channelId,
    players: [],
    currentIndex: 0,
    lastWord: "",
    lastLetters: "",
    usedWords: new Set(),
    phase: "joining",
    turnTimer: null,
    joinTimer: null,
  };
  games.set(channelId, g);
  return g;
}

export function getKaladont(channelId: string): KGame | undefined {
  return games.get(channelId);
}

export function deleteKaladont(channelId: string): void {
  const g = games.get(channelId);
  if (g) {
    if (g.turnTimer) clearTimeout(g.turnTimer);
    if (g.joinTimer) clearTimeout(g.joinTimer);
    games.delete(channelId);
  }
}

export function addKPlayer(g: KGame, id: string, username: string): boolean {
  if (g.players.find((p) => p.id === id)) return false;
  g.players.push({ id, username, score: 0 });
  return true;
}

export function currentKPlayer(g: KGame): KPlayer | undefined {
  return g.players[g.currentIndex];
}

export function eliminateKPlayer(g: KGame): KPlayer {
  const elim = g.players.splice(g.currentIndex, 1)[0];
  if (g.currentIndex >= g.players.length) g.currentIndex = 0;
  return elim;
}

export function advanceKTurn(g: KGame): void {
  g.currentIndex = (g.currentIndex + 1) % g.players.length;
}

export function getLastLetters(word: string): string {
  const w = word.toLowerCase();
  return w.length >= 2 ? w.slice(-2) : w;
}

export type KResult =
  | { ok: true }
  | { ok: false; reason: "wrong_start" | "already_used" | "not_your_turn" };

export function playKWord(g: KGame, playerId: string, word: string): KResult {
  const player = currentKPlayer(g);
  if (!player || player.id !== playerId) return { ok: false, reason: "not_your_turn" };

  const norm = word.toLowerCase().trim();

  if (g.lastLetters && !norm.startsWith(g.lastLetters)) {
    return { ok: false, reason: "wrong_start" };
  }

  if (g.usedWords.has(norm)) return { ok: false, reason: "already_used" };

  g.lastWord = norm;
  g.lastLetters = getLastLetters(norm);
  g.usedWords.add(norm);
  player.score += 1;
  advanceKTurn(g);
  return { ok: true };
}

export function kGameOver(g: KGame): boolean {
  return g.players.length <= 1;
}

export function kWinner(g: KGame): KPlayer | undefined {
  return g.players[0];
}

const START_WORDS = [
  "planeta", "srbija", "avion", "lampa", "sunce", "drvo", "pesma",
  "torta", "kamen", "vatra", "jutro", "slika", "breza", "tabla",
];

export function pickStartWord(): string {
  return START_WORDS[Math.floor(Math.random() * START_WORDS.length)];
}
