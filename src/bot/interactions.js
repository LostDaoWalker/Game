// Skeleton handlers — nothing implemented yet.
// Design each screen against VISION.md before filling these in.

export async function handleCommand(interaction) {
  await interaction.reply({ content: '🌱 The path begins. (Not yet implemented.)', ephemeral: false });
}

export async function handleButton(interaction) {
  await interaction.update({ content: '(Not implemented yet.)', components: [] });
}

export async function handleSelectMenu(interaction) {
  await interaction.update({ content: '(Not implemented yet.)', components: [] });
}
