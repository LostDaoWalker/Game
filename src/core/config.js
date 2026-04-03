// ═══════════════════════════════════════════════
// NEXUS PBBG - Game Configuration
// ═══════════════════════════════════════════════

export const THEME = {
  name: 'NEXUS',
  tagline: 'Rise through the digital underground',
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
    creditsGold: '#fbbf24',
    cryptoCyan: '#22d3ee',
  },
};

export const BUSINESSES = {
  crypto_mine: {
    name: 'Crypto Mine',
    icon: '⛏️',
    description: 'Mine digital currency from the net',
    baseCost: 200,
    baseIncome: 15,
    costMultiplier: 1.8,
    incomeMultiplier: 1.4,
    maxLevel: 25,
  },
  data_broker: {
    name: 'Data Broker',
    icon: '📡',
    description: 'Trade stolen data on the darknet',
    baseCost: 500,
    baseIncome: 40,
    costMultiplier: 1.9,
    incomeMultiplier: 1.45,
    maxLevel: 25,
  },
  hack_lab: {
    name: 'Hack Lab',
    icon: '💻',
    description: 'Develop exploits for profit',
    baseCost: 1500,
    baseIncome: 120,
    costMultiplier: 2.0,
    incomeMultiplier: 1.5,
    maxLevel: 20,
  },
  bot_farm: {
    name: 'Bot Farm',
    icon: '🤖',
    description: 'Run an army of automated bots',
    baseCost: 5000,
    baseIncome: 400,
    costMultiplier: 2.1,
    incomeMultiplier: 1.5,
    maxLevel: 20,
  },
  ai_syndicate: {
    name: 'AI Syndicate',
    icon: '🧠',
    description: 'Control a rogue AI network',
    baseCost: 20000,
    baseIncome: 1500,
    costMultiplier: 2.2,
    incomeMultiplier: 1.55,
    maxLevel: 15,
  },
  quantum_vault: {
    name: 'Quantum Vault',
    icon: '🔮',
    description: 'Quantum-encrypted wealth storage',
    baseCost: 100000,
    baseIncome: 8000,
    costMultiplier: 2.5,
    incomeMultiplier: 1.6,
    maxLevel: 10,
  },
};

export const MISSIONS = {
  phishing_run: {
    name: 'Phishing Run',
    icon: '🎣',
    description: 'Deploy phishing campaigns',
    duration: 60,
    energyCost: 10,
    rewards: { credits: [50, 150], xp: [15, 30] },
    minLevel: 1,
  },
  data_heist: {
    name: 'Data Heist',
    icon: '🔓',
    description: 'Breach a corporate database',
    duration: 180,
    energyCost: 25,
    rewards: { credits: [200, 500], xp: [40, 80] },
    minLevel: 3,
  },
  server_raid: {
    name: 'Server Raid',
    icon: '⚡',
    description: 'Raid unprotected servers',
    duration: 300,
    energyCost: 40,
    rewards: { credits: [500, 1200], xp: [80, 150] },
    minLevel: 5,
  },
  zero_day: {
    name: 'Zero-Day Exploit',
    icon: '🕷️',
    description: 'Sell a zero-day vulnerability',
    duration: 600,
    energyCost: 60,
    rewards: { credits: [1500, 4000], xp: [150, 300] },
    minLevel: 8,
  },
  mainframe_hack: {
    name: 'Mainframe Hack',
    icon: '🏛️',
    description: 'Infiltrate a government mainframe',
    duration: 1200,
    energyCost: 80,
    rewards: { credits: [5000, 12000], xp: [300, 600] },
    minLevel: 12,
  },
  quantum_breach: {
    name: 'Quantum Breach',
    icon: '🌌',
    description: 'Break quantum encryption',
    duration: 2400,
    energyCost: 100,
    rewards: { credits: [15000, 40000], xp: [600, 1200] },
    minLevel: 18,
  },
};

export const UPGRADES = {
  neural_implant: {
    name: 'Neural Implant',
    icon: '🧬',
    description: '+5 ATK, +3 DEF',
    cost: 2000,
    effects: { attack: 5, defense: 3 },
    maxOwned: 10,
  },
  cyber_arm: {
    name: 'Cyber Arm',
    icon: '🦾',
    description: '+10 ATK',
    cost: 3500,
    effects: { attack: 10 },
    maxOwned: 5,
  },
  shield_matrix: {
    name: 'Shield Matrix',
    icon: '🛡️',
    description: '+10 DEF, +20 HP',
    cost: 3000,
    effects: { defense: 10, max_hp: 20 },
    maxOwned: 5,
  },
  energy_cell: {
    name: 'Energy Cell',
    icon: '🔋',
    description: '+25 Max Energy',
    cost: 1500,
    effects: { max_energy: 25 },
    maxOwned: 8,
  },
  xp_chip: {
    name: 'XP Chip',
    icon: '💎',
    description: 'Permanent +10% XP bonus',
    cost: 5000,
    effects: { xp_bonus: 10 },
    maxOwned: 5,
  },
};

export const LEVEL_CONFIG = {
  xpBase: 100,
  xpMultiplier: 1.35,
  hpPerLevel: 10,
  attackPerLevel: 2,
  defensePerLevel: 1,
};

export const ECONOMY = {
  startingCredits: 500,
  energyRegenRate: 120, // seconds per 1 energy
  cryptoBasePrice: 100,
  cryptoVolatility: 0.15,
  collectCooldown: 0, // can collect anytime
  networthMultipliers: {
    credits: 1,
    crypto: 1, // valued at current market price
    businessValue: 2, // businesses worth 2x their cumulative cost
    upgradeValue: 0.5,
  },
};

export const CANVAS = {
  width: 800,
  height: 500,
  padding: 20,
  cornerRadius: 12,
  fontSize: {
    title: 28,
    subtitle: 18,
    body: 14,
    small: 12,
    tiny: 10,
  },
};
