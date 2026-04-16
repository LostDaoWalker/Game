# TIANMING — Mechanics Ledger

Every number, rule, and trigger currently live in the game. Pulled from
`src/core/config.js` and `src/core/player.js` as of `9e8e545`. If something
here surprises you, it should not be here — flag it and I'll remove it.

---

## 1. Cultivation ladder

### Grand realms (3)
| id | name | icon | teamSlots |
|---:|---|---|---:|
| 0 | Mortal | 🌱 | 1 |
| 1 | Martial Artist | 🥋 | 3 |
| 2 | Cultivator | ✨ | 5 |

`teamSlots` includes the player themselves. Daoist slots = `teamSlots − 1`.

### Realms (9, flat)
| id | grand | name | baseStepCost |
|---:|---|---|---:|
| 0 | Mortal | Body Forging | 5 |
| 1 | Mortal | Inner Awakening | 8 |
| 2 | Mortal | Spirit Refining | 14 |
| 3 | Martial Artist | Qi Circulation | 25 |
| 4 | Martial Artist | Meridian Opening | 45 |
| 5 | Martial Artist | Bone Refining | 80 |
| 6 | Cultivator | Qi Condensation | 140 |
| 7 | Cultivator | Foundation Building | 250 |
| 8 | Cultivator | Core Formation | 450 |

### Stages (3, uniform across every realm)
`Early → Middle → Late`

### Steps within a stage (9)
| idx | name | cost multiplier |
|---:|---|---:|
| 0 | Entry | ×1.0 |
| 1 | Early | ×1.4 |
| 2 | Middle | ×2.0 |
| 3 | Late | ×3.0 |
| 4 | Peak | ×4.5 |
| 5 | Lesser Perfection | ×9 |
| 6 | Greater Perfection | ×18 |
| 7 | Extreme Perfection | ×36 |
| 8 | Absolute Perfection | ×72 |

**Step cost formula:** `ceil(realm.baseStepCost × stepMult)`, minimum 1.

**Example (Body Forging, baseStepCost 5):** 5 / 7 / 10 / 15 / 23 / 45 / 90 / 180 / 360.

**Breakthrough unlocks at step 4 (Peak).** Steps 5–8 are optional grind beyond Peak.

---

## 2. Qi gains

### Passive tick (walltime)
- **Rate:** 1 qi per walltime-minute (`baseRatePerMin`).
- Modified by talents: `×(1 + sum(cultivationRateBonusPct) / 100)`.
- Integer-floored over elapsed seconds.
- `cultivation_tick_at` updated on every tick.

### Cultivate button (manual)
- Each click: **1–3 qi** uniform random integer (`cultivateGrantMin..Max`).
- No cooldown. Spammable.
- Talent `cultivateGrantBonus` adds flat integer to every click.
- **Does not scale with realm.**
- Implicitly calls tickCultivation first so passive qi is caught up.

### Carry-over
- Qi never caps. Past Absolute Perfection it just accumulates.
- Breakthroughs carry the player's current qi into the new stage/realm and re-run step advancement from qi=0 step=0 of that new bucket.

---

## 3. Perfection rewards

Reaching **any** of steps 5, 6, 7, 8 (Lesser / Greater / Extreme / Absolute Perfection) grants, **each time**:

- **+5%** `prowess_bonus_pct` (`CULTIVATION.prowessPerPerfection`)
- **+50** spirit stones (`CURRENCIES.perfectionStones`)
- **+1** `tribulation_charge`

A fully-perfected stage = **+20% prowess, +200 stones, +4 charges.**

---

## 4. Breakthroughs

Unlocks at step 4 (Peak). Three kinds, decided automatically by position:

| kind | when | rewards on success | talent? | tribulation? |
|---|---|---|---|---|
| **stage** | stage < 2, Peak reached | +100 stones | no | yes (⚡, easy) |
| **realm** | stage == 2, next realm same grand | +500 stones, +1 jade | yes | yes (🌩️, medium) |
| **grand** | stage == 2, crossing grand boundary (realm 2→3, 5→6) | +2000 stones, +5 jade | yes | yes (💥, hard) |

- Success: qi carries over, stage/step reset to 0, charge reset to **0**.
- Failure: position unchanged, charge **preserved**, try again.
- Perfection rewards earned during carry-over `applyQi` are included in `stonesEarned`.

---

## 5. Tribulations

Every breakthrough rolls a tribulation.

| kind | base success | charges for 100% |
|---|---:|---:|
| ⚡ stage | 80% | 5 |
| 🌩️ realm | 60% | 10 |
| 💥 grand | 40% | 15 |

- Each charge adds **+4%** to success chance (`perChargeBonus`).
- Clamped at 100% — no cap below that.
- On success: charge consumed (→ 0).
- On failure: charge preserved, heart-demon flavor line shown, no progress loss.
- Heart demons: pool of 8 flavor strings, random per trial regardless of outcome.

---

## 6. Currencies

### Spirit Stones (💎) — earned at:
| trigger | amount |
|---|---:|
| reaching a perfection step | +50 |
| stage breakthrough success | +100 |
| realm breakthrough success | +500 |
| grand breakthrough success | +2000 |
| PvP win | +50 |

### Jade (🟢) — earned at:
| trigger | amount |
|---|---:|
| realm breakthrough success | +1 |
| grand breakthrough success | +5 |

Both currencies start at **0**. No decay, no upkeep.

---

## 7. Talents

