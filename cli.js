#!/usr/bin/env node
// HALCYON CLI — one entrypoint for everything
const cmd = process.argv[2];
const args = process.argv.slice(3);

const HELP = `
HALCYON CLI

  ./cli.js start           Start the bot
  ./cli.js dev             Start with hot reload
  ./cli.js deploy          Deploy /halcyon slash command
  ./cli.js test            Run 120+ tests
  ./cli.js preview         Render all views to data/
  ./cli.js sim [n]         Simulate n grinds, print progression
  ./cli.js card [avatar]   Render a trading card to data/card.jpg
  ./cli.js db [playerId]   Dump player state from DB
  ./cli.js reset [id|all]  Reset a player or entire DB
  ./cli.js stats           Codebase + performance stats
`;

if (!cmd || cmd === 'help' || cmd === '-h') { console.log(HELP); process.exit(0); }

// Commands that need game imports
const gameCommands = new Set(['sim', 'card', 'db', 'reset', 'stats', 'preview']);

if (gameCommands.has(cmd)) {
  const { getDb } = await import('./src/core/database.js');

  if (cmd === 'sim') {
    const count = parseInt(args[0]) || 20;
    const P = await import('./src/core/player.js');
    getDb();
    P.getOrCreatePlayer('sim', 'SimPlayer');
    console.log('LVL  GOLD     NET      ASSETS  STREAK  W/L');
    console.log('───  ───────  ───────  ──────  ──────  ────');
    for (let i = 0; i < count; i++) {
      const result = P.grind('sim');
      const p = result.player;
      const assets = P.getPlayerAssets('sim').length;
      const wl = `${p.wins}/${p.losses}`;
      console.log(
        `${String(p.level).padStart(3)}  ` +
        `${String(p.gold).padStart(7)}  ` +
        `${String(p.networth).padStart(7)}  ` +
        `${String(assets).padStart(6)}  ` +
        `${String(p.win_streak).padStart(6)}  ` +
        `${wl.padStart(4)}`
      );
    }
    const final = P.getPlayer('sim');
    console.log(`\nFinal: Lv.${final.level} | ${final.gold}g | ${final.networth} net | ${final.win_streak} streak`);
    getDb().close();

  } else if (cmd === 'card') {
    const { renderCard } = await import('./src/rendering/views/card.js');
    const P = await import('./src/core/player.js');
    const { writeFileSync, mkdirSync } = await import('fs');
    getDb();
    const avatarId = args[0] || 'default';
    P.getOrCreatePlayer('cardpreview', 'Preview');
    P.setAvatar('cardpreview', avatarId);
    mkdirSync('data', { recursive: true });
    writeFileSync('data/card.jpg', renderCard(P.getPlayer('cardpreview')));
    console.log(`✓ data/card.jpg (avatar: ${avatarId})`);
    getDb().close();

  } else if (cmd === 'db') {
    const playerId = args[0];
    const P = await import('./src/core/player.js');
    const db = getDb();
    if (!playerId) {
      const players = db.prepare('SELECT id, username, level, gold, networth FROM players ORDER BY networth DESC').all();
      if (!players.length) { console.log('No players.'); }
      else {
        console.log('ID'.padEnd(20) + 'NAME'.padEnd(16) + 'LVL'.padStart(4) + 'GOLD'.padStart(10) + 'NET'.padStart(10));
        for (const p of players) console.log(p.id.padEnd(20) + p.username.padEnd(16) + String(p.level).padStart(4) + String(p.gold).padStart(10) + String(p.networth).padStart(10));
      }
    } else {
      const p = P.getPlayer(playerId);
      if (!p) { console.error(`Player ${playerId} not found`); process.exit(1); }
      console.log(JSON.stringify(p, null, 2));
      console.log('\nEquipment:', P.getAllEquipment(playerId).length, 'items');
      console.log('Equipped:', P.getEquippedItems(playerId).map(r => r.item_id).join(', ') || 'none');
      console.log('Skills:', P.getPlayerSkills(playerId).map(r => `${r.skill_id} Lv.${r.level}`).join(', ') || 'none');
      console.log('Assets:', P.getPlayerAssets(playerId).map(r => r.asset_id).join(', ') || 'none');
      console.log('Crew:', P.getPlayerCrew(playerId).map(r => r.crew_id).join(', ') || 'none');
    }
    db.close();

  } else if (cmd === 'reset') {
    const target = args[0];
    const db = getDb();
    if (target === 'all') {
      for (const table of ['players', 'equipment', 'skills', 'combat_log', 'skill_offers', 'assets', 'crew']) {
        db.prepare(`DELETE FROM ${table}`).run();
      }
      console.log('✓ All data wiped');
    } else if (target) {
      for (const table of ['equipment', 'skills', 'combat_log', 'skill_offers', 'assets', 'crew']) {
        db.prepare(`DELETE FROM ${table} WHERE player_id=?`).run(target);
      }
      db.prepare('DELETE FROM players WHERE id=?').run(target);
      console.log(`✓ Player ${target} deleted`);
    } else {
      console.log('Usage: ./cli.js reset <playerId> or ./cli.js reset all');
    }
    db.close();

  } else if (cmd === 'stats') {
    const { readdirSync, statSync } = await import('fs');
    const { execSync } = await import('child_process');

    // File count + lines
    const files = execSync('find src -name "*.js"').toString().trim().split('\n');
    const totalLines = parseInt(execSync('find src -name "*.js" | xargs wc -l | tail -1').toString().trim());
    console.log(`Files:  ${files.length}`);
    console.log(`Lines:  ${totalLines}`);

    // Test count
    const testOutput = execSync('node --env-file=.env test.js 2>&1').toString();
    const testMatch = testOutput.match(/(\d+) passed.*?(\d+) failed.*?\((\d+)ms\)/);
    if (testMatch) console.log(`Tests:  ${testMatch[1]} passed, ${testMatch[2]} failed (${testMatch[3]}ms)`);

    // Render speed
    const P = await import('./src/core/player.js');
    const { renderCard } = await import('./src/rendering/views/card.js');
    getDb();
    P.getOrCreatePlayer('bench', 'Bench');
    renderCard(P.getPlayer('bench')); // warm
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) renderCard(P.getPlayer('bench'));
    const ms = ((performance.now() - t0) / 50).toFixed(1);
    console.log(`Render: ${ms}ms/frame (card, 50 iterations)`);

    // DB size
    try { const dbSize = statSync('data/halcyon.db').size; console.log(`DB:     ${(dbSize / 1024).toFixed(1)}KB`); } catch { console.log('DB:     no database'); }
    getDb().close();

  } else if (cmd === 'preview') {
    await import('./preview.js');
  }

} else if (cmd === 'test') {
  await import('./test.js');
} else if (cmd === 'start') {
  await import('./src/index.js');
} else if (cmd === 'dev') {
  const { execSync } = await import('child_process');
  execSync('node --env-file=.env --watch src/index.js', { stdio: 'inherit' });
} else if (cmd === 'deploy') {
  await import('./src/deploy-commands.js');
} else {
  console.error(`Unknown command: ${cmd}`);
  console.log(HELP);
  process.exit(1);
}
