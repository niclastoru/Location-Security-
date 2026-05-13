const { EmbedBuilder } = require('discord.js');

// Map for log channels (per server)
const logChannels = new Map();

// ⭐ HELPER: Build modern logs embed (Bleed style)
async function buildLogEmbed(client, guildId, userId, type, title, description, fields = [], color = null) {
    const colors = {
        delete: 0xED4245,    // Rot
        edit: 0xFEE75C,      // Gelb
        create: 0x57F287,    // Grün
        join: 0x57F287,      // Grün
        leave: 0xED4245,     // Rot
        ban: 0xED4245,       // Rot
        unban: 0x57F287,     // Grün
        warn: 0xFEE75C,      // Gelb
        timeout: 0xFEE75C,   // Gelb
        voice: 0x5865F2,     // Blau
        default: 0x2B2D31    // Dunkelgrau
    };
    
    const embed = new EmbedBuilder()
        .setColor(color || colors[type] || colors.default)
        .setAuthor({ name: client?.user?.username || 'Logs', iconURL: client?.user?.displayAvatarURL() })
        .setTitle(title)
        .setDescription(description || ' ')
        .setTimestamp();
    
    if (userId) {
        const user = await client?.users?.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    
    if (fields && fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

// ⭐ Get log channel for type
function getLogChannel(guild, type) {
    const serverLogs = logChannels.get(guild.id);
    if (!serverLogs) return null;
    
    const channelId = serverLogs[type] || serverLogs['all'];
    if (!channelId) return null;
    
    return guild.channels.cache.get(channelId);
}

// ⭐ Send log (Bleed style)
async function sendLog(guild, type, title, description, fields = [], color = null, userId = null) {
    const channel = getLogChannel(guild, type);
    if (!channel) return;
    
    const colors = {
        delete: 0xED4245,
        edit: 0xFEE75C,
        create: 0x57F287,
        join: 0x57F287,
        leave: 0xED4245,
        ban: 0xED4245,
        unban: 0x57F287,
        warn: 0xFEE75C,
        timeout: 0xFEE75C,
        voice: 0x5865F2,
        default: 0x2B2D31
    };
    
    const finalColor = color || colors[type] || colors.default;
    
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
                        .setTitle('✅ Log Channel Set')
                        .setDescription(`${channel} is now the channel for **${typeNames[type]}**!`)
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('❌ Invalid Usage')
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
                        .setTitle('❌ Invalid Type')
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
                    .setTitle('✅ Logging Disabled')
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
                    .setTitle('✅ Logs Reset')
                    .setDescription('All log settings have been deleted.')
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

// ⭐ LOGGING FUNCTIONS (Bleed style)
module.exports.logEvent = {
    
    // 💬 MESSAGE LOGS
    messageDelete: async (message) => {
        if (message.author?.bot || !message.guild) return;
        
        const fields = [];
        if (message.attachments.size > 0) {
            fields.push({ name: 'Attachments', value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\n'), inline: false });
        }
        
        await sendLog(message.guild, 'message', 'Message Deleted', 
            `**${message.author.tag}** in ${message.channel}\n\n${message.content || '*No content*'}`,
            fields, null, message.author.id);
    },
    
    messageEdit: async (oldMessage, newMessage) => {
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return;
        
        await sendLog(oldMessage.guild, 'edit', 'Message Edited',
            `**${oldMessage.author.tag}** in ${oldMessage.channel}\n\n**Before:** ${oldMessage.content || '*No content*'}\n**After:** ${newMessage.content || '*No content*'}`,
            [], null, oldMessage.author.id);
    },
    
    messageDeleteBulk: async (messages, channel) => {
        await sendLog(channel.guild, 'delete', 'Bulk Messages Deleted',
            `**${messages.size}** messages deleted in ${channel}`,
            [], null);
    },
    
    // 👥 MEMBER LOGS
    memberJoin: async (member) => {
        await sendLog(member.guild, 'join', 'Member Joined',
            `**${member.user.tag}** joined the server\n\n📅 Account created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n👥 Server members: **${member.guild.memberCount}**`,
            [], null, member.id);
    },
    
    memberLeave: async (member) => {
        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'None';
        
        await sendLog(member.guild, 'leave', 'Member Left',
            `**${member.user.tag}** left the server\n\n🎭 Roles: ${roles}\n👥 Server members: **${member.guild.memberCount}**`,
            [], null, member.id);
    },
    
    memberNicknameChange: async (oldMember, newMember) => {
        if (oldMember.nickname === newMember.nickname) return;
        
        await sendLog(newMember.guild, 'edit', 'Nickname Changed',
            `**${newMember.user.tag}**\n\n**Before:** ${oldMember.nickname || '*No nickname*'}\n**After:** ${newMember.nickname || '*No nickname*'}`,
            [], null, newMember.id);
    },
    
    memberRoleAdd: async (member, role) => {
        await sendLog(member.guild, 'create', 'Role Added',
            `**${member.user.tag}** received the **${role.name}** role`,
            [], null, member.id);
    },
    
    memberRoleRemove: async (member, role) => {
        await sendLog(member.guild, 'delete', 'Role Removed',
            `**${member.user.tag}** was removed from the **${role.name}** role`,
            [], null, member.id);
    },
    
    // 🎤 VOICE LOGS (Bleed style)
    voiceJoin: async (state) => {
        await sendLog(state.guild, 'voice', 'Voice Joined',
            `**${state.member.user.tag}** joined voice channel **${state.channel.name}**\n\n👥 Users in channel: ${state.channel.members.size}`,
            [], 0x5865F2, state.id);
    },
    
    voiceLeave: async (state) => {
        await sendLog(state.guild, 'voice', 'Voice Left',
            `**${state.member.user.tag}** left voice channel **${state.channel.name}**\n\n👥 Users in channel: ${state.channel?.members?.size || 0}`,
            [], 0x5865F2, state.id);
    },
    
    voiceMove: async (oldState, newState) => {
        await sendLog(newState.guild, 'voice', 'Voice Moved',
            `**${newState.member.user.tag}** moved from **${oldState.channel.name}** to **${newState.channel.name}**`,
            [], 0x5865F2, newState.id);
    },
    
    // 🛡️ MODERATION LOGS
    memberBan: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'ban', 'Member Banned',
            `**${user.tag}** was banned\n\n👮 Moderator: ${moderator?.tag || 'Unknown'}\n📝 Reason: ${reason || 'No reason provided'}`,
            [], 0xED4245, user.id);
    },
    
    memberUnban: async (guild, user, moderator) => {
        await sendLog(guild, 'unban', 'Member Unbanned',
            `**${user.tag}** was unbanned\n\n👮 Moderator: ${moderator?.tag || 'Unknown'}`,
            [], 0x57F287, user.id);
    },
    
    memberKick: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'delete', 'Member Kicked',
            `**${user.tag}** was kicked\n\n👮 Moderator: ${moderator?.tag || 'Unknown'}\n📝 Reason: ${reason || 'No reason provided'}`,
            [], 0xED4245, user.id);
    },
    
    memberTimeout: async (guild, user, moderator, duration, reason) => {
        await sendLog(guild, 'timeout', 'Timeout Given',
            `**${user.tag}** was timed out\n\n👮 Moderator: ${moderator?.tag || 'Unknown'}\n⏱️ Duration: ${duration} minutes\n📝 Reason: ${reason || 'No reason provided'}`,
            [], 0xFEE75C, user.id);
    },
    
    memberWarn: async (guild, user, moderator, reason) => {
        await sendLog(guild, 'warn', 'Warning',
            `**${user.tag}** was warned\n\n👮 Moderator: ${moderator?.tag || 'Unknown'}\n📝 Reason: ${reason || 'No reason provided'}`,
            [], 0xFEE75C, user.id);
    },
    
    // ⚙️ SERVER LOGS
    channelCreate: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Category';
        await sendLog(channel.guild, 'create', 'Channel Created',
            `**#${channel.name}**\n📋 Type: ${type}${channel.parent ? `\n📂 Category: ${channel.parent.name}` : ''}`,
            [], 0x57F287);
    },
    
    channelDelete: async (channel) => {
        const type = channel.type === 0 ? 'Text' : channel.type === 2 ? 'Voice' : 'Category';
        await sendLog(channel.guild, 'delete', 'Channel Deleted',
            `**#${channel.name}**\n📋 Type: ${type}`,
            [], 0xED4245);
    },
    
    channelUpdate: async (oldChannel, newChannel) => {
        if (oldChannel.name !== newChannel.name) {
            await sendLog(newChannel.guild, 'edit', 'Channel Renamed',
                `**${oldChannel.name}** → **${newChannel.name}**`,
                [], 0xFEE75C);
        }
    },
    
    roleCreate: async (role) => {
        await sendLog(role.guild, 'create', 'Role Created',
            `**${role.name}**\n🎨 Color: ${role.hexColor}`,
            [], 0x57F287);
    },
    
    roleDelete: async (role) => {
        await sendLog(role.guild, 'delete', 'Role Deleted',
            `**${role.name}**`,
            [], 0xED4245);
    },
    
    roleUpdate: async (oldRole, newRole) => {
        if (oldRole.name !== newRole.name) {
            await sendLog(newRole.guild, 'edit', 'Role Renamed',
                `**${oldRole.name}** → **${newRole.name}**`,
                [], 0xFEE75C);
        }
    },
    
    emojiCreate: async (emoji) => {
        await sendLog(emoji.guild, 'create', 'Emoji Created',
            `**${emoji.name}** ${emoji.animated ? '(Animated)' : ''}`,
            [], 0x57F287);
    },
    
    emojiDelete: async (emoji) => {
        await sendLog(emoji.guild, 'delete', 'Emoji Deleted',
            `**${emoji.name}**`,
            [], 0xED4245);
    },
    
    inviteCreate: async (invite) => {
        await sendLog(invite.guild, 'create', 'Invite Created',
            `**${invite.inviter?.tag}** created an invite for **#${invite.channel?.name}**\nCode: \`${invite.code}\`\nMax uses: ${invite.maxUses || 'Unlimited'}\nExpires: ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : 'Never'}`,
            [], 0x57F287);
    },
    
    inviteDelete: async (invite) => {
        await sendLog(invite.guild, 'delete', 'Invite Deleted',
            `Invite \`${invite.code}\` for **#${invite.channel?.name}** was deleted`,
            [], 0xED4245);
    }
};
