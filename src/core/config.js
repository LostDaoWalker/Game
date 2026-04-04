// HALCYON — Game Data
// Single source of truth for all game constants and content tables.

export const THEME = {
  name: 'HALCYON', tagline: 'Rise. Earn. Own.',
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

export const SLOT_ICONS = { weapon: '⚔️', armor: '🛡️', helmet: '⛑️', boots: '👟', accessory: '💍' };
export const EQUIPMENT_SLOTS = Object.keys(SLOT_ICONS);
export const TABS = ['HOME', 'FIGHT', 'RAIDS', 'ASSETS', 'INVENTORY'];

// ── Equipment ──
// [id, name, slot, rarity, icon, stats, sellValue, dropLevel]
const EQ = [
  // Poor tier — scrappy street gear
  ['pipe_wrench','Pipe Wrench','weapon','common','🔧',{attack:3},10,1],
  ['box_cutter','Box Cutter','weapon','common','🔪',{attack:5},20,1],
  ['tire_iron','Tire Iron','weapon','uncommon','🏏',{attack:8,strength:2},50,2],
  ['switchblade','Switchblade','weapon','uncommon','⚔️',{attack:12,speed:3},80,4],
  // Mid tier — climbing the ladder
  ['brass_knuckles','Brass Knuckles','weapon','rare','🥊',{attack:18,strength:5},200,6],
  ['carbon_blade','Carbon Blade','weapon','rare','🗡️',{attack:25,speed:5,strength:3},400,8],
  // Rich tier — real power
  ['custom_45','Custom .45','weapon','epic','🔫',{attack:35,strength:8},800,12],
  ['obsidian_edge','Obsidian Edge','weapon','epic','⚡',{attack:45,speed:8,strength:5},1500,16],
  ['black_card','The Black Card','weapon','legendary','💳',{attack:60,strength:12,speed:10},5000,20],
  ['hoodie','Hoodie','armor','common','👕',{defense:3},10,1],
  ['leather_jacket','Leather Jacket','armor','common','🧥',{defense:5,hp:10},25,1],
  ['kevlar_vest','Kevlar Vest','armor','uncommon','🦺',{defense:10,hp:20},60,3],
  ['tailored_suit','Tailored Suit','armor','rare','🎽',{defense:20,hp:40,strength:3},300,7],
  ['armored_overcoat','Armored Overcoat','armor','epic','🧥',{defense:35,hp:60,speed:5},1000,13],
  ['black_label_suit','Black Label Suit','armor','legendary','🤵',{defense:55,hp:100,strength:8},5000,20],
  ['snapback','Snapback','helmet','common','🧢',{defense:2},8,1],
  ['hard_hat','Hard Hat','helmet','uncommon','⛑️',{defense:6,hp:15},45,3],
  ['tactical_helmet','Tactical Helmet','helmet','rare','🪖',{defense:12,hp:25,strength:2},200,7],
  ['gold_crown','Gold Crown','helmet','epic','👑',{defense:20,hp:40,attack:10},900,14],
  ['diamond_crown','Diamond Crown','helmet','legendary','💎',{defense:30,hp:60,attack:15,speed:8},4000,20],
  ['beat_up_nikes','Beat-Up Nikes','boots','common','👟',{speed:2},8,1],
  ['work_boots','Work Boots','boots','uncommon','🥾',{speed:5,defense:3},40,3],
  ['designer_sneakers','Designer Sneakers','boots','rare','👟',{speed:12,defense:5},250,8],
  ['carbon_runners','Carbon Runners','boots','epic','🏃',{speed:20,defense:10,attack:5},800,14],
  ['lucky_penny','Lucky Penny','accessory','common','🪙',{speed:1,attack:1},15,1],
  ['silver_chain','Silver Chain','accessory','uncommon','⛓️',{strength:5,attack:3},55,4],
  ['gold_watch','Gold Watch','accessory','rare','⌚',{attack:10,strength:5,speed:3},350,9],
  ['diamond_ring','Diamond Ring','accessory','epic','💍',{attack:15,defense:10,hp:50,strength:5},1200,15],
  ['black_amex','Black Amex','accessory','legendary','💳',{attack:20,defense:15,hp:80,strength:10,speed:10},6000,20],
];
export const EQUIPMENT = Object.fromEntries(EQ.map(([id,name,slot,rarity,icon,stats,sellValue,dropLevel]) =>
  [id, Object.freeze({ name, slot, rarity, icon, stats: Object.freeze(stats), sellValue, dropLevel })]));

// ── Skills ──
// [id, name, icon, type, description, effect, maxLevel]
const SK = [
  ['berserker_rage','Desperation','😤','offensive','1.5x dmg below 30% HP',{lowHpDmgMult:1.5},3],
  ['double_strike','Double Tap','⚔️','offensive','20% chance to hit twice',{doubleStrikeChance:.2},3],
  ['critical_eye','Precision','🎯','offensive','+15% crit, 2x crit dmg',{critChance:.15,critMult:2},3],
  ['armor_break','Shatter','💥','offensive','Ignore 25% foe defense',{armorPen:.25},3],
  ['poison_strike','Dirty Hit','🧪','offensive','15% bleed over 3 turns',{poisonChance:.15,poisonDmg:.1},3],
  ['iron_wall','Thick Skin','🧱','defensive','Reduce incoming dmg 10%',{dmgReduction:.1},3],
  ['regeneration','Recovery','💚','defensive','Heal 5% max HP/turn',{regenPercent:.05},3],
  ['dodge_master','Reflexes','💨','defensive','12% full dodge chance',{dodgeChance:.12},3],
  ['counter_attack','Payback','🔄','defensive','20% counter when hit',{counterChance:.2},3],
  ['last_stand','Second Wind','🛡️','defensive','Survive lethal blow once',{lastStand:true},1],
  ['gold_digger','Hustler','💰','utility','+20% cash from all sources',{goldBonus:.2},3],
  ['quick_learner','Street Smart','📖','utility','+15% XP from all sources',{xpBonus:.15},3],
  ['lucky_looter','Connected','🍀','utility','Better loot rarity',{lootBonus:1},3],
  ['intimidate','Presence','👊','utility','Foe starts with -10% ATK',{enemyAtkReduction:.1},3],
];
export const SKILLS = Object.fromEntries(SK.map(([id,name,icon,type,description,effect,maxLevel]) =>
  [id, Object.freeze({ name, icon, type, description, effect: Object.freeze(effect), maxLevel })]));

// ── Enemies — poor to rich zones ──
// [id, name, icon, zone, hp, atk, def, spd, scaling, xpRange, goldRange, minLevel]
const EN = [
  // The Block — starting out broke
  ['stray_dog','Stray Dog','🐕','block',30,8,1,6,1.15,[12,22],[8,18],1],
  ['mugger','Mugger','🤜','block',40,6,2,3,1.15,[10,20],[5,15],1],
  ['pickpocket','Pickpocket','🦹','block',35,7,3,8,1.15,[15,25],[12,25],2],
  // The District — grinding
  ['loan_shark','Loan Shark','🦈','district',60,12,5,7,1.18,[25,45],[20,40],5],
  ['bouncer','Bouncer','💪','district',80,15,10,4,1.18,[30,55],[25,50],5],
  ['enforcer','Enforcer','👁️','district',55,18,4,10,1.18,[35,60],[30,55],7],
  // Midtown — real money
  ['dirty_cop','Dirty Cop','🪖','midtown',120,25,15,8,1.2,[60,100],[50,90],10],
  ['bodyguard','Bodyguard','🤖','midtown',180,20,30,3,1.2,[70,120],[60,110],12],
  ['hitman','Hitman','🎯','midtown',80,40,8,12,1.2,[80,130],[65,120],13],
  // The Penthouse — top of the world
  ['rival_ceo','Rival CEO','🦎','penthouse',200,35,25,10,1.22,[120,200],[100,180],16],
  ['private_army','Private Army','🏇','penthouse',250,40,35,8,1.22,[150,250],[130,220],18],
  ['the_don','The Don','🐲','penthouse',350,50,30,14,1.25,[200,350],[180,300],20],
];
export const ENEMIES = Object.fromEntries(EN.map(([id,name,icon,zone,baseHp,baseAtk,baseDef,baseSpd,scaling,xp,gold,minLevel]) =>
  [id, Object.freeze({ name, icon, zone, baseHp, baseAtk, baseDef, baseSpd, scaling, xp, gold, minLevel })]));

// ── Raid Bosses ──
// [id, name, icon, desc, hp, atk, def, spd, minLevel, staminaCost, xpRange, goldRange, lootTable, lootChance]
const RD = [
  ['block_boss','Block Boss','👑🤜','Runs every corner in the hood',500,20,15,6,5,3,[100,200],[150,300],['tire_iron','kevlar_vest','hard_hat','work_boots'],.5],
  ['district_king','District King','⚔️💀','Controls the whole district',1200,35,25,9,10,5,[250,500],[400,700],['switchblade','tailored_suit','tactical_helmet','designer_sneakers','silver_chain'],.4],
  ['crime_lord','Crime Lord','🏢💥','Owns half the city',2500,55,40,5,15,7,[500,900],[800,1500],['custom_45','armored_overcoat','gold_crown','carbon_runners','diamond_ring'],.35],
  ['the_mogul','The Mogul','💎🔥','Untouchable. Until now.',5000,80,55,12,20,10,[1000,2000],[2000,4000],['black_card','black_label_suit','diamond_crown','black_amex','obsidian_edge'],.25],
];
export const RAIDS = Object.fromEntries(RD.map(([id,name,icon,description,hp,atk,def,spd,minLevel,staminaCost,xp,gold,lootTable,lootChance]) =>
  [id, Object.freeze({ name, icon, description, hp, atk, def, spd, minLevel, staminaCost, xp, gold, lootTable: Object.freeze(lootTable), lootChance })]));

export const ZONES = Object.freeze({
  block:     { name: 'The Block',     icon: '🏚️', minLevel: 1,  staminaCost: 1 },
  district:  { name: 'The District',  icon: '🏙️', minLevel: 5,  staminaCost: 2 },
  midtown:   { name: 'Midtown',       icon: '🏢', minLevel: 10, staminaCost: 3 },
  penthouse: { name: 'The Penthouse', icon: '💎', minLevel: 16, staminaCost: 4 },
});

// ── Assets — networth is the goal, income has diminishing ROI ──
// [id, name, icon, tier, cost, incomePerHr, maintenancePerHr, networthValue, minLevel]
// Anti-snowball: maintenance scales, ROI shrinks at higher tiers
const AS = [
  // Hustle tier — cheap, decent ROI
  ['lemonade_stand','Lemonade Stand','🍋','hustle',200,12,2,300,1],
  ['corner_store','Corner Store','🏪','hustle',500,25,5,750,2],
  ['food_truck','Food Truck','🚚','hustle',1200,50,12,1800,4],
  // Grind tier — moderate cost, income ceiling
  ['barbershop','Barbershop','💈','grind',3000,90,25,4500,6],
  ['laundromat','Laundromat','🧺','grind',6000,150,50,9000,8],
  ['auto_shop','Auto Shop','🔧','grind',12000,250,90,18000,10],
  // Stack tier — expensive, lower ROI but big networth
  ['nightclub','Nightclub','🎵','stack',30000,400,160,50000,13],
  ['restaurant','Restaurant','🍽️','stack',60000,650,280,100000,15],
  ['apartment_bldg','Apartment Building','🏢','stack',120000,1000,450,200000,18],
  // Flex tier — luxury, near-zero ROI, massive networth
  ['penthouse','Penthouse Suite','🏙️','flex',300000,500,400,600000,20],
  ['supercar','Supercar','🏎️','flex',500000,200,180,1000000,22],
  ['yacht','Yacht','🛥️','flex',1000000,100,90,2000000,25],
];
export const ASSETS = Object.fromEntries(AS.map(([id,name,icon,tier,cost,incomePerHr,maintenancePerHr,networthValue,minLevel]) =>
  [id, Object.freeze({ name, icon, tier, cost, incomePerHr, maintenancePerHr, networthValue, minLevel })]));

export const ASSET_TIERS = Object.freeze({
  hustle: { name: 'Hustle', color: '#a1a1aa' },
  grind:  { name: 'Grind',  color: '#4ade80' },
  stack:  { name: 'Stack',  color: '#38bdf8' },
  flex:   { name: 'Flex',   color: '#f5c542' },
});

// ── Crew (associates) — passive bonuses, hired with gold ──
// [id, name, icon, cost, bonus_type, bonus_value, minLevel]
const CR = [
  ['lookout','Lookout','👀',300,'speed',3,2],
  ['enforcer','Enforcer','💪',800,'attack',5,5],
  ['accountant','Accountant','📊',1500,'goldBonus',10,8],
  ['bodyguard','Bodyguard','🕶️',3000,'defense',8,10],
  ['trainer','Trainer','🏋️',5000,'strength',6,12],
  ['hacker','Hacker','💻',10000,'speed',12,15],
  ['fixer','Fixer','🔧',20000,'attack',15,18],
  ['lawyer','Lawyer','⚖️',50000,'defense',20,22],
  ['underboss','Underboss','🤵',100000,'strength',15,25],
];
export const CREW = Object.fromEntries(CR.map(([id,name,icon,cost,bonusType,bonusValue,minLevel]) =>
  [id, Object.freeze({ name, icon, cost, bonusType, bonusValue, minLevel })]));

// ── Gear Sets — equipping matching items grants a bonus ──
export const GEAR_SETS = Object.freeze({
  street: { name: 'Street Set', items: ['pipe_wrench','hoodie','snapback','beat_up_nikes','lucky_penny'], bonus: { attack: 5 }, icon: '🏚️' },
  working: { name: 'Working Set', items: ['tire_iron','kevlar_vest','hard_hat','work_boots','silver_chain'], bonus: { defense: 10, hp: 20 }, icon: '🏗️' },
  executive: { name: 'Executive Set', items: ['carbon_blade','tailored_suit','tactical_helmet','designer_sneakers','gold_watch'], bonus: { attack: 15, speed: 10 }, icon: '💼' },
  elite: { name: 'Elite Set', items: ['custom_45','armored_overcoat','gold_crown','carbon_runners','diamond_ring'], bonus: { attack: 25, defense: 20, hp: 50 }, icon: '🏆' },
  black: { name: 'Black Card Set', items: ['black_card','black_label_suit','diamond_crown','carbon_runners','black_amex'], bonus: { attack: 40, defense: 30, speed: 20, strength: 20 }, icon: '💎' },
});

// ── Synthesis — combine 3 items for a chance at higher rarity ──
export const SYNTHESIS = Object.freeze({
  cost: 100, // gold cost per attempt
  upgradeChance: { common: 0.6, uncommon: 0.45, rare: 0.3, epic: 0.15 }, // chance to get next rarity
  nextRarity: { common: 'uncommon', uncommon: 'rare', rare: 'epic', epic: 'legendary' },
});

// ── Bank — protects gold from PvP theft ──
export const BANK = Object.freeze({
  depositFee: 0.05, // 5% fee to deposit
  pvpTheftPercent: 0.10, // steal 10% of unbanked gold on PvP win
});

export const LEVEL = Object.freeze({ xpBase: 80, xpMult: 1.3, hp: 12, atk: 2, def: 1, spd: 1, str: 1 });

export const ECO = Object.freeze({
  startGold: 100, maxStamina: 10, staminaRegen: 300,
  pvpCost: 2, healPerHp: 1, sellMult: 0.4,
  networth: Object.freeze({ gold: 1, equip: 1.5, level: 100 }),
});

export const CANVAS = Object.freeze({ width: 800, height: 500 });
