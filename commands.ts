import {
  SlashCommandBuilder,
  REST,
  Routes,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { logger } from "./logger.js";

export const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  new SlashCommandBuilder()
    .setName("set")
    .setDescription("Poveži igru sa ovim kanalom")
    .addStringOption((o) =>
      o
        .setName("igra")
        .setDescription("Odaberi igru")
        .setRequired(true)
        .addChoices(
          { name: "Kaladont", value: "kaladont" },
          { name: "Toplo Hladno", value: "toplo-hladno" },
          { name: "Wordle", value: "wordle" },
          { name: "Mafia", value: "mafia" },
        )
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("unset")
    .setDescription("Ukloni igru iz ovog kanala")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("start")
    .setDescription("Startuj igru u ovom kanalu")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stopira aktivnu igru u ovom kanalu")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Pridruži se igri koja čeka igrače")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("solo")
    .setDescription("Startuj solo igru")
    .addStringOption((o) =>
      o
        .setName("igra")
        .setDescription("Odaberi igru")
        .setRequired(true)
        .addChoices(
          { name: "Milioner", value: "milioner" },
          { name: "Skočko", value: "skocko" },
        )
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Prikaži rang listu pobednika")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Prikaži tvoj Discord avatar")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("quest")
    .setDescription("Prikaži trenutni zadatak za Kaladont")
    .toJSON(),
];

export async function registerCommands(token: string, clientId: string, guildId?: string): Promise<void> {
  const rest = new REST().setToken(token);
  try {
    if (guildId) {
      logger.info("Registrujem komande za server (instant)...");
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logger.info("Komande registrovane za server!");
    } else {
      logger.info("Registrujem globalne komande...");
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.info("Globalne komande registrovane.");
    }
  } catch (err) {
    logger.error({ err }, "Greška pri registraciji komandi");
  }
}
