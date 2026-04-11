// TIANMING — Game Data
// Single source of truth for all game constants and content tables.

export const THEME = {
  name: 'TIANMING', tagline: 'Cultivate. Ascend. Transcend.',
  colors: {
    bg: '#09090b', panel: '#131316', panelLight: '#1c1c21',
    border: '#27272a', primary: '#e4e4e7', secondary: '#a1a1aa',
    accent: '#f5c542', success: '#4ade80', danger: '#f87171',
    text: '#fafafa', textDim: '#a1a1aa', textMuted: '#52525b',
    xpBar: '#a78bfa', hpBar: '#f87171', staminaBar: '#fbbf24',
    gold: '#f5c542', legendary: '#fb923c', energyBar: '#38bdf8',
  },
};

export const RARITIES = {
  common: { color: '#a1a1aa', weight: 60 }, uncommon: { color: '#4ade80', weight: 25 },
  rare: { color: '#38bdf8', weight: 10 }, epic: { color: '#a78bfa', weight: 4 },
  legendary: { color: '#fb923c', weight: 1 },
};

export const SLOT_ICONS = { weapon: '⚔️', armor: '🛡️', helmet: '👒', boots: '👟', accessory: '💍' };
export const EQUIPMENT_SLOTS = Object.keys(SLOT_ICONS);

// ── Equipment ──
// [id, name, slot, rarity, icon, stats, sellValue, dropLevel]
const EQ = [
  // Starter
  ['pipe_wrench','Rusty Sword','weapon','common','🗡️',{attack:3},10,1],
  ['box_cutter','Iron Jian','weapon','common','⚔️',{attack:5},20,1],
  ['tire_iron','Spirit Blade','weapon','uncommon','🔮',{attack:8,strength:2},50,2],
  ['switchblade','Demon Fang Saber','weapon','uncommon','🌙',{attack:12,speed:3},80,4],
  // Mid
  ['brass_knuckles','Thunderstrike Gauntlet','weapon','rare','🥊',{attack:18,strength:5},200,6],
  ['carbon_blade','Moonlight Blade','weapon','rare','✨',{attack:25,speed:5,strength:3},400,8],
  // High
  ['custom_45','Phoenix Feather Sword','weapon','epic','🔥',{attack:35,strength:8},800,12],
  ['obsidian_edge','Void Edge','weapon','epic','⚡',{attack:45,speed:8,strength:5},1500,16],
  ['black_card','Heaven\'s Will','weapon','legendary','🌟',{attack:60,strength:12,speed:10},5000,20],
  ['hoodie','Disciple Robes','armor','common','👕',{defense:3},10,1],
  ['leather_jacket','Spirit Hide Vest','armor','common','🧥',{defense:5,hp:10},25,1],
  ['kevlar_vest','Jade Scale Armor','armor','uncommon','🦺',{defense:10,hp:20},60,3],
  ['tailored_suit','Celestial Silk Robe','armor','rare','👘',{defense:20,hp:40,strength:3},300,7],
  ['armored_overcoat','Dragon Scale Mail','armor','epic','🧥',{defense:35,hp:60,speed:5},1000,13],
  ['black_label_suit','Immortal Vestments','armor','legendary','🐉',{defense:55,hp:100,strength:8},5000,20],
  ['snapback','Straw Hat','helmet','common','👒',{defense:2},8,1],
  ['hard_hat','Iron Spirit Helm','helmet','uncommon','⛑️',{defense:6,hp:15},45,3],
  ['tactical_helmet','Phoenix Crest Crown','helmet','rare','🪖',{defense:12,hp:25,strength:2},200,7],
  ['gold_crown','Golden Dragon Crown','helmet','epic','👑',{defense:20,hp:40,attack:10},900,14],
  ['diamond_crown','Jade Emperor\'s Diadem','helmet','legendary','💎',{defense:30,hp:60,attack:15,speed:8},4000,20],
  ['beat_up_nikes','Worn Sandals','boots','common','🩴',{speed:2},8,1],
  ['work_boots','Cloud Walker Boots','boots','uncommon','🥾',{speed:5,defense:3},40,3],
  ['designer_sneakers','Wind Step Shoes','boots','rare','👟',{speed:12,defense:5},250,8],
  ['carbon_runners','Celestial Treads','boots','epic','🏃',{speed:20,defense:10,attack:5},800,14],
  ['lucky_penny','Spirit Stone Charm','accessory','common','🪙',{speed:1,attack:1},15,1],
  ['silver_chain','Jade Pendant','accessory','uncommon','📿',{strength:5,attack:3},55,4],
  ['gold_watch','Golden Qi Ring','accessory','rare','💫',{attack:10,strength:5,speed:3},350,9],
  ['diamond_ring','Dragon Pearl','accessory','epic','💍',{attack:15,defense:10,hp:50,strength:5},1200,15],
  ['black_amex','Heavenly Mandate Seal','accessory','legendary','🏮',{attack:20,defense:15,hp:80,strength:10,speed:10},6000,20],
];
export const EQUIPMENT = Object.fromEntries(EQ.map(([id,name,slot,rarity,icon,stats,sellValue,dropLevel]) =>
  [id, Object.freeze({ name, slot, rarity, icon, stats: Object.freeze(stats), sellValue, dropLevel })]));

