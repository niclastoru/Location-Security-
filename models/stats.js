const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

// Stats Cache für Performance
const statsCache = new Map();

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        stats: 0x2F3136
    };
    
    const titles = {
        de: {
            stats: 'Stats',
            server_stats: 'Server Statistiken',
            rank: 'Rank',
            top: 'Top',
            error: 'Fehler',
            info: 'Info',
            loading_user: 'Generiere User-Statistiken...',
            loading_server: 'Generiere Server-Statistiken...',
            loading_rank: 'Berechne Ranking...',
            loading_top: (limit) => `Berechne Top ${limit}...`
        },
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
        de: {
            stats_error: 'Konnte Stats nicht generieren!',
            rank_error: 'Konnte Ranking nicht berechnen!',
            top_error: 'Konnte Top-Liste nicht erstellen!',
            no_data: 'Keine Daten verfügbar.',
            your_rank: (rank, amount, unit) => `**Dein Rang:** #${rank} mit **${amount}** ${unit}`,
            lookback: (days) => `Letzte ${days} Tage • Platzierung in diesem Server`,
            top_title: (type, limit) => `🏆 Top ${limit} - ${type === 'messages' ? 'Nachrichten' : 'Voice Zeit'}`,
            messages: 'Nachrichten',
            voice_time: 'Voice Zeit',
            powered_by: (bot) => `Lookback: Last 14 days • Powered by ${bot}`
        },
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
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
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
            description: 'Zeigt Statistiken (User oder Server) / Shows statistics (User or Server)',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const type = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                // Server Stats
                if (type === 'server' || type === 'guild') {
                    return await generateServerStats(message, args, client, supabase);
                }
                
                // User Stats (Standard)
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
                    
                    const imageBuffer = await generateUserStatsImage(stats, target, message.guild, days, client, lang);
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'stats.png' });
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? `📊 Stats für ${target.username}` : `📊 Stats for ${target.username}`)
                        .setImage('attachment://stats.png')
                        .setFooter({ text: lang === 'de' ? `Lookback: Letzte ${days} Tage • Powered by ${client.user.username}` : `Lookback: Last ${days} days • Powered by ${client.user.username}` })
                        .setTimestamp();
                    
                    await loadingMsg.edit({ embeds: [embed], files: [attachment] });
                    
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
            description: 'Zeigt User-Ranking Statistiken / Shows user ranking statistics',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                const type = args[0]?.toLowerCase() || 'messages';
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const loadingMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'rank', 'loading_rank')] 
                });
                
                try {
                    const ranking = await getUserRanking(message.guild.id, target.id, type, supabase, client, lang);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' 
                            ? `🏆 ${type === 'messages' ? 'Nachrichten' : 'Voice'} Ranking` 
                            : `🏆 ${type === 'messages' ? 'Messages' : 'Voice'} Ranking`)
                        .setDescription(ranking)
                        .setFooter({ text: lang === 'de' ? `Letzte 14 Tage • Platzierung in diesem Server` : `Last 14 days • Ranking on this server` })
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
            description: 'Zeigt Top User nach Nachrichten/Voice / Shows top users by messages/voice',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const type = args[0]?.toLowerCase() || 'messages';
                const limit = parseInt(args[1]) || 10;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const loadingMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'top', 'loading_top', [limit])] 
                });
                
                try {
                    const topUsers = await getTopUsers(message.guild.id, type, limit, 14, supabase, client, lang);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' 
                            ? `🏆 Top ${limit} - ${type === 'messages' ? 'Nachrichten' : 'Voice Zeit'}` 
                            : `🏆 Top ${limit} - ${type === 'messages' ? 'Messages' : 'Voice Time'}`)
                        .setDescription(topUsers)
                        .setFooter({ text: lang === 'de' ? `Letzte 14 Tage` : `Last 14 days` })
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

// ⭐ SERVER STATS GENERIEREN
async function generateServerStats(message, args, client, supabase) {
    const period = args[1]?.toLowerCase() || '14d';
    const lang = client.languages?.get(message.guild.id) || 'de';
    
    const loadingMsg = await message.reply({ 
        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'server_stats', 'loading_server')] 
    });
    
    try {
        const days = period === '1d' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 14;
        const stats = await collectServerStats(message.guild.id, days, supabase, client);
        
        const imageBuffer = await generateServerStatsImage(stats, message.guild, days, client, lang);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'server-stats.png' });
        
        const embed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(lang === 'de' ? `📊 Server Statistiken` : `📊 Server Statistics`)
            .setImage('attachment://server-stats.png')
            .setFooter({ text: lang === 'de' ? `Lookback: Letzte ${days} Tage • Powered by ${client.user.username}` : `Lookback: Last ${days} days • Powered by ${client.user.username}` })
            .setTimestamp();
        
        await loadingMsg.edit({ embeds: [embed], files: [attachment] });
        
    } catch (error) {
        console.error('Server stats error:', error);
        await loadingMsg.edit({ 
            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'stats_error')] 
        });
    }
}

