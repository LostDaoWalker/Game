// TIANMING — Game Data (cultivation spine only for now)
// Single source of truth. Every tunable lives here.

// ── Steps within a stage ──
// 9 steps. Breakthrough unlocks at Peak (index 4) and stays available through Absolute Perfection.
export const STEP_NAMES = Object.freeze([
  'Entry',
  'Early',
  'Middle',
  'Late',
  'Peak',
  'Lesser Perfection',
  'Greater Perfection',
  'Extreme Perfection',
  'Absolute Perfection',
]);

// Step index at which the Breakthrough button unlocks (inclusive).
export const BREAKTHROUGH_STEP = 4; // Peak

// Qi cost multiplier for each step, relative to the realm's baseStepCost.
// Steps 0-4: smooth climb to Peak. Steps 5-8: perfections ~2× each tier.
export const STEP_COST_MULT = Object.freeze([1, 1.4, 2, 3, 4.5, 9, 18, 36, 72]);

// Reaching one of these step indices (via qi advancement) grants
// +5% prowess AND +1 tribulation_charge.
export const PERFECTION_STEPS = Object.freeze(new Set([5, 6, 7, 8]));

// ── Grand Realms ──
// The three big arcs. Each contains several REALMS (below). Only breakthroughs
// that cross a grand-realm boundary trigger a Tribulation — becoming a
// Cultivator should feel splendid and terribly difficult.
// teamSlots includes the player themselves; daoistSlots = teamSlots - 1.
export const GRAND_REALMS = Object.freeze([
  { id: 0, key: 'mortal',         name: 'Mortal',         icon: '🌱', teamSlots: 1 },
  { id: 1, key: 'martial_artist', name: 'Martial Artist', icon: '🥋', teamSlots: 3 },
  { id: 2, key: 'cultivator',     name: 'Cultivator',     icon: '✨', teamSlots: 5 },
]);

// ── Realms ──
// Flat list. Each realm belongs to a grand realm (grandId). Step cost rises
// smoothly across realms so late-game pacing is slower but passive idle still
// makes progress.
export const REALMS = Object.freeze([
  // Mortal grand realm
  { id: 0, grandId: 0, key: 'body_forging',    name: 'Body Forging',    baseStepCost:   5 },
  { id: 1, grandId: 0, key: 'inner_awakening', name: 'Inner Awakening', baseStepCost:   8 },
  { id: 2, grandId: 0, key: 'spirit_refining', name: 'Spirit Refining', baseStepCost:  14 },
  // Martial Artist grand realm
  { id: 3, grandId: 1, key: 'qi_circulation',    name: 'Qi Circulation',    baseStepCost:  25 },
  { id: 4, grandId: 1, key: 'meridian_opening',  name: 'Meridian Opening',  baseStepCost:  45 },
  { id: 5, grandId: 1, key: 'bone_refining',     name: 'Bone Refining',     baseStepCost:  80 },
  // Cultivator grand realm
  { id: 6, grandId: 2, key: 'qi_condensation',     name: 'Qi Condensation',     baseStepCost: 140 },
  { id: 7, grandId: 2, key: 'foundation_building', name: 'Foundation Building', baseStepCost: 250 },
  { id: 8, grandId: 2, key: 'core_formation',      name: 'Core Formation',      baseStepCost: 450 },
]);

// ── Stages — uniform across all realms ──
// Every realm has three stages: Early, Middle, Late. Full perfection of any
// stage grants the same four perfection rewards (Lesser/Greater/Extreme/Absolute).
export const STAGES = Object.freeze(['Early', 'Middle', 'Late']);

// ── Cultivation tuning ──
export const CULTIVATION = Object.freeze({
  baseRatePerMin: 1,          // qi per walltime-minute of passive cultivation
  prowessPerPerfection: 5,    // +5% combat prowess per perfection step reached
  cultivateGrantMin: 1,       // 🔥 Cultivate grants random int xp in [min, max]
  cultivateGrantMax: 3,       //   no cooldown, no realm scaling
});

// ── Tribulations ──
// Every stage/realm/grand breakthrough rolls a tribulation. Difficulty
// scales by kind — stage trials are passable, realm crossings are harder,
// grand crossings (becoming Martial Artist / Cultivator) are splendid and
// terribly difficult. No progress loss on failure — just try again.
// tribulation_charge (earned at each perfection step) adds +perChargeBonus
// to whichever tribulation you face next, then is consumed on success.
export const TRIBULATION = Object.freeze({
  stage: Object.freeze({ baseSuccess: 0.80, maxSuccess: 0.98 }),
  realm: Object.freeze({ baseSuccess: 0.60, maxSuccess: 0.95 }),
  grand: Object.freeze({ baseSuccess: 0.40, maxSuccess: 0.95 }),
  perChargeBonus: 0.04,
  heartDemons: Object.freeze([
    'A phantom of your former self whispers doubts.',
    'Your regrets take form and swarm your mind.',
    'The image of a lost friend stands before you.',
    'A vision of the enemy you could not defeat haunts you.',
    'The cost of your path made flesh pleads with you.',
    'Memories of weakness rise up to drag you back.',
    'The names of those who doubted you echo in your ears.',
    'Your shadow sharpens into a blade.',
  ]),
});

// ── PvP ──
// Total combat power = basePower × prowessMultiplier + teamPower.
// Expected curve: Mortal ~100, Martial Artist ~300, Cultivator ~700 at stage 0 step 0.
export const POWER = Object.freeze({
  base:          100,   // flat floor so Mortal players aren't zero
  perRealm:      200,   //   +200 per realm tier reached
  perStage:       30,   //   +30 per stage within current realm
  perStep:         5,   //   +5 per step within current stage
});

