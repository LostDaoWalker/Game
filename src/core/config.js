// ═══════════════════════════════════════════════
// NEXUS PBBG — Game Configuration
// Combat RPG inspired by My Brute / Dawn of the Dragons
// ═══════════════════════════════════════════════

export const THEME = {
  name: 'NEXUS',
  tagline: 'Fight. Loot. Dominate.',
  colors: {
    bg: '#0a0e17',
    bgLight: '#111827',
    panel: '#1a1f2e',
    panelLight: '#242b3d',
    border: '#2d3548',
    borderLight: '#3d4560',
    primary: '#00f0ff',
    primaryDim: '#007a82',
    secondary: '#a855f7',
    secondaryDim: '#6b21a8',
    accent: '#f59e0b',
    accentDim: '#92400e',
    success: '#10b981',
    danger: '#ef4444',
    dangerDim: '#991b1b',
    warning: '#f59e0b',
    text: '#e2e8f0',
    textDim: '#94a3b8',
    textMuted: '#64748b',
    xpBar: '#8b5cf6',
    hpBar: '#ef4444',
    energyBar: '#06b6d4',
    staminaBar: '#f59e0b',
    gold: '#fbbf24',
    legendary: '#f97316',
    epic: '#a855f7',
    rare: '#3b82f6',
    common: '#94a3b8',
  },
};

// ─── Rarity System ─────────────────────────────

export const RARITIES = {
  common:    { name: 'Common',    color: '#94a3b8', weight: 60 },
  uncommon:  { name: 'Uncommon',  color: '#22c55e', weight: 25 },
  rare:      { name: 'Rare',      color: '#3b82f6', weight: 10 },
  epic:      { name: 'Epic',      color: '#a855f7', weight: 4 },
  legendary: { name: 'Legendary', color: '#f97316', weight: 1 },
};

// ─── Equipment ──────────────────────────────────

export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'helmet', 'boots', 'accessory'];

