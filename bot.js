var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/bot/index.ts
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActivityType
} from "discord.js";

// src/lib/logger.ts
import pino from "pino";
var isProduction = process.env.NODE_ENV === "production";
var logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...isProduction ? {} : {
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  }
});

// src/bot/handlers/antiRaid.ts
import {
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

// src/bot/utils/embeds.ts
import {
  EmbedBuilder,
  GuildMember
} from "discord.js";

// src/bot/utils/colors.ts
var BotColors = {
  BLURPLE: 5793266,
  GREEN: 5763719,
  YELLOW: 16705372,
  RED: 15548997,
  BLUE: 3447003,
  PINK: 16741370,
  ORANGE: 16739125,
  DARK: 3092790,
  GOLD: 15844367,
  CYAN: 54015
};

// src/bot/utils/embeds.ts
var BOT_FOOTER = "\u{1F6E1}\uFE0F Guardian Bot \u2022 Protection System";
function successEmbed(title, description) {
  return new EmbedBuilder().setColor(BotColors.GREEN).setTitle(`\u2705 ${title}`).setDescription(description).setTimestamp().setFooter({ text: BOT_FOOTER });
}
function errorEmbed(title, description) {
  return new EmbedBuilder().setColor(BotColors.RED).setTitle(`\u274C ${title}`).setDescription(description).setTimestamp().setFooter({ text: BOT_FOOTER });
}
function infoEmbed(title, description) {
  return new EmbedBuilder().setColor(BotColors.BLURPLE).setTitle(`\u2139\uFE0F ${title}`).setDescription(description).setTimestamp().setFooter({ text: BOT_FOOTER });
}
function raidAlertEmbed(guild, joinCount) {
  return new EmbedBuilder().setColor(BotColors.RED).setTitle("\u{1F6A8} RAID DETECTED \u2014 SERVER LOCKDOWN ACTIVATED").setDescription(
    `> **${joinCount}** korisnika je u\u0161lo za manje od **10 sekundi**!
> Server je automatski zaklju\u010Dan na **5 minuta**.`
  ).addFields(
    { name: "\u{1F3F0} Server", value: guild.name, inline: true },
    { name: "\u{1F465} Mass Join", value: `${joinCount} korisnika`, inline: true },
    {
      name: "\u23F1\uFE0F Lockdown trajanje",
      value: "5 minuta (auto-unlock)",
      inline: true
    }
  ).setThumbnail(guild.iconURL() ?? null).setTimestamp().setFooter({ text: "\u{1F6E1}\uFE0F Anti-Raid System \u2022 Guardian Bot" });
}
function raidUnlockEmbed(guild) {
  return new EmbedBuilder().setColor(BotColors.GREEN).setTitle("\u2705 Lockdown zavr\u0161en \u2014 Server je ponovo otvor\u0435\u043D").setDescription(
    `> Server **${guild.name}** je automatski otklju\u010Dan nakon 5 minuta.
> Raid za\u0161tita ostaje aktivna.`
  ).setTimestamp().setFooter({ text: "\u{1F6E1}\uFE0F Anti-Raid System \u2022 Guardian Bot" });
}
function inviteDeleteEmbed(member, channelName) {
  const tag = member instanceof GuildMember ? member.user.tag : member.tag;
  const avatar = member instanceof GuildMember ? member.user.displayAvatarURL() : member.displayAvatarURL();
  return new EmbedBuilder().setColor(BotColors.ORANGE).setTitle("\u{1F517} Invite Link Blokiran").setDescription(
    `> Korisnik **${tag}** je poku\u0161ao da po\u0161alje invite link u kanalu **#${channelName}**.
> Poruka je automatski obrisana.`
  ).setThumbnail(avatar).setTimestamp().setFooter({ text: "\u{1F6E1}\uFE0F Anti-Invite System \u2022 Guardian Bot" });
}
function giveawayStartEmbed(prize, winners, endTime, hostedBy) {
  const timestamp = Math.floor(endTime.getTime() / 1e3);
  return new EmbedBuilder().setColor(BotColors.PINK).setTitle("\u{1F389} GIVEAWAY \u{1F389}").setDescription(
    `## ${prize}

> Reaguj sa \u{1F389} da u\u010Destvuje\u0161!

\u23F0 **Zavr\u0161ava se:** <t:${timestamp}:R> (<t:${timestamp}:f>)
\u{1F3C6} **Broj pobednika:** ${winners}
\u{1F38A} **Organizuje:** ${hostedBy}`
  ).setThumbnail("https://cdn.discordapp.com/emojis/738049236830036000.png").setTimestamp(endTime).setFooter({ text: `\u{1F381} Zavr\u0161ava se` });
}
function giveawayEndEmbed(prize, winners) {
  const winnersText = winners.length > 0 ? winners.map((w) => `<@${w}>`).join(", ") : "Nema pobednika (niko nije reagovao)";
  return new EmbedBuilder().setColor(BotColors.GOLD).setTitle("\u{1F3C6} GIVEAWAY ZAVR\u0160EN \u{1F3C6}").setDescription(
    `## ${prize}

\u{1F389} **Pobednik(ci):** ${winnersText}

*\u010Cestitamo svim pobednicima!*`
  ).setTimestamp().setFooter({ text: "\u{1F381} Guardian Bot \u2022 Giveaway System" });
}
function giveawayRerollEmbed(prize, newWinners) {
  const winnersText = newWinners.length > 0 ? newWinners.map((w) => `<@${w}>`).join(", ") : "Nema pobednika";
  return new EmbedBuilder().setColor(BotColors.CYAN).setTitle("\u{1F504} REROLL \u2014 Novi pobednici!").setDescription(
    `## ${prize}

\u{1F389} **Novi pobednik(ci):** ${winnersText}

*Novi pobednici su odabrani!*`
  ).setTimestamp().setFooter({ text: "\u{1F381} Guardian Bot \u2022 Giveaway Reroll" });
}
function eventsEmbed(guild, events) {
  const embed = new EmbedBuilder().setColor(BotColors.BLURPLE).setTitle(`\u{1F4C5} Predstoje\u0107i doga\u0111aji \u2014 ${guild.name}`).setThumbnail(guild.iconURL() ?? null).setTimestamp().setFooter({ text: "\u{1F4C5} Guardian Bot \u2022 Events System" });
  if (events.length === 0) {
    embed.setDescription(
      "> Trenutno nema zakazanih doga\u0111aja na ovom serveru."
    );
    return embed;
  }
  embed.setDescription(
    `> Prona\u0111eno **${events.length}** predstoje\u0107i(h) doga\u0111aja na serveru **${guild.name}**
\u200B`
  );
  for (const event of events.slice(0, 10)) {
    const startTs = Math.floor(event.startTime.getTime() / 1e3);
    const endTs = event.endTime ? Math.floor(event.endTime.getTime() / 1e3) : null;
    const locationStr = event.location ? `\u{1F4CD} ${event.location}` : "\u{1F4CD} Discord";
    const endStr = endTs ? `
\u23F0 Zavr\u0161ava se: <t:${endTs}:R>` : "";
    const countStr = event.userCount != null ? `
\u{1F465} Zainteresovanih: **${event.userCount}**` : "";
    embed.addFields({
      name: `\u{1F3AA} ${event.name}`,
      value: `${event.description ? `> ${event.description.slice(0, 80)}${event.description.length > 80 ? "..." : ""}
` : ""}\u{1F5D3}\uFE0F Po\u010Dinje: <t:${startTs}:F>` + endStr + `
${locationStr}` + countStr,
      inline: false
    });
  }
  return embed;
}

// src/bot/handlers/antiRaid.ts
var JOIN_THRESHOLD = 5;
var JOIN_WINDOW_MS = 1e4;
var LOCKDOWN_DURATION_MS = 5 * 60 * 1e3;
var recentJoins = /* @__PURE__ */ new Map();
var lockdownGuilds = /* @__PURE__ */ new Set();
async function lockdownGuild(member) {
  const guild = member.guild;
  if (lockdownGuilds.has(guild.id)) return;
  lockdownGuilds.add(guild.id);
  logger.warn({ guildId: guild.id }, "Raid detected \u2014 activating lockdown");
  const channels = guild.channels.cache.filter(
    (ch) => ch.type === ChannelType.GuildText && ch.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.SendMessages)
  );
  for (const [, channel] of channels) {
    try {
      if (channel.type === ChannelType.GuildText) {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false
        });
      }
    } catch {
    }
  }
  const systemChannel = guild.systemChannel;
  if (systemChannel) {
    const joinCount = recentJoins.get(guild.id)?.length ?? JOIN_THRESHOLD;
    await systemChannel.send({ embeds: [raidAlertEmbed(guild, joinCount)] });
  }
  setTimeout(async () => {
    try {
      for (const [, channel] of channels) {
        if (channel.type === ChannelType.GuildText) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: null
          });
        }
      }
      lockdownGuilds.delete(guild.id);
      recentJoins.delete(guild.id);
      if (systemChannel) {
        await systemChannel.send({ embeds: [raidUnlockEmbed(guild)] });
      }
      logger.info({ guildId: guild.id }, "Lockdown lifted");
    } catch (err) {
      logger.error({ err }, "Error lifting lockdown");
    }
  }, LOCKDOWN_DURATION_MS);
}
function registerAntiRaid(client) {
  client.on("guildMemberAdd", async (member) => {
    const guildId = member.guild.id;
    if (lockdownGuilds.has(guildId)) return;
    const now = Date.now();
    const joins = recentJoins.get(guildId) ?? [];
    const recentWindow = joins.filter((t) => now - t < JOIN_WINDOW_MS);
    recentWindow.push(now);
    recentJoins.set(guildId, recentWindow);
    logger.debug(
      { guildId, recentJoins: recentWindow.length },
      "Member joined"
    );
    if (recentWindow.length >= JOIN_THRESHOLD) {
      await lockdownGuild(member);
    }
  });
}

