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
export const TABS = ['HOME', 'FIGHT', 'ASSETS', 'INVENTORY', 'PROFILE'];

// ── Equipment ──
// [id, name, slot, rarity, icon, stats, sellValue, dropLevel]
const EQ = [
  // Starter
  ['pipe_wrench','Pipe Wrench','weapon','common','🔧',{attack:3},10,1],
  ['box_cutter','Box Cutter','weapon','common','🔪',{attack:5},20,1],
  ['tire_iron','Tire Iron','weapon','uncommon','🏏',{attack:8,strength:2},50,2],
  ['switchblade','Switchblade','weapon','uncommon','⚔️',{attack:12,speed:3},80,4],
  // Mid
  ['brass_knuckles','Brass Knuckles','weapon','rare','🥊',{attack:18,strength:5},200,6],
  ['carbon_blade','Carbon Blade','weapon','rare','🗡️',{attack:25,speed:5,strength:3},400,8],
  // High
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
  ['berserker_rage','Last Resort','😤','offensive','1.5x dmg below 30% HP',{lowHpDmgMult:1.5},3],
  ['double_strike','Double Tap','⚔️','offensive','20% chance to hit twice',{doubleStrikeChance:.2},3],
  ['critical_eye','Precision','🎯','offensive','+15% crit, 2x crit dmg',{critChance:.15,critMult:2},3],
  ['armor_break','Shatter','💥','offensive','Ignore 25% foe defense',{armorPen:.25},3],
  ['poison_strike','Wear Down','🧪','offensive','15% damage over time, 3 turns',{poisonChance:.15,poisonDmg:.1},3],
  ['iron_wall','Toughness','🧱','defensive','Reduce incoming dmg 10%',{dmgReduction:.1},3],
  ['regeneration','Recovery','💚','defensive','Heal 5% max HP/turn',{regenPercent:.05},3],
  ['dodge_master','Reflexes','💨','defensive','12% full dodge chance',{dodgeChance:.12},3],
  ['counter_attack','Payback','🔄','defensive','20% counter when hit',{counterChance:.2},3],
  ['last_stand','Second Wind','🛡️','defensive','Survive lethal blow once',{lastStand:true},1],
  ['gold_digger','Earner','💰','utility','+20% gold from all sources',{goldBonus:.2},3],
  ['quick_learner','Fast Learner','📖','utility','+15% XP from all sources',{xpBonus:.15},3],
  ['lucky_looter','Lucky','🍀','utility','Better loot rarity',{lootBonus:1},3],
  ['intimidate','Presence','👊','utility','Foe starts with -10% ATK',{enemyAtkReduction:.1},3],
];
export const SKILLS = Object.fromEntries(SK.map(([id,name,icon,type,description,effect,maxLevel]) =>
  [id, Object.freeze({ name, icon, type, description, effect: Object.freeze(effect), maxLevel })]));

// ── Opponents ──
// [id, name, icon, zone, hp, atk, def, spd, scaling, xpRange, goldRange, minLevel]
const EN = [
  // Neighborhood — starting out
  ['stray_cat','Stray Cat','🐈','neighborhood',30,8,1,6,1.15,[12,22],[8,18],1],
  ['troublemaker','Troublemaker','🤜','neighborhood',40,6,2,3,1.15,[10,20],[5,15],1],
  ['prankster','Prankster','🦹','neighborhood',35,7,3,8,1.15,[15,25],[12,25],2],
  // Downtown — building up
  ['debt_collector','Debt Collector','🦈','downtown',60,12,5,7,1.18,[25,45],[20,40],5],
  ['security_guard','Security Guard','💪','downtown',80,15,10,4,1.18,[30,55],[25,50],5],
  ['repo_agent','Repo Agent','👁️','downtown',55,18,4,10,1.18,[35,60],[30,55],7],
  // Business district — real competition
  ['rival_trader','Rival Trader','🪖','business',120,25,15,8,1.2,[60,100],[50,90],10],
  ['security_team','Security Team','🤖','business',180,20,30,3,1.2,[70,120],[60,110],12],
  ['headhunter','Headhunter','🎯','business',80,40,8,12,1.2,[80,130],[65,120],13],
  // Top floor — the big leagues
  ['rival_exec','Rival Executive','🦎','topfloor',200,35,25,10,1.22,[120,200],[100,180],16],
  ['corporate_team','Corporate Team','🏇','topfloor',250,40,35,8,1.22,[150,250],[130,220],18],
  ['the_chairman','The Chairman','🐲','topfloor',350,50,30,14,1.25,[200,350],[180,300],20],
];
export const ENEMIES = Object.fromEntries(EN.map(([id,name,icon,zone,baseHp,baseAtk,baseDef,baseSpd,scaling,xp,gold,minLevel]) =>
  [id, Object.freeze({ name, icon, zone, baseHp, baseAtk, baseDef, baseSpd, scaling, xp, gold, minLevel })]));