export const EQUIPMENT = {
  // ── Weapons ──
  rusty_pipe: {
    name: 'Rusty Pipe', slot: 'weapon', rarity: 'common', icon: '🔧',
    stats: { attack: 3 }, sellValue: 10, dropLevel: 1,
  },
  combat_knife: {
    name: 'Combat Knife', slot: 'weapon', rarity: 'common', icon: '🔪',
    stats: { attack: 5 }, sellValue: 20, dropLevel: 1,
  },
  steel_bat: {
    name: 'Steel Bat', slot: 'weapon', rarity: 'uncommon', icon: '🏏',
    stats: { attack: 8, strength: 2 }, sellValue: 50, dropLevel: 2,
  },
  katana: {
    name: 'Katana', slot: 'weapon', rarity: 'uncommon', icon: '⚔️',
    stats: { attack: 12, speed: 3 }, sellValue: 80, dropLevel: 4,
  },
  power_fist: {
    name: 'Power Fist', slot: 'weapon', rarity: 'rare', icon: '🥊',
    stats: { attack: 18, strength: 5 }, sellValue: 200, dropLevel: 6,
  },
  laser_blade: {
    name: 'Laser Blade', slot: 'weapon', rarity: 'rare', icon: '🗡️',
    stats: { attack: 25, speed: 5, strength: 3 }, sellValue: 400, dropLevel: 8,
  },
  plasma_cannon: {
    name: 'Plasma Cannon', slot: 'weapon', rarity: 'epic', icon: '🔫',
    stats: { attack: 35, strength: 8 }, sellValue: 800, dropLevel: 12,
  },
  void_scythe: {
    name: 'Void Scythe', slot: 'weapon', rarity: 'epic', icon: '⚡',
    stats: { attack: 45, speed: 8, strength: 5 }, sellValue: 1500, dropLevel: 16,
  },
  dragon_fang: {
    name: 'Dragon Fang', slot: 'weapon', rarity: 'legendary', icon: '🐉',
    stats: { attack: 60, strength: 12, speed: 10 }, sellValue: 5000, dropLevel: 20,
  },

  // ── Armor ──
  torn_jacket: {
    name: 'Torn Jacket', slot: 'armor', rarity: 'common', icon: '🧥',
    stats: { defense: 3 }, sellValue: 10, dropLevel: 1,
  },
  leather_vest: {
    name: 'Leather Vest', slot: 'armor', rarity: 'common', icon: '🦺',
    stats: { defense: 5, hp: 10 }, sellValue: 25, dropLevel: 1,
  },
  chain_mail: {
    name: 'Chain Mail', slot: 'armor', rarity: 'uncommon', icon: '🛡️',
    stats: { defense: 10, hp: 20 }, sellValue: 60, dropLevel: 3,
  },
  tactical_armor: {
    name: 'Tactical Armor', slot: 'armor', rarity: 'rare', icon: '🎽',
    stats: { defense: 20, hp: 40, strength: 3 }, sellValue: 300, dropLevel: 7,
  },
  nano_suit: {
    name: 'Nano Suit', slot: 'armor', rarity: 'epic', icon: '🦾',
    stats: { defense: 35, hp: 60, speed: 5 }, sellValue: 1000, dropLevel: 13,
  },
  dragon_scale: {
    name: 'Dragon Scale Armor', slot: 'armor', rarity: 'legendary', icon: '🐲',
    stats: { defense: 55, hp: 100, strength: 8 }, sellValue: 5000, dropLevel: 20,
  },

  // ── Helmets ──
  bandana: {
    name: 'Bandana', slot: 'helmet', rarity: 'common', icon: '🎭',
    stats: { defense: 2 }, sellValue: 8, dropLevel: 1,
  },
  iron_helm: {
    name: 'Iron Helm', slot: 'helmet', rarity: 'uncommon', icon: '⛑️',
    stats: { defense: 6, hp: 15 }, sellValue: 45, dropLevel: 3,
  },
  war_helm: {
    name: 'War Helm', slot: 'helmet', rarity: 'rare', icon: '🪖',
    stats: { defense: 12, hp: 25, strength: 2 }, sellValue: 200, dropLevel: 7,
  },
  crown_of_thorns: {
    name: 'Crown of Thorns', slot: 'helmet', rarity: 'epic', icon: '👑',
    stats: { defense: 20, hp: 40, attack: 10 }, sellValue: 900, dropLevel: 14,
  },
  void_crown: {
    name: 'Void Crown', slot: 'helmet', rarity: 'legendary', icon: '💀',
    stats: { defense: 30, hp: 60, attack: 15, speed: 8 }, sellValue: 4000, dropLevel: 20,
  },

  // ── Boots ──
  worn_sneakers: {
    name: 'Worn Sneakers', slot: 'boots', rarity: 'common', icon: '👟',
    stats: { speed: 2 }, sellValue: 8, dropLevel: 1,
  },
  combat_boots: {
    name: 'Combat Boots', slot: 'boots', rarity: 'uncommon', icon: '🥾',
    stats: { speed: 5, defense: 3 }, sellValue: 40, dropLevel: 3,
  },
  rocket_boots: {
    name: 'Rocket Boots', slot: 'boots', rarity: 'rare', icon: '🚀',
    stats: { speed: 12, defense: 5 }, sellValue: 250, dropLevel: 8,
  },
  shadow_treads: {
    name: 'Shadow Treads', slot: 'boots', rarity: 'epic', icon: '🌑',
    stats: { speed: 20, defense: 10, attack: 5 }, sellValue: 800, dropLevel: 14,
  },

  // ── Accessories ──
  lucky_coin: {
    name: 'Lucky Coin', slot: 'accessory', rarity: 'common', icon: '🪙',
    stats: { speed: 1, attack: 1 }, sellValue: 15, dropLevel: 1,
  },
  power_ring: {
    name: 'Power Ring', slot: 'accessory', rarity: 'uncommon', icon: '💍',
    stats: { strength: 5, attack: 3 }, sellValue: 55, dropLevel: 4,
  },
  amulet_of_fury: {
    name: 'Amulet of Fury', slot: 'accessory', rarity: 'rare', icon: '📿',
    stats: { attack: 10, strength: 5, speed: 3 }, sellValue: 350, dropLevel: 9,
  },
  soul_gem: {
    name: 'Soul Gem', slot: 'accessory', rarity: 'epic', icon: '💎',
    stats: { attack: 15, defense: 10, hp: 50, strength: 5 }, sellValue: 1200, dropLevel: 15,
  },
  heart_of_dragon: {
    name: 'Heart of the Dragon', slot: 'accessory', rarity: 'legendary', icon: '❤️‍🔥',
    stats: { attack: 20, defense: 15, hp: 80, strength: 10, speed: 10 }, sellValue: 6000, dropLevel: 20,
  },
};

