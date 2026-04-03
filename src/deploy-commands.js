import { REST, Routes } from 'discord.js';
import { commands } from './bot/commands.js';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Missing DISCORD_TOKEN or CLIENT_ID in environment');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

async function deploy() {
  try {
    console.log('◆ Deploying slash commands...');

    if (GUILD_ID) {
      // Guild-specific (instant, for development)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`✓ Commands deployed to guild ${GUILD_ID}`);
    } else {
      // Global (takes up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✓ Commands deployed globally');
    }
  } catch (err) {
    console.error('Failed to deploy commands:', err);
    process.exit(1);
  }
}

deploy();
