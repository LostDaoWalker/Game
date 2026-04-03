import { SlashCommandBuilder } from 'discord.js';

export const nexusCommand = new SlashCommandBuilder()
  .setName('nexus')
  .setDescription('Launch NEXUS — the cyberpunk PBBG');

export const commands = [nexusCommand.toJSON()];
