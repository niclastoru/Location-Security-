// Minimal starboard.js - verhindert Abstürze
const { EmbedBuilder } = require('discord.js');

async function starboardStats(message, args, { client, supabase }) {
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setDescription('⭐ Starboard feature coming soon!')
        .setTimestamp();
    return { embeds: [embed] };
}

async function starboardTop(message, args, { client, supabase }) {
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setDescription('⭐ Starboard feature coming soon!')
        .setTimestamp();
    return { embeds: [embed] };
}

async function starboardSetup(message, args, { client, supabase }) {
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setDescription('⭐ Starboard feature coming soon!\n\nUse `,help` for available commands.')
        .setTimestamp();
    return { embeds: [embed] };
}

async function starboardConfig(message, args, { client, supabase }) {
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setDescription('⭐ Starboard feature coming soon!')
        .setTimestamp();
    return { embeds: [embed] };
}

async function handleStarReaction(reaction, user, supabase, client, added) {
    // Do nothing - feature coming soon
}

async function handleMessageDelete(message, supabase) {
    // Do nothing - feature coming soon
}

module.exports = {
    starboardStats,
    starboardTop,
    starboardSetup,
    starboardConfig,
    handleStarReaction,
    handleMessageDelete
};
