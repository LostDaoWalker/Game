# TIANMING — Agent Context

> **Read [VISION.md](./VISION.md) first.** It's the contract every change is measured against. This file describes the codebase; VISION.md describes the game.

A Discord RPG bot where players cultivate from mortal to immortal. Xianxia-themed idle game. Single-view UI, one button (`🔥 CULTIVATE`), everything else is contextual dropdowns.

## Run

```bash
./run.sh              # first-run helper — copies .env.example, installs, deploys, starts
npm run deploy        # register /tianming slash command
npm start             # start bot
npm test              # smoke test (~50 checks, wipes data/ — don't run on prod)
./cli.js sim 20       # render 20 grind frames to data/sim/ for visual QA
./cli.js card         # render a card for each ancestor to data/
```

Required env: `DISCORD_TOKEN`, `CLIENT_ID`. Optional: `GUILD_ID` (instant slash deploy).

## Layout

```
src/
  index.js               bot entry, Discord wiring
  deploy-commands.js     register /tianming
  bot/interactions.js    all Discord handlers, UI builder
  core/config.js         all game data (single source of truth)
  core/database.js       SQLite schema + migrations
  core/player.js         game logic (combat, grind, traits, ancestors)
  rendering/canvas.js    primitives: panel, bar, text, layout
  rendering/views/grind.js   the only view
  rendering/views/card.js    player trading card (used by grind view)
cli.js                   dev CLI: start, test, sim, card, db, reset, stats
test.js                  smoke test
```

## Key invariants

- **Single view**: `grind.js` is the only view rendered. No tabs, no sub-views.
- **HP is always full** between fights. No healing mechanic. No HP persistence.
- **No stamina = no cultivation.** Stamina regens 1 per 5 min (see `ECO.staminaRegen`).
- **Gold is gold.** No bank, no duels, no theft. Earned only through combat.
- **One of each**: one button (CULTIVATE), one currency (gold), one enemy per fight (auto-picks best for level).
- **Ancestor favor only grows on wins.** Switching ancestors resets favor to 0.
- **Equipment auto-equips** if total stat-sum beats current slot occupant. Junk auto-sells in grind.

## Game data (config.js)

- `ANCESTORS` — 5 patrons with 3 boons each unlocked at favor 50/200/500
- `ENEMIES` — 12 enemies across 4 zones (neighborhood → topfloor, internal IDs kept for DB continuity)
- `EQUIPMENT` — 29 items, 5 slots, 5 rarities (60/25/10/4/1% weights)
- `SKILLS` — 8 cultivation arts, 3 types (offensive/defensive/utility), max level 3

## Balancing knobs (config.js)

- `LEVEL.xpBase` / `xpMult` — XP curve. Currently 80 × 1.3^(n-1).
- `LEVEL.hp/atk/def/spd/str` — stat gains per level.
- `ECO.startGold` / `maxStamina` / `staminaRegen` / `sellMult` — economy tuning.
- `RARITIES[r].weight` — loot drop odds.
- Enemy `scaling` — difficulty growth per level above minLevel.

## Conventions

- ES modules (`import`/`export`). Node 20+.
- All game data lives in `config.js` — never hardcode names/stats in logic files.
- Internal IDs (`enemyId`, `itemId`, `ancestorId`) are stable — never rename them (DB continuity). Display names can change freely.
- When adding a column, update the migration block in `database.js` (`ALTER TABLE ADD COLUMN IF NOT EXISTS` pattern). Hard-cutover removed columns with `DROP COLUMN`.
- Rendering primitives (`panel`, `bar`, `txt`, `btn`, `rr`) live in `canvas.js`. Views should compose them, not duplicate canvas calls.
- JPEG quality 90 for all rendered images (3× faster than PNG, Discord renders both).

## Common gotchas

- `better-sqlite3` + SQLite 3.35+ supports `ALTER TABLE DROP COLUMN`. Older SQLite won't.
- Discord select menus cap at 25 options — slice before passing.
- Canvas `textBaseline = 'top'` is set once; don't re-set per draw.
- `createCanvas` is expensive — reuse via `_artCache` / `_bgData` patterns already in code.
- Combat simulation caps at 30 rounds to prevent infinite loops with high-def foes.

## Hard cutover

When removing a system, remove everything that served it — code, columns, files, imports, UI, comments, scripts, docs. Migrations in the same commit. Grep the repo. Delete, don't deprecate.
