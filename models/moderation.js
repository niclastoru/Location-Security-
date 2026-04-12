module.exports = {
    category: 'Moderation',
    subCommands: {
        
        // ========== BAN ==========
        ban: {
            permissions: 'BanMembers',
            description: 'Bannt einen User permanent',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!ban @User [Grund] oder !ban ID [Grund]')] });
                if (!target.bannable) return message.reply({ embeds: [global.embed.error('Keine Rechte', 'Ich kann diesen User nicht bannen!')] });
                
                const reason = args.slice(1).join(' ') || 'Kein Grund angegeben';
                await target.ban({ reason });
                return message.reply({ embeds: [global.embed.success('User gebannt', `${target.user.tag} wurde gebannt.\n**Grund:** ${reason}`)] });
            }
        },
        
        // ========== UNBAN ==========
        unban: {
            permissions: 'BanMembers',
            description: 'Entbannt einen User',
            category: 'Moderation',
            async execute(message, args) {
                const userId = args[0];
                if (!userId) return message.reply({ embeds: [global.embed.error('Keine ID', '!unban <UserID>')] });
                
                try {
                    await message.guild.members.unban(userId);
                    return message.reply({ embeds: [global.embed.success('User entbannt', `User mit ID ${userId} wurde entbannt.`)] });
                } catch {
                    return message.reply({ embeds: [global.embed.error('Fehler', 'User nicht gefunden oder nicht gebannt.')] });
                }
            }
        },
        
        // ========== KICK ==========
        kick: {
            permissions: 'KickMembers',
            description: 'Kickt einen User vom Server',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!kick @User [Grund]')] });
                if (!target.kickable) return message.reply({ embeds: [global.embed.error('Keine Rechte', 'Ich kann diesen User nicht kicken!')] });
                
                const reason = args.slice(1).join(' ') || 'Kein Grund angegeben';
                await target.kick(reason);
                return message.reply({ embeds: [global.embed.success('User gekickt', `${target.user.tag} wurde gekickt.\n**Grund:** ${reason}`)] });
            }
        },
        
        // ========== TIMEOUT ==========
        timeout: {
            aliases: ['mute'],
            permissions: 'ModerateMembers',
            description: 'Timeout für einen User',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!timeout @User <Minuten> [Grund]')] });
                
                const minutes = parseInt(args[1]);
                if (isNaN(minutes) || minutes < 1 || minutes > 40320) {
                    return message.reply({ embeds: [global.embed.error('Ungültige Zeit', '1-40320 Minuten (28 Tage)!')] });
                }
                
                const reason = args.slice(2).join(' ') || 'Kein Grund';
                await target.timeout(minutes * 60 * 1000, reason);
                return message.reply({ embeds: [global.embed.success('Timeout gesetzt', `${target} für ${minutes} Minuten.\n**Grund:** ${reason}`)] });
            }
        },
        
        // ========== UNTIMEOUT ==========
        untimeout: {
            aliases: ['unmute'],
            permissions: 'ModerateMembers',
            description: 'Timeout entfernen',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!untimeout @User')] });
                if (!target.communicationDisabledUntil) {
                    return message.reply({ embeds: [global.embed.info('Kein Timeout', `${target} hat keinen aktiven Timeout.`)] });
                }
                
                await target.timeout(null);
                return message.reply({ embeds: [global.embed.success('Timeout entfernt', `Timeout für ${target} wurde aufgehoben.`)] });
            }
        },
        
        // ========== ROLE (mit Auto-Erkennung!) ==========
        role: {
            aliases: ['r'],
            permissions: 'ManageRoles',
            description: 'Rolle hinzufügen/entfernen (automatisch)',
            category: 'Moderation',
            async execute(message, args) {
                // !r @User Rolle
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!r @User <Rollenname>')] });
                
                const roleName = args.slice(1).join(' ');
                if (!roleName) return message.reply({ embeds: [global.embed.error('Keine Rolle', '!r @User <Rollenname>')] });
                
                const role = message.guild.roles.cache.find(r => 
                    r.name.toLowerCase() === roleName.toLowerCase() ||
                    r.id === roleName.replace(/\D/g, '')
                );
                
                if (!role) return message.reply({ embeds: [global.embed.error('Rolle nicht gefunden', `"${roleName}" existiert nicht.`)] });
                
                // Bot-Rechte check
                if (role.position >= message.guild.members.me.roles.highest.position) {
                    return message.reply({ embeds: [global.embed.error('Keine Rechte', 'Ich kann diese Rolle nicht verwalten!')] });
                }
                
                // User-Rechte check
                if (role.position >= message.member.roles.highest.position) {
                    return message.reply({ embeds: [global.embed.error('Keine Rechte', 'Du kannst diese Rolle nicht verwalten!')] });
                }
                
                // ⭐ AUTOMATISCHE ERKENNUNG: Hat User die Rolle?
                if (target.roles.cache.has(role.id)) {
                    // Rolle ENTFERNEN
                    await target.roles.remove(role);
                    return message.reply({ embeds: [global.embed.success('Rolle entfernt', `❌ ${role} von ${target} entfernt.`)] });
                } else {
                    // Rolle HINZUFÜGEN
                    await target.roles.add(role);
                    return message.reply({ embeds: [global.embed.success('Rolle hinzugefügt', `✅ ${role} an ${target} vergeben.`)] });
                }
            }
        },
        
        // ========== ROLES (alle Rollen eines Users anzeigen) ==========
        roles: {
            permissions: 'ManageRoles',
            description: 'Zeigt alle Rollen eines Users',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first() || message.member;
                const roles = target.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position);
                const roleList = roles.map(r => `${r}`).join(', ') || 'Keine Rollen';
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `📋 Rollen von ${target.user.username}`,
                    description: roleList,
                    footer: { text: `${roles.size} Rollen` }
                }] });
            }
        },
        
        // ========== NICKNAME ==========
        nickname: {
            aliases: ['nick'],
            permissions: 'ManageNicknames',
            description: 'Ändert Nickname eines Users',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!nickname @User <Name>')] });
                
                const nick = args.slice(1).join(' ') || '';
                await target.setNickname(nick || null);
                return message.reply({ embeds: [global.embed.success('Nickname geändert', nick ? `${target} heißt jetzt **${nick}**` : `Nickname von ${target} entfernt.`)] });
            }
        },
        
        // ========== CLEARNICK ==========
        clearnick: {
            permissions: 'ManageNicknames',
            description: 'Entfernt Nickname',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first() || message.member;
                await target.setNickname(null);
                return message.reply({ embeds: [global.embed.success('Nickname entfernt', `Nickname von ${target} wurde zurückgesetzt.`)] });
            }
        },
        
        // ========== PURGE ==========
        purge: {
            aliases: ['clear'],
            permissions: 'ManageMessages',
            description: 'Löscht Nachrichten',
            category: 'Moderation',
            async execute(message, args) {
                const amount = parseInt(args[0]);
                if (isNaN(amount) || amount < 1 || amount > 100) {
                    return message.reply({ embeds: [global.embed.error('Ungültig', '1-100 Nachrichten!')] });
                }
                
                const deleted = await message.channel.bulkDelete(amount, true);
                const msg = await message.channel.send({ 
                    embeds: [global.embed.success('Gelöscht', `${deleted.size} Nachrichten entfernt.`)] 
                });
                setTimeout(() => msg.delete(), 3000);
            }
        },
        
        // ========== LOCK ==========
        lock: {
            permissions: 'ManageChannels',
            description: 'Sperrt den Channel',
            category: 'Moderation',
            async execute(message) {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
                return message.reply({ embeds: [global.embed.success('Channel gesperrt', `${message.channel} ist jetzt gesperrt.`)] });
            }
        },
        
        // ========== UNLOCK ==========
        unlock: {
            permissions: 'ManageChannels',
            description: 'Entsperrt den Channel',
            category: 'Moderation',
            async execute(message) {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
                return message.reply({ embeds: [global.embed.success('Channel entsperrt', `${message.channel} ist jetzt entsperrt.`)] });
            }
        },
        
        // ========== SLOWMODE ==========
        slowmode: {
            permissions: 'ManageChannels',
            description: 'Setzt Slowmode',
            category: 'Moderation',
            async execute(message, args) {
                const seconds = parseInt(args[0]);
                if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
                    return message.reply({ embeds: [global.embed.error('Ungültig', '0-21600 Sekunden (6 Stunden)!')] });
                }
                
                await message.channel.setRateLimitPerUser(seconds);
                return message.reply({ embeds: [global.embed.success('Slowmode', seconds === 0 ? 'Slowmode deaktiviert.' : `Slowmode: ${seconds} Sekunden.`)] });
            }
        },
        
        // ========== WARN ==========
        warn: {
            permissions: 'ModerateMembers',
            description: 'Verwarnt einen User',
            category: 'Moderation',
            async execute(message, args, { supabase }) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!warn @User [Grund]')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Fehler', 'Du kannst dich nicht selbst verwarnen!')] });
                
                const reason = args.slice(1).join(' ') || 'Kein Grund';
                
                // In Supabase speichern
                const { error } = await supabase.from('warns').insert({
                    user_id: target.id,
                    moderator_id: message.author.id,
                    reason: reason,
                    guild_id: message.guild.id
                });
                
                if (error) console.error(error);
                
                return message.reply({ embeds: [global.embed.warn('Verwarnt', `${target} wurde verwarnt.\n**Grund:** ${reason}`)] });
            }
        },
        
        // ========== JAIL ==========
        jail: {
            permissions: 'ManageRoles',
            description: 'Sperrt User in Jail-Rolle',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!jail @User [Grund]')] });
                
                // Jail-Rolle finden oder erstellen
                let jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                if (!jailRole) {
                    jailRole = await message.guild.roles.create({
                        name: 'Jail',
                        color: 0x808080,
                        reason: 'Jail-Rolle für Mutes'
                    });
                    
                    // Channel-Permissions für Jail-Rolle setzen
                    message.guild.channels.cache.forEach(channel => {
                        channel.permissionOverwrites.create(jailRole, { SendMessages: false, AddReactions: false });
                    });
                }
                
                const reason = args.slice(1).join(' ') || 'Kein Grund';
                await target.roles.add(jailRole, reason);
                return message.reply({ embeds: [global.embed.success('Eingesperrt', `${target} ist jetzt im Jail.\n**Grund:** ${reason}`)] });
            }
        },
        
        // ========== UNJAIL ==========
        unjail: {
            permissions: 'ManageRoles',
            description: 'Entlässt aus Jail',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!unjail @User')] });
                
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                if (!jailRole) return message.reply({ embeds: [global.embed.error('Keine Jail-Rolle', 'Es existiert keine Jail-Rolle!')] });
                
                await target.roles.remove(jailRole);
                return message.reply({ embeds: [global.embed.success('Entlassen', `${target} wurde aus dem Jail entlassen.`)] });
            }
        },
        
        // ========== JAIL-LIST ==========
        'jail-list': {
            permissions: 'ManageRoles',
            description: 'Zeigt User im Jail',
            category: 'Moderation',
            async execute(message) {
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                if (!jailRole) return message.reply({ embeds: [global.embed.info('Jail leer', 'Keine Jail-Rolle vorhanden.')] });
                
                const jailed = jailRole.members.map(m => `${m.user.tag}`).join('\n') || 'Keine User im Jail';
                return message.reply({ embeds: [{
                    color: 0x808080,
                    title: '🔒 User im Jail',
                    description: jailed,
                    footer: { text: `${jailRole.members.size} User` }
                }] });
            }
        },
        
        // ========== JAIL-SETTINGS ==========
        'jail-settings': {
            permissions: 'ManageRoles',
            description: 'Konfiguriert Jail',
            category: 'Moderation',
            async execute(message) {
                return message.reply({ embeds: [global.embed.info('Jail Settings', 'Jail-Rolle wird automatisch erstellt.\nChannel-Permissions werden gesetzt.')] });
            }
        },
        
        // ========== DRAG ==========
        drag: {
            permissions: 'MoveMembers',
            description: 'Zieht User in deinen Voice-Channel',
            category: 'Moderation',
            async execute(message, args) {
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!drag @User')] });
                if (!target.voice.channel) return message.reply({ embeds: [global.embed.error('Nicht im VC', `${target} ist in keinem Voice-Channel!')] });
                if (!message.member.voice.channel) return message.reply({ embeds: [global.embed.error('Nicht im VC', 'Du bist in keinem Voice-Channel!')] });
                
                await target.voice.setChannel(message.member.voice.channel);
                return message.reply({ embeds: [global.embed.success('Gezogen', `${target} wurde in deinen Channel gezogen.`)] });
            }
        },
        
        // ========== MOVEALL ==========
        moveall: {
            permissions: 'MoveMembers',
            description: 'Zieht alle User in deinen VC',
            category: 'Moderation',
            async execute(message) {
                if (!message.member.voice.channel) {
                    return message.reply({ embeds: [global.embed.error('Nicht im VC', 'Du bist in keinem Voice-Channel!')] });
                }
                
                const sourceChannel = message.guild.members.cache.find(m => 
                    m.voice.channel && m.voice.channel.id !== message.member.voice.channel.id
                )?.voice.channel;
                
                if (!sourceChannel) return message.reply({ embeds: [global.embed.info('Niemand da', 'Keine anderen User in Voice-Channels.')] });
                
                let count = 0;
                for (const [id, member] of sourceChannel.members) {
                    await member.voice.setChannel(message.member.voice.channel);
                    count++;
                }
                
                return message.reply({ embeds: [global.embed.success('Alle gezogen', `${count} User in deinen Channel gezogen.`)] });
            }
        },
        
        // ========== HISTORY ==========
        history: {
            permissions: 'ModerateMembers',
            description: 'Zeigt Verwarnungen/History',
            category: 'Moderation',
            async execute(message, args, { supabase }) {
                const target = message.mentions.members.first() || message.member;
                
                const { data } = await supabase
                    .from('warns')
                    .select('*')
                    .eq('user_id', target.id)
                    .eq('guild_id', message.guild.id)
                    .order('created_at', { ascending: false });
                
                if (!data || data.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Einträge', `${target} hat keine Verwarnungen.`)] });
                }
                
                const history = data.map(w => `**${w.reason}** (Mod: <@${w.moderator_id}>)`).join('\n');
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `📜 History von ${target.user.username}`,
                    description: history,
                    footer: { text: `${data.length} Einträge` }
                }] });
            }
        },
        
        // ========== HISTORYCHANNEL ==========
        historychannel: {
            permissions: 'ManageChannels',
            description: 'Setzt History-Channel',
            category: 'Moderation',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                
                await supabase.from('settings').upsert({
                    guild_id: message.guild.id,
                    history_channel: channel.id
                });
                
                return message.reply({ embeds: [global.embed.success('History Channel', `${channel} ist jetzt der History-Channel.`)] });
            }
        },
        
        // ========== WORDFILTER ==========
        wordfilter: {
            permissions: 'ManageMessages',
            description: 'Fügt Wort zum Filter hinzu',
            category: 'Moderation',
            async execute(message, args, { supabase }) {
                const word = args[0]?.toLowerCase();
                if (!word) return message.reply({ embeds: [global.embed.error('Kein Wort', '!wordfilter <add/remove/list> <Wort>')] });
                
                if (word === 'add') {
                    const filterWord = args[1]?.toLowerCase();
                    if (!filterWord) return message.reply({ embeds: [global.embed.error('Kein Wort', '!wordfilter add <Wort>')] });
                    
                    await supabase.from('wordfilter').insert({
                        guild_id: message.guild.id,
                        word: filterWord
                    });
                    
                    return message.reply({ embeds: [global.embed.success('Wort hinzugefügt', `"${filterWord}" ist jetzt gefiltert.`)] });
                }
                
                if (word === 'remove') {
                    const filterWord = args[1]?.toLowerCase();
                    if (!filterWord) return message.reply({ embeds: [global.embed.error('Kein Wort', '!wordfilter remove <Wort>')] });
                    
                    await supabase.from('wordfilter').delete().eq('guild_id', message.guild.id).eq('word', filterWord);
                    return message.reply({ embeds: [global.embed.success('Wort entfernt', `"${filterWord}" ist nicht mehr gefiltert.`)] });
                }
                
                if (word === 'list') {
                    const { data } = await supabase.from('wordfilter').select('word').eq('guild_id', message.guild.id);
                    const words = data?.map(w => w.word).join(', ') || 'Keine Wörter gefiltert';
                    
                    return message.reply({ embeds: [{
                        color: 0x0099FF,
                        title: '📝 Gefilterte Wörter',
                        description: words
                    }] });
                }
            }
        }
    }
};
