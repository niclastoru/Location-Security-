module.exports = {
    category: 'Leveling',
    subCommands: {
        
        // ========== LEVEL ==========
        level: {
            aliases: ['rank', 'xp'],
            description: 'Zeigt dein Level und XP',
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
                    return message.reply({ embeds: [global.embed.info('Kein Level', `${target} hat noch kein Level!`)] });
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
                
                return message.reply({ embeds: [{
                    color: 0x9B59B6,
                    author: { name: target.username, icon_url: target.displayAvatarURL() },
                    title: `📊 Level ${data.level}`,
                    fields: [
                        { name: '🏆 Rang', value: `#${rank}`, inline: true },
                        { name: '📈 XP', value: `${data.xp}/${nextLevelXp}`, inline: true },
                        { name: '💰 Total XP', value: `${data.total_xp}`, inline: true }
                    ],
                    description: `\`${bar}\``,
                    footer: { text: `${nextLevelXp - data.xp} XP bis Level ${data.level + 1}` }
                }] });
            }
        },
        
        // ========== LEVELS (Alias/Übersicht) ==========
        levels: {
            aliases: ['lvl'],
            description: 'Leveling Übersicht',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'on' || action === 'enable') {
                    await supabase.from('leveling_settings').upsert({
                        guild_id: message.guild.id,
                        enabled: true
                    });
                    return message.reply({ embeds: [global.embed.success('Leveling aktiviert', 'Das Level-System ist jetzt aktiv!')] });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('leveling_settings').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    return message.reply({ embeds: [global.embed.success('Leveling deaktiviert', 'Das Level-System wurde deaktiviert.')] });
                }
                
                const { data } = await supabase
                    .from('leveling_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? '🟢 Aktiviert' : '🔴 Deaktiviert';
                
                return message.reply({ embeds: [{
                    color: 0x9B59B6,
                    title: '📊 Leveling System',
                    fields: [
                        { name: 'Status', value: status, inline: true },
                        { name: 'XP Rate', value: `${data?.rate_min || 15}-${data?.rate_max || 25} XP`, inline: true },
                        { name: 'Stack Roles', value: data?.stack_roles ? '✅ Ja' : '❌ Nein', inline: true }
                    ],
                    footer: { text: '!help leveling für alle Befehle' }
                }] });
            }
        },
        
        // ========== LEVELS STACKROLES ==========
        'levels stackroles': {
            aliases: ['stackroles'],
            permissions: 'Administrator',
            description: 'Stackt Level-Rollen',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                const stack = action === 'on' || action === 'enable' || action === 'true';
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    stack_roles: stack
                });
                
                return message.reply({ embeds: [global.embed.success('Stack Roles', stack ? 'Level-Rollen werden jetzt gestackt.' : 'Level-Rollen werden ersetzt.')] });
            }
        },
        
        // ========== LEVELS-ADD ==========
        'levels-add': {
            aliases: ['addlevelreward'],
            permissions: 'Administrator',
            description: 'Fügt Level-Rolle hinzu',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const level = parseInt(args[0]);
                const role = message.mentions.roles.first();
                
                if (isNaN(level) || !role) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!levels-add <Level> @Rolle')] });
                }
                
                await supabase.from('level_roles').upsert({
                    guild_id: message.guild.id,
                    level: level,
                    role_id: role.id
                });
                
                return message.reply({ embeds: [global.embed.success('Level-Rolle hinzugefügt', `Level ${level} → ${role}`)] });
            }
        },
        
        // ========== LEVELS-REMOVE ==========
        'levels-remove': {
            aliases: ['removelevelreward'],
            permissions: 'Administrator',
            description: 'Entfernt Level-Rolle',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const level = parseInt(args[0]);
                if (isNaN(level)) return message.reply({ embeds: [global.embed.error('Kein Level', '!levels-remove <Level>')] });
                
                await supabase.from('level_roles')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('level', level);
                
                return message.reply({ embeds: [global.embed.success('Level-Rolle entfernt', `Level ${level} entfernt.`)] });
            }
        },
        
        // ========== LEVELS-ROLES ==========
        'levels-roles': {
            aliases: ['levelroles'],
            description: 'Zeigt alle Level-Rollen',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('level_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .order('level', { ascending: true });
                
                if (!data || data.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Rollen', 'Keine Level-Rollen konfiguriert.')] });
                }
                
                const list = data.map(r => `Level ${r.level} → <@&${r.role_id}>`).join('\n');
                
                return message.reply({ embeds: [{
                    color: 0x9B59B6,
                    title: '🎭 Level-Rollen',
                    description: list
                }] });
            }
        },
        
        // ========== LEVELS-LEADERBOARD ==========
        'levels-leaderboard': {
            aliases: ['lb', 'top'],
            description: 'Zeigt das Level-Leaderboard',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('user_levels')
                    .select('user_id, level, total_xp')
                    .eq('guild_id', message.guild.id)
                    .order('total_xp', { ascending: false })
                    .limit(10);
                
                if (!data || data.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Daten', 'Noch niemand hat XP gesammelt!')] });
                }
                
                const leaderboard = data.map((u, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                    return `${medal} <@${u.user_id}> - Level ${u.level} (${u.total_xp} XP)`;
                }).join('\n');
                
                return message.reply({ embeds: [{
                    color: 0xFFD700,
                    title: '🏆 Level Leaderboard',
                    description: leaderboard,
                    footer: { text: `Top 10 von ${data.length} Usern` }
                }] });
            }
        },
        
        // ========== LEVELS-SETRATE ==========
        'levels-setrate': {
            aliases: ['setxprate'],
            permissions: 'Administrator',
            description: 'Setzt XP-Rate',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const min = parseInt(args[0]);
                const max = parseInt(args[1]);
                
                if (isNaN(min) || isNaN(max) || min < 1 || max < min) {
                    return message.reply({ embeds: [global.embed.error('Ungültig', '!levels-setrate <Min> <Max>\nBeispiel: !levels-setrate 15 25')] });
                }
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    rate_min: min,
                    rate_max: max
                });
                
                return message.reply({ embeds: [global.embed.success('XP-Rate gesetzt', `Min: ${min} XP, Max: ${max} XP`)] });
            }
        },
        
        // ========== LEVELS-IGNORE ==========
        'levels-ignore': {
            aliases: ['ignorechannel'],
            permissions: 'Administrator',
            description: 'Ignoriert Channel/Rolle',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.channels.first() || message.mentions.roles.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein Ziel', '!levels-ignore #channel / @Rolle')] });
                
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
                
                return message.reply({ embeds: [global.embed.success('Ignoriert', `${target} wird jetzt ignoriert.`)] });
            }
        },
        
        // ========== LEVELS-LOCK / UNLOCK ==========
        'levels-lock': {
            aliases: ['locklevel'],
            permissions: 'Administrator',
            description: 'Sperrt Level-Benachrichtigungen',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    level_channel: null
                });
                return message.reply({ embeds: [global.embed.success('Level-Benachrichtigungen', 'Werden jetzt im jeweiligen Channel gesendet.')] });
            }
        },
        
        'levels-unlock': {
            aliases: ['unlocklevel'],
            permissions: 'Administrator',
            description: 'Setzt Level-Channel',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    level_channel: channel.id
                });
                
                return message.reply({ embeds: [global.embed.success('Level-Channel', `Level-Ups werden in ${channel} gesendet.`)] });
            }
        },
        
        // ========== SETXP / REMOVEXP ==========
        setxp: {
            aliases: ['addxp', 'givexp'],
            permissions: 'Administrator',
            description: 'Setzt/Fügt XP hinzu',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const amount = parseInt(args[1]);
                
                if (!target || isNaN(amount)) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!setxp @User <XP>')] });
                }
                
                await addXp(message.guild.id, target.id, amount, supabase, message.client);
                return message.reply({ embeds: [global.embed.success('XP hinzugefügt', `${amount} XP für ${target}!`)] });
            }
        },
        
        removexp: {
            aliases: ['takexp'],
            permissions: 'Administrator',
            description: 'Entfernt XP',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const amount = parseInt(args[1]);
                
                if (!target || isNaN(amount)) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!removexp @User <XP>')] });
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
                
                return message.reply({ embeds: [global.embed.success('XP entfernt', `${amount} XP von ${target} entfernt.`)] });
            }
        },
        
        // ========== SETLEVEL ==========
        setlevel: {
            aliases: ['setlvl'],
            permissions: 'Administrator',
            description: 'Setzt Level eines Users',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const level = parseInt(args[1]);
                
                if (!target || isNaN(level) || level < 1) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!setlevel @User <Level>')] });
                }
                
                const totalXp = (level - 1) * 500;
                
                await supabase.from('user_levels').upsert({
                    guild_id: message.guild.id,
                    user_id: target.id,
                    level: level,
                    xp: 0,
                    total_xp: totalXp
                });
                
                return message.reply({ embeds: [global.embed.success('Level gesetzt', `${target} ist jetzt Level ${level}!`)] });
            }
        },
        
        // ========== LEVELS-RESET ==========
        'levels-reset': {
            aliases: ['resetlevel', 'resetuser'],
            permissions: 'Administrator',
            description: 'Setzt User-Level zurück',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!levels-reset @User')] });
                
                await supabase.from('user_levels')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id);
                
                return message.reply({ embeds: [global.embed.success('Level zurückgesetzt', `${target} wurde auf Level 1 zurückgesetzt.`)] });
            }
        },
        
        // ========== LEVELS-CLEANUP / SYNC / UPDATE / MESSAGEMODE ==========
        'levels-cleanup': {
            aliases: ['cleanuplevels'],
            permissions: 'Administrator',
            description: 'Bereinigt verlassene User',
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
                
                return message.reply({ embeds: [global.embed.success('Cleanup', `${removed} verlassene User entfernt.`)] });
            }
        },
        
        'levels-sync': {
            aliases: ['synclevels'],
            permissions: 'Administrator',
            description: 'Synchronisiert Level-Rollen',
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
                
                return message.reply({ embeds: [global.embed.success('Sync', `${synced} User synchronisiert.`)] });
            }
        },
        
        'levels-update': {
            aliases: ['updatelevel'],
            permissions: 'Administrator',
            description: 'Updated Level-Rollen',
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
                
                return message.reply({ embeds: [global.embed.success('Update', `Rollen für ${target} aktualisiert.`)] });
            }
        },
        
        'levels-messageMode': {
            aliases: ['messagemode'],
            permissions: 'Administrator',
            description: 'Setzt Nachrichten-Modus',
            category: 'Leveling',
            async execute(message, args, { supabase }) {
                const mode = args[0]?.toLowerCase();
                if (!['default', 'embed', 'silent'].includes(mode)) {
                    return message.reply({ embeds: [global.embed.error('Ungültig', 'Modi: default, embed, silent')] });
                }
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    message_mode: mode
                });
                
                return message.reply({ embeds: [global.embed.success('Message Mode', `Modus: ${mode}`)] });
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
                
                const message = settings?.level_message?.replace(/{user}/g, member.user.username).replace(/{level}/g, newLevel) || 
                               `🎉 ${member.user.username} hat Level ${newLevel} erreicht!`;
                
                if (channel) {
                    channel.send(message);
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

// ========== MESSAGE HANDLER (in index.js einfügen) ==========
async function handleLevelingMessage(message, supabase) {
    if (message.author.bot || !message.guild) return;
    
    const { data: settings } = await supabase
        .from('leveling_settings')
        .select('*')
        .eq('guild_id', message.guild.id)
        .single();
    
    if (!settings || !settings.enabled) return;
    
    // Ignorierte Channels/Rollen prüfen
    if (settings.ignored_channels?.includes(message.channel.id)) return;
    if (message.member.roles.cache.some(r => settings.ignored_roles?.includes(r.id))) return;
    
    // Cooldown prüfen (1 Minute)
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
