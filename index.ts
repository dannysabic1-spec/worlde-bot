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
  addKPlayer, playKWord, kGameOver, kWinner, pickStartWord, getLastLetters,
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

const TURN_TIME = 60;
const DAY_TIME = 90;
const VOTE_TIME = 45;

function embed(title: string, description: string, color = 0x5865f2): EmbedBuilder {
  return new EmbedBuilder().setTitle(title).setDescription(description).setColor(color);
}

function tc(channel: unknown): TextChannel {
  return channel as TextChannel;
}

// ── Kaladont ──────────────────────────────────────────────────────────────────

async function kBeginGame(game: KGame, channel: TextChannel, client: Client): Promise<void> {
  game.phase = "playing";
  const startWord = pickStartWord();
  game.lastWord = startWord;
  game.lastLetters = getLastLetters(startWord);
  game.usedWords.add(startWord.toLowerCase());

  const playerList = game.players.map((p) => `**${p.username}**`).join(", ");
  await channel.send({
    embeds: [embed(
      "🎮 Kaladont — igra počela!",
      `**Igrači:** ${playerList}\n\n**Startna reč:** **${startWord.toUpperCase()}**\nSledeća reč mora početi sa **${game.lastLetters.toUpperCase()}**\n\n⏱️ Imaš **${TURN_TIME}s** po potezu.`,
      0x5865f2,
    )],
  });

  const first = game.players[game.currentIndex];
  if (first) {
    await channel.send({ embeds: [embed("▶️ Na potezu", `<@${first.id}> — reč mora početi sa **${game.lastLetters.toUpperCase()}**`, 0x2ecc71)] });
  }
  kSetTurnTimer(game, channel, client);
}

function kSetTurnTimer(game: KGame, channel: TextChannel, client: Client): void {
  if (game.turnTimer) clearTimeout(game.turnTimer);
  game.turnTimer = setTimeout(async () => {
    if (game.phase !== "playing") return;
    const elim = game.players[game.currentIndex];
    if (!elim) return;
    recordGame(elim.id, elim.username);
    game.players.splice(game.currentIndex, 1);
    if (game.currentIndex >= game.players.length) game.currentIndex = 0;
    await channel.send({ embeds: [embed("⏰ Vreme!", `**${elim.username}** nije odgovorio — ispao! ❌`, 0xe74c3c)] });
    if (kGameOver(game)) return kEndGame(game, channel);
    const next = game.players[game.currentIndex];
    if (next) {
      await channel.send({ embeds: [embed("▶️ Na potezu", `<@${next.id}> — reč mora početi sa **${game.lastLetters.toUpperCase()}**`, 0x2ecc71)] });
      kSetTurnTimer(game, channel, client);
    }
  }, TURN_TIME * 1000);
}

async function kEndGame(game: KGame, channel: TextChannel): Promise<void> {
  game.phase = "ended";
  const winner = kWinner(game);
  deleteKaladont(game.channelId);
  if (winner && game.players.length === 0) {
    // solo — niko nije ostao (sam se eliminisao)
    await channel.send({ embeds: [embed("💀 Game Over!", `**${winner.username}** — rekordna reč: **${game.lastWord}**\nKoristi \`/start\` za novu igru.`, 0xe74c3c)] });
  } else if (winner) {
    recordWin(winner.id, winner.username);
    await channel.send({ embeds: [embed("🏆 Pobednik!", `**${winner.username}** je pobedio! 🎉\nBodovi: **${winner.score}**`, 0xf1c40f)] });
  } else {
    await channel.send({ embeds: [embed("💀 Game Over!", "Nema pobednika.", 0xe74c3c)] });
  }
}

// ── Mafia ─────────────────────────────────────────────────────────────────────

