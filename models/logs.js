const { EmbedBuilder } = require('discord.js');

// Map für Log-Channels (pro Server)
const logChannels = new Map();

// ⭐ Log-Channel für Typ holen
function getLogChannel(guild, type) {
    const serverLogs = logChannels.get(guild.id);
    if (!serverLogs) return null;
    
    const channelId = serverLogs[type] || serverLogs['all'];
    if (!channelId) return null;
    
    return guild.channels.cache.get(channelId);
}

// ⭐ Log senden
async function sendLog(guild, type, title, description, color = 0x3498DB) {
    const channel = getLogChannel(guild, type);
    if (!channel) return;
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
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
            description: 'Zeigt oder setzt Log-Channels',
            category: 'Logs',
            async execute(message, args) {
                const type = args[0]?.toLowerCase();
                const channel = message.mentions.channels.first();
                
                const validTypes = ['all', 'message', 'member', 'voice', 'moderation', 'server'];
                
                // Zeige aktuelle Einstellungen
                if (!type || !channel) {
                    const serverLogs = logChannels.get(message.guild.id) || {};
                    
                    return message.reply({ embeds: [{
                        color: 0x3498DB,
                        title: '📋 Log-Einstellungen',
                        fields: [
                            { name: '📌 Alle Logs', value: serverLogs.all ? `<#${serverLogs.all}>` : '❌ Aus', inline: true },
                            { name: '💬 Nachrichten', value: serverLogs.message ? `<#${serverLogs.message}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true },
                            { name: '👥 Mitglieder', value: serverLogs.member ? `<#${serverLogs.member}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true },
                            { name: '🎤 Voice', value: serverLogs.voice ? `<#${serverLogs.voice}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true },
                            { name: '🛡️ Moderation', value: serverLogs.moderation ? `<#${serverLogs.moderation}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true },
                            { name: '⚙️ Server', value: serverLogs.server ? `<#${serverLogs.server}>` : (serverLogs.all ? '↪️ Nutzt "Alle"' : '❌ Aus'), inline: true }
                        ],
                        footer: { text: '!logs <typ> #channel | !logs disable <typ> | !logs reset' }
                    }] });
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
                    
                    return message.reply({ embeds: [global.embed.success('Log-Channel gesetzt', `${channel} ist jetzt der Channel für **${typeNames[type]}**!`)] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!logs <all/message/member/voice/moderation/server> #channel\n!logs disable <typ>\n!logs reset')] });
            }
        },
        
        // ========== LOGS DISABLE ==========
        'logs-disable': {
            aliases: ['logsoff', 'disablelog'],
            permissions: 'Administrator',
            description: 'Deaktiviert Logs für einen Typ',
            category: 'Logs',
            async execute(message, args) {
                const type = args[0]?.toLowerCase();
                const validTypes = ['all', 'message', 'member', 'voice', 'moderation', 'server'];
                
                if (!type || !validTypes.includes(type)) {
                    return message.reply({ embeds: [global.embed.error('Ungültiger Typ', `!logs-disable <${validTypes.join('/')}>`)] });
                }
                
                if (logChannels.has(message.guild.id)) {
                    const serverLogs = logChannels.get(message.guild.id);
                    delete serverLogs[type];
                    
                    if (Object.keys(serverLogs).length === 0) {
                        logChannels.delete(message.guild.id);
                    }
                }
                
                return message.reply({ embeds: [global.embed.success('Logging deaktiviert', `Logging für **${type}** wurde deaktiviert.`)] });
            }
        },
        
        // ========== LOGS RESET ==========
        'logs-reset': {
            aliases: ['logreset', 'resetlogs'],
            permissions: 'Administrator',
            description: 'Setzt ALLE Log-Einstellungen zurück',
            category: 'Logs',
            async execute(message) {
                logChannels.delete(message.guild.id);
                return message.reply({ embeds: [global.embed.success('Logs zurückgesetzt', 'Alle Log-Einstellungen wurden gelöscht.')] });
            }
        }
    }
};

// ⭐ LOGGING FUNCTIONS
module.exports.logEvent = {
    
    // 💬 MESSAGE LOGS
    messageDelete: async (message) => {
        if (message.author?.bot || !message.guild) return;
        
        await sendLog(
            message.guild,
            'message',
            '🗑️ Nachricht gelöscht',
            `**${message.author.tag}** in ${message.channel}\n\n${message.content || '*Kein Text*'}`,
            0xFF0000
        );
    },
    
    messageEdit: async (oldMessage, newMessage) => {
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return;
        
        await sendLog(
            oldMessage.guild,
            'message',
            '✏️ Nachricht bearbeitet',
            `**${oldMessage.author.tag}** in ${oldMessage.channel}\n\n**Vorher:** ${oldMessage.content.slice(0, 500) || '*Kein Text*'}\n**Nachher:** ${newMessage.content.slice(0, 500) || '*Kein Text*'}`,
            0xFFA500
        );
    },
    
    messageDeleteBulk: async (messages, channel) => {
        await sendLog(
            channel.guild,
            'message',
            '🗑️ Bulk-Nachrichten gelöscht',
            `**${messages.size}** Nachrichten in ${channel} wurden gelöscht.`,
            0xFF0000
        );
    },
    
    // 👥 MEMBER LOGS
    memberJoin: async (member) => {
        await sendLog(
            member.guild,
            'member',
            '📥 Mitglied beigetreten',
            `**${member.user.tag}** (${member.user.id})\n\n📅 Account erstellt: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n👥 Server-Mitglieder: **${member.guild.memberCount}**`,
            0x00FF00
        );
    },
    
    memberLeave: async (member) => {
        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'Keine';
        
        await sendLog(
            member.guild,
            'member',
            '📤 Mitglied verlassen',
            `**${member.user.tag}** (${member.user.id})\n\n🎭 Rollen: ${roles.slice(0, 500)}\n👥 Server-Mitglieder: **${member.guild.memberCount}**`,
            0xFFA500
        );
    },
    
    memberNicknameChange: async (oldMember, newMember) => {
        if (oldMember.nickname === newMember.nickname) return;
        
        await sendLog(
            newMember.guild,
            'member',
            '📝 Nickname geändert',
            `**${newMember.user.tag}**\n\n**Vorher:** ${oldMember.nickname || '*Kein Nickname*'}\n**Nachher:** ${newMember.nickname || '*Kein Nickname*'}`,
            0x3498DB
        );
    },
    
    memberRoleAdd: async (member, role) => {
        await sendLog(
            member.guild,
            'member',
            '➕ Rolle hinzugefügt',
            `**${member.user.tag}** hat die Rolle **${role.name}** erhalten.`,
            0x00FF00
        );
    },
    
    memberRoleRemove: async (member, role) => {
        await sendLog(
            member.guild,
            'member',
            '➖ Rolle entfernt',
            `**${member.user.tag}** wurde die Rolle **${role.name}** entfernt.`,
            0xFFA500
        );
    },
    
    // 🎤 VOICE LOGS
    voiceJoin: async (state) => {
        await sendLog(
            state.guild,
            'voice',
            '🎤 Voice beigetreten',
            `**${state.member.user.tag}** → **${state.channel.name}**\n👥 User im Channel: ${state.channel.members.size}`,
            0x00FF00
        );
    },
    
    voiceLeave: async (state) => {
        const memberCount = state.channel?.members?.size || 0;
        
        await sendLog(
            state.guild,
            'voice',
            '🔇 Voice verlassen',
            `**${state.member.user.tag}** ← **${state.channel.name}**\n👥 User im Channel: ${memberCount}`,
            0xFFA500
        );
    },
    
    voiceMove: async (oldState, newState) => {
        await sendLog(
            newState.guild,
            'voice',
            '🔄 Voice gewechselt',
            `**${newState.member.user.tag}**\n**${oldState.channel.name}** → **${newState.channel.name}**`,
            0x3498DB
        );
    },
    
    // 🛡️ MODERATION LOGS
    memberBan: async (guild, user, moderator, reason) => {
        await sendLog(
            guild,
            'moderation',
            '🔨 Mitglied gebannt',
            `**${user.tag}** (${user.id})\n\n👮 Moderator: ${moderator?.tag || 'Unbekannt'}\n📝 Grund: ${reason || 'Kein Grund angegeben'}`,
            0xFF0000
        );
    },
    
    memberUnban: async (guild, user, moderator) => {
        await sendLog(
            guild,
            'moderation',
            '🔓 Mitglied entbannt',
            `**${user.tag}** (${user.id})\n\n👮 Moderator: ${moderator?.tag || 'Unbekannt'}`,
            0x00FF00
        );
    },
    
    memberKick: async (guild, user, moderator, reason) => {
        await sendLog(
            guild,
            'moderation',
            '👢 Mitglied gekickt',
            `**${user.tag}** (${user.id})\n\n👮 Moderator: ${moderator?.tag || 'Unbekannt'}\n📝 Grund: ${reason || 'Kein Grund angegeben'}`,
            0xFFA500
        );
    },
    
    memberTimeout: async (guild, user, moderator, duration, reason) => {
        await sendLog(
            guild,
            'moderation',
            '⏰ Timeout vergeben',
            `**${user.tag}** (${user.id})\n\n👮 Moderator: ${moderator?.tag || 'Unbekannt'}\n⏱️ Dauer: ${duration} Minuten\n📝 Grund: ${reason || 'Kein Grund angegeben'}`,
            0xFFA500
        );
    },
    
    memberWarn: async (guild, user, moderator, reason) => {
        await sendLog(
            guild,
            'moderation',
            '⚠️ Verwarnung',
            `**${user.tag}** (${user.id})\n\n👮 Moderator: ${moderator?.tag || 'Unbekannt'}\n📝 Grund: ${reason || 'Kein Grund angegeben'}`,
            0xFFA500
        );
    },
    
    // ⚙️ SERVER LOGS
    channelCreate: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Kategorie';
        
        await sendLog(
            channel.guild,
            'server',
            '📁 Channel erstellt',
            `**#${channel.name}**\n📋 Typ: ${type}${channel.parent ? `\n📂 Kategorie: ${channel.parent.name}` : ''}`,
            0x00FF00
        );
    },
    
    channelDelete: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Kategorie';
        
        await sendLog(
            channel.guild,
            'server',
            '🗑️ Channel gelöscht',
            `**#${channel.name}**\n📋 Typ: ${type}`,
            0xFF0000
        );
    },
    
    channelUpdate: async (oldChannel, newChannel) => {
        if (oldChannel.name !== newChannel.name) {
            await sendLog(
                newChannel.guild,
                'server',
                '✏️ Channel umbenannt',
                `**${oldChannel.name}** → **${newChannel.name}**`,
                0x3498DB
            );
        }
    },
    
    roleCreate: async (role) => {
        await sendLog(
            role.guild,
            'server',
            '🆕 Rolle erstellt',
            `**${role.name}**\n🎨 Farbe: ${role.hexColor}\n🔒 Berechtigungen: ${role.permissions.bitfield}`,
            0x00FF00
        );
    },
    
    roleDelete: async (role) => {
        await sendLog(
            role.guild,
            'server',
            '❌ Rolle gelöscht',
            `**${role.name}**`,
            0xFF0000
        );
    },
    
    roleUpdate: async (oldRole, newRole) => {
        if (oldRole.name !== newRole.name) {
            await sendLog(
                newRole.guild,
                'server',
                '✏️ Rolle umbenannt',
                `**${oldRole.name}** → **${newRole.name}**`,
                0x3498DB
            );
        }
    },
    
    emojiCreate: async (emoji) => {
        await sendLog(
            emoji.guild,
            'server',
            '😀 Emoji erstellt',
            `**${emoji.name}** ${emoji.animated ? '(Animiert)' : ''}`,
            0x00FF00
        );
    },
    
    emojiDelete: async (emoji) => {
        await sendLog(
            emoji.guild,
            'server',
            '🗑️ Emoji gelöscht',
            `**${emoji.name}**`,
            0xFF0000
        );
    },
    
    inviteCreate: async (invite) => {
        await sendLog(
            invite.guild,
            'server',
            '🔗 Einladung erstellt',
            `**${invite.inviter?.tag}** hat eine Einladung für **#${invite.channel?.name}** erstellt.\nCode: \`${invite.code}\`\nMax. Nutzungen: ${invite.maxUses || 'Unbegrenzt'}\nLäuft ab: ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Nie'}`,
            0x00FF00
        );
    },
    
    inviteDelete: async (invite) => {
        await sendLog(
            invite.guild,
            'server',
            '🗑️ Einladung gelöscht',
            `Einladung \`${invite.code}\` für **#${invite.channel?.name}** wurde gelöscht.`,
            0xFF0000
        );
    }
};
