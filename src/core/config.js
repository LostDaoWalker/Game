// NEXUS — Game Data
// Single source of truth for all game constants and content tables.

export const THEME = {
  name: 'NEXUS', tagline: 'Fight. Loot. Dominate.',
  colors: {
    bg: '#0a0e17', panel: '#1a1f2e', panelLight: '#242b3d',
    border: '#2d3548', primary: '#00f0ff', secondary: '#a855f7',
    accent: '#f59e0b', success: '#10b981', danger: '#ef4444',
    text: '#e2e8f0', textDim: '#94a3b8', textMuted: '#64748b',
    xpBar: '#8b5cf6', hpBar: '#ef4444', staminaBar: '#f59e0b',
    gold: '#fbbf24', legendary: '#f97316', energyBar: '#06b6d4',
  },
};

export const RARITIES = {
  common: { color: '#94a3b8', weight: 60 }, uncommon: { color: '#22c55e', weight: 25 },
  rare: { color: '#3b82f6', weight: 10 }, epic: { color: '#a855f7', weight: 4 },
  legendary: { color: '#f97316', weight: 1 },
};

export const SLOT_ICONS = { weapon: '⚔️', armor: '🛡️', helmet: '⛑️', boots: '👟', accessory: '💍' };
export const EQUIPMENT_SLOTS = Object.keys(SLOT_ICONS);

// SSOT: nav tabs used by both canvas layout and Discord buttons
export const TABS = ['DASHBOARD', 'FIGHT', 'RAIDS', 'INVENTORY', 'SKILLS', 'PROFILE'];

// [id, name, slot, rarity, icon, stats, sellValue, dropLevel]
const EQ = [
  ['rusty_pipe','Rusty Pipe','weapon','common','🔧',{attack:3},10,1],
  ['combat_knife','Combat Knife','weapon','common','🔪',{attack:5},20,1],
  ['steel_bat','Steel Bat','weapon','uncommon','🏏',{attack:8,strength:2},50,2],
  ['katana','Katana','weapon','uncommon','⚔️',{attack:12,speed:3},80,4],
  ['power_fist','Power Fist','weapon','rare','🥊',{attack:18,strength:5},200,6],
  ['laser_blade','Laser Blade','weapon','rare','🗡️',{attack:25,speed:5,strength:3},400,8],
  ['plasma_cannon','Plasma Cannon','weapon','epic','🔫',{attack:35,strength:8},800,12],
  ['void_scythe','Void Scythe','weapon','epic','⚡',{attack:45,speed:8,strength:5},1500,16],
  ['dragon_fang','Dragon Fang','weapon','legendary','🐉',{attack:60,strength:12,speed:10},5000,20],
  ['torn_jacket','Torn Jacket','armor','common','🧥',{defense:3},10,1],
  ['leather_vest','Leather Vest','armor','common','🦺',{defense:5,hp:10},25,1],
  ['chain_mail','Chain Mail','armor','uncommon','🛡️',{defense:10,hp:20},60,3],
  ['tactical_armor','Tactical Armor','armor','rare','🎽',{defense:20,hp:40,strength:3},300,7],
  ['nano_suit','Nano Suit','armor','epic','🦾',{defense:35,hp:60,speed:5},1000,13],
  ['dragon_scale','Dragon Scale Armor','armor','legendary','🐲',{defense:55,hp:100,strength:8},5000,20],
  ['bandana','Bandana','helmet','common','🎭',{defense:2},8,1],
  ['iron_helm','Iron Helm','helmet','uncommon','⛑️',{defense:6,hp:15},45,3],
  ['war_helm','War Helm','helmet','rare','🪖',{defense:12,hp:25,strength:2},200,7],
  ['crown_of_thorns','Crown of Thorns','helmet','epic','👑',{defense:20,hp:40,attack:10},900,14],
  ['void_crown','Void Crown','helmet','legendary','💀',{defense:30,hp:60,attack:15,speed:8},4000,20],
  ['worn_sneakers','Worn Sneakers','boots','common','👟',{speed:2},8,1],
  ['combat_boots','Combat Boots','boots','uncommon','🥾',{speed:5,defense:3},40,3],
  ['rocket_boots','Rocket Boots','boots','rare','🚀',{speed:12,defense:5},250,8],
  ['shadow_treads','Shadow Treads','boots','epic','🌑',{speed:20,defense:10,attack:5},800,14],
  ['lucky_coin','Lucky Coin','accessory','common','🪙',{speed:1,attack:1},15,1],
  ['power_ring','Power Ring','accessory','uncommon','💍',{strength:5,attack:3},55,4],
  ['amulet_of_fury','Amulet of Fury','accessory','rare','📿',{attack:10,strength:5,speed:3},350,9],
  ['soul_gem','Soul Gem','accessory','epic','💎',{attack:15,defense:10,hp:50,strength:5},1200,15],
  ['heart_of_dragon','Heart of the Dragon','accessory','legendary','❤️‍🔥',{attack:20,defense:15,hp:80,strength:10,speed:10},6000,20],
];
export const EQUIPMENT = Object.fromEntries(EQ.map(([id,name,slot,rarity,icon,stats,sellValue,dropLevel]) =>
  [id, Object.freeze({ name, slot, rarity, icon, stats: Object.freeze(stats), sellValue, dropLevel })]));

