export interface THGame {
  channelId: string;
  target: number;
  min: number;
  max: number;
  guesses: { playerId: string; username: string; guess: number }[];
  phase: "playing" | "ended";
  winner: string | null;
}

const games = new Map<string, THGame>();

export function createTH(channelId: string, min = 1, max = 100): THGame {
  const target = Math.floor(Math.random() * (max - min + 1)) + min;
  const g: THGame = {
    channelId,
    target,
    min,
    max,
    guesses: [],
    phase: "playing",
    winner: null,
  };
  games.set(channelId, g);
  return g;
}

export function getTH(channelId: string): THGame | undefined {
  return games.get(channelId);
}

export function deleteTH(channelId: string): void {
  games.delete(channelId);
}

export type THHint = "🔥 Vrelo!" | "♨️ Toplo" | "🌡️ Mlako" | "❄️ Hladno" | "🧊 Ledeno" | "✅ Tačno!";

export function getHint(target: number, guess: number, min: number, max: number): THHint {
  if (guess === target) return "✅ Tačno!";
  const range = max - min;
  const diff = Math.abs(target - guess);
  const pct = diff / range;
  if (pct <= 0.05) return "🔥 Vrelo!";
  if (pct <= 0.15) return "♨️ Toplo";
  if (pct <= 0.30) return "🌡️ Mlako";
  if (pct <= 0.50) return "❄️ Hladno";
  return "🧊 Ledeno";
}

export type THResult =
  | { won: true; hint: "✅ Tačno!" }
  | { won: false; hint: THHint; higher: boolean };

export function guessTH(g: THGame, playerId: string, username: string, guess: number): THResult {
  g.guesses.push({ playerId, username, guess });
  const hint = getHint(g.target, guess, g.min, g.max);
  if (hint === "✅ Tačno!") {
    g.phase = "ended";
    g.winner = username;
    return { won: true, hint };
  }
  return { won: false, hint, higher: g.target > guess };
}
