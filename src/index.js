import { Client, GatewayIntentBits, Events } from 'discord.js';
import { getDb } from './core/database.js';
import { handleCommand, handleButton, handleSelectMenu } from './bot/interactions.js';

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) { console.error('Missing DISCORD_TOKEN'); process.exit(1); }

getDb();
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, c => console.log(`🌟 TIANMING online as ${c.user.tag} (${c.guilds.cache.size} guilds)`));

client.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand() && i.commandName === 'tianming') return handleCommand(i);
    if (i.isButton()) return handleButton(i);
    if (i.isStringSelectMenu()) return handleSelectMenu(i);
  } catch (e) {
    console.error(e);
    const r = { content: '❌ Error. Try again.', ephemeral: true };
    try { i.replied || i.deferred ? await i.followUp(r) : await i.reply(r); } catch (followUpErr) { console.error('Failed to send error response:', followUpErr.message); }
  }
});

process.on('SIGINT', () => { client.destroy(); getDb().close(); process.exit(0); });
client.login(TOKEN);
