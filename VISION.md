# TIANMING — Vision

**The game.** A xianxia idle Discord bot. You play a cultivator on the path from mortal toward immortality. Press one button; your character fights, grows, and occasionally makes a choice.

## Player promise

- **One button is enough.** Never require learning multiple systems to play.
- **Silent when nothing happened. Loud when something real did.** No decoration pretending to be feedback.
- **Decisions are rare but real.** Level-ups and boon unlocks are the moments that matter; everything else is automatic.

## What the game IS

A stamina-gated xianxia idle where numbers grow, gear drops, and your character walks a long arc from mortal toward immortal. The visible output is a trading card image plus a short result line.

## What the game is NOT

- A theorycraft sim (no stat-allocation puzzles)
- A resource-management game (one currency; no economy loop unless a gold sink is explicitly added)
- A social MMO (no guilds, no leaderboards, no PvP)
- A tabbed RPG (no sub-views, no menu forests)

## Core systems

Each system has one distinct purpose. Adding or removing one means editing this table.

| System | Distinct purpose |
|---|---|
| Stamina | Rate limit — paces play, gives each cultivate a cost |
| XP / Level | Core progression; drives stat growth and skill-pick moments |
| Equipment | Tangible payoff from combat; auto-equip keeps gear moving |
| Skills | The 1-of-3 choice moment at level-up |
| Ancestors | Long-arc patron progression via favor-gated boons |
| Gold | **Under review.** No sink exists today. Either earn a purpose (spending outlet) or be removed. Deferred pending a vision-aligned decision. |

## Change discipline

This is a live product with players in the DB. Changes are evolutions, not rewrites.

- **Live features are load-bearing.** A skill someone picked, favor built, equipment earned — that's player time. Not scratch to clear.
- **Removal requires replacement.** Any cut to a live feature names what fills the role, or confirms in writing the role was empty.
- **Proportionality.** Bug = fix. Polish = polish. Structural change to mechanics = pause and vision-check first.
- **Player-state preservation.** When a system has to go, include a migration path — refund, repurpose, or default assignment. Never silent data loss.
- **Reversibility bias.** Prefer changes that can be rolled back. Flag the ones that can't before making them.
- **Ask when unsure.** If a request could be read as "tighten this" or "rip this out," ask first.

## Change proposal — four questions

Before touching code for anything larger than a bug fix, answer these:

1. Which bullet of the vision does this serve?
2. What live player state does this affect?
3. If removing: what fills the role, or is the role empty?
4. Is the change reversible? If not, why now?

If those answers don't fit in a short paragraph, the change isn't ready.
