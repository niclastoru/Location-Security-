const { EmbedBuilder } = require('discord.js');

// ⭐ Rollen-Hierarchie laden (1 = niedrigste)
async function loadHierarchy(guildId, supabase) {
    const { data, error } = await supabase
        .from('team_hierarchy')
        .select('*')
        .eq('guild_id', guildId)
        .order('position', { ascending: true });
    
    if (error) {
        console.error('Fehler beim Laden der Hierarchie:', error);
        return [];
    }
    
    console.log(`📊 Hierarchie geladen: ${data?.length || 0} Rollen`);
    return data || [];
}

// ⭐ Log Nachricht senden
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

// ⭐ Team-Beitritt speichern
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

// ⭐ Team-Beitritt für User holen
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

// ⭐ Ersten Team-Beitritt holen
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
            description: 'Zeigt Team-Infos eines Users',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const target = message.mentions.members.first() || message.member;
                const user = target.user;
                
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                
                if (hierarchy.length === 0) {
                    return message.reply({ embeds: [global.embed.error('Keine Hierarchie', 'Nutze `!teamhierarchy set @Rolle1 @Rolle2`\n**Niedrigste ZUERST!**')] });
                }
                
                const teamRoleIds = hierarchy.map(h => h.role_id);
                const userTeamRoles = target.roles.cache.filter(r => teamRoleIds.includes(r.id));
                
                if (userTeamRoles.size === 0) {
                    return message.reply({ embeds: [global.embed.error('Kein Team-Mitglied', `${target} ist kein Team-Mitglied!`)] });
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
                        roleInfo.push(`**${role.name}**\n┗ 📅 Unbekannt\n┗ 👤 Unbekannt`);
                    }
                }
                
                const embed = new EmbedBuilder()
                    .setColor(target.displayColor || 0x0099FF)
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
                        name: '📅 Team seit',
                        value: `<t:${firstTimestamp}:D>\n┗ 👤 ${firstJoin.given_by_tag}`,
                        inline: true
                    });
                }
                
                embed.addFields(
                    { name: `🎭 Rollen [${userTeamRoles.size}]`, value: rolesList.join(' ') || 'Keine', inline: false },
                    { name: '📋 History', value: roleInfo.join('\n\n') || 'Keine', inline: false }
                )
                .setFooter({ text: `Angefordert von ${message.author.tag}` })
                .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== UPRANK ==========
        uprank: {
            aliases: ['promote', 'up'],
            permissions: 'ManageRoles',
            description: 'Befördert einen User',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!uprank @User')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Nicht selbst!')] });
                
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                if (hierarchy.length === 0) {
                    return message.reply({ embeds: [global.embed.error('Keine Hierarchie', 'Nutze `!teamhierarchy set @Rolle1 @Rolle2`')] });
                }
                
                const teamRoleIds = hierarchy.map(h => h.role_id);
                const userTeamRoles = target.roles.cache.filter(r => teamRoleIds.includes(r.id));
                
                // KEINE Team-Rolle -> Erste geben
                if (userTeamRoles.size === 0) {
                    const firstRoleData = hierarchy[0];
                    const firstRole = message.guild.roles.cache.get(firstRoleData.role_id);
                    if (!firstRole) return message.reply({ embeds: [global.embed.error('Fehler', 'Erste Rolle existiert nicht!')] });
                    
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
                        old_role_name: 'Keine',
                        new_role_id: firstRoleData.role_id,
                        new_role_name: firstRoleData.role_name
                    });
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('⬆️ Ins Team aufgenommen')
                        .setDescription(`${target} ist jetzt **${firstRole.name}**!`)
                        .addFields({ name: 'Moderator', value: `${message.author}`, inline: true })
                        .setThumbnail(target.user.displayAvatarURL())
                        .setTimestamp();
                    
                    await message.reply({ embeds: [embed] });
                    await sendLogMessage(message.guild, 'uprank', embed, supabase);
                    return;
                }
                
                // Höchste Rolle finden
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
                    return message.reply({ embeds: [global.embed.error('Max', `${target} hat bereits die höchste Rolle!`)] });
                }
                
                const newRoleData = hierarchy[currentRoleIndex + 1];
                const newRole = message.guild.roles.cache.get(newRoleData.role_id);
                if (!newRole) return message.reply({ embeds: [global.embed.error('Fehler', 'Ziel-Rolle existiert nicht!')] });
                
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
                    .setTitle('⬆️ Uprank')
                    .setDescription(`${target} wurde befördert!`)
                    .addFields(
                        { name: 'Von', value: oldRole.name, inline: true },
                        { name: 'Zu', value: newRole.name, inline: true },
                        { name: 'Mod', value: `${message.author}`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                await sendLogMessage(message.guild, 'uprank', embed, supabase);
            }
        },
        
        // ========== DERANK ==========
        derank: {
            aliases: ['demote', 'down'],
            permissions: 'ManageRoles',
            description: 'Degradiert einen User',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!derank @User')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Nicht selbst!')] });
                
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                if (hierarchy.length === 0) {
                    return message.reply({ embeds: [global.embed.error('Keine Hierarchie', 'Nutze `!teamhierarchy set`')] });
                }
                
                const teamRoleIds = hierarchy.map(h => h.role_id);
                const userTeamRoles = target.roles.cache.filter(r => teamRoleIds.includes(r.id));
                
                if (userTeamRoles.size === 0) {
                    return message.reply({ embeds: [global.embed.error('Keine Team-Rolle', `${target} hat keine Team-Rolle!`)] });
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
                
                // Niedrigste Rolle -> Komplett entfernen
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
                        new_role_name: 'Aus Team entfernt'
                    });
                    
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⬇️ Aus Team entfernt')
                        .setDescription(`${target} ist nicht mehr im Team!`)
                        .addFields({ name: 'Mod', value: `${message.author}`, inline: true })
                        .setThumbnail(target.user.displayAvatarURL())
                        .setTimestamp();
                    
                    await message.reply({ embeds: [embed] });
                    await sendLogMessage(message.guild, 'derank', embed, supabase);
                    return;
                }
                
                const newRoleData = hierarchy[currentRoleIndex - 1];
                const newRole = message.guild.roles.cache.get(newRoleData.role_id);
                if (!newRole) return message.reply({ embeds: [global.embed.error('Fehler', 'Ziel-Rolle existiert nicht!')] });
                
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
                    .setTitle('⬇️ Derank')
                    .setDescription(`${target} wurde degradiert!`)
                    .addFields(
                        { name: 'Von', value: oldRole.name, inline: true },
                        { name: 'Zu', value: newRole.name, inline: true },
                        { name: 'Mod', value: `${message.author}`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                await sendLogMessage(message.guild, 'derank', embed, supabase);
            }
        },
        
        // ========== UPRANKINFO ==========
        uprankinfo: {
            aliases: ['upi'],
            description: 'Zeigt Uprank-History',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first() || message.author;
                
                const { data } = await supabase
                    .from('uprank_history')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                if (!data?.length) {
                    return message.reply({ embeds: [global.embed.info('Keine Upranks', `${target} wurde nie befördert.`)] });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setAuthor({ name: `${target.username} - Upranks`, iconURL: target.displayAvatarURL() })
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();
                
                data.forEach(u => {
                    const ts = Math.floor(new Date(u.created_at).getTime() / 1000);
                    embed.addFields({
                        name: `<t:${ts}:D>`,
                        value: `**Von:** ${u.old_role_name || 'Keine'}\n**Zu:** ${u.new_role_name}\n**Mod:** ${u.moderator_tag}`,
                        inline: true
                    });
                });
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== DERANKINFO ==========
        derankinfo: {
            aliases: ['di'],
            description: 'Zeigt Derank-History',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first() || message.author;
                
                const { data } = await supabase
                    .from('derank_history')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                if (!data?.length) {
                    return message.reply({ embeds: [global.embed.info('Keine Deranks', `${target} wurde nie degradiert.`)] });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setAuthor({ name: `${target.username} - Deranks`, iconURL: target.displayAvatarURL() })
                    .setThumbnail(target.displayAvatarURL())
                    .setTimestamp();
                
                data.forEach(u => {
                    const ts = Math.floor(new Date(u.created_at).getTime() / 1000);
                    embed.addFields({
                        name: `<t:${ts}:D>`,
                        value: `**Von:** ${u.old_role_name}\n**Zu:** ${u.new_role_name || 'Entfernt'}\n**Mod:** ${u.moderator_tag}`,
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
            description: 'Konfiguriert die Team-Hierarchie',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'set') {
                    // ⭐ ALLE ERWÄHNTEN ROLLEN EINSAMMELN
                    const roles = message.mentions.roles;
                    
                    if (roles.size === 0) {
                        return message.reply({ embeds: [global.embed.error('Keine Rollen', 'Erwähne mindestens 1 Rolle mit @!\n`!teamhierarchy set @Supporter @Moderator @Admin`')] });
                    }
                    
                    // ALT LÖSCHEN
                    await supabase.from('team_hierarchy').delete().eq('guild_id', message.guild.id);
                    
                    // NEU SPEICHERN (in der Reihenfolge der Erwähnung)
                    let position = 1;
                    const savedRoles = [];
                    
                    // Rollen in der Reihenfolge der Erwähnung durchgehen
                    const roleArray = Array.from(roles.values());
                    
                    for (const role of roleArray) {
                        const { error } = await supabase.from('team_hierarchy').insert({
                            guild_id: message.guild.id,
                            role_id: role.id,
                            role_name: role.name,
                            position: position
                        });
                        
                        if (error) {
                            console.error('Insert error:', error);
                        } else {
                            savedRoles.push(`${position}. ${role.name}`);
                            position++;
                        }
                    }
                    
                    if (savedRoles.length === 0) {
                        return message.reply({ embeds: [global.embed.error('Fehler', 'Keine Rollen gespeichert!')] });
                    }
                    
                    return message.reply({ 
                        embeds: [global.embed.success('Hierarchie gespeichert', 
                            `**${savedRoles.length} Rollen gespeichert!**\n\n**Reihenfolge (1 = niedrigste):**\n${savedRoles.join('\n')}`
                        )] 
                    });
                }
                
                if (action === 'list' || !action) {
                    const hierarchy = await loadHierarchy(message.guild.id, supabase);
                    
                    if (hierarchy.length === 0) {
                        return message.reply({ embeds: [global.embed.info('Keine Hierarchie', 'Nutze `!teamhierarchy set @Rolle1 @Rolle2 ...`\n**Niedrigste zuerst!**')] });
                    }
                    
                    const list = hierarchy.map(h => `${h.position}. <@&${h.role_id}> (${h.role_name})`).join('\n');
                    
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '📊 Team Hierarchie',
                        description: list,
                        footer: { text: '1 = Niedrigste • Höchste Nummer = Höchste Rolle' }
                    }] });
                }
                
                if (action === 'reset') {
                    await supabase.from('team_hierarchy').delete().eq('guild_id', message.guild.id);
                    return message.reply({ embeds: [global.embed.success('Reset', 'Hierarchie gelöscht.')] });
                }
                
                return message.reply({ embeds: [global.embed.error('Nutze', '`!teamhierarchy set @Rolle1 @Rolle2`\n`!teamhierarchy list`\n`!teamhierarchy reset`')] });
            }
        },
        
        // ========== TEAMLOG ==========
        teamlog: {
            aliases: ['tlog'],
            permissions: 'Administrator',
            description: 'Setzt Log-Channel',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const type = args[0]?.toLowerCase();
                const channel = message.mentions.channels.first();
                
                if (!type || !['uprank', 'derank', 'all'].includes(type) || !channel) {
                    return message.reply({ embeds: [global.embed.error('Nutze', '`!teamlog <uprank/derank/all> #channel`')] });
                }
                
                if (type === 'all') {
                    await supabase.from('team_log_channels').upsert({ guild_id: message.guild.id, log_type: 'uprank', channel_id: channel.id });
                    await supabase.from('team_log_channels').upsert({ guild_id: message.guild.id, log_type: 'derank', channel_id: channel.id });
                    return message.reply({ embeds: [global.embed.success('Log-Channel', `Alle Logs in ${channel}`)] });
                }
                
                await supabase.from('team_log_channels').upsert({ guild_id: message.guild.id, log_type: type, channel_id: channel.id });
                return message.reply({ embeds: [global.embed.success('Log-Channel', `${type}-Logs in ${channel}`)] });
            }
        },
        
        // ========== TEAMLOGSTATUS ==========
        teamlogstatus: {
            aliases: ['tlogstatus'],
            permissions: 'ManageRoles',
            description: 'Zeigt Log-Einstellungen',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const { data } = await supabase.from('team_log_channels').select('*').eq('guild_id', message.guild.id);
                
                const uprank = data?.find(d => d.log_type === 'uprank');
                const derank = data?.find(d => d.log_type === 'derank');
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: '📋 Team Logs',
                    fields: [
                        { name: '⬆️ Uprank', value: uprank ? `<#${uprank.channel_id}>` : '❌ Aus', inline: true },
                        { name: '⬇️ Derank', value: derank ? `<#${derank.channel_id}>` : '❌ Aus', inline: true }
                    ]
                }] });
            }
        }
    }
};
