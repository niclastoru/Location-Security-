const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Build nice embeds with language support
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client?.languages?.get(guildId) || 'en';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        stats: 0x2F3136
    };
    
    const titles = {
        en: {
            stats: 'Stats',
            server_stats: 'Server Statistics',
            rank: 'Rank',
            top: 'Top',
            error: 'Error',
            info: 'Info',
            loading_user: 'Generating user statistics...',
            loading_server: 'Generating server statistics...',
            loading_rank: 'Calculating ranking...',
            loading_top: (limit) => `Calculating Top ${limit}...`
        }
    };
    
    const descriptions = {
        en: {
            stats_error: 'Could not generate stats!',
            rank_error: 'Could not calculate ranking!',
            top_error: 'Could not create top list!',
            no_data: 'No data available.',
            your_rank: (rank, amount, unit) => `**Your Rank:** #${rank} with **${amount}** ${unit}`,
            lookback: (days) => `Last ${days} days • Ranking on this server`,
            top_title: (type, limit) => `🏆 Top ${limit} - ${type === 'messages' ? 'Messages' : 'Voice Time'}`,
            messages: 'Messages',
            voice_time: 'Voice Time',
            powered_by: (bot) => `Lookback: Last 14 days • Powered by ${bot}`
        }
    };
    
    const title = titles[lang]?.[titleKey] || titleKey;
    let description = descriptions[lang]?.[descKey] || descKey;
    
    if (typeof description === 'function') {
        if (Array.isArray(fields)) {
            description = description(...fields);
        } else {
            description = description(fields);
        }
    } else {
        for (const [key, value] of Object.entries(replacements)) {
            description = description.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor(type === 'stats' ? 0x2F3136 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '📊';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL() });
        }
    }
    embed.setTimestamp();
    
    if (Array.isArray(fields) && fields.length > 0 && fields[0] && typeof fields[0] === 'object') {
        embed.addFields(fields);
    }
    
    return embed;
}

