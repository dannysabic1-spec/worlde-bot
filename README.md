# 🛡️ Guardian Bot

Discord bot sa kompletnim sistemima zaštite i zabave za vaš server.

## ✨ Funkcionalnosti

| Sistem | Opis |
|--------|------|
| 🚨 **Anti-Raid** | Automatski lockdown servera ako 5+ korisnika uđe za 10 sekundi |
| 🔗 **Anti-Invite** | Automatsko brisanje Discord invite linkova u chatovima |
| 📅 `/events` | Pregled predstojeće događaja na serveru |
| 🎉 `/gws` | Giveaway sistem — create / end / reroll |
| 💕 **Love System** | 20+ fun social komandi sa lepim embed porukama |

---

## 🚀 Pokretanje

### 1. Kloniraj repo

```bash
git clone https://github.com/tvoj-username/guardian-bot.git
cd guardian-bot
```

### 2. Instaliraj dependencies

```bash
npm install
```

### 3. Napravi `.env` fajl

```bash
cp .env.example .env
```

Otvori `.env` i upiši svoj Discord token:

```env
DISCORD_TOKEN=tvoj_token_ovdje
```

### 4. Uključi Privilegovane Intente

Idi na [discord.com/developers/applications](https://discord.com/developers/applications):
- → Tvoja aplikacija → **Bot** tab
- ✅ Uključi **SERVER MEMBERS INTENT**
- ✅ Uključi **MESSAGE CONTENT INTENT**
- Klikni **Save Changes**

### 5. Pokreni bota

```bash
# Development (auto-reload)
npm run dev

# Production (build + start)
npm run build
npm start
```

---

## 💕 Love System komande

| Komanda | Opis |
|---------|------|
| `.ship @a @b` | Kompatibilnost para (0–100%) sa heart barom |
| `.love @a` | Love metar između tebe i nekoga |
| `.marry @a` | Vjenčaj se (čuva se dok bot radi) |
| `.divorce` | Razvedi se |
| `.partner` | Provjeri ko je u braku |
| `.hug @a` | Zagrli nekoga |
| `.kiss @a` | Daj pusu na obraz |
| `.pat @a` | Pomiluj po glavi |
| `.cuddle @a` | Mazi se |
| `.slap @a` | Ošamari |
| `.poke @a` | Bockaj |
| `.bite @a` | Ugrizi |
| `.lick @a` | Poliži 😂 |
| `.stare @a` | Bulji u nekoga |
| `.wave @a` | Mahni nekome |
| `.blush @a` | Zacrveni se |
| `.smile @a` | Nasmiješi se |
| `.highfive @a` | High five! |
| `.feed @a` | Nahrani nekoga |
| `.dance` / `.dance @a` | Pleši sam ili s nekim |
| `.cry` / `.cry @a` | Plači |
| `.fuck @a` | Pošalji nekoga u svemir 🚀 |
| `.lovecmds` | Prikaži sve love komande |

---

## 🎉 Giveaway komande

| Komanda | Opis |
|---------|------|
| `/gws create` | Pokreni novi giveaway |
| `/gws end` | Završi giveaway prije vremena |
| `/gws reroll` | Rerollaj pobjednike |

---

## 📁 Struktura projekta

```
src/
├── index.ts                    # Entry point
├── lib/
│   └── logger.ts               # Pino logger
└── bot/
    ├── index.ts                # Bot inicijalizacija + slash commands
    ├── commands/
    │   ├── events.ts           # /events slash command
    │   └── gws.ts              # /gws slash command (giveaway)
    ├── handlers/
    │   ├── antiRaid.ts         # Anti-raid sistem
    │   ├── antiInvite.ts       # Anti-invite sistem
    │   └── loveCommands.ts     # Love & social sistem (20+ komandi)
    └── utils/
        ├── embeds.ts           # Discord embed helperi
        └── colors.ts           # Boje za embeds
```

---

## 🔧 Zahtjevi

- Node.js 18+
- Discord bot token
- Privilegovani intenti uključeni

---

## 📄 Licenca

MIT
