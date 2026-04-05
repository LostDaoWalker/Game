// Renders every view to data/ for visual QA — no Discord needed
import { getDb } from './src/core/database.js';
import * as P from './src/core/player.js';
import { EQUIPMENT, SKILLS } from './src/core/config.js';
import { renderHome } from './src/rendering/views/home.js';
import { renderFight } from './src/rendering/views/fight.js';
import { renderRaids } from './src/rendering/views/raids.js';
import { renderAssets } from './src/rendering/views/assets.js';
import { renderInventory } from './src/rendering/views/inventory.js';
import { renderSkills } from './src/rendering/views/skills.js';
import { renderProfile } from './src/rendering/views/profile.js';
import { renderGrind } from './src/rendering/views/grind.js';
import { renderCard } from './src/rendering/views/card.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';

rmSync('data', { recursive: true, force: true });
mkdirSync('data', { recursive: true });
getDb();

const pid = 'preview';
P.getOrCreatePlayer(pid, 'PreviewPlayer');
P.setAvatar(pid, 'neon');

// Simulate some gameplay so views have content
P.claimDaily(pid);
for (let i = 0; i < 20; i++) P.fightEnemy(pid, 'troublemaker');
P.buyAsset(pid, 'lemonade_stand');
P.regenStamina(pid);
P.collectAssetIncome(pid);
P.updateNetworth(pid);

const player = P.getPlayer(pid);
const ec = P.getEquippedItems(pid).map(r => EQUIPMENT[r.item_id]).filter(Boolean);
const sc = P.getPlayerSkills(pid).map(r => { const c = SKILLS[r.skill_id]; return c ? { ...c, level: r.level, id: r.skill_id } : null; }).filter(Boolean);

const views = {
  home: () => renderHome(player, ec, sc, P.getRecentLog(pid), P.getLeaderboard(), P.highestAssetIcon(pid)),
  fight: () => renderFight(player, null),
  fight_result: () => { const r = P.fightEnemy(pid, 'troublemaker'); return r.success ? renderFight(P.getPlayer(pid), r) : null; },
  raids: () => renderRaids(player, null),
  assets: () => renderAssets(player, P.getPlayerAssets(pid)),
  inventory: () => renderInventory(player, P.getAllEquipment(pid), P.getEquippedItems(pid)),
  skills: () => renderSkills(player, sc, P.getSkillOffers(pid)),
  profile: () => renderProfile(player, P.getAllEquipment(pid), sc, P.getRank(pid)),
  card: () => renderCard(player),
  grind: () => { const r = P.grind(pid); return renderGrind(r.player, r); },
};

const t0 = performance.now();
for (const [name, render] of Object.entries(views)) {
  try {
    const buf = render();
    if (buf) { writeFileSync(`data/${name}.jpg`, buf); console.log(`  ✓ ${name}`); }
    else console.log(`  - ${name} (no data)`);
  } catch (e) { console.error(`  ✗ ${name}: ${e.message}`); }
}
const elapsed = ((performance.now() - t0) | 0);
console.log(`\n${Object.keys(views).length} views rendered in ${elapsed}ms → data/`);

getDb().close();
rmSync('data/halcyon.db', { force: true });
