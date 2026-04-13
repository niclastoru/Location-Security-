const { createCanvas, loadImage, registerFont } = require('canvas');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');

// Stats Cache für Performance
const statsCache = new Map();

module.exports = {
    category: 'Stats',
    subCommands: {
        
        // ========== STATS ==========
        stats: {
            aliases: ['serverstats', 'ranking'],
            description: 'Zeigt Server-Statistiken als Bild',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                const period = args[0]?.toLowerCase() || '14d';
                
                const loadingMsg = await message.reply({ embeds: [global.embed.info('Stats', '📊 Generiere Statistiken...')] });
                
                try {
                    const days = period === '1d' ? 1 : period === '7d' ? 7 : 14;
                    const stats = await collectStats(message.guild.id, target.id, days, supabase, client);
                    
                    const imageBuffer = await generateStatsImage(stats, target, message.guild);
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'stats.png' });
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setTitle(`📊 Stats für ${target.username}`)
                        .setImage('attachment://stats.png')
                        .setFooter({ text: `Lookback: Last ${days} days • Powered by ${client.user.username}` })
                        .setTimestamp();
                    
                    await loadingMsg.edit({ embeds: [embed], files: [attachment] });
                    
                } catch (error) {
                    console.error('Stats error:', error);
                    loadingMsg.edit({ embeds: [global.embed.error('Fehler', 'Konnte Stats nicht generieren!')] });
                }
            }
        },
        
        // ========== RANK ==========
        rank: {
            aliases: ['levelstats', 'userstats'],
            description: 'Zeigt User-Ranking Statistiken',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                const type = args[0]?.toLowerCase() || 'messages';
                
                const loadingMsg = await message.reply({ embeds: [global.embed.info('Rank', '📊 Berechne Ranking...')] });
                
                try {
                    const ranking = await getUserRanking(message.guild.id, target.id, type, supabase, client);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
                        .setTitle(`🏆 ${type === 'messages' ? 'Nachrichten' : 'Voice'} Ranking`)
                        .setDescription(ranking)
                        .setFooter({ text: `Letzte 14 Tage • Platzierung in diesem Server` });
                    
                    await loadingMsg.edit({ embeds: [embed] });
                    
                } catch (error) {
                    console.error('Rank error:', error);
                    loadingMsg.edit({ embeds: [global.embed.error('Fehler', 'Konnte Ranking nicht berechnen!')] });
                }
            }
        },
        
        // ========== TOP ==========
        top: {
            aliases: ['leaderboard', 'topusers'],
            description: 'Zeigt Top User nach Nachrichten/Voice',
            category: 'Stats',
            async execute(message, args, { client, supabase }) {
                const type = args[0]?.toLowerCase() || 'messages';
                const limit = parseInt(args[1]) || 10;
                
                const loadingMsg = await message.reply({ embeds: [global.embed.info('Top', `📊 Berechne Top ${limit}...`)] });
                
                try {
                    const topUsers = await getTopUsers(message.guild.id, type, limit, 14, supabase, client);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2F3136)
                        .setTitle(`🏆 Top ${limit} - ${type === 'messages' ? 'Nachrichten' : 'Voice Zeit'}`)
                        .setDescription(topUsers)
                        .setFooter({ text: `Letzte 14 Tage` });
                    
                    await loadingMsg.edit({ embeds: [embed] });
                    
                } catch (error) {
                    console.error('Top error:', error);
                    loadingMsg.edit({ embeds: [global.embed.error('Fehler', 'Konnte Top-Liste nicht erstellen!')] });
                }
            }
        }
    }
};