// ⭐ Server Stats sammeln
async function collectServerStats(guildId, days, supabase, client) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    
    // Nachrichten Stats (gesamt)
    const { data: msgStats } = await supabase
        .from('message_stats')
        .select('message_count, date')
        .eq('guild_id', guildId)
        .gte('date', sinceStr);
    
    // Voice Stats (gesamt)
    const { data: voiceStats } = await supabase
        .from('voice_stats')
        .select('duration, date')
        .eq('guild_id', guildId)
        .gte('date', sinceStr);
    
    // Nachrichten pro Tag berechnen
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
    
    // Top Channels (Nachrichten)
    const { data: channelMessages } = await supabase
        .from('message_stats')
        .select('channel_id, message_count')
        .eq('guild_id', guildId)
        .gte('date', sinceStr);
    
    const channelMsgTotals = new Map();
    if (channelMessages) {
        channelMessages.forEach(c => {
            const current = channelMsgTotals.get(c.channel_id) || 0;
            channelMsgTotals.set(c.channel_id, current + c.message_count);
        });
    }
    
    const topMsgChannels = Array.from(channelMsgTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    // Top Voice Channels
    const { data: channelVoice } = await supabase
        .from('voice_stats')
        .select('channel_id, duration')
        .eq('guild_id', guildId)
        .gte('date', sinceStr);
    
    const channelVoiceTotals = new Map();
    if (channelVoice) {
        channelVoice.forEach(c => {
            const current = channelVoiceTotals.get(c.channel_id) || 0;
            channelVoiceTotals.set(c.channel_id, current + c.duration);
        });
    }
    
    const topVoiceChannels = Array.from(channelVoiceTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    // Top User (Nachrichten)
    const { data: userMessages } = await supabase
        .from('message_stats')
        .select('user_id, message_count')
        .eq('guild_id', guildId)
        .gte('date', sinceStr);
    
    const userMsgTotals = new Map();
    if (userMessages) {
        userMessages.forEach(u => {
            const current = userMsgTotals.get(u.user_id) || 0;
            userMsgTotals.set(u.user_id, current + u.message_count);
        });
    }
    
    const topMsgUsers = Array.from(userMsgTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Top User (Voice)
    const { data: userVoice } = await supabase
        .from('voice_stats')
        .select('user_id, duration')
        .eq('guild_id', guildId)
        .gte('date', sinceStr);
    
    const userVoiceTotals = new Map();
    if (userVoice) {
        userVoice.forEach(u => {
            const current = userVoiceTotals.get(u.user_id) || 0;
            userVoiceTotals.set(u.user_id, current + u.duration);
        });
    }
    
    const topVoiceUsers = Array.from(userVoiceTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    // Channel Namen holen
    const channelNames = new Map();
    const { data: savedNames } = await supabase
        .from('channel_names')
        .select('channel_id, channel_name')
        .eq('guild_id', guildId);
    
    if (savedNames) {
        savedNames.forEach(c => channelNames.set(c.channel_id, c.channel_name));
    }
    
    // Member Stats
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
        humanCount,
        topMsgChannels: await Promise.all(topMsgChannels.map(async ([id, count]) => ({
            name: channelNames.get(id) || (await client.channels.fetch(id).catch(() => ({ name: 'Deleted Channel' }))).name,
            count
        }))),
        topVoiceChannels: await Promise.all(topVoiceChannels.map(async ([id, duration]) => ({
            name: channelNames.get(id) || (await client.channels.fetch(id).catch(() => ({ name: 'Deleted Channel' }))).name,
            duration
        }))),
        topMsgUsers: await Promise.all(topMsgUsers.map(async ([id, count]) => ({
            name: (await client.users.fetch(id).catch(() => ({ username: 'Unknown' }))).username,
            count
        }))),
        topVoiceUsers: await Promise.all(topVoiceUsers.map(async ([id, duration]) => ({
            name: (await client.users.fetch(id).catch(() => ({ username: 'Unknown' }))).username,
            duration
        })))
    };
}

// ⭐ User Stats sammeln
async function collectUserStats(guildId, userId, days, supabase, client) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    
    // Nachrichten Stats
    const { data: msgStats } = await supabase
        .from('message_stats')
        .select('channel_id, message_count')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .gte('date', sinceStr);
    
    // Voice Stats
    const { data: voiceStats } = await supabase
        .from('voice_stats')
        .select('channel_id, duration')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .gte('date', sinceStr);
    
    // Nachrichten pro Tag berechnen
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
    
    // Top Channels (Nachrichten)
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
    
    // Top Voice Channels
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
    
    // Channel Namen holen
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

// ⭐ Server Stats Bild generieren
async function generateServerStatsImage(stats, guild, days, client, lang) {
    const width = 900;
    const height = 700;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Hintergrund
    ctx.fillStyle = '#1a1b1e';
    ctx.fillRect(0, 0, width, height);
    
    // Header Bereich
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, width, 120);
    
    // Server Icon
    ctx.save();
    ctx.beginPath();
    ctx.arc(60, 60, 40, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    try {
        const icon = await loadImage(guild.iconURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
        ctx.drawImage(icon, 20, 20, 80, 80);
    } catch (e) {
        ctx.fillStyle = '#7289DA';
        ctx.fillRect(20, 20, 80, 80);
    }
    ctx.restore();
    
    // Server Name & Stats
    ctx.font = 'bold 28px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(guild.name, 120, 50);
    
    ctx.font = '16px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(lang === 'de' 
        ? `👥 ${stats.totalMembers} Mitglieder (${stats.onlineMembers} online)` 
        : `👥 ${stats.totalMembers} Members (${stats.onlineMembers} online)`, 120, 80);
    ctx.fillText(lang === 'de' 
        ? `👤 ${stats.humanCount} Menschen • 🤖 ${stats.botCount} Bots` 
        : `👤 ${stats.humanCount} Humans • 🤖 ${stats.botCount} Bots`, 120, 105);
    
    // Trennlinie
    ctx.strokeStyle = '#40444b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 135);
    ctx.lineTo(width - 20, 135);
    ctx.stroke();
    
    let yPos = 170;
    
    // Messages Sektion
    ctx.font = 'bold 18px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? '📊 Nachrichten (Gesamt)' : '📊 Messages (Total)', 30, yPos);
    yPos += 35;
    
    const msgStats = stats.messages;
    ctx.font = '14px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(`1d: ${msgStats['1d'] || 0}`, 40, yPos);
    ctx.fillText(`7d: ${msgStats['7d'] || 0}`, 160, yPos);
    ctx.fillText(`14d: ${msgStats['14d'] || 0}`, 280, yPos);
    ctx.fillText(`30d: ${msgStats['30d'] || 0}`, 400, yPos);
    yPos += 40;
    
    // Voice Sektion
    ctx.font = 'bold 18px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? '🎤 Voice Aktivität (Gesamt)' : '🎤 Voice Activity (Total)', 30, yPos);
    yPos += 35;
    
    const voiceStats = stats.voice;
    const formatVoice = (s) => {
        if (!s) return '0h';
        const hours = Math.floor(s / 3600);
        return `${hours}h`;
    };
    
    ctx.font = '14px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(`1d: ${formatVoice(voiceStats['1d'])}`, 40, yPos);
    ctx.fillText(`7d: ${formatVoice(voiceStats['7d'])}`, 160, yPos);
    ctx.fillText(`14d: ${formatVoice(voiceStats['14d'])}`, 280, yPos);
    ctx.fillText(`30d: ${formatVoice(voiceStats['30d'])}`, 400, yPos);
    yPos += 50;
    
    // Trennlinie
    ctx.strokeStyle = '#40444b';
    ctx.beginPath();
    ctx.moveTo(20, yPos);
    ctx.lineTo(width - 20, yPos);
    ctx.stroke();
    yPos += 30;
    
    // Top Text Channels
    ctx.font = 'bold 16px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? '💬 Top Text Channels' : '💬 Top Text Channels', 30, yPos);
    yPos += 30;
    
    ctx.font = '13px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    
    if (stats.topMsgChannels.length > 0) {
        stats.topMsgChannels.forEach((ch, i) => {
            ctx.fillText(lang === 'de' 
                ? `${i+1}. #${ch.name}: ${ch.count} Nachrichten` 
                : `${i+1}. #${ch.name}: ${ch.count} messages`, 40, yPos);
            yPos += 22;
        });
    } else {
        ctx.fillText('No Data', 40, yPos);
        yPos += 22;
    }
    yPos += 15;
    
    // Top Voice Channels
    ctx.font = 'bold 16px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? '🎤 Top Voice Channels' : '🎤 Top Voice Channels', 30, yPos);
    yPos += 30;
    
    ctx.font = '13px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    
    if (stats.topVoiceChannels.length > 0) {
        stats.topVoiceChannels.forEach((ch, i) => {
            ctx.fillText(`${i+1}. #${ch.name}: ${formatVoice(ch.duration)}`, 40, yPos);
            yPos += 22;
        });
    } else {
        ctx.fillText('No Data', 40, yPos);
        yPos += 22;
    }
    yPos += 15;
    
    // Top User (Messages) - Rechte Spalte
    const rightColX = 480;
    let rightY = 170;
    
    ctx.font = 'bold 16px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? '🏆 Top User (Nachrichten)' : '🏆 Top Users (Messages)', rightColX, rightY);
    rightY += 30;
    
    ctx.font = '13px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    
    if (stats.topMsgUsers.length > 0) {
        stats.topMsgUsers.forEach((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
            ctx.fillText(`${medal} ${u.name}: ${u.count}`, rightColX + 10, rightY);
            rightY += 25;
        });
    } else {
        ctx.fillText('No Data', rightColX + 10, rightY);
        rightY += 25;
    }
    rightY += 20;
    
    // Top User (Voice)
    ctx.font = 'bold 16px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? '🎤 Top User (Voice)' : '🎤 Top Users (Voice)', rightColX, rightY);
    rightY += 30;
    
    ctx.font = '13px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    
    if (stats.topVoiceUsers.length > 0) {
        stats.topVoiceUsers.forEach((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
            ctx.fillText(`${medal} ${u.name}: ${formatVoice(u.duration)}`, rightColX + 10, rightY);
            rightY += 25;
        });
    } else {
        ctx.fillText('No Data', rightColX + 10, rightY);
    }
    
    // Footer
    ctx.font = '12px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#72767d';
    ctx.fillText(lang === 'de' ? `LOOKBACK: LETZTE ${days} TAGE` : `LOOKBACK: LAST ${days} DAYS`, 30, height - 30);
    ctx.fillText(`POWERED BY ${client.user.username.toUpperCase()}`, width - 250, height - 30);
    
    return canvas.toBuffer('image/png');
}

// ⭐ User Stats Bild generieren
async function generateUserStatsImage(stats, user, guild, days, client, lang) {
    const width = 800;
    const height = 550;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Hintergrund
    ctx.fillStyle = '#1a1b1e';
    ctx.fillRect(0, 0, width, height);
    
    // Header Bereich
    ctx.fillStyle = '#2c2f33';
    ctx.fillRect(0, 0, width, 100);
    
    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(60, 50, 35, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    try {
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 128 }));
        ctx.drawImage(avatar, 25, 15, 70, 70);
    } catch (e) {
        ctx.fillStyle = '#7289DA';
        ctx.fillRect(25, 15, 70, 70);
    }
    ctx.restore();
    
    // Username und Server
    ctx.font = 'bold 24px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(user.username, 110, 45);
    
    ctx.font = '16px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(lang === 'de' ? `Server: ${guild.name}` : `Server: ${guild.name}`, 110, 70);
    
    // Trennlinie
    ctx.strokeStyle = '#40444b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 110);
    ctx.lineTo(width - 20, 110);
    ctx.stroke();
    
    // Messages Sektion
    ctx.font = 'bold 18px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? '📊 Nachrichten' : '📊 Messages', 30, 150);
    
    const msgStats = stats.messages;
    ctx.font = '14px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(`1d: ${msgStats['1d'] || 0} ${lang === 'de' ? 'Nachrichten' : 'messages'}`, 40, 185);
    ctx.fillText(`7d: ${msgStats['7d'] || 0} ${lang === 'de' ? 'Nachrichten' : 'messages'}`, 180, 185);
    ctx.fillText(`14d: ${msgStats['14d'] || 0} ${lang === 'de' ? 'Nachrichten' : 'messages'}`, 320, 185);
    ctx.fillText(`30d: ${msgStats['30d'] || 0} ${lang === 'de' ? 'Nachrichten' : 'messages'}`, 460, 185);
    
    // Voice Activity Sektion
    ctx.font = 'bold 18px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? '🎤 Voice Aktivität' : '🎤 Voice Activity', 30, 240);
    
    const voiceStats = stats.voice;
    const formatVoice = (s) => {
        if (!s) return lang === 'de' ? 'Keine Daten' : 'No Data';
        const hours = Math.floor(s / 3600);
        const minutes = Math.floor((s % 3600) / 60);
        return `${hours}.${minutes.toString().padStart(2, '0')} ${lang === 'de' ? 'Stunden' : 'hours'}`;
    };
    
    ctx.font = '14px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(`1d: ${formatVoice(voiceStats['1d'])}`, 40, 275);
    ctx.fillText(`7d: ${formatVoice(voiceStats['7d'])}`, 180, 275);
    ctx.fillText(`14d: ${formatVoice(voiceStats['14d'])}`, 320, 275);
    ctx.fillText(`30d: ${formatVoice(voiceStats['30d'])}`, 460, 275);
    
    // Top Channels
    ctx.font = 'bold 18px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(lang === 'de' ? 'Top Channels' : 'Top Channels', 30, 340);
    
    ctx.font = '14px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(stats.topMsgChannel ? 
        (lang === 'de' ? `💬 ${stats.topMsgChannel.name}: ${stats.topMsgChannel.count} Nachrichten` : `💬 ${stats.topMsgChannel.name}: ${stats.topMsgChannel.count} messages`) : 
        (lang === 'de' ? '💬 Keine Daten' : '💬 No Data'), 40, 375);
    
    ctx.fillText(stats.topVoiceChannel ? 
        `🎤 ${stats.topVoiceChannel.name}: ${formatVoice(stats.topVoiceChannel.duration)}` : 
        (lang === 'de' ? '🎤 Keine Daten' : '🎤 No Data'), 40, 405);
    
    // Footer
    ctx.font = '12px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#72767d';
    ctx.fillText(lang === 'de' ? `LOOKBACK: LETZTE ${days} TAGE` : `LOOKBACK: LAST ${days} DAYS`, 30, height - 30);
    ctx.fillText(`POWERED BY ${client.user.username.toUpperCase()}`, width - 250, height - 30);
    
    return canvas.toBuffer('image/png');
}

