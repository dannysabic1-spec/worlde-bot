# Kefalica Bot

  ## Instalacija
  ```bash
  npm install && npm run build
  ```

  ## Env varijable (.env fajl)
  ```
  DISCORD_TOKEN=tvoj_token
  DISCORD_CLIENT_ID=tvoj_client_id
  DISCORD_GUILD_ID=id_servera    <-- za INSTANT komande!
  ```

  **DISCORD_GUILD_ID** = desni klik na server u Discordu → Copy Server ID  
  (mora biti uključen Developer Mode: User Settings → Advanced → Developer Mode)

  ## Pokretanje
  ```bash
  node --env-file=.env dist/main.js
  ```

  ## Komande
  | Komanda | Opis |
  |---------|------|
  | /set kaladont\|toplo-hladno\|wordle\|mafia | Poveži igru sa kanalom |
  | /unset | Ukloni igru iz kanala |
  | /start | Pokreni igru |
  | /join | Pridruži se igri |
  | /stop | Zaustavi igru |
  | /solo milioner\|skocko | Solo igra |
  | /rank | Rang lista |
  | /quest | Trenutni zadatak (Kaladont) |
  