// [id, name, icon, type, description, effect, maxLevel]
const SK = [
  ['berserker_rage','Berserker Rage','😤','offensive','1.5x dmg below 30% HP',{lowHpDmgMult:1.5},3],
  ['double_strike','Double Strike','⚔️','offensive','20% chance to attack twice',{doubleStrikeChance:.2},3],
  ['critical_eye','Critical Eye','🎯','offensive','+15% crit, 2x crit dmg',{critChance:.15,critMult:2},3],
  ['armor_break','Armor Break','💥','offensive','Ignore 25% enemy defense',{armorPen:.25},3],
  ['poison_strike','Poison Strike','🧪','offensive','15% poison over 3 turns',{poisonChance:.15,poisonDmg:.1},3],
  ['iron_wall','Iron Wall','🧱','defensive','Reduce incoming dmg 10%',{dmgReduction:.1},3],
  ['regeneration','Regeneration','💚','defensive','Heal 5% max HP/turn',{regenPercent:.05},3],
  ['dodge_master','Dodge Master','💨','defensive','12% full dodge chance',{dodgeChance:.12},3],
  ['counter_attack','Counter Attack','🔄','defensive','20% counter when hit',{counterChance:.2},3],
  ['last_stand','Last Stand','🛡️','defensive','Survive lethal blow once',{lastStand:true},1],
  ['gold_digger','Gold Digger','💰','utility','+20% gold from all sources',{goldBonus:.2},3],
  ['quick_learner','Quick Learner','📖','utility','+15% XP from all sources',{xpBonus:.15},3],
  ['lucky_looter','Lucky Looter','🍀','utility','Better loot rarity',{lootBonus:1},3],
  ['intimidate','Intimidate','👊','utility','Enemy starts -10% ATK',{enemyAtkReduction:.1},3],
];
export const SKILLS = Object.fromEntries(SK.map(([id,name,icon,type,description,effect,maxLevel]) =>
  [id, Object.freeze({ name, icon, type, description, effect: Object.freeze(effect), maxLevel })]));

