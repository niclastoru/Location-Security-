const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        booster: 0xFF73FA
    };
    
    const titles = {
        de: {
            booster_system: 'Booster Rollen System',
            deactivated: 'Deaktiviert',
            no_role: 'Keine Rolle',
            base_role_set: 'Base-Rolle gesetzt',
            color_changed: 'Farbe geändert',
            invalid_color: 'Ungültige Farbe',
            no_booster: 'Kein Booster',
            role_created: 'Rolle erstellt',
            already_created: 'Bereits erstellt',
            icon_set: 'Icon gesetzt',
            icon_error: 'Fehler',
            no_icon: 'Kein Icon',
            role_deleted: 'Rolle gelöscht',
            role_deleted_admin: 'Rolle gelöscht',
            renamed: 'Umbenannt',
            share: 'Rolle geteilt',
            already_shared: 'Bereits geteilt',
            unshare: 'Share entfernt',
            shares: 'Geteilte Booster-Rolle',
            no_shares: 'Keine Shares',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info'
        },
        en: {
            booster_system: 'Booster Role System',
            deactivated: 'Deactivated',
            no_role: 'No Role',
            base_role_set: 'Base Role Set',
            color_changed: 'Color Changed',
            invalid_color: 'Invalid Color',
            no_booster: 'Not a Booster',
            role_created: 'Role Created',
            already_created: 'Already Created',
            icon_set: 'Icon Set',
            icon_error: 'Error',
            no_icon: 'No Icon',
            role_deleted: 'Role Deleted',
            role_deleted_admin: 'Role Deleted',
            renamed: 'Renamed',
            share: 'Role Shared',
            already_shared: 'Already Shared',
            unshare: 'Share Removed',
            shares: 'Shared Booster Role',
            no_shares: 'No Shares',
            error: 'Error',
            success: 'Success',
            info: 'Info'
        }
    };
    
    const descriptions = {
        de: {
            booster_disabled: 'Booster-Rollen wurden deaktiviert.',
            no_role_mention: '!br-base @Rolle',
            base_role_set: (role) => `${role} ist jetzt die Booster-Base-Rolle.`,
            no_booster: 'Nur Server-Booster können diesen Befehl nutzen!',
            invalid_color: '!br-color <Hex>\nBeispiel: !br-color FF73FA',
            color_changed: (color) => `Deine Booster-Rolle hat jetzt die Farbe #${color}`,
            already_created: 'Du hast bereits eine Booster-Rolle!',
            role_created: (role) => `${role} wurde erstellt und dir zugewiesen!`,
            no_role_create: 'Erstelle erst eine Rolle mit `!br-create`!',
            no_icon: '!br-icon <Emoji> oder Bild anhängen',
            icon_error: 'Icon konnte nicht gesetzt werden! (Server benötigt Boost Level 2)',
            icon_set: 'Deine Booster-Rolle hat jetzt ein Icon!',
            role_deleted: 'Deine Booster-Rolle wurde gelöscht.',
            role_deleted_admin: (user) => `Booster-Rolle von ${user} wurde gelöscht.`,
            no_role_user: 'Du hast keine Booster-Rolle!',
            no_role_target: (user) => `${user} hat keine Booster-Rolle!`,
            no_name: '!br-rename <Neuer Name>',
            renamed: (name) => `Deine Rolle heißt jetzt **${name}**`,
            no_user: '!br-share @User',
            self_share: 'Du kannst die Rolle nicht mit dir selbst teilen!',
            already_shared: (user) => `Du teilst die Rolle bereits mit ${user}!`,
            shared: (user) => `${user} hat jetzt deine Booster-Rolle!`,
            no_shares: 'Du teilst deine Rolle mit niemandem.',
            unshared: (user) => `${user} hat deine Rolle nicht mehr.`,
            booster_status: (status, baseRole, count) => `Status: ${status}\nBase-Rolle: ${baseRole}\nErstellte Rollen: ${count}`,
            help_footer: '!help booster für alle Befehle'
        },
        en: {
            booster_disabled: 'Booster roles have been disabled.',
            no_role_mention: '!br-base @Role',
            base_role_set: (role) => `${role} is now the booster base role.`,
            no_booster: 'Only server boosters can use this command!',
            invalid_color: '!br-color <Hex>\nExample: !br-color FF73FA',
            color_changed: (color) => `Your booster role now has the color #${color}`,
            already_created: 'You already have a booster role!',
            role_created: (role) => `${role} has been created and assigned to you!`,
            no_role_create: 'Create a role first with `!br-create`!',
            no_icon: '!br-icon <Emoji> or attach image',
            icon_error: 'Could not set icon! (Server needs Boost Level 2)',
            icon_set: 'Your booster role now has an icon!',
            role_deleted: 'Your booster role has been deleted.',
            role_deleted_admin: (user) => `${user}'s booster role has been deleted.`,
            no_role_user: 'You don\'t have a booster role!',
            no_role_target: (user) => `${user} doesn't have a booster role!`,
            no_name: '!br-rename <New Name>',
            renamed: (name) => `Your role is now called **${name}**`,
            no_user: '!br-share @User',
            self_share: 'You cannot share the role with yourself!',
            already_shared: (user) => `You are already sharing the role with ${user}!`,
            shared: (user) => `${user} now has your booster role!`,
            no_shares: 'You are not sharing your role with anyone.',
            unshared: (user) => `${user} no longer has your role.`,
            booster_status: (status, baseRole, count) => `Status: ${status}\nBase Role: ${baseRole}\nCreated Roles: ${count}`,
            help_footer: '!help booster for all commands'
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
        .setColor(type === 'booster' ? 0xFF73FA : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
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

module.exports = {
    category: 'Booster',
    subCommands: {
        
        // ========== BR (Übersicht) ==========
        br: {
            aliases: ['boosterrole'],
            description: 'Booster-Role Übersicht / Booster role overview',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data: settings } = await supabase
                    .from('booster_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const { data: roles } = await supabase
                    .from('booster_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id);
                
                const status = settings?.enabled ? (lang === 'de' ? '🟢 Aktiviert' : '🟢 Enabled') : (lang === 'de' ? '🔴 Deaktiviert' : '🔴 Disabled');
                const baseRole = settings?.base_role_id ? `<@&${settings.base_role_id}>` : (lang === 'de' ? '❌ Nicht gesetzt' : '❌ Not set');
                const roleCount = roles?.length || 0;
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF73FA)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🚀 Booster Rollen System' : '🚀 Booster Role System')
                    .addFields([
                        { name: lang === 'de' ? 'Status' : 'Status', value: status, inline: true },
                        { name: lang === 'de' ? 'Base-Rolle' : 'Base Role', value: baseRole, inline: true },
                        { name: lang === 'de' ? 'Erstellte Rollen' : 'Created Roles', value: `${roleCount}`, inline: true }
                    ])
                    .setFooter({ text: lang === 'de' ? '!help booster für alle Befehle' : '!help booster for all commands', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== _BOOSTERS_DISABLED ==========
        _boosters_disabled: {
            aliases: ['br-disable', 'br-off'],
            permissions: 'Administrator',
            description: 'Deaktiviert Booster-Rollen / Disables booster roles',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                await supabase.from('booster_settings').upsert({
                    guild_id: message.guild.id,
                    enabled: false
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'deactivated', 'booster_disabled')] 
                });
            }
        },
        
        // ========== BR-BASE ==========
        'br-base': {
            aliases: ['br-setbase'],
            permissions: 'Administrator',
            description: 'Setzt Base-Rolle für Booster / Sets base role for boosters',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const role = message.mentions.roles.first();
                
                if (!role) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_role_mention')] 
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'base_role_set', 'base_role_set', [role.toString()])] 
                });
            }
        },
        
        // ========== BR-COLOR ==========
        'br-color': {
            aliases: ['br-setcolor'],
            description: 'Ändert Farbe deiner Booster-Rolle / Changes your booster role color',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!message.member.premiumSince && !message.member.roles.cache.some(r => r.name.includes('Booster'))) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_booster', 'no_booster')] 
                    });
                }
                
                const color = args[0]?.replace('#', '').toUpperCase();
                if (!color || !/^[0-9A-F]{6}$/i.test(color)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_color', 'invalid_color')] 
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'color_changed', 'color_changed', [color])] 
                });
            }
        },
        
        // ========== BR-CREATE ==========
        'br-create': {
            aliases: ['br-make'],
            description: 'Erstellt deine Booster-Rolle / Creates your booster role',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!message.member.premiumSince && !message.member.roles.cache.some(r => r.tags?.premiumSubscriberRole)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_booster', 'no_booster')] 
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'already_created', 'already_created')] 
                    });
                }
                
                const roleName = args.join(' ') || (lang === 'de' ? `${message.author.username}'s Rolle` : `${message.author.username}'s Role`);
                
                const role = await message.guild.roles.create({
                    name: roleName,
                    color: 0xFF73FA,
                    position: message.guild.members.me.roles.highest.position - 1,
                    reason: `Booster-Rolle für ${message.author.tag}`
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'role_created', 'role_created', [role.toString()])] 
                });
            }
        },
        
        // ========== BR-ICON ==========
        'br-icon': {
            aliases: ['br-seticon'],
            description: 'Setzt Icon für deine Booster-Rolle / Sets icon for your booster role',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_role_create')] 
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_icon', 'no_icon')] 
                    });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) {
                    try {
                        await role.setIcon(icon);
                    } catch {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'icon_error', 'icon_error')] 
                        });
                    }
                }
                
                await supabase.from('booster_roles').update({
                    role_icon: icon
                }).eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'icon_set', 'icon_set')] 
                });
            }
        },
        
        // ========== BR-LEAVE ==========
        'br-leave': {
            aliases: ['br-delete', 'br-remove-self'],
            description: 'Löscht deine Booster-Rolle / Deletes your booster role',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_role_user')] 
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'role_deleted', 'role_deleted')] 
                });
            }
        },
        
        // ========== BR-REMOVE (Admin) ==========
        'br-remove': {
            aliases: ['br-deleteadmin'],
            permissions: 'ManageRoles',
            description: 'Löscht Booster-Rolle eines Users / Deletes a user\'s booster role',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_user')] 
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_role_target', [target.toString()])] 
                    });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) await role.delete().catch(() => {});
                
                await supabase.from('booster_roles')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'role_deleted_admin', 'role_deleted_admin', [target.toString()])] 
                });
            }
        },
        
        // ========== BR-RENAME ==========
        'br-rename': {
            aliases: ['br-name'],
            description: 'Benennt deine Booster-Rolle um / Renames your booster role',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_role_user')] 
                    });
                }
                
                const newName = args.join(' ');
                if (!newName) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_name')] 
                    });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) await role.setName(newName).catch(() => {});
                
                await supabase.from('booster_roles').update({
                    role_name: newName
                }).eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'renamed', 'renamed', [newName])] 
                });
            }
        },
        
        // ========== BR-SHARE ==========
        'br-share': {
            aliases: ['br-give'],
            description: 'Teilt deine Booster-Rolle / Shares your booster role',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_role_user')] 
                    });
                }
                
                const target = message.mentions.users.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_user')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'share', 'self_share')] 
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'already_shared', 'already_shared', [target.toString()])] 
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'share', 'shared', [target.toString()])] 
                });
            }
        },
        
        // ========== BR-SHARES ==========
        'br-shares': {
            aliases: ['br-shared'],
            description: 'Zeigt mit wem du deine Rolle teilst / Shows who you share your role with',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data: shares } = await supabase
                    .from('booster_shares')
                    .select('shared_with')
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id);
                
                if (!shares || shares.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'no_shares', 'no_shares')] 
                    });
                }
                
                const sharedList = shares.map(s => `<@${s.shared_with}>`).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF73FA)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🤝 Geteilte Booster-Rolle' : '🤝 Shared Booster Role')
                    .setDescription(sharedList)
                    .setFooter({ text: `${shares.length} ${lang === 'de' ? 'User' : 'Users'}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== BR-UNSHARE ==========
        'br-unshare': {
            aliases: ['br-remove-share'],
            description: 'Entfernt geteilte Rolle / Removes shared role',
            category: 'Booster',
            async execute(message, args, { client, supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_role_user')] 
                    });
                }
                
                const target = message.mentions.users.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_role', 'no_user')] 
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'unshare', 'unshared', [target.toString()])] 
                });
            }
        }
    }
};

// ========== BOOSTER EVENT HANDLER ==========
async function handleBoosterUpdate(oldMember, newMember, supabase) {
    // Booster hinzugefügt
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
    
    // Booster entfernt
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