// ── Bosses ──
// [id, name, icon, desc, hp, atk, def, spd, minLevel, staminaCost, xpRange, goldRange, lootTable, lootChance]
const RD = [
  ['local_champ','Local Champ','👑🤜','Toughest in the neighborhood',500,20,15,6,5,3,[100,200],[150,300],['tire_iron','kevlar_vest','hard_hat','work_boots'],.5],
  ['district_lead','District Lead','⚔️📊','Runs the downtown market',1200,35,25,9,10,5,[250,500],[400,700],['switchblade','tailored_suit','tactical_helmet','designer_sneakers','silver_chain'],.4],
  ['vp_ops','VP of Operations','🏢⚡','Controls the business district',2500,55,40,5,15,7,[500,900],[800,1500],['custom_45','armored_overcoat','gold_crown','carbon_runners','diamond_ring'],.35],
  ['the_ceo','The CEO','💎🔥','At the top. For now.',5000,80,55,12,20,10,[1000,2000],[2000,4000],['black_card','black_label_suit','diamond_crown','black_amex','obsidian_edge'],.25],
];
export const RAIDS = Object.fromEntries(RD.map(([id,name,icon,description,hp,atk,def,spd,minLevel,staminaCost,xp,gold,lootTable,lootChance]) =>
  [id, Object.freeze({ name, icon, description, hp, atk, def, spd, minLevel, staminaCost, xp, gold, lootTable: Object.freeze(lootTable), lootChance })]));

export const ZONES = Object.freeze({
  neighborhood: { name: 'Neighborhood',      icon: '🏘️', minLevel: 1,  staminaCost: 1 },
  downtown:     { name: 'Downtown',           icon: '🏙️', minLevel: 5,  staminaCost: 2 },
  business:     { name: 'Business District',  icon: '🏢', minLevel: 10, staminaCost: 3 },
  topfloor:     { name: 'Top Floor',          icon: '💎', minLevel: 16, staminaCost: 4 },
});

// ── Assets — networth progression ──
// [id, name, icon, tier, cost, incomePerHr, maintenancePerHr, networthValue, minLevel]
const AS = [
  // Starter
  ['lemonade_stand','Lemonade Stand','🍋','starter',200,12,2,300,1],
  ['corner_store','Corner Store','🏪','starter',500,25,5,750,2],
  ['food_truck','Food Truck','🚚','starter',1200,50,12,1800,4],
  // Growth
  ['barbershop','Barbershop','💈','growth',3000,90,25,4500,6],
  ['laundromat','Laundromat','🧺','growth',6000,150,50,9000,8],
  ['auto_shop','Auto Shop','🔧','growth',12000,250,90,18000,10],
  // Premium
  ['nightclub','Nightclub','🎵','premium',30000,400,160,50000,13],
  ['restaurant','Restaurant','🍽️','premium',60000,650,280,100000,15],
  ['apartment_bldg','Apartment Building','🏢','premium',120000,1000,450,200000,18],
  // Luxury
  ['penthouse','Penthouse Suite','🏙️','luxury',300000,500,400,600000,20],
  ['supercar','Supercar','🏎️','luxury',500000,200,180,1000000,22],
  ['yacht','Yacht','🛥️','luxury',1000000,100,90,2000000,25],
];
export const ASSETS = Object.fromEntries(AS.map(([id,name,icon,tier,cost,incomePerHr,maintenancePerHr,networthValue,minLevel]) =>
  [id, Object.freeze({ name, icon, tier, cost, incomePerHr, maintenancePerHr, networthValue, minLevel })]));

export const ASSET_TIERS = Object.freeze({
  starter: { name: 'Starter', color: '#a1a1aa' },
  growth:  { name: 'Growth',  color: '#4ade80' },
  premium: { name: 'Premium', color: '#38bdf8' },
  luxury:  { name: 'Luxury',  color: '#f5c542' },
});

// ── Crew (associates) — passive bonuses ──
// [id, name, icon, cost, bonus_type, bonus_value, minLevel]
const CR = [
  ['scout','Scout','👀',300,'speed',3,2],
  ['coach','Coach','💪',800,'attack',5,5],
  ['accountant','Accountant','📊',1500,'goldBonus',10,8],
  ['guard','Guard','🕶️',3000,'defense',8,10],
  ['trainer','Trainer','🏋️',5000,'strength',6,12],
  ['analyst','Analyst','💻',10000,'speed',12,15],
  ['strategist','Strategist','🔧',20000,'attack',15,18],
  ['advisor','Advisor','⚖️',50000,'defense',20,22],
  ['partner','Partner','🤵',100000,'strength',15,25],
];
export const CREW = Object.fromEntries(CR.map(([id,name,icon,cost,bonusType,bonusValue,minLevel]) =>
  [id, Object.freeze({ name, icon, cost, bonusType, bonusValue, minLevel })]));

