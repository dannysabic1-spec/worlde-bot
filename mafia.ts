export type MRole = "gradjanin" | "mafija" | "doktor" | "detektiv";

export interface MPlayer {
  id: string;
  username: string;
  role: MRole;
  alive: boolean;
  votes: number;
}

export interface MGame {
  channelId: string;
  players: MPlayer[];
  phase: "joining" | "night" | "day" | "voting" | "ended";
  joinTimer: NodeJS.Timeout | null;
  dayTimer: NodeJS.Timeout | null;
  voteTimer: NodeJS.Timeout | null;
  votes: Map<string, string>;
  nightActions: { doktor?: string; detektiv?: string; mafija?: string };
  nightActors: Set<string>;
  round: number;
  winner: "gradjanin" | "mafija" | null;
}

const games = new Map<string, MGame>();

export function createMafia(channelId: string): MGame {
  const g: MGame = {
    channelId,
    players: [],
    phase: "joining",
    joinTimer: null,
    dayTimer: null,
    voteTimer: null,
    votes: new Map(),
    nightActions: {},
    nightActors: new Set(),
    round: 0,
    winner: null,
  };
  games.set(channelId, g);
  return g;
}

export function getMafia(channelId: string): MGame | undefined {
  return games.get(channelId);
}

export function deleteMafia(channelId: string): void {
  const g = games.get(channelId);
  if (g) {
    if (g.joinTimer) clearTimeout(g.joinTimer);
    if (g.dayTimer) clearTimeout(g.dayTimer);
    if (g.voteTimer) clearTimeout(g.voteTimer);
    games.delete(channelId);
  }
}

export function addMPlayer(g: MGame, id: string, username: string): boolean {
  if (g.players.find((p) => p.id === id)) return false;
  g.players.push({ id, username, role: "gradjanin", alive: true, votes: 0 });
  return true;
}

function assignRoles(g: MGame): void {
  const count = g.players.length;
  const roles: MRole[] = [];

  const mafiaCount = Math.max(1, Math.floor(count / 4));
  for (let i = 0; i < mafiaCount; i++) roles.push("mafija");
  if (count >= 5) roles.push("doktor");
  if (count >= 6) roles.push("detektiv");
  while (roles.length < count) roles.push("gradjanin");

  const shuffled = [...roles].sort(() => Math.random() - 0.5);
  g.players.forEach((p, i) => {
    p.role = shuffled[i];
  });
}

export function startMafia(g: MGame): void {
  assignRoles(g);
  g.phase = "night";
  g.round = 1;
}

export function getAlivePlayers(g: MGame): MPlayer[] {
  return g.players.filter((p) => p.alive);
}

export function getMafiaPlayers(g: MGame): MPlayer[] {
  return g.players.filter((p) => p.role === "mafija" && p.alive);
}

export function nightAction(g: MGame, actorId: string, targetId: string, action: "mafija" | "doktor" | "detektiv"): void {
  g.nightActions[action] = targetId;
  g.nightActors.add(actorId);
}

export function allNightActorsDone(g: MGame): boolean {
  const needed = new Set<string>();
  for (const p of g.players) {
    if (!p.alive) continue;
    if (p.role === "mafija" || p.role === "doktor" || p.role === "detektiv") {
      needed.add(p.id);
    }
  }
  return [...needed].every((id) => g.nightActors.has(id));
}

export interface NightResult {
  killed: MPlayer | null;
  saved: boolean;
  detectiveTarget?: MPlayer;
}

export function resolveNight(g: MGame): NightResult {
  const { mafija, doktor, detektiv } = g.nightActions;

  let killed: MPlayer | null = null;
  let saved = false;

  if (mafija) {
    const target = g.players.find((p) => p.id === mafija && p.alive);
    if (target) {
      if (doktor && doktor === mafija) {
        saved = true;
      } else {
        target.alive = false;
        killed = target;
      }
    }
  }

  let detectiveTarget: MPlayer | undefined;
  if (detektiv) {
    detectiveTarget = g.players.find((p) => p.id === detektiv);
  }

  g.nightActions = {};
  g.nightActors = new Set();
  g.phase = "day";
  g.round += 1;
  g.votes = new Map();

  return { killed, saved, detectiveTarget };
}

export function castVote(g: MGame, voterId: string, targetId: string): void {
  g.votes.set(voterId, targetId);
}

export function resolveVote(g: MGame): MPlayer | null {
  const counts = new Map<string, number>();
  for (const targetId of g.votes.values()) {
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  }

  let maxVotes = 0;
  let topId: string | null = null;
  for (const [id, count] of counts) {
    if (count > maxVotes) {
      maxVotes = count;
      topId = id;
    }
  }

  if (!topId) return null;
  const eliminated = g.players.find((p) => p.id === topId);
  if (eliminated) eliminated.alive = false;
  g.votes = new Map();
  return eliminated ?? null;
}

export function checkWin(g: MGame): "mafija" | "gradjanin" | null {
  const alive = getAlivePlayers(g);
  const aliveMafia = alive.filter((p) => p.role === "mafija").length;
  const aliveGood = alive.filter((p) => p.role !== "mafija").length;

  if (aliveMafia === 0) return "gradjanin";
  if (aliveMafia >= aliveGood) return "mafija";
  return null;
}

export const ROLE_EMOJI: Record<MRole, string> = {
  gradjanin: "👤",
  mafija: "🔪",
  doktor: "⚕️",
  detektiv: "🔍",
};

export const ROLE_DESC: Record<MRole, string> = {
  gradjanin: "Obični građanin. Glasaj tokom dana da eliminišeš mafiju!",
  mafija: "Mafija! Noću biraj koga ćeš ubiti. Ostani prikriven.",
  doktor: "Doktor! Noću biraj koga ćeš zaštititi od mafije.",
  detektiv: "Detektiv! Noću možeš proveriti da li je igrač mafija.",
};
