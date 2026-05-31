export interface Question {
  text: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  difficulty: number;
}

export const QUESTIONS: Question[] = [
  { text: "Koji grad je glavni grad Srbije?", options: ["Novi Sad", "Beograd", "Niš", "Kragujevac"], answer: 1, difficulty: 1 },
  { text: "Koliko dana ima u sedmici?", options: ["5", "6", "7", "8"], answer: 2, difficulty: 1 },
  { text: "Koji je hemijski simbol za vodu?", options: ["CO2", "O2", "H2O", "NaCl"], answer: 2, difficulty: 2 },
  { text: "Ko je napisao 'Gorski vijenac'?", options: ["Branko Radičević", "Jovan Jovanović Zmaj", "Petar II Petrović Njegoš", "Vuk Stefanović Karadžić"], answer: 2, difficulty: 3 },
  { text: "Koliko planeta ima u Sunčevom sistemu?", options: ["7", "8", "9", "10"], answer: 1, difficulty: 2 },
  { text: "Koja je najduža reka u svetu?", options: ["Amazon", "Nil", "Jangce", "Misisipi"], answer: 1, difficulty: 3 },
  { text: "Koji element ima atomski broj 1?", options: ["Helij", "Kiseonik", "Vodonik", "Ugljenik"], answer: 2, difficulty: 3 },
  { text: "U kojoj godini je završen Drugi svetski rat?", options: ["1943", "1944", "1945", "1946"], answer: 2, difficulty: 2 },
  { text: "Koja zemlja ima najveći broj stanovnika?", options: ["Indija", "SAD", "Kina", "Rusija"], answer: 2, difficulty: 2 },
  { text: "Koliko nota ima u muzičkoj oktavi?", options: ["5", "6", "7", "8"], answer: 3, difficulty: 2 },
  { text: "Ko je naslikao Mona Lizu?", options: ["Mikelanđelo", "Rafael", "Leonardo da Vinči", "Donatelo"], answer: 2, difficulty: 2 },
  { text: "Koji je najmanji prost broj?", options: ["0", "1", "2", "3"], answer: 2, difficulty: 3 },
  { text: "Koliko kostiju ima odrasli čovek?", options: ["186", "206", "226", "246"], answer: 1, difficulty: 4 },
  { text: "Koja je brzina svetlosti (km/s)?", options: ["200.000", "300.000", "400.000", "500.000"], answer: 1, difficulty: 4 },
  { text: "Ko je autor relativiteta?", options: ["Njutn", "Tesla", "Ajnštajn", "Bor"], answer: 2, difficulty: 3 },
];

const PRIZES = [
  "1.000", "2.000", "3.000", "5.000", "10.000",
  "20.000", "30.000", "50.000", "75.000", "100.000",
  "150.000", "300.000", "500.000", "1.000.000",
];

export interface MilionerGame {
  userId: string;
  username: string;
  questions: Question[];
  currentQ: number;
  lifelines: { fifty: boolean; audience: boolean; phone: boolean };
  phase: "playing" | "won" | "lost";
  prize: string;
}

const games = new Map<string, MilionerGame>();

function shuffleQuestions(): Question[] {
  const byDiff: Record<number, Question[]> = {};
  for (const q of QUESTIONS) {
    if (!byDiff[q.difficulty]) byDiff[q.difficulty] = [];
    byDiff[q.difficulty].push(q);
  }
  const result: Question[] = [];
  const levels = [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4];
  for (const level of levels) {
    const pool = byDiff[level] ?? byDiff[3] ?? QUESTIONS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!result.includes(pick)) result.push(pick);
    else result.push(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)]);
  }
  return result;
}

export function createMilioner(userId: string, username: string): MilionerGame {
  const g: MilionerGame = {
    userId,
    username,
    questions: shuffleQuestions(),
    currentQ: 0,
    lifelines: { fifty: true, audience: true, phone: true },
    phase: "playing",
    prize: "0",
  };
  games.set(userId, g);
  return g;
}

export function getMilioner(userId: string): MilionerGame | undefined {
  return games.get(userId);
}

export function deleteMilioner(userId: string): void {
  games.delete(userId);
}

export function getCurrentQuestion(g: MilionerGame): Question | undefined {
  return g.questions[g.currentQ];
}

export function getCurrentPrize(g: MilionerGame): string {
  return PRIZES[Math.min(g.currentQ, PRIZES.length - 1)] ?? "1.000.000";
}

export function getSafePrize(g: MilionerGame): string {
  const safePoints = [4, 9];
  let safe = "0";
  for (const sp of safePoints) {
    if (g.currentQ > sp) safe = PRIZES[sp];
  }
  return safe;
}

export type MAnswer = "correct" | "wrong";

export function answerMilioner(g: MilionerGame, answerIndex: number): MAnswer {
  const q = getCurrentQuestion(g);
  if (!q) return "wrong";

  if (answerIndex === q.answer) {
    g.currentQ += 1;
    g.prize = getCurrentPrize(g);
    if (g.currentQ >= g.questions.length) g.phase = "won";
    return "correct";
  } else {
    g.phase = "lost";
    g.prize = getSafePrize(g);
    return "wrong";
  }
}

export function useFiftyFifty(g: MilionerGame): number[] {
  g.lifelines.fifty = false;
  const q = getCurrentQuestion(g);
  if (!q) return [];
  const wrong = [0, 1, 2, 3].filter((i) => i !== q.answer);
  const remove = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
  return remove;
}

export function useAudience(g: MilionerGame): Record<number, number> {
  g.lifelines.audience = false;
  const q = getCurrentQuestion(g);
  if (!q) return {};
  const result: Record<number, number> = {};
  let remaining = 100;
  const correctBonus = 40 + Math.floor(Math.random() * 30);
  result[q.answer] = Math.min(correctBonus, remaining);
  remaining -= result[q.answer];
  const others = [0, 1, 2, 3].filter((i) => i !== q.answer);
  for (let i = 0; i < others.length - 1; i++) {
    const share = Math.floor(Math.random() * remaining * 0.6);
    result[others[i]] = share;
    remaining -= share;
  }
  result[others[others.length - 1]] = remaining;
  return result;
}

export const OPTION_LETTERS = ["A", "B", "C", "D"];

export function formatQuestion(g: MilionerGame, removed?: number[]): string {
  const q = getCurrentQuestion(g);
  if (!q) return "";
  const lines = [`**${q.text}**\n`];
  for (let i = 0; i < 4; i++) {
    if (removed?.includes(i)) {
      lines.push(`~~${OPTION_LETTERS[i]}) ${q.options[i]}~~`);
    } else {
      lines.push(`**${OPTION_LETTERS[i]})** ${q.options[i]}`);
    }
  }
  return lines.join("\n");
}
