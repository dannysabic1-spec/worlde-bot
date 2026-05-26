========================================
           GIANNI BOT — Setup
========================================

1. Instaliraj Node.js 18+ (nodejs.org)
2. Otvori terminal u ovom folderu
3. Kopiraj .env.example u .env:
     cp .env.example .env
4. Uredi .env i unesi token:
     DISCORD_TOKEN=tvoj_token_ovdje
5. Pokreni:
     npm install
     node bot.js

VAZNO — Discord Developer Portal:
  discord.com/developers/applications
  -> Tvoja aplikacija -> Bot tab:
  [ ] SERVER MEMBERS INTENT   (UKLJUCI)
  [ ] MESSAGE CONTENT INTENT  (UKLJUCI)

========================================
  KOMANDE (sve na . prefix)
========================================

ZAŠTITA (automatska):
  Anti-Raid, Anti-Invite uvijek aktivan

SERVER INFO:
  .events          - predstojeći događaji
  .serverinfo      - info o serveru
  .userinfo [@k]   - info o korisniku

GIVEAWAY:
  .gws create <nagrada> <minute>
  .gws end <message_id>
  .gws reroll <message_id>

WORDLE:
  .wordle set #kanal
  .wordle start
  .wordle stop

MODERACIJA (mod+):
  .warn @k <razlog>    (1h cooldown)
  .warnings @k
  .clearwarn @k        (admin only)

DM (samo vlasnik):
  .dmaktive <poruka>

ZABAVA:
  .tinder [@k]

LOVE/SFW:
  .ship @a @b
  .love @k  .marry @k  .divorce  .partner
  .hug .kiss .pat .cuddle .blush .smile
  .feed .wave .slap .poke .bite .lick
  .stare .highfive .dance .cry .wink
  .nod .sleep .laugh .shrug .fuck (roast)

NSFW (samo u nsfw kanalima):
  .fucknsfw @k
  .daddy @k
  .mommy @k

========================================
  HOSTING (VPS/Railway/Render)
========================================

Railway.app (besplatno):
  1. railway.app -> New Project -> Deploy from GitHub
  2. Dodaj DISCORD_TOKEN u Environment Variables
  3. Start command: node bot.js

Render.com (besplatno):
  1. render.com -> New -> Web Service
  2. Environment: Node
  3. Build: npm install
  4. Start: node bot.js
  5. Dodaj DISCORD_TOKEN u Environment Variables

VPS (Ubuntu):
  npm install pm2 -g
  pm2 start bot.js --name gianni
  pm2 save
  pm2 startup

========================================
