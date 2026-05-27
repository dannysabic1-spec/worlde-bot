// ╔══════════════════════════════════════════════════════════════╗
// ║          GUARDIAN BOT — GIANNI Edition                      ║
// ║  Sve komande na . prefix  •  NSFW  •  Tinder  •  Full Mod  ║
// ╚══════════════════════════════════════════════════════════════╝

import {
  Client, GatewayIntentBits, REST, Routes, ActivityType,
  EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits,
  ChannelType, GuildMember, GuildScheduledEventStatus
} from "discord.js";
import pino from "pino";
import { existsSync, unlinkSync } from "fs";

// ─── Startup cleanup ─────────────────────────────────────────────────────────
for (const f of ["package-lock.json", "yarn.lock", ".DS_Store"]) {
  if (existsSync(f)) { try { unlinkSync(f); } catch {} }
}

// ─── Logger ──────────────────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === "production";
const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } })
});

// ─── Constants ───────────────────────────────────────────────────────────────
const OWNER_ID = "829552737322270731";
const FOOTER   = "🛡️ GIANNI Bot v2";
const PREFIX   = ".";

const C = {
  GREEN:  0x57F287, RED:    0xED4245, BLUE:   0x5865F2, YELLOW: 0xFEE75C,
  ORANGE: 0xFF7700, PINK:   0xFF73FA, CYAN:   0x00D4FF, GOLD:   0xF1C40F,
  DARK:   0x2F3136, PURPLE: 0x9B59B6, TEAL:   0x1ABC9C, WHITE:  0xFFFFFF
};

// ─── Embed helpers ────────────────────────────────────────────────────────────
const mkOk   = (t, d) => new EmbedBuilder().setColor(C.GREEN) .setTitle(`✅ ${t}`).setDescription(d).setTimestamp().setFooter({ text: FOOTER });
const mkErr  = (t, d) => new EmbedBuilder().setColor(C.RED)   .setTitle(`❌ ${t}`).setDescription(d).setTimestamp().setFooter({ text: FOOTER });
const mkInfo = (t, d) => new EmbedBuilder().setColor(C.BLUE)  .setTitle(`ℹ️ ${t}`).setDescription(d).setTimestamp().setFooter({ text: FOOTER });
const mkWarn = (t, d) => new EmbedBuilder().setColor(C.YELLOW).setTitle(`⚠️ ${t}`).setDescription(d).setTimestamp().setFooter({ text: FOOTER });

// ─── Helpers ─────────────────────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(t, from, to) {
  return t.replace("{from}", `**${from.globalName ?? from.username}**`)
          .replace("{to}",   to ? `**${to.globalName ?? to.username}**` : "**???**");
}
function isOwner(userId)   { return userId === OWNER_ID; }
function isAdmin(member)   { return member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false; }
function isMod(member)     { return member?.permissions?.has(PermissionFlagsBits.ModerateMembers) ?? false; }
function isNsfw(channel)   { return channel?.nsfw === true; }

// ─── GIF Fetcher (SFW — nekos.best) ─────────────────────────────────────────
async function fetchGif(action) {
  try {
    const res  = await fetch(`https://nekos.best/api/v2/${action}`);
    const data = await res.json();
    return data.results?.[0]?.url ?? null;
  } catch { return null; }
}

// ─── GIF Fetcher (NSFW — danbooru.donmai.us) ─────────────────────────────────
const DANBOORU_TAGS = {
  blowjob:       "animated blowjob",
  fuck:          "animated sex",
  anal:          "animated anal",
  cum:           "animated cum",
  pussylick:     "oral animated",
  solo:          "nude animated",
  threesome_ffm: "group_sex animated",
  threesome_mmf: "group_sex animated",
  threesome_fff: "animated yuri",
  yaoi:          "animated yaoi",
  yuri:          "animated yuri",
  handjob:       "animated blowjob",
  fingering:     "fingering animated",
  strip:         "nude animated",
  creampie:      "animated cum",
  nudes:         "nude animated",
};

async function fetchNsfwGif(action) {
  try {
    const tags = DANBOORU_TAGS[action] ?? `animated ${action} -video`;
    const page = Math.floor(Math.random() * 8) + 1;
    const url  = `https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(tags)}&limit=40&page=${page}`;
    const res  = await fetch(url, { headers: { "User-Agent": "GIANNI-Bot/2.0 (Discord Bot)" } });
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) {
      // retry page 1 if random page had no results
      const res2  = await fetch(`https://danbooru.donmai.us/posts.json?tags=${encodeURIComponent(tags)}&limit=40&page=1`, { headers: { "User-Agent": "GIANNI-Bot/2.0" } });
      const posts2 = await res2.json();
      if (!Array.isArray(posts2) || posts2.length === 0) return null;
      const gifs2 = posts2.filter(p => p.file_url && p.file_ext === "gif");
      return gifs2.length ? pick(gifs2).file_url : null;
    }
    const gifs = posts.filter(p => p.file_url && p.file_ext === "gif");
    return gifs.length ? pick(gifs).file_url : null;
  } catch { return null; }
}

const GIF_SFW = {
  hug: "hug", kiss: "kiss", pat: "pat", slap: "slap", poke: "poke",
  bite: "bite", cuddle: "cuddle", blush: "blush", wave: "wave",
  highfive: "handshake", feed: "feed", stare: "stare", cry: "cry",
  dance: "dance", smile: "smile", lick: "lick", happy: "happy",
  nod: "nod", nope: "nope", sleep: "sleep", wink: "wink",
  thumbsup: "thumbsup", yawn: "yawn", laugh: "laugh", shrug: "shrug"
};

const GIF_NSFW = {
  fuck:   "blowjob",
  daddy:  "ero_neko",
  mommy:  "ero_yuri",
  nsfw:   "blowjob"
};

// ─── Permission guard (message commands) ─────────────────────────────────────
async function requireOwner(msg) {
  if (!isOwner(msg.author.id)) {
    await msg.reply({ embeds: [mkErr("Zabranjen pristup", "Ova komanda je dostupna samo vlasniku bota! 🔒")] });
    return false;
  }
  return true;
}
async function requireMod(msg) {
  if (!isOwner(msg.author.id) && !isMod(msg.member) && !isAdmin(msg.member)) {
    await msg.reply({ embeds: [mkErr("Zabranjen pristup", "Ova komanda je dostupna samo moderatorima! 🔒")] });
    return false;
  }
  return true;
}

// ─── NSFW kanal sistem ────────────────────────────────────────────────────────
const NSFW_CHANNELS = new Map(); // guildId → channelId

async function requireNsfwChannel(msg) {
  if (!msg.guild) return true;
  const setId = NSFW_CHANNELS.get(msg.guild.id);
  if (!setId) return true; // nema postavljenog kanala → radi svuda
  if (msg.channel.id === setId) return true;
  const ch = msg.guild.channels.cache.get(setId);
  await msg.reply({ embeds: [new EmbedBuilder().setColor(C.RED)
    .setTitle("🔞 NSFW kanal potreban!")
    .setDescription(`Ova komanda se može koristiti samo u ${ch ? `<#${setId}>` : "postavljenom NSFW kanalu"}!\n\n*Admin mijenja kanal sa: \`.nsfw set #kanal\`*`)
    .setTimestamp().setFooter({ text: FOOTER })] });
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANTI-RAID
// ═══════════════════════════════════════════════════════════════════════════════
const JOIN_THRESHOLD    = 5;
const JOIN_WINDOW_MS    = 10_000;
const LOCKDOWN_DURATION = 5 * 60_000;
const recentJoins    = new Map();
const lockdownGuilds = new Set();

async function activateLockdown(member) {
  const guild = member.guild;
  if (lockdownGuilds.has(guild.id)) return;
  lockdownGuilds.add(guild.id);
  const textChannels = guild.channels.cache.filter(
    ch => ch.type === ChannelType.GuildText &&
          ch.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.SendMessages)
  );
  for (const [, ch] of textChannels) {
    try { await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }); } catch {}
  }
  const joinCount = recentJoins.get(guild.id)?.length ?? JOIN_THRESHOLD;
  guild.systemChannel?.send({ embeds: [new EmbedBuilder()
    .setColor(C.RED).setTitle("🚨 RAID DETECTED — SERVER LOCKDOWN")
    .setDescription(`> **${joinCount}** korisnika je ušlo za manje od **10 sekundi**!\n> Server je zaključan na **5 minuta**.`)
    .addFields(
      { name: "🏰 Server",    value: guild.name,              inline: true },
      { name: "👥 Mass Join", value: `${joinCount} korisnika`, inline: true },
      { name: "⏱️ Trajanje",   value: "5 min (auto-unlock)",   inline: true }
    ).setThumbnail(guild.iconURL() ?? null).setTimestamp().setFooter({ text: "🛡️ Anti-Raid • GIANNI Bot" })] }).catch(() => {});
  setTimeout(async () => {
    try {
      for (const [, ch] of textChannels) {
        if (ch.type === ChannelType.GuildText)
          await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
      }
      lockdownGuilds.delete(guild.id); recentJoins.delete(guild.id);
      guild.systemChannel?.send({ embeds: [mkOk("Lockdown završen", `Server **${guild.name}** je otključan.\nRaid zaštita ostaje aktivna.`)] }).catch(() => {});
    } catch (e) { logger.error({ err: e }, "Error lifting lockdown"); }
  }, LOCKDOWN_DURATION);
}

// ─── Anti-Invite ─────────────────────────────────────────────────────────────
const INVITE_RE = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/gi;

// ═══════════════════════════════════════════════════════════════════════════════
//  SOCIAL / LOVE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════
const SOCIAL = {
  hug:      { color: C.ORANGE, emoji: "🤗", lines: ["{from} zagrlio/la {to}! 🤗", "{from} daje {to} super zagrljaj! 💛", "{from} ne pušta {to} iz zagrljaja! 😭"] },
  kiss:     { color: C.PINK,   emoji: "💋", lines: ["{from} dao/dala {to} pusu! 💋", "{from} poslao/la {to} cmok! 😘", "{from} poljubio/la {to} u čelo! 💖"] },
  slap:     { color: C.RED,    emoji: "👋", lines: ["{from} ošamario/la {to}! ŠLJAP! 💢", "{from} dao/dala šamar prve klase! 😤", "{from} opalio/la {to} jako! 😱"] },
  pat:      { color: C.YELLOW, emoji: "👆", lines: ["{from} tapšao/la {to}! 👆", "{from} milovao/la {to} po glavi! 😊", "{from} dao/dala {to} nježan pat-pat! 💫"] },
  poke:     { color: C.TEAL,   emoji: "👉", lines: ["{from} bockao/la {to}! Hej! 👉", "{from} dirkao/la {to}! 😂", "{from} bodnuo/la {to} u bok! 👀"] },
  bite:     { color: C.PURPLE, emoji: "🦷", lines: ["{from} ugrizao/la {to}! NOM NOM! 🦷", "{from} ugrize {to}. Zubi su oštri! 😬"] },
  cuddle:   { color: C.PINK,   emoji: "🥰", lines: ["{from} se mazio/la sa {to}! 🥰", "{from} i {to} zmazali! Preslatko! 😍"] },
  blush:    { color: C.PINK,   emoji: "😊", lines: ["{from} se zacrveni zbog {to}! 😊", "{from} ne može prestati se smiješiti s {to}! 🌸"] },
  wave:     { color: C.BLUE,   emoji: "👋", lines: ["{from} maše {to}! Zdravo! 👋", "{from} entuzijastično maše {to}! 🙌"] },
  highfive: { color: C.GREEN,  emoji: "🙌", lines: ["{from} dao/dala high five sa {to}! 🙌", "{from} i {to} — savršen high five! 🤜🤛"] },
  feed:     { color: C.TEAL,   emoji: "🍕", lines: ["{from} hrani {to}! Aaa, otvori usta! 🍕", "{from} donio/la {to} nešto ukusno! 🍱"] },
  stare:    { color: C.DARK,   emoji: "👀", lines: ["{from} buljio/la u {to}... 👀", "{from} ne može skinuti pogled s {to}! 👁️"] },
  cry:      { color: C.BLUE,   emoji: "😭",
    solo:  ["{from} plače... 😭", "{from} je u suzama! 💧"],
    lines: ["{from} plače pred {to}! Utješi ih! 😭"] },
  dance:    { color: C.PURPLE, emoji: "💃",
    solo:  ["{from} pleše sam/a! 🕺", "{from} udario/la u ples! 💃"],
    lines: ["{from} i {to} plešu zajedno! 🎶"] },
  smile:    { color: C.GOLD,   emoji: "😊", lines: ["{from} se nasmiješio/la na {to}! ☀️", "{from} se topi od osmijeha prema {to}! 🌸"] },
  lick:     { color: C.TEAL,   emoji: "👅", lines: ["{from} polizao/la {to}! Šta?? 😂", "{from} liže {to}! 😜"] },
  wink:     { color: C.GOLD,   emoji: "😉",
    solo:  ["{from} namiguje! 😉"],
    lines: ["{from} namiguje {to}! 😉 Hm..."] },
  nod:      { color: C.GREEN,  emoji: "😌",
    solo:  ["{from} klimne glavom! 😌"],
    lines: ["{from} klimne {to} — odobrava! 👍"] },
  sleep:    { color: C.DARK,   emoji: "😴",
    solo:  ["{from} zaspao/la! 😴 Zzz..."],
    lines: ["{from} zaspi pored {to}! 💤"] },
  laugh:    { color: C.YELLOW, emoji: "😂",
    solo:  ["{from} se smije na glas! 😂"],
    lines: ["{from} se smije zbog {to}! 😂"] },
  shrug:    { color: C.BLUE,   emoji: "🤷",
    solo:  ["{from} slegne ramenima! 🤷"],
    lines: ["{from} slegne ramenima prema {to}! 🤷"] },
};

