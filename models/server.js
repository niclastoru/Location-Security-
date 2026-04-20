const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        server: 0x0099FF,
        welcome: 0x00FF00
    };
    
    const titles = {
        de: {
            autorole: 'Auto-Role',
            autorole_set: 'Auto-Role gesetzt',
            autorole_removed: 'Auto-Role entfernt',
            whitelist: 'Whitelist',
            guild_whitelist: 'Guild Whitelist',
            prefix: 'Prefix',
            prefix_changed: 'Prefix geändert',
            prefix_reset: 'Prefix zurückgesetzt',
            current_prefix: 'Aktueller Prefix',
            ticket_panel: 'Ticket-Panel',
            ticket_created: 'Ticket-Panel erstellt',
            ticket_removed: 'Ticket-Panel entfernt',
            ticket_info: 'Ticket-Panel Info',
            vanity_role: 'Vanity-Role',
            vanity_set: 'Vanity-Role gesetzt',
            vanity_removed: 'Vanity-Role entfernt',
            welcome: 'Welcome',
            welcome_added: 'Welcome hinzugefügt',
            welcome_removed: 'Welcome entfernt',
            welcome_list: 'Welcome Nachrichten',
            welcome_view: 'Welcome',
            welcome_test: 'Welcome Test',
            test_sent: 'Test gesendet',
            welcome_help: 'Welcome Befehle',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info',
            invalid_usage: 'Falsche Nutzung'
        },
        en: {
            autorole: 'Auto-Role',
            autorole_set: 'Auto-Role Set',
            autorole_removed: 'Auto-Role Removed',
            whitelist: 'Whitelist',
            guild_whitelist: 'Guild Whitelist',
            prefix: 'Prefix',
            prefix_changed: 'Prefix Changed',
            prefix_reset: 'Prefix Reset',
            current_prefix: 'Current Prefix',
            ticket_panel: 'Ticket Panel',
            ticket_created: 'Ticket Panel Created',
            ticket_removed: 'Ticket Panel Removed',
            ticket_info: 'Ticket Panel Info',
            vanity_role: 'Vanity Role',
            vanity_set: 'Vanity Role Set',
            vanity_removed: 'Vanity Role Removed',
            welcome: 'Welcome',
            welcome_added: 'Welcome Added',
            welcome_removed: 'Welcome Removed',
            welcome_list: 'Welcome Messages',
            welcome_view: 'Welcome',
            welcome_test: 'Welcome Test',
            test_sent: 'Test Sent',
            welcome_help: 'Welcome Commands',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage'
        }
    };
    
    const descriptions = {
        de: {
            autorole_set: (role) => `${role} wird neuen Mitgliedern automatisch gegeben.`,
            autorole_removed: 'Auto-Role wurde deaktiviert.',
            autorole_current: (role) => `Aktuelle Auto-Role: <@&${role}>\n\n**Nutze:**\n!autorole set @Rolle\n!autorole remove`,
            autorole_none: 'Keine Auto-Role gesetzt.\n\n**Nutze:**\n!autorole set @Rolle',
            whitelist_added: (id) => `Server ${id} wurde zur Whitelist hinzugefügt.`,
            whitelist_removed: (id) => `Server ${id} wurde von der Whitelist entfernt.`,
            whitelist_empty: 'Keine Server auf der Whitelist.',
            whitelist_usage: '!guildwhitelist add <ServerID>\n!guildwhitelist remove <ServerID>\n!guildwhitelist list',
            prefix_no_prefix: '!prefix <NeuerPrefix>',
            prefix_too_long: 'Prefix darf maximal 5 Zeichen lang sein!',
            prefix_changed: (prefix) => `Neuer Prefix: **${prefix}**`,
            prefix_reset: 'Prefix wurde auf **!** zurückgesetzt.',
            current_prefix: (prefix) => `Der Prefix für diesen Server ist: **${prefix}**`,
            ticket_created: (channel) => `Panel wurde in ${channel} erstellt!`,
            ticket_removed: 'Ticket-Panel wurde gelöscht.',
            ticket_no_panel: 'Kein Ticket-Panel konfiguriert.\n\n**Nutze:**\n!ticketpanel create [#channel]\n!ticketpanel remove',
            ticket_channel: 'Channel',
            ticket_category: 'Kategorie',
            ticket_support: 'Support-Rolle',
            ticket_none: 'Keine',
            ticket_usage: '!ticketpanel create [#channel]\n!ticketpanel remove\n!ticketpanel info',
            vanity_set: (role) => `${role} wird bei Vanity-URL Join vergeben.`,
            vanity_removed: 'Vanity-Role wurde deaktiviert.',
            vanity_current: (role) => `Aktuelle Vanity-Role: <@&${role}>\n\n**Nutze:**\n!vanity-role set @Rolle\n!vanity-role remove`,
            vanity_none: 'Keine Vanity-Role gesetzt.\n\n**Nutze:**\n!vanity-role set @Rolle',
            welcome_add_usage: '!welcome-add #channel <Nachricht>\n\n**Platzhalter:** {user}, {user.mention}, {server}, {membercount}',
            welcome_added: (channel, msg) => `Nachricht in ${channel}:\n${msg}`,
            welcome_remove_usage: '!welcome-remove #channel',
            welcome_removed: (channel) => `Welcome-Nachricht in ${channel} wurde entfernt.`,
            welcome_not_found: 'Keine Welcome-Nachricht in diesem Channel gefunden.',
            welcome_empty: 'Keine Welcome-Nachrichten konfiguriert.',
            welcome_view_empty: (channel) => `Keine Welcome-Nachricht in ${channel} konfiguriert.`,
            welcome_test_none: 'Keine Welcome-Nachrichten konfiguriert!',
            welcome_test_sent: 'Welcome-Nachrichten wurden als Test gesendet!',
            welcome_test_title: '🧪 Welcome Test',
            welcome_help_text: '**!welcome-add** #channel <Nachricht>\n**!welcome-remove** #channel\n**!welcome-list**\n**!welcome-view** #channel\n**!welcome test**\n\n**Platzhalter:** {user}, {user.mention}, {server}, {membercount}',
            added_by: 'hinzugefügt'
        },
        en: {
            autorole_set: (role) => `${role} will be automatically given to new members.`,
            autorole_removed: 'Auto-Role has been disabled.',
            autorole_current: (role) => `Current Auto-Role: <@&${role}>\n\n**Usage:**\n!autorole set @Role\n!autorole remove`,
            autorole_none: 'No Auto-Role set.\n\n**Usage:**\n!autorole set @Role',
            whitelist_added: (id) => `Server ${id} has been added to the whitelist.`,
            whitelist_removed: (id) => `Server ${id} has been removed from the whitelist.`,
            whitelist_empty: 'No servers on the whitelist.',
            whitelist_usage: '!guildwhitelist add <ServerID>\n!guildwhitelist remove <ServerID>\n!guildwhitelist list',
            prefix_no_prefix: '!prefix <NewPrefix>',
            prefix_too_long: 'Prefix can be maximum 5 characters!',
            prefix_changed: (prefix) => `New prefix: **${prefix}**`,
            prefix_reset: 'Prefix reset to **!**',
            current_prefix: (prefix) => `The prefix for this server is: **${prefix}**`,
            ticket_created: (channel) => `Panel created in ${channel}!`,
            ticket_removed: 'Ticket panel has been removed.',
            ticket_no_panel: 'No ticket panel configured.\n\n**Usage:**\n!ticketpanel create [#channel]\n!ticketpanel remove',
            ticket_channel: 'Channel',
            ticket_category: 'Category',
            ticket_support: 'Support Role',
            ticket_none: 'None',
            ticket_usage: '!ticketpanel create [#channel]\n!ticketpanel remove\n!ticketpanel info',
            vanity_set: (role) => `${role} will be given on Vanity-URL join.`,
            vanity_removed: 'Vanity-Role has been disabled.',
            vanity_current: (role) => `Current Vanity-Role: <@&${role}>\n\n**Usage:**\n!vanity-role set @Role\n!vanity-role remove`,
            vanity_none: 'No Vanity-Role set.\n\n**Usage:**\n!vanity-role set @Role',
            welcome_add_usage: '!welcome-add #channel <Message>\n\n**Placeholders:** {user}, {user.mention}, {server}, {membercount}',
            welcome_added: (channel, msg) => `Message in ${channel}:\n${msg}`,
            welcome_remove_usage: '!welcome-remove #channel',
            welcome_removed: (channel) => `Welcome message in ${channel} has been removed.`,
            welcome_not_found: 'No welcome message found in this channel.',
            welcome_empty: 'No welcome messages configured.',
            welcome_view_empty: (channel) => `No welcome message configured in ${channel}.`,
            welcome_test_none: 'No welcome messages configured!',
            welcome_test_sent: 'Welcome messages have been sent as a test!',
            welcome_test_title: '🧪 Welcome Test',
            welcome_help_text: '**!welcome-add** #channel <Message>\n**!welcome-remove** #channel\n**!welcome-list**\n**!welcome-view** #channel\n**!welcome test**\n\n**Placeholders:** {user}, {user.mention}, {server}, {membercount}',
            added_by: 'added'
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
        .setColor(type === 'welcome' ? 0x00FF00 : type === 'server' ? 0x0099FF : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '🌐';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
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
    category: 'Server',
    subCommands: {
        
        // ========== AUTOROLE ==========
        autorole: {
            aliases: ['auto-role', 'joinrole'],
            permissions: 'Administrator',
            description: 'Setzt Auto-Rolle für neue Mitglieder / Sets auto-role for new members',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'set' && role) {
                    await supabase.from('autorole').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'autorole_set', 'autorole_set', [role.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('autorole').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'autorole_removed', 'autorole_removed')] 
                    });
                }
                
                const { data } = await supabase
                    .from('autorole')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'autorole', 'autorole_current', [data.role_id])] 
                    });
                } else {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'autorole', 'autorole_none')] 
                    });
                }
            }
        },
        
        // ========== GUILDWHITELIST ==========
        guildwhitelist: {
            aliases: ['guild-wl', 'serverwhitelist'],
            permissions: 'Administrator',
            description: 'Server-Whitelist verwalten / Manage server whitelist',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const targetGuildId = args[1];
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'add' && targetGuildId) {
                    await supabase.from('guild_whitelist').upsert({
                        guild_id: targetGuildId,
                        added_by: message.author.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'whitelist', 'whitelist_added', [targetGuildId])] 
                    });
                }
                
                if (action === 'remove' && targetGuildId) {
                    await supabase.from('guild_whitelist').delete().eq('guild_id', targetGuildId);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'whitelist', 'whitelist_removed', [targetGuildId])] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase.from('guild_whitelist').select('guild_id, added_by, created_at');
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'guild_whitelist', 'whitelist_empty')] 
                        });
                    }
                    
                    const list = data.map(g => `🆔 ${g.guild_id} (${lang === 'de' ? 'hinzugefügt' : 'added'} <t:${Math.floor(new Date(g.created_at).getTime() / 1000)}:R>)`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '📋 Guild Whitelist' : '📋 Guild Whitelist')
                        .setDescription(list.slice(0, 4096))
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'whitelist_usage')] 
                });
            }
        },
        
        // ========== PREFIX ==========
        prefix: {
            aliases: ['setprefix'],
            permissions: 'Administrator',
            description: 'Ändert den Bot-Prefix / Changes the bot prefix',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const newPrefix = args[0];
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!newPrefix) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'prefix', 'prefix_no_prefix')] 
                    });
                }
                
                if (newPrefix.length > 5) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'prefix', 'prefix_too_long')] 
                    });
                }
                
                console.log(`📝 Speichere Prefix: ${newPrefix} für Guild: ${message.guild.id}`);
                
                const { error } = await supabase
                    .from('custom_prefixes')
                    .upsert({
                        guild_id: message.guild.id,
                        prefix: newPrefix
                    }, { onConflict: 'guild_id' });
                
                if (error) {
                    console.error('❌ Prefix Save Error:', error);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'prefix_no_prefix')] 
                    });
                }
                
                client.prefixes.set(message.guild.id, newPrefix);
                console.log(`✅ Prefix gespeichert: ${newPrefix}`);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'prefix_changed', 'prefix_changed', [newPrefix])] 
                });
            }
        },
        
        // ========== PREFIX-REMOVE ==========
        'prefix-remove': {
            aliases: ['prefix-delete', 'resetprefix'],
            permissions: 'Administrator',
            description: 'Setzt Prefix auf Standard zurück / Resets prefix to default',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                await supabase.from('custom_prefixes').delete().eq('guild_id', message.guild.id);
                client.prefixes.set(message.guild.id, '!');
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'prefix_reset', 'prefix_reset')] 
                });
            }
        },
        
        // ========== PREFIX-VIEW ==========
        'prefix-view': {
            aliases: ['prefix-show', 'showprefix'],
            description: 'Zeigt aktuellen Prefix / Shows current prefix',
            category: 'Server',
            async execute(message, args, { client }) {
                const prefix = client.prefixes.get(message.guild.id) || '!';
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'current_prefix', 'current_prefix', [prefix])] 
                });
            }
        },
        
        // ========== TICKETPANEL ==========
        ticketpanel: {
            aliases: ['ticket-panel', 'ticketsetup'],
            permissions: 'Administrator',
            description: 'Erstellt Ticket-Panel / Creates ticket panel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'create' || action === 'setup') {
                    const channel = message.mentions.channels.first() || message.channel;
                    const category = message.mentions.channels.last();
                    const supportRole = message.mentions.roles.first();
                    
                    const panelEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '🎫 Ticket erstellen' : '🎫 Create Ticket')
                        .setDescription(lang === 'de' ? 'Klicke auf den Button um ein Ticket zu öffnen!' : 'Click the button to open a ticket!')
                        .setFooter({ text: message.guild.name })
                        .setTimestamp();
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('create_ticket')
                                .setLabel(lang === 'de' ? 'Ticket öffnen' : 'Open Ticket')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🎫')
                        );
                    
                    const msg = await channel.send({ embeds: [panelEmbed], components: [row] });
                    
                    await supabase.from('ticket_panels').insert({
                        guild_id: message.guild.id,
                        channel_id: channel.id,
                        message_id: msg.id,
                        category_id: category?.id || null,
                        support_role_id: supportRole?.id || null
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'ticket_created', 'ticket_created', [channel.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('ticket_panels').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'ticket_removed', 'ticket_removed')] 
                    });
                }
                
                if (action === 'info' || !action) {
                    const { data } = await supabase
                        .from('ticket_panels')
                        .select('*')
                        .eq('guild_id', message.guild.id)
                        .single();
                    
                    if (!data) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'ticket_panel', 'ticket_no_panel')] 
                        });
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '🎫 Ticket-Panel Info' : '🎫 Ticket Panel Info')
                        .addFields([
                            { name: lang === 'de' ? 'Channel' : 'Channel', value: `<#${data.channel_id}>`, inline: true },
                            { name: lang === 'de' ? 'Kategorie' : 'Category', value: data.category_id ? `<#${data.category_id}>` : (lang === 'de' ? 'Keine' : 'None'), inline: true },
                            { name: lang === 'de' ? 'Support-Rolle' : 'Support Role', value: data.support_role_id ? `<@&${data.support_role_id}>` : (lang === 'de' ? 'Keine' : 'None'), inline: true }
                        ])
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'ticket_usage')] 
                });
            }
        },
        
        // ========== VANITY-ROLE ==========
        'vanity-role': {
            aliases: ['vanityrole', 'vrole'],
            permissions: 'Administrator',
            description: 'Setzt Rolle für Vanity-URL Joins / Sets role for vanity URL joins',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'set' && role) {
                    await supabase.from('vanity_role').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'vanity_set', 'vanity_set', [role.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('vanity_role').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'vanity_removed', 'vanity_removed')] 
                    });
                }
                
                const { data } = await supabase
                    .from('vanity_role')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'vanity_role', 'vanity_current', [data.role_id])] 
                    });
                } else {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'vanity_role', 'vanity_none')] 
                    });
                }
            }
        },
        
        // ========== WELCOME-ADD ==========
        'welcome-add': {
            aliases: ['welcome-set', 'setwelcome'],
            permissions: 'Administrator',
            description: 'Fügt Welcome-Nachricht hinzu / Adds welcome message',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                const welcomeMessage = args.slice(1).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel || !welcomeMessage) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_add_usage')] 
                    });
                }
                
                console.log(`📝 Welcome Add: Channel=${channel.id} (${channel.name}), Message=${welcomeMessage}`);
                
                const { data: existing } = await supabase
                    .from('welcome_messages')
                    .select('id')
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id)
                    .maybeSingle();
                
                let result;
                if (existing) {
                    console.log('📝 Update existing welcome');
                    result = await supabase
                        .from('welcome_messages')
                        .update({ message: welcomeMessage })
                        .eq('guild_id', message.guild.id)
                        .eq('channel_id', channel.id);
                } else {
                    console.log('📝 Insert new welcome');
                    result = await supabase
                        .from('welcome_messages')
                        .insert({
                            guild_id: message.guild.id,
                            channel_id: channel.id,
                            message: welcomeMessage,
                            embed_color: '#00FF00'
                        });
                }
                
                if (result.error) {
                    console.error('❌ Welcome Save Error:', result.error);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'welcome_not_found')] 
                    });
                }
                
                console.log('✅ Welcome gespeichert!');
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'welcome_added', 'welcome_added', [channel.toString(), welcomeMessage])] 
                });
            }
        },
        
        // ========== WELCOME-REMOVE ==========
        'welcome-remove': {
            aliases: ['welcome-delete', 'delwelcome'],
            permissions: 'Administrator',
            description: 'Entfernt Welcome-Nachricht / Removes welcome message',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_remove_usage')] 
                    });
                }
                
                const { error } = await supabase
                    .from('welcome_messages')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id);
                
                if (error) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'welcome_not_found')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'welcome_removed', 'welcome_removed', [channel.toString()])] 
                });
            }
        },
        
        // ========== WELCOME-LIST ==========
        'welcome-list': {
            aliases: ['welcomes', 'listwelcome'],
            permissions: 'Administrator',
            description: 'Listet alle Welcome-Nachrichten / Lists all welcome messages',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data, error } = await supabase
                    .from('welcome_messages')
                    .select('*')
                    .eq('guild_id', message.guild.id);
                
                console.log('Welcome Data:', data);
                if (error) console.error('Welcome Error:', error);
                
                if (!data || data.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_list', 'welcome_empty')] 
                    });
                }
                
                const list = data.map(w => `📝 <#${w.channel_id}>\n${w.message}`).join('\n\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '👋 Welcome Nachrichten' : '👋 Welcome Messages')
                    .setDescription(list.slice(0, 4096))
                    .setFooter({ text: `${data.length} ${lang === 'de' ? 'Nachrichten' : 'messages'}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== WELCOME-VIEW ==========
        'welcome-view': {
            aliases: ['welcome-show', 'showwelcome'],
            permissions: 'Administrator',
            description: 'Zeigt Welcome-Nachricht eines Channels / Shows welcome message of a channel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_remove_usage')] 
                    });
                }
                
                const { data, error } = await supabase
                    .from('welcome_messages')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id)
                    .single();
                
                console.log('Welcome View Data:', data);
                if (error) console.error('Welcome View Error:', error);
                
                if (!data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_view', 'welcome_view_empty', [channel.toString()])] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(parseInt(data.embed_color?.replace('#', '') || '00FF00', 16))
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `👋 Welcome in ${channel.name}` : `👋 Welcome to ${channel.name}`)
                    .setDescription(data.message)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                if (data.image_url) embed.setImage(data.image_url);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== WELCOME ==========
        welcome: {
            aliases: ['welcome-info'],
            permissions: 'Administrator',
            description: 'Welcome-Infos & Test / Welcome info & test',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'test') {
                    const { data } = await supabase
                        .from('welcome_messages')
                        .select('channel_id, message')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'welcome', 'welcome_test_none')] 
                        });
                    }
                    
                    for (const w of data) {
                        const channel = message.guild.channels.cache.get(w.channel_id);
                        if (channel) {
                            const testMessage = w.message
                                .replace(/{user}/g, message.author.username)
                                .replace(/{user.mention}/g, message.author.toString())
                                .replace(/{server}/g, message.guild.name)
                                .replace(/{membercount}/g, message.guild.memberCount);
                            
                            const embed = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                                .setTitle(lang === 'de' ? '🧪 Welcome Test' : '🧪 Welcome Test')
                                .setDescription(testMessage)
                                .setTimestamp();
                            
                            await channel.send({ embeds: [embed] });
                        }
                    }
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'test_sent', 'welcome_test_sent')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_help', 'welcome_help_text')] 
                });
            }
        }
    }
};
