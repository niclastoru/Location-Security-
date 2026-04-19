const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        settings: 0x808080,
        staff: 0x0099FF
    };
    
    const titles = {
        de: {
            jail_settings: 'Jail Einstellungen',
            jail_role_set: 'Jail-Rolle gesetzt',
            jail_channel_set: 'Jail-Channel gesetzt',
            jail_msg_set: 'Jail-Nachricht gesetzt',
            jail_msg_reset: 'Zurückgesetzt',
            jail_msg: 'Jail-Nachricht',
            server_settings: 'Server Einstellungen',
            staff_role_added: 'Staff-Rolle hinzugefügt',
            staff_role_removed: 'Staff-Rolle entfernt',
            all_removed: 'Alle entfernt',
            staff_roles: 'Staff-Rollen',
            whitelist: 'Whitelist',
            staff_whitelist: 'Staff-Whitelist',
            user_added: 'User hinzugefügt',
            user_removed: 'User entfernt',
            staff_team: 'Staff-Team',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info',
            invalid_usage: 'Falsche Nutzung'
        },
        en: {
            jail_settings: 'Jail Settings',
            jail_role_set: 'Jail Role Set',
            jail_channel_set: 'Jail Channel Set',
            jail_msg_set: 'Jail Message Set',
            jail_msg_reset: 'Reset',
            jail_msg: 'Jail Message',
            server_settings: 'Server Settings',
            staff_role_added: 'Staff Role Added',
            staff_role_removed: 'Staff Role Removed',
            all_removed: 'All Removed',
            staff_roles: 'Staff Roles',
            whitelist: 'Whitelist',
            staff_whitelist: 'Staff Whitelist',
            user_added: 'User Added',
            user_removed: 'User Removed',
            staff_team: 'Staff Team',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage'
        }
    };
    
    const descriptions = {
        de: {
            jail_role_usage: '!jail-settings role @Rolle / ID',
            jail_channel_usage: '!jail-settings channel #channel / ID',
            jail_role_set: (role) => `${role} ist jetzt die Jail-Rolle.`,
            jail_channel_set: (channel) => `${channel} ist jetzt der Jail-Log-Channel.`,
            jail_role_label: 'Jail-Rolle',
            log_channel_label: 'Log-Channel',
            jail_footer: '!jail-settings role @Rolle | !jail-settings channel #channel',
            not_set: '❌ Nicht gesetzt',
            jail_msg_set: (msg) => `Nachricht: ${msg}`,
            jail_msg_reset: (msg) => `Standard-Nachricht: ${msg}`,
            jail_msg_current: (msg) => `Aktuelle Nachricht:\n**${msg}**`,
            placeholders: 'Platzhalter',
            placeholder_desc: '{user} - User-Name\n{server} - Server-Name\n{reason} - Grund',
            jail_msg_footer: '!settings-jailmsg set <Nachricht> | !settings-jailmsg reset',
            settings_footer: '!help settings für alle Settings-Befehle',
            staff_role_added: (role) => `${role} ist jetzt eine Staff-Rolle.`,
            staff_role_removed: (role) => `${role} ist keine Staff-Rolle mehr.`,
            all_staff_removed: 'Alle Staff-Rollen wurden gelöscht.',
            staff_usage: '!settingsstaff add @Rolle\n!settingsstaff remove @Rolle\n!settingsstaff clear',
            no_staff_roles: 'Keine Staff-Rollen konfiguriert.',
            roles_count: (count) => `${count} Rollen`,
            no_whitelist: 'Keine User auf der Staff-Whitelist.',
            user_added: (user) => `${user} ist jetzt auf der Staff-Whitelist.`,
            user_removed: (user) => `${user} wurde von der Whitelist entfernt.`,
            whitelist_usage: '!settingsstaffwhitelist add @User\n!settingsstaffwhitelist remove @User\n!settingsstaffwhitelist list',
            users_count: (count) => `${count} User`,
            no_staff_members: 'Keine Staff-Mitglieder gefunden.',
            total_staff: (count) => `Gesamt: ${count} Staff-Mitglieder`,
            whitelist_role: 'Whitelist',
            jail_role: '🔒 Jail-Rolle',
            jail_channel: '📋 Jail-Channel',
            staff_roles_label: '👮 Staff-Rollen',
            staff_whitelist_label: '✅ Staff-Whitelist'
        },
        en: {
            jail_role_usage: '!jail-settings role @Role / ID',
            jail_channel_usage: '!jail-settings channel #channel / ID',
            jail_role_set: (role) => `${role} is now the jail role.`,
            jail_channel_set: (channel) => `${channel} is now the jail log channel.`,
            jail_role_label: 'Jail Role',
            log_channel_label: 'Log Channel',
            jail_footer: '!jail-settings role @Role | !jail-settings channel #channel',
            not_set: '❌ Not set',
            jail_msg_set: (msg) => `Message: ${msg}`,
            jail_msg_reset: (msg) => `Default message: ${msg}`,
            jail_msg_current: (msg) => `Current message:\n**${msg}**`,
            placeholders: 'Placeholders',
            placeholder_desc: '{user} - Username\n{server} - Server name\n{reason} - Reason',
            jail_msg_footer: '!settings-jailmsg set <Message> | !settings-jailmsg reset',
            settings_footer: '!help settings for all settings commands',
            staff_role_added: (role) => `${role} is now a staff role.`,
            staff_role_removed: (role) => `${role} is no longer a staff role.`,
            all_staff_removed: 'All staff roles have been removed.',
            staff_usage: '!settingsstaff add @Role\n!settingsstaff remove @Role\n!settingsstaff clear',
            no_staff_roles: 'No staff roles configured.',
            roles_count: (count) => `${count} roles`,
            no_whitelist: 'No users on the staff whitelist.',
            user_added: (user) => `${user} is now on the staff whitelist.`,
            user_removed: (user) => `${user} has been removed from the whitelist.`,
            whitelist_usage: '!settingsstaffwhitelist add @User\n!settingsstaffwhitelist remove @User\n!settingsstaffwhitelist list',
            users_count: (count) => `${count} users`,
            no_staff_members: 'No staff members found.',
            total_staff: (count) => `Total: ${count} staff members`,
            whitelist_role: 'Whitelist',
            jail_role: '🔒 Jail Role',
            jail_channel: '📋 Jail Channel',
            staff_roles_label: '👮 Staff Roles',
            staff_whitelist_label: '✅ Staff Whitelist'
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
        .setColor(type === 'settings' ? 0x808080 : type === 'staff' ? 0x0099FF : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '⚙️';
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
    category: 'Settings',
    subCommands: {
        
        // ========== JAIL-SETTINGS ==========
        'jail-settings': {
            aliases: ['jailconfig'],
            permissions: 'Administrator',
            description: 'Konfiguriert das Jail-System / Configures the jail system',
            category: 'Settings',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const value = args[1];
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'role') {
                    const role = message.mentions.roles.first() || message.guild.roles.cache.get(value);
                    if (!role) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'jail_settings', 'jail_role_usage')] 
                        });
                    }
                    
                    await supabase.from('jail_settings').upsert({
                        guild_id: message.guild.id,
                        jail_role: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'jail_role_set', 'jail_role_set', [role.toString()])] 
                    });
                }
                
                if (action === 'channel') {
                    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(value);
                    if (!channel) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'jail_settings', 'jail_channel_usage')] 
                        });
                    }
                    
                    await supabase.from('jail_settings').upsert({
                        guild_id: message.guild.id,
                        jail_channel: channel.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'jail_channel_set', 'jail_channel_set', [channel.toString()])] 
                    });
                }
                
                // Aktuelle Settings anzeigen
                const { data } = await supabase
                    .from('jail_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const jailRole = data?.jail_role ? `<@&${data.jail_role}>` : (lang === 'de' ? '❌ Nicht gesetzt' : '❌ Not set');
                const jailChannel = data?.jail_channel ? `<#${data.jail_channel}>` : (lang === 'de' ? '❌ Nicht gesetzt' : '❌ Not set');
                
                const embed = new EmbedBuilder()
                    .setColor(0x808080)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🔒 Jail Einstellungen' : '🔒 Jail Settings')
                    .addFields([
                        { name: lang === 'de' ? 'Jail-Rolle' : 'Jail Role', value: jailRole, inline: true },
                        { name: lang === 'de' ? 'Log-Channel' : 'Log Channel', value: jailChannel, inline: true }
                    ])
                    .setFooter({ text: lang === 'de' ? '!jail-settings role @Rolle | !jail-settings channel #channel' : '!jail-settings role @Role | !jail-settings channel #channel', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SETTINGS-JAILMSG ==========
        'settings-jailmsg': {
            aliases: ['jailmessage', 'jailmsg'],
            permissions: 'Administrator',
            description: 'Setzt die Jail-Nachricht / Sets the jail message',
            category: 'Settings',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const msg = args.slice(1).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === '12' && msg) {
                    await supabase.from('jail_settings').upsert({
                        guild_id: message.guild.id,
                        jail_message: msg
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'jail_msg_set', 'jail_msg_set', [msg])] 
                    });
                }
                
                if (action === 'reset' || action === 'default') {
                    const defaultMsg = lang === 'de' ? 'Du bist im Jail!' : 'You are in jail!';
                    await supabase.from('jail_settings').upsert({
                        guild_id: message.guild.id,
                        jail_message: defaultMsg
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'jail_msg_reset', 'jail_msg_reset', [defaultMsg])] 
                    });
                }
                
                const { data } = await supabase
                    .from('jail_settings')
                    .select('jail_message')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const currentMsg = data?.jail_message || (lang === 'de' ? 'Du bist im Jail!' : 'You are in jail!');
                
                const embed = new EmbedBuilder()
                    .setColor(0x808080)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '📝 Jail-Nachricht' : '📝 Jail Message')
                    .setDescription(lang === 'de' ? `Aktuelle Nachricht:\n**${currentMsg}**` : `Current message:\n**${currentMsg}**`)
                    .addFields([{
                        name: lang === 'de' ? 'Platzhalter' : 'Placeholders',
                        value: lang === 'de' ? '{user} - User-Name\n{server} - Server-Name\n{reason} - Grund' : '{user} - Username\n{server} - Server name\n{reason} - Reason'
                    }])
                    .setFooter({ text: lang === 'de' ? '!settings-jailmsg set <Nachricht> | !settings-jailmsg reset' : '!settings-jailmsg set <Message> | !settings-jailmsg reset', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SETTINGS ==========
        settings: {
            aliases: ['config', 'einstellungen'],
            permissions: 'Administrator',
            description: 'Zeigt alle Einstellungen / Shows all settings',
            category: 'Settings',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data: jail } = await supabase
                    .from('jail_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const { data: staffRoles } = await supabase
                    .from('staff_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id);
                
                const { data: staffWhitelist } = await supabase
                    .from('staff_whitelist')
                    .select('user_id')
                    .eq('guild_id', message.guild.id);
                
                const jailRole = jail?.jail_role ? `<@&${jail.jail_role}>` : (lang === 'de' ? '❌ Nicht gesetzt' : '❌ Not set');
                const jailChannel = jail?.jail_channel ? `<#${jail.jail_channel}>` : (lang === 'de' ? '❌ Nicht gesetzt' : '❌ Not set');
                const staffCount = staffRoles?.length || 0;
                const whitelistCount = staffWhitelist?.length || 0;
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '⚙️ Server Einstellungen' : '⚙️ Server Settings')
                    .addFields([
                        { name: lang === 'de' ? '🔒 Jail-Rolle' : '🔒 Jail Role', value: jailRole, inline: true },
                        { name: lang === 'de' ? '📋 Jail-Channel' : '📋 Jail Channel', value: jailChannel, inline: true },
                        { name: lang === 'de' ? '👮 Staff-Rollen' : '👮 Staff Roles', value: `${staffCount} ${lang === 'de' ? 'Rollen' : 'roles'}`, inline: true },
                        { name: lang === 'de' ? '✅ Staff-Whitelist' : '✅ Staff Whitelist', value: `${whitelistCount} ${lang === 'de' ? 'User' : 'users'}`, inline: true }
                    ])
                    .setFooter({ text: lang === 'de' ? '!help settings für alle Settings-Befehle' : '!help settings for all settings commands', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SETTINGSSTAFF ==========
        settingsstaff: {
            aliases: ['staffconfig', 'sstaff'],
            permissions: 'Administrator',
            description: 'Staff-Rollen verwalten / Manage staff roles',
            category: 'Settings',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'add' && role) {
                    await supabase.from('staff_roles').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id,
                        role_name: role.name
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'staff_role_added', 'staff_role_added', [role.toString()])] 
                    });
                }
                
                if (action === 'remove' && role) {
                    await supabase.from('staff_roles')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('role_id', role.id);
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'staff_role_removed', 'staff_role_removed', [role.toString()])] 
                    });
                }
                
                if (action === 'clear') {
                    await supabase.from('staff_roles')
                        .delete()
                        .eq('guild_id', message.guild.id);
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'all_removed', 'all_staff_removed')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'staff_usage')] 
                });
            }
        },
        
        // ========== SETTINGSSTAFFLIST ==========
        settingsstafflist: {
            aliases: ['stafflist', 'slist'],
            permissions: 'Administrator',
            description: 'Listet alle Staff-Rollen / Lists all staff roles',
            category: 'Settings',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data } = await supabase
                    .from('staff_roles')
                    .select('role_id, role_name')
                    .eq('guild_id', message.guild.id);
                
                if (!data || data.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'staff_roles', 'no_staff_roles')] 
                    });
                }
                
                const list = data.map(r => `• <@&${r.role_id}> (${r.role_name})`).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '👮 Staff-Rollen' : '👮 Staff Roles')
                    .setDescription(list)
                    .setFooter({ text: `${data.length} ${lang === 'de' ? 'Rollen' : 'roles'}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SETTINGSSTAFFWHITELIST ==========
        settingsstaffwhitelist: {
            aliases: ['staffwhitelist', 'swl'],
            permissions: 'Administrator',
            description: 'Staff-Whitelist verwalten / Manage staff whitelist',
            category: 'Settings',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const target = message.mentions.users.first() || await message.client.users.fetch(args[1]).catch(() => null);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'add' && target) {
                    await supabase.from('staff_whitelist').upsert({
                        guild_id: message.guild.id,
                        user_id: target.id,
                        username: target.username
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'user_added', 'user_added', [target.toString()])] 
                    });
                }
                
                if (action === 'remove' && target) {
                    await supabase.from('staff_whitelist')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('user_id', target.id);
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'user_removed', 'user_removed', [target.toString()])] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('staff_whitelist')
                        .select('user_id, username')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'whitelist', 'no_whitelist')] 
                        });
                    }
                    
                    const list = data.map(u => `• <@${u.user_id}> (${u.username})`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '✅ Staff-Whitelist' : '✅ Staff Whitelist')
                        .setDescription(list)
                        .setFooter({ text: `${data.length} ${lang === 'de' ? 'User' : 'users'}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'whitelist_usage')] 
                });
            }
        },
        
        // ========== STAFF ==========
        staff: {
            aliases: ['staffinfo', 'team'],
            description: 'Zeigt alle Staff-Mitglieder / Shows all staff members',
            category: 'Settings',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data: staffRoles } = await supabase
                    .from('staff_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id);
                
                const { data: whitelist } = await supabase
                    .from('staff_whitelist')
                    .select('user_id')
                    .eq('guild_id', message.guild.id);
                
                const staffMembers = new Map();
                
                const online = '🟢';
                const idle = '🟡';
                const dnd = '🔴';
                const offline = '⚫';
                
                if (staffRoles && staffRoles.length > 0) {
                    for (const sr of staffRoles) {
                        const role = message.guild.roles.cache.get(sr.role_id);
                        if (role) {
                            for (const [id, member] of role.members) {
                                if (!member.user.bot) {
                                    let status = offline;
                                    if (member.presence) {
                                        if (member.presence.status === 'online') status = online;
                                        else if (member.presence.status === 'idle') status = idle;
                                        else if (member.presence.status === 'dnd') status = dnd;
                                    }
                                    staffMembers.set(id, { member, status, role: role.name });
                                }
                            }
                        }
                    }
                }
                
                if (whitelist && whitelist.length > 0) {
                    for (const wl of whitelist) {
                        if (!staffMembers.has(wl.user_id)) {
                            const member = await message.guild.members.fetch(wl.user_id).catch(() => null);
                            if (member && !member.user.bot) {
                                let status = offline;
                                if (member.presence) {
                                    if (member.presence.status === 'online') status = online;
                                    else if (member.presence.status === 'idle') status = idle;
                                    else if (member.presence.status === 'dnd') status = dnd;
                                }
                                staffMembers.set(wl.user_id, { member, status, role: lang === 'de' ? 'Whitelist' : 'Whitelist' });
                            }
                        }
                    }
                }
                
                if (staffMembers.size === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'staff_team', 'no_staff_members')] 
                    });
                }
                
                const byRole = {};
                for (const [id, data] of staffMembers) {
                    if (!byRole[data.role]) byRole[data.role] = [];
                    byRole[data.role].push(`${data.status} ${data.member.user.tag}`);
                }
                
                const fields = [];
                for (const [role, members] of Object.entries(byRole)) {
                    fields.push({
                        name: role,
                        value: members.join('\n').slice(0, 1024),
                        inline: false
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '👥 Staff-Team' : '👥 Staff Team')
                    .addFields(fields)
                    .setFooter({ text: lang === 'de' ? `Gesamt: ${staffMembers.size} Staff-Mitglieder` : `Total: ${staffMembers.size} staff members`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