// ── Skills ──
// [id, name, icon, type, description, effect, maxLevel]
const SK = [
  ['berserker_rage','Inner Demon','😤','offensive','1.5x dmg below 30% HP',{lowHpDmgMult:1.5},3],
  ['double_strike','Twin Strike','⚔️','offensive','20% chance to hit twice',{doubleStrikeChance:.2},3],
  ['critical_eye','Qi Focus','🎯','offensive','+15% crit, 2x crit dmg',{critChance:.15,critMult:2},3],
  ['iron_wall','Iron Body','🧱','defensive','Reduce incoming dmg 10%',{dmgReduction:.1},3],
  ['regeneration','Qi Regeneration','💚','defensive','Heal 5% max HP/turn',{regenPercent:.05},3],
  ['dodge_master','Phantom Step','💨','defensive','12% full dodge chance',{dodgeChance:.12},3],
  ['gold_digger','Fortune\'s Blessing','💰','utility','+20% gold from all sources',{goldBonus:.2},3],
  ['quick_learner','Enlightenment','📖','utility','+15% XP from all sources',{xpBonus:.15},3],
];
export const SKILLS = Object.fromEntries(SK.map(([id,name,icon,type,description,effect,maxLevel]) =>
  [id, Object.freeze({ name, icon, type, description, effect: Object.freeze(effect), maxLevel })]));

// ── Opponents ──
// [id, name, icon, zone, hp, atk, def, spd, scaling, xpRange, goldRange, minLevel]
const EN = [
  // Mortal Village — starting out
  ['stray_cat','Wild Fox Spirit','🦊','neighborhood',30,8,1,6,1.15,[12,22],[8,18],1],
  ['troublemaker','Bandit','🗡️','neighborhood',40,6,2,3,1.15,[10,20],[5,15],1],
  ['prankster','Rogue Disciple','👤','neighborhood',35,7,3,8,1.15,[15,25],[12,25],2],
  // Misty Forest — building up
  ['debt_collector','Forest Demon','👹','downtown',60,12,5,7,1.18,[25,45],[20,40],5],
  ['security_guard','Corrupted Monk','🧘','downtown',80,15,10,4,1.18,[30,55],[25,50],5],
  ['repo_agent','Spirit Hunter','👁️','downtown',55,18,4,10,1.18,[35,60],[30,55],7],
  // Sacred Peak — real competition
  ['rival_trader','Rival Cultivator','⚔️','business',120,25,15,8,1.2,[60,100],[50,90],10],
  ['security_team','Golem Guardian','🤖','business',180,20,30,3,1.2,[70,120],[60,110],12],
  ['headhunter','Shadow Assassin','🎯','business',80,40,8,12,1.2,[80,130],[65,120],13],
  // Celestial Palace — the big leagues
  ['rival_exec','Fallen Immortal','🐍','topfloor',200,35,25,10,1.22,[120,200],[100,180],16],
  ['corporate_team','Celestial Guard','⚔️','topfloor',250,40,35,8,1.22,[150,250],[130,220],18],
  ['the_chairman','Ancient Dragon','🐲','topfloor',350,50,30,14,1.25,[200,350],[180,300],20],
];
export const ENEMIES = Object.fromEntries(EN.map(([id,name,icon,zone,baseHp,baseAtk,baseDef,baseSpd,scaling,xp,gold,minLevel]) =>
  [id, Object.freeze({ name, icon, zone, baseHp, baseAtk, baseDef, baseSpd, scaling, xp, gold, minLevel })]));


