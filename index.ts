import {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  type Interaction,
  type Message,
  type TextChannel,
} from "discord.js";
import { logger } from "./logger.js";
import { registerCommands } from "./commands.js";
import { setChannelGame, unsetChannelGame, getChannelGame, GAME_NAMES, type GameType } from "./channel-config.js";
import { getTopRankings, getUserRank, recordWin, recordGame } from "./rankings.js";

import {
  createKaladont, getKaladont, deleteKaladont,
  addKPlayer, currentKPlayer, eliminateKPlayer,
  playKWord, kGameOver, kWinner, pickStartWord, getLastLetters,
  type KGame,
} from "./kaladont.js";

import { createTH, getTH, deleteTH, guessTH } from "./toplo-hladno.js";

import { createWordle, getWordle, deleteWordle, playWordle, renderBoard } from "./wordle.js";

import {
  createMafia, getMafia, deleteMafia,
  addMPlayer, startMafia, getAlivePlayers, getMafiaPlayers,
  resolveNight, resolveVote, checkWin,
  ROLE_EMOJI, ROLE_DESC, type MGame,
} from "./mafia.js";

import {
  createMilioner, getMilioner, deleteMilioner,
  getCurrentQuestion, getCurrentPrize,
  answerMilioner, useFiftyFifty, useAudience,
  formatQuestion, OPTION_LETTERS,
} from "./milioner.js";

import {
  createSkocko, getSkocko, deleteSkocko,
  guessSkocko, parseGuess, renderAttempts, symbolsHelp,
} from "./skocko.js";

const TURN_TIME = 30;
const JOIN_TIME = 45;
const DAY_TIME = 60;
const VOTE_TIME = 30;

function embed(title: string, description: string, color = 0x5865f2): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);
}

function tc(channel: unknown): TextChannel {
  return channel as TextChannel;
}

// ── Kaladont helpers ──────────────────────────────────────────────────────────

async function kStartTurnTimer(game: KGame, channel: TextChannel, client: Client): Promise<void> {
  if (game.turnTimer) clearTimeout(game.turnTimer);
  game.turnTimer = setTimeout(async () => {
    if (game.phase !== "playing") return;
    const elim = eliminateKPlayer(game);
    recordGame(elim.id, elim.username);
    await channel.send({ embeds: [embed("⏰ Vreme isteklo!", `**${elim.username}** nije odgovorio i ispao je!`, 0xe74c3c)] });
    if (kGameOver(game)) return kEndGame(game, channel);
    const next = currentKPlayer(game);
    if (next) {
      await channel.send({ embeds: [embed("▶️ Na redu", `<@${next.id}>, reč mora početi sa **${game.lastLetters.toUpperCase()}**. Imaš **${TURN_TIME}s**.`, 0x2ecc71)] });
      await kStartTurnTimer(game, channel, client);
    }
  }, TURN_TIME * 1000);
}

async function kBeginGame(game: KGame, channel: TextChannel, client: Client): Promise<void> {
  game.phase = "playing";
  if (game.joinTimer) clearTimeout(game.joinTimer);
  const startWord = pickStartWord();
  game.lastWord = startWord;
  game.lastLetters = getLastLetters(startWord);
  game.usedWords.add(startWord.toLowerCase());

  const playerList = game.players.map((p) => `• **${p.username}**`).join("\n");
  await channel.send({ embeds: [embed("🎮 Kaladont počinje!", `**Igrači:**\n${playerList}\n\n**Prva reč:** **${startWord}**\nSledeća reč mora početi sa **${game.lastLetters.toUpperCase()}**`, 0x5865f2)] });

  const first = currentKPlayer(game);
  if (first) {
    await channel.send({ embeds: [embed("▶️ Na redu", `<@${first.id}>, ti si prvi! Reč mora početi sa **${game.lastLetters.toUpperCase()}**. Imaš **${TURN_TIME}s**.`, 0x2ecc71)] });
    await kStartTurnTimer(game, channel, client);
  }
}