// ⭐ User Ranking
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
        
        if (!data) return lang === 'de' ? 'Keine Daten verfügbar.' : 'No data available.';
        
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
            return `${isUser ? '**➤**' : '  '} ${i+1}. <@${id}>: ${count} ${lang === 'de' ? 'Nachrichten' : 'messages'}${isUser ? (lang === 'de' ? ' **← DU**' : ' **← YOU**') : ''}`;
        }).join('\n');
        
        return lang === 'de' 
            ? `**Dein Rang:** #${userRank} mit **${userTotal}** Nachrichten\n\n${ranking}`
            : `**Your Rank:** #${userRank} with **${userTotal}** messages\n\n${ranking}`;
        
    } else {
        const { data } = await supabase
            .from('voice_stats')
            .select('user_id, duration')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return lang === 'de' ? 'Keine Daten verfügbar.' : 'No data available.';
        
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
            return `${isUser ? '**➤**' : '  '} ${i+1}. <@${id}>: ${hrs}h ${mins}m${isUser ? (lang === 'de' ? ' **← DU**' : ' **← YOU**') : ''}`;
        }).join('\n');
        
        return lang === 'de'
            ? `**Dein Rang:** #${userRank} mit **${hours}h ${minutes}m**\n\n${ranking}`
            : `**Your Rank:** #${userRank} with **${hours}h ${minutes}m**\n\n${ranking}`;
    }
}

