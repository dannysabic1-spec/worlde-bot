# Kefalica Bot

  ## Instalacija

  ```bash
  npm install
  npm run build
  ```

  ## Env varijable

  Napravi `.env` fajl:
  ```
  DISCORD_TOKEN=tvoj_token
  DISCORD_CLIENT_ID=tvoj_client_id
  DISCORD_GUILD_ID=id_servera   <-- VAŽNO: ovo daje INSTANT komande!
  ```

  ### Kako naći DISCORD_GUILD_ID?
  Discord → Server Settings → Widget → Server ID
  Ili desni klik na server (sa Developer Mode uključenim) → Copy Server ID

  ## Pokretanje

  ```bash
  node --env-file=.env dist/main.js
  ```

  ## Komande
  - `/set kaladont|toplo-hladno|wordle|mafia` — poveži igru sa kanalom
  - `/unset` — ukloni igru
  - `/start` — pokreni igru
  - `/join` — pridruži se
  - `/stop` — zaustavi
  - `/solo milioner|skocko` — solo igre
  - `/rank` — rang lista
  - `/quest` — trenutni zadatak
  