// src/bot/handlers/antiInvite.ts
import { ChannelType as ChannelType2 } from "discord.js";
var INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord\.(?:gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9-]+/gi;
function registerAntiInvite(client) {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (message.channel.type !== ChannelType2.GuildText) return;
    if (!INVITE_REGEX.test(message.content)) return;
    INVITE_REGEX.lastIndex = 0;
    const member = message.member;
    if (!member) return;
    if (member.permissions.has("ManageGuild")) return;
    try {
      await message.delete();
    } catch {
      return;
    }
    const channelName = message.channel.name;
    const embed = inviteDeleteEmbed(member, channelName);
    try {
      await message.channel.send({
        content: `${message.author} \u26A0\uFE0F Slanje invite linkova nije dozvoljeno!`,
        embeds: [embed]
      });
    } catch (err) {
      logger.warn({ err }, "Could not send invite warning");
    }
    logger.info(
      { userId: message.author.id, guildId: message.guild.id, channelName },
      "Invite link deleted"
    );
  });
}

// src/bot/handlers/loveCommands.ts
import {
  EmbedBuilder as EmbedBuilder2,
  ChannelType as ChannelType3
} from "discord.js";
var BotColors2 = {
  LOVE: 16731501,
  SHIP: 16745889,
  HUG: 16757575,
  SLAP: 16739125,
  PAT: 16765286,
  KISS: 16740020,
  BITE: 13178954,
  POKE: 7651580,
  CUDDLE: 16295362,
  MARRY: 16369487,
  DANCE: 10187471,
  WAVE: 4770532,
  CRY: 4756975,
  BLUSH: 16751262,
  HIGHFIVE: 5420936,
  FEED: 11066076,
  STARE: 7107965,
  ROAST: 16613152
};
var marriages = /* @__PURE__ */ new Map();
function shipPercent(id1, id2) {
  const seed = [...`${id1}${id2}`].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((seed * 7 + 13) % 101 + 100) % 101;
}
function lovePercent(id1, id2) {
  const seed = [...`${id1}love${id2}`].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((seed * 11 + 37) % 101 + 100) % 101;
}
function heartBar(percent) {
  const filled = Math.round(percent / 10);
  return "\u2764\uFE0F".repeat(filled) + "\u{1F5A4}".repeat(10 - filled);
}
function shipLabel(percent) {
  if (percent >= 90) return "\u{1F48D} Savr\u0161en par!";
  if (percent >= 75) return "\u{1F495} Jako dobro!";
  if (percent >= 60) return "\u{1F60A} Solidno!";
  if (percent >= 40) return "\u{1F914} Mo\u017Eda...";
  if (percent >= 25) return "\u{1F62C} Te\u0161ko...";
  return "\u{1F494} Nema \u0161anse!";
}
function loveLabel(percent) {
  if (percent >= 90) return "\u{1F498} Totalno zaljubljen/a!";
  if (percent >= 75) return "\u{1F493} Jako voli!";
  if (percent >= 60) return "\u{1F49B} Svi\u0111a mu/joj se!";
  if (percent >= 40) return "\u{1F499} Simpatija!";
  if (percent >= 20) return "\u{1F331} Mo\u017Eda ne\u0161to...";
  return "\u{1F976} Hladno kao led!";
}
var ROAST_MESSAGES = [
  "je poslat/a na Marss bez povratne karte \u{1F680}",
  "je ba\u010Den/a u crnu rupu \u2728",
  "je izba\u010Den/a iz galaksije \u{1F30C}",
  "je teleportovan/a na Antarktik \u{1F9CA}",
  "je zatvoren/a u pixel \u{1F5A5}\uFE0F",
  "je pretvoren/a u meme \u{1F602}",
  "je poslan/a na vje\u017Ebu u vojsku \u{1FA96}",
  "je zamijenjen/a AI botom \u{1F916}",
  "je usput nestao/la u tunelu \u{1F687}",
  "je ba\u010Den/a u zaborav \u26A1"
];
function randomRoast() {
  return ROAST_MESSAGES[Math.floor(Math.random() * ROAST_MESSAGES.length)];
}
var SOCIAL_ACTIONS = {
  hug: {
    color: BotColors2.HUG,
    emoji: "\u{1F917}",
    withTarget: [
      "{from} zagrlio/la {to}! Toplo i nje\u017Eno! \u{1F917}",
      "{from} daje {to} super zagrljaj! \u{1F49B}",
      "{from} ne pu\u0161ta {to} iz zagrljaja! \u{1F62D}"
    ]
  },
  kiss: {
    color: BotColors2.KISS,
    emoji: "\u{1F48B}",
    withTarget: [
      "{from} dao/dala {to} pusa na obraz! \u{1F48B}",
      "{from} poslao/la {to} vazdu\u0161ni cmok! \u{1F618}",
      "{from} poljubio/la {to} u \u010Delo! \u{1F496}"
    ]
  },
  slap: {
    color: BotColors2.SLAP,
    emoji: "\u{1F44B}",
    withTarget: [
      "{from} o\u0161amario/la {to}! Boli! \u{1F44B}",
      "{from} dao/dala {to} \u0161amar prve klase! \u{1F4A2}",
      "{from} opalio/la {to} jako! \u0160LJAP! \u{1F624}"
    ]
  },
  pat: {
    color: BotColors2.PAT,
    emoji: "\u{1F446}",
    withTarget: [
      "{from} milovao/la {to} po glavi! \u{1F446}",
      "{from} tap\u0161ao/la {to} - dobar si! \u{1F60A}",
      "{from} dao/dala {to} nje\u017Ean pat-pat! \u{1F4AB}"
    ]
  },
  poke: {
    color: BotColors2.POKE,
    emoji: "\u{1F449}",
    withTarget: [
      "{from} bo/la prst u {to}! Bockaaaaj! \u{1F449}",
      "{from} dirkao/la {to} da vidi je li \u017Eiv/a \u{1F602}",
      "{from} lagano bodnuo/la {to} u bok! \u{1F440}"
    ]
  },
  bite: {
    color: BotColors2.BITE,
    emoji: "\u{1F9B7}",
    withTarget: [
      "{from} ugrizao/la {to}! NOM NOM! \u{1F9B7}",
      "{from} blago ugrize {to}. Zubi su o\u0161tri! \u{1F62C}",
      "{from} dao/dala {to} mali ugriz! \u{1F42D}"
    ]
  },
  cuddle: {
    color: BotColors2.CUDDLE,
    emoji: "\u{1F970}",
    withTarget: [
      "{from} se mazio/la sa {to}! Tako slatko! \u{1F970}",
      "{from} zagrlio/la {to} i ne \u017Eeli oti\u010Di! \u{1F497}",
      "{from} i {to} su se zmazali! Bo\u017Ee, preslatko! \u{1F629}"
    ]
  },
  blush: {
    color: BotColors2.BLUSH,
    emoji: "\u{1F60A}",
    withTarget: [
      "{from} se zacrveni gledaju\u0107i {to}! \u{1F60A}",
      "{from} blago pocrvenio/la zbog {to}! \u2764\uFE0F",
      "{from} ne mo\u017Ee prestati da se smije\u0161i s {to}! \u{1F338}"
    ]
  },
  wave: {
    color: BotColors2.WAVE,
    emoji: "\u{1F44B}",
    withTarget: [
      "{from} ma\u0161e {to}! Zdravo! \u{1F44B}",
      "{from} pozdravlja {to} sa osmijehom! \u{1F604}",
      "{from} entuzijasti\u010Dno ma\u0161e prema {to}! \u{1F64C}"
    ]
  },
  dance: {
    color: BotColors2.DANCE,
    emoji: "\u{1F483}",
    solo: [
      "{from} ple\u0161e sam/a! DISCO DISCO! \u{1F57A}",
      "{from} udario/la u ples! Niko ne mo\u017Ee ga/je zaustaviti! \u{1F483}"
    ],
    withTarget: [
      "{from} poziva {to} na ples! \u{1F483}\u{1F57A}",
      "{from} i {to} ple\u0161u zajedno! Odli\u010Dno! \u{1F3B6}",
      "{from} vodi {to} na plesni podij! \u2728"
    ]
  },
  highfive: {
    color: BotColors2.HIGHFIVE,
    emoji: "\u{1F64C}",
    withTarget: [
      "{from} dao/dala high five sa {to}! \u{1F64C} POGODAK!",
      "{from} i {to} \u2014 savr\u0161en high five! \u{1F91C}\u{1F91B}",
      "{from} lebde\u0107i high five za {to}! PAF! \u270B"
    ]
  },
  feed: {
    color: BotColors2.FEED,
    emoji: "\u{1F355}",
    withTarget: [
      "{from} hrani {to} \u2014 aaa, otvori usta! \u{1F355}",
      "{from} donio/la {to} ne\u0161to ukusno! \u{1F371}",
      "{from} priprema {to} ku\u0107ni obrok! \u{1F373}"
    ]
  },
  stare: {
    color: BotColors2.STARE,
    emoji: "\u{1F440}",
    withTarget: [
      "{from} buljio/la u {to}... dugo i uporno... \u{1F440}",
      "{from} ne mo\u017Ee skinuti pogled s {to}! \u{1F636}",
      "{from} gleda {to} kao da ne\u0161to planira... \u{1F914}"
    ]
  },
  cry: {
    color: BotColors2.CRY,
    emoji: "\u{1F62D}",
    solo: [
      "{from} pla\u010De... ko ga/je utje\u0161i? \u{1F62D}",
      "{from} je u suzama! Ne pla\u010Di! \u{1F4A7}",
      "{from} je totalno razbijen/a! \u{1F622}"
    ],
    withTarget: [
      "{from} pla\u010De pred {to}! Utje\u0161i ih! \u{1F62D}",
      "{from} izlio/izlila suze na {to}! \u{1F4A6}"
    ]
  },
  smile: {
    color: BotColors2.LOVE,
    emoji: "\u{1F60A}",
    withTarget: [
      "{from} se nasmije\u0161io/la na {to}! Sunce zasjalo! \u2600\uFE0F",
      "{from} daje {to} najljep\u0161i osmijeh! \u{1F60A}",
      "{from} se topi od osmijeha prema {to}! \u{1F338}"
    ]
  },
  lick: {
    color: BotColors2.BITE,
    emoji: "\u{1F445}",
    withTarget: [
      "{from} polizao/la {to} po obrazu! \u0160ta?? \u{1F602}",
      "{from} li\u017Ee {to} \u2014 nema obja\u0161njenja! \u{1F61C}",
      "{from} dao/dala {to} iznenadni lick! Weirdo! \u{1F602}"
    ]
  }
};
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function formatText(template, from, to) {
  return template.replace("{from}", `**${from.displayName}**`).replace("{to}", to ? `**${to.displayName}**` : "**???**");
}
async function handleSocialAction(message, command, def) {
  const mentioned = message.mentions.users.first();
  if (!mentioned && !def.solo) {
    await message.reply({
      embeds: [
        new EmbedBuilder2().setColor(def.color).setDescription(`${def.emoji} Mora\u0161 ozna\u010Diti nekoga! \`${command} @korisnik\``)
      ]
    });
    return;
  }
  const templates = mentioned ? def.withTarget : def.solo ?? def.withTarget;
  const text = formatText(pickRandom(templates), message.author, mentioned ?? void 0);
  const embed = new EmbedBuilder2().setColor(def.color).setDescription(text).setTimestamp().setFooter({ text: `\u{1F495} Love System \u2022 Guardian Bot` });
  await message.reply({ embeds: [embed] });
}
function registerLoveCommands(client) {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType3.GuildText) return;
    if (!message.content.startsWith(".")) return;
    const args = message.content.slice(1).trim().split(/\s+/);
    const command = args[0]?.toLowerCase();
    if (!command) return;
    try {
      if (command === "ship") {
        const users = message.mentions.users;
        let u1;
        let u2;
        if (users.size >= 2) {
          const arr = [...users.values()];
          u1 = arr[0];
          u2 = arr[1];
        } else if (users.size === 1) {
          u1 = message.author;
          u2 = users.first();
        } else {
          await message.reply("`Koristi: .ship @korisnik1 @korisnik2`");
          return;
        }
        const percent = shipPercent(u1.id, u2.id);
        const bar = heartBar(Math.round(percent / 10) * 10);
        const label = shipLabel(percent);
        const shipName = u1.displayName.slice(0, 3) + u2.displayName.slice(-3);
        const embed = new EmbedBuilder2().setColor(BotColors2.SHIP).setTitle(`\u{1F498} Ship: ${shipName}`).setDescription(
          `**${u1.displayName}** \u{1F495} **${u2.displayName}**

${bar}

**${percent}%** kompatibilnosti
*${label}*`
        ).setThumbnail(u1.displayAvatarURL()).setTimestamp().setFooter({ text: "\u{1F495} Love System \u2022 Guardian Bot" });
        await message.channel.send({ embeds: [embed] });
        return;
      }
      if (command === "love") {
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply("`Koristi: .love @korisnik`");
          return;
        }
        const percent = lovePercent(message.author.id, mentioned.id);
        const bar = heartBar(Math.round(percent / 10) * 10);
        const label = loveLabel(percent);
        const embed = new EmbedBuilder2().setColor(BotColors2.LOVE).setTitle(`\u2764\uFE0F Love metar`).setDescription(
          `**${message.author.displayName}** \u2764\uFE0F **${mentioned.displayName}**

${bar}

**${percent}%** ljubavi
*${label}*`
        ).setThumbnail(mentioned.displayAvatarURL()).setTimestamp().setFooter({ text: "\u{1F495} Love System \u2022 Guardian Bot" });
        await message.channel.send({ embeds: [embed] });
        return;
      }
      if (command === "marry") {
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply("`Koristi: .marry @korisnik`");
          return;
        }
        if (mentioned.id === message.author.id) {
          await message.reply("\u274C Ne mo\u017Ee\u0161 se vjen\u010Dati sam/a sa sobom!");
          return;
        }
        const existingPartner = marriages.get(message.author.id);
        if (existingPartner) {
          await message.reply(
            `\u274C Ve\u0107 si u braku! Koristi \`.divorce\` da se razvede\u0161 prvo.`
          );
          return;
        }
        if (marriages.get(mentioned.id)) {
          await message.reply(`\u274C **${mentioned.displayName}** je ve\u0107 u braku!`);
          return;
        }
        marriages.set(message.author.id, mentioned.id);
        marriages.set(mentioned.id, message.author.id);
        const embed = new EmbedBuilder2().setColor(BotColors2.MARRY).setTitle("\u{1F48D} Vjen\u010Danje!").setDescription(
          `\u{1F38A} **${message.author.displayName}** i **${mentioned.displayName}** su sada **u braku**!

> \u010Cestitamo mladencima! \u{1F492}

*Koristi \`.divorce\` za razvod.*`
        ).setThumbnail(mentioned.displayAvatarURL()).setTimestamp().setFooter({ text: "\u{1F48D} Love System \u2022 Guardian Bot" });
        await message.channel.send({ embeds: [embed] });
        return;
      }
      if (command === "divorce") {
        const partnerId = marriages.get(message.author.id);
        if (!partnerId) {
          await message.reply("\u274C Nisi u braku!");
          return;
        }
        marriages.delete(message.author.id);
        marriages.delete(partnerId);
        const embed = new EmbedBuilder2().setColor(7107965).setTitle("\u{1F494} Razvod").setDescription(
          `**${message.author.displayName}** je zatra\u017Eio/la razvod.

> Brak je zavr\u0161en. Sretno u daljem \u017Eivotu! \u{1F54A}\uFE0F`
        ).setTimestamp().setFooter({ text: "\u{1F494} Love System \u2022 Guardian Bot" });
        await message.channel.send({ embeds: [embed] });
        return;
      }
      if (command === "partner") {
        const targetUser = message.mentions.users.first() ?? message.author;
        const partnerId = marriages.get(targetUser.id);
        if (!partnerId) {
          await message.channel.send({
            embeds: [
              new EmbedBuilder2().setColor(7107965).setDescription(
                `\u{1F494} **${targetUser.displayName}** trenutno nije u braku.`
              )
            ]
          });
          return;
        }
        try {
          const partner = await client.users.fetch(partnerId);
          const embed = new EmbedBuilder2().setColor(BotColors2.MARRY).setTitle("\u{1F48D} Bra\u010Dni status").setDescription(
            `**${targetUser.displayName}** je u braku sa **${partner.displayName}**! \u{1F492}`
          ).setThumbnail(partner.displayAvatarURL()).setTimestamp().setFooter({ text: "\u{1F48D} Love System \u2022 Guardian Bot" });
          await message.reply({ embeds: [embed] });
        } catch {
          await message.reply("\u274C Gre\u0161ka pri u\u010Ditavanju partnera.");
        }
        return;
      }
      if (command === "fuck") {
        const mentioned = message.mentions.users.first();
        if (!mentioned) {
          await message.reply("`Koristi: .fuck @korisnik`");
          return;
        }
        if (mentioned.id === message.author.id) {
          await message.reply("\u{1F926} Nemogu\u0107e je 'fuckati' samog/samu sebe.");
          return;
        }
        const roast = randomRoast();
        const embed = new EmbedBuilder2().setColor(BotColors2.ROAST).setTitle("\u{1F680} Odleti!").setDescription(
          `**${message.author.displayName}** \u0161alje **${mentioned.displayName}** na put!

> **${mentioned.displayName}** ${roast}`
        ).setTimestamp().setFooter({ text: "\u{1F602} Love System \u2022 Guardian Bot" });
        await message.channel.send({ embeds: [embed] });
        return;
      }
      if (command === "lovecmds" || command === "lovehelp") {
        const embed = new EmbedBuilder2().setColor(BotColors2.LOVE).setTitle("\u{1F495} Love & Social komande").setDescription("Sve dostupne love/social komande:").addFields(
          {
            name: "\u{1F498} Ljubav & Brak",
            value: "`.ship @a @b` \u2014 kompatibilnost para\n`.love @a` \u2014 love metar\n`.marry @a` \u2014 vjen\u010Daj se\n`.divorce` \u2014 razvedi se\n`.partner` \u2014 provjeri ko je \u010Diji brak",
            inline: false
          },
          {
            name: "\u{1F917} Nje\u017Ene akcije",
            value: "`.hug @a` \u2014 zagrli\n`.kiss @a` \u2014 daj pusa\n`.pat @a` \u2014 pomiluj po glavi\n`.cuddle @a` \u2014 mazi se\n`.blush @a` \u2014 zacrveni se\n`.smile @a` \u2014 nasmije\u0161i se\n`.feed @a` \u2014 nahrani",
            inline: true
          },
          {
            name: "\u{1F602} Zabavne akcije",
            value: "`.slap @a` \u2014 o\u0161amari\n`.poke @a` \u2014 bockaj\n`.bite @a` \u2014 ugrizi\n`.lick @a` \u2014 poli\u017Ei\n`.stare @a` \u2014 bulji\n`.wave @a` \u2014 mahni\n`.highfive @a` \u2014 high five",
            inline: true
          },
          {
            name: "\u{1F3AD} Ostalo",
            value: "`.dance` / `.dance @a` \u2014 ple\u0161i\n`.cry` / `.cry @a` \u2014 pla\u010Di\n`.fuck @a` \u2014 po\u0161alji nekoga u svemir \u{1F680}",
            inline: false
          }
        ).setTimestamp().setFooter({ text: "\u{1F495} Love System \u2022 Guardian Bot" });
        await message.channel.send({ embeds: [embed] });
        return;
      }
      const actionDef = SOCIAL_ACTIONS[command];
      if (actionDef) {
        await handleSocialAction(message, command, actionDef);
        return;
      }
    } catch (err) {
      logger.error({ err, command }, "Love command error");
    }
  });
}

