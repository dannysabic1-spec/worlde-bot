# Kefalica Bot

  ## Instalacija

  ```bash
  npm install
  npm run build
  ```

  ## Env varijable

  Napravi `.env` fajl (ili postavi na hostu):
  ```
  DISCORD_TOKEN=tvoj_token
  DISCORD_CLIENT_ID=tvoj_client_id
  ```

  ## Pokretanje

  ```bash
  # Sa .env fajlom (lokalno)
  node --env-file=.env dist/main.js

  # Ili npm start (podesi env varijable u sistemu/hostu)
  npm start
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
  