// ─── Skills (randomly offered on level-up, My Brute style) ───

export const SKILLS = {
  // Offensive
  berserker_rage: {
    name: 'Berserker Rage', icon: '😤', type: 'offensive',
    description: 'Deal 1.5x damage when below 30% HP',
    effect: { lowHpDmgMult: 1.5 }, maxLevel: 3,
  },
  double_strike: {
    name: 'Double Strike', icon: '⚔️', type: 'offensive',
    description: '20% chance to attack twice',
    effect: { doubleStrikeChance: 0.20 }, maxLevel: 3,
  },
  critical_eye: {
    name: 'Critical Eye', icon: '🎯', type: 'offensive',
    description: '+15% crit chance, crits deal 2x damage',
    effect: { critChance: 0.15, critMult: 2.0 }, maxLevel: 3,
  },
  armor_break: {
    name: 'Armor Break', icon: '💥', type: 'offensive',
    description: 'Attacks ignore 25% of enemy defense',
    effect: { armorPen: 0.25 }, maxLevel: 3,
  },
  poison_strike: {
    name: 'Poison Strike', icon: '🧪', type: 'offensive',
    description: '15% chance to poison, dealing damage over 3 turns',
    effect: { poisonChance: 0.15, poisonDmg: 0.10 }, maxLevel: 3,
  },

  // Defensive
  iron_wall: {
    name: 'Iron Wall', icon: '🧱', type: 'defensive',
    description: 'Reduce all incoming damage by 10%',
    effect: { dmgReduction: 0.10 }, maxLevel: 3,
  },
  regeneration: {
    name: 'Regeneration', icon: '💚', type: 'defensive',
    description: 'Heal 5% max HP each turn',
    effect: { regenPercent: 0.05 }, maxLevel: 3,
  },
  dodge_master: {
    name: 'Dodge Master', icon: '💨', type: 'defensive',
    description: '12% chance to completely dodge attacks',
    effect: { dodgeChance: 0.12 }, maxLevel: 3,
  },
  counter_attack: {
    name: 'Counter Attack', icon: '🔄', type: 'defensive',
    description: '20% chance to counter when hit',
    effect: { counterChance: 0.20 }, maxLevel: 3,
  },
  last_stand: {
    name: 'Last Stand', icon: '🛡️', type: 'defensive',
    description: 'Survive a killing blow once with 1 HP',
    effect: { lastStand: true }, maxLevel: 1,
  },

  // Utility
  gold_digger: {
    name: 'Gold Digger', icon: '💰', type: 'utility',
    description: '+20% gold from all sources',
    effect: { goldBonus: 0.20 }, maxLevel: 3,
  },
  quick_learner: {
    name: 'Quick Learner', icon: '📖', type: 'utility',
    description: '+15% XP from all sources',
    effect: { xpBonus: 0.15 }, maxLevel: 3,
  },
  lucky_looter: {
    name: 'Lucky Looter', icon: '🍀', type: 'utility',
    description: 'Better loot rarity from drops',
    effect: { lootBonus: 1 }, maxLevel: 3,
  },
  intimidate: {
    name: 'Intimidate', icon: '👊', type: 'utility',
    description: 'Enemy starts with -10% attack',
    effect: { enemyAtkReduction: 0.10 }, maxLevel: 3,
  },
};

