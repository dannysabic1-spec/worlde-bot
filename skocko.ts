export const SYMBOLS = ["⚽", "🏀", "🎾", "🏐", "🏈", "🎱"];
export const MAX_ATTEMPTS = 8;
export const CODE_LENGTH = 4;

export interface SGame {
  userId: string;
  username: string;
  code: string[];
  attempts: { guess: string[]; hits: number; blows: number }[];
  phase: "playing" | "won" | "lost";
}

const games = new Map<string, SGame>();

export function createSkocko(userId: string, username: string): SGame {
  const code: string[] = [];
  for (let i = 0; i < CODE_LENGTH; i++) {
    code.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  const g: SGame = { userId, username, code, attempts: [], phase: "playing" };
  games.set(userId, g);
  return g;
}

export function getSkocko(userId: string): SGame | undefined {
  return games.get(userId);
}

export function deleteSkocko(userId: string): void {
  games.delete(userId);
}

export function guessSkocko(g: SGame, guess: string[]): { hits: number; blows: number } | { error: string } {
  if (g.phase !== "playing") return { error: "Igra nije aktivna." };
  if (guess.length !== CODE_LENGTH) return { error: `Mora biti tačno ${CODE_LENGTH} simbola.` };
  for (const s of guess) {
    if (!SYMBOLS.includes(s)) return { error: `Nepoznat simbol: ${s}` };
  }

  let hits = 0;
  let blows = 0;
  const codeUsed = [...g.code.map(() => false)];
  const guessUsed = [...guess.map(() => false)];

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i] === g.code[i]) {
      hits++;
      codeUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (!codeUsed[j] && guess[i] === g.code[j]) {
        blows++;
        codeUsed[j] = true;
        break;
      }
    }
  }

  g.attempts.push({ guess, hits, blows });

  if (hits === CODE_LENGTH) g.phase = "won";
  else if (g.attempts.length >= MAX_ATTEMPTS) g.phase = "lost";

  return { hits, blows };
}

export function parseGuess(input: string): string[] | null {
  const parts = input.trim().split(/\s+/);
  if (parts.length === CODE_LENGTH && parts.every((p) => SYMBOLS.includes(p))) return parts;

  const numbers = parts.map(Number);
  if (numbers.every((n) => !isNaN(n) && n >= 1 && n <= SYMBOLS.length) && numbers.length === CODE_LENGTH) {
    return numbers.map((n) => SYMBOLS[n - 1]);
  }

  return null;
}

export function renderAttempts(g: SGame): string {
  if (g.attempts.length === 0) return "*Još nema pokušaja.*";
  return g.attempts
    .map((a, i) => `**${i + 1}.** ${a.guess.join(" ")} — 🎯 ${a.hits} tačno, 🔄 ${a.blows} pogrešno mesto`)
    .join("\n");
}

export function symbolsHelp(): string {
  return SYMBOLS.map((s, i) => `**${i + 1}** = ${s}`).join("  ");
}
