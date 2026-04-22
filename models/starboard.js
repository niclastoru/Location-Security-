cat > starboard.js << 'EOF'
const { EmbedBuilder } = require('discord.js');

// Starboard Settings Cache
const starboardSettings = new Map();

// ⭐ Load settings from database
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

// ⭐ Save settings to database
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

// ⭐ Create starboard embed
function createStarboardEmbed(message, starCount, author, content, imageUrl, jumpUrl) {
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setAuthor({ 
            name: author.tag, 
            iconURL: author.displayAvatarURL({ dynamic: true }) 
        })
        .setDescription(content || '*No content*')
        .addFields({ name: '⭐ Stars', value: `${starCount}`, inline: true })
        .setFooter({ text: `ID: ${message.id}` })
        .setTimestamp(message.createdAt);
    
    if (imageUrl) {
        embed.setImage(imageUrl);
    }
    
    if (jumpUrl) {
        embed.addFields({ name: '🔗 Original', value: `[Jump to message](${jumpUrl})`, inline: true });
    }
    
    return embed;
}

// ⭐ Handle star reaction
async function handleStarReaction(reaction, user, supabase, client, added) {
    if (user.bot) return;
    
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Failed to fetch reaction:', error);
            return;
        }
    }
    
    const message = reaction.message;
    const guild = message.guild;
    
    if (!guild) return;
    
    const settings = await loadStarboardSettings(guild.id, supabase);
    
    if (!settings.enabled || !settings.channel_id) return;
    if (reaction.emoji.name !== settings.emoji) return;
    if (!settings.self_star && message.author.id === user.id) return;
    if (!settings.bot_star && message.author.bot) return;
    
    let starCount = reaction.count || 1;
    
    const { data: existing } = await supabase
        .from('starboard')
        .select('*')
        .eq('guild_id', guild.id)
        .eq('message_id', message.id)
        .single();
    
    const starboardChannel = guild.channels.cache.get(settings.channel_id);
    if (!starboardChannel) return;
    
    let imageUrl = null;
    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment.contentType?.startsWith('image/')) {
            imageUrl = attachment.url;
        }
    }
    
    if (existing) {
        if (added && starCount >= settings.threshold) {
            if (existing.starboard_message_id) {
                try {
                    const starboardMsg = await starboardChannel.messages.fetch(existing.starboard_message_id);
                    const embed = createStarboardEmbed(
                        message, starCount, message.author, 
                        message.content || existing.content,
                        imageUrl || existing.image_url,
                        message.url
                    );
                    await starboardMsg.edit({ embeds: [embed] });
                    
                    await supabase
                        .from('starboard')
                        .update({ 
                            star_count: starCount,
                            updated_at: new Date().toISOString(),
                            image_url: imageUrl || existing.image_url
                        })
                        .eq('id', existing.id);
                } catch (e) {
                    console.error('Failed to update starboard message:', e);
                }
            }
        } else if (!added && starCount < settings.threshold) {
            if (existing.starboard_message_id) {
                try {
                    const starboardMsg = await starboardChannel.messages.fetch(existing.starboard_message_id);
                    await starboardMsg.delete();
                } catch (e) {}
            }
            
            await supabase
                .from('starboard')
                .delete()
                .eq('id', existing.id);
        }
        return;
    }
    
    if (added && starCount >= settings.threshold) {
        const embed = createStarboardEmbed(
            message, starCount, message.author,
            message.content,
            imageUrl,
            message.url
        );
        
        const starboardMsg = await starboardChannel.send({ embeds: [embed] });
        
        await supabase
            .from('starboard')
            .insert({
                guild_id: guild.id,
                message_id: message.id,
                channel_id: message.channel.id,
                starboard_message_id: starboardMsg.id,
                star_count: starCount,
                content: message.content,
                author_id: message.author.id,
                author_tag: message.author.tag,
                author_avatar: message.author.displayAvatarURL(),
                image_url: imageUrl,
                jump_url: message.url
            });
    }
}

// ⭐ Clean up starboard when message is deleted
async function handleMessageDelete(message, supabase) {
    if (!message.guild) return;
    
    const { data } = await supabase
        .from('starboard')
        .select('starboard_message_id, channel_id')
        .eq('guild_id', message.guild.id)
        .eq('message_id', message.id)
        .single();
    
    if (data && data.starboard_message_id) {
        const starboardChannel = message.guild.channels.cache.get(data.channel_id);
        if (starboardChannel) {
            try {
                const starboardMsg = await starboardChannel.messages.fetch(data.starboard_message_id);
                await starboardMsg.delete();
            } catch (e) {}
        }
        
        await supabase
            .from('starboard')
            .delete()
            .eq('message_id', message.id);
    }
}

// ⭐ Get starboard stats for a user
async function getUserStarStats(guildId, userId, supabase) {
    const { data } = await supabase
        .from('starboard')
        .select('star_count')
        .eq('guild_id', guildId)
        .eq('author_id', userId);
    
    if (!data || data.length === 0) {
        return { totalStars: 0, messages: 0 };
    }
    
    const totalStars = data.reduce((sum, item) => sum + item.star_count, 0);
    return { totalStars, messages: data.length };
}

// ⭐ Get top starboard messages
async function getTopStarredMessages(guildId, limit = 10, supabase) {
    const { data } = await supabase
        .from('starboard')
        .select('*')
        .eq('guild_id', guildId)
        .order('star_count', { ascending: false })
        .limit(limit);
    
    return data || [];
}