// ⭐ Stats sammeln
async function collectStats(guildId, userId, days, supabase, client) {
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
    const messagesByDay = { '1d': 0, '7d': 0, '14d': 0 };
    const voiceByDay = { '1d': 0, '7d': 0, '14d': 0 };
    
    const now = new Date();
    
    if (msgStats) {
        msgStats.forEach(s => {
            const date = new Date(s.date);
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) messagesByDay['1d'] += s.message_count;
            if (diffDays < 7) messagesByDay['7d'] += s.message_count;
            messagesByDay['14d'] += s.message_count;
        });
    }
    
    if (voiceStats) {
        voiceStats.forEach(s => {
            const date = new Date(s.date);
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) voiceByDay['1d'] += s.duration;
            if (diffDays < 7) voiceByDay['7d'] += s.duration;
            voiceByDay['14d'] += s.duration;
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
    
    // Fallback: Discord API
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

// ⭐ Stats Bild generieren (Canvas)
async function generateStatsImage(stats, user, guild) {
    const width = 800;
    const height = 600;
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
    ctx.fillText(`Server: ${guild.name}`, 110, 70);
    
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
    ctx.fillText('Messages', 30, 150);
    
    // Message Stats
    const msgStats = stats.messages;
    ctx.font = '14px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(`1d`, 40, 190);
    ctx.fillText(`${msgStats['1d'] || 0} messages`, 40, 210);
    
    ctx.fillText(`7d`, 200, 190);
    ctx.fillText(`${msgStats['7d'] || 0} messages`, 200, 210);
    
    ctx.fillText(`14d`, 360, 190);
    ctx.fillText(`${msgStats['14d'] || 0} messages`, 360, 210);
    
    // Voice Activity Sektion
    ctx.font = 'bold 18px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Voice Activity', 30, 270);
    
    const voiceStats = stats.voice;
    const formatVoice = (s) => {
        if (!s) return 'No Data';
        const hours = Math.floor(s / 3600);
        const minutes = Math.floor((s % 3600) / 60);
        return `${hours}.${minutes.toString().padStart(2, '0')} hours`;
    };
    
    ctx.font = '14px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(`1d`, 40, 310);
    ctx.fillText(formatVoice(voiceStats['1d']), 40, 330);
    
    ctx.fillText(`7d`, 200, 310);
    ctx.fillText(formatVoice(voiceStats['7d']), 200, 330);
    
    ctx.fillText(`14d`, 360, 310);
    ctx.fillText(formatVoice(voiceStats['14d']), 360, 330);
    
    // Top Channels & Applications
    ctx.font = 'bold 18px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Top Channels & Applications', 30, 400);
    
    // Top Message Channel
    ctx.font = '14px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(stats.topMsgChannel ? 
        `${stats.topMsgChannel.name}  ${stats.topMsgChannel.count} messages` : 
        'No Data  No Data', 40, 440);
    
    // Top Voice Channel
    ctx.fillText(stats.topVoiceChannel ? 
        `${stats.topVoiceChannel.name}  ${formatVoice(stats.topVoiceChannel.duration)}` : 
        'No Data  No Data', 40, 470);
    
    // Footer
    ctx.font = '12px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#72767d';
    ctx.fillText(`LOOKBACK: LAST 14 DAYS`, 30, 560);
    ctx.fillText(`POWERED BY ${guild.client.user.username.toUpperCase()}`, width - 250, 560);
    
    return canvas.toBuffer('image/png');
}

// ⭐ User Ranking
async function getUserRanking(guildId, userId, type, supabase, client) {
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const sinceStr = since.toISOString().split('T')[0];
    
    if (type === 'messages') {
        const { data } = await supabase
            .from('message_stats')
            .select('user_id, message_count')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return 'Keine Daten verfügbar.';
        
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
            return `${isUser ? '**➤**' : '  '} ${i+1}. <@${id}>: ${count} Nachrichten${isUser ? ' **← DU**' : ''}`;
        }).join('\n');
        
        return `**Dein Rang:** #${userRank} mit **${userTotal}** Nachrichten\n\n${ranking}`;
        
    } else {
        const { data } = await supabase
            .from('voice_stats')
            .select('user_id, duration')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return 'Keine Daten verfügbar.';
        
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
            return `${isUser ? '**➤**' : '  '} ${i+1}. <@${id}>: ${hrs}h ${mins}m${isUser ? ' **← DU**' : ''}`;
        }).join('\n');
        
        return `**Dein Rang:** #${userRank} mit **${hours}h ${minutes}m**\n\n${ranking}`;
    }
}

// ⭐ Top Users
async function getTopUsers(guildId, type, limit, days, supabase, client) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];
    
    if (type === 'messages') {
        const { data } = await supabase
            .from('message_stats')
            .select('user_id, message_count')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return 'Keine Daten verfügbar.';
        
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
            return `${medal} <@${id}>: **${count}** Nachrichten`;
        }).join('\n');
        
    } else {
        const { data } = await supabase
            .from('voice_stats')
            .select('user_id, duration')
            .eq('guild_id', guildId)
            .gte('date', sinceStr);
        
        if (!data) return 'Keine Daten verfügbar.';
        
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

// ⭐ Tracking Handler (für index.js)
async function trackMessage(message, supabase) {
    if (message.author.bot || !message.guild) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Prüfen ob heute schon Eintrag existiert
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
    
    // Channel Namen speichern
    await supabase
        .from('channel_names')
        .upsert({
            guild_id: message.guild.id,
            channel_id: message.channel.id,
            channel_name: message.channel.name
        });
}

// Voice Tracking
const voiceConnections = new Map();

function trackVoiceStart(state, supabase) {
    if (!state.channel) return;
    
    voiceConnections.set(state.id, {
        channelId: state.channel.id,
        guildId: state.guild.id,
        startTime: Date.now()
    });
    
    // Channel Namen speichern
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
