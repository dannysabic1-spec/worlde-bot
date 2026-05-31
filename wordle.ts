const WORDS_5 = [
  "pesma", "tabla", "trava", "kamen", "vatra", "torta", "vrana", "staza",
  "jutro", "vetar", "slika", "breza", "kreda", "brava", "krava", "truba",
  "pruga", "gruda", "mleko", "crkva", "svila", "snaga", "zemja", "ploca",
  "drago", "oblak", "sunce", "mesec", "zvezda".slice(0,5), "grad", "vraca",
  "lampa", "pasta", "proso", "bukva", "hrast", "topla", "cesta", "hleba",
  "kuvar", "stena", "traka", "vlaga", "okean", "polje", "rekom", "sever",
  "junak", "gordo", "pisma", "lepak", "grana", "cvece", "jabuk", "kucna",
  "tepih", "zidna", "torba", "cipka", "makar", "ugalj", "patos", "beton",
];

const VALID_WORDS = new Set([
  ...WORDS_5,
  "knjiga", "oganj", "dragi", "zemla",
  "kurir", "dukat", "biser", "zlato", "srebr",
  "konji", "magle", "barka", "veslo", "sidro",
  "oluja", "kisel", "silan", "junak", "crvak",
  "motiv", "razum", "sreca", "smeta", "ljuta",
  "greda", "mazga", "lisac", "vucic", "medvd",
  "petao", "misic", "vilac", "brega", "usjev",
  "svecu", "marka", "novac", "dinar", "parac",
]);

export interface WGame {
  channelId: string;
  userId: string;
  username: string;
  word: string;
  attempts: string[];
  maxAttempts: number;
  phase: "playing" | "won" | "lost";
}

const games = new Map<string, WGame>();

export function createWordle(channelId: string, userId: string, username: string): WGame {
  const wordList = WORDS_5.filter((w) => w.length === 5);
  const word = wordList[Math.floor(Math.random() * wordList.length)];
  const g: WGame = {
    channelId,
    userId,
    username,
    word,
    attempts: [],
    maxAttempts: 6,
    phase: "playing",
  };
  games.set(`${channelId}-${userId}`, g);
  return g;
}

export function getWordle(channelId: string, userId: string): WGame | undefined {
  return games.get(`${channelId}-${userId}`);
}

export function deleteWordle(channelId: string, userId: string): void {
  games.delete(`${channelId}-${userId}`);
}

export type LetterResult = "correct" | "present" | "absent";

export interface GuessResult {
  letters: { char: string; result: LetterResult }[];
  won: boolean;
  lost: boolean;
}

const EMOJI: Record<LetterResult, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

export function checkGuess(word: string, guess: string): { char: string; result: LetterResult }[] {
  const result: { char: string; result: LetterResult }[] = Array(5).fill(null).map(() => ({ char: "", result: "absent" as LetterResult }));
  const wordArr = word.split("");
  const guessArr = guess.split("");
  const used = Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    result[i].char = guessArr[i];
    if (guessArr[i] === wordArr[i]) {
      result[i].result = "correct";
      used[i] = true;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i].result === "correct") continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessArr[i] === wordArr[j]) {
        result[i].result = "present";
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

export function renderGuess(letters: { char: string; result: LetterResult }[]): string {
  return letters.map((l) => EMOJI[l.result]).join("") + "  " + letters.map((l) => l.char.toUpperCase()).join(" ");
}

export function playWordle(g: WGame, guess: string): GuessResult | { error: "wrong_length" | "not_playing" } {
  if (g.phase !== "playing") return { error: "not_playing" };
  const norm = guess.toLowerCase().trim();
  if (norm.length !== 5) return { error: "wrong_length" };

  const letters = checkGuess(g.word, norm);
  g.attempts.push(norm);

  const won = letters.every((l) => l.result === "correct");
  const lost = !won && g.attempts.length >= g.maxAttempts;

  if (won) g.phase = "won";
  if (lost) g.phase = "lost";

  return { letters, won, lost };
}

export function renderBoard(g: WGame): string {
  const rows = g.attempts.map((att) => {
    const letters = checkGuess(g.word, att);
    return renderGuess(letters);
  });
  const remaining = g.maxAttempts - g.attempts.length;
  for (let i = 0; i < remaining; i++) {
    rows.push("⬜⬜⬜⬜⬜  _ _ _ _ _");
  }
  return rows.join("\n");
}