export const PVP = Object.freeze({
  startRating:   1000,  // starting prowess rating
  ratingWindow:   200,  // ± window for matchmaking real opponents
  eloK:            24,  // ELO K-factor
  stoneReward:     50,  // 💎 on win
  faceWin:         10,  // 🧘 face gained on win (reputation / 面子)
  faceLoss:        10,  // 🧘 face lost on defeat
  aiPowerVariance: 0.3, // AI power is in [0.85, 1.15] × player power
  aiNames: Object.freeze([
    'Wandering Disciple',
    'Solitary Swordsman',
    'Veiled Scholar',
    'Silent Monk',
    'Mountain Hermit',
    'Drunken Fist Elder',
    'Ice Blade Maiden',
    'Crimson Flame Youth',
    'Ghost-Stepped Assassin',
    'Thunder Sage',
    'Jade Mist Cultivator',
    'Raging Bull Disciple',
  ]),
});

// ── Daoists — gacha companions rolled via Spirit Stones or Jade ──
// Each has a combat power contribution that stacks on the owner's prowess.
export const DAOISTS = Object.freeze({
  // Common
  disciple_wen:      { name: 'Disciple Wen',       rarity: 'common',    power:   5 },
  disciple_lin:      { name: 'Disciple Lin',       rarity: 'common',    power:   5 },
  wandering_scholar: { name: 'Wandering Scholar',  rarity: 'common',    power:   5 },
  // Uncommon
  sword_youth:       { name: 'Sword Youth',        rarity: 'uncommon',  power:  15 },
  fire_monk:         { name: 'Fire Monk',          rarity: 'uncommon',  power:  15 },
  // Rare
  ice_enchantress:   { name: 'Ice Enchantress',    rarity: 'rare',      power:  40 },
  thunder_lord:      { name: 'Thunder Lord',       rarity: 'rare',      power:  40 },
  // Epic
  shadow_assassin:   { name: 'Shadow Assassin',    rarity: 'epic',      power:  80 },
  phoenix_prince:    { name: 'Phoenix Prince',     rarity: 'epic',      power:  80 },
  // Legendary
  dragon_emperor:    { name: 'Dragon Emperor',     rarity: 'legendary', power: 200 },
});

export const ROLLS = Object.freeze({
  stoneCost: 100,
  jadeCost:  1,
  stoneRates: Object.freeze({ common: 70, uncommon: 20, rare: 8, epic: 2, legendary: 0 }),
  jadeRates:  Object.freeze({ common: 40, uncommon: 25, rare: 20, epic: 10, legendary: 5 }),
});

// ── Currencies ──
// Spirit Stones = general (will spend on daoist rolls and cultivation aid).
// Jade         = premium (rarer; higher-tier daoist rolls).
export const CURRENCIES = Object.freeze({
  perfectionStones:          50,   // per perfection step reached
  stageBreakthroughStones:  100,   // per stage breakthrough
  realmBreakthroughStones:  500,   // per (non-grand) realm breakthrough
  realmBreakthroughJade:      1,   // per (non-grand) realm breakthrough
  grandBreakthroughStones: 2000,   // per grand realm breakthrough (on tribulation success)
  grandBreakthroughJade:      5,   // per grand realm breakthrough
});
// Granted randomly at character creation and on every realm breakthrough.
// Private — never shown to other players. Weighted rarity pick, then uniform pick within tier.
export const TALENT_RARITY_WEIGHTS = Object.freeze({
  common:    60,
  uncommon:  25,
  rare:      10,
  epic:       4,
  legendary:  1,
});

export const TALENT_RARITY_COLORS = Object.freeze({
  common:    '⚪',
  uncommon:  '🟢',
  rare:      '🔵',
  epic:      '🟣',
  legendary: '🟡',
});

// Talent effect keys (additive, summed across all held talents):
//   cultivationRateBonusPct   — +% to passive qi rate
//   cultivateGrantBonus       — +flat xp to every Cultivate click
//   prowessBonusPct           — +% to prowess (stacks with perfection-earned)
export const TALENTS = Object.freeze({
  // Common (60%)
  diligent:   { name: 'Diligent',    rarity: 'common',    effects: { cultivationRateBonusPct: 5 } },
  sturdy:     { name: 'Sturdy',      rarity: 'common',    effects: { prowessBonusPct: 5 } },
  focused:    { name: 'Focused',     rarity: 'common',    effects: { cultivateGrantBonus: 1 } },

  // Uncommon (25%)
  sharp_mind: { name: 'Sharp Mind',  rarity: 'uncommon',  effects: { cultivationRateBonusPct: 10 } },
  resolute:   { name: 'Resolute',    rarity: 'uncommon',  effects: { prowessBonusPct: 10 } },
  swift_hand: { name: 'Swift Hand',  rarity: 'uncommon',  effects: { cultivateGrantBonus: 2 } },

  // Rare (10%)
  spirit_root: { name: 'Spirit Root', rarity: 'rare',     effects: { cultivationRateBonusPct: 20 } },
  iron_blood:  { name: 'Iron Blood',  rarity: 'rare',     effects: { prowessBonusPct: 20 } },

  // Epic (4%)
  heavens_favor: { name: "Heaven's Favor", rarity: 'epic', effects: { cultivationRateBonusPct: 25, prowessBonusPct: 10 } },

  // Legendary (1%)
  dao_prodigy: { name: 'Dao Prodigy', rarity: 'legendary', effects: { cultivationRateBonusPct: 50, prowessBonusPct: 25, cultivateGrantBonus: 2 } },
});