async function mafiaBeginGame(game: MGame, channel: TextChannel, client: Client): Promise<void> {
  if (game.players.length < 4) {
    deleteMafia(game.channelId);
    await channel.send({ embeds: [embed("❌ Premalo igrača", `Mafia zahteva min **4 igrača**. Dodaj ih sa \`/join\`.`, 0xe74c3c)] });
    return;
  }
  startMafia(game);
  const playerList = game.players.map((p) => `${ROLE_EMOJI[p.role]} **${p.username}**`).join("\n");
  await channel.send({ embeds: [embed("🎭 Mafia počela!", `**Igrači:**\n${playerList}\n\nSvako je dobio svoju ulogu u DM! 🔐`, 0x2c3e50)] });
  for (const p of game.players) {
    try {
      const u = await client.users.fetch(p.id);
      await u.send({ embeds: [embed(`${ROLE_EMOJI[p.role]} Tvoja uloga`, ROLE_DESC[p.role], 0x2c3e50)] });
    } catch { /* DM blokiran */ }
  }
  await mafiaStartNight(game, channel, client);
}

async function mafiaStartNight(game: MGame, channel: TextChannel, client: Client): Promise<void> {
  game.phase = "night";
  game.nightActions = {};
  game.nightActors = new Set();
  const alive = getAlivePlayers(game);
  const aliveList = alive.map((p) => `• **${p.username}** — \`${p.id}\``).join("\n");
  await channel.send({ embeds: [embed("🌙 Noć pada...", "Mafija i specijalne uloge deluju putem DM!", 0x2c3e50)] });
  for (const m of getMafiaPlayers(game)) {
    try {
      const u = await client.users.fetch(m.id);
      await u.send({ embeds: [embed("🔪 Mafija — odaberi žrtvu", `Živi igrači:\n${aliveList}\n\nOdgovori ID igrača u ovom DM.`, 0x922b21)] });
    } catch { /* ignore */ }
  }
  setTimeout(() => { if (game.phase === "night") void mafiaResolveNight(game, channel, client); }, 45_000);
}

async function mafiaResolveNight(game: MGame, channel: TextChannel, client: Client): Promise<void> {
  const result = resolveNight(game);
  const win = checkWin(game);
  if (win) return mafiaEnd(game, channel, win);
  let desc = `**Runda ${game.round}**\n\n`;
  if (result.killed) { desc += `💀 **${result.killed.username}** je eliminisan.\n`; recordGame(result.killed.id, result.killed.username); }
  else if (result.saved) { desc += `🛡️ Doktor je spasio nekog ove noći!\n`; }
  else { desc += `Ništa se nije desilo ove noći.\n`; }
  const alive = getAlivePlayers(game);
  desc += `\n**Živi:** ${alive.map((p) => `**${p.username}**`).join(", ")}`;
  await channel.send({ embeds: [embed("☀️ Sviće!", desc, 0xf39c12)] });
  game.phase = "day";
  game.votes = new Map();
  await channel.send({ embeds: [embed("🗣️ Rasprava", `Razgovarajte **${DAY_TIME}s**, pa glasajte \`/glasaj @igrač\`.`, 0xe67e22)] });
  game.dayTimer = setTimeout(() => { void mafiaStartVoting(game, channel, client); }, DAY_TIME * 1000);
}

async function mafiaStartVoting(game: MGame, channel: TextChannel, client: Client): Promise<void> {
  game.phase = "voting";
  const alive = getAlivePlayers(game);
  const list = alive.map((p, i) => `**${i + 1}.** ${p.username}`).join("\n");
  await channel.send({ embeds: [embed("🗳️ Glasanje!", `${list}\n\nGlasajte \`/glasaj @igrač\` — **${VOTE_TIME}s**`, 0xe74c3c)] });
  game.voteTimer = setTimeout(async () => {
    const elim = resolveVote(game);
    if (elim) { recordGame(elim.id, elim.username); await channel.send({ embeds: [embed("⚖️ Eliminisan", `**${elim.username}** (${ROLE_EMOJI[elim.role]}) je izbačen!`, 0xe74c3c)] }); }
    else { await channel.send({ embeds: [embed("🤷 Nema odluke", "Niko nije eliminisan.", 0x95a5a6)] }); }
    const win = checkWin(game);
    if (win) return mafiaEnd(game, channel, win);
    await mafiaStartNight(game, channel, client);
  }, VOTE_TIME * 1000);
}

