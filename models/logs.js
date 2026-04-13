module.exports = {
    category: 'Logs',
    subCommands: {
        
        // ========== LOGS-SETUP ==========
        'logs-setup': {
            aliases: ['logsetup', 'setuplogs'],
            permissions: 'Administrator',
            description: 'Konfiguriert das Log-System',
            category: 'Logs',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const channel = message.mentions.channels.first();
                
                const logTypes = ['message', 'member', 'voice', 'moderation', 'server', 'all'];
                
                if (action === 'set' && channel) {
                    const type = args[2]?.toLowerCase() || 'all';
                    
                    if (!logTypes.includes(type)) {
                        return message.reply({ embeds: [global.embed.error('Ungültiger Typ', `Typen: ${logTypes.join(', ')}`)] });
                    }
                    
                    const updateData = { guild_id: message.guild.id };
                    
                    if (type === 'all') {
                        updateData.log_channel = channel.id;
                        updateData.message_log = channel.id;
                        updateData.member_log = channel.id;
                        updateData.voice_log = channel.id;
                        updateData.moderation_log = channel.id;
                        updateData.server_log = channel.id;
                    } else {
                        updateData[`${type}_log`] = channel.id;
                    }
                    
                    await supabase.from('log_settings').upsert(updateData);
                    
                    return message.reply({ embeds: [global.embed.success('Log-Channel gesetzt', `${channel} ist jetzt der Log-Channel für **${type}**-Events.`)] });
                }
                
                if (action === 'disable' || action === 'off') {
                    const type = args[1]?.toLowerCase() || 'all';
                    
                    if (!logTypes.includes(type)) {
                        return message.reply({ embeds: [global.embed.error('Ungültiger Typ', `Typen: ${logTypes.join(', ')}`)] });
                    }
                    
                    const updateData = { guild_id: message.guild.id };
                    
                    if (type === 'all') {
                        updateData.log_channel = null;
                        updateData.message_log = null;
                        updateData.member_log = null;
                        updateData.voice_log = null;
                        updateData.moderation_log = null;
                        updateData.server_log = null;
                    } else {
                        updateData[`${type}_log`] = null;
                    }
                    
                    await supabase.from('log_settings').upsert(updateData);
                    
                    return message.reply({ embeds: [global.embed.success('Logging deaktiviert', `Logging für **${type}** wurde deaktiviert.`)] });
                }
                
                // Aktuelle Settings anzeigen
                const { data } = await supabase
                    .from('log_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const messageLog = data?.message_log ? `<#${data.message_log}>` : '❌ Aus';
                const memberLog = data?.member_log ? `<#${data.member_log}>` : '❌ Aus';
                const voiceLog = data?.voice_log ? `<#${data.voice_log}>` : '❌ Aus';
                const moderationLog = data?.moderation_log ? `<#${data.moderation_log}>` : '❌ Aus';
                const serverLog = data?.server_log ? `<#${data.server_log}>` : '❌ Aus';
                
                return message.reply({ embeds: [{
                    color: 0x3498DB,
                    title: '📋 Log-Einstellungen',
                    fields: [
                        { name: '💬 Nachrichten', value: messageLog, inline: true },
                        { name: '👥 Mitglieder', value: memberLog, inline: true },
                        { name: '🎤 Voice', value: voiceLog, inline: true },
                        { name: '🛡️ Moderation', value: moderationLog, inline: true },
                        { name: '⚙️ Server', value: serverLog, inline: true }
                    ],
                    footer: { text: '!logs-setup set #channel [typ] | !logs-setup disable [typ]' }
                }] });
            }
        },
        
        // ========== SETUPLOG (Alias) ==========
        setuplog: {
            aliases: ['setlog'],
            permissions: 'Administrator',
            description: 'Schnell-Setup für Logs',
            category: 'Logs',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                
                await supabase.from('log_settings').upsert({
                    guild_id: message.guild.id,
                    log_channel: channel.id,
                    message_log: channel.id,
                    member_log: channel.id,
                    voice_log: channel.id,
                    moderation_log: channel.id,
                    server_log: channel.id
                });
                
                return message.reply({ embeds: [global.embed.success('Log-System eingerichtet', `✅ Alle Logs gehen jetzt in ${channel}!`)] });
            }
        },
        
        // ========== SETUPLOGS (Alias) ==========
        setuplogs: {
            aliases: [],
            permissions: 'Administrator',
            description: 'Alias für logs-setup',
            category: 'Logs',
            async execute(message, args, { supabase }) {
                return module.exports.subCommands['logs-setup'].execute(message, args, { supabase });
            }
        },
        
        // ========== SHOWLOGS ==========
        showlogs: {
            aliases: ['logs', 'recentlogs'],
            permissions: 'ManageMessages',
            description: 'Zeigt die letzten Logs',
            category: 'Logs',
            async execute(message, args, { supabase }) {
                const limit = parseInt(args[0]) || 10;
                const type = args[1]?.toLowerCase();
                
                if (limit > 50) return message.reply({ embeds: [global.embed.error('Zu viele', 'Maximal 50 Logs anzeigbar!')] });
                
                let query = supabase
                    .from('logged_events')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .order('created_at', { ascending: false })
                    .limit(limit);
                
                if (type && ['message', 'member', 'voice', 'moderation', 'server'].includes(type)) {
                    query = query.eq('event_type', type);
                }
                
                const { data: logs } = await query;
                
                if (!logs || logs.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Logs', 'Keine Log-Einträge gefunden.')] });
                }
                
                const logEntries = logs.map(log => {
                    const time = new Date(log.created_at).toLocaleTimeString('de-DE');
                    const emoji = getEventEmoji(log.event_type);
                    
                    if (log.target_tag) {
                        return `${emoji} \`${time}\` **${log.user_tag}** → **${log.target_tag}** ${log.reason ? `| ${log.reason}` : ''}`;
                    } else {
                        return `${emoji} \`${time}\` **${log.user_tag}** ${log.details || ''}`;
                    }
                }).join('\n');
                
                return message.reply({ embeds: [{
                    color: 0x3498DB,
                    title: `📋 Letzte ${type ? type + '-' : ''}Logs`,
                    description: logEntries.slice(0, 4096),
                    footer: { text: `${logs.length} Einträge` }
                }] });
            }
        }
    }
};

