const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        leveling: 0x9B59B6,
        gold: 0xFFD700
    };
    
    const titles = {
        de: {
            no_level: 'Kein Level',
            level_system: 'Leveling System',
            stack_roles: 'Stack Roles',
            level_role_added: 'Level-Rolle hinzugefügt',
            level_role_removed: 'Level-Rolle entfernt',
            level_roles: 'Level-Rollen',
            leaderboard: 'Level Leaderboard',
            xp_rate_set: 'XP-Rate gesetzt',
            ignored: 'Ignoriert',
            level_locked: 'Level-Benachrichtigungen',
            level_unlocked: 'Level-Channel',
            xp_added: 'XP hinzugefügt',
            xp_removed: 'XP entfernt',
            level_set: 'Level gesetzt',
            level_reset: 'Level zurückgesetzt',
            cleanup: 'Cleanup',
            sync: 'Sync',
            update: 'Update',
            message_mode: 'Message Mode',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info',
            invalid_usage: 'Falsche Nutzung',
            no_data: 'Keine Daten'
        },
        en: {
            no_level: 'No Level',
            level_system: 'Leveling System',
            stack_roles: 'Stack Roles',
            level_role_added: 'Level Role Added',
            level_role_removed: 'Level Role Removed',
            level_roles: 'Level Roles',
            leaderboard: 'Level Leaderboard',
            xp_rate_set: 'XP Rate Set',
            ignored: 'Ignored',
            level_locked: 'Level Notifications',
            level_unlocked: 'Level Channel',
            xp_added: 'XP Added',
            xp_removed: 'XP Removed',
            level_set: 'Level Set',
            level_reset: 'Level Reset',
            cleanup: 'Cleanup',
            sync: 'Sync',
            update: 'Update',
            message_mode: 'Message Mode',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage',
            no_data: 'No Data'
        }
    };
    
    const descriptions = {
        de: {
            no_level: (user) => `${user} hat noch kein Level!`,
            level_activated: 'Das Level-System ist jetzt aktiv!',
            level_deactivated: 'Das Level-System wurde deaktiviert.',
            level_status: (status, min, max, stack) => `Status: ${status}\nXP Rate: ${min}-${max} XP\nStack Roles: ${stack}`,
            stack_enabled: 'Level-Rollen werden jetzt gestackt.',
            stack_disabled: 'Level-Rollen werden ersetzt.',
            level_add_usage: '!levels-add <Level> @Rolle',
            level_added: (level, role) => `Level ${level} → ${role}`,
            level_remove_usage: '!levels-remove <Level>',
            level_removed: (level) => `Level ${level} entfernt.`,
            no_roles: 'Keine Level-Rollen konfiguriert.',
            leaderboard_empty: 'Noch niemand hat XP gesammelt!',
            setrate_usage: '!levels-setrate <Min> <Max>\nBeispiel: !levels-setrate 15 25',
            xp_rate_set: (min, max) => `Min: ${min} XP, Max: ${max} XP`,
            ignore_usage: '!levels-ignore #channel / @Rolle',
            ignored: (target) => `${target} wird jetzt ignoriert.`,
            level_locked: 'Werden jetzt im jeweiligen Channel gesendet.',
            level_unlocked: (channel) => `Level-Ups werden in ${channel} gesendet.`,
            setxp_usage: '!setxp @User <XP>',
            xp_added: (amount, user) => `${amount} XP für ${user}!`,
            removexp_usage: '!removexp @User <XP>',
            xp_removed: (amount, user) => `${amount} XP von ${user} entfernt.`,
            setlevel_usage: '!setlevel @User <Level>',
            level_set: (user, level) => `${user} ist jetzt Level ${level}!`,
            level_reset_usage: '!levels-reset @User',
            level_reset: (user) => `${user} wurde auf Level 1 zurückgesetzt.`,
            cleanup_success: (count) => `${count} verlassene User entfernt.`,
            sync_success: (count) => `${count} User synchronisiert.`,
            update_success: (user) => `Rollen für ${user} aktualisiert.`,
            message_mode_invalid: 'Modi: default, embed, silent',
            message_mode_set: (mode) => `Modus: ${mode}`,
            help_footer: '!help leveling für alle Befehle',
            level_up: (user, level) => `🎉 ${user} hat Level ${level} erreicht!`
        },
        en: {
            no_level: (user) => `${user} has no level yet!`,
            level_activated: 'The level system is now active!',
            level_deactivated: 'The level system has been deactivated.',
            level_status: (status, min, max, stack) => `Status: ${status}\nXP Rate: ${min}-${max} XP\nStack Roles: ${stack}`,
            stack_enabled: 'Level roles will now be stacked.',
            stack_disabled: 'Level roles will be replaced.',
            level_add_usage: '!levels-add <Level> @Role',
            level_added: (level, role) => `Level ${level} → ${role}`,
            level_remove_usage: '!levels-remove <Level>',
            level_removed: (level) => `Level ${level} removed.`,
            no_roles: 'No level roles configured.',
            leaderboard_empty: 'No one has collected XP yet!',
            setrate_usage: '!levels-setrate <Min> <Max>\nExample: !levels-setrate 15 25',
            xp_rate_set: (min, max) => `Min: ${min} XP, Max: ${max} XP`,
            ignore_usage: '!levels-ignore #channel / @Role',
            ignored: (target) => `${target} is now ignored.`,
            level_locked: 'Will now be sent in the respective channel.',
            level_unlocked: (channel) => `Level ups will be sent in ${channel}.`,
            setxp_usage: '!setxp @User <XP>',
            xp_added: (amount, user) => `${amount} XP for ${user}!`,
            removexp_usage: '!removexp @User <XP>',
            xp_removed: (amount, user) => `${amount} XP removed from ${user}.`,
            setlevel_usage: '!setlevel @User <Level>',
            level_set: (user, level) => `${user} is now level ${level}!`,
            level_reset_usage: '!levels-reset @User',
            level_reset: (user) => `${user} has been reset to level 1.`,
            cleanup_success: (count) => `${count} abandoned users removed.`,
            sync_success: (count) => `${count} users synchronized.`,
            update_success: (user) => `Roles for ${user} updated.`,
            message_mode_invalid: 'Modes: default, embed, silent',
            message_mode_set: (mode) => `Mode: ${mode}`,
            help_footer: '!help leveling for all commands',
            level_up: (user, level) => `🎉 ${user} reached level ${level}!`
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
        .setColor(type === 'leveling' ? 0x9B59B6 : type === 'gold' ? 0xFFD700 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'gold' ? '🏆' : '📊';
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
    category: 'Leveling',
    subCommands: {
        
        // ========== LEVEL ==========
        level: {
            aliases: ['rank', 'xp'],
            description: 'Zeigt dein Level und XP / Shows your level and XP',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data } = await supabase
                    .from('user_levels')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (!data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'no_level', 'no_level', [target.toString()])] 
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
                        { name: lang === 'de' ? '🏆 Rang' : '🏆 Rank', value: `#${rank}`, inline: true },
                        { name: '📈 XP', value: `${data.xp}/${nextLevelXp}`, inline: true },
                        { name: lang === 'de' ? '💰 Total XP' : '💰 Total XP', value: `${data.total_xp}`, inline: true }
                    ])
                    .setDescription(`\`${bar}\``)
                    .setFooter({ text: lang === 'de' ? `${nextLevelXp - data.xp} XP bis Level ${data.level + 1}` : `${nextLevelXp - data.xp} XP until level ${data.level + 1}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LEVELS (Alias/Übersicht) ==========
        levels: {
            aliases: ['lvl'],
            description: 'Leveling Übersicht / Leveling overview',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'on' || action === 'enable') {
                    await supabase.from('leveling_settings').upsert({
                        guild_id: message.guild.id,
                        enabled: true
                    });
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'level_system', 'level_activated')] 
                    });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('leveling_settings').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'level_system', 'level_deactivated')] 
                    });
                }
                
                const { data } = await supabase
                    .from('leveling_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? (lang === 'de' ? '🟢 Aktiviert' : '🟢 Enabled') : (lang === 'de' ? '🔴 Deaktiviert' : '🔴 Disabled');
                const stack = data?.stack_roles ? (lang === 'de' ? '✅ Ja' : '✅ Yes') : (lang === 'de' ? '❌ Nein' : '❌ No');
                
                const embed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '📊 Leveling System' : '📊 Leveling System')
                    .addFields([
                        { name: lang === 'de' ? 'Status' : 'Status', value: status, inline: true },
                        { name: lang === 'de' ? 'XP Rate' : 'XP Rate', value: `${data?.rate_min || 15}-${data?.rate_max || 25} XP`, inline: true },
                        { name: lang === 'de' ? 'Stack Roles' : 'Stack Roles', value: stack, inline: true }
                    ])
                    .setFooter({ text: lang === 'de' ? '!help leveling für alle Befehle' : '!help leveling for all commands', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LEVELS STACKROLES ==========
        'levels stackroles': {
            aliases: ['stackroles'],
            permissions: 'Administrator',
            description: 'Stackt Level-Rollen / Stacks level roles',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const stack = action === 'on' || action === 'enable' || action === 'true';
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    stack_roles: stack
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'stack_roles', stack ? 'stack_enabled' : 'stack_disabled')] 
                });
            }
        },
        
        // ========== LEVELS-ADD ==========
        'levels-add': {
            aliases: ['addlevelreward'],
            permissions: 'Administrator',
            description: 'Fügt Level-Rolle hinzu / Adds level role',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const level = parseInt(args[0]);
                const role = message.mentions.roles.first();
                
                if (isNaN(level) || !role) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'level_add_usage')] 
                    });
                }
                
                await supabase.from('level_roles').upsert({
                    guild_id: message.guild.id,
                    level: level,
                    role_id: role.id
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'level_role_added', 'level_added', [level, role.toString()])] 
                });
            }
        },
        
        // ========== LEVELS-REMOVE ==========
        'levels-remove': {
            aliases: ['removelevelreward'],
            permissions: 'Administrator',
            description: 'Entfernt Level-Rolle / Removes level role',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const level = parseInt(args[0]);
                
                if (isNaN(level)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'level_remove_usage')] 
                    });
                }
                
                await supabase.from('level_roles')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('level', level);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'level_role_removed', 'level_removed', [level])] 
                });
            }
        },
        
        // ========== LEVELS-ROLES ==========
        'levels-roles': {
            aliases: ['levelroles'],
            description: 'Zeigt alle Level-Rollen / Shows all level roles',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data } = await supabase
                    .from('level_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .order('level', { ascending: true });
                
                if (!data || data.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'level_roles', 'no_roles')] 
                    });
                }
                
                const list = data.map(r => `Level ${r.level} → <@&${r.role_id}>`).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🎭 Level-Rollen' : '🎭 Level Roles')
                    .setDescription(list)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LEVELS-LEADERBOARD ==========
        'levels-leaderboard': {
            aliases: ['lb', 'top'],
            description: 'Zeigt das Level-Leaderboard / Shows the level leaderboard',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data } = await supabase
                    .from('user_levels')
                    .select('user_id, level, total_xp')
                    .eq('guild_id', message.guild.id)
                    .order('total_xp', { ascending: false })
                    .limit(10);
                
                if (!data || data.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'leaderboard', 'leaderboard_empty')] 
                    });
                }
                
                const leaderboard = data.map((u, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                    return `${medal} <@${u.user_id}> - Level ${u.level} (${u.total_xp} XP)`;
                }).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFD700)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🏆 Level Leaderboard' : '🏆 Level Leaderboard')
                    .setDescription(leaderboard)
                    .setFooter({ text: `${lang === 'de' ? 'Top 10 von' : 'Top 10 of'} ${data.length} ${lang === 'de' ? 'Usern' : 'users'}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LEVELS-SETRATE ==========
        'levels-setrate': {
            aliases: ['setxprate'],
            permissions: 'Administrator',
            description: 'Setzt XP-Rate / Sets XP rate',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const min = parseInt(args[0]);
                const max = parseInt(args[1]);
                
                if (isNaN(min) || isNaN(max) || min < 1 || max < min) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'setrate_usage')] 
                    });
                }
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    rate_min: min,
                    rate_max: max
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'xp_rate_set', 'xp_rate_set', [min, max])] 
                });
            }
        },
        
        // ========== LEVELS-IGNORE ==========
        'levels-ignore': {
            aliases: ['ignorechannel'],
            permissions: 'Administrator',
            description: 'Ignoriert Channel/Rolle / Ignores channel/role',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.channels.first() || message.mentions.roles.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'ignore_usage')] 
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'ignored', 'ignored', [target.toString()])] 
                });
            }
        },
        
        // ========== LEVELS-LOCK ==========
        'levels-lock': {
            aliases: ['locklevel'],
            permissions: 'Administrator',
            description: 'Sperrt Level-Benachrichtigungen / Locks level notifications',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    level_channel: null
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'level_locked', 'level_locked')] 
                });
            }
        },
        
        // ========== LEVELS-UNLOCK ==========
        'levels-unlock': {
            aliases: ['unlocklevel'],
            permissions: 'Administrator',
            description: 'Setzt Level-Channel / Sets level channel',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    level_channel: channel.id
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'level_unlocked', 'level_unlocked', [channel.toString()])] 
                });
            }
        },
        
        // ========== SETXP ==========
        setxp: {
            aliases: ['addxp', 'givexp'],
            permissions: 'Administrator',
            description: 'Setzt/Fügt XP hinzu / Sets/Adds XP',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first();
                const amount = parseInt(args[1]);
                
                if (!target || isNaN(amount)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'setxp_usage')] 
                    });
                }
                
                await addXp(message.guild.id, target.id, amount, supabase, message.client);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'xp_added', 'xp_added', [amount, target.toString()])] 
                });
            }
        },
        
        // ========== REMOVEXP ==========
        removexp: {
            aliases: ['takexp'],
            permissions: 'Administrator',
            description: 'Entfernt XP / Removes XP',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first();
                const amount = parseInt(args[1]);
                
                if (!target || isNaN(amount)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'removexp_usage')] 
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'xp_removed', 'xp_removed', [amount, target.toString()])] 
                });
            }
        },
        
        // ========== SETLEVEL ==========
        setlevel: {
            aliases: ['setlvl'],
            permissions: 'Administrator',
            description: 'Setzt Level eines Users / Sets a user\'s level',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first();
                const level = parseInt(args[1]);
                
                if (!target || isNaN(level) || level < 1) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'setlevel_usage')] 
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'level_set', 'level_set', [target.toString(), level])] 
                });
            }
        },
        
        // ========== LEVELS-RESET ==========
        'levels-reset': {
            aliases: ['resetlevel', 'resetuser'],
            permissions: 'Administrator',
            description: 'Setzt User-Level zurück / Resets user level',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'level_reset_usage')] 
                    });
                }
                
                await supabase.from('user_levels')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'level_reset', 'level_reset', [target.toString()])] 
                });
            }
        },
        
        // ========== LEVELS-CLEANUP ==========
        'levels-cleanup': {
            aliases: ['cleanuplevels'],
            permissions: 'Administrator',
            description: 'Bereinigt verlassene User / Cleans up abandoned users',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'cleanup', 'cleanup_success', [removed])] 
                });
            }
        },
        
        // ========== LEVELS-SYNC ==========
        'levels-sync': {
            aliases: ['synclevels'],
            permissions: 'Administrator',
            description: 'Synchronisiert Level-Rollen / Synchronizes level roles',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'sync', 'sync_success', [synced])] 
                });
            }
        },
        
        // ========== LEVELS-UPDATE ==========
        'levels-update': {
            aliases: ['updatelevel'],
            permissions: 'Administrator',
            description: 'Updated Level-Rollen / Updates level roles',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'update', 'update_success', [target.toString()])] 
                });
            }
        },
        
        // ========== LEVELS-MESSAGEMODE ==========
        'levels-messageMode': {
            aliases: ['messagemode'],
            permissions: 'Administrator',
            description: 'Setzt Nachrichten-Modus / Sets message mode',
            category: 'Leveling',
            async execute(message, args, { client, supabase }) {
                const mode = args[0]?.toLowerCase();
                
                if (!['default', 'embed', 'silent'].includes(mode)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'message_mode_invalid')] 
                    });
                }
                
                await supabase.from('leveling_settings').upsert({
                    guild_id: message.guild.id,
                    message_mode: mode
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'message_mode', 'message_mode_set', [mode])] 
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
                
                const lang = client.languages?.get(guildId) || 'de';
                const message = settings?.level_message?.replace(/{user}/g, member.user.username).replace(/{level}/g, newLevel) || 
                               (lang === 'de' ? `🎉 ${member.user.username} hat Level ${newLevel} erreicht!` : `🎉 ${member.user.username} reached level ${newLevel}!`);
                
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

// ========== MESSAGE HANDLER (in index.js einfügen) ==========
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
