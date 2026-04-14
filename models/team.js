const { EmbedBuilder } = require('discord.js');

// Cache für Hierarchie
const hierarchyCache = new Map();

// ⭐ Rollen-Hierarchie laden
async function loadHierarchy(guildId, supabase) {
    if (hierarchyCache.has(guildId)) {
        return hierarchyCache.get(guildId);
    }
    
    const { data } = await supabase
        .from('team_hierarchy')
        .select('*')
        .eq('guild_id', guildId)
        .order('position', { ascending: true });
    
    const hierarchy = data || [];
    hierarchyCache.set(guildId, hierarchy);
    return hierarchy;
}

// ⭐ Hierarchie Cache leeren
function clearHierarchyCache(guildId) {
    hierarchyCache.delete(guildId);
}

// ⭐ Rolle in Hierarchie finden
function findRoleInHierarchy(hierarchy, roleId) {
    return hierarchy.findIndex(h => h.role_id === roleId);
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
                
                // Rollen des Users (außer @everyone)
                const roles = target.roles.cache
                    .filter(r => r.id !== message.guild.id)
                    .sort((a, b) => b.position - a.position)
                    .map(r => `${r}`)
                    .join(' ') || 'Keine Rollen';
                
                const embed = new EmbedBuilder()
                    .setColor(target.displayColor || 0x0099FF)
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .addFields(
                        { name: '🆔 User ID', value: user.id, inline: true },
                        { name: '📅 Account erstellt', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: '📥 Server beigetreten', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`, inline: true },
                        { name: `🎭 Rollen [${target.roles.cache.size - 1}]`, value: roles, inline: false }
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
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                
                // Automatische Log-Nachricht
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
                    .setTimestamp();
                
                await message.reply({ embeds: [embed] });
                
                // Automatische Log-Nachricht
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
                
                data.forEach((u, i) => {
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
                
                data.forEach((u, i) => {
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
                    // Rollen aus der Nachricht extrahieren (in Reihenfolge)
                    const roles = message.mentions.roles;
                    if (roles.size < 2) {
                        return message.reply({ embeds: [global.embed.error('Zu wenige Rollen', 'Erwähne mindestens 2 Rollen in der richtigen Reihenfolge!\nBeispiel: !teamhierarchy set @Supporter @Moderator @Admin')] });
                    }
                    
                    // Alte Hierarchie löschen
                    await supabase.from('team_hierarchy').delete().eq('guild_id', message.guild.id);
                    
                    // Neue Hierarchie speichern
                    let position = 0;
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
                    
                    return message.reply({ embeds: [global.embed.success('Hierarchie gespeichert', `Reihenfolge:\n${roleList}`)] });
                }
                
                if (action === 'add') {
                    const role = message.mentions.roles.first();
                    const position = parseInt(args[2]);
                    
                    if (!role || isNaN(position)) {
                        return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!teamhierarchy add @Rolle <Position>')] });
                    }
                    
                    const hierarchy = await loadHierarchy(message.guild.id, supabase);
                    
                    // Positionen anpassen
                    for (const h of hierarchy) {
                        if (h.position >= position) {
                            await supabase.from('team_hierarchy')
                                .update({ position: h.position + 1 })
                                .eq('guild_id', message.guild.id)
                                .eq('role_id', h.role_id);
                        }
                    }
                    
                    await supabase.from('team_hierarchy').insert({
                        guild_id: message.guild.id,
                        role_id: role.id,
                        role_name: role.name,
                        position: position
                    });
                    
                    clearHierarchyCache(message.guild.id);
                    
                    return message.reply({ embeds: [global.embed.success('Rolle hinzugefügt', `${role} wurde an Position ${position} eingefügt.`)] });
                }
                
                if (action === 'remove') {
                    const role = message.mentions.roles.first();
                    if (!role) return message.reply({ embeds: [global.embed.error('Keine Rolle', '!teamhierarchy remove @Rolle')] });
                    
                    const hierarchy = await loadHierarchy(message.guild.id, supabase);
                    const removedPos = hierarchy.find(h => h.role_id === role.id)?.position;
                    
                    await supabase.from('team_hierarchy')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('role_id', role.id);
                    
                    // Positionen anpassen
                    if (removedPos !== undefined) {
                        for (const h of hierarchy) {
                            if (h.position > removedPos) {
                                await supabase.from('team_hierarchy')
                                    .update({ position: h.position - 1 })
                                    .eq('guild_id', message.guild.id)
                                    .eq('role_id', h.role_id);
                            }
                        }
                    }
                    
                    clearHierarchyCache(message.guild.id);
                    
                    return message.reply({ embeds: [global.embed.success('Rolle entfernt', `${role} wurde aus der Hierarchie entfernt.`)] });
                }
                
                if (action === 'list' || !action) {
                    const hierarchy = await loadHierarchy(message.guild.id, supabase);
                    
                    if (hierarchy.length === 0) {
                        return message.reply({ embeds: [global.embed.info('Keine Hierarchie', 'Noch keine Team-Hierarchie konfiguriert.\n\nNutze `!teamhierarchy set @Rolle1 @Rolle2 ...`')] });
                    }
                    
                    const list = hierarchy.map((h, i) => `${i+1}. <@&${h.role_id}>`).join('\n');
                    
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '📊 Team Hierarchie',
                        description: list,
                        footer: { text: 'Niedrigste zuerst, Höchste zuletzt' }
                    }] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!teamhierarchy set/list/add/remove')] });
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
        
        // ========== TEAMLOG DISABLE ==========
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
                    
                    return message.reply({ embeds: [global.embed.success('Log deaktiviert', `${type}-Logs wurden deaktiviert.`)] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!teamlogdisable <uprank/derank/all>')] });
            }
        },
        
        // ========== TEAMLOG STATUS ==========
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
