cat > /opt/render/project/src/models/starboard.js << 'EOF'
const { EmbedBuilder } = require('discord.js');

// Starboard Settings Cache
const starboardSettings = new Map();

async function loadStarboardSettings(guildId, supabase) {
    if (starboardSettings.has(guildId)) {
        return starboardSettings.get(guildId);
    }
    
    const { data } = await supabase
        .from('starboard_settings')
        .select('*')
        .eq('guild_id', guildId)
        .single();
    
    const settings = data || {
        guild_id: guildId,
        channel_id: null,
        emoji: '⭐',
        threshold: 5,
        self_star: false,
        bot_star: false,
        enabled: false
    };
    
    starboardSettings.set(guildId, settings);
    return settings;
}

async function saveStarboardSettings(guildId, settings, supabase) {
    const { error } = await supabase
        .from('starboard_settings')
        .upsert({
            guild_id: guildId,
            channel_id: settings.channel_id,
            emoji: settings.emoji,
            threshold: settings.threshold,
            self_star: settings.self_star,
            bot_star: settings.bot_star,
            enabled: settings.enabled,
            updated_at: new Date().toISOString()
        });
    
    if (!error) {
        starboardSettings.set(guildId, settings);
    }
    
    return !error;
}

async function starboardStats(message, args, { client, supabase }) {
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle('⭐ Starboard Stats')
        .setDescription('Starboard feature is ready! Use `,starboard #channel` to set up.')
        .setTimestamp();
    return { embeds: [embed] };
}

async function starboardTop(message, args, { client, supabase }) {
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle('⭐ Starboard Top')
        .setDescription('No starred messages yet. React with ⭐ to star messages!')
        .setTimestamp();
    return { embeds: [embed] };
}

async function starboardSetup(message, args, { client, supabase }) {
    const channel = message.mentions.channels.first();
    
    if (!channel) {
        const embed = new EmbedBuilder()
            .setColor(0xFFAC33)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('⭐ Starboard Setup')
            .setDescription('Use `,starboard #channel` to set the starboard channel.')
            .setTimestamp();
        return { embeds: [embed] };
    }
    
    const settings = await loadStarboardSettings(message.guild.id, supabase);
    settings.channel_id = channel.id;
    settings.enabled = true;
    await saveStarboardSettings(message.guild.id, settings, supabase);
    
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle('✅ Starboard Configured')
        .setDescription(`Starboard channel set to ${channel}\nMessages with **${settings.threshold} ⭐** will appear here!`)
        .setTimestamp();
    
    return { embeds: [embed] };
}

async function starboardConfig(message, args, { client, supabase }) {
    const settings = await loadStarboardSettings(message.guild.id, supabase);
    const subCommand = args[0]?.toLowerCase();
    const value = args[1];
    
    if (subCommand === 'threshold' || subCommand === 'th') {
        const threshold = parseInt(value);
        if (isNaN(threshold) || threshold < 1 || threshold > 100) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Threshold must be between 1 and 100!')
                .setTimestamp();
            return { embeds: [embed] };
        }
        settings.threshold = threshold;
        await saveStarboardSettings(message.guild.id, settings, supabase);
        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`✅ Starboard threshold set to **${threshold}** ⭐`)
            .setTimestamp();
        return { embeds: [embed] };
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle('⭐ Starboard Config Commands')
        .setDescription(`
            **,starboardconfig threshold <1-100>** - Set star threshold
            **,starboardconfig emoji <emoji>** - Set reaction emoji
            **,starboardconfig selfstar** - Toggle self-star
            **,starboardconfig botstar** - Toggle bot-star
            **,starboardconfig enable** - Enable starboard
            **,starboardconfig disable** - Disable starboard
        `)
        .setFooter({ text: `Current threshold: ${settings.threshold} ⭐ | Emoji: ${settings.emoji}` })
        .setTimestamp();
    return { embeds: [embed] };
}

async function handleStarReaction(reaction, user, supabase, client, added) {
    // Will be implemented later
    return;
}

async function handleMessageDelete(message, supabase) {
    // Will be implemented later
    return;
}

module.exports = {
    starboardSettings,
    loadStarboardSettings,
    saveStarboardSettings,
    starboardStats,
    starboardTop,
    starboardSetup,
    starboardConfig,
    handleStarReaction,
    handleMessageDelete
};
EOF