// src/bot/commands/events.ts
var events_exports = {};
__export(events_exports, {
  data: () => data,
  execute: () => execute
});
import {
  SlashCommandBuilder,
  GuildScheduledEventStatus
} from "discord.js";
var data = new SlashCommandBuilder().setName("events").setDescription("\u{1F4C5} Prika\u017Ei predstoje\u0107e doga\u0111aje na serveru");
async function execute(interaction) {
  if (!interaction.guild) {
    await interaction.reply({
      embeds: [errorEmbed("Gre\u0161ka", "Ova komanda je dostupna samo na serverima.")],
      ephemeral: true
    });
    return;
  }
  await interaction.deferReply();
  try {
    const scheduledEvents = await interaction.guild.scheduledEvents.fetch();
    const upcoming = scheduledEvents.filter(
      (e) => e.status === GuildScheduledEventStatus.Scheduled || e.status === GuildScheduledEventStatus.Active
    ).map((e) => ({
      name: e.name,
      description: e.description,
      startTime: e.scheduledStartAt ?? /* @__PURE__ */ new Date(),
      endTime: e.scheduledEndAt ?? null,
      location: e.entityMetadata?.location ?? (e.channel ? `#${e.channel.name}` : null),
      userCount: e.userCount
    })).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    if (upcoming.length === 0) {
      await interaction.editReply({
        embeds: [
          infoEmbed(
            "Nema doga\u0111aja",
            "Trenutno nema zakazanih doga\u0111aja na ovom serveru.\n\nAdmini mogu kreirati doga\u0111aje putem **Server Events** sekcije."
          )
        ]
      });
      return;
    }
    await interaction.editReply({
      embeds: [eventsEmbed(interaction.guild, upcoming)]
    });
  } catch (err) {
    await interaction.editReply({
      embeds: [
        errorEmbed(
          "Gre\u0161ka",
          "Nije mogu\u0107e u\u010Ditati doga\u0111aje. Provjeri da bot ima odgovaraju\u0107e dozvole."
        )
      ]
    });
  }
}