async function mafiaEnd(game: MGame, channel: TextChannel, winner: "mafija" | "gradjanin"): Promise<void> {
  game.phase = "ended";
  const reveal = game.players.map((p) => `${ROLE_EMOJI[p.role]} **${p.username}** — ${p.role}`).join("\n");
  for (const p of game.players) {
    if ((winner === "mafija" && p.role === "mafija") || (winner === "gradjanin" && p.role !== "mafija")) recordWin(p.id, p.username);
    else recordGame(p.id, p.username);
  }
  deleteMafia(game.channelId);
  await channel.send({ embeds: [embed(winner === "mafija" ? "🔪 Mafija pobedila!" : "👥 Građani pobedili!", `**Uloge:**\n${reveal}`, winner === "mafija" ? 0x922b21 : 0x1e8449)] });
}

// ── Command handler ───────────────────────────────────────────────────────────

async function handleCommand(interaction: Interaction, client: Client): Promise<void> {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, channelId, user, channel } = interaction;
  const ch = tc(channel);

  // /set
  if (commandName === "set") {
    const game = interaction.options.getString("igra", true) as GameType;
    setChannelGame(channelId, game);
    await interaction.reply({ embeds: [embed("✅ Postavljeno!", `Kanal podešen za **${GAME_NAMES[game]}**.\nKoristi \`/start\` da odmah počneš.`, 0x2ecc71)] });
    return;
  }

  // /unset
  if (commandName === "unset") {
    unsetChannelGame(channelId);
    await interaction.reply({ embeds: [embed("🗑️ Uklonjeno", "Igra uklonjena iz ovog kanala.", 0x95a5a6)] });
    return;
  }

  // /start — sve igre kreću odmah
  if (commandName === "start") {
    const gameType = getChannelGame(channelId);
    if (!gameType) {
      await interaction.reply({ embeds: [embed("❌ Greška", "Nema igre podešene. Koristi `/set` prvo.", 0xe74c3c)], ephemeral: true });
      return;
    }

    // KALADONT — startuje odmah, bez join faze
    if (gameType === "kaladont") {
      if (getKaladont(channelId)) {
        await interaction.reply({ embeds: [embed("❌ Greška", "Kaladont već teče! Koristi `/stop` da ga zaustaviš.", 0xe74c3c)], ephemeral: true });
        return;
      }
      const game = createKaladont(channelId);
      addKPlayer(game, user.id, user.username);
      await interaction.reply({ embeds: [embed("✅ Kaladont počinje!", "Igra kreće odmah! 🎮", 0x5865f2)] });
      await kBeginGame(game, ch, client);
      return;
    }

    // TOPLO HLADNO — startuje odmah
    if (gameType === "toplo-hladno") {
      if (getTH(channelId)) {
        await interaction.reply({ embeds: [embed("❌ Greška", "Toplo Hladno već teče!", 0xe74c3c)], ephemeral: true });
        return;
      }
      createTH(channelId);
      await interaction.reply({ embeds: [embed("🌡️ Toplo Hladno — Počelo!", `Pogodi broj između **1** i **100**!\nPiši broj u čet.`, 0xe67e22)] });
      return;
    }

    // WORDLE — startuje odmah
    if (gameType === "wordle") {
      const existing = getWordle(channelId, user.id);
      if (existing && existing.phase === "playing") {
        await interaction.reply({ embeds: [embed("ℹ️ Tvoja igra", `Već imaš aktivnu igru!\n\n${renderBoard(existing)}`, 0x9b59b6)], ephemeral: true });
        return;
      }
      const game = createWordle(channelId, user.id, user.username);
      await interaction.reply({ embeds: [embed("🟩 Wordle — Počelo!", `**${user.username}**, pogodi 5-slovnu reč!\n6 pokušaja — piši reč u čet.\n\n${renderBoard(game)}`, 0x538d4e)] });
      return;
    }

    // MAFIA — startuje odmah (ali treba min 4 igrača — uputi na /join)
    if (gameType === "mafia") {
      const existing = getMafia(channelId);
      if (existing && existing.phase !== "joining") {
        await interaction.reply({ embeds: [embed("❌ Greška", "Mafia već teče!", 0xe74c3c)], ephemeral: true });
        return;
      }
      if (existing && existing.phase === "joining") {
        // Ako postoji i čeka igrače — startuj odmah
        addMPlayer(existing, user.id, user.username);
        await interaction.reply({ embeds: [embed("🎭 Mafia — Startuje!", `Počinjemo sa **${existing.players.length}** igrača!`, 0x2c3e50)] });
        await mafiaBeginGame(existing, ch, client);
        return;
      }
      const game = createMafia(channelId);
      addMPlayer(game, user.id, user.username);
      await interaction.reply({ embeds: [embed("🎭 Mafia — Prijava otvorena", `**${user.username}** pokrenuo!\nOstali koriste \`/join\`, a kad ste svi unutra ponovo \`/start\` da počnete.\n\n*Min 4 igrača.*`, 0x2c3e50)] });
      return;
    }

    await interaction.reply({ embeds: [embed("❌ Greška", "Nepoznata igra.", 0xe74c3c)], ephemeral: true });
    return;
  }

  // /join — samo Mafia ima join fazu
  if (commandName === "join") {
    const gameType = getChannelGame(channelId);

    if (gameType === "kaladont") {
      const game = getKaladont(channelId);
      if (!game || game.phase !== "playing") {
        await interaction.reply({ embeds: [embed("❌", "Nema aktivnog Kaladonta. Koristi `/start`.", 0xe74c3c)], ephemeral: true });
        return;
      }
      if (game.players.find((p) => p.id === user.id)) {
        await interaction.reply({ embeds: [embed("ℹ️", "Već si u igri!", 0x95a5a6)], ephemeral: true });
        return;
      }
      addKPlayer(game, user.id, user.username);
      await interaction.reply({ embeds: [embed("✅ Pridružen!", `**${user.username}** ušao u Kaladont! Ukupno: **${game.players.length}** igrača.`, 0x2ecc71)] });
      return;
    }

    if (gameType === "mafia") {
      const game = getMafia(channelId);
      if (!game || game.phase !== "joining") {
        await interaction.reply({ embeds: [embed("❌", "Nema Mafije u fazi prijave.", 0xe74c3c)], ephemeral: true });
        return;
      }
      if (!addMPlayer(game, user.id, user.username)) {
        await interaction.reply({ embeds: [embed("ℹ️", "Već si u igri!", 0x95a5a6)], ephemeral: true });
        return;
      }
      await interaction.reply({ embeds: [embed("✅ Pridružen!", `**${user.username}** ušao. Ukupno: **${game.players.length}** igrača.`, 0x2ecc71)] });
      return;
    }

    await interaction.reply({ embeds: [embed("❌", "Ova igra nema join fazu.", 0xe74c3c)], ephemeral: true });
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
    await interaction.reply({ embeds: [embed(stopped ? "🛑 Zaustavljeno" : "ℹ️ Nema aktivne igre", stopped ? "Igra zaustavljena." : "Pokrei igru sa `/start`.", stopped ? 0xe67e22 : 0x95a5a6)] });
    return;
  }

  // /solo
  if (commandName === "solo") {
    const soloGame = interaction.options.getString("igra", true);

    if (soloGame === "milioner") {
      const existing = getMilioner(user.id);
      if (existing && existing.phase === "playing") {
        await interaction.reply({ embeds: [embed(`💰 Pitanje ${existing.currentQ + 1}/14`, `${formatQuestion(existing)}\n\n💵 Na kocki: **${getCurrentPrize(existing)} RSD**`, 0xf1c40f)], ephemeral: true });
        return;
      }
      const game = createMilioner(user.id, user.username);
      await interaction.reply({ embeds: [embed("💰 Ko želi da bude milioner?", `**${user.username}**, igra počela!\n\n${formatQuestion(game)}\n\n💵 Na kocki: **${getCurrentPrize(game)} RSD**\n\nOdgovori: **A**, **B**, **C** ili **D**\nDžokeri: \`50/50\`  \`PUBLIKA\``, 0xf1c40f)] });
      return;
    }

    if (soloGame === "skocko") {
      const existing = getSkocko(user.id);
      if (existing && existing.phase === "playing") {
        await interaction.reply({ embeds: [embed("🎯 Skočko — tvoja igra", `${symbolsHelp()}\n\n${renderAttempts(existing)}\n\nOstalo: **${8 - existing.attempts.length}** pokušaja`, 0x9b59b6)], ephemeral: true });
        return;
      }
      createSkocko(user.id, user.username);
      await interaction.reply({ embeds: [embed("🎯 Skočko — počelo!", `**${user.username}**, pogodi tajni kod od 4 simbola!\n\n**Simboli:**\n${symbolsHelp()}\n\nPiši npr: \`⚽ 🏀 🎾 🏐\` ili \`1 2 3 4\`\nImaš **8 pokušaja**!`, 0x9b59b6)] });
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
    const footer = myRank ? `\n\nTvoj rank: **#${myRank.position}** (${myRank.entry.wins} pobeda)` : "";
    await interaction.reply({ embeds: [embed("🏆 Rang lista", list + footer, 0xf1c40f)] });
    return;
  }

  // /avatar
  if (commandName === "avatar") {
    const e = new EmbedBuilder().setTitle(`🖼️ Avatar — ${user.username}`).setImage(user.displayAvatarURL({ size: 256 })).setColor(0x5865f2);
    await interaction.reply({ embeds: [e] });
    return;
  }

  // /quest
  if (commandName === "quest") {
    const game = getKaladont(channelId);
    if (!game || game.phase !== "playing") {
      await interaction.reply({ embeds: [embed("❓ Quest", "Nema aktivnog Kaladonta.", 0x95a5a6)], ephemeral: true });
      return;
    }
    const current = game.players[game.currentIndex];
    await interaction.reply({ embeds: [embed("🎯 Trenutni zadatak", `Reč mora početi sa **${game.lastLetters.toUpperCase()}**\nPoslednja reč: **${game.lastWord}**\nNa potezu: ${current ? `<@${current.id}>` : "—"}`, 0x3498db)] });
    return;
  }
}

