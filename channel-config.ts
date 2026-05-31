export type GameType = "kaladont" | "toplo-hladno" | "wordle" | "mafia";

const channelGames = new Map<string, GameType>();

export function setChannelGame(channelId: string, game: GameType): void {
  channelGames.set(channelId, game);
}

export function unsetChannelGame(channelId: string): void {
  channelGames.delete(channelId);
}

export function getChannelGame(channelId: string): GameType | undefined {
  return channelGames.get(channelId);
}

export const GAME_NAMES: Record<GameType, string> = {
  kaladont: "Kaladont",
  "toplo-hladno": "Toplo Hladno",
  wordle: "Wordle",
  mafia: "Mafia",
};
