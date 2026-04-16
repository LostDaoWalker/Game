# TIANMING 天命

A xianxia cultivation Discord bot. One slash command. Played globally. Plays all day.

> See [VISION.md](./VISION.md) for the design contract.

## Run

```bash
./run.sh
```

Creates `.env` from `.env.example` on first run, installs deps, registers the slash command, and starts the bot. Fill in `DISCORD_TOKEN` and `CLIENT_ID` from the [Discord Developer Portal](https://discord.com/developers/applications).

Set `GUILD_ID` for instant slash-command deploy during development; leave blank for global deploy.

## Develop

```bash
npm run dev           # hot-reload
npm test              # schema smoke test
./cli.js help         # list CLI commands
```

## Status

Pre-implementation. The repo is currently a Discord skeleton — game systems are designed against VISION.md and built in over time.

## Stack

- [discord.js](https://discord.js.org)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