// src/bot/commands/gws.ts
var gws_exports = {};
__export(gws_exports, {
  data: () => data2,
  execute: () => execute2
});
import {
  SlashCommandBuilder as SlashCommandBuilder2,
  ChannelType as ChannelType4
} from "discord.js";
var activeGiveaways = /* @__PURE__ */ new Map();
async function pickWinners(message, count) {
  try {
    const reaction = message.reactions.cache.get("\u{1F389}");
    if (!reaction) return [];
    const users = await reaction.users.fetch();
    const eligible = users.filter((u) => !u.bot).map((u) => u.id);
    if (eligible.length === 0) return [];
    const shuffled = eligible.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  } catch {
    return [];
  }
}
async function endGiveaway(giveaway, channel) {
  giveaway.ended = true;
  let message = null;
  try {
    message = await channel.messages.fetch(giveaway.messageId);
  } catch {
    return;
  }
  const winners = await pickWinners(message, giveaway.winners);
  await message.edit({
    embeds: [giveawayEndEmbed(giveaway.prize, winners)]
  });
  const winnersText = winners.length > 0 ? `\u{1F389} Pobednik(ci): ${winners.map((w) => `<@${w}>`).join(", ")}` : "Nema pobednika \u2014 niko nije reagovao.";
  await channel.send({
    content: `\u{1F3C6} **GIVEAWAY ZAVR\u0160EN** \u2014 ${giveaway.prize}
${winnersText}`,
    reply: { messageReference: giveaway.messageId }
  });
  logger.info({ giveawayId: giveaway.messageId, winners }, "Giveaway ended");
}
var data2 = new SlashCommandBuilder2().setName("gws").setDescription("\u{1F389} Giveaway sistem").addSubcommand(
  (sub) => sub.setName("create").setDescription("\u{1F381} Pokreni novi giveaway").addStringOption(
    (opt) => opt.setName("nagrada").setDescription("\u0160ta se osvaja?").setRequired(true)
  ).addIntegerOption(
    (opt) => opt.setName("trajanje").setDescription("Trajanje u minutima (npr. 60)").setMinValue(1).setMaxValue(43200).setRequired(true)
  ).addIntegerOption(
    (opt) => opt.setName("pobednici").setDescription("Broj pobednika (default: 1)").setMinValue(1).setMaxValue(20).setRequired(false)
  )
).addSubcommand(
  (sub) => sub.setName("end").setDescription("\u{1F6D1} Zavr\u0161i giveaway pre vremena").addStringOption(
    (opt) => opt.setName("message_id").setDescription("ID poruke giveaway-a").setRequired(true)
  )
).addSubcommand(
  (sub) => sub.setName("reroll").setDescription("\u{1F504} Rerollaj pobednike giveaway-a").addStringOption(
    (opt) => opt.setName("message_id").setDescription("ID poruke giveaway-a").setRequired(true)
  )
);
async function execute2(interaction) {
  if (!interaction.guild) {
    await interaction.reply({
      embeds: [errorEmbed("Gre\u0161ka", "Ova komanda radi samo na serverima.")],
      ephemeral: true
    });
    return;
  }
  const sub = interaction.options.getSubcommand();
  if (sub === "create") {
    const prize = interaction.options.getString("nagrada", true);
    const durationMin = interaction.options.getInteger("trajanje", true);
    const winnersCount = interaction.options.getInteger("pobednici") ?? 1;
    if (interaction.channel?.type !== ChannelType4.GuildText) {
      await interaction.reply({
        embeds: [
          errorEmbed("Gre\u0161ka", "Giveaway se mo\u017Ee pokrenuti samo u tekst kanalima.")
        ],
        ephemeral: true
      });
      return;
    }
    const endTime = new Date(Date.now() + durationMin * 60 * 1e3);
    const embed = giveawayStartEmbed(prize, winnersCount, endTime, interaction.user);
    await interaction.reply({
      embeds: [
        successEmbed(
          "Giveaway pokrenut!",
          `\u{1F389} Giveaway za **${prize}** je po\u010Deo u ovom kanalu!`
        )
      ],
      ephemeral: true
    });
    const msg = await interaction.channel.send({
      embeds: [embed]
    });
    await msg.react("\u{1F389}");
    const giveaway = {
      messageId: msg.id,
      channelId: msg.channelId,
      guildId: interaction.guild.id,
      prize,
      winners: winnersCount,
      endTime,
      hostedBy: interaction.user.id,
      ended: false
    };
    activeGiveaways.set(msg.id, giveaway);
    setTimeout(async () => {
      const current = activeGiveaways.get(msg.id);
      if (!current || current.ended) return;
      await endGiveaway(current, interaction.channel);
    }, durationMin * 60 * 1e3);
    logger.info(
      { giveawayId: msg.id, prize, durationMin, winnersCount },
      "Giveaway created"
    );
    return;
  }
  if (sub === "end") {
    const messageId = interaction.options.getString("message_id", true);
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Giveaway nije prona\u0111en",
            "Provjeri ID poruke \u2014 giveaway mo\u017Eda ve\u0107 nije aktivan ili je ID pogre\u0161an."
          )
        ],
        ephemeral: true
      });
      return;
    }
    if (giveaway.ended) {
      await interaction.reply({
        embeds: [errorEmbed("Giveaway je ve\u0107 zavr\u0161en", "Ovaj giveaway je ve\u0107 zavr\u0161io.")],
        ephemeral: true
      });
      return;
    }
    if (interaction.channel?.type !== ChannelType4.GuildText) return;
    await interaction.deferReply({ ephemeral: true });
    await endGiveaway(giveaway, interaction.channel);
    await interaction.editReply({
      embeds: [successEmbed("Giveaway zavr\u0161en", `Giveaway za **${giveaway.prize}** je ru\u010Dno zavr\u0161en.`)]
    });
    return;
  }
  if (sub === "reroll") {
    const messageId = interaction.options.getString("message_id", true);
    const giveaway = activeGiveaways.get(messageId);
    if (!giveaway) {
      await interaction.reply({
        embeds: [
          errorEmbed(
            "Giveaway nije prona\u0111en",
            "Provjeri ID poruke."
          )
        ],
        ephemeral: true
      });
      return;
    }
    if (interaction.channel?.type !== ChannelType4.GuildText) return;
    await interaction.deferReply({ ephemeral: true });
    let message = null;
    try {
      message = await interaction.channel.messages.fetch(messageId);
    } catch {
      await interaction.editReply({
        embeds: [errorEmbed("Gre\u0161ka", "Nije mogu\u0107e u\u010Ditati poruku giveaway-a.")]
      });
      return;
    }
    const newWinners = await pickWinners(message, giveaway.winners);
    const embed = giveawayRerollEmbed(giveaway.prize, newWinners);
    await interaction.channel.send({
      embeds: [embed],
      reply: { messageReference: messageId }
    });
    await interaction.editReply({
      embeds: [
        successEmbed(
          "Reroll zavr\u0161en",
          `Novi pobednici za **${giveaway.prize}** su odabrani!`
        )
      ]
    });
    logger.info({ giveawayId: messageId, newWinners }, "Giveaway rerolled");
    return;
  }
}