### Rarity weights (rolled on grant)
| rarity | weight | % chance |
|---|---:|---:|
| common | 60 | 60% |
| uncommon | 25 | 25% |
| rare | 10 | 10% |
| epic | 4 | 4% |
| legendary | 1 | 1% |

Within a rarity, pick is uniform. Duplicates allowed.

### Talents (11 total)
| id | rarity | effect |
|---|---|---|
| diligent | common | +5% cultivation rate |
| sturdy | common | +5% prowess |
| focused | common | +1 xp/click |
| sharp_mind | uncommon | +10% cultivation rate |
| resolute | uncommon | +10% prowess |
| swift_hand | uncommon | +2 xp/click |
| spirit_root | rare | +20% cultivation rate |
| iron_blood | rare | +20% prowess |
| heavens_favor | epic | +25% rate, +10% prowess |
| dao_prodigy | legendary | +50% rate, +25% prowess, +2 xp/click |

### Effect keys (additive across all held talents)
- `cultivationRateBonusPct` — % to passive rate
- `cultivateGrantBonus` — flat xp to every Cultivate click
- `prowessBonusPct` — % to prowess, stacks with perfection-earned

### When a talent is granted
- **Creation:** 1 starter talent.
- **Realm breakthrough** (within a grand): +1 talent.
- **Grand breakthrough:** +1 talent.
- **Stage breakthrough:** no talent.

### Starter-talent reroll
- Allowed only while player is pristine: `realm=0, stage=0, step=0, qi=0`.
- The moment any progress occurs (cultivate, tick gain, breakthrough), reroll locks forever.
- Reroll deletes the current starter and rolls a fresh one. Unlimited rerolls while pristine.

---

## 8. Daoists (gacha)

### Roster (10 companions)
| id | rarity | power |
|---|---|---:|
| disciple_wen | common | 5 |
| disciple_lin | common | 5 |
| wandering_scholar | common | 5 |
| sword_youth | uncommon | 15 |
| fire_monk | uncommon | 15 |
| ice_enchantress | rare | 40 |
| thunder_lord | rare | 40 |
| shadow_assassin | epic | 80 |
| phoenix_prince | epic | 80 |
| dragon_emperor | legendary | 200 |

### Rolls
| roll | cost | common | uncommon | rare | epic | legendary |
|---|---:|---:|---:|---:|---:|---:|
| 🎲 Stone | 100 💎 | 70% | 20% | 8% | 2% | **0%** |
| 🎲 Jade | 1 🟢 | 40% | 25% | 20% | 10% | 5% |

- Stone rolls **cannot** produce legendaries.
- Duplicates allowed. No pity, no merging.
- Within a rarity, pick is uniform.

### Team slots
| grand | daoist slots |
|---|---:|
| Mortal | 0 (cultivates alone) |
| Martial Artist | 2 |
| Cultivator | 4 |

Can assign/remove freely. No cooldowns. Bench is unlimited.

---

## 9. PvP (auto-battle)

### Total power formula
```
basePower  = 100 + realm×200 + stage×30 + step×5
mult       = 1 + (perfection_prowess + talent_prowess) / 100
teamPower  = sum of in-team daoist power values
totalPower = floor(basePower × mult + teamPower)
```

### Opponent selection
- Prefers a real player within **±200 rating**, random pick.
- If none: **AI fallback** — rating == yours, power = yours × `1 + (rand−0.5) × 0.30` (so 0.85×–1.15×), name from a 12-entry pool.

### Win probability
```
myWinChance = myPower / (myPower + oppPower)
```
Pure power ratio. No randomness beyond the dice roll.

### Rating math
- Starting rating: **1000**.
- ELO K-factor: **24**.
- `expected = 1 / (1 + 10^((opp − mine) / 400))`
- Real opponents update symmetrically; AI opponents do not.

### Rewards per fight
| outcome | spirit stones | face | rating |
|---|---:|---:|---|
| win | +50 💎 | +10 🧘 | ELO up |
| loss | 0 | −min(10, current face) 🧘 | ELO down |

### Face
- Starts at 0, **floors at 0** — loss clamps to current face.
- Schema has `CHECK(face >= 0)` as a guard.
- PvP banner shows "🧘 face untouched" when a loss at 0 produces no delta.

---

## 10. Rankings

- Top 10 by `prowess_rating` (descending).
- Shows username + rating + grand realm + inner realm.
- Your rank shown separately if you're outside top 10.

---

## 11. Starter state (new player)

- Realm 0, stage 0, step 0, qi 0
- Prowess bonus 0, tribulation charge 0
- Spirit stones 0, jade 0
- Rating 1000, wins 0, losses 0, face 0
- 1 starter talent (rerollable while pristine)
- 0 daoists

---

## 12. Things that do NOT exist (yet)

To close the "what's hidden" gap, here's what is **not** in the game:

- No sects, factions, bloodlines, physiques, ancestors
- No army / disciple command mechanic
- No crafting, alchemy, or item system
- No quests, dailies, achievements, milestones
- No shop beyond daoist rolls
- No trading between players
- No chat / social beyond rankings
- No gametime separate from walltime
- No canvas / image rendering — text + emoji only
- No classes, no gear, no equipment
- No daoist leveling, fusing, or dupe merging
- No pity system on rolls
- No qi cap, no daily cap, no cooldowns anywhere

---

## 13. Files

- `src/core/config.js` — every number above
- `src/core/player.js` — every rule above
- `src/core/database.js` — schema
- `src/bot/interactions.js` — Discord UX
- `test.js` — 194 smoke assertions covering all of the above
