const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Build nice embeds with language support
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'en';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        uprank: 0x00FF00,
        derank: 0xFF0000
    };
    
    const titles = {
        en: {
            no_hierarchy: 'No Hierarchy',
            no_team_member: 'Not a Team Member',
            team_info: 'Team Information',
            uprank: 'Promotion',
            derank: 'Demotion',
            team_added: 'Added to Team',
            team_removed: 'Removed from Team',
            uprank_history: 'Promotion History',
            derank_history: 'Demotion History',
            hierarchy_saved: 'Hierarchy Saved',
            hierarchy_reset: 'Reset',
            log_channel_set: 'Log Channel',
            log_settings: 'Team Logs',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            no_data: 'No Data'
        }
    };
    
    const descriptions = {
        en: {
            no_hierarchy: 'Use `!teamhierarchy set @Role1 @Role2`\n**Lowest FIRST!**',
            no_team_member: (user) => `${user} is not a team member!`,
            team_since: 'Team since',
            roles: (count) => `🎭 Roles [${count}]`,
            history: 'History',
            requested_by: (user) => `Requested by ${user}`,
            unknown: 'Unknown',
            none: 'None',
            uprank_no_user: '!uprank @User',
            uprank_self: 'Not yourself!',
            uprank_max: (user) => `${user} already has the highest role!`,
            uprank_success: (user, role) => `${user} is now **${role}**!`,
            uprank_from: 'From',
            uprank_to: 'To',
            moderator: 'Moderator',
            derank_no_user: '!derank @User',
            derank_self: 'Not yourself!',
            derank_min: (user) => `${user} already has the lowest role!`,
            derank_removed: (user) => `${user} is no longer in the team!`,
            derank_success: (user) => `${user} has been demoted!`,
            uprank_empty: (user) => `${user} has never been promoted.`,
            derank_empty: (user) => `${user} has never been demoted.`,
            hierarchy_set_usage: 'Mention at least 1 role with @!\n`!teamhierarchy set @Supporter @Moderator @Admin`',
            hierarchy_saved: (count) => `**${count} roles saved!**\n\n**Order (1 = lowest):**`,
            hierarchy_no_roles: 'No valid roles found!',
            hierarchy_list_empty: 'Use `!teamhierarchy set @Role1 @Role2 ...`\n**Lowest first!**',
            hierarchy_footer: '1 = Lowest • Highest Number = Highest Role',
            hierarchy_reset: 'Hierarchy deleted.',
            teamlog_usage: '`!teamlog <uprank/derank/all> #channel`',
            teamlog_all: (channel) => `All logs in ${channel}`,
            teamlog_type: (type, channel) => `${type}-Logs in ${channel}`,
            uprank_logs: '⬆️ Promotions',
            derank_logs: '⬇️ Demotions',
            off: '❌ Off',
            role_not_exist: 'First role does not exist!',
            target_role_not_exist: 'Target role does not exist!',
            from: 'From',
            to: 'To',
            mod: 'Mod',
            given_by: 'Given by',
            received: 'Received'
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
        .setColor(type === 'uprank' ? 0x00FF00 : type === 'derank' ? 0xFF0000 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'uprank' ? '⬆️' : type === 'derank' ? '⬇️' : 'ℹ️';
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

// ⭐ Load role hierarchy (1 = lowest)
async function loadHierarchy(guildId, supabase) {
    const { data, error } = await supabase
        .from('team_hierarchy')
        .select('*')
        .eq('guild_id', guildId)
        .order('position', { ascending: true });
    
    if (error) {
        console.error('Error loading hierarchy:', error);
        return [];
    }
    
    return data || [];
}

// ⭐ Send log message
async function sendLogMessage(guild, logType, embed, supabase) {
    const { data } = await supabase
        .from('team_log_channels')
        .select('channel_id')
        .eq('guild_id', guild.id)
        .eq('log_type', logType)
        .maybeSingle();
    
    if (data?.channel_id) {
        const channel = guild.channels.cache.get(data.channel_id);
        if (channel) {
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

// ⭐ Save team join
async function saveTeamJoin(guildId, userId, roleId, roleName, givenBy, givenByTag, supabase) {
    await supabase.from('team_join').insert({
        guild_id: guildId,
        user_id: userId,
        role_id: roleId,
        role_name: roleName,
        given_by: givenBy,
        given_by_tag: givenByTag,
        joined_at: new Date().toISOString()
    });
}

// ⭐ Get team join for user
async function getTeamJoin(guildId, userId, roleId, supabase) {
    const { data } = await supabase
        .from('team_join')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .order('joined_at', { ascending: false })
        .limit(1);
    
    return data?.[0] || null;
}

// ⭐ Get first team join
async function getFirstTeamJoin(guildId, userId, supabase) {
    const { data } = await supabase
        .from('team_join')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1);
    
    return data?.[0] || null;
}

module.exports = {
    category: 'Team',
    subCommands: {
        
        // ========== TEAM ==========
        team: {
            aliases: ['teaminfo', 'ti'],
            description: 'Shows team info of a user',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.members.first() || message.member;
                const user = target.user;
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                
                if (hierarchy.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_hierarchy', 'no_hierarchy')] 
                    });
                }
                
                const teamRoleIds = hierarchy.map(h => h.role_id);
                const userTeamRoles = target.roles.cache.filter(r => teamRoleIds.includes(r.id));
                
                if (userTeamRoles.size === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_team_member', 'no_team_member', [target.toString()])] 
                    });
                }
                
                const firstJoin = await getFirstTeamJoin(message.guild.id, target.id, supabase);
                
                const roleInfo = [];
                const rolesList = [];
                
                for (const role of userTeamRoles.values()) {
                    rolesList.push(`${role}`);
                    
                    const join = await getTeamJoin(message.guild.id, target.id, role.id, supabase);
                    
                    if (join) {
                        const joinDate = new Date(join.joined_at);
                        const timestamp = Math.floor(joinDate.getTime() / 1000);
                        roleInfo.push(`**${role.name}**\n┗ 📅 <t:${timestamp}:D>\n┗ 👤 ${join.given_by_tag}`);
                    } else {
                        roleInfo.push(`**${role.name}**\n┗ 📅 Unknown\n┗ 👤 Unknown`);
                    }
                }
                
                const embed = new EmbedBuilder()
                    .setColor(target.displayColor || 0x5865F2)
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .addFields(
                        { name: '🆔 User ID', value: user.id, inline: true },
                        { name: '👤 Discord', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true }
                    );
                
                if (firstJoin) {
                    const firstDate = new Date(firstJoin.joined_at);
                    const firstTimestamp = Math.floor(firstDate.getTime() / 1000);
                    embed.addFields({
                        name: '📅 Team since',
                        value: `<t:${firstTimestamp}:D>\n┗ 👤 ${firstJoin.given_by_tag}`,
                        inline: true
                    });
                }
                
                embed.addFields(
                    { name: `🎭 Roles [${userTeamRoles.size}]`, value: rolesList.join(' ') || 'None', inline: false },
                    { name: '📋 History', value: roleInfo.join('\n\n') || 'None', inline: false }
                )
                .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== UPRANK ==========
        uprank: {
            aliases: ['promote', 'up'],
            permissions: 'ManageRoles',
            description: 'Promotes a user',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'uprank', 'uprank_no_user')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'uprank', 'uprank_self')] 
                    });
                }
                
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                if (hierarchy.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_hierarchy', 'no_hierarchy')] 
                    });
                }
                
                const teamRoleIds = hierarchy.map(h => h.role_id);
                const userTeamRoles = target.roles.cache.filter(r => teamRoleIds.includes(r.id));
                
                if (userTeamRoles.size === 0) {
                    const firstRoleData = hierarchy[0];
                    const firstRole = message.guild.roles.cache.get(firstRoleData.role_id);
                    
                    if (!firstRole) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'role_not_exist')] 
                        });
                    }
                    
                    await target.roles.add(firstRole);
                    await saveTeamJoin(message.guild.id, target.id, firstRole.id, firstRole.name, message.author.id, message.author.tag, supabase);
                    
                    await supabase.from('uprank_history').insert({
                        guild_id: message.guild.id,
                        user_id: target.id,
                        user_tag: target.user.tag,
                        user_avatar: target.user.displayAvatarURL(),
                        moderator_id: message.author.id,
                        moderator_tag: message.author.tag,
                        old_role_id: null,
                        old_role_name: 'None',
                        new_role_id: firstRoleData.role_id,
                        new_role_name: firstRoleData.role_name
                    });
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('⬆️ Added to Team')
                        .setDescription(`${target} is now **${firstRole.name}**!`)
                        .addFields({ name: 'Moderator', value: `${message.author}`, inline: true })
                        .setThumbnail(target.user.displayAvatarURL())
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    await message.reply({ embeds: [embed] });
                    await sendLogMessage(message.guild, 'uprank', embed, supabase);
                    return;
                }
                
                let currentRoleIndex = -1;
                let currentRole = null;
                for (const role of userTeamRoles.values()) {
                    const index = hierarchy.findIndex(h => h.role_id === role.id);
                    if (index > currentRoleIndex) {
                        currentRoleIndex = index;
                        currentRole = hierarchy[index];
                    }
                }
                
                if (currentRoleIndex === hierarchy.length - 1) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'uprank', 'uprank_max', [target.toString()])] 
                    });
                }
                
                const newRoleData = hierarchy[currentRoleIndex + 1];
                const newRole = message.guild.roles.cache.get(newRoleData.role_id);
                
                if (!newRole) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'target_role_not_exist')] 
                    });
                }
                
                const oldRole = message.guild.roles.cache.get(currentRole.role_id);
                await target.roles.remove(oldRole);
                await target.roles.add(newRole);
                
                await saveTeamJoin(message.guild.id, target.id, newRole.id, newRole.name, message.author.id, message.author.tag, supabase);
                
                await supabase.from('uprank_history').insert({
                    guild_id: message.guild.id,
                    user_id: target.id,
                    user_tag: target.user.tag,
                    user_avatar: target.user.displayAvatarURL(),
                    moderator_id: message.author.id,
                    moderator_tag: message.author.tag,
                    old_role_id: currentRole.role_id,
                    old_role_name: currentRole.role_name,
                    new_role_id: newRoleData.role_id,
                    new_role_name: newRoleData.role_name
                });
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('⬆️ Promotion')
                    .setDescription(`${target} has been promoted!`)
                    .addFields([
                        { name: 'From', value: oldRole.name, inline: true },
                        { name: 'To', value: newRole.name, inline: true },
                        { name: 'Mod', value: `${message.author}`, inline: true }
                    ])
                    .setThumbnail(target.user.displayAvatarURL())
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                await sendLogMessage(message.guild, 'uprank', embed, supabase);
            }
        },
        
        // ========== DERANK ==========
        derank: {
            aliases: ['demote', 'down'],
            permissions: 'ManageRoles',
            description: 'Demotes a user',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'derank', 'derank_no_user')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'derank', 'derank_self')] 
                    });
                }
                
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                if (hierarchy.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_hierarchy', 'no_hierarchy')] 
                    });
                }
                
                const teamRoleIds = hierarchy.map(h => h.role_id);
                const userTeamRoles = target.roles.cache.filter(r => teamRoleIds.includes(r.id));
                
                if (userTeamRoles.size === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'derank', 'no_team_member', [target.toString()])] 
                    });
                }
                
                let currentRoleIndex = -1;
                let currentRole = null;
                for (const role of userTeamRoles.values()) {
                    const index = hierarchy.findIndex(h => h.role_id === role.id);
                    if (index > currentRoleIndex) {
                        currentRoleIndex = index;
                        currentRole = hierarchy[index];
                    }
                }
                
                if (currentRoleIndex === 0) {
                    const oldRole = message.guild.roles.cache.get(currentRole.role_id);
                    await target.roles.remove(oldRole);
                    
                    await supabase.from('derank_history').insert({
                        guild_id: message.guild.id,
                        user_id: target.id,
                        user_tag: target.user.tag,
                        user_avatar: target.user.displayAvatarURL(),
                        moderator_id: message.author.id,
                        moderator_tag: message.author.tag,
                        old_role_id: currentRole.role_id,
                        old_role_name: currentRole.role_name,
                        new_role_id: null,
                        new_role_name: 'Removed from Team'
                    });
                    
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('⬇️ Removed from Team')
                        .setDescription(`${target} is no longer in the team!`)
                        .addFields({ name: 'Mod', value: `${message.author}`, inline: true })
                        .setThumbnail(target.user.displayAvatarURL())
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    await message.reply({ embeds: [embed] });
                    await sendLogMessage(message.guild, 'derank', embed, supabase);
                    return;
                }
                
                const newRoleData = hierarchy[currentRoleIndex - 1];
                const newRole = message.guild.roles.cache.get(newRoleData.role_id);
                
                if (!newRole) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'target_role_not_exist')] 
                    });
                }
                
                const oldRole = message.guild.roles.cache.get(currentRole.role_id);
                await target.roles.remove(oldRole);
                await target.roles.add(newRole);
                
                await saveTeamJoin(message.guild.id, target.id, newRole.id, newRole.name, message.author.id, message.author.tag, supabase);
                
                await supabase.from('derank_history').insert({
                    guild_id: message.guild.id,
                    user_id: target.id,
                    user_tag: target.user.tag,
                    user_avatar: target.user.displayAvatarURL(),
                    moderator_id: message.author.id,
                    moderator_tag: message.author.tag,
                    old_role_id: currentRole.role_id,
                    old_role_name: currentRole.role_name,
                    new_role_id: newRoleData.role_id,
                    new_role_name: newRoleData.role_name
                });
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('⬇️ Demotion')
                    .setDescription(`${target} has been demoted!`)
                    .addFields([
                        { name: 'From', value: oldRole.name, inline: true },
                        { name: 'To', value: newRole.name, inline: true },
                        { name: 'Mod', value: `${message.author}`, inline: true }
                    ])
                    .setThumbnail(target.user.displayAvatarURL())
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                await sendLogMessage(message.guild, 'derank', embed, supabase);
            }
        },
        
        // ========== UPRANKINFO ==========
        uprankinfo: {
            aliases: ['upi'],
            description: 'Shows promotion history',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                const { data } = await supabase
                    .from('uprank_history')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                if (!data?.length) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'uprank_history', 'uprank_empty', [target.toString()])] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setAuthor({ name: `${target.username} - Promotions`, iconURL: target.displayAvatarURL() })
                    .setThumbnail(target.displayAvatarURL())
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                data.forEach(u => {
                    const ts = Math.floor(new Date(u.created_at).getTime() / 1000);
                    embed.addFields({
                        name: `<t:${ts}:D>`,
                        value: `**From:** ${u.old_role_name || 'None'}\n**To:** ${u.new_role_name}\n**Mod:** ${u.moderator_tag}`,
                        inline: true
                    });
                });
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== DERANKINFO ==========
        derankinfo: {
            aliases: ['di'],
            description: 'Shows demotion history',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                const { data } = await supabase
                    .from('derank_history')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                if (!data?.length) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'derank_history', 'derank_empty', [target.toString()])] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setAuthor({ name: `${target.username} - Demotions`, iconURL: target.displayAvatarURL() })
                    .setThumbnail(target.displayAvatarURL())
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                data.forEach(u => {
                    const ts = Math.floor(new Date(u.created_at).getTime() / 1000);
                    embed.addFields({
                        name: `<t:${ts}:D>`,
                        value: `**From:** ${u.old_role_name}\n**To:** ${u.new_role_name || 'Removed'}\n**Mod:** ${u.moderator_tag}`,
                        inline: true
                    });
                });
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== TEAMHIERARCHY ==========
        teamhierarchy: {
            aliases: ['th', 'sethierarchy'],
            permissions: 'Administrator',
            description: 'Configures team hierarchy',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                if (action === 'set') {
                    const content = message.content;
                    const roleRegex = /<@&(\d+)>/g;
                    const roleIds = [];
                    let match;
                    
                    while ((match = roleRegex.exec(content)) !== null) {
                        roleIds.push(match[1]);
                    }
                    
                    if (roleIds.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_hierarchy', 'hierarchy_set_usage')] 
                        });
                    }
                    
                    await supabase.from('team_hierarchy').delete().eq('guild_id', message.guild.id);
                    
                    let position = 1;
                    const savedRoles = [];
                    
                    for (const roleId of roleIds) {
                        const role = message.guild.roles.cache.get(roleId);
                        if (role) {
                            const { error } = await supabase.from('team_hierarchy').insert({
                                guild_id: message.guild.id,
                                role_id: role.id,
                                role_name: role.name,
                                position: position
                            });
                            
                            if (!error) {
                                savedRoles.push(`${position}. ${role.name}`);
                                position++;
                            }
                        }
                    }
                    
                    if (savedRoles.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'hierarchy_saved', 'hierarchy_no_roles')] 
                        });
                    }
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'hierarchy_saved', 'hierarchy_saved', [savedRoles.length], { list: savedRoles.join('\n') })] 
                    });
                }
                
                if (action === 'list' || !action) {
                    const hierarchy = await loadHierarchy(message.guild.id, supabase);
                    
                    if (hierarchy.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'no_hierarchy', 'hierarchy_list_empty')] 
                        });
                    }
                    
                    const list = hierarchy.map(h => `${h.position}. <@&${h.role_id}> (${h.role_name})`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('📊 Team Hierarchy')
                        .setDescription(list)
                        .setFooter({ text: '1 = Lowest • Highest Number = Highest Role', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                if (action === 'reset') {
                    await supabase.from('team_hierarchy').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'hierarchy_reset', 'hierarchy_reset')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'hierarchy_set_usage')] 
                });
            }
        },
        
        // ========== TEAMLOG ==========
        teamlog: {
            aliases: ['tlog'],
            permissions: 'Administrator',
            description: 'Sets log channel',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const type = args[0]?.toLowerCase();
                const channel = message.mentions.channels.first();
                const lang = client.languages?.get(message.guild.id) || 'en';
                
                if (!type || !['uprank', 'derank', 'all'].includes(type) || !channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'teamlog_usage')] 
                    });
                }
                
                if (type === 'all') {
                    await supabase.from('team_log_channels').upsert({ guild_id: message.guild.id, log_type: 'uprank', channel_id: channel.id });
                    await supabase.from('team_log_channels').upsert({ guild_id: message.guild.id, log_type: 'derank', channel_id: channel.id });
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'log_channel_set', 'teamlog_all', [channel.toString()])] 
                    });
                }
                
                await supabase.from('team_log_channels').upsert({ guild_id: message.guild.id, log_type: type, channel_id: channel.id });
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'log_channel_set', 'teamlog_type', [type, channel.toString()])] 
                });
            }
        },
        
        // ========== TEAMLOGSTATUS ==========
        teamlogstatus: {
            aliases: ['tlogstatus'],
            permissions: 'ManageRoles',
            description: 'Shows log settings',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'en';
                const { data } = await supabase.from('team_log_channels').select('*').eq('guild_id', message.guild.id);
                
                const uprank = data?.find(d => d.log_type === 'uprank');
                const derank = data?.find(d => d.log_type === 'derank');
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('📋 Team Logs')
                    .addFields([
                        { name: '⬆️ Promotions', value: uprank ? `<#${uprank.channel_id}>` : '❌ Off', inline: true },
                        { name: '⬇️ Demotions', value: derank ? `<#${derank.channel_id}>` : '❌ Off', inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
