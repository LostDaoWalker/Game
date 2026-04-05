import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const [TOKEN, CID, GID] = [process.env.DISCORD_TOKEN, process.env.CLIENT_ID, process.env.GUILD_ID];
if (!TOKEN || !CID) { console.error('Missing DISCORD_TOKEN or CLIENT_ID'); process.exit(1); }

const cmd = new SlashCommandBuilder().setName('halcyon').setDescription('Launch HALCYON — Wander. Grow. Prevail.');
const rest = new REST({ version: '10' }).setToken(TOKEN);
const route = GID ? Routes.applicationGuildCommands(CID, GID) : Routes.applicationCommands(CID);
const mode = GID ? `guild ${GID} (instant)` : 'global (up to 1hr to propagate)';
rest.put(route, { body: [cmd.toJSON()] }).then(() => console.log(`✓ /halcyon deployed — ${mode}`)).catch(e => { console.error(e); process.exit(1); });