async function kEndGame(game: KGame, channel: TextChannel): Promise<void> {
  const winner = kWinner(game);
  game.phase = "ended";
  if (winner) recordWin(winner.id, winner.username);
  deleteKaladont(game.channelId);
  await channel.send({ embeds: [embed("🏆 Kraj igre!", winner ? `**${winner.username}** je pobedio sa ${winner.score} bodova! 🎉` : "Nema pobednika.", 0xf1c40f)] });
}

// ── Mafia helpers ─────────────────────────────────────────────────────────────

async function mafiaBeginGame(game: MGame, channel: TextChannel, client: Client): Promise<void> {
  if (game.players.length < 4) {
    deleteMafia(game.channelId);
    await channel.send({ embeds: [embed("❌ Otkazano", "Mafia zahteva minimum 4 igrača!", 0xe74c3c)] });
    return;
  }
  startMafia(game);
  if (game.joinTimer) clearTimeout(game.joinTimer);

  const playerList = game.players.map((p) => `• **${p.username}**`).join("\n");
  await channel.send({ embeds: [embed("🎭 Mafia počinje!", `**Igrači:**\n${playerList}\n\nProveri DM za svoju ulogu! 🔐`, 0x2c3e50)] });

  for (const p of game.players) {
    try {
      const user = await client.users.fetch(p.id);
      await user.send({ embeds: [embed(`${ROLE_EMOJI[p.role]} Tvoja uloga: ${p.role}`, ROLE_DESC[p.role], 0x2c3e50)] });
    } catch { /* DM blokiran */ }
  }
  await mafiaStartNight(game, channel, client);
}

async function mafiaStartNight(game: MGame, channel: TextChannel, client: Client): Promise<void> {
  game.phase = "night";
  game.nightActions = {};
  game.nightActors = new Set();

  const alive = getAlivePlayers(game);
  const aliveList = alive.map((p) => `• **${p.username}** (ID: \`${p.id}\`)`).join("\n");
  await channel.send({ embeds: [embed("🌙 Noć pada...", "Specijalne uloge deluju putem DM!", 0x2c3e50)] });

  for (const m of getMafiaPlayers(game)) {
    try {
      const user = await client.users.fetch(m.id);
      await user.send({ embeds: [embed("🔪 Mafija deluje!", `Odaberi koga ćeš eliminisati:\n${aliveList}\n\nPiši ID igrača u DM.`, 0x922b21)] });
    } catch { /* ignore */ }
  }

  setTimeout(async () => {
    if (game.phase !== "night") return;
    await mafiaResolveNight(game, channel, client);
  }, 45_000);
}

async function mafiaResolveNight(game: MGame, channel: TextChannel, client: Client): Promise<void> {
  const result = resolveNight(game);
  const winCheck = checkWin(game);
  if (winCheck) return mafiaEnd(game, channel, winCheck);

  let desc = `**Runda ${game.round}**\n\n`;
  if (result.killed) {
    desc += `💀 **${result.killed.username}** je eliminisan ove noći.\n`;
    recordGame(result.killed.id, result.killed.username);
  } else if (result.saved) {
    desc += `🛡️ Doktor je spasio igrača ove noći!\n`;
  } else {
    desc += `😮 Ništa se nije dogodilo ove noći.\n`;
  }
  const alive = getAlivePlayers(game);
  desc += `\n**Živi:** ${alive.map((p) => `**${p.username}**`).join(", ")}`;
  await channel.send({ embeds: [embed("☀️ Sviće zora!", desc, 0xf39c12)] });

  game.phase = "day";
  game.votes = new Map();
  await channel.send({ embeds: [embed("🗣️ Rasprava!", `Imate **${DAY_TIME}s** da razgovarate, pa glasajte sa \`/glasaj @igrač\`.`, 0xe67e22)] });
  game.dayTimer = setTimeout(async () => {
    await mafiaStartVoting(game, channel, client);
  }, DAY_TIME * 1000);
}

