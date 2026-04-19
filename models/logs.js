const { EmbedBuilder } = require('discord.js');

// Map für Log-Channels (pro Server)
const logChannels = new Map();

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client?.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        delete: 0xFF0000,
        edit: 0xFFA500,
        create: 0x00FF00,
        voice: 0x3498DB
    };
    
    const titles = {
        de: {
            logs: 'Log-Einstellungen',
            log_channel_set: 'Log-Channel gesetzt',
            logging_disabled: 'Logging deaktiviert',
            logs_reset: 'Logs zurückgesetzt',
            message_deleted: 'Nachricht gelöscht',
            message_edited: 'Nachricht bearbeitet',
            bulk_deleted: 'Bulk-Nachrichten gelöscht',
            member_joined: 'Mitglied beigetreten',
            member_left: 'Mitglied verlassen',
            nickname_changed: 'Nickname geändert',
            role_added: 'Rolle hinzugefügt',
            role_removed: 'Rolle entfernt',
            voice_joined: 'Voice beigetreten',
            voice_left: 'Voice verlassen',
            voice_moved: 'Voice gewechselt',
            member_banned: 'Mitglied gebannt',
            member_unbanned: 'Mitglied entbannt',
            member_kicked: 'Mitglied gekickt',
            timeout_given: 'Timeout vergeben',
            warned: 'Verwarnung',
            channel_created: 'Channel erstellt',
            channel_deleted: 'Channel gelöscht',
            channel_renamed: 'Channel umbenannt',
            role_created: 'Rolle erstellt',
            role_deleted: 'Rolle gelöscht',
            role_renamed: 'Rolle umbenannt',
            emoji_created: 'Emoji erstellt',
            emoji_deleted: 'Emoji gelöscht',
            invite_created: 'Einladung erstellt',
            invite_deleted: 'Einladung gelöscht',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info',
            invalid_usage: 'Falsche Nutzung'
        },
        en: {
            logs: 'Log Settings',
            log_channel_set: 'Log Channel Set',
            logging_disabled: 'Logging Disabled',
            logs_reset: 'Logs Reset',
            message_deleted: 'Message Deleted',
            message_edited: 'Message Edited',
            bulk_deleted: 'Bulk Messages Deleted',
            member_joined: 'Member Joined',
            member_left: 'Member Left',
            nickname_changed: 'Nickname Changed',
            role_added: 'Role Added',
            role_removed: 'Role Removed',
            voice_joined: 'Voice Joined',
            voice_left: 'Voice Left',
            voice_moved: 'Voice Moved',
            member_banned: 'Member Banned',
            member_unbanned: 'Member Unbanned',
            member_kicked: 'Member Kicked',
            timeout_given: 'Timeout Given',
            warned: 'Warning',
            channel_created: 'Channel Created',
            channel_deleted: 'Channel Deleted',
            channel_renamed: 'Channel Renamed',
            role_created: 'Role Created',
            role_deleted: 'Role Deleted',
            role_renamed: 'Role Renamed',
            emoji_created: 'Emoji Created',
            emoji_deleted: 'Emoji Deleted',
            invite_created: 'Invite Created',
            invite_deleted: 'Invite Deleted',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage'
        }
    };
    
    const descriptions = {
        de: {
            all_logs: '📌 Alle Logs',
            message_logs: '💬 Nachrichten',
            member_logs: '👥 Mitglieder',
            voice_logs: '🎤 Voice',
            moderation_logs: '🛡️ Moderation',
            server_logs: '⚙️ Server',
            off: '❌ Aus',
            uses_all: '↪️ Nutzt "Alle"',
            logs_footer: '!logs <typ> #channel | !logs disable <typ> | !logs reset',
            logs_usage: '!logs <all/message/member/voice/moderation/server> #channel\n!logs disable <typ>\n!logs reset',
            channel_set: (channel, type) => {
                const typeNames = {
                    'all': 'ALLE Logs',
                    'message': 'Nachrichten-Logs',
                    'member': 'Mitglieder-Logs',
                    'voice': 'Voice-Logs',
                    'moderation': 'Moderations-Logs',
                    'server': 'Server-Logs'
                };
                return `${channel} ist jetzt der Channel für **${typeNames[type]}**!`;
            },
            disable_usage: (types) => `!logs-disable <${types}>`,
            logging_disabled: (type) => `Logging für **${type}** wurde deaktiviert.`,
            logs_reset: 'Alle Log-Einstellungen wurden gelöscht.',
            message_deleted: (author, channel, content) => `**${author}** in ${channel}\n\n${content || '*Kein Text*'}`,
            message_edited: (author, channel, before, after) => `**${author}** in ${channel}\n\n**Vorher:** ${before || '*Kein Text*'}\n**Nachher:** ${after || '*Kein Text*'}`,
            bulk_deleted: (count, channel) => `**${count}** Nachrichten in ${channel} wurden gelöscht.`,
            member_joined: (user, id, created, memberCount) => `**${user}** (${id})\n\n📅 Account erstellt: <t:${Math.floor(created / 1000)}:R>\n👥 Server-Mitglieder: **${memberCount}**`,
            member_left: (user, id, roles, memberCount) => `**${user}** (${id})\n\n🎭 Rollen: ${roles.slice(0, 500) || 'Keine'}\n👥 Server-Mitglieder: **${memberCount}**`,
            nickname_changed: (user, before, after) => `**${user}**\n\n**Vorher:** ${before || '*Kein Nickname*'}\n**Nachher:** ${after || '*Kein Nickname*'}`,
            role_added: (user, role) => `**${user}** hat die Rolle **${role}** erhalten.`,
            role_removed: (user, role) => `**${user}** wurde die Rolle **${role}** entfernt.`,
            voice_joined: (user, channel, count) => `**${user}** → **${channel}**\n👥 User im Channel: ${count}`,
            voice_left: (user, channel, count) => `**${user}** ← **${channel}**\n👥 User im Channel: ${count}`,
            voice_moved: (user, from, to) => `**${user}**\n**${from}** → **${to}**`,
            member_banned: (user, id, mod, reason) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unbekannt'}\n📝 Grund: ${reason || 'Kein Grund angegeben'}`,
            member_unbanned: (user, id, mod) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unbekannt'}`,
            member_kicked: (user, id, mod, reason) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unbekannt'}\n📝 Grund: ${reason || 'Kein Grund angegeben'}`,
            timeout_given: (user, id, mod, duration, reason) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unbekannt'}\n⏱️ Dauer: ${duration} Minuten\n📝 Grund: ${reason || 'Kein Grund angegeben'}`,
            warned: (user, id, mod, reason) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unbekannt'}\n📝 Grund: ${reason || 'Kein Grund angegeben'}`,
            channel_created: (name, type, category) => `**#${name}**\n📋 Typ: ${type}${category ? `\n📂 Kategorie: ${category}` : ''}`,
            channel_deleted: (name, type) => `**#${name}**\n📋 Typ: ${type}`,
            channel_renamed: (before, after) => `**${before}** → **${after}**`,
            role_created: (name, color, perms) => `**${name}**\n🎨 Farbe: ${color}\n🔒 Berechtigungen: ${perms}`,
            role_deleted: (name) => `**${name}**`,
            role_renamed: (before, after) => `**${before}** → **${after}**`,
            emoji_created: (name, animated) => `**${name}** ${animated ? '(Animiert)' : ''}`,
            emoji_deleted: (name) => `**${name}**`,
            invite_created: (inviter, channel, code, maxUses, expires) => `**${inviter}** hat eine Einladung für **#${channel}** erstellt.\nCode: \`${code}\`\nMax. Nutzungen: ${maxUses || 'Unbegrenzt'}\nLäuft ab: ${expires || 'Nie'}`,
            invite_deleted: (code, channel) => `Einladung \`${code}\` für **#${channel}** wurde gelöscht.`,
            unknown: 'Unbekannt',
            no_reason: 'Kein Grund angegeben',
            no_text: '*Kein Text*',
            no_nickname: '*Kein Nickname*',
            no_roles: 'Keine',
            unlimited: 'Unbegrenzt',
            never: 'Nie',
            text: 'Text',
            voice: 'Voice',
            category: 'Kategorie'
        },
        en: {
            all_logs: '📌 All Logs',
            message_logs: '💬 Messages',
            member_logs: '👥 Members',
            voice_logs: '🎤 Voice',
            moderation_logs: '🛡️ Moderation',
            server_logs: '⚙️ Server',
            off: '❌ Off',
            uses_all: '↪️ Uses "All"',
            logs_footer: '!logs <type> #channel | !logs disable <type> | !logs reset',
            logs_usage: '!logs <all/message/member/voice/moderation/server> #channel\n!logs disable <type>\n!logs reset',
            channel_set: (channel, type) => {
                const typeNames = {
                    'all': 'ALL Logs',
                    'message': 'Message Logs',
                    'member': 'Member Logs',
                    'voice': 'Voice Logs',
                    'moderation': 'Moderation Logs',
                    'server': 'Server Logs'
                };
                return `${channel} is now the channel for **${typeNames[type]}**!`;
            },
            disable_usage: (types) => `!logs-disable <${types}>`,
            logging_disabled: (type) => `Logging for **${type}** has been disabled.`,
            logs_reset: 'All log settings have been deleted.',
            message_deleted: (author, channel, content) => `**${author}** in ${channel}\n\n${content || '*No text*'}`,
            message_edited: (author, channel, before, after) => `**${author}** in ${channel}\n\n**Before:** ${before || '*No text*'}\n**After:** ${after || '*No text*'}`,
            bulk_deleted: (count, channel) => `**${count}** messages in ${channel} have been deleted.`,
            member_joined: (user, id, created, memberCount) => `**${user}** (${id})\n\n📅 Account created: <t:${Math.floor(created / 1000)}:R>\n👥 Server members: **${memberCount}**`,
            member_left: (user, id, roles, memberCount) => `**${user}** (${id})\n\n🎭 Roles: ${roles.slice(0, 500) || 'None'}\n👥 Server members: **${memberCount}**`,
            nickname_changed: (user, before, after) => `**${user}**\n\n**Before:** ${before || '*No nickname*'}\n**After:** ${after || '*No nickname*'}`,
            role_added: (user, role) => `**${user}** received the **${role}** role.`,
            role_removed: (user, role) => `**${user}** was removed from the **${role}** role.`,
            voice_joined: (user, channel, count) => `**${user}** → **${channel}**\n👥 Users in channel: ${count}`,
            voice_left: (user, channel, count) => `**${user}** ← **${channel}**\n👥 Users in channel: ${count}`,
            voice_moved: (user, from, to) => `**${user}**\n**${from}** → **${to}**`,
            member_banned: (user, id, mod, reason) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unknown'}\n📝 Reason: ${reason || 'No reason given'}`,
            member_unbanned: (user, id, mod) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unknown'}`,
            member_kicked: (user, id, mod, reason) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unknown'}\n📝 Reason: ${reason || 'No reason given'}`,
            timeout_given: (user, id, mod, duration, reason) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unknown'}\n⏱️ Duration: ${duration} minutes\n📝 Reason: ${reason || 'No reason given'}`,
            warned: (user, id, mod, reason) => `**${user}** (${id})\n\n👮 Moderator: ${mod || 'Unknown'}\n📝 Reason: ${reason || 'No reason given'}`,
            channel_created: (name, type, category) => `**#${name}**\n📋 Type: ${type}${category ? `\n📂 Category: ${category}` : ''}`,
            channel_deleted: (name, type) => `**#${name}**\n📋 Type: ${type}`,
            channel_renamed: (before, after) => `**${before}** → **${after}**`,
            role_created: (name, color, perms) => `**${name}**\n🎨 Color: ${color}\n🔒 Permissions: ${perms}`,
            role_deleted: (name) => `**${name}**`,
            role_renamed: (before, after) => `**${before}** → **${after}**`,
            emoji_created: (name, animated) => `**${name}** ${animated ? '(Animated)' : ''}`,
            emoji_deleted: (name) => `**${name}**`,
            invite_created: (inviter, channel, code, maxUses, expires) => `**${inviter}** created an invite for **#${channel}**.\nCode: \`${code}\`\nMax uses: ${maxUses || 'Unlimited'}\nExpires: ${expires || 'Never'}`,
            invite_deleted: (code, channel) => `Invite \`${code}\` for **#${channel}** was deleted.`,
            unknown: 'Unknown',
            no_reason: 'No reason given',
            no_text: '*No text*',
            no_nickname: '*No nickname*',
            no_roles: 'None',
            unlimited: 'Unlimited',
            never: 'Never',
            text: 'Text',
            voice: 'Voice',
            category: 'Category'
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
        .setColor(type === 'delete' ? 0xFF0000 : type === 'edit' ? 0xFFA500 : type === 'create' ? 0x00FF00 : (colors[type] || 0x3498DB))
        .setAuthor({ name: client?.user?.username || 'Bot', iconURL: client?.user?.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '📋';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = await client?.users?.fetch(userId).catch(() => null);
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

// ⭐ Log-Channel für Typ holen
function getLogChannel(guild, type) {
    const serverLogs = logChannels.get(guild.id);
    if (!serverLogs) return null;
    
    const channelId = serverLogs[type] || serverLogs['all'];
    if (!channelId) return null;
    
    return guild.channels.cache.get(channelId);
}

// ⭐ Log senden
async function sendLog(guild, type, titleKey, descKey, colorType = 'info', fields = [], replacements = {}) {
    const channel = getLogChannel(guild, type);
    if (!channel) return;
    
    // Einfachen Embed-Builder ohne Client
    const lang = 'de';
    const colors = { delete: 0xFF0000, edit: 0xFFA500, create: 0x00FF00, info: 0x3498DB };
    
    const titles = {
        de: {
            message_deleted: '🗑️ Nachricht gelöscht',
            message_edited: '✏️ Nachricht bearbeitet',
            bulk_deleted: '🗑️ Bulk-Nachrichten gelöscht',
            member_joined: '📥 Mitglied beigetreten',
            member_left: '📤 Mitglied verlassen',
            nickname_changed: '📝 Nickname geändert',
            role_added: '➕ Rolle hinzugefügt',
            role_removed: '➖ Rolle entfernt',
            voice_joined: '🎤 Voice beigetreten',
            voice_left: '🔇 Voice verlassen',
            voice_moved: '🔄 Voice gewechselt',
            member_banned: '🔨 Mitglied gebannt',
            member_unbanned: '🔓 Mitglied entbannt',
            member_kicked: '👢 Mitglied gekickt',
            timeout_given: '⏰ Timeout vergeben',
            warned: '⚠️ Verwarnung',
            channel_created: '📁 Channel erstellt',
            channel_deleted: '🗑️ Channel gelöscht',
            channel_renamed: '✏️ Channel umbenannt',
            role_created: '🆕 Rolle erstellt',
            role_deleted: '❌ Rolle gelöscht',
            role_renamed: '✏️ Rolle umbenannt',
            emoji_created: '😀 Emoji erstellt',
            emoji_deleted: '🗑️ Emoji gelöscht',
            invite_created: '🔗 Einladung erstellt',
            invite_deleted: '🗑️ Einladung gelöscht'
        }
    };
    
    let description = '';
    if (descKey === 'message_deleted') description = `**${replacements.author}** in ${replacements.channel}\n\n${replacements.content || '*Kein Text*'}`;
    else if (descKey === 'message_edited') description = `**${replacements.author}** in ${replacements.channel}\n\n**Vorher:** ${replacements.before || '*Kein Text*'}\n**Nachher:** ${replacements.after || '*Kein Text*'}`;
    else if (descKey === 'bulk_deleted') description = `**${replacements.count}** Nachrichten in ${replacements.channel} wurden gelöscht.`;
    else if (descKey === 'member_joined') description = `**${replacements.user}** (${replacements.id})\n\n📅 Account erstellt: <t:${Math.floor(replacements.created / 1000)}:R>\n👥 Server-Mitglieder: **${replacements.memberCount}**`;
    else if (descKey === 'member_left') description = `**${replacements.user}** (${replacements.id})\n\n🎭 Rollen: ${replacements.roles?.slice(0, 500) || 'Keine'}\n👥 Server-Mitglieder: **${replacements.memberCount}**`;
    else if (descKey === 'nickname_changed') description = `**${replacements.user}**\n\n**Vorher:** ${replacements.before || '*Kein Nickname*'}\n**Nachher:** ${replacements.after || '*Kein Nickname*'}`;
    else if (descKey === 'role_added') description = `**${replacements.user}** hat die Rolle **${replacements.role}** erhalten.`;
    else if (descKey === 'role_removed') description = `**${replacements.user}** wurde die Rolle **${replacements.role}** entfernt.`;
    else if (descKey === 'voice_joined') description = `**${replacements.user}** → **${replacements.channel}**\n👥 User im Channel: ${replacements.count}`;
    else if (descKey === 'voice_left') description = `**${replacements.user}** ← **${replacements.channel}**\n👥 User im Channel: ${replacements.count}`;
    else if (descKey === 'voice_moved') description = `**${replacements.user}**\n**${replacements.from}** → **${replacements.to}**`;
    else if (descKey === 'member_banned') description = `**${replacements.user}** (${replacements.id})\n\n👮 Moderator: ${replacements.mod || 'Unbekannt'}\n📝 Grund: ${replacements.reason || 'Kein Grund angegeben'}`;
    else if (descKey === 'member_unbanned') description = `**${replacements.user}** (${replacements.id})\n\n👮 Moderator: ${replacements.mod || 'Unbekannt'}`;
    else if (descKey === 'member_kicked') description = `**${replacements.user}** (${replacements.id})\n\n👮 Moderator: ${replacements.mod || 'Unbekannt'}\n📝 Grund: ${replacements.reason || 'Kein Grund angegeben'}`;
    else if (descKey === 'timeout_given') description = `**${replacements.user}** (${replacements.id})\n\n👮 Moderator: ${replacements.mod || 'Unbekannt'}\n⏱️ Dauer: ${replacements.duration} Minuten\n📝 Grund: ${replacements.reason || 'Kein Grund angegeben'}`;
    else if (descKey === 'warned') description = `**${replacements.user}** (${replacements.id})\n\n👮 Moderator: ${replacements.mod || 'Unbekannt'}\n📝 Grund: ${replacements.reason || 'Kein Grund angegeben'}`;
    else if (descKey === 'channel_created') description = `**#${replacements.name}**\n📋 Typ: ${replacements.type}${replacements.category ? `\n📂 Kategorie: ${replacements.category}` : ''}`;
    else if (descKey === 'channel_deleted') description = `**#${replacements.name}**\n📋 Typ: ${replacements.type}`;
    else if (descKey === 'channel_renamed') description = `**${replacements.before}** → **${replacements.after}**`;
    else if (descKey === 'role_created') description = `**${replacements.name}**\n🎨 Farbe: ${replacements.color}\n🔒 Berechtigungen: ${replacements.perms}`;
    else if (descKey === 'role_deleted') description = `**${replacements.name}**`;
    else if (descKey === 'role_renamed') description = `**${replacements.before}** → **${replacements.after}**`;
    else if (descKey === 'emoji_created') description = `**${replacements.name}** ${replacements.animated ? '(Animiert)' : ''}`;
    else if (descKey === 'emoji_deleted') description = `**${replacements.name}**`;
    else if (descKey === 'invite_created') description = `**${replacements.inviter}** hat eine Einladung für **#${replacements.channel}** erstellt.\nCode: \`${replacements.code}\`\nMax. Nutzungen: ${replacements.maxUses || 'Unbegrenzt'}\nLäuft ab: ${replacements.expires || 'Nie'}`;
    else if (descKey === 'invite_deleted') description = `Einladung \`${replacements.code}\` für **#${replacements.channel}** wurde gelöscht.`;
    
    const embed = new EmbedBuilder()
        .setColor(colors[colorType] || 0x3498DB)
        .setTitle(titles.de[titleKey] || titleKey)
        .setDescription(description)
        .setTimestamp();
    
    channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
    category: 'Logs',
    subCommands: {
        
        // ========== LOGS ==========
        logs: {
            aliases: ['log', 'logchannel'],
            permissions: 'Administrator',
            description: 'Zeigt oder setzt Log-Channels / Shows or sets log channels',
            category: 'Logs',
            async execute(message, args) {
                const type = args[0]?.toLowerCase();
                const channel = message.mentions.channels.first();
                const validTypes = ['all', 'message', 'member', 'voice', 'moderation', 'server'];
                
                // Zeige aktuelle Einstellungen
                if (!type || !channel) {
                    const serverLogs = logChannels.get(message.guild.id) || {};
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x3498DB)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('📋 Log-Einstellungen')
                        .addFields([
                            { name: '📌 Alle Logs', value: serverLogs.all ? `<#${serverLogs.all}>` : '❌ Aus', inline: true },
                            { name: '💬 Nachrichten', value: serverLogs.message ? `<#${serverLogs.message}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true },
                            { name: '👥 Mitglieder', value: serverLogs.member ? `<#${serverLogs.member}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline:14 },
                            { name: '🎤 Voice', value: serverLogs.voice ? `<#${serverLogs.voice}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true },
                            { name: '🛡️ Moderation', value: serverLogs.moderation ? `<#${serverLogs.moderation}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true },
                            { name: '⚙️ Server', value: serverLogs.server ? `<#${serverLogs.server}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true }
                        ])
                        .setFooter({ text: '!logs <typ> #channel | !logs disable <typ> | !logs reset', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                // Channel setzen
                if (validTypes.includes(type) && channel) {
                    if (!logChannels.has(message.guild.id)) {
                        logChannels.set(message.guild.id, {});
                    }
                    
                    const serverLogs = logChannels.get(message.guild.id);
                    serverLogs[type] = channel.id;
                    logChannels.set(message.guild.id, serverLogs);
                    
                    const typeNames = {
                        'all': 'ALLE Logs',
                        'message': 'Nachrichten-Logs',
                        'member': 'Mitglieder-Logs',
                        'voice': 'Voice-Logs',
                        'moderation': 'Moderations-Logs',
                        'server': 'Server-Logs'
                    };
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('✅ Log-Channel gesetzt')
                        .setDescription(`${channel} ist jetzt der Channel für **${typeNames[type]}**!`)
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('❌ Falsche Nutzung')
                    .setDescription('!logs <all/message/member/voice/moderation/server> #channel\n!logs disable <typ>\n!logs reset')
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LOGS DISABLE ==========
        'logs-disable': {
            aliases: ['logsoff', 'disablelog'],
            permissions: 'Administrator',
            description: 'Deaktiviert Logs für einen Typ / Disables logs for a type',
            category: 'Logs',
            async execute(message, args) {
                const type = args[0]?.toLowerCase();
                const validTypes = ['all', 'message', 'member', 'voice', 'moderation', 'server'];
                
                if (!type || !validTypes.includes(type)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('❌ Ungültiger Typ')
                        .setDescription(`!logs-disable <${validTypes.join('/')}>`)
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                if (logChannels.has(message.guild.id)) {
                    const serverLogs = logChannels.get(message.guild.id);
                    delete serverLogs[type];
                    
                    if (Object.keys(serverLogs).length === 0) {
                        logChannels.delete(message.guild.id);
                    }
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('✅ Logging deaktiviert')
                    .setDescription(`Logging für **${type}** wurde deaktiviert.`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LOGS RESET ==========
        'logs-reset': {
            aliases: ['logreset', 'resetlogs'],
            permissions: 'Administrator',
            description: 'Setzt ALLE Log-Einstellungen zurück / Resets ALL log settings',
            category: 'Logs',
            async execute(message) {
                logChannels.delete(message.guild.id);
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('✅ Logs zurückgesetzt')
                    .setDescription('Alle Log-Einstellungen wurden gelöscht.')
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

// ⭐ LOGGING FUNCTIONS
module.exports.logEvent = {
    
    // 💬 MESSAGE LOGS
    messageDelete: async (message) => {
        if (message.author?.bot || !message.guild) return;
        await sendLog(message.guild, 'message', 'message_deleted', 'message_deleted', 'delete', [], {
            author: message.author.tag,
            channel: message.channel.toString(),
            content: message.content
        });
    },
    
    messageEdit: async (oldMessage, newMessage) => {
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return;
        await sendLog(oldMessage.guild, 'message', 'message_edited', 'message_edited', 'edit', [], {
            author: oldMessage.author.tag,
            channel: oldMessage.channel.toString(),
            before: oldMessage.content?.slice(0, 500),
            after: newMessage.content?.slice(0, 500)
        });
    },
    
    messageDeleteBulk: async (messages, channel) => {
        await sendLog(channel.guild, 'message', 'bulk_deleted', 'bulk_deleted', 'delete', [], {
            count: messages.size,
            channel: channel.toString()
        });
    },
    
    // 👥 MEMBER LOGS
    memberJoin: async (member) => {
        await sendLog(member.guild, 'member', 'member_joined', 'member_joined', 'create', [], {
            user: member.user.tag,
            id: member.user.id,
            created: member.user.createdTimestamp,
            memberCount: member.guild.memberCount
        });
    },
    
    memberLeave: async (member) => {
        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ');
        await sendLog(member.guild, 'member', 'member_left', 'member_left', 'edit', [], {
            user: member.user.tag,
            id: member.user.id,
            roles: roles,
            memberCount: member.guild.memberCount
        });
    },
    
    memberNicknameChange: async (oldMember, newMember) => {
        if (oldMember.nickname === newMember.nickname) return;
        await sendLog(newMember.guild, 'member', 'nickname_changed', 'nickname_changed', 'info', [], {
            user: newMember.user.tag,
            before: oldMember.nickname,
            after: newMember.nickname
        });
    },
    
    memberRoleAdd: async (member, role) => {
        await sendLog(member.guild, 'member', 'role_added', 'role_added', 'create', [], {
            user: member.user.tag,
            role: role.name
        });
    },
    
    memberRoleRemove: async (member, role) => {
        await sendLog(member.guild, 'member', 'role_removed', 'role_removed', 'edit', [], {
            user: member.user.tag,
            role: role.name
        });
    },
    
    // 🎤 VOICE LOGS
    voiceJoin: async (state) => {
        await sendLog(state.guild, 'voice', 'voice_joined', 'voice_joined', 'create', [], {
            user: state.member.user.tag,
            channel: state.channel.name,
            count: state.channel.members.size
        });
    },
    
    voiceLeave: async (state) => {
        await sendLog(state.guild, 'voice', 'voice_left', 'voice_left', 'edit', [], {
            user: state.member.user.tag,
            channel: state.channel.name,
            count: state.channel?.members?.size || 0
        });
    },
    
    voiceMove: async (oldState, newState) => {
        await sendLog(newState.guild, 'voice', 'voice_moved', 'voice_moved', 'info', [], {
            user: newState.member.user.tag,
            from: oldState.channel.name,
            to: newState.channel.name
        });
    },
    
    // 🛡️ MODERATION LOGS
    memberBan: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'moderation', 'member_banned', 'member_banned', 'delete', [], {
            user: user.tag,
            id: user.id,
            mod: moderator?.tag,
            reason: reason
        });
    },
    
    memberUnban: async (guild, user, moderator) => {
        await sendLog(guild, 'moderation', 'member_unbanned', 'member_unbanned', 'create', [], {
            user: user.tag,
            id: user.id,
            mod: moderator?.tag
        });
    },
    
    memberKick: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'moderation', 'member_kicked', 'member_kicked', 'edit', [], {
            user: user.tag,
            id: user.id,
            mod: moderator?.tag,
            reason: reason
        });
    },
    
    memberTimeout: async (guild, user, moderator, duration, reason) => {
        await sendLog(guild, 'moderation', 'timeout_given', 'timeout_given', 'edit', [], {
            user: user.tag,
            id: user.id,
            mod: moderator?.tag,
            duration: duration,
            reason: reason
        });
    },
    
    memberWarn: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'moderation', 'warned', 'warned', 'edit', [], {
            user: user.tag,
            id: user.id,
            mod: moderator?.tag,
            reason: reason
        });
    },
    
    // ⚙️ SERVER LOGS
    channelCreate: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Kategorie';
        await sendLog(channel.guild, 'server', 'channel_created', 'channel_created', 'create', [], {
            name: channel.name,
            type: type,
            category: channel.parent?.name
        });
    },
    
    channelDelete: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Kategorie';
        await sendLog(channel.guild, 'server', 'channel_deleted', 'channel_deleted', 'delete', [], {
            name: channel.name,
            type: type
        });
    },
    
    channelUpdate: async (oldChannel, newChannel) => {
        if (oldChannel.name !== newChannel.name) {
            await sendLog(newChannel.guild, 'server', 'channel_renamed', 'channel_renamed', 'info', [], {
                before: oldChannel.name,
                after: newChannel.name
            });
        }
    },
    
    roleCreate: async (role) => {
        await sendLog(role.guild, 'server', 'role_created', 'role_created', 'create', [], {
            name: role.name,
            color: role.hexColor,
            perms: role.permissions.bitfield.toString()
        });
    },
    
    roleDelete: async (role) => {
        await sendLog(role.guild, 'server', 'role_deleted', 'role_deleted', 'delete', [], {
            name: role.name
        });
    },
    
    roleUpdate: async (oldRole, newRole) => {
        if (oldRole.name !== newRole.name) {
            await sendLog(newRole.guild, 'server', 'role_renamed', 'role_renamed', 'info', [], {
                before: oldRole.name,
                after: newRole.name
            });
        }
    },
    
    emojiCreate: async (emoji) => {
        await sendLog(emoji.guild, 'server', 'emoji_created', 'emoji_created', 'create', [], {
            name: emoji.name,
            animated: emoji.animated
        });
    },
    
    emojiDelete: async (emoji) => {
        await sendLog(emoji.guild, 'server', 'emoji_deleted', 'emoji_deleted', 'delete', [], {
            name: emoji.name
        });
    },
    
    inviteCreate: async (invite) => {
        await sendLog(invite.guild, 'server', 'invite_created', 'invite_created', 'create', [], {
            inviter: invite.inviter?.tag,
            channel: invite.channel?.name,
            code: invite.code,
            maxUses: invite.maxUses,
            expires: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : null
        });
    },
    
    inviteDelete: async (invite) => {
        await sendLog(invite.guild, 'server', 'invite_deleted', 'invite_deleted', 'delete', [], {
            code: invite.code,
            channel: invite.channel?.name
        });
    }
};