module.exports = {
    category: 'Stats',
    subCommands: {
        
        // ========== STATS ==========
        stats: {
            aliases: ['serverstats', 'ranking', 'statistics'],
            description: 'Shows statistics (User or Server)',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const type = args[0]?.toLowerCase();
                
                // Server Stats
                if (type === 'server' || type === 'guild') {
                    return await generateServerStats(message, args, client, supabase);
                }
                
                // User Stats (Default)
                const target = message.mentions.users.first() || 
                               (args[0] && !isNaN(args[0]) ? await client.users.fetch(args[0]).catch(() => null) : null) || 
                               message.author;
                const period = args[1]?.toLowerCase() || '14d';
                
                const loadingMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'stats', 'loading_user')] 
                });
                
                try {
                    const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 14;
                    const stats = await collectUserStats(message.guild.id, target.id, days, supabase, client);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
                        .setTitle(`📊 Stats for ${target.username}`)
                        .addFields([
                            { name: '📊 Messages (1d)', value: `${stats.messages['1d'] || 0}`, inline: true },
                            { name: '📊 Messages (7d)', value: `${stats.messages['7d'] || 0}`, inline: true },
                            { name: '📊 Messages (14d)', value: `${stats.messages['14d'] || 0}`, inline: true },
                            { name: '📊 Messages (30d)', value: `${stats.messages['30d'] || 0}`, inline: true },
                            { name: '🎤 Voice (1d)', value: formatVoice(stats.voice['1d']), inline: true },
                            { name: '🎤 Voice (7d)', value: formatVoice(stats.voice['7d']), inline: true },
                            { name: '🎤 Voice (14d)', value: formatVoice(stats.voice['14d']), inline: true },
                            { name: '🎤 Voice (30d)', value: formatVoice(stats.voice['30d']), inline: true },
                            { name: '💬 Top Channel', value: stats.topMsgChannel ? `#${stats.topMsgChannel.name}: ${stats.topMsgChannel.count}` : 'No Data', inline: true },
                            { name: '🎤 Top Voice', value: stats.topVoiceChannel ? `#${stats.topVoiceChannel.name}: ${formatVoice(stats.topVoiceChannel.duration)}` : 'No Data', inline: true }
                        ])
                        .setFooter({ text: `Lookback: Last ${days} days • Powered by ${client.user.username}` })
                        .setTimestamp();
                    
                    await loadingMsg.edit({ embeds: [embed] });
                    
                } catch (error) {
                    console.error('Stats error:', error);
                    await loadingMsg.edit({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'stats_error')] 
                    });
                }
            }
        },
        
        // ========== RANK ==========
        rank: {
            aliases: ['levelstats', 'userstats'],
            description: 'Shows user ranking statistics',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                const type = args[0]?.toLowerCase() || 'messages';
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                const loadingMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'rank', 'loading_rank')] 
                });
                
                try {
                    const ranking = await getUserRanking(message.guild.id, target.id, type, supabase, client, lang);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(`🏆 ${type === 'messages' ? 'Messages' : 'Voice'} Ranking`)
                        .setDescription(ranking)
                        .setFooter({ text: `Last 14 days • Ranking on this server` })
                        .setTimestamp();
                    
                    await loadingMsg.edit({ embeds: [embed] });
                    
                } catch (error) {
                    console.error('Rank error:', error);
                    await loadingMsg.edit({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'rank_error')] 
                    });
                }
            }
        },
        
        // ========== TOP ==========
        top: {
            aliases: ['leaderboard', 'topusers'],
            description: 'Shows top users by messages/voice',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const type = args[0]?.toLowerCase() || 'messages';
                const limit = Math.min(parseInt(args[1]) || 10, 25);
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                const loadingMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'top', 'loading_top', [limit])] 
                });
                
                try {
                    const topUsers = await getTopUsers(message.guild.id, type, limit, 14, supabase, client, lang);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(`🏆 Top ${limit} - ${type === 'messages' ? 'Messages' : 'Voice Time'}`)
                        .setDescription(topUsers)
                        .setFooter({ text: `Last 14 days` })
                        .setTimestamp();
                    
                    await loadingMsg.edit({ embeds: [embed] });
                    
                } catch (error) {
                    console.error('Top error:', error);
                    await loadingMsg.edit({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'top_error')] 
                    });
                }
            }
        }
    }
};

// ⭐ HELPER: Format voice time
function formatVoice(seconds) {
    if (!seconds) return '0h';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// ⭐ GENERATE SERVER STATS (Text-based)
async function generateServerStats(message, args, client, supabase) {
    const period = args[1]?.toLowerCase() || '14d';
    
    const loadingMsg = await message.reply({ 
        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'server_stats', 'loading_server')] 
    });
    
    try {
        const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 14;
        const stats = await collectServerStats(message.guild.id, days, supabase, client);
        
        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
            .setTitle(`📊 Server Statistics`)
            .setDescription(`**Lookback:** Last ${days} days`)
            .addFields([
                { name: '👥 Members', value: `${stats.totalMembers}`, inline: true },
                { name: '🟢 Online', value: `${stats.onlineMembers}`, inline: true },
                { name: '🤖 Bots', value: `${stats.botCount}`, inline: true },
                { name: '📊 Messages (1d)', value: `${stats.messages['1d'] || 0}`, inline: true },
                { name: '📊 Messages (7d)', value: `${stats.messages['7d'] || 0}`, inline: true },
                { name: '📊 Messages (14d)', value: `${stats.messages['14d'] || 0}`, inline: true },
                { name: '🎤 Voice (1d)', value: formatVoice(stats.voice['1d']), inline: true },
                { name: '🎤 Voice (7d)', value: formatVoice(stats.voice['7d']), inline: true },
                { name: '🎤 Voice (14d)', value: formatVoice(stats.voice['14d']), inline: true }
            ])
            .setFooter({ text: `Powered by ${client.user.username}` })
            .setTimestamp();
        
        await loadingMsg.edit({ embeds: [embed] });
        
    } catch (error) {
        console.error('Server stats error:', error);
        await loadingMsg.edit({ 
            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'stats_error')] 
        });
    }
}