// ── Gear Sets ──
export const GEAR_SETS = Object.freeze({
  street: { name: 'Street Set', items: ['pipe_wrench','hoodie','snapback','beat_up_nikes','lucky_penny'], bonus: { attack: 5 }, icon: '🏘️' },
  working: { name: 'Working Set', items: ['tire_iron','kevlar_vest','hard_hat','work_boots','silver_chain'], bonus: { defense: 10, hp: 20 }, icon: '🏗️' },
  executive: { name: 'Executive Set', items: ['carbon_blade','tailored_suit','tactical_helmet','designer_sneakers','gold_watch'], bonus: { attack: 15, speed: 10 }, icon: '💼' },
  elite: { name: 'Elite Set', items: ['custom_45','armored_overcoat','gold_crown','carbon_runners','diamond_ring'], bonus: { attack: 25, defense: 20, hp: 50 }, icon: '🏆' },
  black: { name: 'Black Card Set', items: ['black_card','black_label_suit','diamond_crown','carbon_runners','black_amex'], bonus: { attack: 40, defense: 30, speed: 20, strength: 20 }, icon: '💎' },
});

// ── Bank — protects gold from PvP ──
export const BANK = Object.freeze({
  depositFee: 0.05,
  pvpBonusPercent: 0.10, // winner earns 10% of opponent's unbanked gold as bonus
});

export const LEVEL = Object.freeze({ xpBase: 80, xpMult: 1.3, hp: 12, atk: 2, def: 1, spd: 1, str: 1 });

export const ECO = Object.freeze({
  startGold: 100, maxStamina: 10, staminaRegen: 300,
  pvpCost: 2, healPerHp: 1, sellMult: 0.4,
  networth: Object.freeze({ gold: 1, equip: 1.5, level: 100 }),
});

export const CANVAS = Object.freeze({ width: 800, height: 500 });

// ── Milestones — trigger once, never again ──
export const MILESTONES = Object.freeze([
  { id: 'first_blood', check: p => p.wins >= 1, msg: '🏅 First Blood — Won your first fight!' },
  { id: 'win_10', check: p => p.wins >= 10, msg: '🏅 Scrapper — 10 wins' },
  { id: 'win_100', check: p => p.wins >= 100, msg: '🏆 Veteran — 100 wins' },
  { id: 'win_500', check: p => p.wins >= 500, msg: '👑 Legend — 500 wins' },
  { id: 'lv5', check: p => p.level >= 5, msg: '⭐ Level 5 — Moving up' },
  { id: 'lv10', check: p => p.level >= 10, msg: '⭐⭐ Level 10 — Getting serious' },
  { id: 'lv20', check: p => p.level >= 20, msg: '⭐⭐⭐ Level 20 — Elite' },
  { id: 'gold_1k', check: p => p.gold + p.banked_gold >= 1000, msg: '💰 First Thousand — 1,000g total' },
  { id: 'gold_10k', check: p => p.gold + p.banked_gold >= 10000, msg: '💰💰 Loaded — 10,000g total' },
  { id: 'net_10k', check: p => p.networth >= 10000, msg: '📈 Five Figures — 10K networth' },
  { id: 'net_100k', check: p => p.networth >= 100000, msg: '📈📈 Six Figures — 100K networth' },
  { id: 'net_1m', check: p => p.networth >= 1000000, msg: '📈📈📈 Millionaire — 1M networth' },
  { id: 'streak_10', check: p => p.best_streak >= 10, msg: '🔥 On Fire — 10 win streak' },
  { id: 'streak_25', check: p => p.best_streak >= 25, msg: '🔥🔥 Unstoppable — 25 win streak' },
  { id: 'pvp_1', check: p => p.pvp_wins >= 1, msg: '🥊 Contender — First PvP win' },
  { id: 'raid_1', check: p => p.raids_completed >= 1, msg: '👑 Boss Down — First raid clear' },
]);

// ── Streak multiplier tiers ──
export const STREAK_TIERS = Object.freeze([
  { min: 0, mult: 1.0, label: '' },
  { min: 5, mult: 1.1, label: '🔥' },
  { min: 10, mult: 1.25, label: '🔥🔥' },
  { min: 20, mult: 1.5, label: '🔥🔥🔥' },
  { min: 50, mult: 2.0, label: '💎🔥' },
]);
