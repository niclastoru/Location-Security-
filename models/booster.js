const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Create embed (ENGLISH ONLY)
function createEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        booster: 0xFF73FA
    };
    
    const embed = new EmbedBuilder()
        .setColor(type === 'booster' ? 0xFF73FA : (colors[type] || 0x5865F2))
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
    category: 'Booster',
    subCommands: {
        
        // ========== BR (Overview) ==========
        br: {
            aliases: ['boosterrole'],
            description: 'Booster role overview',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: settings } = await supabase
                    .from('booster_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const { data: roles } = await supabase
                    .from('booster_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id);
                
                const status = settings?.enabled ? '🟢 Enabled' : '🔴 Disabled';
                const baseRole = settings?.base_role_id ? `<@&${settings.base_role_id}>` : '❌ Not set';
                const roleCount = roles?.length || 0;
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF73FA)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🚀 Booster Role System')
                    .addFields([
                        { name: 'Status', value: status, inline: true },
                        { name: 'Base Role', value: baseRole, inline: true },
                        { name: 'Created Roles', value: `${roleCount}`, inline: true }
                    ])
                    .setFooter({ text: '!help booster for all commands', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== BOOSTERS DISABLED ==========
        _boosters_disabled: {
            aliases: ['br-disable', 'br-off'],
            permissions: 'Administrator',
            description: 'Disable booster roles',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                await supabase.from('booster_settings').upsert({
                    guild_id: message.guild.id,
                    enabled: false
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Deactivated', 'Booster roles have been disabled.')] 
                });
            }
        },
        
        // ========== BR-BASE ==========
        'br-base': {
            aliases: ['br-setbase'],
            permissions: 'Administrator',
            description: 'Set base role for boosters',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const role = message.mentions.roles.first();
                
                if (!role) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Role', '!br-base @Role')] 
                    });
                }
                
                await supabase.from('booster_settings').upsert({
                    guild_id: message.guild.id,
                    base_role_id: role.id,
                    enabled: true
                });
                
                const { data: boosterRoles } = await supabase
                    .from('booster_roles')
                    .select('user_id')
                    .eq('guild_id', message.guild.id);
                
                if (boosterRoles) {
                    for (const br of boosterRoles) {
                        const member = await message.guild.members.fetch(br.user_id).catch(() => null);
                        if (member) await member.roles.add(role).catch(() => {});
                    }
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Base Role Set', `${role} is now the booster base role.`)] 
                });
            }
        },
        
        // ========== BR-COLOR ==========
        'br-color': {
            aliases: ['br-setcolor'],
            description: 'Change your booster role color',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                if (!message.member.premiumSince && !message.member.roles.cache.some(r => r.name.includes('Booster'))) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not a Booster', 'Only server boosters can use this command!')] 
                    });
                }
                
                const color = args[0]?.replace('#', '').toUpperCase();
                if (!color || !/^[0-9A-F]{6}$/i.test(color)) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Color', '!br-color <Hex>\nExample: !br-color FF73FA')] 
                    });
                }
                
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (existing) {
                    const role = message.guild.roles.cache.get(existing.role_id);
                    if (role) {
                        await role.setColor(`#${color}`).catch(() => {});
                    }
                    
                    await supabase.from('booster_roles').update({
                        role_color: `#${color}`
                    }).eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Color Changed', `Your booster role now has the color #${color}`)] 
                });
            }
        },
        
        // ========== BR-CREATE ==========
        'br-create': {
            aliases: ['br-make'],
            description: 'Create your booster role',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                if (!message.member.premiumSince && !message.member.roles.cache.some(r => r.tags?.premiumSubscriberRole)) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not a Booster', 'Only server boosters can use this command!')] 
                    });
                }
                
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (existing) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Already Created', 'You already have a booster role!')] 
                    });
                }
                
                const roleName = args.join(' ') || `${message.author.username}'s Role`;
                
                const role = await message.guild.roles.create({
                    name: roleName,
                    color: 0xFF73FA,
                    position: message.guild.members.me.roles.highest.position - 1,
                    reason: `Booster role for ${message.author.tag}`
                });
                
                await message.member.roles.add(role);
                
                const { data: settings } = await supabase
                    .from('booster_settings')
                    .select('base_role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (settings?.base_role_id) {
                    const baseRole = message.guild.roles.cache.get(settings.base_role_id);
                    if (baseRole) await message.member.roles.add(baseRole).catch(() => {});
                }
                
                await supabase.from('booster_roles').insert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    role_id: role.id,
                    role_name: roleName,
                    role_color: '#FF73FA'
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Role Created', `${role} has been created and assigned to you!`)] 
                });
            }
        },
        
        // ========== BR-ICON ==========
        'br-icon': {
            aliases: ['br-seticon'],
            description: 'Set icon for your booster role',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Role', 'Create a role first with `!br-create`!')] 
                    });
                }
                
                const emoji = args[0];
                const attachment = message.attachments.first();
                
                let icon;
                if (emoji) {
                    const emojiMatch = emoji.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
                    if (emojiMatch) {
                        icon = `https://cdn.discordapp.com/emojis/${emojiMatch[3]}.${emojiMatch[1] ? 'gif' : 'png'}`;
                    }
                } else if (attachment) {
                    icon = attachment.url;
                }
                
                if (!icon) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Icon', '!br-icon <Emoji> or attach image')] 
                    });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) {
                    try {
                        await role.setIcon(icon);
                    } catch {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Error', 'Could not set icon! (Server needs Boost Level 2)')] 
                        });
                    }
                }
                
                await supabase.from('booster_roles').update({
                    role_icon: icon
                }).eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Icon Set', 'Your booster role now has an icon!')] 
                });
            }
        },
        
        // ========== BR-LEAVE ==========
        'br-leave': {
            aliases: ['br-delete', 'br-remove-self'],
            description: 'Delete your booster role',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Role', 'You don\'t have a booster role!')] 
                    });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) await role.delete().catch(() => {});
                
                await supabase.from('booster_roles')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id);
                
                await supabase.from('booster_shares')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Role Deleted', 'Your booster role has been deleted.')] 
                });
            }
        },
        
        // ========== BR-REMOVE (Admin) ==========
        'br-remove': {
            aliases: ['br-deleteadmin'],
            permissions: 'ManageRoles',
            description: 'Delete a user\'s booster role',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!br-remove @User')] 
                    });
                }
                
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Role', `${target} doesn't have a booster role!`)] 
                    });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) await role.delete().catch(() => {});
                
                await supabase.from('booster_roles')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Role Deleted', `${target}'s booster role has been deleted.`)] 
                });
            }
        },
        
        // ========== BR-RENAME ==========
        'br-rename': {
            aliases: ['br-name'],
            description: 'Rename your booster role',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Role', 'You don\'t have a booster role!')] 
                    });
                }
                
                const newName = args.join(' ');
                if (!newName) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Name', '!br-rename <New Name>')] 
                    });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) await role.setName(newName).catch(() => {});
                
                await supabase.from('booster_roles').update({
                    role_name: newName
                }).eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Renamed', `Your role is now called **${newName}**`)] 
                });
            }
        },
        
        // ========== BR-SHARE ==========
        'br-share': {
            aliases: ['br-give'],
            description: 'Share your booster role',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Role', 'You don\'t have a booster role!')] 
                    });
                }
                
                const target = message.mentions.users.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!br-share @User')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot share the role with yourself!')] 
                    });
                }
                
                const { data: shared } = await supabase
                    .from('booster_shares')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id)
                    .eq('shared_with', target.id)
                    .single();
                
                if (shared) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Already Shared', `You are already sharing the role with ${target}!`)] 
                    });
                }
                
                await supabase.from('booster_shares').insert({
                    guild_id: message.guild.id,
                    owner_id: message.author.id,
                    shared_with: target.id
                });
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) {
                    const member = await message.guild.members.fetch(target.id).catch(() => null);
                    if (member) await member.roles.add(role).catch(() => {});
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Role Shared', `${target} now has your booster role!`)] 
                });
            }
        },
        
        // ========== BR-SHARES ==========
        'br-shares': {
            aliases: ['br-shared'],
            description: 'Show who you share your role with',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: shares } = await supabase
                    .from('booster_shares')
                    .select('shared_with')
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id);
                
                if (!shares || shares.length === 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'No Shares', 'You are not sharing your role with anyone.')] 
                    });
                }
                
                const sharedList = shares.map(s => `<@${s.shared_with}>`).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF73FA)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🤝 Shared Booster Role')
                    .setDescription(sharedList)
                    .setFooter({ text: `${shares.length} Users`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== BR-UNSHARE ==========
        'br-unshare': {
            aliases: ['br-remove-share'],
            description: 'Remove shared role',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Role', 'You don\'t have a booster role!')] 
                    });
                }
                
                const target = message.mentions.users.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!br-unshare @User')] 
                    });
                }
                
                await supabase.from('booster_shares')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id)
                    .eq('shared_with', target.id);
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) {
                    const member = await message.guild.members.fetch(target.id).catch(() => null);
                    if (member) await member.roles.remove(role).catch(() => {});
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Share Removed', `${target} no longer has your role.`)] 
                });
            }
        }
    }
};

