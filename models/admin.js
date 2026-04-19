const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C
    };
    
    const titles = {
        de: {
            no_vc: 'Kein VC',
            no_activity: 'Keine Aktivität',
            error: 'Fehler',
            activity_started: 'Aktivität',
            invalid_usage: 'Falsche Nutzung',
            no_image: 'Kein Bild',
            avatar_changed: 'Avatar geändert',
            banner_changed: 'Banner geändert',
            bio: 'Bio',
            customize: 'Customize',
            no_command: 'Kein Befehl',
            not_found: 'Nicht gefunden',
            deactivated: 'Deaktiviert',
            activated: 'Aktiviert',
            warning: 'Warnung',
            nuke: 'Nuke',
            cancelled: 'Abgebrochen',
            reaction_setup: 'Reaction Setup',
            reaction_roles: 'Reaction Roles',
            server_rules: 'Server Regeln',
            settings: 'Bot Einstellungen',
            status_changed: 'Status geändert',
            sticky_set: 'Sticky gesetzt',
            staff_removed: 'Staff entfernt',
            no_staff_roles: 'Keine Staff-Rollen',
            all_unbanned: 'Alle entbannt',
            all_released: 'Alle entlassen',
            vanity_url: 'Vanity URL',
            reminder_set: 'Erinnerung gesetzt',
            invalid_time: 'Ungültige Zeit',
            antinuke: 'Antinuke',
            antiraid: 'Antiraid',
            auto_responder: 'Auto-Responder',
            permissions: 'Permissions',
            available_permissions: 'Verfügbare Permissions',
            confirm: 'Bestätigung',
            yes: 'Ja',
            no: 'Nein'
        },
        en: {
            no_vc: 'No VC',
            no_activity: 'No Activity',
            error: 'Error',
            activity_started: 'Activity',
            invalid_usage: 'Invalid Usage',
            no_image: 'No Image',
            avatar_changed: 'Avatar Changed',
            banner_changed: 'Banner Changed',
            bio: 'Bio',
            customize: 'Customize',
            no_command: 'No Command',
            not_found: 'Not Found',
            deactivated: 'Deactivated',
            activated: 'Activated',
            warning: 'Warning',
            nuke: 'Nuke',
            cancelled: 'Cancelled',
            reaction_setup: 'Reaction Setup',
            reaction_roles: 'Reaction Roles',
            server_rules: 'Server Rules',
            settings: 'Bot Settings',
            status_changed: 'Status Changed',
            sticky_set: 'Sticky Set',
            staff_removed: 'Staff Removed',
            no_staff_roles: 'No Staff Roles',
            all_unbanned: 'All Unbanned',
            all_released: 'All Released',
            vanity_url: 'Vanity URL',
            reminder_set: 'Reminder Set',
            invalid_time: 'Invalid Time',
            antinuke: 'Antinuke',
            antiraid: 'Antiraid',
            auto_responder: 'Auto-Responder',
            permissions: 'Permissions',
            available_permissions: 'Available Permissions',
            confirm: 'Confirmation',
            yes: 'Yes',
            no: 'No'
        }
    };
    
    const descriptions = {
        de: {
            no_vc: 'Du musst in einem Voice-Channel sein!',
            no_activity: (list) => `Verfügbar: ${list}`,
            error_activity: 'Konnte Aktivität nicht starten!',
            activity_started: (activity, link) => `[Klick hier für ${activity}](https://discord.gg/${link})`,
            announce_usage: '!announce #channel <Text>',
            announce_sent: (channel) => `Ankündigung in ${channel} gesendet!`,
            antinuke_enabled: (punishment) => `✅ Antinuke ist jetzt AKTIV!\nBestrafung: **${punishment}**`,
            antinuke_disabled: '❌ Antinuke wurde deaktiviert!',
            antinuke_status: (status, punishment) => `Status: ${status}\nBestrafung: **${punishment}**\n\n**Nutze:**\n!antinuke on [ban/kick/timeout]\n!antinuke off`,
            antiraid_enabled: (limit, window) => `🛡️ Antiraid ist AKTIV!\nLimit: **${limit}** Joins in **${window}s**`,
            antiraid_disabled: '🔓 Antiraid wurde deaktiviert!',
            antiraid_status: (status, limit, window) => `Status: ${status}\nLimit: **${limit}** Joins in **${window}s**\n\n**Nutze:**\n!antiraid on [limit] [sekunden]\n!antiraid off`,
            autoresponder_add: '!autoresponder add <Trigger> <Antwort>',
            autoresponder_remove: '!autoresponder remove <Trigger>',
            autoresponder_added: (trigger, response) => `✅ Trigger **"${trigger}"** → **"${response}"**`,
            autoresponder_removed: (trigger) => `Trigger **"${trigger}"** entfernt.`,
            autoresponder_not_found: 'Trigger nicht gefunden!',
            autoresponder_empty: 'Keine Einträge vorhanden.',
            no_image_avatar: '!customize avatar <URL> oder Bild anhängen',
            no_image_banner: '!customize banner <URL>',
            avatar_changed: 'Bot-Avatar wurde aktualisiert!',
            banner_changed: 'Bot-Banner wurde aktualisiert!',
            bio_manual: 'Bio kann nur manuell geändert werden.',
            customize_info: '`!customize avatar <URL>`\n`!customize banner <URL>`\n`!customize bio <Text>`',
            disable_usage: '!disablecommand <Befehl>',
            enable_usage: '!enablecommand <Befehl>',
            command_not_found: (cmd) => `Befehl "${cmd}" existiert nicht!`,
            command_deactivated: (cmd) => `Befehl \`${cmd}\` wurde deaktiviert.`,
            command_activated: (cmd) => `Befehl \`${cmd}\` wurde aktiviert.`,
            massdm_warning: '⚠️ Mass-DM ist gefährlich und kann zum Bot-Bann führen!',
            nuke_confirm: '⚠️ Bist du sicher? Schreibe `!confirm` innerhalb von 10 Sekunden.',
            nuke_cancelled: 'Nuke wurde abgebrochen.',
            nuke_success: '💥 Channel wurde genuked!',
            nuke_error: 'Konnte Channel nicht nuken!',
            reaction_usage_add: '!reactionroles add <Nachrichten-ID> <Emoji> @Rolle',
            reaction_usage_remove: '!reactionroles remove <Nachrichten-ID> <Emoji>',
            reaction_added: (emoji, role) => `${emoji} → ${role}`,
            reaction_removed: (emoji) => `${emoji} wurde entfernt.`,
            reaction_empty: 'Keine Einträge vorhanden.',
            server_rules_empty: 'Aktuelle Regeln wurden nicht gesetzt. Nutze `!serverrules <Regeln>`',
            server_rules_set: (user) => `Gesetzt von ${user}`,
            settings_saved: (setting, value) => `${setting} = ${value}`,
            settings_no_channel: 'Erwähne einen Channel!',
            settings_footer: '!settings <option> <wert> zum Ändern',
            status_invalid_type: 'playing, streaming, listening, watching, competing',
            status_no_text: '!status <Typ> <Text>',
            status_changed: (type, text) => `${type}: ${text}`,
            sticky_no_text: '!stickymessage [#channel] <Text>',
            sticky_set: (channel) => `Nachricht in ${channel} wird angepinnt bleiben.`,
            stripstaff_usage: '!stripstaff @User\n!stripstaff add @Rolle\n!stripstaff remove @Rolle\n!stripstaff list',
            stripstaff_added: (role) => `${role} wird als Staff-Rolle gespeichert.`,
            stripstaff_removed: (role) => `${role} ist keine Staff-Rolle mehr.`,
            stripstaff_empty: 'Keine Staff-Rollen gespeichert.',
            stripstaff_no_roles: (user) => `${user} hat keine Staff-Rollen.`,
            stripstaff_removed_count: (count, user) => `${count} Staff-Rollen von ${user} entfernt.`,
            unbanall_confirm: '⚠️ Bist du sicher? Schreibe `!confirm`',
            unbanall_success: (count) => `${count} User wurden entbannt.`,
            unjailall_no_role: 'Es existiert keine Jail-Rolle!',
            unjailall_success: (count) => `${count} User aus dem Jail entlassen.`,
            vanity_success: (code, uses) => `**${code}**\nNutzt: ${uses} mal`,
            vanity_error: 'Dieser Server hat keine Vanity-URL! (Benötigt Boost Level 3)',
            remind_usage: '!remind <Zeit> <Nachricht>\nBeispiel: !remind 10m Pizza holen',
            remind_invalid: 'Nutze: 10s, 5m, 2h, 1d',
            remind_set: (time, reminder) => `Ich erinnere dich in ${time} an: **${reminder}**`,
            remind_triggered: (reminder, channel) => `**${reminder}**\nVon: ${channel}`
        },
        en: {
            no_vc: 'You must be in a voice channel!',
            no_activity: (list) => `Available: ${list}`,
            error_activity: 'Could not start activity!',
            activity_started: (activity, link) => `[Click here for ${activity}](https://discord.gg/${link})`,
            announce_usage: '!announce #channel <Text>',
            announce_sent: (channel) => `Announcement sent in ${channel}!`,
            antinuke_enabled: (punishment) => `✅ Antinuke is now ACTIVE!\nPunishment: **${punishment}**`,
            antinuke_disabled: '❌ Antinuke has been disabled!',
            antinuke_status: (status, punishment) => `Status: ${status}\nPunishment: **${punishment}**\n\n**Usage:**\n!antinuke on [ban/kick/timeout]\n!antinuke off`,
            antiraid_enabled: (limit, window) => `🛡️ Antiraid is ACTIVE!\nLimit: **${limit}** joins in **${window}s**`,
            antiraid_disabled: '🔓 Antiraid has been disabled!',
            antiraid_status: (status, limit, window) => `Status: ${status}\nLimit: **${limit}** joins in **${window}s**\n\n**Usage:**\n!antiraid on [limit] [seconds]\n!antiraid off`,
            autoresponder_add: '!autoresponder add <Trigger> <Response>',
            autoresponder_remove: '!autoresponder remove <Trigger>',
            autoresponder_added: (trigger, response) => `✅ Trigger **"${trigger}"** → **"${response}"**`,
            autoresponder_removed: (trigger) => `Trigger **"${trigger}"** removed.`,
            autoresponder_not_found: 'Trigger not found!',
            autoresponder_empty: 'No entries found.',
            no_image_avatar: '!customize avatar <URL> or attach image',
            no_image_banner: '!customize banner <URL>',
            avatar_changed: 'Bot avatar updated!',
            banner_changed: 'Bot banner updated!',
            bio_manual: 'Bio can only be changed manually.',
            customize_info: '`!customize avatar <URL>`\n`!customize banner <URL>`\n`!customize bio <Text>`',
            disable_usage: '!disablecommand <Command>',
            enable_usage: '!enablecommand <Command>',
            command_not_found: (cmd) => `Command "${cmd}" does not exist!`,
            command_deactivated: (cmd) => `Command \`${cmd}\` has been deactivated.`,
            command_activated: (cmd) => `Command \`${cmd}\` has been activated.`,
            massdm_warning: '⚠️ Mass-DM is dangerous and can lead to a bot ban!',
            nuke_confirm: '⚠️ Are you sure? Type `!confirm` within 10 seconds.',
            nuke_cancelled: 'Nuke cancelled.',
            nuke_success: '💥 Channel has been nuked!',
            nuke_error: 'Could not nuke channel!',
            reaction_usage_add: '!reactionroles add <Message-ID> <Emoji> @Role',
            reaction_usage_remove: '!reactionroles remove <Message-ID> <Emoji>',
            reaction_added: (emoji, role) => `${emoji} → ${role}`,
            reaction_removed: (emoji) => `${emoji} has been removed.`,
            reaction_empty: 'No entries found.',
            server_rules_empty: 'No rules set. Use `!serverrules <Rules>`',
            server_rules_set: (user) => `Set by ${user}`,
            settings_saved: (setting, value) => `${setting} = ${value}`,
            settings_no_channel: 'Mention a channel!',
            settings_footer: '!settings <option> <value> to change',
            status_invalid_type: 'playing, streaming, listening, watching, competing',
            status_no_text: '!status <Type> <Text>',
            status_changed: (type, text) => `${type}: ${text}`,
            sticky_no_text: '!stickymessage [#channel] <Text>',
            sticky_set: (channel) => `Message in ${channel} will stay pinned.`,
            stripstaff_usage: '!stripstaff @User\n!stripstaff add @Role\n!stripstaff remove @Role\n!stripstaff list',
            stripstaff_added: (role) => `${role} saved as staff role.`,
            stripstaff_removed: (role) => `${role} is no longer a staff role.`,
            stripstaff_empty: 'No staff roles saved.',
            stripstaff_no_roles: (user) => `${user} has no staff roles.`,
            stripstaff_removed_count: (count, user) => `${count} staff roles removed from ${user}.`,
            unbanall_confirm: '⚠️ Are you sure? Type `!confirm`',
            unbanall_success: (count) => `${count} users have been unbanned.`,
            unjailall_no_role: 'No jail role exists!',
            unjailall_success: (count) => `${count} users released from jail.`,
            vanity_success: (code, uses) => `**${code}**\nUses: ${uses} times`,
            vanity_error: 'This server has no vanity URL! (Requires Boost Level 3)',
            remind_usage: '!remind <Time> <Message>\nExample: !remind 10m Get pizza',
            remind_invalid: 'Use: 10s, 5m, 2h, 1d',
            remind_set: (time, reminder) => `I will remind you in ${time} about: **${reminder}**`,
            remind_triggered: (reminder, channel) => `**${reminder}**\nFrom: ${channel}`
        }
    };
    
    const title = titles[lang]?.[titleKey] || titleKey;
    let description = descriptions[lang]?.[descKey] || descKey;
    
    // Funktionen in descriptions ausführen
    if (typeof description === 'function') {
        if (Array.isArray(fields)) {
            description = description(...fields);
        } else {
            description = description(fields);
        }
    } else {
        // Ersetzungen vornehmen
        for (const [key, value] of Object.entries(replacements)) {
            description = description.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    // Footer mit User
    if (userId) {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    embed.setTimestamp();
    
    // Zusätzliche Fields
    if (Array.isArray(fields) && fields.length > 0 && fields[0] && typeof fields[0] === 'object') {
        embed.addFields(fields);
    }
    
    return embed;
}

module.exports = {
    category: 'Admin',
    subCommands: {
        
        // ========== ACTIVITY ==========
        activity: {
            aliases: ['act'],
            permissions: 'Administrator',
            description: 'Startet eine Aktivität im VC / Starts an activity in VC',
            category: 'Admin',
            async execute(message, args, { client }) {
                const channel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                const activity = args[0]?.toLowerCase();
                const activities = {
                    poker: '755827207812677713',
                    chess: '832012774040141894',
                    betrayal: '773336526917861400',
                    fishing: '814288819477020702',
                    youtube: '880218394199220334',
                    wordsnack: '879863976006127627',
                    doodle: '878067389634314250',
                    lettertile: '879863686565621790'
                };
                
                if (!activities[activity]) {
                    const list = Object.keys(activities).join(', ');
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_activity', 'no_activity', [list])] 
                    });
                }
                
                try {
                    const invite = await channel.createInvite({
                        targetApplication: activities[activity],
                        targetType: 2,
                        maxAge: 300
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'activity_started', 'activity_started', [activity, invite.code])] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'error_activity')] 
                    });
                }
            }
        },
        
        // ========== ANNOUNCE ==========
        announce: {
            aliases: ['ankündigung', 'say'],
            permissions: 'Administrator',
            description: 'Sendet eine Ankündigung / Sends an announcement',
            category: 'Admin',
            async execute(message, args, { client }) {
                const channel = message.mentions.channels.first();
                const text = args.slice(1).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel || !text) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'announce_usage')] 
                    });
                }
                
                const announceEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle(lang === 'de' ? '📢 Ankündigung' : '📢 Announcement')
                    .setDescription(text)
                    .setFooter({ text: `${lang === 'de' ? 'Von' : 'By'} ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                await channel.send({ embeds: [announceEmbed] });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'announce_sent', 'announce_sent', [channel.toString()])] 
                });
            }
        },
        
        // ========== ANTINUKE ==========
        antinuke: {
            aliases: ['an'],
            permissions: 'Administrator',
            description: 'Anti-Nuke Einstellungen / Anti-Nuke settings',
            category: 'Admin',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const punish = args[1]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'on' || action === 'enable') {
                    const punishment = ['ban', 'kick', 'timeout'].includes(punish) ? punish : 'ban';
                    
                    await supabase.from('antinuke').upsert({
                        guild_id: message.guild.id,
                        enabled: true,
                        punish_action: punishment
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'antinuke', 'antinuke_enabled', [punishment])] 
                    });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('antinuke').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'antinuke', 'antinuke_disabled')] 
                    });
                }
                
                const { data } = await supabase
                    .from('antinuke')
                    .select('enabled, punish_action')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? (lang === 'de' ? '🟢 AKTIV' : '🟢 ACTIVE') : (lang === 'de' ? '🔴 INAKTIV' : '🔴 INACTIVE');
                const punishment = data?.punish_action || 'ban';
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'antinuke', 'antinuke_status', [status, punishment])] 
                });
            }
        },
        
        // ========== ANTIRAID ==========
        antiraid: {
            aliases: ['ar'],
            permissions: 'Administrator',
            description: 'Anti-Raid Einstellungen / Anti-Raid settings',
            category: 'Admin',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'on' || action === 'enable') {
                    const limit = parseInt(args[1]) || 5;
                    const window = parseInt(args[2]) || 10;
                    
                    await supabase.from('antiraid').upsert({
                        guild_id: message.guild.id,
                        enabled: true,
                        join_limit: limit,
                        time_window: window
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'antiraid', 'antiraid_enabled', [limit, window])] 
                    });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('antiraid').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'antiraid', 'antiraid_disabled')] 
                    });
                }
                
                const { data } = await supabase
                    .from('antiraid')
                    .select('enabled, join_limit, time_window')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? (lang === 'de' ? '🟢 AKTIV' : '🟢 ACTIVE') : (lang === 'de' ? '🔴 INAKTIV' : '🔴 INACTIVE');
                const limit = data?.join_limit || 5;
                const window = data?.time_window || 10;
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'antiraid', 'antiraid_status', [status, limit, window])] 
                });
            }
        },
        
        // ========== AUTORESPONDER ==========
        autoresponder: {
            aliases: ['arsp', 'autoreply'],
            permissions: 'Administrator',
            description: 'Auto-Responder verwalten / Manage auto-responder',
            category: 'Admin',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const trigger = args[1]?.toLowerCase();
                const response = args.slice(2).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'add') {
                    if (!trigger || !response) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'autoresponder_add')] 
                        });
                    }
                    
                    await supabase.from('autoresponder').upsert({
                        guild_id: message.guild.id,
                        trigger: trigger,
                        response: response
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'auto_responder', 'autoresponder_added', [trigger, response])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    if (!trigger) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'autoresponder_remove')] 
                        });
                    }
                    
                    const { error } = await supabase
                        .from('autoresponder')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('trigger', trigger);
                    
                    if (error) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'autoresponder_not_found')] 
                        });
                    }
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'auto_responder', 'autoresponder_removed', [trigger])] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('autoresponder')
                        .select('trigger, response')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'auto_responder', 'autoresponder_empty')] 
                        });
                    }
                    
                    const list = data.map(ar => `**${ar.trigger}** → ${ar.response}`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '🤖 Auto-Responder' : '🤖 Auto-Responder')
                        .setDescription(list.slice(0, 4096))
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'autoresponder_add')] 
                });
            }
        },
        
        // ========== CUSTOMIZE AVATAR ==========
        'customize avatar': {
            aliases: ['setavatar', 'botavatar'],
            permissions: 'Administrator',
            description: 'Ändert Bot-Avatar / Changes bot avatar',
            category: 'Admin',
            async execute(message, args, { client }) {
                const url = args[0] || message.attachments.first()?.url;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!url) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_image', 'no_image_avatar')] 
                    });
                }
                
                try {
                    await message.client.user.setAvatar(url);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'avatar_changed', 'avatar_changed')] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'error_activity')] 
                    });
                }
            }
        },
        
        // ========== CUSTOMIZE BANNER ==========
        'customize banner': {
            aliases: ['setbanner', 'botbanner'],
            permissions: 'Administrator',
            description: 'Ändert Bot-Banner / Changes bot banner',
            category: 'Admin',
            async execute(message, args, { client }) {
                const url = args[0] || message.attachments.first()?.url;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!url) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_image', 'no_image_banner')] 
                    });
                }
                
                try {
                    await message.client.user.setBanner(url);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'banner_changed', 'banner_changed')] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'error_activity')] 
                    });
                }
            }
        },
        
        // ========== CUSTOMIZE BIO ==========
        'customize bio': {
            aliases: ['setbio', 'botbio'],
            permissions: 'Administrator',
            description: 'Ändert Bot-Bio / Changes bot bio',
            category: 'Admin',
            async execute(message, args, { client }) {
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'bio', 'bio_manual')] 
                });
            }
        },
        
        // ========== CUSTOMIZE ==========
        customize: {
            aliases: ['custom'],
            permissions: 'Administrator',
            description: 'Bot-Customization / Bot customization',
            category: 'Admin',
            async execute(message, args, { client }) {
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'customize', 'customize_info')] 
                });
            }
        },
        
        // ========== DISABLECOMMAND ==========
        disablecommand: {
            aliases: ['disable', 'cmdoff'],
            permissions: 'Administrator',
            description: 'Deaktiviert einen Befehl / Disables a command',
            category: 'Admin',
            async execute(message, args, { client }) {
                const cmd = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!cmd) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_command', 'disable_usage')] 
                    });
                }
                
                if (!message.client.commands.has(cmd)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'not_found', 'command_not_found', [cmd])] 
                    });
                }
                
                message.client.disabledCommands = message.client.disabledCommands || new Set();
                message.client.disabledCommands.add(cmd);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'deactivated', 'command_deactivated', [cmd])] 
                });
            }
        },
        
        // ========== ENABLECOMMAND ==========
        enablecommand: {
            aliases: ['enable', 'cmdon'],
            permissions: 'Administrator',
            description: 'Aktiviert einen Befehl / Enables a command',
            category: 'Admin',
            async execute(message, args, { client }) {
                const cmd = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!cmd) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_command', 'enable_usage')] 
                    });
                }
                
                message.client.disabledCommands = message.client.disabledCommands || new Set();
                message.client.disabledCommands.delete(cmd);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'activated', 'command_activated', [cmd])] 
                });
            }
        },
        
        // ========== DMALL ==========
        dmall: {
            aliases: ['massdm'],
            permissions: 'Administrator',
            description: 'Sendet DM an alle Mitglieder / Sends DM to all members',
            category: 'Admin',
            async execute(message, args, { client }) {
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'warn', 'warning', 'massdm_warning')] 
                });
            }
        },
        
        // ========== FAKEPERMISSIONS ==========
        fakepermissions: {
            aliases: ['fakeperm'],
            permissions: 'Administrator',
            description: 'Zeigt Fake-Permissions / Shows fake permissions',
            category: 'Admin',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first() || message.member;
                const lang = client.languages?.get(message.guild.id) || 'de';
                const perms = target.permissions.toArray().map(p => p.replace(/_/g, ' ')).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `🔧 Permissions von ${target.user.username}` : `🔧 Permissions of ${target.user.username}`)
                    .setDescription(perms.slice(0, 4096) || (lang === 'de' ? 'Keine' : 'None'))
                    .setFooter({ text: lang === 'de' ? 'Simulation - Echte Perms können abweichen' : 'Simulation - Real perms may differ', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LISTPERMISSIONS ==========
        listpermissions: {
            aliases: ['listperm', 'perms'],
            permissions: 'Administrator',
            description: 'Listet alle Permissions / Lists all permissions',
            category: 'Admin',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                const perms = [
                    'Administrator', 'BanMembers', 'KickMembers', 'ManageChannels',
                    'ManageMessages', 'ManageRoles', 'ManageNicknames', 'ManageWebhooks',
                    'ModerateMembers', 'MoveMembers', 'MuteMembers', 'DeafenMembers'
                ];
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '📋 Verfügbare Permissions' : '📋 Available Permissions')
                    .setDescription(perms.join('\n'))
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== NUKE ==========
        nuke: {
            aliases: ['nukechannel', 'reset'],
            permissions: 'Administrator',
            description: 'Nuked einen Channel / Nukes a channel',
            category: 'Admin',
            async execute(message, args, { client }) {
                const channel = message.mentions.channels.first() || message.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const confirmMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'warn', 'nuke', 'nuke_confirm')] 
                });
                
                const filter = m => m.author.id === message.author.id && m.content === '!confirm';
                const collector = message.channel.createMessageCollector({ filter, time: 10000, max: 1 });
                
                collector.on('collect', async () => {
                    try {
                        const newChannel = await channel.clone();
                        await channel.delete();
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle(lang === 'de' ? '✅ Nuke' : '✅ Nuke')
                            .setDescription(lang === 'de' ? '💥 Channel wurde genuked!' : '💥 Channel has been nuked!')
                            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                            .setTimestamp();
                        
                        await newChannel.send({ embeds: [successEmbed] });
                        await confirmMsg.delete().catch(() => {});
                    } catch {
                        await message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'nuke_error')] 
                        });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await confirmMsg.edit({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'cancelled', 'nuke_cancelled')] 
                        });
                    }
                });
            }
        },
        
        // ========== REACTION-SETUP ==========
        'reaction-setup': {
            aliases: ['reactsetup'],
            permissions: 'Administrator',
            description: 'Reaction-Role Setup / Reaction-Role setup',
            category: 'Admin',
            async execute(message, args, { client }) {
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'reaction_setup', 'reaction_usage_add')] 
                });
            }
        },
        
        // ========== REACTIONROLES ==========
        reactionroles: {
            aliases: ['rr', 'reactrole'],
            permissions: 'Administrator',
            description: 'Reaction-Roles verwalten / Manage reaction-roles',
            category: 'Admin',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'add') {
                    const msgId = args[1];
                    const emoji = args[2];
                    const role = message.mentions.roles.first();
                    
                    if (!msgId || !emoji || !role) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'reaction_usage_add')] 
                        });
                    }
                    
                    await supabase.from('reaction_roles').insert({
                        guild_id: message.guild.id,
                        message_id: msgId,
                        channel_id: message.channel.id,
                        emoji: emoji,
                        role_id: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'reaction_roles', 'reaction_added', [emoji, role.toString()])] 
                    });
                }
                
                if (action === 'remove') {
                    const msgId = args[1];
                    const emoji = args[2];
                    
                    if (!msgId || !emoji) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'reaction_usage_remove')] 
                        });
                    }
                    
                    await supabase.from('reaction_roles')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('message_id', msgId)
                        .eq('emoji', emoji);
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'reaction_roles', 'reaction_removed', [emoji])] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('reaction_roles')
                        .select('message_id, emoji, role_id')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'reaction_roles', 'reaction_empty')] 
                        });
                    }
                    
                    const list = data.map(rr => `📝 ${rr.message_id}: ${rr.emoji} → <@&${rr.role_id}>`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '🎭 Reaction Roles' : '🎭 Reaction Roles')
                        .setDescription(list.slice(0, 4096))
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'reaction_usage_add')] 
                });
            }
        },
        
        // ========== SERVERRULES ==========
        serverrules: {
            aliases: ['rules', 'regeln'],
            permissions: 'Administrator',
            description: 'Server-Regeln / Server rules',
            category: 'Admin',
            async execute(message, args, { client }) {
                const rules = args.join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!rules) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'server_rules', 'server_rules_empty')] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle(lang === 'de' ? '📜 Server Regeln' : '📜 Server Rules')
                    .setDescription(rules)
                    .setFooter({ text: `${lang === 'de' ? 'Gesetzt von' : 'Set by'} ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SETTINGS ==========
        settings: {
            aliases: ['config', 'einstellungen'],
            permissions: 'Administrator',
            description: 'Bot-Einstellungen / Bot settings',
            category: 'Admin',
            async execute(message, args, { client, supabase }) {
                const setting = args[0]?.toLowerCase();
                const value = args.slice(1).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const validSettings = ['prefix', 'log_channel', 'welcome_channel', 'welcome_message', 'leave_channel', 'leave_message'];
                
                if (setting && validSettings.includes(setting)) {
                    let updateData = { guild_id: message.guild.id };
                    
                    if (setting === 'prefix') updateData.prefix = value;
                    else if (setting.includes('channel')) {
                        const channel = message.mentions.channels.first();
                        if (!channel) {
                            return message.reply({ 
                                embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'settings_no_channel')] 
                            });
                        }
                        updateData[setting] = channel.id;
                    } else {
                        updateData[setting] = value;
                    }
                    
                    await supabase.from('bot_settings').upsert(updateData);
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'settings', 'settings_saved', [setting, value || `<#${updateData[setting]}>`])] 
                    });
                }
                
                const { data } = await supabase
                    .from('bot_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const prefix = data?.prefix || '!';
                const log = data?.log_channel ? `<#${data.log_channel}>` : (lang === 'de' ? '❌ Nicht gesetzt' : '❌ Not set');
                const welcome = data?.welcome_channel ? `<#${data.welcome_channel}>` : (lang === 'de' ? '❌ Nicht gesetzt' : '❌ Not set');
                const leave = data?.leave_channel ? `<#${data.leave_channel}>` : (lang === 'de' ? '❌ Nicht gesetzt' : '❌ Not set');
                
                const { data: an } = await supabase.from('antinuke').select('enabled').eq('guild_id', message.guild.id).single();
                const { data: ar } = await supabase.from('antiraid').select('enabled').eq('guild_id', message.guild.id).single();
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '⚙️ Bot Einstellungen' : '⚙️ Bot Settings')
                    .addFields([
                        { name: lang === 'de' ? 'Prefix' : 'Prefix', value: prefix, inline: true },
                        { name: lang === 'de' ? 'Log Channel' : 'Log Channel', value: log, inline: true },
                        { name: lang === 'de' ? 'Welcome Channel' : 'Welcome Channel', value: welcome, inline: true },
                        { name: lang === 'de' ? 'Leave Channel' : 'Leave Channel', value: leave, inline: true },
                        { name: '🛡️ Antinuke', value: an?.enabled ? (lang === 'de' ? '🟢 An' : '🟢 On') : (lang === 'de' ? '🔴 Aus' : '🔴 Off'), inline: true },
                        { name: '🛡️ Antiraid', value: ar?.enabled ? (lang === 'de' ? '🟢 An' : '🟢 On') : (lang === 'de' ? '🔴 Aus' : '🔴 Off'), inline: true }
                    ])
                    .setFooter({ text: lang === 'de' ? '!settings <option> <wert> zum Ändern' : '!settings <option> <value> to change', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== STATUS ==========
        status: {
            aliases: ['setstatus', 'botstatus'],
            permissions: 'Administrator',
            description: 'Ändert Bot-Status / Changes bot status',
            category: 'Admin',
            async execute(message, args, { client }) {
                const type = args[0]?.toLowerCase();
                const text = args.slice(1).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const types = {
                    playing: 0, play: 0, game: 0,
                    streaming: 1, stream: 1,
                    listening: 2, listen: 2,
                    watching: 3, watch: 3,
                    competing: 5, comp: 5
                };
                
                if (!types[type] && types[type] !== 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'status_invalid_type')] 
                    });
                }
                
                if (!text) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'status_no_text')] 
                    });
                }
                
                message.client.user.setActivity(text, { type: types[type] });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'status_changed', 'status_changed', [type, text])] 
                });
            }
        },
        
        // ========== STICKYMESSAGE ==========
        stickymessage: {
            aliases: ['sticky', 'pinmsg'],
            permissions: 'Administrator',
            description: 'Setzt Sticky-Nachricht / Sets sticky message',
            category: 'Admin',
            async execute(message, args, { client }) {
                const channel = message.mentions.channels.first() || message.channel;
                const text = args.slice(1).join(' ') || args.join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!text) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'sticky_no_text')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'sticky_set', 'sticky_set', [channel.toString()])] 
                });
            }
        },
        
        // ========== STRIPSTAFF ==========
        stripstaff: {
            aliases: ['removestaff'],
            permissions: 'Administrator',
            description: 'Entfernt Staff-Rollen / Removes staff roles',
            category: 'Admin',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'add') {
                    const role = message.mentions.roles.first();
                    if (!role) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'stripstaff_usage')] 
                        });
                    }
                    
                    await supabase.from('staff_roles').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id,
                        role_name: role.name
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'staff_removed', 'stripstaff_added', [role.toString()])] 
                    });
                }
                
                if (action === 'remove') {
                    const role = message.mentions.roles.first();
                    if (!role) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'stripstaff_usage')] 
                        });
                    }
                    
                    await supabase.from('staff_roles')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('role_id', role.id);
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'staff_removed', 'stripstaff_removed', [role.toString()])] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('staff_roles')
                        .select('role_id, role_name')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'no_staff_roles', 'stripstaff_empty')] 
                        });
                    }
                    
                    const list = data.map(r => `<@&${r.role_id}> (${r.role_name})`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '👮 Staff-Rollen' : '👮 Staff Roles')
                        .setDescription(list)
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'stripstaff_usage')] 
                    });
                }
                
                const { data } = await supabase
                    .from('staff_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id);
                
                let staffRoles;
                if (data && data.length > 0) {
                    const roleIds = data.map(r => r.role_id);
                    staffRoles = target.roles.cache.filter(r => roleIds.includes(r.id));
                } else {
                    staffRoles = target.roles.cache.filter(r => 
                        r.permissions.has('Administrator') || 
                        r.permissions.has('BanMembers') || 
                        r.permissions.has('KickMembers') ||
                        r.permissions.has('ManageMessages')
                    );
                }
                
                if (staffRoles.size === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'no_staff_roles', 'stripstaff_no_roles', [target.toString()])] 
                    });
                }
                
                await target.roles.remove(staffRoles);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'staff_removed', 'stripstaff_removed_count', [staffRoles.size, target.toString()])] 
                });
            }
        },
        
        // ========== UNBANALL ==========
        unbanall: {
            aliases: ['unbannall'],
            permissions: 'Administrator',
            description: 'Entbannt alle User / Unbans all users',
            category: 'Admin',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const confirmMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'warn', 'confirm', 'unbanall_confirm')] 
                });
                
                const filter = m => m.author.id === message.author.id && m.content === '!confirm';
                const collector = message.channel.createMessageCollector({ filter, time: 10000, max: 1 });
                
                collector.on('collect', async () => {
                    const bans = await message.guild.bans.fetch();
                    let count = 0;
                    
                    for (const ban of bans.values()) {
                        await message.guild.members.unban(ban.user.id).catch(() => {});
                        count++;
                    }
                    
                    await confirmMsg.edit({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'all_unbanned', 'unbanall_success', [count])] 
                    });
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await confirmMsg.edit({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'cancelled', 'nuke_cancelled')] 
                        });
                    }
                });
            }
        },
        
        // ========== UNJAILALL ==========
        unjailall: {
            aliases: ['unjailall'],
            permissions: 'Administrator',
            description: 'Entlässt alle aus Jail / Releases all from jail',
            category: 'Admin',
            async execute(message, args, { client }) {
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!jailRole) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'unjailall_no_role')] 
                    });
                }
                
                let count = 0;
                for (const [id, member] of jailRole.members) {
                    await member.roles.remove(jailRole);
                    count++;
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'all_released', 'unjailall_success', [count])] 
                });
            }
        },
        
        // ========== VANITY-URL ==========
        'vanity-url': {
            aliases: ['vanity', 'vurl'],
            permissions: 'Administrator',
            description: 'Zeigt Vanity-URL / Shows vanity URL',
            category: 'Admin',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                try {
                    const invite = await message.guild.fetchVanityData();
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'vanity_url', 'vanity_success', [invite.code, invite.uses])] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'vanity_url', 'vanity_error')] 
                    });
                }
            }
        },
        
        // ========== VERWARNUNG (REMIND) ==========
        verwarnung: {
            aliases: ['remind', 'reminder', 'erinnerung', 'rw'],
            description: 'Setzt eine Erinnerung / Sets a reminder',
            category: 'Admin',
            async execute(message, args, { client }) {
                const time = args[0];
                const reminder = args.slice(1).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!time || !reminder) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'remind_usage')] 
                    });
                }
                
                let ms = 0;
                if (time.endsWith('s')) ms = parseInt(time) * 1000;
                else if (time.endsWith('m')) ms = parseInt(time) * 60 * 1000;
                else if (time.endsWith('h')) ms = parseInt(time) * 60 * 60 * 1000;
                else if (time.endsWith('d')) ms = parseInt(time) * 24 * 60 * 60 * 1000;
                else ms = parseInt(time) * 1000;
                
                if (isNaN(ms) || ms <= 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_time', 'remind_invalid')] 
                    });
                }
                
                await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'reminder_set', 'remind_set', [time, reminder])] 
                });
                
                setTimeout(() => {
                    const triggerEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '⏰ Erinnerung' : '⏰ Reminder')
                        .setDescription(lang === 'de' ? `**${reminder}**\nVon: ${message.channel}` : `**${reminder}**\nFrom: ${message.channel}`)
                        .setTimestamp();
                    
                    message.author.send({ embeds: [triggerEmbed] }).catch(() => {
                        message.channel.send({ content: `${message.author}`, embeds: [triggerEmbed] });
                    });
                }, ms);
            }
        }
    }
};