async function mafiaStartVoting(game: MGame, channel: TextChannel, client: Client): Promise<void> {
  game.phase = "voting";
  const alive = getAlivePlayers(game);
  const list = alive.map((p, i) => `**${i + 1}.** ${p.username}`).join("\n");
  await channel.send({ embeds: [embed("🗳️ Glasanje!", `\`/glasaj @igrač\`\n\n${list}\n\nImate **${VOTE_TIME}s**.`, 0xe74c3c)] });

  game.voteTimer = setTimeout(async () => {
    const eliminated = resolveVote(game);
    if (eliminated) {
      recordGame(eliminated.id, eliminated.username);
      await channel.send({ embeds: [embed("⚖️ Odluka!", `**${eliminated.username}** (${ROLE_EMOJI[eliminated.role]}) je eliminovan!`, 0xe74c3c)] });
    } else {
      await channel.send({ embeds: [embed("🤷 Nema odluke", "Niko nije eliminisan.", 0x95a5a6)] });
    }
    const winCheck = checkWin(game);
    if (winCheck) return mafiaEnd(game, channel, winCheck);
    await mafiaStartNight(game, channel, client);
  }, VOTE_TIME * 1000);
}

async function mafiaEnd(game: MGame, channel: TextChannel, winner: "mafija" | "gradjanin"): Promise<void> {
  game.phase = "ended";
  const roleReveal = game.players.map((p) => `${ROLE_EMOJI[p.role]} **${p.username}** — ${p.role}`).join("\n");
  for (const p of game.players) {
    if (p.role === winner || (winner === "gradjanin" && p.role !== "mafija")) recordWin(p.id, p.username);
    else recordGame(p.id, p.username);
  }
  deleteMafia(game.channelId);
  const title = winner === "mafija" ? "🔪 Mafija pobedila!" : "👥 Građani pobedili!";
  await channel.send({ embeds: [embed(title, `**Uloge:**\n${roleReveal}`, winner === "mafija" ? 0x922b21 : 0x1e8449)] });
}

// ── Interaction handler ───────────────────────────────────────────────────────