// ========== BOOSTER EVENT HANDLER ==========
async function handleBoosterUpdate(oldMember, newMember, supabase) {
    // Booster added
    if (!oldMember.premiumSince && newMember.premiumSince) {
        const { data: settings } = await supabase
            .from('booster_settings')
            .select('*')
            .eq('guild_id', newMember.guild.id)
            .single();
        
        if (settings?.enabled) {
            if (settings.base_role_id) {
                const baseRole = newMember.guild.roles.cache.get(settings.base_role_id);
                if (baseRole) await newMember.roles.add(baseRole).catch(() => {});
            }
        }
    }
    
    // Booster removed
    if (oldMember.premiumSince && !newMember.premiumSince) {
        const { data: boosterRole } = await supabase
            .from('booster_roles')
            .select('role_id')
            .eq('guild_id', newMember.guild.id)
            .eq('user_id', newMember.id)
            .single();
        
        if (boosterRole) {
            const role = newMember.guild.roles.cache.get(boosterRole.role_id);
            if (role) {
                for (const [id, member] of role.members) {
                    await member.roles.remove(role).catch(() => {});
                }
                await role.delete().catch(() => {});
            }
            
            await supabase.from('booster_roles')
                .delete()
                .eq('guild_id', newMember.guild.id)
                .eq('user_id', newMember.id);
            
            await supabase.from('booster_shares')
                .delete()
                .eq('guild_id', newMember.guild.id)
                .eq('owner_id', newMember.id);
        }
        
        const { data: settings } = await supabase
            .from('booster_settings')
            .select('base_role_id')
            .eq('guild_id', newMember.guild.id)
            .single();
        
        if (settings?.base_role_id) {
            await newMember.roles.remove(settings.base_role_id).catch(() => {});
        }
    }
}

module.exports.handleBoosterUpdate = handleBoosterUpdate;