// ⭐ Collect server stats
async function collectServerStats(guildId, days, supabase, client) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    
    const { data: msgStats } = await supabase
        .from('message_stats')
        .select('message_count, date')
        .eq('guild_id', guildId)
        .gte('date', sinceStr);
    
    const { data: voiceStats } = await supabase
        .from('voice_stats')
        .select('duration, date')
        .eq('guild_id', guildId)
        .gte('date', sinceStr);
    
    const messagesByDay = { '1d': 0, '7d': 0, '14d': 0, '30d': 0 };
    const voiceByDay = { '1d': 0, '7d': 0, '14d': 0, '30d': 0 };
    const now = new Date();
    
    if (msgStats) {
        msgStats.forEach(s => {
            const date = new Date(s.date);
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) messagesByDay['1d'] += s.message_count;
            if (diffDays < 7) messagesByDay['7d'] += s.message_count;
            if (diffDays < 14) messagesByDay['14d'] += s.message_count;
            messagesByDay['30d'] += s.message_count;
        });
    }
    
    if (voiceStats) {
        voiceStats.forEach(s => {
            const date = new Date(s.date);
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) voiceByDay['1d'] += s.duration;
            if (diffDays < 7) voiceByDay['7d'] += s.duration;
            if (diffDays < 14) voiceByDay['14d'] += s.duration;
            voiceByDay['30d'] += s.duration;
        });
    }
    
    const guild = client.guilds.cache.get(guildId);
    const totalMembers = guild?.memberCount || 0;
    const onlineMembers = guild?.members.cache.filter(m => m.presence?.status === 'online').size || 0;
    const botCount = guild?.members.cache.filter(m => m.user.bot).size || 0;
    const humanCount = totalMembers - botCount;
    
    return {
        messages: messagesByDay,
        voice: voiceByDay,
        totalMembers,
        onlineMembers,
        botCount,
        humanCount
    };
}

// ⭐ Collect user stats
async function collectUserStats(guildId, userId, days, supabase, client) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    
    const { data: msgStats } = await supabase
        .from('message_stats')
        .select('channel_id, message_count')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .gte('date', sinceStr);
    
    const { data: voiceStats } = await supabase
        .from('voice_stats')
        .select('channel_id, duration')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .gte('date', sinceStr);
    
    const messagesByDay = { '1d': 0, '7d': 0, '14d': 0, '30d': 0 };
    const voiceByDay = { '1d': 0, '7d': 0, '14d': 0, '30d': 0 };
    const now = new Date();
    
    if (msgStats) {
        msgStats.forEach(s => {
            const date = new Date(s.date);
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) messagesByDay['1d'] += s.message_count;
            if (diffDays < 7) messagesByDay['7d'] += s.message_count;
            if (diffDays < 14) messagesByDay['14d'] += s.message_count;
            messagesByDay['30d'] += s.message_count;
        });
    }
    
    if (voiceStats) {
        voiceStats.forEach(s => {
            const date = new Date(s.date);
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) voiceByDay['1d'] += s.duration;
            if (diffDays < 7) voiceByDay['7d'] += s.duration;
            if (diffDays < 14) voiceByDay['14d'] += s.duration;
            voiceByDay['30d'] += s.duration;
        });
    }
    
    // Top channels
    const channelMessages = new Map();
    if (msgStats) {
        msgStats.forEach(s => {
            const current = channelMessages.get(s.channel_id) || 0;
            channelMessages.set(s.channel_id, current + s.message_count);
        });
    }
    
    const topMsgChannels = Array.from(channelMessages.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1);
    
    const channelVoice = new Map();
    if (voiceStats) {
        voiceStats.forEach(s => {
            const current = channelVoice.get(s.channel_id) || 0;
            channelVoice.set(s.channel_id, current + s.duration);
        });
    }
    
    const topVoiceChannels = Array.from(channelVoice.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1);
    
    // Get channel names
    const channelNames = new Map();
    const { data: savedNames } = await supabase
        .from('channel_names')
        .select('channel_id, channel_name')
        .eq('guild_id', guildId);
    
    if (savedNames) {
        savedNames.forEach(c => channelNames.set(c.channel_id, c.channel_name));
    }
    
    for (const [channelId] of [...topMsgChannels, ...topVoiceChannels]) {
        if (!channelNames.has(channelId)) {
            const channel = client.channels.cache.get(channelId);
            channelNames.set(channelId, channel?.name || 'Deleted Channel');
        }
    }
    
    return {
        messages: messagesByDay,
        voice: voiceByDay,
        topMsgChannel: topMsgChannels[0] ? {
            name: channelNames.get(topMsgChannels[0][0]) || 'Deleted Channel',
            count: topMsgChannels[0][1]
        } : null,
        topVoiceChannel: topVoiceChannels[0] ? {
            name: channelNames.get(topVoiceChannels[0][0]) || 'Deleted Channel',
            duration: topVoiceChannels[0][1]
        } : null
    };
}

