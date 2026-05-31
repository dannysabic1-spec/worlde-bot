# Kefalica Bot

  ## Instalacija
  ```bash
  npm install
  npm run build
  ```

  ## Env varijable
  Kopiraj `.env.example` u `.env` i popuni:
  ```
  DISCORD_TOKEN=tvoj_token
  DISCORD_CLIENT_ID=tvoj_client_id
  DISCORD_GUILD_ID=id_servera    <-- za INSTANT komande (preporučeno)
  ```

  **DISCORD_GUILD_ID** = desni klik na server → Copy Server ID  
  (mora biti uključen Developer Mode: Settings → Advanced → Developer Mode)

  ## Pokretanje
  ```bash
  node --env-file=.env dist/main.js
  ```

  ## Komande
  | Komanda | Opis |
  |---------|------|
  | /set kaladont\|toplo-hladno\|wordle\|mafia | Igra za kanal |
  | /unset | Ukloni igru |
  | /start | Pokreni igru odmah (bez čekanja!) |
  | /join | Pridruži se Kaladont/Mafia igri |
  | /stop | Zaustavi igru |
  | /solo milioner\|skocko | Solo igra |
  | /rank | Rang lista |
  | /quest | Trenutni zadatak (Kaladont) |
  