# Kefalica Bot

  ## Pokretanje

  1. Instaliraj zavisnosti:
  ```
  npm install
  ```

  2. Napravi `.env` fajl:
  ```
  DISCORD_TOKEN=tvoj_token
  DISCORD_CLIENT_ID=tvoj_client_id
  ```

  3. Pokreni bota:
  ```
  node --env-file=.env --loader ts-node/esm index.ts
  ```

  Ili kompajliraj pa pokreni:
  ```
  npm run build
  node --env-file=.env dist/index.js
  ```

  ## Igre
  - /set kaladont | toplo-hladno | wordle | mafia
  - /start — pokreni igru
  - /join — pridruži se
  - /stop — zaustavi
  - /solo milioner | skocko
  - /rank — rang lista
  - /quest — trenutni zadatak
  