// src/bot/index.ts
var commands = [events_exports, gws_exports];
async function startBot() {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) {
    logger.warn("DISCORD_TOKEN not set \u2014 bot will not start");
    return;
  }
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildScheduledEvents
    ]
  });
  registerAntiRaid(client);
  registerAntiInvite(client);
  registerLoveCommands(client);
  client.once("ready", async (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "Discord bot ready");
    readyClient.user.setPresence({
      activities: [
        {
          name: "\u{1F6E1}\uFE0F Server za\u0161tita aktivna",
          type: ActivityType.Watching
        }
      ],
      status: "online"
    });
    const rest = new REST().setToken(token);
    const commandData = commands.map((c) => c.data.toJSON());
    try {
      await rest.put(Routes.applicationCommands(readyClient.user.id), {
        body: commandData
      });
      logger.info("Slash commands registered globally");
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }
    for (const guild of readyClient.guilds.cache.values()) {
      try {
        const systemChannel = guild.systemChannel;
        if (systemChannel) {
          await systemChannel.send({
            embeds: [
              successEmbed(
                "\u{1F6E1}\uFE0F Guardian Bot je online!",
                `Bot je uspje\u0161no pokrenut i spreman za za\u0161titu servera **${guild.name}**!

**Aktivirani sistemi:**
> \u{1F6A8} **Anti-Raid** \u2014 automatska za\u0161tita od mass join napada
> \u{1F517} **Anti-Invite** \u2014 blokiranje invite linkova u chatovima
> \u{1F4C5} \`/events\` \u2014 pregled serverskih doga\u0111aja
> \u{1F389} \`/gws\` \u2014 giveaway sistem (create / end / reroll)

*Svi sistemi su aktivni i rade u realnom vremenu.*`
              )
            ]
          });
        }
      } catch {
      }
    }
  });
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commands.find((c) => c.data.name === interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, "Command error");
      const errorPayload = {
        content: "\u274C Gre\u0161ka pri izvr\u0161avanju komande. Poku\u0161aj ponovo.",
        ephemeral: true
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorPayload);
      } else {
        await interaction.reply(errorPayload);
      }
    }
  });
  client.on("error", (err) => {
    const msg = err.message ?? String(err);
    if (msg.includes("disallowed intents") || msg.includes("Disallowed intents")) {
      logger.error(
        "\u274C Privilegovani intenti nisu uklju\u010Deni! Idi na:\n   https://discord.com/developers/applications \u2192 tvoja aplikacija \u2192 Bot\n   \u2705 Uklju\u010Di: SERVER MEMBERS INTENT\n   \u2705 Uklju\u010Di: MESSAGE CONTENT INTENT\n   Zatim restart workflow."
      );
    } else {
      logger.error({ err }, "Discord client error");
    }
  });
  client.on("warn", (info) => {
    logger.warn({ info }, "Discord client warning");
  });
  try {
    await client.login(token);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("disallowed intents") || msg.includes("Used disallowed")) {
      logger.error(
        "\n\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551  \u26A0\uFE0F  PRIVILEGOVANI INTENTI NISU UKLJU\u010CENI!           \u2551\n\u2551                                                      \u2551\n\u2551  Idi na Discord Developer Portal:                    \u2551\n\u2551  discord.com/developers/applications                 \u2551\n\u2551                                                      \u2551\n\u2551  \u2192 Tvoja aplikacija \u2192 Bot tab                       \u2551\n\u2551  \u2705 Uklju\u010Di: SERVER MEMBERS INTENT                  \u2551\n\u2551  \u2705 Uklju\u010Di: MESSAGE CONTENT INTENT                 \u2551\n\u2551                                                      \u2551\n\u2551  Sa\u010Duvaj pa restartuj ovaj workflow.                 \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n"
      );
    } else {
      throw err;
    }
  }
}

// src/index.ts
logger.info("Starting Guardian Bot...");
startBot().catch((err) => {
  logger.error({ err }, "Fatal error starting bot");
  process.exit(1);
});
