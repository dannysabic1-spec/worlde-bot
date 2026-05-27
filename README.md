# 🛡️ GIANNI Bot v2

Discord bot sa prefix-om `.` — SFW love komande, fun, mod, NSFW (svi kanali), wordle, tinder, giveaway.

## ⚙️ Postavljanje

### 1. Instaliraj Node.js (v18+)

### 2. Instaliraj pakete
```bash
npm install
```

### 3. Postavi token
Napravi `.env` fajl ili postavi environment varijablu:
```
DISCORD_TOKEN=tvoj_bot_token_ovdje
```

### 4. Pokreni bota
```bash
node bot.js
```

---

## 📋 Sve komande

| Kategorija | Komande |
|---|---|
| 📡 **Utility** | `.ping` `.botinfo` `.avatar [@k]` `.banner [@k]` `.poll <pitanje>` |
| 📅 **Server** | `.events` `.serverinfo` `.userinfo [@k]` `.gws create/end/reroll` |
| 📨 **DM (owner)** | `.dmaktive <poruka>` |
| 🟩 **Wordle** | `.wordle set <#kanal>` `.wordle start` `.wordle stop` |
| 💘 **Zabava/Fun** | `.tinder [@k]` `.8ball <p>` `.coinflip` `.roll [N]` `.rps r/p/s` `.rate @k` `.iq @k` `.pp @k` `.simp @k` `.hack @k` `.roastme` |
| ⚠️ **Mod** | `.warn @k` `.warnings @k` `.clearwarn @k` `.kick @k` `.ban @k` `.timeout @k <min>` `.purge <N>` `.lock` `.unlock` `.slowmode <s>` |
| 💕 **Love/SFW** | `.ship @a @b` `.love @k` `.marry @k` `.divorce` `.partner` `.hug` `.kiss` `.pat` `.cuddle` `.blush` `.smile` `.feed` `.wave` `.slap` `.poke` `.bite` `.lick` `.stare` `.highfive` `.dance` `.cry` `.wink` `.nod` `.sleep` `.laugh` `.shrug` `.fuck` |
| 🔞 **NSFW (svi kanali)** | `.fucknsfw @k` `.daddy @k` `.mommy @k` `.sex @k` `.blowjob @k` `.anal @k` `.cum @k` `.pussylick @k` `.handjob @k` `.solo [@k]` `.strip [@k]` `.creampie @k` `.fingering @k` `.nudes [@k]` `.threesome @k @k` `.yaoi @k` `.yuri @k` |

---

## 🔑 Permisije (Discord Developer Portal)

Bot treba sljedeće permisije:
- `Send Messages`, `Embed Links`, `Read Message History`
- `Manage Messages` (za `.purge`)
- `Kick Members`, `Ban Members` (za mod komande)
- `Moderate Members` (za `.timeout`)
- `Manage Channels` (za `.lock/.unlock/.slowmode`)

**Privileged Gateway Intents** (obavezno uključiti u Developer Portalu):
- `GUILD_MEMBERS`
- `MESSAGE_CONTENT`

---

## 🛡️ Anti-Raid & Anti-Invite

- Automatski kickuje korisnike koji šalju Discord invite linkove
- Anti-raid sistem: lockdown pri naglom joinu više korisnika

---

## 📦 Zavisnosti

```json
{
  "discord.js": "^14",
  "pino": "^8",
  "pino-pretty": "^11"
}
```