export const ZONES = Object.freeze({
  neighborhood: { name: 'Mortal Village',     icon: '🏘️', minLevel: 1,  staminaCost: 1 },
  downtown:     { name: 'Misty Forest',       icon: '🌲', minLevel: 5,  staminaCost: 2 },
  business:     { name: 'Sacred Peak',        icon: '⛰️', minLevel: 10, staminaCost: 3 },
  topfloor:     { name: 'Celestial Palace',   icon: '🏯', minLevel: 16, staminaCost: 4 },
});

export const LEVEL = Object.freeze({ xpBase: 80, xpMult: 1.3, hp: 12, atk: 2, def: 1, spd: 1, str: 1 });

export const ECO = Object.freeze({
  startGold: 100, maxStamina: 10, staminaRegen: 300, sellMult: 0.4,
  networth: Object.freeze({ gold: 1, equip: 1.5, level: 100 }),
});

export const CANVAS = Object.freeze({ width: 800, height: 500 });

// ── Cultivation Realms — display title based on level ──
export const REALMS = Object.freeze([
  { maxLevel: 4,        name: 'Mortal',                   icon: '🧑' },
  { maxLevel: 9,        name: 'Martial Artist',           icon: '🥋' },
  { maxLevel: 14,       name: 'Qi Condensation',          icon: '✨' },
  { maxLevel: 19,       name: 'Foundation Establishment',  icon: '🏗️' },
  { maxLevel: Infinity, name: 'Golden Core',              icon: '🌟' },
]);
export function getRealm(level) {
  for (const r of REALMS) if (level <= r.maxLevel) return r;
  return REALMS[REALMS.length - 1];
}

// ── Bloodlines — randomized at character creation ──
export const BLOODLINES = Object.freeze({
  dragon:   { name: 'Dragon Blood',         icon: '🐉', bonus: { strength: 3 },              weight: 5 },
  phoenix:  { name: 'Phoenix Lineage',      icon: '🔥', bonus: { speed: 3 },                 weight: 5 },
  tiger:    { name: 'White Tiger Clan',     icon: '🐯', bonus: { attack: 2 },                weight: 15 },
  tortoise: { name: 'Black Tortoise Line',  icon: '🐢', bonus: { defense: 2 },               weight: 15 },
  serpent:  { name: 'Jade Serpent Heritage', icon: '🐍', bonus: { hp: 10 },                   weight: 15 },
  common:   { name: 'Ordinary Bloodline',   icon: '🩸', bonus: {},                            weight: 45 },
});

// ── Physiques — randomized at character creation ──
export const PHYSIQUES = Object.freeze({
  heavenly: { name: 'Heavenly Spirit Body', icon: '✨', bonus: { hp: 15, strength: 1 },      weight: 5 },
  iron:     { name: 'Iron Bone Physique',   icon: '🦴', bonus: { defense: 2 },                weight: 15 },
  wind:     { name: 'Wind Spirit Body',     icon: '💨', bonus: { speed: 2 },                  weight: 15 },
  flame:    { name: 'Flame Meridians',      icon: '🔥', bonus: { attack: 2 },                 weight: 15 },
  ordinary: { name: 'Ordinary Physique',    icon: '🧘', bonus: {},                            weight: 50 },
});

// ── Talents — randomized at character creation ──
export const TALENTS = Object.freeze({
  sword:    { name: 'Sword Prodigy',              icon: '⚔️', bonus: { attack: 3 },           weight: 8 },
  shield:   { name: 'Shield Master',              icon: '🛡️', bonus: { defense: 3 },          weight: 8 },
  spirit:   { name: 'Spirit Sense',               icon: '👁️', bonus: { speed: 3 },            weight: 8 },
  body:     { name: 'Body Cultivation Genius',     icon: '💪', bonus: { strength: 3 },         weight: 8 },
  balanced: { name: 'Balanced Foundation',         icon: '☯️', bonus: { attack: 1, defense: 1, speed: 1, strength: 1 }, weight: 18 },
  dull:     { name: 'Dull Roots',                  icon: '🪨', bonus: {},                      weight: 50 },
});