// ── Message handler helpers ───────────────────────────────────────────────────

async function handleKaladont(message: Message, ch: TextChannel, client: Client): Promise<void> {
  const { channelId, author: { id: userId, username }, content } = message;
  const game = getKaladont(channelId);
  if (!game || game.phase !== "playing") return;

  // Ako igrač nije u listi, auto-dodaj ga
  if (!game.players.find((p) => p.id === userId)) {
    addKPlayer(game, userId, username);
  }

  const current = game.players[game.currentIndex];
  if (!current || current.id !== userId) return; // nije na potezu

  const word = content.trim().toLowerCase();
  if (!word || word.includes(" ") || !/^[a-zA-ZšđčćžŠĐČĆŽ]+$/.test(word)) return;

  const result = playKWord(game, userId, word);

  if (!result.ok) {
    if (result.reason === "wrong_start") {
      if (game.turnTimer) clearTimeout(game.turnTimer);
      recordGame(userId, username);
      game.players.splice(game.currentIndex, 1);
      if (game.currentIndex >= game.players.length) game.currentIndex = 0;
      await ch.send({ embeds: [embed("❌ Pogrešno!", `**${username}** rekao **"${word}"** ali mora početi sa **${game.lastLetters.toUpperCase()}**! Ispao! ☠️`, 0xe74c3c)] });
      if (kGameOver(game)) { await kEndGame(game, ch); return; }
    } else if (result.reason === "already_used") {
      await ch.send({ embeds: [embed("🔁 Već korišćena!", `**"${word}"** je već bila! Smisli drugu.`, 0xe67e22)] });
      return;
    }
  } else {
    if (game.turnTimer) clearTimeout(game.turnTimer);
    await message.react("✅");
  }

  if (kGameOver(game)) { await kEndGame(game, ch); return; }
  const next = game.players[game.currentIndex];
  if (next) {
    await ch.send({ embeds: [embed("▶️ Na potezu", `<@${next.id}> — reč mora početi sa **${game.lastLetters.toUpperCase()}**`, 0x2ecc71)] });
    kSetTurnTimer(game, ch, client);
  }
}

