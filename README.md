# TIANMING 天命

*Cultivate. Ascend. Transcend.*

A xianxia-themed Discord RPG bot. One button. Cultivate from mortal to immortal.

## Run

```bash
./run.sh
```

The script creates `.env` from `.env.example`, installs deps, registers the slash command, and starts the bot. Fill in `DISCORD_TOKEN` and `CLIENT_ID` from [Discord Developer Portal](https://discord.com/developers/applications) before re-running.

Set `GUILD_ID` for instant slash-command deploy during development. Leave it blank for global deploy (~1hr propagation).

## Play

Type `/tianming` in a server. Press **🔥 CULTIVATE** to fight. Level up. Pick skills, equip loot, worship an ancestor. Repeat.

## Develop

```bash
npm test              # smoke test (wipes data/ — local only)
./cli.js sim 20       # render 20 grind frames to data/sim/
./cli.js card         # render card art for every ancestor
./cli.js db           # dump leaderboard
./cli.js db <id>      # dump a player's full state
./cli.js reset all    # wipe the DB
./cli.js stats        # codebase + render-speed benchmarks
```

See [`CLAUDE.md`](./CLAUDE.md) for architecture, invariants, and conventions.

## Stack

- [discord.js](https://discord.js.org) — bot framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — storage
- [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) — image rendering