// ⭐ Top Users
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
        
        if (!data) return lang === 'de' ? 'Keine Daten verfügbar.' : 'No data available.';
        
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
            return `${medal} <@${id}>: **${count}** ${lang === 'de' ? 'Nachrichten' : 'messages'}`;
        }).join('\n');
        
    } else {
        const { data } = await supabase
            .from('voice_stats')
            .select('user_id, duration')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return lang === 'de' ? 'Keine Daten verfügbar.' : 'No data available.';
        
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

// ⭐ Tracking Handler
async function trackMessage(message, supabase) {
    if (message.author.bot || !message.guild) return;
    
    const today = new Date().toISOString().split('T')[0];
    
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
}

const voiceConnections = new Map();

function trackVoiceStart(state, supabase) {
    if (!state.channel) return;
    
    voiceConnections.set(state.id, {
        channelId: state.channel.id,
        guildId: state.guild.id,
        startTime: Date.now()
    });
    
    supabase.from('channel_names').upsert({
        guild_id: state.guild.id,
        channel_id: state.channel.id,
        channel_name: state.channel.name
    });
}

async function trackVoiceEnd(state, supabase) {
    const connection = voiceConnections.get(state.id);
    if (!connection) return;
    
    const duration = Math.floor((Date.now() - connection.startTime) / 1000);
    if (duration < 10) return;
    
    const today = new Date().toISOString().split('T')[0];
    
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
    
    voiceConnections.delete(state.id);
}

module.exports.trackMessage = trackMessage;
module.exports.trackVoiceStart = trackVoiceStart;
module.exports.trackVoiceEnd = trackVoiceEnd;
