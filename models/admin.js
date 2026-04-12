module.exports = {
    category: 'Admin',
    subCommands: {
        
        // ========== ACTIVITY ==========
        activity: {
            aliases: ['act'],
            permissions: 'Administrator',
            description: 'Startet eine Aktivität im VC',
            category: 'Admin',
            async execute(message, args) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du musst in einem Voice-Channel sein!')] });
                
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
                    return message.reply({ embeds: [global.embed.error('Keine Aktivität', `Verfügbar: ${Object.keys(activities).join(', ')}`)] });
                }
                
                try {
                    await channel.createInvite({
                        targetApplication: activities[activity],
                        targetType: 2,
                        maxAge: 300
                    }).then(invite => {
                        message.reply({ embeds: [global.embed.success('Aktivität', `[Klick hier für ${activity}](https://discord.gg/${invite.code})`)] });
                    });
                } catch {
                    message.reply({ embeds: [global.embed.error('Fehler', 'Konnte Aktivität nicht starten!')] });
                }
            }
        },
        
        // ========== ANNOUNCE ==========
        announce: {
            aliases: ['ankündigung', 'say'],
            permissions: 'Administrator',
            description: 'Sendet eine Ankündigung',
            category: 'Admin',
            async execute(message, args) {
                const channel = message.mentions.channels.first();
                const text = args.slice(1).join(' ');
                
                if (!channel || !text) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!announce #channel <Text>')] });
                }
                
                await channel.send({ embeds: [{
                    color: 0xFFA500,
                    title: '📢 Ankündigung',
                    description: text,
                    footer: { text: `Von ${message.author.tag}` },
                    timestamp: new Date().toISOString()
                }] });
                
                message.reply({ embeds: [global.embed.success('Gesendet', `Ankündigung in ${channel} gesendet!`)] });
            }
        },
        
        // ========== ANTINUKE (MIT SUPABASE) ==========
        antinuke: {
            aliases: ['an'],
            permissions: 'Administrator',
            description: 'Anti-Nuke Einstellungen',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const punish = args[1]?.toLowerCase();
                
                if (action === 'on' || action === 'enable') {
                    const punishment = ['ban', 'kick', 'timeout'].includes(punish) ? punish : 'ban';
                    
                    await supabase.from('antinuke').upsert({
                        guild_id: message.guild.id,
                        enabled: true,
                        punish_action: punishment
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Antinuke aktiviert', `✅ Antinuke ist jetzt AKTIV!\nBestrafung: **${punishment}**`)] });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('antinuke').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Antinuke deaktiviert', '❌ Antinuke wurde deaktiviert!')] });
                }
                
                // Status anzeigen
                const { data } = await supabase
                    .from('antinuke')
                    .select('enabled, punish_action')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? '🟢 AKTIV' : '🔴 INAKTIV';
                const punishment = data?.punish_action || 'ban';
                
                return message.reply({ embeds: [global.embed.info('Antinuke Status', `Status: ${status}\nBestrafung: **${punishment}**\n\n**Nutze:**\n!antinuke on [ban/kick/timeout]\n!antinuke off`)] });
            }
        },
        
        // ========== ANTIRAID (MIT SUPABASE) ==========
        antiraid: {
            aliases: ['ar'],
            permissions: 'Administrator',
            description: 'Anti-Raid Einstellungen',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'on' || action === 'enable') {
                    const limit = parseInt(args[1]) || 5;
                    const window = parseInt(args[2]) || 10;
                    
                    await supabase.from('antiraid').upsert({
                        guild_id: message.guild.id,
                        enabled: true,
                        join_limit: limit,
                        time_window: window
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Antiraid aktiviert', `🛡️ Antiraid ist AKTIV!\nLimit: **${limit}** Joins in **${window}s**`)] });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('antiraid').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Antiraid deaktiviert', '🔓 Antiraid wurde deaktiviert!')] });
                }
                
                // Status anzeigen
                const { data } = await supabase
                    .from('antiraid')
                    .select('enabled, join_limit, time_window')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? '🟢 AKTIV' : '🔴 INAKTIV';
                const limit = data?.join_limit || 5;
                const window = data?.time_window || 10;
                
                return message.reply({ embeds: [global.embed.info('Antiraid Status', `Status: ${status}\nLimit: **${limit}** Joins in **${window}s**\n\n**Nutze:**\n!antiraid on [limit] [sekunden]\n!antiraid off`)] });
            }
        },
        
        // ========== AUTORESPONDER (MIT SUPABASE) ==========
        autoresponder: {
            aliases: ['arsp', 'autoreply'],
            permissions: 'Administrator',
            description: 'Auto-Responder verwalten',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const trigger = args[1]?.toLowerCase();
                const response = args.slice(2).join(' ');
                
                if (action === 'add') {
                    if (!trigger || !response) {
                        return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!autoresponder add <Trigger> <Antwort>')] });
                    }
                    
                    await supabase.from('autoresponder').upsert({
                        guild_id: message.guild.id,
                        trigger: trigger,
                        response: response
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Hinzugefügt', `✅ Trigger **"${trigger}"** → **"${response}"**`)] });
                }
                
                if (action === 'remove' || action === 'delete') {
                    if (!trigger) return message.reply({ embeds: [global.embed.error('Kein Trigger', '!autoresponder remove <Trigger>')] });
                    
                    const { error } = await supabase
                        .from('autoresponder')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('trigger', trigger);
                    
                    if (error) return message.reply({ embeds: [global.embed.error('Fehler', 'Trigger nicht gefunden!')] });
                    
                    return message.reply({ embeds: [global.embed.success('Entfernt', `Trigger **"${trigger}"** entfernt.`)] });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('autoresponder')
                        .select('trigger, response')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ embeds: [global.embed.info('Auto-Responder', 'Keine Einträge vorhanden.')] });
                    }
                    
                    const list = data.map(ar => `**${ar.trigger}** → ${ar.response}`).join('\n');
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '🤖 Auto-Responder',
                        description: list.slice(0, 4096)
                    }] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!autoresponder <add/remove/list>')] });
            }
        },
        
        // ========== CUSTOMIZE AVATAR ==========
        'customize avatar': {
            aliases: ['setavatar', 'botavatar'],
            permissions: 'Administrator',
            description: 'Ändert Bot-Avatar',
            category: 'Admin',
            async execute(message, args) {
                const url = args[0] || message.attachments.first()?.url;
                if (!url) return message.reply({ embeds: [global.embed.error('Kein Bild', '!customize avatar <URL> oder Bild anhängen')] });
                
                try {
                    await message.client.user.setAvatar(url);
                    message.reply({ embeds: [global.embed.success('Avatar geändert', 'Bot-Avatar wurde aktualisiert!')] });
                } catch {
                    message.reply({ embeds: [global.embed.error('Fehler', 'Konnte Avatar nicht ändern!')] });
                }
            }
        },
        
        // ========== CUSTOMIZE BANNER ==========
        'customize banner': {
            aliases: ['setbanner', 'botbanner'],
            permissions: 'Administrator',
            description: 'Ändert Bot-Banner',
            category: 'Admin',
            async execute(message, args) {
                const url = args[0] || message.attachments.first()?.url;
                if (!url) return message.reply({ embeds: [global.embed.error('Kein Bild', '!customize banner <URL>')] });
                
                try {
                    await message.client.user.setBanner(url);
                    message.reply({ embeds: [global.embed.success('Banner geändert', 'Bot-Banner wurde aktualisiert!')] });
                } catch {
                    message.reply({ embeds: [global.embed.error('Fehler', 'Konnte Banner nicht ändern!')] });
                }
            }
        },
        
        // ========== CUSTOMIZE BIO ==========
        'customize bio': {
            aliases: ['setbio', 'botbio'],
            permissions: 'Administrator',
            description: 'Ändert Bot-Bio',
            category: 'Admin',
            async execute(message) {
                return message.reply({ embeds: [global.embed.info('Bio', 'Bio kann nur manuell geändert werden.')] });
            }
        },
        
        // ========== CUSTOMIZE ==========
        customize: {
            aliases: ['custom'],
            permissions: 'Administrator',
            description: 'Bot-Customization',
            category: 'Admin',
            async execute(message) {
                return message.reply({ embeds: [global.embed.info('Customize', '`!customize avatar <URL>`\n`!customize banner <URL>`\n`!customize bio <Text>`')] });
            }
        },
        
        // ========== DISABLECOMMAND ==========
        disablecommand: {
            aliases: ['disable', 'cmdoff'],
            permissions: 'Administrator',
            description: 'Deaktiviert einen Befehl',
            category: 'Admin',
            async execute(message, args) {
                const cmd = args[0]?.toLowerCase();
                if (!cmd) return message.reply({ embeds: [global.embed.error('Kein Befehl', '!disablecommand <Befehl>')] });
                
                if (!message.client.commands.has(cmd)) {
                    return message.reply({ embeds: [global.embed.error('Nicht gefunden', `Befehl "${cmd}" existiert nicht!`)] });
                }
                
                message.client.disabledCommands = message.client.disabledCommands || new Set();
                message.client.disabledCommands.add(cmd);
                return message.reply({ embeds: [global.embed.success('Deaktiviert', `Befehl \`${cmd}\` wurde deaktiviert.`)] });
            }
        },
        
        // ========== ENABLECOMMAND ==========
        enablecommand: {
            aliases: ['enable', 'cmdon'],
            permissions: 'Administrator',
            description: 'Aktiviert einen Befehl',
            category: 'Admin',
            async execute(message, args) {
                const cmd = args[0]?.toLowerCase();
                if (!cmd) return message.reply({ embeds: [global.embed.error('Kein Befehl', '!enablecommand <Befehl>')] });
                
                message.client.disabledCommands = message.client.disabledCommands || new Set();
                message.client.disabledCommands.delete(cmd);
                return message.reply({ embeds: [global.embed.success('Aktiviert', `Befehl \`${cmd}\` wurde aktiviert.`)] });
            }
        },
        
        // ========== DMALL ==========
        dmall: {
            aliases: ['massdm'],
            permissions: 'Administrator',
            description: 'Sendet DM an alle Mitglieder',
            category: 'Admin',
            async execute(message) {
                return message.reply({ embeds: [global.embed.warn('Warnung', '⚠️ Mass-DM ist gefährlich und kann zum Bot-Bann führen!')] });
            }
        },
        
        // ========== FAKEPERMISSIONS ==========
        fakepermissions: {
            aliases: ['fakeperm'],
            permissions: 'Administrator',
            description: 'Zeigt Fake-Permissions',
            category: 'Admin',
            async execute(message, args) {
                const target = message.mentions.members.first() || message.member;
                const perms = target.permissions.toArray().map(p => p.replace(/_/g, ' ')).join('\n');
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🔧 Permissions von ${target.user.username}`,
                    description: perms.slice(0, 4096) || 'Keine',
                    footer: { text: 'Simulation - Echte Perms können abweichen' }
                }] });
            }
        },
        
        // ========== LISTPERMISSIONS ==========
        listpermissions: {
            aliases: ['listperm', 'perms'],
            permissions: 'Administrator',
            description: 'Listet alle Permissions',
            category: 'Admin',
            async execute(message) {
                const perms = [
                    'Administrator', 'BanMembers', 'KickMembers', 'ManageChannels',
                    'ManageMessages', 'ManageRoles', 'ManageNicknames', 'ManageWebhooks',
                    'ModerateMembers', 'MoveMembers', 'MuteMembers', 'DeafenMembers'
                ];
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: '📋 Verfügbare Permissions',
                    description: perms.join('\n')
                }] });
            }
        },
        
        // ========== NUKE ==========
        nuke: {
            aliases: ['nukechannel', 'reset'],
            permissions: 'Administrator',
            description: 'Nuked einen Channel',
            category: 'Admin',
            async execute(message) {
                const channel = message.mentions.channels.first() || message.channel;
                
                message.reply({ embeds: [global.embed.warn('Nuke', `⚠️ Bist du sicher? Schreibe \`!confirm\` innerhalb von 10 Sekunden.`)] });
                
                const filter = m => m.author.id === message.author.id && m.content === '!confirm';
                const collector = message.channel.createMessageCollector({ filter, time: 10000, max: 1 });
                
                collector.on('collect', async () => {
                    try {
                        const newChannel = await channel.clone();
                        await channel.delete();
                        newChannel.send({ embeds: [global.embed.success('Nuke', '💥 Channel wurde genuked!')] });
                    } catch {
                        message.reply({ embeds: [global.embed.error('Fehler', 'Konnte Channel nicht nuken!')] });
                    }
                });
                
                collector.on('end', (collected) => {
                    if (collected.size === 0) {
                        message.reply({ embeds: [global.embed.error('Abgebrochen', 'Nuke wurde abgebrochen.')] });
                    }
                });
            }
        },
        
        // ========== REACTION-SETUP ==========
        'reaction-setup': {
            aliases: ['reactsetup'],
            permissions: 'Administrator',
            description: 'Reaction-Role Setup',
            category: 'Admin',
            async execute(message) {
                return message.reply({ embeds: [global.embed.info('Reaction Setup', 'Nutze `!reactionroles add <msgID> <emoji> @Rolle`')] });
            }
        },
        
        // ========== REACTIONROLES (MIT SUPABASE) ==========
        reactionroles: {
            aliases: ['rr', 'reactrole'],
            permissions: 'Administrator',
            description: 'Reaction-Roles verwalten',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'add') {
                    const msgId = args[1];
                    const emoji = args[2];
                    const role = message.mentions.roles.first();
                    
                    if (!msgId || !emoji || !role) {
                        return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!reactionroles add <Nachrichten-ID> <Emoji> @Rolle')] });
                    }
                    
                    await supabase.from('reaction_roles').insert({
                        guild_id: message.guild.id,
                        message_id: msgId,
                        channel_id: message.channel.id,
                        emoji: emoji,
                        role_id: role.id
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Reaction-Role hinzugefügt', `${emoji} → ${role}`)] });
                }
                
                if (action === 'remove') {
                    const msgId = args[1];
                    const emoji = args[2];
                    
                    if (!msgId || !emoji) {
                        return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!reactionroles remove <Nachrichten-ID> <Emoji>')] });
                    }
                    
                    await supabase.from('reaction_roles')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('message_id', msgId)
                        .eq('emoji', emoji);
                    
                    return message.reply({ embeds: [global.embed.success('Reaction-Role entfernt', `${emoji} wurde entfernt.`)] });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('reaction_roles')
                        .select('message_id, emoji, role_id')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ embeds: [global.embed.info('Reaction Roles', 'Keine Einträge vorhanden.')] });
                    }
                    
                    const list = data.map(rr => `📝 ${rr.message_id}: ${rr.emoji} → <@&${rr.role_id}>`).join('\n');
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '🎭 Reaction Roles',
                        description: list.slice(0, 4096)
                    }] });
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!reactionroles <add/remove/list>')] });
            }
        },
        
        // ========== SERVERRULES ==========
        serverrules: {
            aliases: ['rules', 'regeln'],
            permissions: 'Administrator',
            description: 'Server-Regeln',
            category: 'Admin',
            async execute(message, args) {
                const rules = args.join(' ');
                
                if (!rules) {
                    return message.reply({ embeds: [global.embed.info('Server Regeln', 'Aktuelle Regeln wurden nicht gesetzt. Nutze `!serverrules <Regeln>`')] });
                }
                
                return message.reply({ embeds: [{
                    color: 0xFFA500,
                    title: '📜 Server Regeln',
                    description: rules,
                    footer: { text: `Gesetzt von ${message.author.tag}` }
                }] });
            }
        },
        
        // ========== SETTINGS (MIT SUPABASE) ==========
        settings: {
            aliases: ['config', 'einstellungen'],
            permissions: 'Administrator',
            description: 'Bot-Einstellungen',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const setting = args[0]?.toLowerCase();
                const value = args.slice(1).join(' ');
                
                const validSettings = ['prefix', 'log_channel', 'welcome_channel', 'welcome_message', 'leave_channel', 'leave_message'];
                
                if (setting && validSettings.includes(setting)) {
                    let updateData = { guild_id: message.guild.id };
                    
                    if (setting === 'prefix') updateData.prefix = value;
                    else if (setting.includes('channel')) {
                        const channel = message.mentions.channels.first();
                        if (!channel) return message.reply({ embeds: [global.embed.error('Kein Channel', `Erwähne einen Channel!`)] });
                        updateData[setting] = channel.id;
                    } else {
                        updateData[setting] = value;
                    }
                    
                    await supabase.from('bot_settings').upsert(updateData);
                    return message.reply({ embeds: [global.embed.success('Gespeichert', `${setting} = ${value || channel}`)] });
                }
                
                // Aktuelle Settings anzeigen
                const { data } = await supabase
                    .from('bot_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const prefix = data?.prefix || '!';
                const log = data?.log_channel ? `<#${data.log_channel}>` : '❌ Nicht gesetzt';
                const welcome = data?.welcome_channel ? `<#${data.welcome_channel}>` : '❌ Nicht gesetzt';
                const leave = data?.leave_channel ? `<#${data.leave_channel}>` : '❌ Nicht gesetzt';
                
                // Antinuke & Antiraid Status
                const { data: an } = await supabase.from('antinuke').select('enabled').eq('guild_id', message.guild.id).single();
                const { data: ar } = await supabase.from('antiraid').select('enabled').eq('guild_id', message.guild.id).single();
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: '⚙️ Bot Einstellungen',
                    fields: [
                        { name: 'Prefix', value: prefix, inline: true },
                        { name: 'Log Channel', value: log, inline: true },
                        { name: 'Welcome Channel', value: welcome, inline: true },
                        { name: 'Leave Channel', value: leave, inline: true },
                        { name: '🛡️ Antinuke', value: an?.enabled ? '🟢 An' : '🔴 Aus', inline: true },
                        { name: '🛡️ Antiraid', value: ar?.enabled ? '🟢 An' : '🔴 Aus', inline: true }
                    ],
                    footer: { text: '!settings <option> <wert> zum Ändern' }
                }] });
            }
        },
        
        // ========== STATUS ==========
        status: {
            aliases: ['setstatus', 'botstatus'],
            permissions: 'Administrator',
            description: 'Ändert Bot-Status',
            category: 'Admin',
            async execute(message, args) {
                const type = args[0]?.toLowerCase();
                const text = args.slice(1).join(' ');
                
                const types = {
                    playing: 0, play: 0, game: 0,
                    streaming: 1, stream: 1,
                    listening: 2, listen: 2,
                    watching: 3, watch: 3,
                    competing: 5, comp: 5
                };
                
                if (!types[type] && types[type] !== 0) {
                    return message.reply({ embeds: [global.embed.error('Falscher Typ', 'playing, streaming, listening, watching, competing')] });
                }
                
                if (!text) return message.reply({ embeds: [global.embed.error('Kein Text', '!status <Typ> <Text>')] });
                
                message.client.user.setActivity(text, { type: types[type] });
                message.reply({ embeds: [global.embed.success('Status geändert', `${type}: ${text}`)] });
            }
        },
        
        // ========== STICKYMESSAGE ==========
        stickymessage: {
            aliases: ['sticky', 'pinmsg'],
            permissions: 'Administrator',
            description: 'Setzt Sticky-Nachricht',
            category: 'Admin',
            async execute(message, args) {
                const channel = message.mentions.channels.first() || message.channel;
                const text = args.slice(1).join(' ') || args.join(' ');
                
                if (!text) return message.reply({ embeds: [global.embed.error('Kein Text', '!stickymessage [#channel] <Text>')] });
                
                message.reply({ embeds: [global.embed.success('Sticky gesetzt', `Nachricht in ${channel} wird angepinnt bleiben.`)] });
            }
        },
        
        // ========== STRIPSTAFF (MIT SUPABASE) ==========
        stripstaff: {
            aliases: ['removestaff'],
            permissions: 'Administrator',
            description: 'Entfernt Staff-Rollen',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                // Staff-Rolle hinzufügen/zum Speichern
                if (action === 'add') {
                    const role = message.mentions.roles.first();
                    if (!role) return message.reply({ embeds: [global.embed.error('Keine Rolle', '!stripstaff add @Rolle')] });
                    
                    await supabase.from('staff_roles').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id,
                        role_name: role.name
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Staff-Rolle hinzugefügt', `${role} wird als Staff-Rolle gespeichert.`)] });
                }
                
                // Staff-Rolle entfernen
                if (action === 'remove') {
                    const role = message.mentions.roles.first();
                    if (!role) return message.reply({ embeds: [global.embed.error('Keine Rolle', '!stripstaff remove @Rolle')] });
                    
                    await supabase.from('staff_roles')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('role_id', role.id);
                    
                    return message.reply({ embeds: [global.embed.success('Staff-Rolle entfernt', `${role} ist keine Staff-Rolle mehr.`)] });
                }
                
                // Staff-Rollen anzeigen
                if (action === 'list') {
                    const { data } = await supabase
                        .from('staff_roles')
                        .select('role_id, role_name')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ embeds: [global.embed.info('Staff-Rollen', 'Keine Staff-Rollen gespeichert.')] });
                    }
                    
                    const list = data.map(r => `<@&${r.role_id}> (${r.role_name})`).join('\n');
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '👮 Staff-Rollen',
                        description: list
                    }] });
                }
                
                // Staff von User entfernen
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!stripstaff @User\n!stripstaff add @Rolle\n!stripstaff remove @Rolle\n!stripstaff list')] });
                }
                
                // Gespeicherte Staff-Rollen holen
                const { data } = await supabase
                    .from('staff_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id);
                
                let staffRoles;
                if (data && data.length > 0) {
                    const roleIds = data.map(r => r.role_id);
                    staffRoles = target.roles.cache.filter(r => roleIds.includes(r.id));
                } else {
                    // Fallback: Alle Admin/Mod Rollen
                    staffRoles = target.roles.cache.filter(r => 
                        r.permissions.has('Administrator') || 
                        r.permissions.has('BanMembers') || 
                        r.permissions.has('KickMembers') ||
                        r.permissions.has('ManageMessages')
                    );
                }
                
                if (staffRoles.size === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Staff-Rollen', `${target} hat keine Staff-Rollen.`)] });
                }
                
                await target.roles.remove(staffRoles);
                message.reply({ embeds: [global.embed.success('Staff entfernt', `${staffRoles.size} Staff-Rollen von ${target} entfernt.`)] });
            }
        },
        
        // ========== UNBANALL ==========
        unbanall: {
            aliases: ['unbannall'],
            permissions: 'Administrator',
            description: 'Entbannt alle User',
            category: 'Admin',
            async execute(message) {
                message.reply({ embeds: [global.embed.warn('Unban All', '⚠️ Bist du sicher? Schreibe `!confirm`')] });
                
                const filter = m => m.author.id === message.author.id && m.content === '!confirm';
                const collector = message.channel.createMessageCollector({ filter, time: 10000, max: 1 });
                
                collector.on('collect', async () => {
                    const bans = await message.guild.bans.fetch();
                    let count = 0;
                    
                    for (const ban of bans.values()) {
                        await message.guild.members.unban(ban.user.id).catch(() => {});
                        count++;
                    }
                    
                    message.reply({ embeds: [global.embed.success('Alle entbannt', `${count} User wurden entbannt.`)] });
                });
            }
        },
        
        // ========== UNJAILALL ==========
        unjailall: {
            aliases: ['unjailall'],
            permissions: 'Administrator',
            description: 'Entlässt alle aus Jail',
            category: 'Admin',
            async execute(message) {
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                if (!jailRole) return message.reply({ embeds: [global.embed.error('Keine Jail-Rolle', 'Es existiert keine Jail-Rolle!')] });
                
                let count = 0;
                for (const [id, member] of jailRole.members) {
                    await member.roles.remove(jailRole);
                    count++;
                }
                
                message.reply({ embeds: [global.embed.success('Alle entlassen', `${count} User aus dem Jail entlassen.`)] });
            }
        },
        
        // ========== VANITY-URL ==========
        'vanity-url': {
            aliases: ['vanity', 'vurl'],
            permissions: 'Administrator',
            description: 'Zeigt Vanity-URL',
            category: 'Admin',
            async execute(message) {
                try {
                    const invite = await message.guild.fetchVanityData();
                    return message.reply({ embeds: [global.embed.info('Vanity URL', `**${invite.code}**\nNutzt: ${invite.uses} mal`)] });
                } catch {
                    return message.reply({ embeds: [global.embed.error('Keine Vanity', 'Dieser Server hat keine Vanity-URL! (Benötigt Boost Level 3)')] });
                }
            }
        },
        
        // ========== VERWARNUNG (REMIND) ==========
        verwarnung: {
            aliases: ['remind', 'reminder', 'erinnerung', 'rw'],
            description: 'Setzt eine Erinnerung',
            category: 'Admin',
            async execute(message, args) {
                const time = args[0];
                const reminder = args.slice(1).join(' ');
                
                if (!time || !reminder) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!remind <Zeit> <Nachricht>\nBeispiel: !remind 10m Pizza holen')] });
                }
                
                let ms = 0;
                if (time.endsWith('s')) ms = parseInt(time) * 1000;
                else if (time.endsWith('m')) ms = parseInt(time) * 60 * 1000;
                else if (time.endsWith('h')) ms = parseInt(time) * 60 * 60 * 1000;
                else if (time.endsWith('d')) ms = parseInt(time) * 24 * 60 * 60 * 1000;
                else ms = parseInt(time) * 1000;
                
                if (isNaN(ms) || ms <= 0) {
                    return message.reply({ embeds: [global.embed.error('Ungültige Zeit', 'Nutze: 10s, 5m, 2h, 1d')] });
                }
                
                message.reply({ embeds: [global.embed.success('Erinnerung gesetzt', `Ich erinnere dich in ${time} an: **${reminder}**`)] });
                
                setTimeout(() => {
                    message.author.send({ embeds: [global.embed.info('⏰ Erinnerung', `**${reminder}**\nVon: ${message.channel}`)] }).catch(() => {
                        message.channel.send({ content: `${message.author}`, embeds: [global.embed.info('⏰ Erinnerung', `**${reminder}**`)] });
                    });
                }, ms);
            }
        }
    }
};