// ⭐ User ranking
async function getUserRanking(guildId, userId, type, supabase, client, lang) {
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const sinceStr = since.toISOString().split('T')[0];
    
    if (type === 'messages') {
        const { data } = await supabase
            .from('message_stats')
            .select('user_id, message_count')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return 'No data available.';
        
        const userTotals = new Map();
        data.forEach(d => {
            const current = userTotals.get(d.user_id) || 0;
            userTotals.set(d.user_id, current + d.message_count);
        });
        
        const sorted = Array.from(userTotals.entries()).sort((a, b) => b[1] - a[1]);
        const userRank = sorted.findIndex(([id]) => id === userId) + 1;
        const userTotal = userTotals.get(userId) || 0;
        
        const ranking = sorted.slice(0, 10).map(([id, count], i) => {
            const isUser = id === userId;
            return `${isUser ? '**➤**' : '  '} ${i+1}. <@${id}>: ${count} messages${isUser ? ' **← YOU**' : ''}`;
        }).join('\n');
        
        return `**Your Rank:** #${userRank} with **${userTotal}** messages\n\n${ranking}`;
        
    } else {
        const { data } = await supabase
            .from('voice_stats')
            .select('user_id, duration')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return 'No data available.';
        
        const userTotals = new Map();
        data.forEach(d => {
            const current = userTotals.get(d.user_id) || 0;
            userTotals.set(d.user_id, current + d.duration);
        });
        
        const sorted = Array.from(userTotals.entries()).sort((a, b) => b[1] - a[1]);
        const userRank = sorted.findIndex(([id]) => id === userId) + 1;
        const userTotal = userTotals.get(userId) || 0;
        const hours = Math.floor(userTotal / 3600);
        const minutes = Math.floor((userTotal % 3600) / 60);
        
        const ranking = sorted.slice(0, 10).map(([id, secs], i) => {
            const isUser = id === userId;
            const hrs = Math.floor(secs / 3600);
            const mins = Math.floor((secs % 3600) / 60);
            return `${isUser ? '**➤**' : '  '} ${i+1}. <@${id}>: ${hrs}h ${mins}m${isUser ? ' **← YOU**' : ''}`;
        }).join('\n');
        
        return `**Your Rank:** #${userRank} with **${hours}h ${minutes}m**\n\n${ranking}`;
    }
}

