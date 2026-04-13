module.exports = {
    category: 'Settings',
    subCommands: {
        
        // ========== JAIL-SETTINGS ==========
        'jail-settings': {
            aliases: ['jailconfig'],
            permissions: 'Administrator',
            description: 'Konfiguriert das Jail-System',
            category: 'Settings',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const value = args[1];
                
                if (action === 'role') {
                    const role = message.mentions.roles.first() || message.guild.roles.cache.get(value);
                    if (!role) return message.reply({ embeds: [global.embed.error('Keine Rolle', '!jail-settings role @Rolle / ID')] });
                    
                    await supabase.from('jail_settings').upsert({
                        guild_id: message.guild.id,
                        jail_role: role.id
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Jail-Rolle gesetzt', `${role} ist jetzt die Jail-Rolle.`)] });
                }
                
                if (action === 'channel') {
                    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(value);
                    if (!channel) return message.reply({ embeds: [global.embed.error('Kein Channel', '!jail-settings channel #channel / ID')] });
                    
                    await supabase.from('jail_settings').upsert({
                        guild_id: message.guild.id,
                        jail_channel: channel.id
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Jail-Channel gesetzt', `${channel} ist jetzt der Jail-Log-Channel.`)] });
                }
                
                // Aktuelle Settings anzeigen
                const { data } = await supabase
                    .from('jail_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const jailRole = data?.jail_role ? `<@&${data.jail_role}>` : '❌ Nicht gesetzt';
                const jailChannel = data?.jail_channel ? `<#${data.jail_channel}>` : '❌ Nicht gesetzt';
                
                return message.reply({ embeds: [{
                    color: 0x808080,
                    title: '🔒 Jail Einstellungen',
                    fields: [
                        { name: 'Jail-Rolle', value: jailRole, inline: true },
                        { name: 'Log-Channel', value: jailChannel, inline: true }
                    ],
                    footer: { text: '!jail-settings role @Rolle | !jail-settings channel #channel' }
                }] });
            }
        },
        
        // ========== SETTINGS-JAILMSG ==========
        'settings-jailmsg': {
            aliases: ['jailmessage', 'jailmsg'],
            permissions: 'Administrator',
            description: 'Setzt die Jail-Nachricht',
            category: 'Settings',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const msg = args.slice(1).join(' ');
                
                if (action === 'set' && msg) {
                    await supabase.from('jail_settings').upsert({
                        guild_id: message.guild.id,
                        jail_message: msg
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Jail-Nachricht gesetzt', `Nachricht: ${msg}`)] });
                }
                
                if (action === 'reset' || action === 'default') {
                    const defaultMsg = 'Du bist im Jail!';
                    await supabase.from('jail_settings').upsert({
                        guild_id: message.guild.id,
                        jail_message: defaultMsg
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Zurückgesetzt', `Standard-Nachricht: ${defaultMsg}`)] });
                }
                
                const { data } = await supabase
                    .from('jail_settings')
                    .select('jail_message')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const currentMsg = data?.jail_message || 'Du bist im Jail!';
                
                return message.reply({ embeds: [{
                    color: 0x808080,
                    title: '📝 Jail-Nachricht',
                    description: `Aktuelle Nachricht:\n**${currentMsg}**`,
                    fields: [
                        { name: 'Platzhalter', value: '{user} - User-Name\n{server} - Server-Name\n{reason} - Grund' }
                    ],
                    footer: { text: '!settings-jailmsg set <Nachricht> | !settings-jailmsg reset' }
                }] });
            }
        },
        
        // ========== SETTINGS ==========
        settings: {
            aliases: ['config', 'einstellungen'],
            permissions: 'Administrator',
            description: 'Zeigt alle Einstellungen',
            category: 'Settings',
            async execute(message, args, { supabase }) {
                // Jail Settings
                const { data: jail } = await supabase
                    .from('jail_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                // Staff Rollen
                const { data: staffRoles } = await supabase
                    .from('staff_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id);
                
                // Staff Whitelist
                const { data: staffWhitelist } = await supabase
                    .from('staff_whitelist')
                    .select('user_id')
                    .eq('guild_id', message.guild.id);
                
                const jailRole = jail?.jail_role ? `<@&${jail.jail_role}>` : '❌ Nicht gesetzt';
                const jailChannel = jail?.jail_channel ? `<#${jail.jail_channel}>` : '❌ Nicht gesetzt';
                const staffCount = staffRoles?.length || 0;
                const whitelistCount = staffWhitelist?.length || 0;
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: '⚙️ Server Einstellungen',
                    fields: [
                        { name: '🔒 Jail-Rolle', value: jailRole, inline: true },
                        { name: '📋 Jail-Channel', value: jailChannel, inline: true },
                        { name: '👮 Staff-Rollen', value: `${staffCount} Rollen`, inline: true },
                        { name: '✅ Staff-Whitelist', value: `${whitelistCount} User`, inline: true }
                    ],
                    footer: { text: '!help settings für alle Settings-Befehle' }
                }] });
            }
        },
        
        // ========== SETTINGSSTAFF ==========
        settingsstaff: {
            aliases: ['staffconfig', 'sstaff'],
            permissions: 'Administrator',
            description: 'Staff-Rollen verwalten',
            category: 'Settings',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                
                if (action === 'add' && role) {
                    await supabase.from('staff_roles').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id,
                        role_name: role.name
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Staff-Rolle hinzugefügt', `${role} ist jetzt eine Staff-Rolle.`)] });
                }
                
                if (action === 'remove' && role) {
                    await supabase.from('staff_roles')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('role_id', role.id);
                    
                    return message.reply({ embeds: [global.embed.success('Staff-Rolle entfernt', `${role} ist keine Staff-Rolle mehr.`)] });
                }
                
                if (action === 'clear') {
                    await supabase.from('staff_roles')
                        .delete()
                        .eq('guild_id', message.guild.id);
                    
                    return message.reply({ embeds: [global.embed.success('Alle entfernt', 'Alle Staff-Rollen wurden gelöscht.')] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!settingsstaff add @Rolle\n!settingsstaff remove @Rolle\n!settingsstaff clear')] });
            }
        },
        
        // ========== SETTINGSSTAFFLIST ==========
        settingsstafflist: {
            aliases: ['stafflist', 'slist'],
            permissions: 'Administrator',
            description: 'Listet alle Staff-Rollen',
            category: 'Settings',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('staff_roles')
                    .select('role_id, role_name')
                    .eq('guild_id', message.guild.id);
                
                if (!data || data.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Staff-Rollen', 'Keine Staff-Rollen konfiguriert.')] });
                }
                
                const list = data.map(r => `• <@&${r.role_id}> (${r.role_name})`).join('\n');
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: '👮 Staff-Rollen',
                    description: list,
                    footer: { text: `${data.length} Rollen` }
                }] });
            }
        },
        
        // ========== SETTINGSSTAFFWHITELIST ==========
        settingsstaffwhitelist: {
            aliases: ['staffwhitelist', 'swl'],
            permissions: 'Administrator',
            description: 'Staff-Whitelist verwalten',
            category: 'Settings',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const target = message.mentions.users.first() || await message.client.users.fetch(args[1]).catch(() => null);
                
                if (action === 'add' && target) {
                    await supabase.from('staff_whitelist').upsert({
                        guild_id: message.guild.id,
                        user_id: target.id,
                        username: target.username
                    });
                    
                    return message.reply({ embeds: [global.embed.success('User hinzugefügt', `${target} ist jetzt auf der Staff-Whitelist.`)] });
                }
                
                if (action === 'remove' && target) {
                    await supabase.from('staff_whitelist')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('user_id', target.id);
                    
                    return message.reply({ embeds: [global.embed.success('User entfernt', `${target} wurde von der Whitelist entfernt.`)] });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('staff_whitelist')
                        .select('user_id, username')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ embeds: [global.embed.info('Whitelist', 'Keine User auf der Staff-Whitelist.')] });
                    }
                    
                    const list = data.map(u => `• <@${u.user_id}> (${u.username})`).join('\n');
                    
                    return message.reply({ embeds: [{
                        color: 0x00FF00,
                        title: '✅ Staff-Whitelist',
                        description: list,
                        footer: { text: `${data.length} User` }
                    }] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!settingsstaffwhitelist add @User\n!settingsstaffwhitelist remove @User\n!settingsstaffwhitelist list')] });
            }
        },
        
        // ========== STAFF ==========
        staff: {
            aliases: ['staffinfo', 'team'],
            description: 'Zeigt alle Staff-Mitglieder',
            category: 'Settings',
            async execute(message, args, { supabase }) {
                // Staff-Rollen holen
                const { data: staffRoles } = await supabase
                    .from('staff_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id);
                
                // Whitelist holen
                const { data: whitelist } = await supabase
                    .from('staff_whitelist')
                    .select('user_id')
                    .eq('guild_id', message.guild.id);
                
                const staffMembers = new Map();
                
                // Online Status
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
                
                // Whitelist User hinzufügen
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
                                staffMembers.set(wl.user_id, { member, status, role: 'Whitelist' });
                            }
                        }
                    }
                }
                
                if (staffMembers.size === 0) {
                    return message.reply({ embeds: [global.embed.info('Staff', 'Keine Staff-Mitglieder gefunden.')] });
                }
                
                // Nach Rollen gruppieren
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
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: '👥 Staff-Team',
                    fields: fields,
                    footer: { text: `Gesamt: ${staffMembers.size} Staff-Mitglieder` },
                    timestamp: new Date().toISOString()
                }] });
            }
        }
    }
};
