const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Create embed (ENGLISH ONLY)
function createEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        leveling: 0x9B59B6,
        gold: 0xFFD700
    };
    
    const embed = new EmbedBuilder()
        .setColor(type === 'leveling' ? 0x9B59B6 : type === 'gold' ? 0xFFD700 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(type === 'gold' ? `🏆 ${title}` : (type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : `📊 ${title}`))
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

module.exports = {
    category: 'Leveling',
    subCommands: {
        
        // ========== LEVEL ==========
        level: {
            aliases: ['rank', 'xp'],
            description: 'Show your level and XP',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first() || message.author;
                
                const { data } = await supabase
                    .from('user_levels')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (!data) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'No Level', `${target} has no level yet!`)] 
                    });
                }
                
                const { data: allUsers } = await supabase
                    .from('user_levels')
                    .select('user_id, total_xp')
                    .eq('guild_id', message.guild.id)
                    .order('total_xp', { ascending: false });
                
                const rank = allUsers?.findIndex(u => u.user_id === target.id) + 1 || 1;
                const nextLevelXp = data.level * 500;
                const progress = Math.floor((data.xp / nextLevelXp) * 20);
                const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
                
                const embed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
                    .setTitle(`📊 Level ${data.level}`)
                    .addFields([
                        { name: '🏆 Rank', value: `#${rank}`, inline: true },
                        { name: '📈 XP', value: `${data.xp}/${nextLevelXp}`, inline: true },
                        { name: '💰 Total XP', value: `${data.total_xp}`, inline: true }
                    ])
                    .setDescription(`\`${bar}\``)
                    .setFooter({ text: `${nextLevelXp - data.xp} XP until Level ${data.level + 1}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LEVELS ==========
        levels: {
            aliases: ['lvl'],
            description: 'Leveling overview',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'on' || action === 'enable') {
                    await supabase.from('leveling_settings').upsert({
                        guild_id: message.guild.id,
                        enabled: true
                    });
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Leveling Activated', 'The level system is now active!')] 
                    });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('leveling_settings').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Leveling Deactivated', 'The level system has been deactivated.')] 
                    });
                }
                
                const { data } = await supabase
                    .from('leveling_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? '🟢 Enabled' : '🔴 Disabled';
                const stack = data?.stack_roles ? '✅ Yes' : '❌ No';
                
                const embed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('📊 Leveling System')
                    .addFields([
                        { name: 'Status', value: status, inline: true },
                        { name: 'XP Rate', value: `${data?.rate_min || 15}-${data?.rate_max || 25} XP`, inline: true },
                        { name: 'Stack Roles', value: stack, inline: true }
                    ])
                    .setFooter({ text: '!help leveling for all commands', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LEVELS STACKROLES ==========
        'levels stackroles': {
            aliases: ['stackroles'],
            permissions: 'Administrator',
            description: 'Toggle stack level roles',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const stack = action === 'on' || action === 'enable' || action === 'true';
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    stack_roles: stack
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Stack Roles', stack ? 'Level roles will now be stacked.' : 'Level roles will be replaced.')] 
                });
            }
        },
        
        // ========== LEVELS-ADD ==========
        'levels-add': {
            aliases: ['addlevelreward'],
            permissions: 'Administrator',
            description: 'Add level role reward',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const level = parseInt(args[0]);
                const role = message.mentions.roles.first();
                
                if (isNaN(level) || !role) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!levels-add <Level> @Role')] 
                    });
                }
                
                await supabase.from('level_roles').upsert({
                    guild_id: message.guild.id,
                    level: level,
                    role_id: role.id
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Level Role Added', `Level ${level} → ${role}`)] 
                });
            }
        },
        
        // ========== LEVELS-REMOVE ==========
        'levels-remove': {
            aliases: ['removelevelreward'],
            permissions: 'Administrator',
            description: 'Remove level role reward',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const level = parseInt(args[0]);
                
                if (isNaN(level)) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!levels-remove <Level>')] 
                    });
                }
                
                await supabase.from('level_roles')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('level', level);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Level Role Removed', `Level ${level} removed.`)] 
                });
            }
        },
        
        // ========== LEVELS-ROLES ==========
        'levels-roles': {
            aliases: ['levelroles'],
            description: 'Show all level roles',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('level_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .order('level', { ascending: true });
                
                if (!data || data.length === 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'Level Roles', 'No level roles configured.')] 
                    });
                }
                
                const list = data.map(r => `Level ${r.level} → <@&${r.role_id}>`).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🎭 Level Roles')
                    .setDescription(list)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LEVELS-LEADERBOARD ==========
        'levels-leaderboard': {
            aliases: ['lb', 'top'],
            description: 'Show level leaderboard',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('user_levels')
                    .select('user_id, level, total_xp')
                    .eq('guild_id', message.guild.id)
                    .order('total_xp', { ascending: false })
                    .limit(10);
                
                if (!data || data.length === 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'Leaderboard', 'No one has collected XP yet!')] 
                    });
                }
                
                const leaderboard = data.map((u, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                    return `${medal} <@${u.user_id}> - Level ${u.level} (${u.total_xp} XP)`;
                }).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🏆 Level Leaderboard')
                    .setDescription(leaderboard)
                    .setFooter({ text: `Top 10 of ${data.length} users`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LEVELS-SETRATE ==========
        'levels-setrate': {
            aliases: ['setxprate'],
            permissions: 'Administrator',
            description: 'Set XP rate',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const min = parseInt(args[0]);
                const max = parseInt(args[1]);
                
                if (isNaN(min) || isNaN(max) || min < 1 || max < min) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!levels-setrate <Min> <Max>\nExample: !levels-setrate 15 25')] 
                    });
                }
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    rate_min: min,
                    rate_max: max
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'XP Rate Set', `Min: ${min} XP, Max: ${max} XP`)] 
                });
            }
        },
        
        // ========== LEVELS-IGNORE ==========
        'levels-ignore': {
            aliases: ['ignorechannel'],
            permissions: 'Administrator',
            description: 'Ignore channel/role for XP',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.channels.first() || message.mentions.roles.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!levels-ignore #channel / @Role')] 
                    });
                }
                
                const { data } = await supabase
                    .from('leveling_settings')
                    .select('ignored_channels, ignored_roles')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                let ignoredChannels = data?.ignored_channels || [];
                let ignoredRoles = data?.ignored_roles || [];
                
                if (target.type === 0) {
                    if (!ignoredChannels.includes(target.id)) ignoredChannels.push(target.id);
                } else {
                    if (!ignoredRoles.includes(target.id)) ignoredRoles.push(target.id);
                }
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    ignored_channels: ignoredChannels,
                    ignored_roles: ignoredRoles
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Ignored', `${target} is now ignored.`)] 
                });
            }
        },
        
        // ========== LEVELS-LOCK ==========
        'levels-lock': {
            aliases: ['locklevel'],
            permissions: 'Administrator',
            description: 'Lock level-up notifications to current channel',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    level_channel: null
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Level Notifications', 'Will now be sent in the respective channel.')] 
                });
            }
        },
        
        // ========== LEVELS-UNLOCK ==========
        'levels-unlock': {
            aliases: ['unlocklevel'],
            permissions: 'Administrator',
            description: 'Set level-up channel',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    level_channel: channel.id
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Level Channel', `Level ups will be sent in ${channel}.`)] 
                });
            }
        },
        
        // ========== SETXP ==========
        setxp: {
            aliases: ['addxp', 'givexp'],
            permissions: 'Administrator',
            description: 'Add XP to a user',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const amount = parseInt(args[1]);
                
                if (!target || isNaN(amount)) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!setxp @User <XP>')] 
                    });
                }
                
                await addXp(message.guild.id, target.id, amount, supabase, message.client);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'XP Added', `${amount} XP for ${target}!`)] 
                });
            }
        },
        
        // ========== REMOVEXP ==========
        removexp: {
            aliases: ['takexp'],
            permissions: 'Administrator',
            description: 'Remove XP from a user',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const amount = parseInt(args[1]);
                
                if (!target || isNaN(amount)) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!removexp @User <XP>')] 
                    });
                }
                
                const { data } = await supabase
                    .from('user_levels')
                    .select('xp, total_xp')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (data) {
                    const newXp = Math.max(0, data.xp - amount);
                    const newTotal = Math.max(0, data.total_xp - amount);
                    
                    await supabase.from('user_levels')
                        .update({ xp: newXp, total_xp: newTotal })
                        .eq('guild_id', message.guild.id)
                        .eq('user_id', target.id);
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'XP Removed', `${amount} XP removed from ${target}.`)] 
                });
            }
        },
        
        // ========== SETLEVEL ==========
        setlevel: {
            aliases: ['setlvl'],
            permissions: 'Administrator',
            description: 'Set a user\'s level',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const level = parseInt(args[1]);
                
                if (!target || isNaN(level) || level < 1) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!setlevel @User <Level>')] 
                    });
                }
                
                const totalXp = (level - 1) * 500;
                
                await supabase.from('user_levels').upsert({
                    guild_id: message.guild.id,
                    user_id: target.id,
                    level: level,
                    xp: 0,
                    total_xp: totalXp
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Level Set', `${target} is now level ${level}!`)] 
                });
            }
        },
        
        // ========== LEVELS-RESET ==========
        'levels-reset': {
            aliases: ['resetlevel', 'resetuser'],
            permissions: 'Administrator',
            description: 'Reset a user\'s level',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!levels-reset @User')] 
                    });
                }
                
                await supabase.from('user_levels')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Level Reset', `${target} has been reset to level 1.`)] 
                });
            }
        },
        
        // ========== LEVELS-CLEANUP ==========
        'levels-cleanup': {
            aliases: ['cleanuplevels'],
            permissions: 'Administrator',
            description: 'Clean up abandoned users',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('user_levels')
                    .select('user_id')
                    .eq('guild_id', message.guild.id);
                
                let removed = 0;
                if (data) {
                    for (const u of data) {
                        const member = await message.guild.members.fetch(u.user_id).catch(() => null);
                        if (!member) {
                            await supabase.from('user_levels')
                                .delete()
                                .eq('guild_id', message.guild.id)
                                .eq('user_id', u.user_id);
                            removed++;
                        }
                    }
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Cleanup', `${removed} abandoned users removed.`)] 
                });
            }
        },
        
        // ========== LEVELS-SYNC ==========
        'levels-sync': {
            aliases: ['synclevels'],
            permissions: 'Administrator',
            description: 'Synchronize level roles',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('user_levels')
                    .select('user_id, level')
                    .eq('guild_id', message.guild.id);
                
                let synced = 0;
                if (data) {
                    for (const u of data) {
                        const member = await message.guild.members.fetch(u.user_id).catch(() => null);
                        if (member) {
                            await syncLevelRoles(message.guild.id, member, u.level, supabase);
                            synced++;
                        }
                    }
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Sync', `${synced} users synchronized.`)] 
                });
            }
        },
        
        // ========== LEVELS-UPDATE ==========
        'levels-update': {
            aliases: ['updatelevel'],
            permissions: 'Administrator',
            description: 'Update level roles for a user',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.members.first() || message.member;
                
                const { data } = await supabase
                    .from('user_levels')
                    .select('level')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (data) {
                    await syncLevelRoles(message.guild.id, target, data.level, supabase);
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Update', `Roles for ${target} updated.`)] 
                });
            }
        },
        
        // ========== LEVELS-MESSAGEMODE ==========
        'levels-messageMode': {
            aliases: ['messagemode'],
            permissions: 'Administrator',
            description: 'Set level-up message mode',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const mode = args[0]?.toLowerCase();
                
                if (!['default', 'embed', 'silent'].includes(mode)) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Mode', 'Modes: default, embed, silent')] 
                    });
                }
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    message_mode: mode
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Message Mode', `Mode: ${mode}`)] 
                });
            }
        }
    }
};

// ========== HELPER FUNCTIONS ==========

async function addXp(guildId, userId, xpToAdd, supabase, client) {
    const { data: settings } = await supabase
        .from('leveling_settings')
        .select('*')
        .eq('guild_id', guildId)
        .single();
    
    if (settings && !settings.enabled) return;
    
    const { data } = await supabase
        .from('user_levels')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();
    
    let newXp = (data?.xp || 0) + xpToAdd;
    let newLevel = data?.level || 1;
    let newTotal = (data?.total_xp || 0) + xpToAdd;
    let leveledUp = false;
    
    while (newXp >= newLevel * 500) {
        newXp -= newLevel * 500;
        newLevel++;
        leveledUp = true;
    }
    
    await supabase.from('user_levels').upsert({
        guild_id: guildId,
        user_id: userId,
        xp: newXp,
        level: newLevel,
        total_xp: newTotal,
        last_message: new Date().toISOString()
    });
    
    if (leveledUp) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
                await syncLevelRoles(guildId, member, newLevel, supabase);
                
                const channelId = settings?.level_channel;
                const channel = channelId ? guild.channels.cache.get(channelId) : null;
                
                const message = `🎉 ${member.user.username} reached Level ${newLevel}!`;
                
                if (channel) {
                    channel.send(message).catch(() => {});
                }
            }
        }
    }
}

async function syncLevelRoles(guildId, member, level, supabase) {
    const { data: settings } = await supabase
        .from('leveling_settings')
        .select('stack_roles')
        .eq('guild_id', guildId)
        .single();
    
    const { data: levelRoles } = await supabase
        .from('level_roles')
        .select('*')
        .eq('guild_id', guildId)
        .lte('level', level);
    
    if (!levelRoles) return;
    
    const roleIds = levelRoles.map(r => r.role_id);
    const rolesToAdd = [];
    const rolesToRemove = [];
    
    for (const roleId of roleIds) {
        if (!member.roles.cache.has(roleId)) {
            rolesToAdd.push(roleId);
        }
    }
    
    if (!settings?.stack_roles) {
        for (const [id, role] of member.roles.cache) {
            if (roleIds.includes(id)) continue;
            const { data: higherRole } = await supabase
                .from('level_roles')
                .select('role_id')
                .eq('guild_id', guildId)
                .eq('role_id', id)
                .single();
            
            if (higherRole) {
                rolesToRemove.push(id);
            }
        }
    }
    
    if (rolesToAdd.length > 0) await member.roles.add(rolesToAdd).catch(() => {});
    if (rolesToRemove.length > 0) await member.roles.remove(rolesToRemove).catch(() => {});
}

// ========== MESSAGE HANDLER ==========
async function handleLevelingMessage(message, supabase) {
    if (message.author.bot || !message.guild) return;
    
    const { data: settings } = await supabase
        .from('leveling_settings')
        .select('*')
        .eq('guild_id', message.guild.id)
        .single();
    
    if (!settings || !settings.enabled) return;
    
    if (settings.ignored_channels?.includes(message.channel.id)) return;
    if (message.member.roles.cache.some(r => settings.ignored_roles?.includes(r.id))) return;
    
    const { data: userData } = await supabase
        .from('user_levels')
        .select('last_message')
        .eq('guild_id', message.guild.id)
        .eq('user_id', message.author.id)
        .single();
    
    if (userData?.last_message) {
        const lastTime = new Date(userData.last_message).getTime();
        if (Date.now() - lastTime < 60000) return;
    }
    
    const xpGained = Math.floor(Math.random() * (settings.rate_max - settings.rate_min + 1)) + settings.rate_min;
    await addXp(message.guild.id, message.author.id, xpGained, supabase, message.client);
}

module.exports.addXp = addXp;
module.exports.handleLevelingMessage = handleLevelingMessage;