// ⭐ Starboard Stats Command
async function starboardStats(message, args, { client, supabase }) {
    const target = message.mentions.users.first() || message.author;
    const stats = await getUserStarStats(message.guild.id, target.id, supabase);
    
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`⭐ Starboard Stats for ${target.username}`)
        .addFields([
            { name: 'Total Stars', value: `${stats.totalStars}`, inline: true },
            { name: 'Starred Messages', value: `${stats.messages}`, inline: true },
            { name: 'Average Stars', value: `${stats.messages > 0 ? (stats.totalStars / stats.messages).toFixed(1) : 0}`, inline: true }
        ])
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    return { embeds: [embed] };
}

// ⭐ Starboard Top Command
async function starboardTop(message, args, { client, supabase }) {
    const limit = Math.min(parseInt(args[0]) || 10, 25);
    const topMessages = await getTopStarredMessages(message.guild.id, limit, supabase);
    
    if (topMessages.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('⭐ Starboard Top')
            .setDescription('No starred messages yet!')
            .setTimestamp();
        return { embeds: [embed] };
    }
    
    let description = '';
    for (let i = 0; i < topMessages.length; i++) {
        const msg = topMessages[i];
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        description += `${medal} **${msg.star_count} ⭐** - [Jump to message](${msg.jump_url})\n`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0xFFAC33)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle('⭐ Top Starred Messages')
        .setDescription(description)
        .setFooter({ text: `Top ${topMessages.length} messages`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    return { embeds: [embed] };
}

// ⭐ Starboard Setup Command
async function starboardSetup(message, args, { client, supabase }) {
    const channel = message.mentions.channels.first();
    
    if (!channel) {
        const settings = await loadStarboardSettings(message.guild.id, supabase);
        const embed = new EmbedBuilder()
            .setColor(settings.enabled ? 0x57F287 : 0xED4245)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('⭐ Starboard Settings')
            .addFields([
                { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: 'Channel', value: settings.channel_id ? `<#${settings.channel_id}>` : 'Not set', inline: true },
                { name: 'Emoji', value: settings.emoji, inline: true },
                { name: 'Threshold', value: `${settings.threshold} ⭐`, inline: true },
                { name: 'Self-Star', value: settings.self_star ? '✅ Allowed' : '❌ Blocked', inline: true },
                { name: 'Bot-Star', value: settings.bot_star ? '✅ Allowed' : '❌ Blocked', inline: true }
            ])
            .setFooter({ text: 'Use !starboard #channel to configure' })
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
        .setTitle('⭐ Starboard Configured')
        .setDescription(`Starboard channel set to ${channel}\nMessages with **${settings.threshold} ⭐** will appear here!`)
        .setTimestamp();
    
    return { embeds: [embed] };
}

// ⭐ Starboard Config Command
async function starboardConfig(message, args, { client, supabase }) {
    const settings = await loadStarboardSettings(message.guild.id, supabase);
    
    const subCommand = args[0]?.toLowerCase();
    const value = args[1];
    
    switch (subCommand) {
        case 'threshold':
        case 'th':
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
            const embed1 = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`✅ Starboard threshold set to **${threshold}** ⭐`)
                .setTimestamp();
            return { embeds: [embed1] };
            
        case 'emoji':
            if (!value) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Please provide an emoji!')
                    .setTimestamp();
                return { embeds: [embed] };
            }
            settings.emoji = value;
            await saveStarboardSettings(message.guild.id, settings, supabase);
            const embed2 = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`✅ Starboard emoji set to **${value}**`)
                .setTimestamp();
            return { embeds: [embed2] };
            
        case 'selfstar':
        case 'self':
            settings.self_star = !settings.self_star;
            await saveStarboardSettings(message.guild.id, settings, supabase);
            const embed3 = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`✅ Self-star ${settings.self_star ? 'allowed' : 'blocked'}`)
                .setTimestamp();
            return { embeds: [embed3] };
            
        case 'botstar':
        case 'bot':
            settings.bot_star = !settings.bot_star;
            await saveStarboardSettings(message.guild.id, settings, supabase);
            const embed4 = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`✅ Bot-star ${settings.bot_star ? 'allowed' : 'blocked'}`)
                .setTimestamp();
            return { embeds: [embed4] };
            
        case 'disable':
        case 'off':
            settings.enabled = false;
            await saveStarboardSettings(message.guild.id, settings, supabase);
            const embed5 = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`✅ Starboard disabled`)
                .setTimestamp();
            return { embeds: [embed5] };
            
        case 'enable':
        case 'on':
            if (!settings.channel_id) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Please set a channel first using `!starboard #channel`')
                    .setTimestamp();
                return { embeds: [embed] };
            }
            settings.enabled = true;
            await saveStarboardSettings(message.guild.id, settings, supabase);
            const embed6 = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`✅ Starboard enabled`)
                .setTimestamp();
            return { embeds: [embed6] };
            
        default:
            const embed7 = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setTitle('⭐ Starboard Config Commands')
                .setDescription(`
                    **!starboardconfig threshold <1-100>** - Set star threshold
                    **!starboardconfig emoji <emoji>** - Set reaction emoji
                    **!starboardconfig selfstar** - Toggle self-star
                    **!starboardconfig botstar** - Toggle bot-star
                    **!starboardconfig enable** - Enable starboard
                    **!starboardconfig disable** - Disable starboard
                `)
                .setFooter({ text: `Current threshold: ${settings.threshold} ⭐ | Emoji: ${settings.emoji}` })
                .setTimestamp();
            return { embeds: [embed7] };
    }
}

module.exports = {
    starboardSettings,
    loadStarboardSettings,
    saveStarboardSettings,
    createStarboardEmbed,
    handleStarReaction,
    handleMessageDelete,
    getUserStarStats,
    getTopStarredMessages,
    starboardStats,
    starboardTop,
    starboardSetup,
    starboardConfig
};
EOF
