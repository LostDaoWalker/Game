# TIANMING — Agent Context

> **Read [VISION.md](./VISION.md) first.** It is the contract every change is measured against. This file describes the codebase; VISION.md describes the game.

A xianxia cultivation Discord bot. Single slash command (`/tianming`) opens a screen; navigation happens via buttons and dropdowns.

**Status:** pre-implementation reset. Only the Discord skeleton lives here. Game systems are designed against VISION.md, one at a time, before any code is written for them.

## Run

```bash
./run.sh              # first-run helper — copies .env.example, installs, deploys, starts
npm run deploy        # register /tianming
npm start             # start the bot
npm test              # schema smoke test (wipes data/ on run)
```

Required env: `DISCORD_TOKEN`, `CLIENT_ID`. Optional: `GUILD_ID` (instant slash deploy).

## Layout

```
src/
  index.js               bot entry — Discord client, event routing
  deploy-commands.js     registers /tianming
  bot/interactions.js    handleCommand / handleButton / handleSelectMenu (skeleton)
  core/database.js       SQLite — just a players table so far
cli.js                   dev CLI (start / dev / deploy / test)
test.js                  smoke test
run.sh                   first-run helper
VISION.md                game design contract
CLAUDE.md                this file
```

No config.js, no player logic, no rendering yet — they will be added as each system is designed.

## Conventions

- **Rendering: text-only with emoji.** All screens are Discord text + native markdown + emoji. Progress bars are `░` / `█` characters. No canvas / image renderers unless the user explicitly requests one for a specific screen. No `@napi-rs/canvas` dependency.
- ES modules (`import`/`export`). Node 20+.
- All game data will live in a dedicated config module (single source of truth) — don't hardcode names/stats inline.
- Internal IDs (talent IDs, daoist IDs, etc.) are stable once live; display names can change freely.
- Schema changes: add migrations (`ALTER TABLE ADD COLUMN IF NOT EXISTS` pattern). Remove columns with `DROP COLUMN` only during a hard cutover of a feature.

## Change discipline

VISION.md lists the rules. The shortest version:

- Live features are load-bearing — don't delete what represents player time.
- Removal requires replacement; cuts name what fills the role.
- Four-question check applies to anything beyond a bug fix (see VISION.md).
- Ask when unsure.
