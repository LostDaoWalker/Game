# TIANMING — Vision

A xianxia idle Discord bot, played globally through a single slash command. Open a screen, navigate with buttons and dropdowns, close it. Minimal noise. Dead simple to start. Plays all day.

## Player promise

- **One command.** `/tianming` opens a screen. Everything happens inside it via buttons + dropdowns.
- **Dead simple to start.** A new player understands what to do on screen one, no tutorial required.
- **Skimmable screens.** Non-bloated, minimal text, easy to glance at. No walls of text anywhere.
- **No FOMO. No punishment. No progress loss.** Missing a day costs nothing. Failing at anything never takes away what you earned.
- **Plays all day.** The loop is idle-friendly and rewards checking in regularly without demanding it.

## The arc

1. **Mortal.** Weak, scrawny, unfamiliar with martial arts. Everyone starts here.
2. **Martial Artist.** The body learns, technique forms.
3. **Cultivator.** The splendid achievement — terribly difficult to reach. Becoming one should *feel* earned.
4. Further realms beyond.

## Progression structure

Three nested tiers:

- **Step** — smallest unit of progress.
- **Stage** — several **steps** form a stage.
- **Realm** — several **stages** form a realm (Mortal → Martial Artist → Cultivator → …).

Progress accumulates from cultivation. **The player chooses when to attempt breakthrough** — it does not auto-advance. Breakthroughs gate access to features (team slots, unlocks, etc.).

## World

- **Gametime.** The world has its own clock, distinct from walltime where it helps the fantasy.

## Core systems

Each system has a distinct purpose. Adding or removing one means editing this list.

### Cultivation
The core activity. Players accumulate cultivation progress over time. When ready, they breakthrough. Breakthrough attempts are **player-initiated**.

### Talents
- Randomised at character creation with **weighted rarity odds**.
- A **new talent granted each realm** the player reaches.
- Multiple rarities.
- **Private** — a player's talents are not visible to other players.

### Tribulations
Heavenly tribulations at major breakthrough moments. Part of what makes becoming a cultivator *splendid and terribly difficult*.

### Heart Demons
An inner-demon system tied to cultivation. Tests the player's resolve at key moments.

### Daoists (rolls)
Gacha-style: roll for Daoist companions using **Jade** (premium) or **Spirit Stones** (general). Daoists join the player's team.

### Team / Army
- Players **start alone**.
- **Team slot count grows** as the player breaks through to new realms/stages.
- At higher cultivation, players can **raise an army**.

### PvP
- **Autoresolved / autobattler** combat.
- Queue against a random **AI-controlled opponent** (modelled after another real player's build).
- **Prowess rating** tracks competitive standing across matches.

### Currencies
- **Spirit Stones** — general currency; also used as **cultivation aid**.
- **Jade** — premium currency.

## What the game is NOT

- Has **no classes**. Identity comes from talents, daoists, and choices, not a class pick.
- Has **no FOMO mechanics**. No daily resets that penalise you for missing them, no expiring rewards, no limited-time pressure.
- Has **no progress loss**. Losing a fight, a tribulation, a heart-demon check does not delete what you earned.
- Has **no walls of text**. If a screen can't be skimmed in a few seconds it's too much.

## Change discipline

This is intended to become a live product. Once real players exist in the DB, state is load-bearing.

- **Live features are load-bearing.** A player's realm, talents, team, rating — those represent time. Not scratch to clear.
- **Removal requires replacement.** Any cut to a live feature names what fills its role, or confirms in writing the role was empty.
- **Proportionality.** Bug = fix. Polish = polish. Structural change = pause and vision-check first.
- **Player-state preservation.** When a system has to go, include a migration path — refund, repurpose, default assignment. Never silent data loss.
- **Reversibility bias.** Prefer changes that can be rolled back. Flag ones that can't before making them.
- **Ask when unsure.** If a request could be read as "tighten this" or "rip this out," ask first.

## Change proposal — four questions

Before touching code for anything beyond a bug fix:

1. Which bullet of the vision does this serve?
2. What live player state does this affect?
3. If removing: what fills the role, or is the role empty?
4. Is the change reversible? If not, why now?

If the answers don't fit a short paragraph, the change isn't ready.
