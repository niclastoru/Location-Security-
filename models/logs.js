const { EmbedBuilder } = require('discord.js');

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

// ⭐ Send log (Bleed style - clean dark design)
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
    
    // Clean embed without unnecessary emojis
    const embed = new EmbedBuilder()
        .setColor(finalColor)
        .setAuthor({ name: 'Logs', iconURL: guild.iconURL() })
        .setTitle(title)
        .setDescription(description || ' ')
        .setTimestamp();
    
    if (fields && fields.length > 0) {
        embed.addFields(fields);
    }
    
    if (userId) {
        embed.setFooter({ text: `User ID: ${userId}` });
    } else {
        embed.setFooter({ text: guild.name, iconURL: guild.iconURL() });
    }
    
    channel.send({ embeds: [embed] }).catch(() => {});
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
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x2B2D31)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('Log Settings')
                        .addFields([
                            { name: 'All Logs', value: serverLogs.all ? `<#${serverLogs.all}>` : '❌ Off', inline: true },
                            { name: 'Messages', value: serverLogs.message ? `<#${serverLogs.message}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off'), inline: true },
                            { name: 'Members', value: serverLogs.member ? `<#${serverLogs.member}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off'), inline: true },
                            { name: 'Voice', value: serverLogs.voice ? `<#${serverLogs.voice}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off'), inline: true },
                            { name: 'Moderation', value: serverLogs.moderation ? `<#${serverLogs.moderation}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off'), inline: true },
                            { name: 'Server', value: serverLogs.server ? `<#${serverLogs.server}>` : (serverLogs.all ? '↪️ Uses "All"' : '❌ Off'), inline: true }
                        ])
                        .setFooter({ text: '!logs <type> #channel | !logs disable <type> | !logs reset', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
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
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('Log Channel Set')
                        .setDescription(`${channel} is now the channel for **${typeNames[type]}**!`)
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('Invalid Usage')
                    .setDescription('!logs <all/message/member/voice/moderation/server> #channel\n!logs disable <type>\n!logs reset')
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
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
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('Invalid Type')
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
                    .setTitle('Logging Disabled')
                    .setDescription(`Logging for **${type}** has been disabled.`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
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
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('Logs Reset')
                    .setDescription('All log settings have been deleted.')
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

// ⭐ LOGGING FUNCTIONS (Clean Bleed design)
module.exports.logEvent = {
    
    // 💬 MESSAGE LOGS
    messageDelete: async (message) => {
        if (message.author?.bot || !message.guild) return;
        
        const fields = [];
        if (message.attachments.size > 0) {
            fields.push({ name: 'Attachments', value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\n'), inline: false });
        }
        
        await sendLog(message.guild, 'message_delete', 'Message Deleted', 
            `**Author:** ${message.author.tag}\n**Channel:** ${message.channel}\n\n${message.content || '*No content*'}`,
            fields, 0xED4245, message.author.id);
    },
    
    messageEdit: async (oldMessage, newMessage) => {
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return;
        
        await sendLog(oldMessage.guild, 'message_edit', 'Message Edited',
            `**Author:** ${oldMessage.author.tag}\n**Channel:** ${oldMessage.channel}\n\n**Before:** ${oldMessage.content || '*No content*'}\n**After:** ${newMessage.content || '*No content*'}`,
            [], 0xFEE75C, oldMessage.author.id);
    },
    
    messageDeleteBulk: async (messages, channel) => {
        await sendLog(channel.guild, 'delete', 'Bulk Messages Deleted',
            `**${messages.size}** messages deleted in ${channel}`,
            [], 0xED4245, null);
    },
    
    // 👥 MEMBER LOGS
    memberJoin: async (member) => {
        await sendLog(member.guild, 'member_join', 'Member Joined',
            `**${member.user.tag}** joined the server\n\n**Account created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n**Server members:** ${member.guild.memberCount}`,
            [], 0x57F287, member.id);
    },
    
    memberLeave: async (member) => {
        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None';
        
        await sendLog(member.guild, 'member_leave', 'Member Left',
            `**${member.user.tag}** left the server\n\n**Roles:** ${roles}\n**Server members:** ${member.guild.memberCount}`,
            [], 0xED4245, member.id);
    },
    
    memberNicknameChange: async (oldMember, newMember) => {
        if (oldMember.nickname === newMember.nickname) return;
        
        await sendLog(newMember.guild, 'edit', 'Nickname Changed',
            `**${newMember.user.tag}**\n\n**Before:** ${oldMember.nickname || '*No nickname*'}\n**After:** ${newMember.nickname || '*No nickname*'}`,
            [], 0xFEE75C, newMember.id);
    },
    
    memberRoleAdd: async (member, role) => {
        await sendLog(member.guild, 'role_add', 'Role Added',
            `**${member.user.tag}** received the **${role.name}** role`,
            [], 0x57F287, member.id);
    },
    
    memberRoleRemove: async (member, role) => {
        await sendLog(member.guild, 'role_remove', 'Role Removed',
            `**${member.user.tag}** was removed from the **${role.name}** role`,
            [], 0xED4245, member.id);
    },
    
    // 🎤 VOICE LOGS
    voiceJoin: async (state) => {
        await sendLog(state.guild, 'voice', 'Voice Joined',
            `**${state.member.user.tag}** joined **${state.channel.name}**\n\n**Users in channel:** ${state.channel.members.size}`,
            [], 0x5865F2, state.id);
    },
    
    voiceLeave: async (state) => {
        await sendLog(state.guild, 'voice', 'Voice Left',
            `**${state.member.user.tag}** left **${state.channel.name}**\n\n**Users in channel:** ${state.channel?.members?.size || 0}`,
            [], 0x5865F2, state.id);
    },
    
    voiceMove: async (oldState, newState) => {
        await sendLog(newState.guild, 'voice', 'Voice Moved',
            `**${newState.member.user.tag}** moved from **${oldState.channel.name}** to **${newState.channel.name}**`,
            [], 0x5865F2, newState.id);
    },
    
    // 🛡️ MODERATION LOGS
    memberBan: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'member_ban', 'Member Banned',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}\n**Reason:** ${reason || 'No reason provided'}`,
            [], 0xED4245, user.id);
    },
    
    memberUnban: async (guild, user, moderator) => {
        await sendLog(guild, 'member_unban', 'Member Unbanned',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}`,
            [], 0x57F287, user.id);
    },
    
    memberKick: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'member_kick', 'Member Kicked',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}\n**Reason:** ${reason || 'No reason provided'}`,
            [], 0xED4245, user.id);
    },
    
    memberTimeout: async (guild, user, moderator, duration, reason) => {
        await sendLog(guild, 'member_timeout', 'Timeout Given',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}\n**Duration:** ${duration} minutes\n**Reason:** ${reason || 'No reason provided'}`,
            [], 0xFEE75C, user.id);
    },
    
    memberWarn: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'member_warn', 'Warning',
            `**User:** ${user.tag}\n**Moderator:** ${moderator?.tag || 'Unknown'}\n**Reason:** ${reason || 'No reason provided'}`,
            [], 0xFEE75C, user.id);
    },
    
    // ⚙️ SERVER LOGS
    channelCreate: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Category';
        await sendLog(channel.guild, 'channel_create', 'Channel Created',
            `**#${channel.name}**\n**Type:** ${type}${channel.parent ? `\n**Category:** ${channel.parent.name}` : ''}`,
            [], 0x57F287, null);
    },
    
    channelDelete: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Category';
        await sendLog(channel.guild, 'channel_delete', 'Channel Deleted',
            `**#${channel.name}**\n**Type:** ${type}`,
            [], 0xED4245, null);
    },
    
    channelUpdate: async (oldChannel, newChannel) => {
        if (oldChannel.name !== newChannel.name) {
            await sendLog(newChannel.guild, 'channel_rename', 'Channel Renamed',
                `**${oldChannel.name}** → **${newChannel.name}**`,
                [], 0xFEE75C, null);
        }
    },
    
    roleCreate: async (role) => {
        await sendLog(role.guild, 'role_create', 'Role Created',
            `**${role.name}**\n**Color:** ${role.hexColor}`,
            [], 0x57F287, null);
    },
    
    roleDelete: async (role) => {
        await sendLog(role.guild, 'role_delete', 'Role Deleted',
            `**${role.name}**`,
            [], 0xED4245, null);
    },
    
    roleUpdate: async (oldRole, newRole) => {
        if (oldRole.name !== newRole.name) {
            await sendLog(newRole.guild, 'role_rename', 'Role Renamed',
                `**${oldRole.name}** → **${newRole.name}**`,
                [], 0xFEE75C, null);
        }
    },
    
    emojiCreate: async (emoji) => {
        await sendLog(emoji.guild, 'emoji_create', 'Emoji Created',
            `**${emoji.name}** ${emoji.animated ? '(Animated)' : ''}`,
            [], 0x57F287, null);
    },
    
    emojiDelete: async (emoji) => {
        await sendLog(emoji.guild, 'emoji_delete', 'Emoji Deleted',
            `**${emoji.name}**`,
            [], 0xED4245, null);
    },
    
    inviteCreate: async (invite) => {
        await sendLog(invite.guild, 'invite_create', 'Invite Created',
            `**Inviter:** ${invite.inviter?.tag}\n**Channel:** #${invite.channel?.name}\n**Code:** \`${invite.code}\`\n**Max uses:** ${invite.maxUses || 'Unlimited'}\n**Expires:** ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never'}`,
            [], 0x57F287, null);
    },
    
    inviteDelete: async (invite) => {
        await sendLog(invite.guild, 'invite_delete', 'Invite Deleted',
            `Invite \`${invite.code}\` for **#${invite.channel?.name}** was deleted`,
            [], 0xED4245, null);
    }
};
