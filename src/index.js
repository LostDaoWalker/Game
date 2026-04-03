import { Client, GatewayIntentBits, Events } from 'discord.js';
import { getDb } from './core/database.js';
import { handleNexusCommand, handleButton, handleSelectMenu } from './bot/interactions.js';

// ─── Validate Environment ───────────────────────

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN environment variable');
  console.error('   Copy .env.example to .env and fill in your bot token');
  process.exit(1);
}

// ─── Initialize Database ────────────────────────

console.log('◆ NEXUS — Initializing database...');
getDb();
console.log('✓ Database ready');

// ─── Create Discord Client ─────────────────────

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ─── Event Handlers ─────────────────────────────

client.once(Events.ClientReady, (c) => {
  console.log(`✓ NEXUS online as ${c.user.tag}`);
  console.log(`  Serving ${c.guilds.cache.size} guild(s)`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'nexus') {
        await handleNexusCommand(interaction);
      }
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const reply = { content: '❌ Something went wrong. Try again.', ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    } catch {
      // Interaction expired
    }
  }
});

// ─── Graceful Shutdown ──────────────────────────

process.on('SIGINT', () => {
  console.log('\n◆ NEXUS shutting down...');
  client.destroy();
  getDb().close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  client.destroy();
  getDb().close();
  process.exit(0);
});

// ─── Launch ─────────────────────────────────────

console.log('◆ NEXUS — Connecting to Discord...');
client.login(TOKEN);