async function handleCommand(interaction: Interaction, client: Client): Promise<void> {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, channelId, user, channel } = interaction;
  const ch = tc(channel);

  // /set
  if (commandName === "set") {
    const game = interaction.options.getString("igra", true) as GameType;
    setChannelGame(channelId, game);
    await interaction.reply({ embeds: [embed("✅ Postavljeno!", `Kanal podešen za **${GAME_NAMES[game]}**.\nKoristi \`/start\` da počneš.`, 0x2ecc71)] });
    return;
  }

  // /unset
  if (commandName === "unset") {
    unsetChannelGame(channelId);
    await interaction.reply({ embeds: [embed("🗑️ Uklonjeno", "Igra je uklonjena iz ovog kanala.", 0x95a5a6)] });
    return;
  }

  // /start
  if (commandName === "start") {
    const gameType = getChannelGame(channelId);
    if (!gameType) {
      await interaction.reply({ embeds: [embed("❌ Greška", "Nema igre podešene. Koristi `/set` prvo.", 0xe74c3c)], ephemeral: true });
      return;
    }

    if (gameType === "kaladont") {
      if (getKaladont(channelId)) {
        await interaction.reply({ embeds: [embed("❌ Greška", "Kaladont već teče!", 0xe74c3c)], ephemeral: true });
        return;
      }
      const game = createKaladont(channelId);
      addKPlayer(game, user.id, user.username);
      await interaction.reply({ embeds: [embed("🎮 Kaladont — Prijava", `**${user.username}** je pokrenuo!\nKoristi \`/join\` — počinje za **${JOIN_TIME}s**.`, 0x5865f2)] });
      game.joinTimer = setTimeout(async () => {
        if (game.players.length < 2) { deleteKaladont(channelId); await ch.send({ embeds: [embed("❌ Otkazano", "Min 2 igrača.", 0xe74c3c)] }); return; }
        await kBeginGame(game, ch, client);
      }, JOIN_TIME * 1000);
      return;
    }

    if (gameType === "toplo-hladno") {
      if (getTH(channelId)) {
        await interaction.reply({ embeds: [embed("❌ Greška", "Toplo Hladno već teče!", 0xe74c3c)], ephemeral: true });
        return;
      }
      const game = createTH(channelId);
      logger.info({ target: game.target }, "Toplo hladno target");
      await interaction.reply({ embeds: [embed("🌡️ Toplo Hladno!", `Pogodi broj između **1 i 100**!\nPiši broj u čet.`, 0xe67e22)] });
      return;
    }

    if (gameType === "wordle") {
      const existing = getWordle(channelId, user.id);
      if (existing && existing.phase === "playing") {
        await interaction.reply({ embeds: [embed("ℹ️ Tvoja igra", `Već imaš aktivnu igru!\n\n${renderBoard(existing)}`, 0x9b59b6)], ephemeral: true });
        return;
      }
      const game = createWordle(channelId, user.id, user.username);
      await interaction.reply({ embeds: [embed("🟩 Wordle!", `**${user.username}**, pogodi 5-slovnu reč!\n6 pokušaja — piši u čet.\n\n${renderBoard(game)}`, 0x538d4e)] });
      return;
    }

    if (gameType === "mafia") {
      if (getMafia(channelId)) {
        await interaction.reply({ embeds: [embed("❌ Greška", "Mafia već teče!", 0xe74c3c)], ephemeral: true });
        return;
      }
      const game = createMafia(channelId);
      addMPlayer(game, user.id, user.username);
      await interaction.reply({ embeds: [embed("🎭 Mafia — Prijava", `**${user.username}** je pokrenuo!\nKoristi \`/join\` — počinje za **${JOIN_TIME}s** (min 4).`, 0x2c3e50)] });
      game.joinTimer = setTimeout(async () => { await mafiaBeginGame(game, ch, client); }, JOIN_TIME * 1000);
      return;
    }
  }

  // /join
  if (commandName === "join") {
    const gameType = getChannelGame(channelId);

    if (gameType === "kaladont") {
      const game = getKaladont(channelId);
      if (!game || game.phase !== "joining") {
        await interaction.reply({ embeds: [embed("❌ Greška", "Nema Kaladonta u fazi prijave.", 0xe74c3c)], ephemeral: true });
        return;
      }
      if (!addKPlayer(game, user.id, user.username)) {
        await interaction.reply({ embeds: [embed("ℹ️", "Već si u igri!", 0x95a5a6)], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [embed("✅ Pridružen!", `**${user.username}** se pridružio. Ukupno: **${game.players.length}**`, 0x2ecc71)] });
      if (game.players.length >= 8) { if (game.joinTimer) clearTimeout(game.joinTimer); await kBeginGame(game, ch, client); }
      return;
    }

    if (gameType === "mafia") {
      const game = getMafia(channelId);
      if (!game || game.phase !== "joining") {
        await interaction.reply({ embeds: [embed("❌ Greška", "Nema Mafije u fazi prijave.", 0xe74c3c)], ephemeral: true });
        return;
      }
      if (!addMPlayer(game, user.id, user.username)) {
        await interaction.reply({ embeds: [embed("ℹ️", "Već si u igri!", 0x95a5a6)], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [embed("✅ Pridružen!", `**${user.username}** se pridružio. Ukupno: **${game.players.length}**`, 0x2ecc71)] });
      if (game.players.length >= 10) { if (game.joinTimer) clearTimeout(game.joinTimer); await mafiaBeginGame(game, ch, client); }
      return;
    }

    await interaction.reply({ embeds: [embed("❌ Greška", "Nema igre sa prijavama u ovom kanalu.", 0xe74c3c)], ephemeral: true });
    return;
  }

  // /stop
  if (commandName === "stop") {
    const gameType = getChannelGame(channelId);
    let stopped = false;
    if (gameType === "kaladont" && getKaladont(channelId)) { deleteKaladont(channelId); stopped = true; }
    if (gameType === "toplo-hladno" && getTH(channelId)) { deleteTH(channelId); stopped = true; }
    if (gameType === "wordle" && getWordle(channelId, user.id)) { deleteWordle(channelId, user.id); stopped = true; }
    if (gameType === "mafia" && getMafia(channelId)) { deleteMafia(channelId); stopped = true; }
    await interaction.reply({ embeds: [embed(stopped ? "🛑 Zaustavljeno" : "ℹ️ Nema igre", stopped ? "Igra zaustavljena." : "Nema aktivne igre.", stopped ? 0xe67e22 : 0x95a5a6)] });
    return;
  }

  // /solo
  if (commandName === "solo") {
    const soloGame = interaction.options.getString("igra", true);

    if (soloGame === "milioner") {
      const existing = getMilioner(user.id);
      if (existing && existing.phase === "playing") {
        const q = getCurrentQuestion(existing);
        if (q) {
          await interaction.reply({ embeds: [embed(`💰 Milioner — Pitanje ${existing.currentQ + 1}/14`, `${formatQuestion(existing)}\n\n💵 Na kocki: **${getCurrentPrize(existing)} RSD**\n\nOdgovori: **A B C D**`, 0xf1c40f)], ephemeral: true });
          return;
        }
      }
      const game = createMilioner(user.id, user.username);
      const q = getCurrentQuestion(game);
      if (!q) { await interaction.reply({ content: "Greška pri kreiranju igre.", ephemeral: true }); return; }
      await interaction.reply({ embeds: [embed("💰 Ko želi da bude milioner?", `**${user.username}**, dobrodošao!\n\n${formatQuestion(game)}\n\n💵 Na kocki: **${getCurrentPrize(game)} RSD**\n\nOdgovori: **A**, **B**, **C** ili **D**\nDžokeri: \`50/50\`  \`PUBLIKA\``, 0xf1c40f)] });
      return;
    }

    if (soloGame === "skocko") {
      const existing = getSkocko(user.id);
      if (existing && existing.phase === "playing") {
        await interaction.reply({ embeds: [embed("🎯 Skočko", `${symbolsHelp()}\n\n${renderAttempts(existing)}\n\nOstalo: **${8 - existing.attempts.length}** pokušaja`, 0x9b59b6)], ephemeral: true });
        return;
      }
      createSkocko(user.id, user.username);
      await interaction.reply({ embeds: [embed("🎯 Skočko!", `**${user.username}**, pogodi tajni kod od 4 simbola!\n\n**Simboli:**\n${symbolsHelp()}\n\nPiši: \`⚽ 🏀 🎾 🏐\` ili \`1 2 3 4\`\nImaš **8 pokušaja**!`, 0x9b59b6)] });
      return;
    }
  }

  // /rank
  if (commandName === "rank") {
    const top = getTopRankings(10);
    if (top.length === 0) {
      await interaction.reply({ embeds: [embed("📊 Rang lista", "Još nema rezultata.", 0x9b59b6)] });
      return;
    }
    const medals = ["🥇", "🥈", "🥉"];
    const list = top.map((e, i) => `${medals[i] ?? `**${i + 1}.**`} **${e.username}** — ${e.wins} pobeda (${e.games} igara)`).join("\n");
    const myRank = getUserRank(user.id);
    const footer = myRank ? `\nTvoj rank: **#${myRank.position}** (${myRank.entry.wins} pobeda)` : "";
    await interaction.reply({ embeds: [embed("🏆 Rang lista", list + footer, 0xf1c40f)] });
    return;
  }

  // /avatar
  if (commandName === "avatar") {
    const avatarUrl = user.displayAvatarURL({ size: 256 });
    const e = new EmbedBuilder().setTitle(`🖼️ Avatar — ${user.username}`).setImage(avatarUrl).setColor(0x5865f2);
    await interaction.reply({ embeds: [e] });
    return;
  }

  // /quest
  if (commandName === "quest") {
    const game = getKaladont(channelId);
    if (!game || game.phase !== "playing") {
      await interaction.reply({ embeds: [embed("❓ Quest", "Nema aktivnog Kaladonta u ovom kanalu.", 0x95a5a6)], ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [embed("🎯 Trenutni zadatak", `Reč mora početi sa **${game.lastLetters.toUpperCase()}**\nPoslednja reč: **${game.lastWord}**`, 0x3498db)] });
    return;
  }
}

// ── Main bot ──────────────────────────────────────────────────────────────────

export function startBot(token: string, clientId: string, guildId?: string): void {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  client.once(Events.ClientReady, async (c) => {
    logger.info({ tag: c.user.tag }, "Discord bot spreman");
    await registerCommands(token, clientId, guildId);
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleCommand(interaction, client);
    } catch (err) {
      logger.error({ err }, "Greška u interaction handleru");
      try {
        const msg = { content: "❌ Došlo je do greške. Pokušaj ponovo.", ephemeral: true };
        if (interaction.isChatInputCommand()) {
          if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
          else await interaction.reply(msg);
        }
      } catch { /* ignore */ }
    }
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (!message.channel.isTextBased() || !("send" in message.channel)) return;
    const ch = tc(message.channel);
    const channelId = message.channelId;
    const { id: userId, username } = message.author;
    const content = message.content.trim();
    const gameType = getChannelGame(channelId);

    // Kaladont
    if (gameType === "kaladont") {
      const game = getKaladont(channelId);
      if (!game || game.phase !== "playing") return;
      const current = currentKPlayer(game);
      if (!current || current.id !== userId) return;
      if (!content || content.includes(" ") || !/^[a-zA-ZšđčćžŠĐČĆŽ]+$/.test(content)) return;

      const result = playKWord(game, userId, content);
      if (!result.ok) {
        if (result.reason === "wrong_start") {
          if (game.turnTimer) clearTimeout(game.turnTimer);
          const elim = eliminateKPlayer(game);
          recordGame(elim.id, elim.username);
          await ch.send({ embeds: [embed("❌ Pogrešno!", `**${elim.username}** rekao **"${content}"** ali mora početi sa **${game.lastLetters.toUpperCase()}**! Ispao!`, 0xe74c3c)] });
          if (kGameOver(game)) return kEndGame(game, ch);
        } else if (result.reason === "already_used") {
          await ch.send({ embeds: [embed("🔁 Već korišćena!", `**"${content}"** je već bila! Smisli drugu.`, 0xe67e22)] });
          return;
        }
      } else {
        if (game.turnTimer) clearTimeout(game.turnTimer);
        await message.react("✅");
      }
      if (kGameOver(game)) return kEndGame(game, ch);
      const next = currentKPlayer(game);
      if (next) {
        await ch.send({ embeds: [embed("▶️ Na redu", `<@${next.id}>, reč mora početi sa **${game.lastLetters.toUpperCase()}**. Imaš **${TURN_TIME}s**.`, 0x2ecc71)] });
        await kStartTurnTimer(game, ch, client);
      }
      return;
    }

    // Toplo hladno
    if (gameType === "toplo-hladno") {
      const game = getTH(channelId);
      if (!game || game.phase !== "playing") return;
      const num = parseInt(content, 10);
      if (isNaN(num) || num < 1 || num > 100) return;
      const result = guessTH(game, userId, username, num);
      if (result.won) {
        recordWin(userId, username);
        deleteTH(channelId);
        await ch.send({ embeds: [embed("✅ Pogodak!", `**${username}** pogodio broj **${num}**! 🎉`, 0x2ecc71)] });
      } else {
        const dir = result.higher ? "⬆️ Viši" : "⬇️ Niži";
        await ch.send({ embeds: [embed(result.hint, `${username} rekao **${num}** — broj je **${dir}**`, 0xe67e22)] });
      }
      return;
    }

    // Wordle
    if (gameType === "wordle") {
      const game = getWordle(channelId, userId);
      if (!game || game.phase !== "playing") return;
      const word = content.toLowerCase();
      if (word.length !== 5 || word.includes(" ")) return;
      const result = playWordle(game, word);
      if ("error" in result) return;
      const board = renderBoard(game);
      if (result.won) {
        recordWin(userId, username);
        deleteWordle(channelId, userId);
        await ch.send({ embeds: [embed("🟩 Pogodio si!", `**${username}** pogodio **${game.word.toUpperCase()}**! 🎉\n\n${board}`, 0x538d4e)] });
      } else if (result.lost) {
        recordGame(userId, username);
        deleteWordle(channelId, userId);
        await ch.send({ embeds: [embed("❌ Kraj!", `Reč je bila **${game.word.toUpperCase()}**.\n\n${board}`, 0xe74c3c)] });
      } else {
        await ch.send({ embeds: [embed(`🟩 Pokušaj ${game.attempts.length}/6`, board, 0x538d4e)] });
      }
      return;
    }

    // Milioner
    {
      const mGame = getMilioner(userId);
      if (mGame && mGame.phase === "playing") {
        const upper = content.toUpperCase();
        const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

        if (upper === "50/50" || upper === "5050") {
          if (!mGame.lifelines.fifty) { await ch.send({ embeds: [embed("❌", "Džoker 50/50 već iskorišćen!", 0xe74c3c)] }); return; }
          const removed = useFiftyFifty(mGame);
          await ch.send({ embeds: [embed("🃏 50/50", formatQuestion(mGame, removed), 0xf1c40f)] });
          return;
        }
        if (upper === "PUBLIKA" || upper === "AUDIENCE") {
          if (!mGame.lifelines.audience) { await ch.send({ embeds: [embed("❌", "Džoker Publika već iskorišćen!", 0xe74c3c)] }); return; }
          const dist = useAudience(mGame);
          const distText = [0, 1, 2, 3].map((i) => `**${OPTION_LETTERS[i]})** ${dist[i] ?? 0}%`).join("  ");
          await ch.send({ embeds: [embed("👥 Publika kaže...", distText, 0xf1c40f)] });
          return;
        }

        const ansIndex = letterMap[upper];
        if (ansIndex === undefined) return;
        const q = getCurrentQuestion(mGame);
        if (!q) return;
        const answer = answerMilioner(mGame, ansIndex);
        const mPhase = (mGame as { phase: string }).phase;

        if (answer === "correct") {
          if (mPhase === "won") {
            recordWin(userId, username); deleteMilioner(userId);
            await ch.send({ embeds: [embed("🏆 MILIONER!", `**${username}** je pobedio milion! 🎉`, 0xf1c40f)] });
          } else {
            const nextQ = getCurrentQuestion(mGame);
            if (nextQ) await ch.send({ embeds: [embed(`✅ Tačno! Pitanje ${mGame.currentQ + 1}/14`, `${formatQuestion(mGame)}\n\n💵 Na kocki: **${getCurrentPrize(mGame)} RSD**`, 0x2ecc71)] });
          }
        } else {
          const safe = mGame.prize; recordGame(userId, username); deleteMilioner(userId);
          await ch.send({ embeds: [embed("❌ Pogrešno!", `Tačan: **${OPTION_LETTERS[q.answer]}) ${q.options[q.answer]}**\n**${username}** odlazi sa **${safe} RSD**.`, 0xe74c3c)] });
        }
        return;
      }
    }

    // Skočko
    {
      const sGame = getSkocko(userId);
      if (sGame && sGame.phase === "playing") {
        const guess = parseGuess(content);
        if (!guess) return;
        const result = guessSkocko(sGame, guess);
        if ("error" in result) { await ch.send({ embeds: [embed("❌ Greška", result.error, 0xe74c3c)] }); return; }
        const sPhase = (sGame as { phase: string }).phase;
        const board = renderAttempts(sGame);
        if (sPhase === "won") {
          recordWin(userId, username); deleteSkocko(userId);
          await ch.send({ embeds: [embed("🎉 Pogodio!", `**${username}** pogodio kod: ${sGame.code.join(" ")}\n\n${board}`, 0x2ecc71)] });
        } else if (sPhase === "lost") {
          recordGame(userId, username); deleteSkocko(userId);
          await ch.send({ embeds: [embed("❌ Kraj!", `Kod je bio: ${sGame.code.join(" ")}\n\n${board}`, 0xe74c3c)] });
        } else {
          await ch.send({ embeds: [embed(`🎯 Pokušaj ${sGame.attempts.length}/8`, `${board}\n\nOstalo: **${8 - sGame.attempts.length}** pokušaja`, 0x9b59b6)] });
        }
        return;
      }
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Nije moguće prijaviti se na Discord");
    process.exit(1);
  });
}
