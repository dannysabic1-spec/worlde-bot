import { startBot } from "./index.js";

  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];

  if (!token || !clientId) {
    console.error("[ERROR] DISCORD_TOKEN i DISCORD_CLIENT_ID moraju biti postavljeni!");
    console.error("Napravi .env fajl ili postavi environment variables na hostu.");
    process.exit(1);
  }

  console.log("[INFO] Pokretanje Kefalica bota...");
  startBot(token, clientId);
  