const MARRIAGES = new Map();
const ROASTS = [
  "je poslan/a na Mars bez povratne karte 🚀", "je bačen/a u crnu rupu ✨",
  "je izbačen/a iz galaksije 🌌",               "je teleportovan/a na Antarktik 🧊",
  "je zamijenjen/a AI botom 🤖",                "je pretvoren/a u meme 😂",
  "je poslan/a na vojnu vježbu 🪖",             "je nestao/la u tunelu 🚇"
];

function shipPct(a, b) { const s = [...`${a}${b}`].reduce((x,c) => x+c.charCodeAt(0), 0); return ((s*7+13)%101+100)%101; }
function lovePct(a, b) { const s = [...`${a}love${b}`].reduce((x,c) => x+c.charCodeAt(0), 0); return ((s*11+37)%101+100)%101; }
function heartBar(p)   { const f = Math.round(p/10); return "❤️".repeat(f)+"🖤".repeat(10-f); }
function shipLabel(p)  {
  if (p>=90) return "💍 Savršen par!"; if (p>=75) return "💕 Jako dobro!";
  if (p>=60) return "😊 Solidno!";     if (p>=40) return "🤔 Možda...";
  return "💔 Nema šanse!";
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WORDLE
// ═══════════════════════════════════════════════════════════════════════════════
const WORDS = [
  "ABOUT","ABOVE","ACUTE","ADMIT","ADOPT","ADULT","AFTER","AGAIN","AGENT","AGREE",
  "AHEAD","ALARM","ALBUM","ALERT","ALIKE","ALIVE","ALLOW","ALONE","ALONG","ANGEL",
  "ANGER","ANKLE","APPLY","ARENA","ARGUE","ARISE","ASIDE","ASSET","AUDIT","AVOID",
  "AWAKE","AWARD","AWARE","BAKER","BEACH","BEGAN","BEGIN","BELOW","BENCH","BERRY",
  "BLADE","BLAME","BLANK","BLAST","BLAZE","BLEED","BLIND","BLOCK","BLOOD","BLOOM",
  "BLUNT","BOARD","BONUS","BOOST","BOUND","BRACE","BRAIN","BRAND","BRAVE","BREAD",
  "BREAK","BREED","BRICK","BRIDE","BRIEF","BRING","BROAD","BUILD","BUILT","BURST",
  "BUYER","CABIN","CANDY","CARRY","CATCH","CAUSE","CHAIN","CHAIR","CHAOS","CHASE",
  "CHEAP","CHEAT","CHECK","CHESS","CHEST","CHILD","CHINA","CHIPS","CHOSE","CHUNK",
  "CLAIM","CLASH","CLASS","CLEAN","CLEAR","CLICK","CLIFF","CLIMB","CLOSE","CLOUD",
  "COACH","COAST","COUNT","COURT","COVER","CRACK","CRAFT","CRANE","CRASH","CRAWL",
  "CREAM","CREEK","CRIME","CROSS","CROWD","CROWN","CRUEL","CRUSH","CURVE","CYCLE",
  "DAILY","DANCE","DEATH","DELAY","DEPTH","DIRTY","DOUBT","DRAFT","DRAIN","DRAMA",
  "DRAWN","DREAM","DRESS","DRIFT","DRINK","DRIVE","DROVE","DYING","EAGER","EAGLE",
  "EARLY","EARTH","EIGHT","ELITE","EMPTY","ENEMY","ENJOY","ENTER","EQUAL","ERROR",
  "EVENT","EVERY","EXACT","EXTRA","FAITH","FALSE","FANCY","FAULT","FEAST","FENCE",
  "FEVER","FIELD","FIFTH","FIFTY","FIGHT","FINAL","FIRST","FIXED","FLAME","FLASH",
  "FLEET","FLESH","FLOAT","FLOOD","FLOOR","FLOUR","FOCUS","FORCE","FORGE","FORUM",
  "FOUND","FRAME","FRANK","FRAUD","FRESH","FRONT","FROST","FULLY","FUNNY","GHOST",
  "GIANT","GIVEN","GLASS","GLOBE","GLORY","GLOVE","GRACE","GRADE","GRAIN","GRAND",
  "GRANT","GRASP","GRASS","GRAVE","GREAT","GREEN","GREET","GRIEF","GRILL","GROSS",
  "GROUP","GROWN","GUARD","GUESS","GUEST","GUIDE","GUILD","GUILT","HAPPY","HARSH",
  "HEART","HEAVY","HERBS","HONOR","HORSE","HOTEL","HOUSE","HUMAN","HUMOR","HURRY",
  "IMAGE","INDEX","INNER","ISSUE","JUDGE","JUICE","JUICY","KNIFE","KNOCK","KNOWN",
  "LABEL","LARGE","LASER","LATER","LAYER","LEARN","LEASE","LEAVE","LEGAL","LEVEL",
  "LIGHT","LIMIT","LOCAL","LOGIC","LOOSE","LOVER","LOWER","LUCKY","MAGIC","MAJOR",
  "MAKER","MARCH","MATCH","MEDIA","MERCY","MERIT","METAL","MIGHT","MINOR","MODEL",
  "MONEY","MONTH","MORAL","MOUNT","MOUSE","MOUTH","MUSIC","NERVE","NEVER","NIGHT",
  "NOBLE","NOISE","NORTH","NOVEL","NURSE","OCCUR","OCEAN","OFFER","OFTEN","ORDER",
  "ORGAN","OUTER","OWNER","PAINT","PANEL","PANIC","PAPER","PARTY","PASTA","PATCH",
  "PAUSE","PEACE","PENNY","PHASE","PHONE","PHOTO","PIECE","PILOT","PIXEL","PIZZA",
  "PLACE","PLAIN","PLANE","PLANT","PLATE","PLAZA","POINT","POKER","POWER","PRESS",
  "PRICE","PRIDE","PRIME","PRINT","PRIOR","PRIZE","PROBE","PROVE","PUNCH","QUERY",
  "QUEST","QUICK","QUIET","QUOTA","QUOTE","RADAR","RADIO","RAISE","RALLY","RANGE",
  "RAPID","REACH","READY","REALM","REBEL","REFER","RELAX","REPLY","RESET","RIDER",
  "RIDGE","RIGHT","RISKY","RIVAL","RIVER","ROBOT","ROUGH","ROUND","ROUTE","ROYAL",
  "RULER","SADLY","SAINT","SALAD","SAUCE","SCALE","SCENE","SCOPE","SCORE","SCOUT",
  "SENSE","SEVEN","SHADE","SHAKE","SHALL","SHAME","SHAPE","SHARE","SHARK","SHARP",
  "SHEEP","SHELF","SHELL","SHIFT","SHINE","SHIRT","SHOCK","SHOOT","SHORT","SHOUT",
  "SIGHT","SINCE","SIXTH","SIXTY","SKILL","SLASH","SLEEP","SLIDE","SLOPE","SMART",
  "SMELL","SMILE","SMOKE","SOLID","SOLVE","SORRY","SOUND","SOUTH","SPACE","SPARE",
  "SPEAK","SPEND","SPITE","SPLIT","SPORT","STACK","STAGE","STAMP","STAND","START",
  "STATE","STEAM","STEEL","STICK","STILL","STOCK","STONE","STORM","STORY","STRAW",
  "STUDY","STYLE","SUGAR","SUPER","SWEAR","SWEET","SWIFT","SWING","TABLE","TASTE",
  "TEACH","TEETH","TENSE","THEIR","THEME","THESE","THICK","THING","THINK","THIRD",
  "THREE","TIGER","TIMER","TIRED","TITLE","TODAY","TOKEN","TOPIC","TOTAL","TOUCH",
  "TOUGH","TOWER","TOXIC","TRACK","TRADE","TRAIL","TRAIN","TRASH","TREAT","TREND",
  "TRIAL","TRICK","TRULY","TRUST","TRUTH","TWICE","TWIST","ULTRA","UNDER","UNION",
  "UNTIL","UPPER","UPSET","URBAN","VALID","VALUE","VENUE","VERSE","VIDEO","VIRAL",
  "VISIT","VOCAL","VOICE","WASTE","WATCH","WATER","WEIGH","WEIRD","WHEAT","WHERE",
  "WHICH","WHILE","WHITE","WHOLE","WHOSE","WORLD","WORSE","WORTH","WOULD","WRITE",
  "WRONG","YACHT","YIELD","YOUNG","YOUTH","ZEBRA"
];
const wordleChannels = new Map();
const wordleGames    = new Map();

function buildWordleBoard(game) {
  const { word, guesses, maxGuesses } = game;
  let board = "";
  for (let i = 0; i < maxGuesses; i++) {
    if (i < guesses.length) {
      const guess = guesses[i], remaining = word.split(""), result = Array(5).fill("⬛");
      for (let j = 0; j < 5; j++) { if (guess[j]===word[j]) { result[j]="🟩"; remaining[j]=null; } }
      for (let j = 0; j < 5; j++) { if (result[j]!=="🟩") { const idx=remaining.indexOf(guess[j]); if (idx!==-1){result[j]="🟨";remaining[idx]=null;} } }
      board += result.join("") + "  `" + guess + "`\n";
    } else { board += "⬜⬜⬜⬜⬜\n"; }
  }
  return board;
}

function wordleEmbed(game, extra = "") {
  const { guesses, word, maxGuesses } = game;
  const won = guesses.length>0 && guesses[guesses.length-1]===word;
  const lost = !won && guesses.length>=maxGuesses;
  let desc = buildWordleBoard(game);
  if (extra) desc += `\n${extra}`;
  if (lost)  desc += `\n\n> Tačna riječ: **${word}**`;
  return new EmbedBuilder()
    .setColor(won ? C.GREEN : lost ? C.RED : C.BLUE)
    .setTitle(won ? "🎉 WORDLE — Pobjeda!" : lost ? "💀 WORDLE — Game Over" : "🟩 WORDLE")
    .setDescription(desc)
    .addFields({ name: "Pokušaji", value: `${guesses.length}/${maxGuesses}`, inline: true }, { name: "Legenda", value: "🟩 Tačno  🟨 Krivi položaj  ⬛ Nema", inline: false })
    .setTimestamp().setFooter({ text: "🟩 Wordle • GIANNI Bot" });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WARN SYSTEM (1h cooldown)
// ═══════════════════════════════════════════════════════════════════════════════
const warningStore  = new Map(); // `${guildId}:${userId}` -> [{ reason, by, date }]
const warnCooldowns = new Map(); // `${guildId}:${userId}` -> timestamp

function checkWarnCooldown(guildId, targetId) {
  const key = `${guildId}:${targetId}`;
  const last = warnCooldowns.get(key);
  if (!last) return null;
  const diff = Date.now() - last;
  const hour = 60 * 60 * 1000;
  if (diff < hour) return Math.ceil((hour - diff) / 60000); // returns minutes remaining
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GIVEAWAY
// ═══════════════════════════════════════════════════════════════════════════════
const activeGiveaways = new Map();
async function pickGwWinners(msg, count) {
  try {
    const reaction = msg.reactions.cache.get("🎉");
    if (!reaction) return [];
    const users = await reaction.users.fetch();
    return users.filter(u => !u.bot).map(u => u.id).sort(() => Math.random()-0.5).slice(0, count);
  } catch { return []; }
}
async function endGiveaway(g, channel) {
  g.ended = true;
  let msg; try { msg = await channel.messages.fetch(g.messageId); } catch { return; }
  const wins  = await pickGwWinners(msg, g.winners);
  const wText = wins.length>0 ? wins.map(w=>`<@${w}>`).join(", ") : "Nema pobjednika";
  await msg.edit({ embeds: [new EmbedBuilder().setColor(C.GOLD).setTitle("🏆 GIVEAWAY ZAVRŠEN 🏆")
    .setDescription(`## ${g.prize}\n\n🎉 **Pobjednik(ci):** ${wText}\n\n*Čestitamo!*`)
    .setTimestamp().setFooter({ text: "🎁 GIANNI Bot • Giveaway" })] });
  channel.send({ content: `🏆 **GW ZAVRŠEN** — ${g.prize}\n${wins.length>0?`🎉 Pobjednici: ${wText}`:"Nema pobjednika."}`, reply: { messageReference: g.messageId } }).catch(()=>{});
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DOT-COMMAND HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
async function handleDotCommand(msg, client) {
  if (!msg.content.startsWith(PREFIX)) return false;
  const raw  = msg.content.slice(PREFIX.length).trim();
  const args = raw.split(/\s+/);
  const cmd  = args[0]?.toLowerCase();
  if (!cmd) return false;

  try {

    // ── .nsfw (set/remove/status) ─────────────────────────────────────────────
    if (cmd === "nsfw") {
      if (!msg.guild) { await msg.reply({ embeds: [mkErr("Greška","Samo na serverima.")] }); return true; }
      const sub = args[1]?.toLowerCase();
      if (sub === "set") {
        if (!await requireMod(msg)) return true;
        const ch = msg.mentions.channels.first();
        if (!ch) { await msg.reply("`Koristi: .nsfw set #kanal`"); return true; }
        NSFW_CHANNELS.set(msg.guild.id, ch.id);
        await msg.reply({ embeds: [mkOk("🔞 NSFW kanal postavljen!", `NSFW komande sada rade **samo** u <#${ch.id}>.\nKoristi \`.nsfw remove\` da ukloniš ograničenje.`)] });
      } else if (sub === "remove" || sub === "off") {
        if (!await requireMod(msg)) return true;
        NSFW_CHANNELS.delete(msg.guild.id);
        await msg.reply({ embeds: [mkOk("✅ Ograničenje uklonjeno", "NSFW komande sada rade u **svim** kanalima.")] });
      } else if (sub === "status") {
        const setId = NSFW_CHANNELS.get(msg.guild.id);
        await msg.reply({ embeds: [mkInfo("🔞 NSFW Status", setId ? `Postavljeni kanal: <#${setId}>` : "Nema ograničenja — NSFW radi u svim kanalima.")] });
      } else {
        await msg.reply({ embeds: [new EmbedBuilder().setColor(C.PURPLE).setTitle("🔞 NSFW Sistem")
          .addFields(
            { name: "`.nsfw set #kanal`",  value: "Postavi u koji kanal smiju NSFW komande", inline: false },
            { name: "`.nsfw remove`",       value: "Ukloni ograničenje — NSFW radi svuda",    inline: false },
            { name: "`.nsfw status`",       value: "Provjeri koji je kanal postavljen",        inline: false }
          ).setTimestamp().setFooter({ text: FOOTER })] });
      }
      return true;
    }

    // ── .help ────────────────────────────────────────────────────────────────
    if (cmd === "help" || cmd === "komande") {
      const e = new EmbedBuilder().setColor(C.PURPLE).setTitle("📋 GIANNI Bot v2 — Sve komande")
        .addFields(
          { name: "🛡️ Zaštita (auto)",   value: "Anti-Raid • Anti-Invite (uvijek aktivno)", inline: false },
          { name: "🔞 NSFW kanal (mod)",  value: "`.nsfw set #kanal` `.nsfw remove` `.nsfw status`", inline: false },
          { name: "📡 Utility",           value: "`.ping` `.botinfo` `.avatar [@k]` `.banner [@k]` `.poll <pitanje>`", inline: false },
          { name: "📅 Server",            value: "`.events` `.serverinfo` `.userinfo [@k]` `.gws create|end|reroll`", inline: false },
          { name: "📨 DM (owner)",        value: "`.dmaktive <poruka>`", inline: false },
          { name: "🟩 Wordle",            value: "`.wordle set <#kanal>` `.wordle start` `.wordle stop`", inline: false },
          { name: "💘 Zabava",            value: "`.tinder [@k]` `.8ball <pitan.>` `.coinflip` `.roll [N]` `.rps r/p/s`\n`.rate @k` `.iq @k` `.pp @k` `.simp @k` `.hack @k` `.roastme`", inline: false },
          { name: "⚠️ Mod (mod+)",        value: "`.warn @k <razlog>` `.warnings @k` `.clearwarn @k`\n`.kick @k` `.ban @k` `.timeout @k <min>` `.purge <N>` `.lock` `.unlock` `.slowmode <s>`", inline: false },
          { name: "💕 Love/SFW",          value: "`.ship @a @b` `.love @k` `.marry @k` `.divorce` `.partner`\n`.hug` `.kiss` `.pat` `.cuddle` `.blush` `.smile` `.feed` `.wave`\n`.slap` `.poke` `.bite` `.lick` `.stare` `.highfive` `.dance`\n`.cry` `.wink` `.nod` `.sleep` `.laugh` `.shrug` `.fuck` (roast)", inline: false },
          { name: "🔞 NSFW (svi kanali)", value: "`.fucknsfw @k` `.daddy @k` `.mommy @k` `.sex @k [poza]`\n`.blowjob @k` `.anal @k` `.cum @k` `.pussylick @k` `.handjob @k`\n`.solo [@k]` `.strip [@k]` `.creampie @k` `.fingering @k` `.nudes [@k]`\n`.threesome @k @k` `.yaoi @k` `.yuri @k`", inline: false }
        ).setTimestamp().setFooter({ text: FOOTER });
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .events ──────────────────────────────────────────────────────────────
    if (cmd === "events") {
      if (!msg.guild) { await msg.reply({ embeds: [mkErr("Greška","Samo na serverima.")] }); return true; }
      const evs = (await msg.guild.scheduledEvents.fetch())
        .filter(e => e.status === GuildScheduledEventStatus.Scheduled || e.status === GuildScheduledEventStatus.Active)
        .map(e => ({ name: e.name, startTime: e.scheduledStartAt ?? new Date(), location: e.entityMetadata?.location ?? (e.channel ? `#${e.channel.name}` : "Discord"), userCount: e.userCount }))
        .sort((a,b) => a.startTime - b.startTime);
      if (!evs.length) { await msg.reply({ embeds: [mkInfo("Nema događaja","Nema zakazanih događaja.")] }); return true; }
      const embed = new EmbedBuilder().setColor(C.BLUE).setTitle(`📅 Predstojeći događaji — ${msg.guild.name}`)
        .setDescription(evs.slice(0,8).map(e => `> 🎪 **${e.name}**\n> 🗓️ <t:${Math.floor(e.startTime.getTime()/1000)}:F> • 📍 ${e.location}${e.userCount != null ? ` • 👥 ${e.userCount}` : ""}`).join("\n\n"))
        .setTimestamp().setFooter({ text: FOOTER });
      await msg.reply({ embeds: [embed] });
      return true;
    }

    // ── .serverinfo ──────────────────────────────────────────────────────────
    if (cmd === "serverinfo") {
      if (!msg.guild) { await msg.reply({ embeds: [mkErr("Greška","Samo na serverima.")] }); return true; }
      const g = await msg.guild.fetch();
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.GOLD).setTitle(`🏰 ${g.name}`)
        .setThumbnail(g.iconURL({ size: 256 }) ?? null)
        .addFields(
          { name: "👑 Vlasnik",        value: `<@${g.ownerId}>`,                             inline: true },
          { name: "👥 Članovi",        value: `${g.memberCount}`,                            inline: true },
          { name: "📅 Kreiran",        value: `<t:${Math.floor(g.createdTimestamp/1000)}:D>`, inline: true },
          { name: "💬 Kanali",         value: `${g.channels.cache.size}`,                    inline: true },
          { name: "🎭 Uloge",          value: `${g.roles.cache.size}`,                       inline: true },
          { name: "🆔 ID",             value: `\`${g.id}\``,                                 inline: true }
        ).setImage(g.bannerURL({ size: 1024 }) ?? null).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .userinfo ────────────────────────────────────────────────────────────
    if (cmd === "userinfo") {
      const target = msg.mentions.members?.first() ?? msg.member;
      const user   = target instanceof GuildMember ? target.user : msg.author;
      const member = target instanceof GuildMember ? target : msg.member;
      const roles  = member?.roles.cache.filter(r=>r.id!==msg.guild?.id).sort((a,b)=>b.position-a.position).map(r=>`${r}`).slice(0,8).join(" ") || "Nema";
      await msg.reply({ embeds: [new EmbedBuilder().setColor(member?.displayColor || C.BLUE).setTitle(`👤 ${user.globalName ?? user.username}`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "🏷️ Tag",           value: `\`${user.tag}\``,                                 inline: true },
          { name: "🆔 ID",            value: `\`${user.id}\``,                                  inline: true },
          { name: "🤖 Bot",           value: user.bot ? "Da" : "Ne",                            inline: true },
          { name: "📅 Na Discordu od",value: `<t:${Math.floor(user.createdTimestamp/1000)}:D>`,  inline: true },
          ...(member?.joinedTimestamp ? [{ name: "📥 Pridružen",  value: `<t:${Math.floor(member.joinedTimestamp/1000)}:D>`, inline: true }] : []),
          { name: "🎭 Uloge", value: roles, inline: false }
        ).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .gws ─────────────────────────────────────────────────────────────────
    if (cmd === "gws") {
      const sub = args[1]?.toLowerCase();
      if (!msg.guild || msg.channel.type !== ChannelType.GuildText) return true;

      if (sub === "create") {
        const rest = args.slice(2).join(" "); // prize mins [winners]
        const parts = rest.trim().split(/\s+/);
        const mins  = parseInt(parts[parts.length-1]);
        if (isNaN(mins)) { await msg.reply({ embeds: [mkErr("Greška","`.gws create <nagrada> <minute>`")] }); return true; }
        const prize   = parts.slice(0,-1).join(" ") || "Nagrada";
        const winners = 1;
        const endTime = new Date(Date.now() + mins*60_000);
        const ts = Math.floor(endTime.getTime()/1000);
        const gEmbed = new EmbedBuilder().setColor(C.PINK).setTitle("🎉 GIVEAWAY 🎉")
          .setDescription(`## ${prize}\n\n> Reaguj sa 🎉 da učestvuješ!\n\n⏰ **Završava se:** <t:${ts}:R>\n🏆 **Pobjednika:** ${winners}\n🎊 **Organizuje:** ${msg.author}`)
          .setTimestamp(endTime).setFooter({ text: "🎁 Završava se" });
        const gMsg = await msg.channel.send({ embeds: [gEmbed] });
        await gMsg.react("🎉");
        const g = { messageId: gMsg.id, channelId: gMsg.channelId, guildId: msg.guild.id, prize, winners, endTime, ended: false };
        activeGiveaways.set(gMsg.id, g);
        setTimeout(async () => { const curr = activeGiveaways.get(gMsg.id); if (!curr||curr.ended) return; await endGiveaway(curr, msg.channel); }, mins*60_000);
        await msg.reply({ embeds: [mkOk("Giveaway pokrenut!", `Giveaway za **${prize}** je počeo! ID: \`${gMsg.id}\``)] });
        return true;
      }
      if (sub === "end") {
        const mid = args[2];
        if (!mid) { await msg.reply({ embeds: [mkErr("Greška","`.gws end <message_id>`")] }); return true; }
        const g = activeGiveaways.get(mid);
        if (!g||g.ended) { await msg.reply({ embeds: [mkErr("Nije pronađen","Giveaway ne postoji ili je završen.")] }); return true; }
        await endGiveaway(g, msg.channel);
        return true;
      }
      if (sub === "reroll") {
        const mid = args[2];
        if (!mid) { await msg.reply({ embeds: [mkErr("Greška","`.gws reroll <message_id>`")] }); return true; }
        const g = activeGiveaways.get(mid);
        if (!g) { await msg.reply({ embeds: [mkErr("Nije pronađen","Giveaway ne postoji.")] }); return true; }
        try {
          const gMsg  = await msg.channel.messages.fetch(mid);
          const wins  = await pickGwWinners(gMsg, g.winners);
          const wText = wins.length>0 ? wins.map(w=>`<@${w}>`).join(", ") : "Nema pobjednika";
          await msg.channel.send({ embeds: [mkOk("🔄 Reroll",`**${g.prize}** — Novi pobjednici: ${wText}`)] });
        } catch { await msg.reply({ embeds: [mkErr("Greška","Nije moguće učitati poruku.")] }); }
        return true;
      }
      await msg.reply({ embeds: [mkInfo("GWS komande","`.gws create <nagrada> <minute>` `.gws end <id>` `.gws reroll <id>`")] });
      return true;
    }

    // ── .dmaktive ────────────────────────────────────────────────────────────
    if (cmd === "dmaktive" || cmd === "dm-aktive") {
      if (!await requireOwner(msg)) return true;
      if (!msg.guild) return true;
      const poruka = args.slice(1).join(" ");
      if (!poruka) { await msg.reply({ embeds: [mkErr("Greška","`.dmaktive <poruka>`")] }); return true; }
      const reply = await msg.reply({ embeds: [mkInfo("DM-Aktive", "Šaljem poruke svim članovima... ⏳")] });
      const members = await msg.guild.members.fetch();
      const targets = members.filter(m => !m.user.bot);
      let sent = 0, failed = 0;
      const dmEmbed = new EmbedBuilder().setColor(C.BLUE).setTitle(`📨 Poruka od **${msg.guild.name}**`)
        .setDescription(poruka).setThumbnail(msg.guild.iconURL() ?? null)
        .setTimestamp().setFooter({ text: `📨 ${msg.guild.name} • GIANNI Bot` });
      for (const [, member] of targets) {
        try { await member.user.send({ embeds: [dmEmbed] }); sent++; } catch { failed++; }
        await new Promise(r => setTimeout(r, 500));
      }
      await reply.edit({ embeds: [mkOk("DM-Aktive završen",`✅ Poslano: **${sent}**\n❌ Neuspješno: **${failed}**\n📨 Ukupno: **${targets.size}**`)] });
      return true;
    }

    // ── .wordle ──────────────────────────────────────────────────────────────
    if (cmd === "wordle") {
      const sub = args[1]?.toLowerCase();
      if (!msg.guild) return true;
      if (sub === "set") {
        const ch = msg.mentions.channels.first();
        if (!ch) { await msg.reply({ embeds: [mkErr("Greška","`.wordle set #kanal`")] }); return true; }
        wordleChannels.set(msg.guild.id, ch.id);
        await msg.reply({ embeds: [mkOk("Wordle kanal postavljen",`🟩 Wordle se igra u ${ch}!\nPiši 5-slovna engleska slova direktno u kanal!`)] });
        return true;
      }
      if (sub === "start") {
        const chId = wordleChannels.get(msg.guild.id);
        if (!chId) { await msg.reply({ embeds: [mkWarn("Kanal nije postavljen","Koristi `.wordle set #kanal` prvo!")] }); return true; }
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        wordleGames.set(chId, { word, guesses: [], maxGuesses: 6 });
        await msg.reply({ embeds: [new EmbedBuilder().setColor(C.GREEN).setTitle("🟩 WORDLE — Nova partija!")
          .setDescription("⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n\n> Pogodi **5-slovnu englesku** riječ!\n> Ukucaj direktno u kanal!")
          .addFields({ name: "🟩 Zeleno", value: "Tačno", inline: true }, { name: "🟨 Žuto", value: "Krivi položaj", inline: true }, { name: "⬛ Crno", value: "Nema", inline: true })
          .setTimestamp().setFooter({ text: FOOTER })] });
        return true;
      }
      if (sub === "stop") {
        const chId = wordleChannels.get(msg.guild.id);
        if (chId) wordleGames.delete(chId);
        await msg.reply({ embeds: [mkInfo("Wordle zaustavljen","Partija je prekinuta.")] });
        return true;
      }
      await msg.reply({ embeds: [mkInfo("Wordle","`.wordle set #kanal` `.wordle start` `.wordle stop`")] });
      return true;
    }

    // ── .tinder ──────────────────────────────────────────────────────────────
    if (cmd === "tinder") {
      const target = msg.mentions.users.first() ?? msg.author;
      const pct    = lovePct(msg.author.id, target.id);
      const isMatch = pct >= 50;

      let gif = null;
      if (isMatch) {
        gif = await fetchNsfwGif(pick(["blowjob", "pussylick", "fuck", "yuri"]));
      } else {
        gif = await fetchNsfwGif(pick(["cum", "solo", "anal"]));
      }

      const embed = new EmbedBuilder()
        .setColor(isMatch ? C.GREEN : C.RED)
        .setTitle(isMatch ? "💚 IT'S A MATCH!" : "💔 NO MATCH")
        .setDescription(
          isMatch
            ? `### ${msg.author.displayName} 💚 ${target.displayName}\n\n> Tinder kaže: **MATCH!** 🎉\n> Kompatibilnost: **${pct}%**\n> Čestitamo! Swipe right! 💘`
            : `### ${msg.author.displayName} 💔 ${target.displayName}\n\n> Tinder kaže: **NO MATCH** 😬\n> Kompatibilnost: **${pct}%**\n> Swipe left! Nastavi tražiti! 💀`
        )
        .setThumbnail(isMatch ? target.displayAvatarURL() : msg.author.displayAvatarURL())
        .setTimestamp().setFooter({ text: "💘 Tinder • GIANNI Bot" });
      if (gif) embed.setImage(gif);
      await msg.reply({ embeds: [embed] });
      return true;
    }

    // ── .warn ────────────────────────────────────────────────────────────────
    if (cmd === "warn") {
      if (!await requireMod(msg)) return true;
      const target = msg.mentions.members?.first();
      const reason = args.slice(2).join(" ");
      if (!target || !reason) { await msg.reply({ embeds: [mkErr("Greška","`.warn @korisnik <razlog>`")] }); return true; }
      const cooldownMins = checkWarnCooldown(msg.guild?.id, target.id);
      if (cooldownMins !== null) {
        await msg.reply({ embeds: [mkWarn("Cooldown aktiviran",`Ovaj korisnik je već upozoren. Možeš opet za **${cooldownMins} min**! ⏰`)] });
        return true;
      }
      const key = `${msg.guild?.id}:${target.id}`;
      const list = warningStore.get(key) ?? [];
      list.push({ reason, by: msg.author.id, date: new Date().toISOString() });
      warningStore.set(key, list);
      warnCooldowns.set(key, Date.now());
      const embed = new EmbedBuilder().setColor(C.YELLOW).setTitle("⚠️ Upozorenje")
        .setThumbnail(target.user.displayAvatarURL())
        .addFields(
          { name: "👤 Korisnik",     value: `${target}`,     inline: true },
          { name: "👮 Moderator",    value: `${msg.author}`, inline: true },
          { name: "📝 Razlog",       value: reason,          inline: false },
          { name: "📊 Ukupno upoz.", value: `**${list.length}**`, inline: true },
          { name: "⏰ Sljedeće warn", value: "za 1 sat",          inline: true }
        ).setTimestamp().setFooter({ text: FOOTER });
      await msg.channel.send({ embeds: [embed] });
      target.user.send({ embeds: [new EmbedBuilder().setColor(C.YELLOW).setTitle(`⚠️ Upozorenje — ${msg.guild?.name}`)
        .setDescription(`**Razlog:** ${reason}\n**Moderator:** ${msg.author.globalName ?? msg.author.username}\n*Ukupno: **${list.length}***`)
        .setTimestamp().setFooter({ text: FOOTER })] }).catch(()=>{});
      return true;
    }

    // ── .warnings ────────────────────────────────────────────────────────────
    if (cmd === "warnings") {
      if (!await requireMod(msg)) return true;
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply({ embeds: [mkErr("Greška","`.warnings @korisnik`")] }); return true; }
      const list = warningStore.get(`${msg.guild?.id}:${target.id}`) ?? [];
      if (!list.length) { await msg.reply({ embeds: [mkInfo("Nema upozorenja",`**${target.displayName}** nema upozorenja.`)] }); return true; }
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.YELLOW).setTitle(`⚠️ Upozorenja — ${target.displayName}`)
        .setThumbnail(target.displayAvatarURL())
        .setDescription(list.map((w,n) => `**${n+1}.** ${w.reason}\n> <@${w.by}> • <t:${Math.floor(new Date(w.date).getTime()/1000)}:R>`).join("\n\n"))
        .setFooter({ text: `Ukupno: ${list.length} • GIANNI Bot` }).setTimestamp()] });
      return true;
    }

    // ── .clearwarn ───────────────────────────────────────────────────────────
    if (cmd === "clearwarn") {
      if (!isOwner(msg.author.id) && !isAdmin(msg.member)) {
        await msg.reply({ embeds: [mkErr("Zabranjen pristup","Samo admini mogu brisati upozorenja.")] }); return true;
      }
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply({ embeds: [mkErr("Greška","`.clearwarn @korisnik`")] }); return true; }
      warningStore.delete(`${msg.guild?.id}:${target.id}`);
      await msg.reply({ embeds: [mkOk("Obrisano",`Sva upozorenja za **${target.displayName}** su obrisana.`)] });
      return true;
    }

    // ── .ship ─────────────────────────────────────────────────────────────────
    if (cmd === "ship") {
      const users = msg.mentions.users;
      const [u1, u2] = users.size>=2 ? [...users.values()] : [msg.author, users.first()];
      if (!u1||!u2) { await msg.reply("`Koristi: .ship @a @b`"); return true; }
      const p = shipPct(u1.id, u2.id);
      const name = (u1.globalName??u1.username).slice(0,3)+(u2.globalName??u2.username).slice(-3);
      await msg.channel.send({ embeds: [new EmbedBuilder().setColor(C.PINK).setTitle(`💘 Ship: ${name}`)
        .setDescription(`**${u1.displayName}** 💕 **${u2.displayName}**\n\n${heartBar(p)}\n\n**${p}%** kompatibilnosti\n*${shipLabel(p)}*`)
        .setThumbnail(u1.displayAvatarURL()).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .love ─────────────────────────────────────────────────────────────────
    if (cmd === "love") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .love @korisnik`"); return true; }
      const p = lovePct(msg.author.id, target.id);
      await msg.channel.send({ embeds: [new EmbedBuilder().setColor(C.PINK).setTitle("❤️ Love Metar")
        .setDescription(`**${msg.author.displayName}** ❤️ **${target.displayName}**\n\n${heartBar(p)}\n\n**${p}%** ljubavi`)
        .setThumbnail(target.displayAvatarURL()).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .marry ────────────────────────────────────────────────────────────────
    if (cmd === "marry") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .marry @korisnik`"); return true; }
      if (target.id===msg.author.id) { await msg.reply("❌ Ne možeš se vjenčati sam/a!"); return true; }
      if (MARRIAGES.get(msg.author.id)) { await msg.reply("❌ Već si u braku! Koristi `.divorce`"); return true; }
      if (MARRIAGES.get(target.id)) { await msg.reply(`❌ **${target.displayName}** je već u braku!`); return true; }
      MARRIAGES.set(msg.author.id, target.id); MARRIAGES.set(target.id, msg.author.id);
      const gif = await fetchNsfwGif(pick(["blowjob","pussylick","fuck","yuri"]));
      const e = new EmbedBuilder().setColor(C.GOLD).setTitle("💍 Vjenčanje!")
        .setDescription(`🎊 **${msg.author.displayName}** i **${target.displayName}** su sada **u braku**!\n\n> Čestitamo! 💒\n*Koristi \`.divorce\` za razvod.*`)
        .setThumbnail(target.displayAvatarURL()).setTimestamp().setFooter({ text: FOOTER });
      if (gif) e.setImage(gif);
      await msg.channel.send({ embeds: [e] });
      return true;
    }

    // ── .divorce ──────────────────────────────────────────────────────────────
    if (cmd === "divorce") {
      const pid = MARRIAGES.get(msg.author.id);
      if (!pid) { await msg.reply("❌ Nisi u braku!"); return true; }
      MARRIAGES.delete(msg.author.id); MARRIAGES.delete(pid);
      await msg.channel.send({ embeds: [mkErr("💔 Razvod", `**${msg.author.displayName}** je zatražio/la razvod. Brak je završen. 🕊️`)] });
      return true;
    }

    // ── .partner ──────────────────────────────────────────────────────────────
    if (cmd === "partner") {
      const target = msg.mentions.users.first() ?? msg.author;
      const pid = MARRIAGES.get(target.id);
      if (!pid) { await msg.channel.send({ embeds: [mkInfo("Bračni status", `**${target.displayName}** nije u braku.`)] }); return true; }
      try {
        const partner = await client.users.fetch(pid);
        await msg.reply({ embeds: [new EmbedBuilder().setColor(C.GOLD).setTitle("💍 Bračni status")
          .setDescription(`**${target.displayName}** je u braku sa **${partner.displayName}**! 💒`)
          .setThumbnail(partner.displayAvatarURL()).setTimestamp().setFooter({ text: FOOTER })] });
      } catch { await msg.reply("❌ Greška."); }
      return true;
    }

    // ── .ping ─────────────────────────────────────────────────────────────────
    if (cmd === "ping") {
      const sent = await msg.reply({ embeds: [mkInfo("🏓 Pong!", "Računam latenciju...")] });
      const lat = sent.createdTimestamp - msg.createdTimestamp;
      await sent.edit({ embeds: [new EmbedBuilder().setColor(C.GREEN).setTitle("🏓 Pong!")
        .addFields(
          { name: "📡 Bot latencija", value: `\`${lat}ms\``, inline: true },
          { name: "💓 API latencija", value: `\`${Math.round(client.ws.ping)}ms\``, inline: true }
        ).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .botinfo ──────────────────────────────────────────────────────────────
    if (cmd === "botinfo") {
      const uptime = process.uptime();
      const h = Math.floor(uptime/3600), m = Math.floor((uptime%3600)/60), s = Math.floor(uptime%60);
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.PURPLE).setTitle("🤖 GIANNI Bot — Info")
        .setThumbnail(client.user.displayAvatarURL())
        .addFields(
          { name: "📛 Ime",        value: client.user.tag,                          inline: true },
          { name: "🆔 ID",         value: `\`${client.user.id}\``,                  inline: true },
          { name: "⏰ Uptime",     value: `${h}h ${m}m ${s}s`,                      inline: true },
          { name: "🌐 Serveri",    value: `${client.guilds.cache.size}`,             inline: true },
          { name: "👥 Korisnici",  value: `${client.users.cache.size}`,              inline: true },
          { name: "📡 Ping",       value: `\`${Math.round(client.ws.ping)}ms\``,    inline: true },
          { name: "💎 Verzija",    value: "v2 — GIANNI Edition",                    inline: true },
          { name: "⚙️ Node.js",   value: process.version,                           inline: true }
        ).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .avatar ───────────────────────────────────────────────────────────────
    if (cmd === "avatar") {
      const target = msg.mentions.users.first() ?? msg.author;
      const url = target.displayAvatarURL({ size: 4096, extension: "png" });
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.BLUE).setTitle(`🖼️ Avatar — ${target.displayName}`)
        .setImage(url).setDescription(`[PNG link](${url})`)
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .banner ───────────────────────────────────────────────────────────────
    if (cmd === "banner") {
      const target = msg.mentions.users.first() ?? msg.author;
      const full = await client.users.fetch(target.id, { force: true });
      const url = full.bannerURL({ size: 4096 });
      if (!url) { await msg.reply({ embeds: [mkInfo("Nema bannera", `**${target.displayName}** nema banner.`)] }); return true; }
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.BLUE).setTitle(`🖼️ Banner — ${target.displayName}`)
        .setImage(url).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .poll ─────────────────────────────────────────────────────────────────
    if (cmd === "poll") {
      const question = args.slice(1).join(" ");
      if (!question) { await msg.reply("`Koristi: .poll <pitanje>`"); return true; }
      const poll = await msg.channel.send({ embeds: [new EmbedBuilder().setColor(C.BLUE).setTitle("📊 Glasanje")
        .setDescription(`**${question}**\n\n> 👍 Za\n> 👎 Protiv`)
        .setFooter({ text: `Glasanje pokrenuo/la ${msg.author.displayName} • ${FOOTER}` }).setTimestamp()] });
      await poll.react("👍"); await poll.react("👎");
      return true;
    }

    // ── .8ball ────────────────────────────────────────────────────────────────
    if (cmd === "8ball") {
      const question = args.slice(1).join(" ");
      if (!question) { await msg.reply("`Koristi: .8ball <pitanje>`"); return true; }
      const answers = [
        "✅ Da, sigurno!", "✅ Bez ikakve sumnje!", "✅ Vjerovatno da!", "✅ Izgleda dobro!",
        "🤔 Pitaj ponovo...", "🤔 Nije sada jasno.", "🤔 Teško reći...", "🤔 Koncentriraj se i pitaj ponovo.",
        "❌ Ne izgleda dobro.", "❌ Sumnjam.", "❌ Ne.", "❌ Definitivno ne!"
      ];
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.PURPLE).setTitle("🎱 Magic 8 Ball")
        .addFields({ name: "❓ Pitanje", value: question }, { name: "🎱 Odgovor", value: pick(answers) })
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .coinflip ─────────────────────────────────────────────────────────────
    if (cmd === "coinflip" || cmd === "flip") {
      const result = Math.random() < 0.5;
      await msg.reply({ embeds: [new EmbedBuilder().setColor(result ? C.GOLD : C.DARK)
        .setTitle(result ? "🟡 GLAVA!" : "⚫ PISMO!")
        .setDescription(result ? "Glava — pobjednička strana! 🎉" : "Pismo — lakša strana! 💨")
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .roll ─────────────────────────────────────────────────────────────────
    if (cmd === "roll" || cmd === "dice") {
      const sides = parseInt(args[1]) || 6;
      if (sides < 2 || sides > 1000) { await msg.reply("`Broj stranica: 2–1000`"); return true; }
      const result = Math.floor(Math.random() * sides) + 1;
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.CYAN).setTitle("🎲 Bacanje kockice")
        .setDescription(`Bačena kockica od **${sides}** stranica\n\n# **${result}**`)
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .rps ──────────────────────────────────────────────────────────────────
    if (cmd === "rps") {
      const choices = { r: "✊ Kamen", p: "🖐️ Papir", s: "✌️ Škare" };
      const wins = { r: "s", p: "r", s: "p" };
      const userChoice = args[1]?.toLowerCase();
      if (!choices[userChoice]) { await msg.reply("`Koristi: .rps r/p/s`"); return true; }
      const botChoice = pick(["r", "p", "s"]);
      const result = wins[userChoice] === botChoice ? "🏆 Pobijedio/la si!" : userChoice === botChoice ? "🤝 Neriješeno!" : "💀 Bot je pobijedio!";
      await msg.reply({ embeds: [new EmbedBuilder().setColor(wins[userChoice]===botChoice?C.GREEN:userChoice===botChoice?C.YELLOW:C.RED)
        .setTitle("✊ Kamen, Papir, Škare")
        .addFields({ name: "Tvoj izbor", value: choices[userChoice], inline: true }, { name: "Bot izbor", value: choices[botChoice], inline: true }, { name: "Rezultat", value: result, inline: false })
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .rate ─────────────────────────────────────────────────────────────────
    if (cmd === "rate") {
      const target = msg.mentions.users.first() ?? msg.author;
      const pct = ((target.id + "rate").split("").reduce((a,c) => a+c.charCodeAt(0), 0) % 101 + 101) % 101;
      const bar = "█".repeat(Math.round(pct/10)) + "░".repeat(10-Math.round(pct/10));
      const label = pct>=90?"🌟 Savršen!":pct>=70?"😍 Odličan!":pct>=50?"😊 Dobar!":pct>=30?"😐 Prosječan!":"💀 Jadan!";
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.PINK).setTitle("⭐ Rate")
        .setThumbnail(target.displayAvatarURL())
        .setDescription(`**${target.displayName}**\n\n\`${bar}\` **${pct}%**\n\n*${label}*`)
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .iq ───────────────────────────────────────────────────────────────────
    if (cmd === "iq") {
      const target = msg.mentions.users.first() ?? msg.author;
      const iq = ((target.id + "iq").split("").reduce((a,c) => a+c.charCodeAt(0), 0) % 201 + 201) % 201;
      const label = iq>=160?"🧠 Genije!":iq>=130?"📚 Visoko!":iq>=100?"😐 Prosječno":iq>=70?"🤡 Ispod prosjeka":"🥴 Nema komentara...";
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.TEAL).setTitle("🧠 IQ Test")
        .setThumbnail(target.displayAvatarURL())
        .setDescription(`**${target.displayName}**\n\n**IQ: ${iq}** — *${label}*`)
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .pp ───────────────────────────────────────────────────────────────────
    if (cmd === "pp") {
      const target = msg.mentions.users.first() ?? msg.author;
      const size = ((target.id + "pp").split("").reduce((a,c) => a+c.charCodeAt(0), 0) % 21 + 21) % 21;
      const bar = "8" + "=".repeat(size) + "D";
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.ORANGE).setTitle("🍆 PP Size")
        .setThumbnail(target.displayAvatarURL())
        .setDescription(`**${target.displayName}**\n\n\`${bar}\`\n\n📏 **${size} cm**`)
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .simp ─────────────────────────────────────────────────────────────────
    if (cmd === "simp") {
      const target = msg.mentions.users.first() ?? msg.author;
      const pct = ((target.id + "simp").split("").reduce((a,c) => a+c.charCodeAt(0), 0) % 101 + 101) % 101;
      const label = pct>=90?"🚨 Hardcore simp!":pct>=70?"😰 Veliki simp":pct>=50?"😬 Malo simpaš":pct>=30?"🙂 Normalan":"😎 Anti-simp";
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.PINK).setTitle("💘 Simp Metar")
        .setThumbnail(target.displayAvatarURL())
        .setDescription(`**${target.displayName}** je **${pct}% simp**\n\n*${label}*`)
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .hack ─────────────────────────────────────────────────────────────────
    if (cmd === "hack") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .hack @korisnik`"); return true; }
      const steps = [
        "🔍 Tražim IP adresu...",
        "💻 Pristupam sistemu...",
        "🔓 Zaobilazeći firewall...",
        "📁 Preuzimam fajlove...",
        "🔑 Kradjem lozinke...",
      ];
      const reply = await msg.reply({ embeds: [mkInfo("💻 Hackovanje...", `Hakovam **${target.displayName}**...`)] });
      for (const step of steps) {
        await new Promise(r => setTimeout(r, 700));
        await reply.edit({ embeds: [new EmbedBuilder().setColor(C.GREEN).setTitle("💻 Hakovanje u toku...")
          .setDescription(`Target: **${target.displayName}**\n\n\`\`\`\n${step}\n\`\`\``).setTimestamp().setFooter({ text: FOOTER })] });
      }
      await new Promise(r => setTimeout(r, 700));
      const data = [`📧 Email: ${target.username}@gmail.com`, `🔑 Lozinka: ****${Math.random().toString(36).slice(2,6)}`, `📍 IP: 192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, `💳 Kartica: **** **** **** ${Math.floor(Math.random()*9999)}`];
      await reply.edit({ embeds: [new EmbedBuilder().setColor(C.RED).setTitle("✅ Hakovanje završeno!")
        .setDescription(`**${target.displayName}** je hakovan/a!\n\n\`\`\`\n${data.join("\n")}\n\`\`\`\n\n*⚠️ Ovo je šala!*`)
        .setThumbnail(target.displayAvatarURL()).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .roastme ──────────────────────────────────────────────────────────────
    if (cmd === "roastme") {
      const ROAST_LINES = [
        "Izgledaš kao da te je WiFi dizajnirao.",
        "Tvoj mozak je kao RAM od 256MB.",
        "Imaš budućnost samo u prošlosti.",
        "Ni ChatGPT ne želi razgovarati s tobom.",
        "Tvoja mama te voli. Niko drugi.",
        "Kad ulaz Googlea 'bezvrijedan', tvoj profil je thumbnail.",
        "Jesi li ti NPC ili samo izgledaš tako?",
        "Evolucija je napravila grešku.",
      ];
      await msg.reply({ embeds: [new EmbedBuilder().setColor(C.RED).setTitle("🔥 Roast!")
        .setDescription(`**${msg.author.displayName}**, evo ti:\n\n> *${pick(ROAST_LINES)}*`)
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── .kick (mod) ───────────────────────────────────────────────────────────
    if (cmd === "kick") {
      if (!await requireMod(msg)) return true;
      const target = msg.mentions.members?.first();
      const reason = args.slice(2).join(" ") || "Bez razloga";
      if (!target) { await msg.reply({ embeds: [mkErr("Greška","`.kick @korisnik [razlog]`")] }); return true; }
      try {
        await target.kick(reason);
        await msg.reply({ embeds: [mkOk("👢 Kickovan/a", `**${target.user.displayName}** je kickovan/a.\n**Razlog:** ${reason}`)] });
      } catch { await msg.reply({ embeds: [mkErr("Greška", "Nemam dozvolu za kick ili je korisnik iznad mene.")]}) }
      return true;
    }

    // ── .ban (mod) ────────────────────────────────────────────────────────────
    if (cmd === "ban") {
      if (!await requireMod(msg)) return true;
      const target = msg.mentions.members?.first();
      const reason = args.slice(2).join(" ") || "Bez razloga";
      if (!target) { await msg.reply({ embeds: [mkErr("Greška","`.ban @korisnik [razlog]`")] }); return true; }
      try {
        await target.ban({ reason });
        await msg.reply({ embeds: [mkOk("🔨 Banovan/a", `**${target.user.displayName}** je banovan/a.\n**Razlog:** ${reason}`)] });
      } catch { await msg.reply({ embeds: [mkErr("Greška", "Nemam dozvolu za ban ili je korisnik iznad mene.")] }); }
      return true;
    }

    // ── .timeout (mod) ────────────────────────────────────────────────────────
    if (cmd === "timeout" || cmd === "mute") {
      if (!await requireMod(msg)) return true;
      const target = msg.mentions.members?.first();
      const mins = parseInt(args[2]) || 5;
      const reason = args.slice(3).join(" ") || "Bez razloga";
      if (!target) { await msg.reply({ embeds: [mkErr("Greška","`.timeout @korisnik <minute> [razlog]`")] }); return true; }
      try {
        await target.timeout(mins * 60_000, reason);
        await msg.reply({ embeds: [mkOk("⏰ Timeout", `**${target.user.displayName}** timeout **${mins} min**.\n**Razlog:** ${reason}`)] });
      } catch { await msg.reply({ embeds: [mkErr("Greška","Nemam dozvolu za timeout.")] }); }
      return true;
    }

    // ── .purge (mod) ──────────────────────────────────────────────────────────
    if (cmd === "purge" || cmd === "clear") {
      if (!await requireMod(msg)) return true;
      const amount = parseInt(args[1]);
      if (!amount || amount < 1 || amount > 100) { await msg.reply("`Koristi: .purge <1-100>`"); return true; }
      try {
        await msg.delete();
        const deleted = await msg.channel.bulkDelete(amount, true);
        const notice = await msg.channel.send({ embeds: [mkOk("🗑️ Poruke obrisane", `Obrisano **${deleted.size}** poruka.`)] });
        setTimeout(() => notice.delete().catch(()=>{}), 3000);
      } catch { await msg.reply({ embeds: [mkErr("Greška","Ne mogu obrisati poruke starije od 14 dana.")] }); }
      return true;
    }

    // ── .lock (mod) ───────────────────────────────────────────────────────────
    if (cmd === "lock") {
      if (!await requireMod(msg)) return true;
      try {
        await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: false });
        await msg.reply({ embeds: [mkWarn("🔒 Kanal zaključan", `**#${msg.channel.name}** je zaključan.`)] });
      } catch { await msg.reply({ embeds: [mkErr("Greška","Nemam dozvolu za zaključavanje.")] }); }
      return true;
    }

    // ── .unlock (mod) ─────────────────────────────────────────────────────────
    if (cmd === "unlock") {
      if (!await requireMod(msg)) return true;
      try {
        await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone, { SendMessages: null });
        await msg.reply({ embeds: [mkOk("🔓 Kanal otključan", `**#${msg.channel.name}** je otključan.`)] });
      } catch { await msg.reply({ embeds: [mkErr("Greška","Nemam dozvolu za otključavanje.")] }); }
      return true;
    }

    // ── .slowmode (mod) ───────────────────────────────────────────────────────
    if (cmd === "slowmode") {
      if (!await requireMod(msg)) return true;
      const secs = parseInt(args[1]) ?? 0;
      if (secs < 0 || secs > 21600) { await msg.reply("`Koristi: .slowmode <0-21600>`"); return true; }
      try {
        await msg.channel.setRateLimitPerUser(secs);
        await msg.reply({ embeds: [mkOk("🐢 Slowmode", secs===0 ? "Slowmode isključen." : `Slowmode postavljen na **${secs}s**.`)] });
      } catch { await msg.reply({ embeds: [mkErr("Greška","Nemam dozvolu.")] }); }
      return true;
    }

    // ── .fuck (SFW — roast) ───────────────────────────────────────────────────
    if (cmd === "fuck") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .fuck @korisnik`"); return true; }
      await msg.channel.send({ embeds: [new EmbedBuilder().setColor(C.ORANGE).setTitle("🚀 Odleti!")
        .setDescription(`**${msg.author.displayName}** šalje **${target.displayName}** na put!\n\n> **${target.displayName}** ${pick(ROASTS)}`)
        .setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── NSFW kanal provjera (jednom za sve NSFW komande) ─────────────────────
    const _NSFW_CMDS = new Set(["fucknsfw","daddy","mommy","sex","blowjob","anal","cum","pussylick","handjob","solo","strip","creampie","fingering","nudes","threesome","yaoi","yuri"]);
    if (_NSFW_CMDS.has(cmd) && !await requireNsfwChannel(msg)) return true;

    // ── .fucknsfw (Purrbot GIF) ───────────────────────────────────────────────
    if (cmd === "fucknsfw") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .fucknsfw @korisnik`"); return true; }
      const gif = await fetchNsfwGif(pick(["fuck", "anal", "cum"]));
      const lines = [
        `**${msg.author.displayName}** jebe **${target.displayName}**! 💦`,
        `**${msg.author.displayName}** i **${target.displayName}** — nema zaustavljanja! 🔥`,
        `**${target.displayName}** dobija šta zaslužuje od **${msg.author.displayName}**! 😈`,
      ];
      const e = new EmbedBuilder().setColor(C.RED)
        .setTitle("🔞 Fuck")
        .setDescription(pick(lines))
        .setTimestamp().setFooter({ text: "🔞 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .daddy (Purrbot GIF) ──────────────────────────────────────────────────
    if (cmd === "daddy") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .daddy @korisnik`"); return true; }
      const gif = await fetchNsfwGif(pick(["blowjob", "pussylick", "fuck"]));
      const lines = [
        `**${target.displayName}** — *"Yes, daddy... 😩"*\n*${msg.author.displayName} preuzima kontrolu!*`,
        `**${target.displayName}** ne može da odoli **${msg.author.displayName}**! 😈`,
        `*"Daddy, please..."* — šapuće **${target.displayName}** dok **${msg.author.displayName}** vlada! 🖤`,
      ];
      const e = new EmbedBuilder().setColor(0x1a0a2e)
        .setTitle("😈 Daddy")
        .setDescription(pick(lines))
        .setTimestamp().setFooter({ text: "😈 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .mommy (Purrbot GIF) ──────────────────────────────────────────────────
    if (cmd === "mommy") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .mommy @korisnik`"); return true; }
      const gif = await fetchNsfwGif(pick(["yuri", "pussylick", "solo"]));
      const lines = [
        `**${target.displayName}** — *"Mommy's got you... 💋"*\n*${msg.author.displayName} se potpuno predaje!*`,
        `**${msg.author.displayName}** je u rukama **${target.displayName}**! 💋`,
        `*"Shh, good boy/girl..."* — šapuće **${target.displayName}** dok **${msg.author.displayName}** tone! 🌹`,
      ];
      const e = new EmbedBuilder().setColor(0x2e0a1a)
        .setTitle("💋 Mommy")
        .setDescription(pick(lines))
        .setTimestamp().setFooter({ text: "💋 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .sex (Purrbot GIF + poza) ─────────────────────────────────────────────
    if (cmd === "sex") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .sex @korisnik [poza]`"); return true; }
      const POZE = [
        "misionar", "doggy style", "cowgirl", "reverse cowgirl", "spoon",
        "standing", "lotus", "butterfly", "praying mantis", "lazy dog",
        "chair", "bridge", "scissors", "pretzel", "wheelbarrow",
        "spread eagle", "face-off", "69", "snow angel", "lock"
      ];
      const inputPoza = args.slice(2).join(" ").trim();
      const poza = inputPoza.length > 0 ? inputPoza : pick(POZE);
      const gif = await fetchNsfwGif(pick(["fuck", "anal", "cum", "pussylick", "threesome_ffm", "threesome_mmf"]));
      const e = new EmbedBuilder().setColor(C.PURPLE)
        .setTitle("💦 Sex")
        .setDescription(
          `**${msg.author.displayName}** i **${target.displayName}**\n\n` +
          `> 🛏️ **Poza:** \`${poza}\`\n\n` +
          `*Enjoy the ride! 😏🔥*`
        )
        .setTimestamp().setFooter({ text: "💦 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .blowjob ──────────────────────────────────────────────────────────────
    if (cmd === "blowjob") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .blowjob @korisnik`"); return true; }
      const gif = await fetchNsfwGif("blowjob");
      const lines = [
        `**${msg.author.displayName}** kleči pred **${target.displayName}**... 👄💦`,
        `**${target.displayName}** ne može vjerovati šta mu/joj **${msg.author.displayName}** radi! 😮‍💨`,
        `*"Mmmph..."* — **${msg.author.displayName}** i **${target.displayName}** nestaju iza zatvorenih vrata! 🚪💋`,
      ];
      const e = new EmbedBuilder().setColor(C.PINK).setTitle("👄 Blowjob")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "💋 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .anal ─────────────────────────────────────────────────────────────────
    if (cmd === "anal") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .anal @korisnik`"); return true; }
      const gif = await fetchNsfwGif("anal");
      const lines = [
        `**${msg.author.displayName}** juri **${target.displayName}** od pozadi! 🍑💥`,
        `**${target.displayName}** se ne može otrgnuti od **${msg.author.displayName}**! 😩🔥`,
        `*Deep and rough* — **${msg.author.displayName}** + **${target.displayName}** = 💦`,
      ];
      const e = new EmbedBuilder().setColor(C.ORANGE).setTitle("🍑 Anal")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "🔞 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .cum ──────────────────────────────────────────────────────────────────
    if (cmd === "cum") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .cum @korisnik`"); return true; }
      const gif = await fetchNsfwGif("cum");
      const lines = [
        `**${msg.author.displayName}** završava na **${target.displayName}**! 💦😏`,
        `**${target.displayName}** je mokra/mokar zahvaljujući **${msg.author.displayName}**! 💦🔥`,
        `*Game over.* **${msg.author.displayName}** → **${target.displayName}** 💥`,
      ];
      const e = new EmbedBuilder().setColor(C.CYAN).setTitle("💦 Cum")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "💦 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .pussylick ────────────────────────────────────────────────────────────
    if (cmd === "pussylick") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .pussylick @korisnik`"); return true; }
      const gif = await fetchNsfwGif("pussylick");
      const lines = [
        `**${msg.author.displayName}** se spušta prema **${target.displayName}**... 👅💧`,
        `**${target.displayName}** se trese dok **${msg.author.displayName}** radi čuda! 😮‍💨💦`,
        `*"Ne staj..."* — šapuće **${target.displayName}** dok **${msg.author.displayName}** liže! 👅🔥`,
      ];
      const e = new EmbedBuilder().setColor(C.TEAL).setTitle("👅 Pussy Lick")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "👅 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .solo ─────────────────────────────────────────────────────────────────
    if (cmd === "solo") {
      const target = msg.mentions.users.first() ?? msg.author;
      const gif = await fetchNsfwGif("solo");
      const lines = [
        `**${target.displayName}** uživa sam/a večeras... 🙈💦`,
        `**${target.displayName}** ne treba nikoga! Ruke su dovoljne! ✋😏`,
        `*Lights off, hands on* — **${target.displayName}** u svom elementu! 🌙💫`,
      ];
      const e = new EmbedBuilder().setColor(C.PURPLE).setTitle("🙈 Solo")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "💜 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .threesome ────────────────────────────────────────────────────────────
    if (cmd === "threesome") {
      const users = [...msg.mentions.users.values()];
      const u1 = users[0] ?? msg.author;
      const u2 = users[1] ?? msg.author;
      const gif = await fetchNsfwGif(pick(["threesome_ffm", "threesome_mmf", "threesome_fff"]));
      const lines = [
        `**${msg.author.displayName}**, **${u1.displayName}** i **${u2.displayName}** — trostruki problem! 🔥🔥🔥`,
        `*Tri je bolje od dva!* — **${msg.author.displayName}** + **${u1.displayName}** + **${u2.displayName}** 💦`,
        `Niko ne spava večeras! **${msg.author.displayName}**, **${u1.displayName}**, **${u2.displayName}** 🛏️🔥`,
      ];
      const e = new EmbedBuilder().setColor(C.GOLD).setTitle("🔥 Threesome")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "🔥 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .yaoi ─────────────────────────────────────────────────────────────────
    if (cmd === "yaoi") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .yaoi @korisnik`"); return true; }
      const gif = await fetchNsfwGif("yaoi");
      const lines = [
        `**${msg.author.displayName}** i **${target.displayName}** — bromance gone too far! 😳🔥`,
        `*Boys will be boys...* — **${msg.author.displayName}** + **${target.displayName}** 💙`,
        `**${target.displayName}** nije mogao odoljeti **${msg.author.displayName}**! 😳💦`,
      ];
      const e = new EmbedBuilder().setColor(C.BLUE).setTitle("💙 Yaoi")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "💙 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .yuri ─────────────────────────────────────────────────────────────────
    if (cmd === "yuri") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .yuri @korisnik`"); return true; }
      const gif = await fetchNsfwGif("yuri");
      const lines = [
        `**${msg.author.displayName}** i **${target.displayName}** — girls just wanna have fun! 🌸💕`,
        `*Soft lips, softer touch* — **${msg.author.displayName}** + **${target.displayName}** 💗`,
        `**${target.displayName}** se topi u rukama **${msg.author.displayName}**! 🌺💦`,
      ];
      const e = new EmbedBuilder().setColor(C.PINK).setTitle("🌸 Yuri")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "🌸 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .handjob ─────────────────────────────────────────────────────────────
    if (cmd === "handjob") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .handjob @korisnik`"); return true; }
      const gif = await fetchNsfwGif(pick(["blowjob", "cum", "fuck"]));
      const lines = [
        `**${msg.author.displayName}** pruža ruku **${target.displayName}**... i to rade ruke! 🤚💦`,
        `**${target.displayName}** se prepušta rukama **${msg.author.displayName}**! 😮‍💨🔥`,
        `*Meke ruke, tihi uzdasi...* **${msg.author.displayName}** → **${target.displayName}** 💋`,
      ];
      const e = new EmbedBuilder().setColor(C.ORANGE).setTitle("🤚 Handjob")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "🔞 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .strip ────────────────────────────────────────────────────────────────
    if (cmd === "strip") {
      const target = msg.mentions.users.first() ?? msg.author;
      const gif = await fetchNsfwGif(pick(["solo", "fuck", "cum"]));
      const lines = [
        `**${target.displayName}** počinje da skida... i ne može da stane! 🔥😏`,
        `Publika divlja dok **${target.displayName}** pleše i skida se! 💃💦`,
        `**${target.displayName}** daje privatni nastup samo za **${msg.author.displayName}**! 😈`,
      ];
      const e = new EmbedBuilder().setColor(C.PINK).setTitle("💃 Strip")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "💋 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .creampie ─────────────────────────────────────────────────────────────
    if (cmd === "creampie") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .creampie @korisnik`"); return true; }
      const gif = await fetchNsfwGif(pick(["cum", "fuck", "anal"]));
      const lines = [
        `**${msg.author.displayName}** završava unutra i **${target.displayName}** se osjeća savršeno! 💦😩`,
        `*Warm and sticky...* **${msg.author.displayName}** → **${target.displayName}** 💦🔥`,
        `**${target.displayName}** traži još od **${msg.author.displayName}**! 😏💦`,
      ];
      const e = new EmbedBuilder().setColor(C.RED).setTitle("💦 Creampie")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "💦 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .fingering ────────────────────────────────────────────────────────────
    if (cmd === "fingering") {
      const target = msg.mentions.users.first();
      if (!target) { await msg.reply("`Koristi: .fingering @korisnik`"); return true; }
      const gif = await fetchNsfwGif(pick(["pussylick", "solo", "fuck"]));
      const lines = [
        `**${msg.author.displayName}** prstima dovodi **${target.displayName}** do ludila! 🤞💦`,
        `**${target.displayName}** jedva diše dok **${msg.author.displayName}** radi svoje! 😮‍💨🔥`,
        `*Prsti znaju sve pravo mjestо...* **${msg.author.displayName}** → **${target.displayName}** 💋`,
      ];
      const e = new EmbedBuilder().setColor(C.PURPLE).setTitle("🤞 Fingering")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "👅 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .nudes ────────────────────────────────────────────────────────────────
    if (cmd === "nudes") {
      const target = msg.mentions.users.first() ?? msg.author;
      const gif = await fetchNsfwGif(pick(["solo", "fuck", "cum", "pussylick"]));
      const lines = [
        `**${target.displayName}** šalje nudes i niko nije spreman! 🔥😏`,
        `*Unboxing package from **${target.displayName}**...* 📦💦`,
        `**${target.displayName}** to radi samo za **${msg.author.displayName}**! 😈🌹`,
      ];
      const e = new EmbedBuilder().setColor(C.DARK).setTitle("📸 Nudes")
        .setDescription(pick(lines)).setTimestamp().setFooter({ text: "🔞 GIANNI Bot v2" });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

    // ── .lovecmds ─────────────────────────────────────────────────────────────
    if (cmd === "lovecmds" || cmd === "lovehelp") {
      await msg.channel.send({ embeds: [new EmbedBuilder().setColor(C.PINK).setTitle("💕 Love komande")
        .addFields(
          { name: "💘 Ljubav",       value: "`.ship @a @b` `.love @a` `.marry @a` `.divorce` `.partner` `.tinder [@a]`", inline: false },
          { name: "🤗 SFW (sa GIF)", value: "`.hug` `.kiss` `.pat` `.cuddle` `.blush` `.smile` `.feed` `.wave` `.slap` `.poke` `.bite` `.lick` `.stare` `.highfive` `.dance` `.cry` `.wink` `.nod` `.sleep` `.laugh` `.shrug`", inline: false },
          { name: "🔞 Igra (svi kanali)", value: "`.fucknsfw @a` `.daddy @a` `.mommy @a` `.sex @a [poza]`\n`.blowjob @a` `.anal @a` `.cum @a` `.pussylick @a`\n`.solo [@a]` `.threesome @a @b` `.yaoi @a` `.yuri @a`", inline: false },
          { name: "😂 Roast",        value: "`.fuck @a`", inline: false }
        ).setTimestamp().setFooter({ text: FOOTER })] });
      return true;
    }

    // ── Social actions with SFW GIF ───────────────────────────────────────────
    const def = SOCIAL[cmd];
    if (def) {
      const target     = msg.mentions.users.first();
      const needTarget = !def.solo;
      if (!target && needTarget) {
        await msg.reply({ embeds: [new EmbedBuilder().setColor(def.color).setDescription(`${def.emoji} Moraš označiti nekoga! \`.${cmd} @korisnik\``)] });
        return true;
      }
      const pool = (!target && def.solo) ? def.solo : def.lines;
      const text = fmt(pick(pool), msg.author, target ?? undefined);
      const gif  = await fetchNsfwGif(pick(["fuck","blowjob","pussylick","cum","anal","solo","yuri","yaoi"]));
      const e = new EmbedBuilder().setColor(def.color).setDescription(text)
        .setTimestamp().setFooter({ text: FOOTER });
      if (gif) e.setImage(gif);
      await msg.reply({ embeds: [e] });
      return true;
    }

  } catch (e) { logger.error({ err: e, cmd }, "Dot command error"); }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SLASH COMMANDS (kept for Discord menu UX)
// ═══════════════════════════════════════════════════════════════════════════════
const slashCommands = [
  {
    data: new SlashCommandBuilder().setName("events").setDescription("📅 Prikaži predstojeće događaje"),
    async execute(i) {
      if (!i.guild) { await i.reply({ embeds: [mkErr("Greška","Samo na serverima.")], ephemeral: true }); return; }
      await i.deferReply();
      try {
        const evs = (await i.guild.scheduledEvents.fetch())
          .filter(e => e.status===GuildScheduledEventStatus.Scheduled||e.status===GuildScheduledEventStatus.Active)
          .map(e => ({ name: e.name, startTime: e.scheduledStartAt??new Date(), endTime: e.scheduledEndAt??null, location: e.entityMetadata?.location??(e.channel?`#${e.channel.name}`:"Discord"), userCount: e.userCount }))
          .sort((a,b) => a.startTime-b.startTime);
        if (!evs.length) { await i.editReply({ embeds: [mkInfo("Nema događaja","Nema zakazanih događaja.")] }); return; }
        const embed = new EmbedBuilder().setColor(C.BLUE).setTitle(`📅 Događaji — ${i.guild.name}`)
          .setDescription(evs.slice(0,8).map(e => `> 🎪 **${e.name}**\n> 🗓️ <t:${Math.floor(e.startTime.getTime()/1000)}:F> • 📍 ${e.location}${e.userCount!=null?` • 👥 ${e.userCount}`:""}`).join("\n\n"))
          .setTimestamp().setFooter({ text: FOOTER });
        await i.editReply({ embeds: [embed] });
      } catch { await i.editReply({ embeds: [mkErr("Greška","Provjeri dozvole bota.")] }); }
    }
  },
  {
    data: new SlashCommandBuilder().setName("gws").setDescription("🎉 Giveaway")
      .addSubcommand(s=>s.setName("create").setDescription("Pokreni giveaway")
        .addStringOption(o=>o.setName("nagrada").setDescription("Nagrada").setRequired(true))
        .addIntegerOption(o=>o.setName("trajanje").setDescription("Minute").setMinValue(1).setMaxValue(43200).setRequired(true))
        .addIntegerOption(o=>o.setName("pobjednici").setDescription("Broj pobjednika").setMinValue(1).setMaxValue(20)))
      .addSubcommand(s=>s.setName("end").setDescription("Završi giveaway").addStringOption(o=>o.setName("message_id").setDescription("ID poruke").setRequired(true)))
      .addSubcommand(s=>s.setName("reroll").setDescription("Reroll").addStringOption(o=>o.setName("message_id").setDescription("ID poruke").setRequired(true))),
    async execute(i) {
      if (!i.guild) { await i.reply({ embeds: [mkErr("Greška","Samo na serverima.")], ephemeral: true }); return; }
      const sub = i.options.getSubcommand();
      if (sub==="create") {
        if (i.channel?.type!==ChannelType.GuildText) return;
        const prize=i.options.getString("nagrada",true), mins=i.options.getInteger("trajanje",true), winners=i.options.getInteger("pobjednici")??1;
        const endTime=new Date(Date.now()+mins*60_000), ts=Math.floor(endTime.getTime()/1000);
        await i.reply({ embeds: [mkOk("Pokrenut!",`Giveaway za **${prize}** počeo!`)], ephemeral: true });
        const gMsg=await i.channel.send({ embeds: [new EmbedBuilder().setColor(C.PINK).setTitle("🎉 GIVEAWAY 🎉")
          .setDescription(`## ${prize}\n\n> Reaguj sa 🎉!\n\n⏰ **Završava:** <t:${ts}:R>\n🏆 **Pobjednika:** ${winners}\n🎊 ${i.user}`)
          .setTimestamp(endTime).setFooter({ text: "🎁 Završava se" })] });
        await gMsg.react("🎉");
        const g={messageId:gMsg.id,channelId:gMsg.channelId,guildId:i.guild.id,prize,winners,endTime,ended:false};
        activeGiveaways.set(gMsg.id,g);
        setTimeout(async()=>{ const curr=activeGiveaways.get(gMsg.id); if(!curr||curr.ended)return; await endGiveaway(curr,i.channel); },mins*60_000);
      }
      if (sub==="end") {
        const mid=i.options.getString("message_id",true), g=activeGiveaways.get(mid);
        if (!g||g.ended) { await i.reply({ embeds: [mkErr("Nije pronađen","Giveaway ne postoji.")], ephemeral: true }); return; }
        if (i.channel?.type!==ChannelType.GuildText) return;
        await i.deferReply({ ephemeral: true });
        await endGiveaway(g,i.channel); await i.editReply({ embeds: [mkOk("Završen",`Giveaway za **${g.prize}**.`)] });
      }
      if (sub==="reroll") {
        const mid=i.options.getString("message_id",true), g=activeGiveaways.get(mid);
        if (!g) { await i.reply({ embeds: [mkErr("Nije pronađen","Giveaway ne postoji.")], ephemeral: true }); return; }
        if (i.channel?.type!==ChannelType.GuildText) return;
        await i.deferReply({ ephemeral: true });
        try {
          const gMsg=await i.channel.messages.fetch(mid), wins=await pickGwWinners(gMsg,g.winners);
          const wText=wins.length>0?wins.map(w=>`<@${w}>`).join(", "):"Nema pobjednika";
          await i.channel.send({ embeds: [mkOk("🔄 Reroll",`**${g.prize}** — Novi pobjednici: ${wText}`)] });
          await i.editReply({ embeds: [mkOk("Reroll završen","Novi pobjednici odabrani!")] });
        } catch { await i.editReply({ embeds: [mkErr("Greška","Nije moguće učitati poruku.")] }); }
      }
    }
  },
  {
    data: new SlashCommandBuilder().setName("dm-aktive").setDescription("📨 [Owner] DM svim članovima")
      .addStringOption(o=>o.setName("poruka").setDescription("Poruka").setRequired(true)),
    async execute(i) {
      if (i.user.id!==OWNER_ID) { await i.reply({ embeds: [mkErr("Zabranjen pristup","Samo vlasnik!")], ephemeral: true }); return; }
      if (!i.guild) return;
      await i.deferReply({ ephemeral: true });
      const poruka=i.options.getString("poruka",true);
      const members=await i.guild.members.fetch(), targets=members.filter(m=>!m.user.bot);
      let sent=0,failed=0;
      const dmEmbed=new EmbedBuilder().setColor(C.BLUE).setTitle(`📨 Poruka od **${i.guild.name}**`).setDescription(poruka).setThumbnail(i.guild.iconURL()??null).addFields({name:"📌 Server",value:i.guild.name,inline:true},{name:"👑 Poslao/la",value:i.user.globalName??i.user.username,inline:true}).setTimestamp().setFooter({text:`📨 ${i.guild.name} • GIANNI Bot`});
      for(const[,member]of targets){try{await member.user.send({embeds:[dmEmbed]});sent++;}catch{failed++;}await new Promise(r=>setTimeout(r,500));}
      await i.editReply({ embeds: [mkOk("DM-Aktive završen",`✅ Poslano: **${sent}**\n❌ Neuspješno: **${failed}**\n📨 Ukupno: **${targets.size}**`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName("wordle").setDescription("🟩 Wordle igra")
      .addSubcommand(s=>s.setName("set-channel").setDescription("Postavi kanal").addChannelOption(o=>o.setName("kanal").setDescription("Kanal").setRequired(true)))
      .addSubcommand(s=>s.setName("start").setDescription("Pokreni partiju"))
      .addSubcommand(s=>s.setName("stop").setDescription("Prekini partiju")),
    async execute(i) {
      if (!i.guild) return;
      const sub=i.options.getSubcommand();
      if (sub==="set-channel") { const ch=i.options.getChannel("kanal",true); wordleChannels.set(i.guild.id,ch.id); await i.reply({ embeds: [mkOk("Wordle kanal postavljen",`🟩 Wordle u ${ch}!\nPiši 5-slovna slova direktno u kanal!`)] }); return; }
      if (sub==="start") { const chId=wordleChannels.get(i.guild.id); if(!chId){await i.reply({embeds:[mkWarn("Kanal nije postavljen","`.wordle set-channel #kanal`")],ephemeral:true});return;} wordleGames.set(chId,{word:WORDS[Math.floor(Math.random()*WORDS.length)],guesses:[],maxGuesses:6}); await i.reply({embeds:[mkOk("🟩 Wordle — Nova partija!","⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n⬜⬜⬜⬜⬜\n\nUkucaj 5-slovna engleska slova direktno u kanal!")]}); return; }
      if (sub==="stop") { const chId=wordleChannels.get(i.guild.id); if(chId)wordleGames.delete(chId); await i.reply({embeds:[mkInfo("Wordle zaustavljen","Partija prekinuta.")]}); }
    }
  },
  {
    data: new SlashCommandBuilder().setName("serverinfo").setDescription("🏰 Informacije o serveru"),
    async execute(i) {
      if (!i.guild){await i.reply({embeds:[mkErr("Greška","Samo na serverima.")],ephemeral:true});return;}
      const g=await i.guild.fetch();
      await i.reply({embeds:[new EmbedBuilder().setColor(C.GOLD).setTitle(`🏰 ${g.name}`).setThumbnail(g.iconURL({size:256})??null)
        .addFields({name:"👑 Vlasnik",value:`<@${g.ownerId}>`,inline:true},{name:"👥 Članovi",value:`${g.memberCount}`,inline:true},{name:"📅 Kreiran",value:`<t:${Math.floor(g.createdTimestamp/1000)}:D>`,inline:true},{name:"💬 Kanali",value:`${g.channels.cache.size}`,inline:true},{name:"🎭 Uloge",value:`${g.roles.cache.size}`,inline:true},{name:"🆔 ID",value:`\`${g.id}\``,inline:true})
        .setImage(g.bannerURL({size:1024})??null).setTimestamp().setFooter({text:FOOTER})]});
    }
  },
  {
    data: new SlashCommandBuilder().setName("userinfo").setDescription("👤 Informacije o korisniku").addUserOption(o=>o.setName("korisnik").setDescription("Korisnik")),
    async execute(i) {
      const target=i.options.getMember("korisnik")??i.member, user=target instanceof GuildMember?target.user:i.user, member=target instanceof GuildMember?target:null;
      const roles=member?.roles.cache.filter(r=>r.id!==i.guild?.id).sort((a,b)=>b.position-a.position).map(r=>`${r}`).slice(0,10).join(" ")||"Nema";
      await i.reply({embeds:[new EmbedBuilder().setColor(member?.displayColor||C.BLUE).setTitle(`👤 ${user.globalName??user.username}`).setThumbnail(user.displayAvatarURL({size:256}))
        .addFields({name:"🏷️ Tag",value:`\`${user.tag}\``,inline:true},{name:"🆔 ID",value:`\`${user.id}\``,inline:true},{name:"🤖 Bot",value:user.bot?"Da":"Ne",inline:true},{name:"📅 Na Discordu od",value:`<t:${Math.floor(user.createdTimestamp/1000)}:D>`,inline:true},...(member?.joinedTimestamp?[{name:"📥 Pridružen",value:`<t:${Math.floor(member.joinedTimestamp/1000)}:D>`,inline:true}]:[]),{name:"🎭 Uloge",value:roles,inline:false})
        .setTimestamp().setFooter({text:FOOTER})]});
    }
  },
  {
    data: new SlashCommandBuilder().setName("warn").setDescription("⚠️ Upozori korisnika").setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o=>o.setName("korisnik").setDescription("Korisnik").setRequired(true))
      .addStringOption(o=>o.setName("razlog").setDescription("Razlog").setRequired(true)),
    async execute(i) {
      if (!i.guild) return;
      if (!isOwner(i.user.id)&&!isMod(i.member)&&!isAdmin(i.member)) { await i.reply({embeds:[mkErr("Zabranjen pristup","Samo moderatori!")],ephemeral:true}); return; }
      const target=i.options.getMember("korisnik"), reason=i.options.getString("razlog",true);
      if (!target||!(target instanceof GuildMember)){await i.reply({embeds:[mkErr("Greška","Korisnik nije pronađen.")],ephemeral:true});return;}
      const cooldownMins=checkWarnCooldown(i.guild.id,target.id);
      if (cooldownMins!==null){await i.reply({embeds:[mkWarn("Cooldown",`Možeš upozoriti opet za **${cooldownMins} min**! ⏰`)],ephemeral:true});return;}
      const key=`${i.guild.id}:${target.id}`, list=warningStore.get(key)??[];
      list.push({reason,by:i.user.id,date:new Date().toISOString()}); warningStore.set(key,list); warnCooldowns.set(key,Date.now());
      await i.reply({embeds:[new EmbedBuilder().setColor(C.YELLOW).setTitle("⚠️ Upozorenje").setThumbnail(target.user.displayAvatarURL())
        .addFields({name:"👤 Korisnik",value:`${target}`,inline:true},{name:"👮 Moderator",value:`${i.user}`,inline:true},{name:"📝 Razlog",value:reason,inline:false},{name:"📊 Ukupno",value:`**${list.length}**`,inline:true},{name:"⏰ Sljedeće",value:"za 1 sat",inline:true})
        .setTimestamp().setFooter({text:FOOTER})]});
      target.user.send({embeds:[new EmbedBuilder().setColor(C.YELLOW).setTitle(`⚠️ Upozorenje — ${i.guild.name}`).setDescription(`**Razlog:** ${reason}\n**Moderator:** ${i.user.globalName??i.user.username}\n*Ukupno: **${list.length}***`).setTimestamp().setFooter({text:FOOTER})]}).catch(()=>{});
    }
  },
  {
    data: new SlashCommandBuilder().setName("warnings").setDescription("📋 Upozorenja korisnika").setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o=>o.setName("korisnik").setDescription("Korisnik").setRequired(true)),
    async execute(i) {
      if (!i.guild) return;
      const target=i.options.getUser("korisnik",true), list=warningStore.get(`${i.guild.id}:${target.id}`)??[];
      if (!list.length){await i.reply({embeds:[mkInfo("Nema upozorenja",`**${target.displayName}** nema upozorenja.`)]});return;}
      await i.reply({embeds:[new EmbedBuilder().setColor(C.YELLOW).setTitle(`⚠️ Upozorenja — ${target.displayName}`).setThumbnail(target.displayAvatarURL())
        .setDescription(list.map((w,n)=>`**${n+1}.** ${w.reason}\n> <@${w.by}> • <t:${Math.floor(new Date(w.date).getTime()/1000)}:R>`).join("\n\n"))
        .setFooter({text:`Ukupno: ${list.length} • GIANNI Bot`}).setTimestamp()]});
    }
  },
  {
    data: new SlashCommandBuilder().setName("clearwarn").setDescription("🧹 Obriši upozorenja").setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addUserOption(o=>o.setName("korisnik").setDescription("Korisnik").setRequired(true)),
    async execute(i) {
      if (!i.guild) return;
      const target=i.options.getUser("korisnik",true);
      warningStore.delete(`${i.guild.id}:${target.id}`);
      await i.reply({embeds:[mkOk("Obrisano",`Sva upozorenja za **${target.displayName}** su obrisana.`)]});
    }
  },
  {
    data: new SlashCommandBuilder().setName("tinder").setDescription("💘 Tinder match sistem").addUserOption(o=>o.setName("korisnik").setDescription("Koga swipeaš?")),
    async execute(i) {
      const target=i.options.getUser("korisnik")??i.user;
      const pct=lovePct(i.user.id,target.id), isMatch=pct>=50;
      const gif=await fetchNsfwGif(isMatch?pick(["blowjob","pussylick","fuck","yuri"]):pick(["cum","solo","anal"]));
      const e=new EmbedBuilder().setColor(isMatch?C.GREEN:C.RED).setTitle(isMatch?"💚 IT'S A MATCH!":"💔 NO MATCH")
        .setDescription(isMatch?`### ${i.user.displayName} 💚 ${target.displayName}\n\n> **MATCH!** 🎉 Kompatibilnost: **${pct}%**\n> Swipe right! 💘`:`### ${i.user.displayName} 💔 ${target.displayName}\n\n> **NO MATCH** 😬 Kompatibilnost: **${pct}%**\n> Swipe left... 💀`)
        .setThumbnail(isMatch?target.displayAvatarURL():i.user.displayAvatarURL()).setTimestamp().setFooter({text:"💘 Tinder • GIANNI Bot"});
      if (gif) e.setImage(gif);
      await i.reply({embeds:[e]});
    }
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
//  BOT STARTUP
// ═══════════════════════════════════════════════════════════════════════════════
async function startBot() {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) { logger.warn("DISCORD_TOKEN nije postavljen."); return; }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildScheduledEvents
    ]
  });

  // ── Anti-Raid ──────────────────────────────────────────────────────────────
  client.on("guildMemberAdd", async member => {
    const gid = member.guild.id;
    if (lockdownGuilds.has(gid)) return;
    const now  = Date.now();
    const prev = (recentJoins.get(gid)??[]).filter(t=>now-t<JOIN_WINDOW_MS);
    prev.push(now); recentJoins.set(gid, prev);
    if (prev.length >= JOIN_THRESHOLD) await activateLockdown(member);
  });

  // ── Anti-Invite + All dot commands ────────────────────────────────────────
  client.on("messageCreate", async msg => {
    if (msg.author.bot) return;

    // Anti-invite check
    if (msg.guild && msg.channel.type === ChannelType.GuildText && !msg.member?.permissions.has("ManageGuild")) {
      if (INVITE_RE.test(msg.content)) {
        INVITE_RE.lastIndex = 0;
        try { await msg.delete(); } catch { INVITE_RE.lastIndex = 0; return; }
        msg.channel.send({ content: `${msg.author} ⚠️ Invite linkovi nisu dozvoljeni!`, embeds: [new EmbedBuilder()
          .setColor(C.ORANGE).setTitle("🔗 Invite Link Blokiran")
          .setDescription(`> **${msg.author.globalName??msg.author.username}** je pokušao/la poslati invite link.`)
          .setTimestamp().setFooter({ text: FOOTER })] }).catch(()=>{});
        return;
      }
      INVITE_RE.lastIndex = 0;
    }

    // Wordle (passive listener)
    if (msg.guild) {
      const chId = wordleChannels.get(msg.guild.id);
      if (chId && msg.channel.id === chId) {
        const guess = msg.content.trim().toUpperCase();
        if (/^[A-Z]{5}$/.test(guess)) {
          let game = wordleGames.get(chId);
          if (!game || (game.guesses.length>0 && game.guesses[game.guesses.length-1]===game.word)) {
            game = { word: WORDS[Math.floor(Math.random()*WORDS.length)], guesses: [], maxGuesses: 6 };
            wordleGames.set(chId, game);
          }
          game.guesses.push(guess);
          const won  = guess===game.word;
          const lost = !won && game.guesses.length>=game.maxGuesses;
          const extra = won
            ? `> 🎉 Bravo **${msg.author.displayName}**! Pogodio/la si za **${game.guesses.length}** pokušaja!`
            : lost ? `> 💀 Nisi pogodio/la. Bolje sreće sljedeći put!` : "";
          await msg.reply({ embeds: [wordleEmbed(game, extra)] });
          if (won||lost) wordleGames.delete(chId);
          return;
        }
      }
    }

    // All dot commands
    if (msg.content.startsWith(PREFIX)) {
      await handleDotCommand(msg, client);
    }
  });

  // ── Slash commands ────────────────────────────────────────────────────────
  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = slashCommands.find(c => c.data.name===interaction.commandName);
    if (!cmd) return;
    try { await cmd.execute(interaction); }
    catch (e) {
      logger.error({ err: e, command: interaction.commandName }, "Slash command error");
      const payload = { content: "❌ Greška. Pokušaj ponovo.", ephemeral: true };
      if (interaction.replied||interaction.deferred) await interaction.followUp(payload).catch(()=>{});
      else await interaction.reply(payload).catch(()=>{});
    }
  });

  client.on("clientReady", async readyClient => {
    logger.info({ tag: readyClient.user.tag }, "GIANNI Bot ready ✅");
    readyClient.user.setPresence({ activities: [{ name: "🛡️ .help | GIANNI Bot", type: ActivityType.Watching }], status: "online" });

    const rest = new REST().setToken(token);
    try {
      await rest.put(Routes.applicationCommands(readyClient.user.id), { body: slashCommands.map(c=>c.data.toJSON()) });
      logger.info(`Registrovano ${slashCommands.length} slash komandi`);
    } catch (e) { logger.error({ err: e }, "Slash command registration error"); }

    for (const guild of readyClient.guilds.cache.values()) {
      guild.systemChannel?.send({ embeds: [new EmbedBuilder().setColor(C.GREEN).setTitle("🛡️ GIANNI Bot — Online!")
        .setDescription(
          `Bot je online i spreman! Sve komande rade sa **\`.\`** prefiksom!\n\n` +
          `**Piši \`.help\` za listu svih komandi!**\n\n` +
          `> 🚨 Anti-Raid aktivno\n> 🔗 Anti-Invite aktivno\n> 💕 20+ Love komandi sa GIF-ovima\n> 🔞 NSFW komande (.daddy .mommy .fucknsfw)\n> 💘 Tinder sistem (.tinder)\n> 🟩 Wordle igra\n> ⚠️ Warn sistem sa 1h cooldown`
        ).setThumbnail(guild.iconURL()??null).setTimestamp().setFooter({ text: "🛡️ GIANNI Bot" })] }).catch(()=>{});
    }
  });

  client.on("error", err => {
    const m = err.message??String(err);
    if (m.toLowerCase().includes("disallowed intents")) {
      logger.error("⚠️ Uključi SERVER MEMBERS INTENT i MESSAGE CONTENT INTENT na discord.com/developers/applications!");
    } else { logger.error({ err }, "Discord client error"); }
  });
  client.on("warn", info => logger.warn({ info }, "Discord warning"));

  try { await client.login(token); }
  catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m.toLowerCase().includes("disallowed")) logger.error("Privilegovani intenti nisu uključeni!");
    else throw e;
  }
}

logger.info("🛡️ Pokretanje GIANNI Bota...");
startBot().catch(e => { logger.error({ err: e }, "Fatalna greška"); process.exit(1); });