// ── Bot entry point ───────────────────────────────────────────────────────────

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
        const msg = { content: "❌ Greška. Pokušaj ponovo.", ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
        else await interaction.reply(msg);
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
      await handleKaladont(message, ch, client);
      return;
    }

    // Toplo Hladno
    if (gameType === "toplo-hladno") {
      const game = getTH(channelId);
      if (!game || game.phase !== "playing") return;
      const num = parseInt(content, 10);
      if (isNaN(num) || num < 1 || num > 100) return;
      const result = guessTH(game, userId, username, num);
      if (result.won) {
        recordWin(userId, username);
        deleteTH(channelId);
        await ch.send({ embeds: [embed("🎉 Pogodak!", `**${username}** pogodio **${num}**! 🎉`, 0x2ecc71)] });
      } else {
        const dir = result.higher ? "⬆️ Viši" : "⬇️ Niži";
        await ch.send({ embeds: [embed(result.hint, `${username} rekao **${num}** — **${dir}**`, 0xe67e22)] });
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
        await ch.send({ embeds: [embed("🟩 Pogodak!", `**${username}** pogodio **${game.word.toUpperCase()}**! 🎉\n\n${board}`, 0x538d4e)] });
      } else if (result.lost) {
        recordGame(userId, username);
        deleteWordle(channelId, userId);
        await ch.send({ embeds: [embed("❌ Kraj!", `Reč je bila **${game.word.toUpperCase()}**.\n\n${board}`, 0xe74c3c)] });
      } else {
        await ch.send({ embeds: [embed(`🟩 Pokušaj ${game.attempts.length}/6`, board, 0x538d4e)] });
      }
      return;
    }

    // Milioner (solo — sluša u kanalu)
    {
      const mGame = getMilioner(userId);
      if (mGame && mGame.phase === "playing") {
        const upper = content.toUpperCase();
        const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

        if (upper === "50/50" || upper === "5050") {
          if (!mGame.lifelines.fifty) { await ch.send({ embeds: [embed("❌", "Džoker 50/50 već iskorišćen!", 0xe74c3c)] }); return; }
          const removed = useFiftyFifty(mGame);
          await ch.send({ embeds: [embed("🃏 50/50 džoker", formatQuestion(mGame, removed), 0xf1c40f)] });
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
            recordWin(userId, username);
            deleteMilioner(userId);
            await ch.send({ embeds: [embed("🏆 MILIONER!", `**${username}** je pobedio milion RSD! 🎉🎉🎉`, 0xf1c40f)] });
          } else {
            await ch.send({ embeds: [embed(`✅ Tačno! Pitanje ${mGame.currentQ + 1}/14`, `${formatQuestion(mGame)}\n\n💵 Na kocki: **${getCurrentPrize(mGame)} RSD**`, 0x2ecc71)] });
          }
        } else {
          const safe = mGame.prize;
          recordGame(userId, username);
          deleteMilioner(userId);
          await ch.send({ embeds: [embed("❌ Pogrešno!", `Tačan: **${OPTION_LETTERS[q.answer]}) ${q.options[q.answer]}**\n**${username}** odlazi sa **${safe} RSD**.`, 0xe74c3c)] });
        }
        return;
      }
    }

    // Skočko (solo — sluša u kanalu)
    {
      const sGame = getSkocko(userId);
      if (sGame && sGame.phase === "playing") {
        const guess = parseGuess(content);
        if (!guess) return;
        const result = guessSkocko(sGame, guess);
        if ("error" in result) { await ch.send({ embeds: [embed("❌ Greška", result.error, 0xe74c3c)] }); return; }
        const board = renderAttempts(sGame);
        const sPhase = (sGame as { phase: string }).phase;
        if (sPhase === "won") {
          recordWin(userId, username);
          deleteSkocko(userId);
          await ch.send({ embeds: [embed("🎉 Pogodio!", `**${username}** pogodio kod: ${sGame.code.join(" ")}\n\n${board}`, 0x2ecc71)] });
        } else if (sPhase === "lost") {
          recordGame(userId, username);
          deleteSkocko(userId);
          await ch.send({ embeds: [embed("❌ Kraj!", `Kod je bio: ${sGame.code.join(" ")}\n\n${board}`, 0xe74c3c)] });
        } else {
          await ch.send({ embeds: [embed(`🎯 Pokušaj ${sGame.attempts.length}/8`, `${board}\n\nOstalo: **${8 - sGame.attempts.length}** pokušaja`, 0x9b59b6)] });
        }
        return;
      }
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Nije moguće prijaviti se na Discord — proveri DISCORD_TOKEN secret!");
  });
}
