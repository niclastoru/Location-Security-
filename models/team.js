const { EmbedBuilder } = require('discord.js');

// Cache für Hierarchie
const hierarchyCache = new Map();

// ⭐ Rollen-Hierarchie laden (1 = niedrigste)
async function loadHierarchy(guildId, supabase) {
    if (hierarchyCache.has(guildId)) {
        return hierarchyCache.get(guildId);
    }
    
    const { data } = await supabase
        .from('team_hierarchy')
        .select('*')
        .eq('guild_id', guildId)
        .order('position', { ascending: true }); // Position 1 = niedrigste
    
    const hierarchy = data || [];
    hierarchyCache.set(guildId, hierarchy);
    return hierarchy;
}

// ⭐ Hierarchie Cache leeren
function clearHierarchyCache(guildId) {
    hierarchyCache.delete(guildId);
}

// ⭐ Log Nachricht senden
async function sendLogMessage(guild, logType, embed, supabase) {
    const { data } = await supabase
        .from('team_log_channels')
        .select('channel_id')
        .eq('guild_id', guild.id)
        .eq('log_type', logType)
        .single();
    
    if (data) {
        const channel = guild.channels.cache.get(data.channel_id);
        if (channel) {
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    }
}

// ⭐ Team-Beitritt speichern
async function saveTeamJoin(guildId, userId, roleId, roleName, givenBy, givenByTag, supabase) {
    await supabase.from('team_join').upsert({
        guild_id: guildId,
        user_id: userId,
        role_id: roleId,
        role_name: roleName,
        given_by: givenBy,
        given_by_tag: givenByTag,
        joined_at: new Date().toISOString()
    });
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
                
                // Team-Rollen des Users
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                const teamRoleIds = hierarchy.map(h => h.role_id);
                const userTeamRoles = target.roles.cache.filter(r => teamRoleIds.includes(r.id));
                
                if (userTeamRoles.size === 0) {
                    return message.reply({ embeds: [global.embed.error('Kein Team-Mitglied', `${target} ist kein Team-Mitglied!`)] });
                }
                
                // Team-Beitrittsdatum & Wer hat Rolle gegeben
                const { data: teamJoins } = await supabase
                    .from('team_join')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .order('joined_at', { ascending: false });
                
                const roleInfo = [];
                const rolesList = [];
                
                for (const role of userTeamRoles.values()) {
                    rolesList.push(`${role}`);
                    const join = teamJoins?.find(j => j.role_id === role.id);
                    if (join) {
                        roleInfo.push(`**${role.name}**\n┗ 📅 <t:${Math.floor(new Date(join.joined_at).getTime() / 1000)}:D>\n┗ 👤 Gegeben von: ${join.given_by_tag}`);
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
                        { name: '👤 Account erstellt', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: `🎭 Team-Rollen [${userTeamRoles.size}]`, value: rolesList.join(' ') || 'Keine', inline: false },
                        { name: '📋 Rollen-Info', value: roleInfo.join('\n\n') || 'Keine Informationen', inline: false }
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
            description: 'Befördert einen User (eine Stufe höher)',
            category: 'Team',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!uprank @User')] });
                
                if (target.id === message.author.id) {
                    return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst dich nicht selbst befördern!')] });
                }
                
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                if (hierarchy.length === 0) {
                    return message.reply({ embeds: [global.embed.error('Keine Hierarchie', 'Die Team-Hierarchie wurde nicht konfiguriert! Nutze `!teamhierarchy`')] });
                }
                
                // Aktuelle Rollen des Users in der Hierarchie finden
                const userRoles = target.roles.cache;
                let currentRoleIndex = -1;
                let currentRole = null;
                
                // Höchste Team-Rolle finden (größte Position = höchste Rolle)
                for (let i = hierarchy.length - 1; i >= 0; i--) {
                    const hr = hierarchy[i];
                    if (userRoles.has(hr.role_id)) {
                        currentRoleIndex = i;
                        currentRole = hr;
                        break;
                    }
                }
                
                if (currentRoleIndex === -1) {
                    return message.reply({ embeds: [global.embed.error('Keine Team-Rolle', `${target} hat keine Team-Rolle!`)] });
                }
                
                // Höchste Position = letztes Element
                if (currentRoleIndex === hierarchy.length - 1) {
                    return message.reply({ embeds: [global.embed.error('Bereits höchste Rolle', `${target} hat bereits die höchste Team-Rolle!`)] });
                }
                
                const newRoleData = hierarchy[currentRoleIndex + 1];
                const newRole = message.guild.roles.cache.get(newRoleData.role_id);
                
                if (!newRole) {
                    return message.reply({ embeds: [global.embed.error('Rolle nicht gefunden', 'Die Ziel-Rolle existiert nicht mehr!')] });
                }
                
                // Rolle wechseln
                const oldRole = message.guild.roles.cache.get(currentRole.role_id);
                await target.roles.remove(oldRole);
                await target.roles.add(newRole);
                
                // Team-Beitritt speichern
                await saveTeamJoin(
                    message.guild.id, 
                    target.id, 
                    newRole.id, 
                    newRole.name, 
                    message.author.id, 
                    message.author.tag, 
                    supabase
                );
                
                // In History speichern
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
                
                // Erfolgs-Embed
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('⬆️ Uprank')
                    .setDescription(`${target} wurde befördert!`)
                    .addFields(
                        { name: 'Von', value: `${oldRole.name}`, inline: true },
                        { name: 'Zu', value: `${newRole.name}`, inline: true },
                        { name: 'Moderator', value: `${message.author}`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setFooter({ text: `Moderator: ${message.author.tag} | ID: ${message.author.id}` })
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                await sendLogMessage(message.guild, 'uprank', embed, supabase);
            }
        },
        
        // ========== DERANK ==========
        derank: {
            aliases: ['demote', 'down'],
            permissions: 'ManageRoles',
            description: 'Degradiert einen User (eine Stufe niedriger)',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!derank @User')] });
                
                if (target.id === message.author.id) {
                    return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst dich nicht selbst degradieren!')] });
                }
                
                const hierarchy = await loadHierarchy(message.guild.id, supabase);
                if (hierarchy.length === 0) {
                    return message.reply({ embeds: [global.embed.error('Keine Hierarchie', 'Die Team-Hierarchie wurde nicht konfiguriert!')] });
                }
                
                // Aktuelle Rollen des Users in der Hierarchie finden
                const userRoles = target.roles.cache;
                let currentRoleIndex = -1;
                let currentRole = null;
                
                for (let i = hierarchy.length - 1; i >= 0; i--) {
                    const hr = hierarchy[i];
                    if (userRoles.has(hr.role_id)) {
                        currentRoleIndex = i;
                        currentRole = hr;
                        break;
                    }
                }
                
                if (currentRoleIndex === -1) {
                    return message.reply({ embeds: [global.embed.error('Keine Team-Rolle', `${target} hat keine Team-Rolle!`)] });
                }
                
                // Position 0 = niedrigste Rolle
                if (currentRoleIndex === 0) {
                    return message.reply({ embeds: [global.embed.error('Bereits niedrigste Rolle', `${target} hat bereits die niedrigste Team-Rolle!`)] });
                }
                
                const newRoleData = hierarchy[currentRoleIndex - 1];
                const newRole = message.guild.roles.cache.get(newRoleData.role_id);
                
                if (!newRole) {
                    return message.reply({ embeds: [global.embed.error('Rolle nicht gefunden', 'Die Ziel-Rolle existiert nicht mehr!')] });
                }
                
                // Rolle wechseln
                const oldRole = message.guild.roles.cache.get(currentRole.role_id);
                await target.roles.remove(oldRole);
                await target.roles.add(newRole);
                
                // Team-Beitritt speichern
                await saveTeamJoin(
                    message.guild.id, 
                    target.id, 
                    newRole.id, 
                    newRole.name, 
                    message.author.id, 
                    message.author.tag, 
                    supabase
                );
                
                // In History speichern
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
                
                // Erfolgs-Embed
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('⬇️ Derank')
                    .setDescription(`${target} wurde degradiert!`)
                    .addFields(
                        { name: 'Von', value: `${oldRole.name}`, inline: true },
                        { name: 'Zu', value: `${newRole.name}`, inline: true },
                        { name: 'Moderator', value: `${message.author}`, inline: true }
                    )
                    .setThumbnail(target.user.displayAvatarURL())
                    .setFooter({ text: `Moderator: ${message.author.tag} | ID: ${message.author.id}` })
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                await sendLogMessage(message.guild, 'derank', embed, supabase);
            }
        },
        
        // ========== UPRANKINFO ==========
        uprankinfo: {
            aliases: ['upi', 'uphistory'],
            description: 'Zeigt Uprank-History eines Users',
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
                
                if (!data || data.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Upranks', `${target} wurde noch nie befördert.`)] });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setAuthor({ name: `${target.username} - Uprank History`, iconURL: target.displayAvatarURL() })
                    .setThumbnail(target.displayAvatarURL())
                    .setFooter({ text: `User ID: ${target.id}` })
                    .setTimestamp();
                
                data.forEach((u) => {
                    embed.addFields({
                        name: `📅 ${new Date(u.created_at).toLocaleDateString('de-DE')}`,
                        value: `**Von:** ${u.old_role_name || 'Keine'}\n**Zu:** ${u.new_role_name}\n**Mod:** ${u.moderator_tag}`,
                        inline: true
                    });
                });
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== DERANKINFO ==========
        derankinfo: {
            aliases: ['di', 'downhistory'],
            description: 'Zeigt Derank-History eines Users',
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
                
                if (!data || data.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Deranks', `${target} wurde noch nie degradiert.`)] });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setAuthor({ name: `${target.username} - Derank History`, iconURL: target.displayAvatarURL() })
                    .setThumbnail(target.displayAvatarURL())
                    .setFooter({ text: `User ID: ${target.id}` })
                    .setTimestamp();
                
                data.forEach((u) => {
                    embed.addFields({
                        name: `📅 ${new Date(u.created_at).toLocaleDateString('de-DE')}`,
                        value: `**Von:** ${u.old_role_name}\n**Zu:** ${u.new_role_name || 'Keine Rolle'}\n**Mod:** ${u.moderator_tag}`,
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
                    const roles = message.mentions.roles;
                    if (roles.size < 2) {
                        return message.reply({ embeds: [global.embed.error('Zu wenige Rollen', 'Erwähne mindestens 2 Rollen in der Reihenfolge: NIEDRIGSTE zuerst, HÖCHSTE zuletzt!\nBeispiel: !teamhierarchy set @Supporter @Moderator @Admin')] });
                    }
                    
                    // Alte Hierarchie löschen
                    await supabase.from('team_hierarchy').delete().eq('guild_id', message.guild.id);
                    
                    // Neue Hierarchie speichern (Position 1 = niedrigste)
                    let position = 1;
                    for (const role of roles.values()) {
                        await supabase.from('team_hierarchy').insert({
                            guild_id: message.guild.id,
                            role_id: role.id,
                            role_name: role.name,
                            position: position
                        });
                        position++;
                    }
                    
                    clearHierarchyCache(message.guild.id);
                    
                    const roleList = Array.from(roles.values()).map((r, i) => `${i+1}. ${r.name}`).join('\n');
                    
                    return message.reply({ embeds: [global.embed.success('Hierarchie gespeichert', `Reihenfolge (1 = niedrigste):\n${roleList}`)] });
                }
                
                if (action === 'list' || !action) {
                    const hierarchy = await loadHierarchy(message.guild.id, supabase);
                    
                    if (hierarchy.length === 0) {
                        return message.reply({ embeds: [global.embed.info('Keine Hierarchie', 'Noch keine Team-Hierarchie konfiguriert.\n\nNutze `!teamhierarchy set @Rolle1 @Rolle2 ...`\n**Wichtig:** Niedrigste Rolle zuerst!')] });
                    }
                    
                    const list = hierarchy.map((h, i) => `${i+1}. <@&${h.role_id}>`).join('\n');
                    
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '📊 Team Hierarchie',
                        description: list,
                        footer: { text: '1 = Niedrigste Rolle • Höchste Nummer = Höchste Rolle' }
                    }] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!teamhierarchy set @Rolle1 @Rolle2 ...\n!teamhierarchy list')] });
            }
        },
        
        // ========== TEAMLOG ==========
        teamlog: {
            aliases: ['tlog', 'logchannel'],
            permissions: 'Administrator',
            description: 'Setzt Log-Channel für Team-Events',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const type = args[0]?.toLowerCase();
                const channel = message.mentions.channels.first();
                
                const validTypes = ['uprank', 'derank', 'all'];
                
                if (!type || !validTypes.includes(type) || !channel) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!teamlog <uprank/derank/all> #channel')] });
                }
                
                if (type === 'all') {
                    await supabase.from('team_log_channels').upsert({
                        guild_id: message.guild.id,
                        log_type: 'uprank',
                        channel_id: channel.id
                    });
                    
                    await supabase.from('team_log_channels').upsert({
                        guild_id: message.guild.id,
                        log_type: 'derank',
                        channel_id: channel.id
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Log-Channel gesetzt', `Alle Team-Logs gehen jetzt in ${channel}`)] });
                }
                
                await supabase.from('team_log_channels').upsert({
                    guild_id: message.guild.id,
                    log_type: type,
                    channel_id: channel.id
                });
                
                return message.reply({ embeds: [global.embed.success('Log-Channel gesetzt', `${type}-Logs gehen jetzt in ${channel}`)] });
            }
        },
        
        // ========== TEAMLOGDISABLE ==========
        teamlogdisable: {
            aliases: ['tlogoff', 'logdisable'],
            permissions: 'Administrator',
            description: 'Deaktiviert Team-Logs',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const type = args[0]?.toLowerCase();
                
                if (type === 'all') {
                    await supabase.from('team_log_channels').delete().eq('guild_id', message.guild.id);
                    return message.reply({ embeds: [global.embed.success('Logs deaktiviert', 'Alle Team-Logs wurden deaktiviert.')] });
                }
                
                if (type === 'uprank' || type === 'derank') {
                    await supabase.from('team_log_channels')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('log_type', type);
                    
                    return message.reply({ embeds: [global.embed.success('Log deaktiviert', `${type}-Logs wurden deaktiviert.')] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!teamlogdisable <uprank/derank/all>')] });
            }
        },
        
        // ========== TEAMLOGSTATUS ==========
        teamlogstatus: {
            aliases: ['tlogstatus', 'loginfo'],
            permissions: 'ManageRoles',
            description: 'Zeigt Team-Log Einstellungen',
            category: 'Team',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('team_log_channels')
                    .select('*')
                    .eq('guild_id', message.guild.id);
                
                const uprank = data?.find(d => d.log_type === 'uprank');
                const derank = data?.find(d => d.log_type === 'derank');
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: '📋 Team Log Einstellungen',
                    fields: [
                        { name: '⬆️ Uprank Logs', value: uprank ? `<#${uprank.channel_id}>` : '❌ Deaktiviert', inline: true },
                        { name: '⬇️ Derank Logs', value: derank ? `<#${derank.channel_id}>` : '❌ Deaktiviert', inline: true }
                    ],
                    footer: { text: '!teamlog <typ> #channel | !teamlogdisable <typ>' }
                }] });
            }
        }
    }
};