// ─── Enemies (PvE) ──────────────────────────────

export const ENEMIES = {
  // Zone 1: Streets (Lv 1-5)
  street_thug: {
    name: 'Street Thug', icon: '🤜', zone: 'streets',
    baseHp: 40, baseAtk: 6, baseDef: 2, baseSpd: 3,
    scaling: 1.15, xp: [10, 20], gold: [5, 15], minLevel: 1,
  },
  stray_dog: {
    name: 'Stray Dog', icon: '🐕', zone: 'streets',
    baseHp: 30, baseAtk: 8, baseDef: 1, baseSpd: 6,
    scaling: 1.15, xp: [12, 22], gold: [8, 18], minLevel: 1,
  },
  pickpocket: {
    name: 'Pickpocket', icon: '🦹', zone: 'streets',
    baseHp: 35, baseAtk: 7, baseDef: 3, baseSpd: 8,
    scaling: 1.15, xp: [15, 25], gold: [12, 25], minLevel: 2,
  },

  // Zone 2: Underground (Lv 5-10)
  sewer_rat: {
    name: 'Giant Sewer Rat', icon: '🐀', zone: 'underground',
    baseHp: 60, baseAtk: 12, baseDef: 5, baseSpd: 7,
    scaling: 1.18, xp: [25, 45], gold: [20, 40], minLevel: 5,
  },
  gang_enforcer: {
    name: 'Gang Enforcer', icon: '💪', zone: 'underground',
    baseHp: 80, baseAtk: 15, baseDef: 10, baseSpd: 4,
    scaling: 1.18, xp: [30, 55], gold: [25, 50], minLevel: 5,
  },
  tunnel_lurker: {
    name: 'Tunnel Lurker', icon: '👁️', zone: 'underground',
    baseHp: 55, baseAtk: 18, baseDef: 4, baseSpd: 10,
    scaling: 1.18, xp: [35, 60], gold: [30, 55], minLevel: 7,
  },

  // Zone 3: Warzone (Lv 10-16)
  rogue_soldier: {
    name: 'Rogue Soldier', icon: '🪖', zone: 'warzone',
    baseHp: 120, baseAtk: 25, baseDef: 15, baseSpd: 8,
    scaling: 1.2, xp: [60, 100], gold: [50, 90], minLevel: 10,
  },
  war_mech: {
    name: 'War Mech', icon: '🤖', zone: 'warzone',
    baseHp: 180, baseAtk: 20, baseDef: 30, baseSpd: 3,
    scaling: 1.2, xp: [70, 120], gold: [60, 110], minLevel: 12,
  },
  sniper: {
    name: 'Sniper', icon: '🎯', zone: 'warzone',
    baseHp: 80, baseAtk: 40, baseDef: 8, baseSpd: 12,
    scaling: 1.2, xp: [80, 130], gold: [65, 120], minLevel: 13,
  },

  // Zone 4: Dragon's Lair (Lv 16-25)
  drake: {
    name: 'Drake', icon: '🦎', zone: 'dragons_lair',
    baseHp: 200, baseAtk: 35, baseDef: 25, baseSpd: 10,
    scaling: 1.22, xp: [120, 200], gold: [100, 180], minLevel: 16,
  },
  dragon_knight: {
    name: 'Dragon Knight', icon: '🏇', zone: 'dragons_lair',
    baseHp: 250, baseAtk: 40, baseDef: 35, baseSpd: 8,
    scaling: 1.22, xp: [150, 250], gold: [130, 220], minLevel: 18,
  },
  elder_wyrm: {
    name: 'Elder Wyrm', icon: '🐲', zone: 'dragons_lair',
    baseHp: 350, baseAtk: 50, baseDef: 30, baseSpd: 14,
    scaling: 1.25, xp: [200, 350], gold: [180, 300], minLevel: 20,
  },
};

