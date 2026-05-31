import { startBot } from "./index.js";

  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];
  const guildId = process.env["DISCORD_GUILD_ID"]; // opciono — za instant komande

  if (!token || !clientId) {
    console.error("[ERROR] DISCORD_TOKEN i DISCORD_CLIENT_ID moraju biti postavljeni!");
    process.exit(1);
  }

  if (guildId) {
    console.log("[INFO] Guild ID detektovan — komande se registruju TRENUTNO za server:", guildId);
  } else {
    console.log("[WARN] Nema DISCORD_GUILD_ID — globalne komande (do 1h da se pojave)");
  }

  console.log("[INFO] Pokretanje Kefalica bota...");
  startBot(token, clientId, guildId);
  