// ⭐ Top users
async function getTopUsers(guildId, type, limit, days, supabase, client, lang) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    
    if (type === 'messages') {
        const { data } = await supabase
            .from('message_stats')
            .select('user_id, message_count')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return 'No data available.';
        
        const userTotals = new Map();
        data.forEach(d => {
            const current = userTotals.get(d.user_id) || 0;
            userTotals.set(d.user_id, current + d.message_count);
        });
        
        const sorted = Array.from(userTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        
        return sorted.map(([id, count], i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
            return `${medal} <@${id}>: **${count}** messages`;
        }).join('\n');
        
    } else {
        const { data } = await supabase
            .from('voice_stats')
            .select('user_id, duration')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return 'No data available.';
        
        const userTotals = new Map();
        data.forEach(d => {
            const current = userTotals.get(d.user_id) || 0;
            userTotals.set(d.user_id, current + d.duration);
        });
        
        const sorted = Array.from(userTotals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        
        return sorted.map(([id, secs], i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
            const hours = Math.floor(secs / 3600);
            const minutes = Math.floor((secs % 3600) / 60);
            return `${medal} <@${id}>: **${hours}h ${minutes}m**`;
        }).join('\n');
    }
}

// ========== TRACKING HANDLERS (REPARIERT) ==========

async function trackMessage(message, supabase) {
    if (message.author.bot || !message.guild) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const { data } = await supabase
            .from('message_stats')
            .select('message_count')
            .eq('guild_id', message.guild.id)
            .eq('user_id', message.author.id)
            .eq('channel_id', message.channel.id)
            .eq('date', today)
            .single();
        
        if (data) {
            await supabase
                .from('message_stats')
                .update({ message_count: data.message_count + 1 })
                .eq('guild_id', message.guild.id)
                .eq('user_id', message.author.id)
                .eq('channel_id', message.channel.id)
                .eq('date', today);
        } else {
            await supabase
                .from('message_stats')
                .insert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    channel_id: message.channel.id,
                    message_count: 1,
                    date: today
                });
        }
        
        await supabase
            .from('channel_names')
            .upsert({
                guild_id: message.guild.id,
                channel_id: message.channel.id,
                channel_name: message.channel.name
            });
    } catch (error) {
        console.error('Tracking error:', error);
    }
}

// ⭐ FIX: trackVoiceStart benutzt jetzt try/catch statt .catch()
async function trackVoiceStart(state, supabase) {
    if (!state.channel || !state.member) return;
    
    const voiceConnections = getVoiceConnections();
    voiceConnections.set(state.id, {
        channelId: state.channel.id,
        guildId: state.guild.id,
        startTime: Date.now()
    });
    
    try {
        await supabase.from('channel_names').upsert({
            guild_id: state.guild.id,
            channel_id: state.channel.id,
            channel_name: state.channel.name
        });
    } catch (error) {
        console.error('Channel name tracking error:', error);
    }
}

async function trackVoiceEnd(state, supabase) {
    const voiceConnections = getVoiceConnections();
    const connection = voiceConnections.get(state.id);
    if (!connection) return;
    
    const duration = Math.floor((Date.now() - connection.startTime) / 1000);
    if (duration < 10) {
        voiceConnections.delete(state.id);
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const { data } = await supabase
            .from('voice_stats')
            .select('duration')
            .eq('guild_id', connection.guildId)
            .eq('user_id', state.id)
            .eq('channel_id', connection.channelId)
            .eq('date', today)
            .single();
        
        if (data) {
            await supabase
                .from('voice_stats')
                .update({ duration: data.duration + duration })
                .eq('guild_id', connection.guildId)
                .eq('user_id', state.id)
                .eq('channel_id', connection.channelId)
                .eq('date', today);
        } else {
            await supabase
                .from('voice_stats')
                .insert({
                    guild_id: connection.guildId,
                    user_id: state.id,
                    channel_id: connection.channelId,
                    duration: duration,
                    date: today
                });
        }
    } catch (error) {
        console.error('Voice tracking error:', error);
    }
    
    voiceConnections.delete(state.id);
}

// Voice connections map (shared)
let voiceConnectionsMap = null;
function getVoiceConnections() {
    if (!voiceConnectionsMap) {
        voiceConnectionsMap = new Map();
    }
    return voiceConnectionsMap;
}

module.exports.trackMessage = trackMessage;
module.exports.trackVoiceStart = trackVoiceStart;
module.exports.trackVoiceEnd = trackVoiceEnd;
