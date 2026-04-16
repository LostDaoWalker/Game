#!/usr/bin/env node
// TIANMING CLI — minimal shell. Grows as systems are added.
const cmd = process.argv[2];

const HELP = `
TIANMING CLI

  ./cli.js start     Start the bot
  ./cli.js dev       Start with hot reload
  ./cli.js deploy    Deploy /tianming slash command
  ./cli.js test      Run smoke test
`;

if (!cmd || cmd === 'help' || cmd === '-h') { console.log(HELP); process.exit(0); }

if (cmd === 'start') await import('./src/index.js');
else if (cmd === 'dev') {
  const { execSync } = await import('child_process');
  execSync('node --env-file=.env --watch src/index.js', { stdio: 'inherit' });
}
else if (cmd === 'deploy') await import('./src/deploy-commands.js');
else if (cmd === 'test') await import('./test.js');
else { console.error(`Unknown: ${cmd}`); console.log(HELP); process.exit(1); }
