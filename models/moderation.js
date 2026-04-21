const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Create embed (ENGLISH ONLY)
function createEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : type === 'warn' ? `⚠️ ${title}` : `ℹ️ ${title}`)
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

module.exports = {
    category: 'Moderation',
    subCommands: {
        
        // ========== BAN ==========
        ban: {
            permissions: 'BanMembers',
            description: 'Ban a user permanently',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!ban @User [Reason]')] 
                    });
                }
                
                if (!target.bannable) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Cannot Ban', 'I cannot ban this user!')] 
                    });
                }
                
                const reason = args.slice(1).join(' ') || 'No reason provided';
                await target.ban({ reason });
                
                const fields = [
                    { name: '👤 User', value: target.user.tag, inline: true },
                    { name: '🆔 ID', value: target.id, inline: true },
                    { name: '📝 Reason', value: reason, inline: true }
                ];
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'User Banned', `${target.user.tag} has been banned.`, fields)] 
                });
            }
        },
        
        // ========== UNBAN ==========
        unban: {
            permissions: 'BanMembers',
            description: 'Unban a user',
            category: 'Moderation',
            async execute(message, args) {
                const userId = args[0];
                
                if (!userId) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No ID', '!unban <UserID>')] 
                    });
                }
                
                try {
                    await message.guild.members.unban(userId);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'User Unbanned', `User with ID ${userId} has been unbanned.`)] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Error', 'User not found or not banned.')] 
                    });
                }
            }
        },
        
        // ========== KICK ==========
        kick: {
            permissions: 'KickMembers',
            description: 'Kick a user from the server',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!kick @User [Reason]')] 
                    });
                }
                
                if (!target.kickable) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Cannot Kick', 'I cannot kick this user!')] 
                    });
                }
                
                const reason = args.slice(1).join(' ') || 'No reason provided';
                await target.kick(reason);
                
                const fields = [
                    { name: '👤 User', value: target.user.tag, inline: true },
                    { name: '📝 Reason', value: reason, inline: true }
                ];
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'User Kicked', `${target.user.tag} has been kicked.`, fields)] 
                });
            }
        },
        
        // ========== TIMEOUT ==========
        timeout: {
            aliases: ['mute'],
            permissions: 'ModerateMembers',
            description: 'Timeout a user',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!timeout @User <Minutes> [Reason]')] 
                    });
                }
                
                const minutes = parseInt(args[1]);
                if (isNaN(minutes) || minutes < 1 || minutes > 40320) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Time', '1-40320 minutes (28 days)!')] 
                    });
                }
                
                const reason = args.slice(2).join(' ') || 'No reason provided';
                await target.timeout(minutes * 60 * 1000, reason);
                
                const fields = [
                    { name: '👤 User', value: target.user.tag, inline: true },
                    { name: '⏱️ Duration', value: `${minutes} minutes`, inline: true },
                    { name: '📝 Reason', value: reason, inline: true }
                ];
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Timeout Set', `${target.user.tag} has been timed out for ${minutes} minutes.`, fields)] 
                });
            }
        },
        
        // ========== UNTIMEOUT ==========
        untimeout: {
            aliases: ['unmute'],
            permissions: 'ModerateMembers',
            description: 'Remove timeout from a user',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!untimeout @User')] 
                    });
                }
                
                if (!target.communicationDisabledUntil) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'No Timeout', `${target.user.tag} has no active timeout.`)] 
                    });
                }
                
                await target.timeout(null);
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Timeout Removed', `Timeout for ${target.user.tag} has been removed.`)] 
                });
            }
        },
        
        // ========== WARN ==========
        warn: {
            permissions: 'ModerateMembers',
            description: 'Warn a user',
            category: 'Moderation',
            async execute(message, args, { supabase }) {
                const target = message.mentions.members.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!warn @User [Reason]')] 
                    });
                }
                
                const reason = args.slice(1).join(' ') || 'No reason provided';
                
                await supabase.from('warns').insert({
                    user_id: target.id,
                    moderator_id: message.author.id,
                    reason: reason,
                    guild_id: message.guild.id
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'warn', 'User Warned', `${target.user.tag} has been warned.\n**Reason:** ${reason}`)] 
                });
            }
        },
        
        // ========== HISTORY ==========
        history: {
            permissions: 'ModerateMembers',
            description: 'Show warning history of a user',
            category: 'Moderation',
            async execute(message, args, { supabase }) {
                const target = message.mentions.members.first() || message.member;
                
                const { data } = await supabase
                    .from('warns')
                    .select('*')
                    .eq('user_id', target.id)
                    .eq('guild_id', message.guild.id)
                    .order('created_at', { ascending: false });
                
                if (!data || data.length === 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'No Warnings', `${target.user.tag} has no warnings.`)] 
                    });
                }
                
                const historyText = data.map(w => `**${w.reason}** (Mod: <@${w.moderator_id}>)`).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(`📜 Warning History of ${target.user.username}`)
                    .setDescription(historyText)
                    .setFooter({ text: `${data.length} warnings`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== HISTORYCHANNEL ==========
        historychannel: {
            permissions: 'ManageChannels',
            description: 'Set the warning history channel',
            category: 'Moderation',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                
                await supabase.from('settings').upsert({
                    guild_id: message.guild.id,
                    history_channel: channel.id
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'History Channel Set', `${channel} is now the history channel.`)] 
                });
            }
        },
        
        // ========== PURGE ==========
        purge: {
            aliases: ['clear'],
            permissions: 'ManageMessages',
            description: 'Delete multiple messages',
            category: 'Moderation',
            async execute(message, args) {
                const amount = parseInt(args[0]);
                
                if (isNaN(amount) || amount < 1 || amount > 100) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Amount', '1-100 messages!')] 
                    });
                }
                
                const deleted = await message.channel.bulkDelete(amount, true);
                const msg = await message.channel.send({ 
                    embeds: [createEmbed(message, 'success', 'Purged', `${deleted.size} messages deleted.`)] 
                });
                setTimeout(() => msg.delete(), 3000);
            }
        },
        
        // ========== LOCK ==========
        lock: {
            permissions: 'ManageChannels',
            description: 'Lock a channel',
            category: 'Moderation',
            async execute(message) {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Channel Locked', `${message.channel} is now locked.`)] 
                });
            }
        },
        
        // ========== UNLOCK ==========
        unlock: {
            permissions: 'ManageChannels',
            description: 'Unlock a channel',
            category: 'Moderation',
            async execute(message) {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Channel Unlocked', `${message.channel} is now unlocked.`)] 
                });
            }
        },
        
        // ========== SLOWMODE ==========
        slowmode: {
            permissions: 'ManageChannels',
            description: 'Set slowmode for a channel',
            category: 'Moderation',
            async execute(message, args) {
                const seconds = parseInt(args[0]);
                
                if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Time', '0-21600 seconds!')] 
                    });
                }
                
                await message.channel.setRateLimitPerUser(seconds);
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Slowmode Set', seconds === 0 ? 'Slowmode disabled.' : `Slowmode: ${seconds} seconds.`)] 
                });
            }
        },
        
        // ========== ROLE ==========
        role: {
            aliases: ['r'],
            permissions: 'ManageRoles',
            description: 'Add or remove a role from a user',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!role @User <Role>')] 
                    });
                }
                
                const roleName = args.slice(1).join(' ');
                if (!roleName) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Role', '!role @User <Role>')] 
                    });
                }
                
                const role = message.guild.roles.cache.find(r => 
                    r.name.toLowerCase() === roleName.toLowerCase() ||
                    r.id === roleName.replace(/\D/g, '')
                );
                
                if (!role) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Role Not Found', `"${roleName}" does not exist.`)] 
                    });
                }
                
                if (role.position >= message.guild.members.me.roles.highest.position) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Permission', 'I cannot manage this role!')] 
                    });
                }
                
                if (role.position >= message.member.roles.highest.position) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Permission', 'You cannot manage this role!')] 
                    });
                }
                
                if (target.roles.cache.has(role.id)) {
                    await target.roles.remove(role);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Role Removed', `❌ ${role.name} removed from ${target.user.tag}.`)] 
                    });
                } else {
                    await target.roles.add(role);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Role Added', `✅ ${role.name} added to ${target.user.tag}.`)] 
                    });
                }
            }
        },
        
        // ========== ROLES ==========
        roles: {
            permissions: 'ManageRoles',
            description: 'Show all roles of a user',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first() || message.member;
                const roles = target.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position);
                const roleList = roles.map(r => `${r}`).join(', ') || 'No roles';
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(`📋 Roles of ${target.user.username}`)
                    .setDescription(roleList)
                    .setFooter({ text: `${roles.size} roles`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== NICKNAME ==========
        nickname: {
            aliases: ['nick'],
            permissions: 'ManageNicknames',
            description: 'Change a user\'s nickname',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!nickname @User <Name>')] 
                    });
                }
                
                const nick = args.slice(1).join(' ') || '';
                await target.setNickname(nick || null);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Nickname Changed', 
                        nick ? `${target.user.tag} is now called **${nick}**` : `Nickname of ${target.user.tag} removed.`)] 
                });
            }
        },
        
        // ========== CLEARNICK ==========
        clearnick: {
            permissions: 'ManageNicknames',
            description: 'Remove a user\'s nickname',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first() || message.member;
                
                await target.setNickname(null);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Nickname Removed', `Nickname of ${target.user.tag} has been reset.`)] 
                });
            }
        },
        
        // ========== JAIL ==========
        jail: {
            permissions: 'ManageRoles',
            description: 'Jail a user',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!jail @User [Reason]')] 
                    });
                }
                
                let jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                if (!jailRole) {
                    jailRole = await message.guild.roles.create({ name: 'Jail', color: 0x808080 });
                    message.guild.channels.cache.forEach(channel => {
                        channel.permissionOverwrites.create(jailRole, { SendMessages: false, AddReactions: false }).catch(() => {});
                    });
                }
                
                const reason = args.slice(1).join(' ') || 'No reason provided';
                await target.roles.add(jailRole, reason);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'User Jailed', `${target.user.tag} is now in jail.\n**Reason:** ${reason}`)] 
                });
            }
        },
        
        // ========== UNJAIL ==========
        unjail: {
            permissions: 'ManageRoles',
            description: 'Release a user from jail',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!unjail @User')] 
                    });
                }
                
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                if (!jailRole) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Jail Role', 'No jail role exists!')] 
                    });
                }
                
                await target.roles.remove(jailRole);
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'User Released', `${target.user.tag} has been released from jail.`)] 
                });
            }
        },
        
        // ========== JAIL-LIST ==========
        'jail-list': {
            permissions: 'ManageRoles',
            description: 'Show all jailed users',
            category: 'Moderation',
            async execute(message) {
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                
                if (!jailRole) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'Jail Empty', 'No jail role exists.')] 
                    });
                }
                
                const jailed = jailRole.members.map(m => m.user.tag).join('\n') || 'No users in jail';
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🔒 Users in Jail')
                    .setDescription(jailed)
                    .setFooter({ text: `${jailRole.members.size} users`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== JAIL-SETTINGS ==========
        'jail-settings': {
            permissions: 'ManageRoles',
            description: 'Show jail settings',
            category: 'Moderation',
            async execute(message) {
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Jail Settings', 'Jail role is created automatically when you use `!jail`.')] 
                });
            }
        },
        
        // ========== DRAG ==========
        drag: {
            permissions: 'MoveMembers',
            description: 'Drag a user to your voice channel',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!drag @User')] 
                    });
                }
                
                if (!target.voice.channel) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not in VC', `${target.user.tag} is not in a voice channel!`)] 
                    });
                }
                
                if (!message.member.voice.channel) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not in VC', 'You are not in a voice channel!')] 
                    });
                }
                
                await target.voice.setChannel(message.member.voice.channel);
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'User Dragged', `${target.user.tag} has been dragged to your channel.`)] 
                });
            }
        },
        
        // ========== MOVEALL ==========
        moveall: {
            permissions: 'MoveMembers',
            description: 'Move all users to your voice channel',
            category: 'Moderation',
            async execute(message) {
                if (!message.member.voice.channel) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not in VC', 'You are not in a voice channel!')] 
                    });
                }
                
                const sourceChannel = message.guild.members.cache.find(m => 
                    m.voice.channel && m.voice.channel.id !== message.member.voice.channel.id
                )?.voice.channel;
                
                if (!sourceChannel) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'Nobody There', 'No other users in voice channels.')] 
                    });
                }
                
                let count = 0;
                for (const [id, member] of sourceChannel.members) {
                    await member.voice.setChannel(message.member.voice.channel);
                    count++;
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'All Moved', `${count} users moved to your channel.`)] 
                });
            }
        },
        
        // ========== WORDFILTER ==========
        wordfilter: {
            permissions: 'ManageMessages',
            description: 'Manage word filter',
            category: 'Moderation',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'add') {
                    const word = args[1]?.toLowerCase();
                    if (!word) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'No Word', '!wordfilter add <Word>')] 
                        });
                    }
                    
                    await supabase.from('wordfilter').insert({ guild_id: message.guild.id, word });
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Word Added', `"${word}" is now filtered.`)] 
                    });
                }
                
                if (action === 'remove') {
                    const word = args[1]?.toLowerCase();
                    if (!word) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'No Word', '!wordfilter remove <Word>')] 
                        });
                    }
                    
                    await supabase.from('wordfilter').delete().eq('guild_id', message.guild.id).eq('word', word);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Word Removed', `"${word}" is no longer filtered.`)] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase.from('wordfilter').select('word').eq('guild_id', message.guild.id);
                    const words = data?.map(w => w.word).join(', ') || 'No words filtered';
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('📝 Filtered Words')
                        .setDescription(words)
                        .setFooter({ iconURL: message.author.displayAvatarURL() })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'error', 'Invalid Usage', '!wordfilter <add/remove/list>')] 
                });
            }
        }
    }
};