// [id, name, icon, zone, hp, atk, def, spd, scaling, xpRange, goldRange, minLevel]
const EN = [
  ['street_thug','Street Thug','🤜','streets',40,6,2,3,1.15,[10,20],[5,15],1],
  ['stray_dog','Stray Dog','🐕','streets',30,8,1,6,1.15,[12,22],[8,18],1],
  ['pickpocket','Pickpocket','🦹','streets',35,7,3,8,1.15,[15,25],[12,25],2],
  ['sewer_rat','Giant Sewer Rat','🐀','underground',60,12,5,7,1.18,[25,45],[20,40],5],
  ['gang_enforcer','Gang Enforcer','💪','underground',80,15,10,4,1.18,[30,55],[25,50],5],
  ['tunnel_lurker','Tunnel Lurker','👁️','underground',55,18,4,10,1.18,[35,60],[30,55],7],
  ['rogue_soldier','Rogue Soldier','🪖','warzone',120,25,15,8,1.2,[60,100],[50,90],10],
  ['war_mech','War Mech','🤖','warzone',180,20,30,3,1.2,[70,120],[60,110],12],
  ['sniper','Sniper','🎯','warzone',80,40,8,12,1.2,[80,130],[65,120],13],
  ['drake','Drake','🦎','dragons_lair',200,35,25,10,1.22,[120,200],[100,180],16],
  ['dragon_knight','Dragon Knight','🏇','dragons_lair',250,40,35,8,1.22,[150,250],[130,220],18],
  ['elder_wyrm','Elder Wyrm','🐲','dragons_lair',350,50,30,14,1.25,[200,350],[180,300],20],
];
export const ENEMIES = Object.fromEntries(EN.map(([id,name,icon,zone,baseHp,baseAtk,baseDef,baseSpd,scaling,xp,gold,minLevel]) =>
  [id, Object.freeze({ name, icon, zone, baseHp, baseAtk, baseDef, baseSpd, scaling, xp, gold, minLevel })]));

// Flattened rewards (no nested .rewards.xp — Law of Demeter)
// [id, name, icon, desc, hp, atk, def, spd, minLevel, staminaCost, xpRange, goldRange, lootTable, lootChance]
const RD = [
  ['sewer_king','The Sewer King','👑🐀','Mutant rat lord',500,20,15,6,5,3,[100,200],[150,300],['steel_bat','chain_mail','iron_helm','combat_boots'],.5],
  ['warlord','Warlord Krax','⚔️💀','Ruthless commander',1200,35,25,9,10,5,[250,500],[400,700],['katana','tactical_armor','war_helm','rocket_boots','power_ring'],.4],
  ['mech_titan','Mech Titan','🤖💥','Colossal war machine',2500,55,40,5,15,7,[500,900],[800,1500],['plasma_cannon','nano_suit','crown_of_thorns','shadow_treads','soul_gem'],.35],
  ['ancient_dragon','Ancient Dragon','🐉🔥','Legendary beast',5000,80,55,12,20,10,[1000,2000],[2000,4000],['dragon_fang','dragon_scale','void_crown','heart_of_dragon','void_scythe'],.25],
];
export const RAIDS = Object.fromEntries(RD.map(([id,name,icon,description,hp,atk,def,spd,minLevel,staminaCost,xp,gold,lootTable,lootChance]) =>
  [id, Object.freeze({ name, icon, description, hp, atk, def, spd, minLevel, staminaCost, xp, gold, lootTable: Object.freeze(lootTable), lootChance })]));

export const ZONES = Object.freeze({
  streets:      { name: 'The Streets',   icon: '🏙️', minLevel: 1,  staminaCost: 1 },
  underground:  { name: 'Underground',   icon: '🕳️', minLevel: 5,  staminaCost: 2 },
  warzone:      { name: 'The Warzone',   icon: '💣', minLevel: 10, staminaCost: 3 },
  dragons_lair: { name: "Dragon's Lair", icon: '🐉', minLevel: 16, staminaCost: 4 },
});

export const LEVEL = Object.freeze({ xpBase: 80, xpMult: 1.3, hp: 12, atk: 2, def: 1, spd: 1, str: 1, max: 30 });

export const ECO = Object.freeze({
  startGold: 100, maxStamina: 10, staminaRegen: 300,
  pvpCost: 2, healPerHp: 1, sellMult: 0.4,
  networth: Object.freeze({ gold: 1, equip: 1.5, level: 100 }),
});

export const CANVAS = Object.freeze({ width: 800, height: 500 });