// ─── Raid Bosses ────────────────────────────────

export const RAIDS = {
  sewer_king: {
    name: 'The Sewer King', icon: '👑🐀',
    description: 'A massive mutant rat lord of the underground',
    hp: 500, atk: 20, def: 15, spd: 6,
    minLevel: 5, staminaCost: 3,
    rewards: { xp: [100, 200], gold: [150, 300] },
    lootTable: ['steel_bat', 'chain_mail', 'iron_helm', 'combat_boots'],
    lootChance: 0.5,
  },
  warlord: {
    name: 'Warlord Krax', icon: '⚔️💀',
    description: 'Ruthless commander of the wastelands',
    hp: 1200, atk: 35, def: 25, spd: 9,
    minLevel: 10, staminaCost: 5,
    rewards: { xp: [250, 500], gold: [400, 700] },
    lootTable: ['katana', 'tactical_armor', 'war_helm', 'rocket_boots', 'power_ring'],
    lootChance: 0.4,
  },
  mech_titan: {
    name: 'Mech Titan', icon: '🤖💥',
    description: 'A colossal war machine from the old world',
    hp: 2500, atk: 55, def: 40, spd: 5,
    minLevel: 15, staminaCost: 7,
    rewards: { xp: [500, 900], gold: [800, 1500] },
    lootTable: ['plasma_cannon', 'nano_suit', 'crown_of_thorns', 'shadow_treads', 'soul_gem'],
    lootChance: 0.35,
  },
  ancient_dragon: {
    name: 'Ancient Dragon', icon: '🐉🔥',
    description: 'The legendary beast that ended the old age',
    hp: 5000, atk: 80, def: 55, spd: 12,
    minLevel: 20, staminaCost: 10,
    rewards: { xp: [1000, 2000], gold: [2000, 4000] },
    lootTable: ['dragon_fang', 'dragon_scale', 'void_crown', 'heart_of_dragon', 'void_scythe'],
    lootChance: 0.25,
  },
};

// ─── Zones ──────────────────────────────────────

export const ZONES = {
  streets:      { name: 'The Streets',    icon: '🏙️', minLevel: 1,  staminaCost: 1 },
  underground:  { name: 'Underground',    icon: '🕳️', minLevel: 5,  staminaCost: 2 },
  warzone:      { name: 'The Warzone',    icon: '💣', minLevel: 10, staminaCost: 3 },
  dragons_lair: { name: "Dragon's Lair",  icon: '🐉', minLevel: 16, staminaCost: 4 },
};

// ─── Leveling ───────────────────────────────────

export const LEVEL_CONFIG = {
  xpBase: 80,
  xpMultiplier: 1.3,
  hpPerLevel: 12,
  attackPerLevel: 2,
  defensePerLevel: 1,
  speedPerLevel: 1,
  strengthPerLevel: 1,
  maxLevel: 30,
  // Skill offering: pick 1 of 3 random skills on level-up
  skillOffersPerLevel: 3,
  skillPointsPerLevel: 1,
};

// ─── Economy ────────────────────────────────────

export const ECONOMY = {
  startingGold: 100,
  maxStamina: 10,
  staminaRegenSeconds: 300, // 5 min per stamina
  pvpStaminaCost: 2,
  healCostPerHp: 1,
  sellMultiplier: 0.4, // sell items for 40% of value
  networthMultipliers: {
    gold: 1,
    equipmentValue: 1.5,
    levelValue: 100, // each level adds 100 networth
  },
};

export const CANVAS = {
  width: 800,
  height: 500,
  padding: 20,
  cornerRadius: 12,
};