// ========== HELPER: Event Emoji ==========
function getEventEmoji(type) {
    const emojis = {
        'message_delete': '🗑️',
        'message_edit': '✏️',
        'member_join': '📥',
        'member_leave': '📤',
        'member_ban': '🔨',
        'member_unban': '🔓',
        'member_kick': '👢',
        'member_timeout': '⏰',
        'voice_join': '🎤',
        'voice_leave': '🔇',
        'voice_move': '🔄',
        'channel_create': '📁',
        'channel_delete': '🗑️',
        'role_create': '🆕',
        'role_delete': '❌',
        'role_update': '✏️'
    };
    return emojis[type] || '📌';
}

// ========== LOGGING FUNCTIONS (von index.js aufgerufen) ==========
async function logEvent(guildId, type, data, supabase, client) {
    const { data: settings } = await supabase
        .from('log_settings')
        .select('*')
        .eq('guild_id', guildId)
        .single();
    
    if (!settings) return;
    
    let logChannelId = null;
    
    if (type.startsWith('message')) logChannelId = settings.message_log;
    else if (type.startsWith('member')) logChannelId = settings.member_log;
    else if (type.startsWith('voice')) logChannelId = settings.voice_log;
    else if (type.startsWith('channel') || type.startsWith('role')) logChannelId = settings.server_log;
    else logChannelId = settings.moderation_log;
    
    if (!logChannelId) return;
    
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    
    const channel = guild.channels.cache.get(logChannelId);
    if (!channel) return;
    
    // In DB speichern
    await supabase.from('logged_events').insert({
        guild_id: guildId,
        event_type: type,
        user_id: data.user?.id,
        user_tag: data.user?.tag,
        target_id: data.target?.id,
        target_tag: data.target?.tag,
        reason: data.reason,
        details: data.details
    });
    
    // Embed senden
    const embed = {
        color: getLogColor(type),
        author: { name: data.user?.tag || 'System', icon_url: data.user?.avatar },
        title: getLogTitle(type),
        fields: [],
        timestamp: new Date().toISOString()
    };
    
    if (data.target) {
        embed.fields.push({ name: 'Betroffener User', value: `${data.target.tag} (${data.target.id})`, inline: true });
    }
    if (data.reason) {
        embed.fields.push({ name: 'Grund', value: data.reason, inline: true });
    }
    if (data.details) {
        embed.description = data.details;
    }
    if (data.oldContent && data.newContent) {
        embed.fields.push({ name: 'Vorher', value: data.oldContent.slice(0, 1024) || 'Kein Text', inline: false });
        embed.fields.push({ name: 'Nachher', value: data.newContent.slice(0, 1024) || 'Kein Text', inline: false });
    }
    
    channel.send({ embeds: [embed] }).catch(() => {});
}

function getLogColor(type) {
    if (type.includes('delete') || type.includes('ban') || type.includes('kick')) return 0xFF0000;
    if (type.includes('create') || type.includes('join')) return 0x00FF00;
    if (type.includes('edit') || type.includes('update')) return 0xFFA500;
    return 0x3498DB;
}

function getLogTitle(type) {
    const titles = {
        'message_delete': '🗑️ Nachricht gelöscht',
        'message_edit': '✏️ Nachricht bearbeitet',
        'member_join': '📥 Mitglied beigetreten',
        'member_leave': '📤 Mitglied verlassen',
        'member_ban': '🔨 Mitglied gebannt',
        'member_unban': '🔓 Mitglied entbannt',
        'member_kick': '👢 Mitglied gekickt',
        'member_timeout': '⏰ Timeout vergeben',
        'voice_join': '🎤 Voice beigetreten',
        'voice_leave': '🔇 Voice verlassen',
        'voice_move': '🔄 Voice gewechselt',
        'channel_create': '📁 Channel erstellt',
        'channel_delete': '🗑️ Channel gelöscht',
        'role_create': '🆕 Rolle erstellt',
        'role_delete': '❌ Rolle gelöscht'
    };
    return titles[type] || '📋 Log-Eintrag';
}

module.exports.logEvent = logEvent;
