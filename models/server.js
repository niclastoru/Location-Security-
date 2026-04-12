module.exports = {
    category: 'Server',
    subCommands: {
        
        // ========== AUTOROLE ==========
        autorole: {
            aliases: ['auto-role', 'joinrole'],
            permissions: 'Administrator',
            description: 'Setzt Auto-Rolle für neue Mitglieder',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                
                if (action === 'set' && role) {
                    await supabase.from('autorole').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Auto-Role gesetzt', `${role} wird neuen Mitgliedern automatisch gegeben.`)] });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('autorole').delete().eq('guild_id', message.guild.id);
                    return message.reply({ embeds: [global.embed.success('Auto-Role entfernt', 'Auto-Role wurde deaktiviert.')] });
                }
                
                // Status anzeigen
                const { data } = await supabase
                    .from('autorole')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (data) {
                    return message.reply({ embeds: [global.embed.info('Auto-Role', `Aktuelle Auto-Role: <@&${data.role_id}>\n\n**Nutze:**\n!autorole set @Rolle\n!autorole remove`)] });
                } else {
                    return message.reply({ embeds: [global.embed.info('Auto-Role', 'Keine Auto-Role gesetzt.\n\n**Nutze:**\n!autorole set @Rolle')] });
                }
            }
        },
        
        // ========== GUILDWHITELIST ==========
        guildwhitelist: {
            aliases: ['guild-wl', 'serverwhitelist'],
            permissions: 'Administrator',
            description: 'Server-Whitelist verwalten',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const targetGuildId = args[1];
                
                if (action === 'add' && targetGuildId) {
                    await supabase.from('guild_whitelist').upsert({
                        guild_id: targetGuildId,
                        added_by: message.author.id
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Whitelist', `Server ${targetGuildId} wurde zur Whitelist hinzugefügt.`)] });
                }
                
                if (action === 'remove' && targetGuildId) {
                    await supabase.from('guild_whitelist').delete().eq('guild_id', targetGuildId);
                    return message.reply({ embeds: [global.embed.success('Whitelist', `Server ${targetGuildId} wurde von der Whitelist entfernt.`)] });
                }
                
                if (action === 'list') {
                    const { data } = await supabase.from('guild_whitelist').select('guild_id, added_by, created_at');
                    
                    if (!data || data.length === 0) {
                        return message.reply({ embeds: [global.embed.info('Whitelist', 'Keine Server auf der Whitelist.')] });
                    }
                    
                    const list = data.map(g => `🆔 ${g.guild_id} (hinzugefügt <t:${Math.floor(new Date(g.created_at).getTime() / 1000)}:R>)`).join('\n');
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '📋 Guild Whitelist',
                        description: list.slice(0, 4096)
                    }] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!guildwhitelist add <ServerID>\n!guildwhitelist remove <ServerID>\n!guildwhitelist list')] });
            }
        },
        
        // ========== PREFIX ==========
        prefix: {
            aliases: ['setprefix'],
            permissions: 'Administrator',
            description: 'Ändert den Bot-Prefix',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const newPrefix = args[0];
                
                if (!newPrefix) {
                    return message.reply({ embeds: [global.embed.error('Kein Prefix', '!prefix <NeuerPrefix>')] });
                }
                
                if (newPrefix.length > 5) {
                    return message.reply({ embeds: [global.embed.error('Zu lang', 'Prefix darf maximal 5 Zeichen lang sein!')] });
                }
                
                await supabase.from('custom_prefixes').upsert({
                    guild_id: message.guild.id,
                    prefix: newPrefix
                });
                
                return message.reply({ embeds: [global.embed.success('Prefix geändert', `Neuer Prefix: **${newPrefix}**`)] });
            }
        },
        
        // ========== PREFIX-REMOVE ==========
        'prefix-remove': {
            aliases: ['prefix-delete', 'resetprefix'],
            permissions: 'Administrator',
            description: 'Setzt Prefix auf Standard zurück',
            category: 'Server',
            async execute(message, args, { supabase }) {
                await supabase.from('custom_prefixes').delete().eq('guild_id', message.guild.id);
                
                return message.reply({ embeds: [global.embed.success('Prefix zurückgesetzt', 'Prefix wurde auf **!** zurückgesetzt.')] });
            }
        },
        
        // ========== PREFIX-VIEW ==========
        'prefix-view': {
            aliases: ['prefix-show', 'showprefix'],
            description: 'Zeigt aktuellen Prefix',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('custom_prefixes')
                    .select('prefix')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const prefix = data?.prefix || '!';
                
                return message.reply({ embeds: [global.embed.info('Aktueller Prefix', `Der Prefix für diesen Server ist: **${prefix}**`)] });
            }
        },
        
        // ========== TICKETPANEL ==========
        ticketpanel: {
            aliases: ['ticket-panel', 'ticketsetup'],
            permissions: 'Administrator',
            description: 'Erstellt Ticket-Panel',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'create' || action === 'setup') {
                    const channel = message.mentions.channels.first() || message.channel;
                    const category = message.mentions.channels.last();
                    const supportRole = message.mentions.roles.first();
                    
                    const panelEmbed = {
                        color: 0x0099FF,
                        title: '🎫 Ticket erstellen',
                        description: 'Klicke auf den Button um ein Ticket zu öffnen!',
                        footer: { text: message.guild.name }
                    };
                    
                    const row = {
                        type: 1,
                        components: [{
                            type: 2,
                            style: 1,
                            label: 'Ticket öffnen',
                            custom_id: 'create_ticket',
                            emoji: { name: '🎫' }
                        }]
                    };
                    
                    const msg = await channel.send({ embeds: [panelEmbed], components: [row] });
                    
                    await supabase.from('ticket_panels').insert({
                        guild_id: message.guild.id,
                        channel_id: channel.id,
                        message_id: msg.id,
                        category_id: category?.id || null,
                        support_role_id: supportRole?.id || null
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Ticket-Panel erstellt', `Panel wurde in ${channel} erstellt!`)] });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('ticket_panels').delete().eq('guild_id', message.guild.id);
                    return message.reply({ embeds: [global.embed.success('Ticket-Panel entfernt', 'Ticket-Panel wurde gelöscht.')] });
                }
                
                if (action === 'info' || !action) {
                    const { data } = await supabase
                        .from('ticket_panels')
                        .select('*')
                        .eq('guild_id', message.guild.id)
                        .single();
                    
                    if (!data) {
                        return message.reply({ embeds: [global.embed.info('Ticket-Panel', 'Kein Ticket-Panel konfiguriert.\n\n**Nutze:**\n!ticketpanel create [#channel]\n!ticketpanel remove')] });
                    }
                    
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '🎫 Ticket-Panel Info',
                        fields: [
                            { name: 'Channel', value: `<#${data.channel_id}>`, inline: true },
                            { name: 'Kategorie', value: data.category_id ? `<#${data.category_id}>` : 'Keine', inline: true },
                            { name: 'Support-Rolle', value: data.support_role_id ? `<@&${data.support_role_id}>` : 'Keine', inline: true }
                        ]
                    }] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!ticketpanel create [#channel]\n!ticketpanel remove\n!ticketpanel info')] });
            }
        },
        
        // ========== VANITY-ROLE ==========
        'vanity-role': {
            aliases: ['vanityrole', 'vrole'],
            permissions: 'Administrator',
            description: 'Setzt Rolle für Vanity-URL Joins',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                
                if (action === 'set' && role) {
                    await supabase.from('vanity_role').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Vanity-Role gesetzt', `${role} wird bei Vanity-URL Join vergeben.`)] });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('vanity_role').delete().eq('guild_id', message.guild.id);
                    return message.reply({ embeds: [global.embed.success('Vanity-Role entfernt', 'Vanity-Role wurde deaktiviert.')] });
                }
                
                const { data } = await supabase
                    .from('vanity_role')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (data) {
                    return message.reply({ embeds: [global.embed.info('Vanity-Role', `Aktuelle Vanity-Role: <@&${data.role_id}>\n\n**Nutze:**\n!vanity-role set @Rolle\n!vanity-role remove`)] });
                } else {
                    return message.reply({ embeds: [global.embed.info('Vanity-Role', 'Keine Vanity-Role gesetzt.\n\n**Nutze:**\n!vanity-role set @Rolle')] });
                }
            }
        },
        
        // ========== WELCOME-ADD ==========
        'welcome-add': {
            aliases: ['welcome-set', 'setwelcome'],
            permissions: 'Administrator',
            description: 'Fügt Welcome-Nachricht hinzu',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first();
                const welcomeMessage = args.slice(1).join(' ');
                
                if (!channel || !welcomeMessage) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!welcome-add #channel <Nachricht>\n\n**Platzhalter:** {user}, {user.mention}, {server}, {membercount}')] });
                }
                
                await supabase.from('welcome_messages').insert({
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    message: welcomeMessage
                });
                
                return message.reply({ embeds: [global.embed.success('Welcome hinzugefügt', `Nachricht in ${channel}:\n${welcomeMessage}`)] });
            }
        },
        
        // ========== WELCOME-REMOVE ==========
        'welcome-remove': {
            aliases: ['welcome-delete', 'delwelcome'],
            permissions: 'Administrator',
            description: 'Entfernt Welcome-Nachricht',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({ embeds: [global.embed.error('Kein Channel', '!welcome-remove #channel')] });
                }
                
                const { error } = await supabase
                    .from('welcome_messages')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id);
                
                if (error) {
                    return message.reply({ embeds: [global.embed.error('Fehler', 'Keine Welcome-Nachricht in diesem Channel gefunden.')] });
                }
                
                return message.reply({ embeds: [global.embed.success('Welcome entfernt', `Welcome-Nachricht in ${channel} wurde entfernt.`)] });
            }
        },
        
        // ========== WELCOME-LIST ==========
        'welcome-list': {
            aliases: ['welcomes', 'listwelcome'],
            permissions: 'Administrator',
            description: 'Listet alle Welcome-Nachrichten',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const { data } = await supabase
                    .from('welcome_messages')
                    .select('channel_id, message')
                    .eq('guild_id', message.guild.id);
                
                if (!data || data.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Welcome', 'Keine Welcome-Nachrichten konfiguriert.')] });
                }
                
                const list = data.map(w => `📝 <#${w.channel_id}>\n${w.message}`).join('\n\n');
                
                return message.reply({ embeds: [{
                    color: 0x00FF00,
                    title: '👋 Welcome Nachrichten',
                    description: list.slice(0, 4096)
                }] });
            }
        },
        
        // ========== WELCOME-VIEW ==========
        'welcome-view': {
            aliases: ['welcome-show', 'showwelcome'],
            permissions: 'Administrator',
            description: 'Zeigt Welcome-Nachricht eines Channels',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({ embeds: [global.embed.error('Kein Channel', '!welcome-view #channel')] });
                }
                
                const { data } = await supabase
                    .from('welcome_messages')
                    .select('message, embed_color, image_url')
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id)
                    .single();
                
                if (!data) {
                    return message.reply({ embeds: [global.embed.info('Welcome', `Keine Welcome-Nachricht in ${channel} konfiguriert.`)] });
                }
                
                return message.reply({ embeds: [{
                    color: parseInt(data.embed_color?.replace('#', '') || '00FF00', 16),
                    title: `👋 Welcome in ${channel.name}`,
                    description: data.message,
                    image: data.image_url ? { url: data.image_url } : null
                }] });
            }
        },
        
        // ========== WELCOME (Test/Info) ==========
        welcome: {
            aliases: ['welcome-info'],
            permissions: 'Administrator',
            description: 'Welcome-Infos & Test',
            category: 'Server',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'test') {
                    const { data } = await supabase
                        .from('welcome_messages')
                        .select('channel_id, message')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ embeds: [global.embed.error('Keine Welcome', 'Keine Welcome-Nachrichten konfiguriert!')] });
                    }
                    
                    for (const w of data) {
                        const channel = message.guild.channels.cache.get(w.channel_id);
                        if (channel) {
                            const testMessage = w.message
                                .replace(/{user}/g, message.author.username)
                                .replace(/{user.mention}/g, message.author.toString())
                                .replace(/{server}/g, message.guild.name)
                                .replace(/{membercount}/g, message.guild.memberCount);
                            
                            await channel.send({ embeds: [{
                                color: 0x00FF00,
                                title: '🧪 Welcome Test',
                                description: testMessage
                            }] });
                        }
                    }
                    
                    return message.reply({ embeds: [global.embed.success('Test gesendet', 'Welcome-Nachrichten wurden als Test gesendet!')] });
                }
                
                return message.reply({ embeds: [global.embed.info('Welcome Befehle', 
                    '**!welcome-add** #channel <Nachricht>\n' +
                    '**!welcome-remove** #channel\n' +
                    '**!welcome-list**\n' +
                    '**!welcome-view** #channel\n' +
                    '**!welcome test**\n\n' +
                    '**Platzhalter:** {user}, {user.mention}, {server}, {membercount}'
                )] });
            }
        }
    }
};
