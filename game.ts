export interface Player {
  id: string;
  username: string;
  score: number;
}

export interface GameState {
  channelId: string;
  players: Player[];
  currentPlayerIndex: number;
  lastWord: string;
  lastLetter: string;
  usedWords: Set<string>;
  phase: "joining" | "playing" | "ended";
  turnTimer: NodeJS.Timeout | null;
  joinTimer: NodeJS.Timeout | null;
  timePerTurn: number;
}

const games = new Map<string, GameState>();

export function createGame(channelId: string): GameState {
  const game: GameState = {
    channelId,
    players: [],
    currentPlayerIndex: 0,
    lastWord: "",
    lastLetter: "",
    usedWords: new Set(),
    phase: "joining",
    turnTimer: null,
    joinTimer: null,
    timePerTurn: 30,
  };
  games.set(channelId, game);
  return game;
}

export function getGame(channelId: string): GameState | undefined {
  return games.get(channelId);
}

export function deleteGame(channelId: string): void {
  const game = games.get(channelId);
  if (game) {
    if (game.turnTimer) clearTimeout(game.turnTimer);
    if (game.joinTimer) clearTimeout(game.joinTimer);
    games.delete(channelId);
  }
}

export function addPlayer(game: GameState, id: string, username: string): boolean {
  if (game.players.find((p) => p.id === id)) return false;
  game.players.push({ id, username, score: 0 });
  return true;
}

export function currentPlayer(game: GameState): Player | undefined {
  return game.players[game.currentPlayerIndex];
}

export function eliminateCurrentPlayer(game: GameState): Player {
  const eliminated = game.players.splice(game.currentPlayerIndex, 1)[0];
  if (game.currentPlayerIndex >= game.players.length) {
    game.currentPlayerIndex = 0;
  }
  return eliminated;
}

export function advanceTurn(game: GameState): void {
  game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
}

export type WordResult =
  | { ok: true }
  | { ok: false; reason: "wrong_letter" | "already_used" | "not_your_turn" };

export function playWord(game: GameState, playerId: string, word: string): WordResult {
  const player = currentPlayer(game);
  if (!player || player.id !== playerId) {
    return { ok: false, reason: "not_your_turn" };
  }

  const normalized = word.toLowerCase().trim();

  if (game.lastLetter && normalized[0] !== game.lastLetter) {
    return { ok: false, reason: "wrong_letter" };
  }

  if (game.usedWords.has(normalized)) {
    return { ok: false, reason: "already_used" };
  }

  game.lastWord = normalized;
  game.lastLetter = normalized[normalized.length - 1];
  game.usedWords.add(normalized);
  player.score += 1;

  advanceTurn(game);
  return { ok: true };
}

export function hasEnoughPlayers(game: GameState): boolean {
  return game.players.length >= 2;
}

export function isGameOver(game: GameState): boolean {
  return game.players.length <= 1;
}

export function getWinner(game: GameState): Player | undefined {
  return game.players[0];
}