// ── Ancestors — patron worship, build favor for boons ──
export const ANCESTORS = Object.freeze({
  azure_dragon: {
    name: 'Azure Dragon', icon: '🐉', bg: '#0a1a2e', accent: '#38bdf8', pattern: 'wave',
    desc: 'Dragon of the East — grants power through perseverance',
    boons: Object.freeze([
      Object.freeze({ favor: 50,   name: 'Dragon Scales',  bonus: Object.freeze({ defense: 3 }) }),
      Object.freeze({ favor: 200,  name: 'Dragon Breath',  bonus: Object.freeze({ attack: 5 }) }),
      Object.freeze({ favor: 500,  name: 'Dragon Soul',    bonus: Object.freeze({ strength: 8 }) }),
    ]),
  },
  vermilion_bird: {
    name: 'Vermilion Bird', icon: '🔥', bg: '#1a0f0a', accent: '#fb923c', pattern: 'flame',
    desc: 'Phoenix of the South — blesses with swiftness and rebirth',
    boons: Object.freeze([
      Object.freeze({ favor: 50,   name: 'Phoenix Feather', bonus: Object.freeze({ speed: 3 }) }),
      Object.freeze({ favor: 200,  name: 'Phoenix Wings',   bonus: Object.freeze({ speed: 5, attack: 3 }) }),
      Object.freeze({ favor: 500,  name: 'Rebirth Flame',   bonus: Object.freeze({ hp: 30 }) }),
    ]),
  },
  white_tiger: {
    name: 'White Tiger', icon: '🐯', bg: '#1a1a2e', accent: '#e4e4e7', pattern: 'cross',
    desc: 'Tiger of the West — rewards aggression with raw power',
    boons: Object.freeze([
      Object.freeze({ favor: 50,   name: 'Tiger Claws',     bonus: Object.freeze({ attack: 4 }) }),
      Object.freeze({ favor: 200,  name: 'Tiger Roar',      bonus: Object.freeze({ strength: 5 }) }),
      Object.freeze({ favor: 500,  name: 'Tiger God',       bonus: Object.freeze({ attack: 8 }) }),
    ]),
  },
  black_tortoise: {
    name: 'Black Tortoise', icon: '🐢', bg: '#0a1a14', accent: '#4ade80', pattern: 'dots',
    desc: 'Tortoise of the North — shields the devoted with endurance',
    boons: Object.freeze([
      Object.freeze({ favor: 50,   name: 'Shell Guard',     bonus: Object.freeze({ defense: 4 }) }),
      Object.freeze({ favor: 200,  name: 'Stone Skin',      bonus: Object.freeze({ hp: 20, defense: 3 }) }),
      Object.freeze({ favor: 500,  name: 'Eternal Bastion',  bonus: Object.freeze({ defense: 8, hp: 15 }) }),
    ]),
  },
  void_serpent: {
    name: 'Void Serpent', icon: '🐍', bg: '#1a0a2e', accent: '#a78bfa', pattern: 'diamond',
    desc: 'Serpent of the Void — favors cunning and hidden strength',
    boons: Object.freeze([
      Object.freeze({ favor: 50,   name: 'Venom Fang',      bonus: Object.freeze({ attack: 2, speed: 2 }) }),
      Object.freeze({ favor: 200,  name: 'Serpent Eyes',     bonus: Object.freeze({ speed: 4, strength: 2 }) }),
      Object.freeze({ favor: 500,  name: 'Void Embrace',    bonus: Object.freeze({ attack: 4, speed: 4, strength: 4 }) }),
    ]),
  },
});

// Backwards compat: AVATARS maps to ANCESTORS for card rendering
export const AVATARS = Object.fromEntries(
  Object.entries(ANCESTORS).map(([id, a]) => [id, { name: a.name, bg: a.bg, accent: a.accent, pattern: a.pattern }])
);

// ── Networth frame tiers — card border color by wealth ──
export const FRAME_TIERS = Object.freeze([
  { min: 0,        color: '#52525b', label: 'Mortal' },
  { min: 1000,     color: '#a1a1aa', label: 'Spirit' },
  { min: 10000,    color: '#f5c542', label: 'Golden Core' },
  { min: 100000,   color: '#38bdf8', label: 'Nascent Soul' },
  { min: 1000000,  color: '#a78bfa', label: 'Immortal' },
  { min: 10000000, color: '#fb923c', label: 'Celestial Emperor' },
]);

