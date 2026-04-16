// TIANMING — Game Data (cultivation spine only for now)
// Single source of truth. Every tunable lives here.

// ── Steps within a stage ──
// All 8 steps; Breakthrough unlocks at Peak (index 4) and stays available through Extreme Perfection.
export const STEP_NAMES = Object.freeze([
  'Entry',
  'Early',
  'Middle',
  'Late',
  'Peak',
  'Lesser Perfection',
  'Greater Perfection',
  'Extreme Perfection',
]);

// Step index at which the Breakthrough button unlocks (inclusive).
export const BREAKTHROUGH_STEP = 4; // Peak

// Qi cost multiplier for each step, relative to the realm's baseStepCost.
// Steps 0-4: smooth climb to Peak. Steps 5-7: perfections ~2× each tier.
export const STEP_COST_MULT = Object.freeze([1, 1.4, 2, 3, 4.5, 9, 18, 36]);

// Reaching one of these step indices (via qi advancement) grants
// +1 essence AND +1 tribulation_charge.
export const PERFECTION_STEPS = Object.freeze(new Set([5, 6, 7]));

// ── Realms ──
// Each realm has named stages. Breakthrough from the last stage's Peak
// jumps the player into the next realm (index +1).
export const REALMS = Object.freeze([
  {
    id: 0, key: 'mortal', name: 'Mortal', icon: '🌱',
    stages: Object.freeze([
      Object.freeze({ key: 'body_forging',    name: 'Body Forging' }),
      Object.freeze({ key: 'inner_awakening', name: 'Inner Awakening' }),
    ]),
    baseStepCost: 5,
  },
  {
    id: 1, key: 'martial_artist', name: 'Martial Artist', icon: '🥋',
    stages: Object.freeze([
      Object.freeze({ key: 'strength', name: 'Strength Tempering' }),
      Object.freeze({ key: 'meridian', name: 'Meridian Opening' }),
      Object.freeze({ key: 'bone',     name: 'Bone Refining' }),
    ]),
    baseStepCost: 25,
  },
  {
    id: 2, key: 'cultivator', name: 'Cultivator', icon: '✨',
    stages: Object.freeze([
      Object.freeze({ key: 'qi_gathering',     name: 'Qi Gathering' }),
      Object.freeze({ key: 'foundation',       name: 'Foundation' }),
      Object.freeze({ key: 'core_formation',   name: 'Core Formation' }),
      Object.freeze({ key: 'core_integration', name: 'Core Integration' }),
    ]),
    baseStepCost: 125,
  },
]);

// ── Cultivation tuning ──
export const CULTIVATION = Object.freeze({
  baseRatePerMin: 1,         // qi per walltime-minute of passive cultivation
  prowessPerPerfection: 5,   // +5% combat prowess per perfection step reached
});
