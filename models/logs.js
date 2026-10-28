const { 
    EmbedBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

// Map for log channels (per server)
const logChannels = new Map();

// ⭐ Get log channel for type
function getLogChannel(guild, type) {
    const serverLogs = logChannels.get(guild.id);
    if (!serverLogs) return null;
    
    const channelId = serverLogs[type] || serverLogs['all'];
    if (!channelId) return null;
    
    return guild.channels.cache.get(channelId);
}

// ⭐ Helper: Create a clean container for logs
function createLogContainer(title, description, fields = [], color = 0x2B2D31, footerText = null) {
    const container = new ContainerBuilder()
        .setAccentColor(color); // Die Farbe des linken Balkens

    // Titel als Überschrift
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### ${title}`)
    );

    // Beschreibung (der Haupttext)
    if (description) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(description)
        );
    }

    // Felder (falls vorhanden)
    if (fields && fields.length > 0) {
        container.addSeparatorComponents(new SeparatorBuilder());
        const fieldsText = fields.map(f => `**${f.name}:**\n${f.value}`).join('\n\n');
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(fieldsText)
        );
    }

    // Footer (falls vorhanden)
    if (footerText) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*${footerText}*`)
        );
    }

    return container;
}

// ⭐ Send log (Bleed style - clean dark design with Components V2)
async function sendLog(guild, type, title, description, fields = [], color = null, userId = null) {
    const channel = getLogChannel(guild, type);
    if (!channel) return;
    
    const colors = {
        message_delete: 0xED4245,   // Rot
        message_edit: 0xFEE75C,     // Gelb
        member_join: 0x57F287,      // Grün
        member_leave: 0xED4245,     // Rot
        member_ban: 0xED4245,       // Rot
        member_unban: 0x57F287,     // Grün
        member_kick: 0xED4245,      // Rot
        member_timeout: 0xFEE75C,   // Gelb
        member_warn: 0xFEE75C,      // Gelb
        voice: 0x5865F2,            // Blau
        role_add: 0x57F287,         // Grün
        role_remove: 0xED4245,      // Rot
        channel_create: 0x57F287,   // Grün
        channel_delete: 0xED4245,   // Rot
        channel_rename: 0xFEE75C,   // Gelb
        role_create: 0x57F287,      // Grün
        role_delete: 0xED4245,      // Rot
        role_rename: 0xFEE75C,      // Gelb
        emoji_create: 0x57F287,     // Grün
        emoji_delete: 0xED4245,     // Rot
        invite_create: 0x57F287,    // Grün
        invite_delete: 0xED4245,    // Rot
        default: 0x2B2D31           // Dunkelgrau
    };
    
    const finalColor = color || colors[type] || colors.default;
    const footer = userId ? `User ID: ${userId}` : `${guild.name}`;
    
    const container = createLogContainer(title, description, fields, finalColor, footer);
    
    channel.send({ 
        components: [container], 
        flags: MessageFlags.IsComponentsV2 
    }).catch(() => {});
}

module.exports = {
    category: 'Logs',
    subCommands: {
        
        // ========== LOGS ==========
        logs: {
            aliases: ['log', 'logchannel'],
            permissions: 'Administrator',
            description: 'Shows or sets log channels',
            category: 'Logs',
            async execute(message, args) {
                const type = args[0]?.toLowerCase();
                const channel = message.mentions.channels.first();
                const validTypes = ['all', 'message', 'member', 'voice', 'moderation', 'server'];
                
                // Show current settings
                if (!type || !channel) {
                    const serverLogs = logChannels.get(message.guild.id) || {};
                    
                    const container = new ContainerBuilder().setAccentColor(0x2B2D31);
                    
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### 📋 Log Settings`)
                    );
                    
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`> **All Logs:** ${serverLogs.all ? `<#${serverLogs.all}>` : '❌ Off'}\n> **Messages:** ${serverLogs.message ? `<#${serverLogs.message}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off')}\n> **Members:** ${serverLogs.member ? `<#${serverLogs.member}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off')}\n> **Voice:** ${serverLogs.voice ? `<#${serverLogs.voice}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off')}\n> **Moderation:** ${serverLogs.moderation ? `<#${serverLogs.moderation}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off')}\n> **Server:** ${serverLogs.server ? `<#${serverLogs.server}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off')}`)
                    );

                    container.addSeparatorComponents(new SeparatorBuilder());
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`*!logs <type> #channel | !logs disable <type> | !logs reset*`)
                    );
                    
                    return message.reply({ 
                        components: [container], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                }
                
                // Set channel
                if (validTypes.includes(type) && channel) {
                    if (!logChannels.has(message.guild.id)) {
                        logChannels.set(message.guild.id, {});
                    }
                    
                    const serverLogs = logChannels.get(message.guild.id);
                    serverLogs[type] = channel.id;
                    logChannels.set(message.guild.id, serverLogs);
                    
                    const typeNames = {
                        'all': 'ALL Logs',
                        'message': 'Message Logs',
                        'member': 'Member Logs',
                        'voice': 'Voice Logs',
                        'moderation': 'Moderation Logs',
                        'server': 'Server Logs'
                    };
                    
                    const container = new ContainerBuilder().setAccentColor(0x57F287);
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Log Channel Set`));
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${channel} is now the channel for **${typeNames[type]}**!`));
                    
                    return message.reply({ 
                        components: [container], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                }
                
                const container = new ContainerBuilder().setAccentColor(0xED4245);
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Invalid Usage`));
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`!logs <all/message/member/voice/moderation/server> #channel\n!logs disable <type>\n!logs reset`));
                
                return message.reply({ 
                    components: [container], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }
        },
        
        // ========== LOGS DISABLE ==========
        'logs-disable': {
            aliases: ['logsoff', 'disablelog'],
            permissions: 'Administrator',
            description: 'Disables logs for a type',
            category: 'Logs',
            async execute(message, args) {
                const type = args[0]?.toLowerCase();
                const validTypes = ['all', 'message', 'member', 'voice', 'moderation', 'server'];
                
                if (!type || !validTypes.includes(type)) {
                    const container = new ContainerBuilder().setAccentColor(0xED4245);
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Invalid Type`));
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`!logs-disable <${validTypes.join('/')}>`));
                    
                    return message.reply({ 
                        components: [container], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                }
                
                if (logChannels.has(message.guild.id)) {
                    const serverLogs = logChannels.get(message.guild.id);
                    delete serverLogs[type];
                    
                    if (Object.keys(serverLogs).length === 0) {
                        logChannels.delete(message.guild.id);
                    }
                }
                
                const container = new ContainerBuilder().setAccentColor(0x57F287);
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Logging Disabled`));
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`Logging for **${type}** has been disabled.`));
                
                return message.reply({ 
                    components: [container], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }
        },
        
        // ========== LOGS RESET ==========
        'logs-reset': {
            aliases: ['logreset', 'resetlogs'],
            permissions: 'Administrator',
            description: 'Resets ALL log settings',
            category: 'Logs',
            async execute(message) {
                logChannels.delete(message.guild.id);
                
                const container = new ContainerBuilder().setAccentColor(0x57F287);
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Logs Reset`));
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`All log settings have been deleted.`));
                
                return message.reply({ 
                    components: [container], 
                    flags: MessageFlags.IsComponentsV2 
                });
            }
        }
    }
};

// ⭐ LOGGING FUNCTIONS (Clean Bleed design with Components V2)
module.exports.logEvent = {
    
    // 💬 MESSAGE LOGS
    messageDelete: async (message) => {
        if (message.author?.bot || !message.guild) return;
        
        const fields = [];
        if (message.attachments.size > 0) {
            fields.push({ name: 'Attachments', value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\n') });
        }
        
        await sendLog(message.guild, 'message_delete', '🗑️ Message Deleted', 
            `**Author:** ${message.author.tag}\n**Channel:** ${message.channel}\n\n> ${message.content || '*No content*'}`,
            fields, 0xED4245, message.author.id);
    },
    
    messageEdit: async (oldMessage, newMessage) => {
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return;
        
        await sendLog(oldMessage.guild, 'message_edit', '✏️ Message Edited',
            `**Author:** ${oldMessage.author.tag}\n**Channel:** ${oldMessage.channel}\n\n**Before:**\n> ${oldMessage.content || '*No content*'}\n\n**After:**\n> ${newMessage.content || '*No content*'}`,
            [], 0xFEE75C, oldMessage.author.id);
    },
    
    messageDeleteBulk: async (messages, channel) => {
        await sendLog(channel.guild, 'message_delete', '🗑️ Bulk Messages Deleted',
            `**${messages.size}** messages deleted in ${channel}`,
            [], 0xED4245, null);
    },
    
    // 👥 MEMBER LOGS
    memberJoin: async (member) => {
        await sendLog(member.guild, 'member_join', '📥 Member Joined',
            `**User:** ${member.user.tag}\n**Account created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n**Server members:** ${member.guild.memberCount}`,
            [], 0x57F287, member.id);
    },
    
    memberLeave: async (member) => {
        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None';
        
        await sendLog(member.guild, 'member_leave', '📤 Member Left',
            `**User:** ${member.user.tag}\n**Roles:** ${roles}\n**Server members:** ${member.guild.memberCount}`,
            [], 0xED4245, member.id);
    },
    
    memberNicknameChange: async (oldMember, newMember) => {
        if (oldMember.nickname === newMember.nickname) return;
        
        await sendLog(newMember.guild, 'member', '📝 Nickname Changed',
            `**User:** ${newMember.user.tag}\n\n**Before:** ${oldMember.nickname || '*No nickname*'}\n**After:** ${newMember.nickname || '*No nickname*'}`,
            [], 0xFEE75C, newMember.id);
    },
    
    memberRoleAdd: async (member, role) => {
        await sendLog(member.guild, 'member', '➕ Role Added',
            `**User:** ${member.user.tag}\n**Role:** ${role.name}`,
            [], 0x57F287, member.id);
    },
    
    memberRoleRemove: async (member, role) => {
        await sendLog(member.guild, 'member', '➖ Role Removed',
            `**User:** ${member.user.tag}\n**Role:** ${role.name}`,
            [], 0xED4245, member.id);
    },
    
    // 🎤 VOICE LOGS
    voiceJoin: async (state) => {
        await sendLog(state.guild, 'voice', '🔊 Voice Joined',
            `**User:** ${state.member.user.tag}\n**Channel:** ${state.channel.name}\n**Users in channel:** ${state.channel.members.size}`,
            [], 0x5865F2, state.id);
    },
    
    voiceLeave: async (state) => {
        await sendLog(state.guild, 'voice', '🔇 Voice Left',
            `**User:** ${state.member.user.tag}\n**Channel:** ${state.channel.name}\n**Users in channel:** ${state.channel?.members?.size || 0}`,
            [], 0x5865F2, state.id);
    },
    
    voiceMove: async (oldState, newState) => {
        await sendLog(newState.guild, 'voice', '🔄 Voice Moved',
            `**User:** ${newState.member.user.tag}\n**From:** ${oldState.channel.name}\n**To:** ${newState.channel.name}`,
            [], 0x5865F2, newState.id);
    },
    
    // 🛡️ MODERATION LOGS
    memberBan: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'member_ban', '🔨 Member Banned',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}\n**Reason:** ${reason || 'No reason provided'}`,
            [], 0xED4245, user.id);
    },
    
    memberUnban: async (guild, user, moderator) => {
        await sendLog(guild, 'member_unban', '🔓 Member Unbanned',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}`,
            [], 0x57F287, user.id);
    },
    
    memberKick: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'member_kick', '👢 Member Kicked',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}\n**Reason:** ${reason || 'No reason provided'}`,
            [], 0xED4245, user.id);
    },
    
    memberTimeout: async (guild, user, moderator, duration, reason) => {
        await sendLog(guild, 'member_timeout', '⏱️ Timeout Given',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}\n**Duration:** ${duration} minutes\n**Reason:** ${reason || 'No reason provided'}`,
            [], 0xFEE75C, user.id);
    },
    
    memberWarn: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'member_warn', '⚠️ Warning',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}\n**Reason:** ${reason || 'No reason provided'}`,
            [], 0xFEE75C, user.id);
    },
    
    // ⚙️ SERVER LOGS
    channelCreate: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Category';
        await sendLog(channel.guild, 'server', '📁 Channel Created',
            `**Name:** #${channel.name}\n**Type:** ${type}${channel.parent ? `\n**Category:** ${channel.parent.name}` : ''}`,
            [], 0x57F287, null);
    },
    
    channelDelete: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Category';
        await sendLog(channel.guild, 'server', '🗑️ Channel Deleted',
            `**Name:** #${channel.name}\n**Type:** ${type}`,
            [], 0xED4245, null);
    },
    
    channelUpdate: async (oldChannel, newChannel) => {
        if (oldChannel.name !== newChannel.name) {
            await sendLog(newChannel.guild, 'server', '📝 Channel Renamed',
                `**Before:** ${oldChannel.name}\n**After:** ${newChannel.name}`,
                [], 0xFEE75C, null);
        }
    },
    
    roleCreate: async (role) => {
        await sendLog(role.guild, 'server', '📁 Role Created',
            `**Name:** ${role.name}\n**Color:** ${role.hexColor}`,
            [], 0x57F287, null);
    },
    
    roleDelete: async (role) => {
        await sendLog(role.guild, 'server', '🗑️ Role Deleted',
            `**Name:** ${role.name}`,
            [], 0xED4245, null);
    },
    
    roleUpdate: async (oldRole, newRole) => {
        if (oldRole.name !== newRole.name) {
            await sendLog(newRole.guild, 'server', '📝 Role Renamed',
                `**Before:** ${oldRole.name}\n**After:** ${newRole.name}`,
                [], 0xFEE75C, null);
        }
    },
    
    emojiCreate: async (emoji) => {
        await sendLog(emoji.guild, 'server', '😀 Emoji Created',
            `**Name:** ${emoji.name} ${emoji.animated ? '(Animated)' : ''}`,
            [], 0x57F287, null);
    },
    
    emojiDelete: async (emoji) => {
        await sendLog(emoji.guild, 'server', '🗑️ Emoji Deleted',
            `**Name:** ${emoji.name}`,
            [], 0xED4245, null);
    },
    
    inviteCreate: async (invite) => {
        await sendLog(invite.guild, 'server', '🔗 Invite Created',
            `**Inviter:** ${invite.inviter?.tag}\n**Channel:** #${invite.channel?.name}\n**Code:** \`${invite.code}\`\n**Max uses:** ${invite.maxUses || 'Unlimited'}\n**Expires:** ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never'}`,
            [], 0x57F287, null);
    },
    
    inviteDelete: async (invite) => {
        await sendLog(invite.guild, 'server', '🗑️ Invite Deleted',
            `Invite \`${invite.code}\` for **#${invite.channel?.name}** was deleted`,
            [], 0xED4245, null);
    }
};
