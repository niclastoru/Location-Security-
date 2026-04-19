const { EmbedBuilder } = require('discord.js');

module.exports = {
    category: 'Moderation',
    subCommands: {
        
        // ========== BAN ==========
        ban: {
            permissions: 'BanMembers',
            description: 'Bannt einen User permanent / Bans a user permanently',
            category: 'Moderation',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error', 
                            lang === 'de' ? 'Kein User' : 'No User',
                            lang === 'de' ? '!ban @User [Grund]' : '!ban @User [Reason]'
                        )] 
                    });
                }
                
                if (!target.bannable) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Keine Rechte' : 'No Permission',
                            lang === 'de' ? 'Ich kann diesen User nicht bannen!' : 'I cannot ban this user!'
                        )] 
                    });
                }
                
                const reason = args.slice(1).join(' ') || (lang === 'de' ? 'Kein Grund' : 'No reason');
                await target.ban({ reason });
                
                const fields = [
                    { name: lang === 'de' ? '👤 User' : '👤 User', value: `${target.user.tag}`, inline: true },
                    { name: lang === 'de' ? '🆔 ID' : '🆔 ID', value: target.id, inline: true },
                    { name: lang === 'de' ? '📝 Grund' : '📝 Reason', value: reason, inline: true }
                ];
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'User gebannt' : 'User Banned',
                        lang === 'de' ? `${target.user.tag} wurde gebannt.` : `${target.user.tag} has been banned.`,
                        fields
                    )] 
                });
            }
        },
        
        // ========== UNBAN ==========
        unban: {
            permissions: 'BanMembers',
            description: 'Entbannt einen User / Unbans a user',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const userId = args[0];
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!userId) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Keine ID' : 'No ID',
                            lang === 'de' ? '!unban <UserID>' : '!unban <UserID>'
                        )] 
                    });
                }
                
                try {
                    await message.guild.members.unban(userId);
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'success',
                            lang === 'de' ? 'User entbannt' : 'User Unbanned',
                            lang === 'de' ? `User mit ID ${userId} wurde entbannt.` : `User with ID ${userId} has been unbanned.`
                        )] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Fehler' : 'Error',
                            lang === 'de' ? 'User nicht gefunden oder nicht gebannt.' : 'User not found or not banned.'
                        )] 
                    });
                }
            }
        },
        
        // ========== KICK ==========
        kick: {
            permissions: 'KickMembers',
            description: 'Kickt einen User / Kicks a user',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            lang === 'de' ? '!kick @User [Grund]' : '!kick @User [Reason]'
                        )] 
                    });
                }
                
                if (!target.kickable) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Keine Rechte' : 'No Permission',
                            lang === 'de' ? 'Ich kann diesen User nicht kicken!' : 'I cannot kick this user!'
                        )] 
                    });
                }
                
                const reason = args.slice(1).join(' ') || (lang === 'de' ? 'Kein Grund' : 'No reason');
                await target.kick(reason);
                
                const fields = [
                    { name: lang === 'de' ? '👤 User' : '👤 User', value: `${target.user.tag}`, inline: true },
                    { name: lang === 'de' ? '📝 Grund' : '📝 Reason', value: reason, inline: true }
                ];
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'User gekickt' : 'User Kicked',
                        lang === 'de' ? `${target.user.tag} wurde gekickt.` : `${target.user.tag} has been kicked.`,
                        fields
                    )] 
                });
            }
        },
        
        // ========== TIMEOUT ==========
        timeout: {
            aliases: ['mute'],
            permissions: 'ModerateMembers',
            description: 'Timeout für einen User / Timeout a user',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            lang === 'de' ? '!timeout @User <Minuten> [Grund]' : '!timeout @User <Minutes> [Reason]'
                        )] 
                    });
                }
                
                const minutes = parseInt(args[1]);
                if (isNaN(minutes) || minutes < 1 || minutes > 40320) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Ungültige Zeit' : 'Invalid Time',
                            lang === 'de' ? '1-40320 Minuten (28 Tage)!' : '1-40320 minutes (28 days)!'
                        )] 
                    });
                }
                
                const reason = args.slice(2).join(' ') || (lang === 'de' ? 'Kein Grund' : 'No reason');
                await target.timeout(minutes * 60 * 1000, reason);
                
                const fields = [
                    { name: lang === 'de' ? '👤 User' : '👤 User', value: `${target.user.tag}`, inline: true },
                    { name: lang === 'de' ? '⏱️ Dauer' : '⏱️ Duration', value: `${minutes} ${lang === 'de' ? 'Minuten' : 'minutes'}`, inline: true },
                    { name: lang === 'de' ? '📝 Grund' : '📝 Reason', value: reason, inline: true }
                ];
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Timeout gesetzt' : 'Timeout Set',
                        lang === 'de' ? `${target} für ${minutes} Minuten.` : `${target} for ${minutes} minutes.`,
                        fields
                    )] 
                });
            }
        },
        
        // ========== UNTIMEOUT ==========
        untimeout: {
            aliases: ['unmute'],
            permissions: 'ModerateMembers',
            description: 'Timeout entfernen / Remove timeout',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            '!untimeout @User'
                        )] 
                    });
                }
                
                if (!target.communicationDisabledUntil) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'info',
                            lang === 'de' ? 'Kein Timeout' : 'No Timeout',
                            lang === 'de' ? `${target} hat keinen aktiven Timeout.` : `${target} has no active timeout.`
                        )] 
                    });
                }
                
                await target.timeout(null);
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Timeout entfernt' : 'Timeout Removed',
                        lang === 'de' ? `Timeout für ${target} wurde aufgehoben.` : `Timeout for ${target} has been removed.`
                    )] 
                });
            }
        },
        
        // ========== ROLE ==========
        role: {
            aliases: ['r'],
            permissions: 'ManageRoles',
            description: 'Rolle hinzufügen/entfernen / Add/remove role',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            lang === 'de' ? '!r @User <Rollenname>' : '!r @User <Role name>'
                        )] 
                    });
                }
                
                const roleName = args.slice(1).join(' ');
                if (!roleName) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Keine Rolle' : 'No Role',
                            lang === 'de' ? '!r @User <Rollenname>' : '!r @User <Role name>'
                        )] 
                    });
                }
                
                const role = message.guild.roles.cache.find(r => 
                    r.name.toLowerCase() === roleName.toLowerCase() ||
                    r.id === roleName.replace(/\D/g, '')
                );
                
                if (!role) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Rolle nicht gefunden' : 'Role not found',
                            lang === 'de' ? `"${roleName}" existiert nicht.` : `"${roleName}" does not exist.`
                        )] 
                    });
                }
                
                if (role.position >= message.guild.members.me.roles.highest.position) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Keine Rechte' : 'No Permission',
                            lang === 'de' ? 'Ich kann diese Rolle nicht verwalten!' : 'I cannot manage this role!'
                        )] 
                    });
                }
                
                if (role.position >= message.member.roles.highest.position) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Keine Rechte' : 'No Permission',
                            lang === 'de' ? 'Du kannst diese Rolle nicht verwalten!' : 'You cannot manage this role!'
                        )] 
                    });
                }
                
                if (target.roles.cache.has(role.id)) {
                    await target.roles.remove(role);
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'success',
                            lang === 'de' ? 'Rolle entfernt' : 'Role Removed',
                            lang === 'de' ? `❌ ${role} von ${target} entfernt.` : `❌ ${role} removed from ${target}.`
                        )] 
                    });
                } else {
                    await target.roles.add(role);
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'success',
                            lang === 'de' ? 'Rolle hinzugefügt' : 'Role Added',
                            lang === 'de' ? `✅ ${role} an ${target} vergeben.` : `✅ ${role} added to ${target}.`
                        )] 
                    });
                }
            }
        },
        
        // ========== ROLES ==========
        roles: {
            permissions: 'ManageRoles',
            description: 'Zeigt alle Rollen eines Users / Shows all roles of a user',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first() || message.member;
                const lang = client.languages?.get(message.guild.id) || 'de';
                const roles = target.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position);
                const roleList = roles.map(r => `${r}`).join(', ') || (lang === 'de' ? 'Keine Rollen' : 'No roles');
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `📋 Rollen von ${target.user.username}` : `📋 Roles of ${target.user.username}`)
                    .setDescription(roleList)
                    .setFooter({ text: `${roles.size} ${lang === 'de' ? 'Rollen' : 'roles'}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== NICKNAME ==========
        nickname: {
            aliases: ['nick'],
            permissions: 'ManageNicknames',
            description: 'Ändert Nickname / Changes nickname',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            lang === 'de' ? '!nickname @User <Name>' : '!nickname @User <Name>'
                        )] 
                    });
                }
                
                const nick = args.slice(1).join(' ') || '';
                await target.setNickname(nick || null);
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Nickname geändert' : 'Nickname Changed',
                        nick ? (lang === 'de' ? `${target} heißt jetzt **${nick}**` : `${target} is now called **${nick}**`) 
                             : (lang === 'de' ? `Nickname von ${target} entfernt.` : `Nickname of ${target} removed.`)
                    )] 
                });
            }
        },
        
        // ========== CLEARNICK ==========
        clearnick: {
            permissions: 'ManageNicknames',
            description: 'Entfernt Nickname / Removes nickname',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first() || message.member;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                await target.setNickname(null);
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Nickname entfernt' : 'Nickname Removed',
                        lang === 'de' ? `Nickname von ${target} wurde zurückgesetzt.` : `Nickname of ${target} has been reset.`
                    )] 
                });
            }
        },
        
        // ========== PURGE ==========
        purge: {
            aliases: ['clear'],
            permissions: 'ManageMessages',
            description: 'Löscht Nachrichten / Deletes messages',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const amount = parseInt(args[0]);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (isNaN(amount) || amount < 1 || amount > 100) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Ungültig' : 'Invalid',
                            lang === 'de' ? '1-100 Nachrichten!' : '1-100 messages!'
                        )] 
                    });
                }
                
                const deleted = await message.channel.bulkDelete(amount, true);
                const msg = await message.channel.send({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Gelöscht' : 'Deleted',
                        lang === 'de' ? `${deleted.size} Nachrichten entfernt.` : `${deleted.size} messages removed.`
                    )] 
                });
                setTimeout(() => msg.delete(), 3000);
            }
        },
        
        // ========== LOCK ==========
        lock: {
            permissions: 'ManageChannels',
            description: 'Sperrt den Channel / Locks the channel',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Channel gesperrt' : 'Channel Locked',
                        lang === 'de' ? `${message.channel} ist jetzt gesperrt.` : `${message.channel} is now locked.`
                    )] 
                });
            }
        },
        
        // ========== UNLOCK ==========
        unlock: {
            permissions: 'ManageChannels',
            description: 'Entsperrt den Channel / Unlocks the channel',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Channel entsperrt' : 'Channel Unlocked',
                        lang === 'de' ? `${message.channel} ist jetzt entsperrt.` : `${message.channel} is now unlocked.`
                    )] 
                });
            }
        },
        
        // ========== SLOWMODE ==========
        slowmode: {
            permissions: 'ManageChannels',
            description: 'Setzt Slowmode / Sets slowmode',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const seconds = parseInt(args[0]);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Ungültig' : 'Invalid',
                            lang === 'de' ? '0-21600 Sekunden!' : '0-21600 seconds!'
                        )] 
                    });
                }
                
                await message.channel.setRateLimitPerUser(seconds);
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Slowmode' : 'Slowmode',
                        seconds === 0 
                            ? (lang === 'de' ? 'Slowmode deaktiviert.' : 'Slowmode disabled.')
                            : (lang === 'de' ? `Slowmode: ${seconds} Sekunden.` : `Slowmode: ${seconds} seconds.`)
                    )] 
                });
            }
        },
        
        // ========== WARN ==========
        warn: {
            permissions: 'ModerateMembers',
            description: 'Verwarnt einen User / Warns a user',
            category: 'Moderation',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            lang === 'de' ? '!warn @User [Grund]' : '!warn @User [Reason]'
                        )] 
                    });
                }
                
                const reason = args.slice(1).join(' ') || (lang === 'de' ? 'Kein Grund' : 'No reason');
                
                await supabase.from('warns').insert({
                    user_id: target.id,
                    moderator_id: message.author.id,
                    reason: reason,
                    guild_id: message.guild.id
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'warn',
                        lang === 'de' ? 'Verwarnt' : 'Warned',
                        lang === 'de' ? `${target} wurde verwarnt.\n**Grund:** ${reason}` : `${target} has been warned.\n**Reason:** ${reason}`
                    )] 
                });
            }
        },
        
        // ========== JAIL ==========
        jail: {
            permissions: 'ManageRoles',
            description: 'Sperrt User in Jail-Rolle / Jails a user',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            lang === 'de' ? '!jail @User [Grund]' : '!jail @User [Reason]'
                        )] 
                    });
                }
                
                let jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                if (!jailRole) {
                    jailRole = await message.guild.roles.create({ name: 'Jail', color: 0x808080 });
                    message.guild.channels.cache.forEach(channel => {
                        channel.permissionOverwrites.create(jailRole, { SendMessages: false, AddReactions: false }).catch(() => {});
                    });
                }
                
                const reason = args.slice(1).join(' ') || (lang === 'de' ? 'Kein Grund' : 'No reason');
                await target.roles.add(jailRole, reason);
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Eingesperrt' : 'Jailed',
                        lang === 'de' ? `${target} ist jetzt im Jail.\n**Grund:** ${reason}` : `${target} is now in jail.\n**Reason:** ${reason}`
                    )] 
                });
            }
        },
        
        // ========== UNJAIL ==========
        unjail: {
            permissions: 'ManageRoles',
            description: 'Entlässt aus Jail / Releases from jail',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            '!unjail @User'
                        )] 
                    });
                }
                
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                if (!jailRole) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Keine Jail-Rolle' : 'No Jail Role',
                            lang === 'de' ? 'Es existiert keine Jail-Rolle!' : 'No jail role exists!'
                        )] 
                    });
                }
                
                await target.roles.remove(jailRole);
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Entlassen' : 'Released',
                        lang === 'de' ? `${target} wurde aus dem Jail entlassen.` : `${target} has been released from jail.`
                    )] 
                });
            }
        },
        
        // ========== JAIL-LIST ==========
        'jail-list': {
            permissions: 'ManageRoles',
            description: 'Zeigt User im Jail / Shows users in jail',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!jailRole) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'info',
                            lang === 'de' ? 'Jail leer' : 'Jail Empty',
                            lang === 'de' ? 'Keine Jail-Rolle vorhanden.' : 'No jail role exists.'
                        )] 
                    });
                }
                
                const jailed = jailRole.members.map(m => `${m.user.tag}`).join('\n') || (lang === 'de' ? 'Keine User im Jail' : 'No users in jail');
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🔒 User im Jail' : '🔒 Users in Jail')
                    .setDescription(jailed)
                    .setFooter({ text: `${jailRole.members.size} ${lang === 'de' ? 'User' : 'users'}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== JAIL-SETTINGS ==========
        'jail-settings': {
            permissions: 'ManageRoles',
            description: 'Konfiguriert Jail / Configures jail',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'info',
                        lang === 'de' ? 'Jail Settings' : 'Jail Settings',
                        lang === 'de' ? 'Jail-Rolle wird automatisch erstellt.' : 'Jail role is created automatically.'
                    )] 
                });
            }
        },
        
        // ========== DRAG ==========
        drag: {
            permissions: 'MoveMembers',
            description: 'Zieht User in deinen VC / Drags user to your VC',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Kein User' : 'No User',
                            '!drag @User'
                        )] 
                    });
                }
                
                if (!target.voice.channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Nicht im VC' : 'Not in VC',
                            lang === 'de' ? `${target} ist in keinem Voice-Channel!` : `${target} is not in a voice channel!`
                        )] 
                    });
                }
                
                if (!message.member.voice.channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Nicht im VC' : 'Not in VC',
                            lang === 'de' ? 'Du bist in keinem Voice-Channel!' : 'You are not in a voice channel!'
                        )] 
                    });
                }
                
                await target.voice.setChannel(message.member.voice.channel);
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Gezogen' : 'Dragged',
                        lang === 'de' ? `${target} wurde in deinen Channel gezogen.` : `${target} has been dragged to your channel.`
                    )] 
                });
            }
        },
        
        // ========== MOVEALL ==========
        moveall: {
            permissions: 'MoveMembers',
            description: 'Zieht alle User in deinen VC / Moves all users to your VC',
            category: 'Moderation',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!message.member.voice.channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'error',
                            lang === 'de' ? 'Nicht im VC' : 'Not in VC',
                            lang === 'de' ? 'Du bist in keinem Voice-Channel!' : 'You are not in a voice channel!'
                        )] 
                    });
                }
                
                const sourceChannel = message.guild.members.cache.find(m => 
                    m.voice.channel && m.voice.channel.id !== message.member.voice.channel.id
                )?.voice.channel;
                
                if (!sourceChannel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'info',
                            lang === 'de' ? 'Niemand da' : 'Nobody there',
                            lang === 'de' ? 'Keine anderen User in Voice-Channels.' : 'No other users in voice channels.'
                        )] 
                    });
                }
                
                let count = 0;
                for (const [id, member] of sourceChannel.members) {
                    await member.voice.setChannel(message.member.voice.channel);
                    count++;
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'Alle gezogen' : 'All Moved',
                        lang === 'de' ? `${count} User in deinen Channel gezogen.` : `${count} users moved to your channel.`
                    )] 
                });
            }
        },
        
        // ========== HISTORY ==========
        history: {
            permissions: 'ModerateMembers',
            description: 'Zeigt Verwarnungen / Shows warnings',
            category: 'Moderation',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.members.first() || message.member;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data } = await supabase
                    .from('warns')
                    .select('*')
                    .eq('user_id', target.id)
                    .eq('guild_id', message.guild.id)
                    .order('created_at', { ascending: false });
                
                if (!data || data.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'info',
                            lang === 'de' ? 'Keine Einträge' : 'No Entries',
                            lang === 'de' ? `${target} hat keine Verwarnungen.` : `${target} has no warnings.`
                        )] 
                    });
                }
                
                const history = data.map(w => `**${w.reason}** (${lang === 'de' ? 'Mod' : 'Mod'}: <@${w.moderator_id}>)`).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `📜 History von ${target.user.username}` : `📜 History of ${target.user.username}`)
                    .setDescription(history)
                    .setFooter({ text: `${data.length} ${lang === 'de' ? 'Einträge' : 'entries'}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== HISTORYCHANNEL ==========
        historychannel: {
            permissions: 'ManageChannels',
            description: 'Setzt History-Channel / Sets history channel',
            category: 'Moderation',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                await supabase.from('settings').upsert({
                    guild_id: message.guild.id,
                    history_channel: channel.id
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'success',
                        lang === 'de' ? 'History Channel' : 'History Channel',
                        lang === 'de' ? `${channel} ist jetzt der History-Channel.` : `${channel} is now the history channel.`
                    )] 
                });
            }
        },
        
        // ========== WORDFILTER ==========
        wordfilter: {
            permissions: 'ManageMessages',
            description: 'Wortfilter verwalten / Manage word filter',
            category: 'Moderation',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (action === 'add') {
                    const word = args[1]?.toLowerCase();
                    if (!word) {
                        return message.reply({ 
                            embeds: [await buildEmbed(message, 'error',
                                lang === 'de' ? 'Kein Wort' : 'No Word',
                                lang === 'de' ? '!wordfilter add <Wort>' : '!wordfilter add <Word>'
                            )] 
                        });
                    }
                    
                    await supabase.from('wordfilter').insert({ guild_id: message.guild.id, word });
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'success',
                            lang === 'de' ? 'Wort hinzugefügt' : 'Word Added',
                            lang === 'de' ? `"${word}" ist jetzt gefiltert.` : `"${word}" is now filtered.`
                        )] 
                    });
                }
                
                if (action === 'remove') {
                    const word = args[1]?.toLowerCase();
                    if (!word) {
                        return message.reply({ 
                            embeds: [await buildEmbed(message, 'error',
                                lang === 'de' ? 'Kein Wort' : 'No Word',
                                lang === 'de' ? '!wordfilter remove <Wort>' : '!wordfilter remove <Word>'
                            )] 
                        });
                    }
                    
                    await supabase.from('wordfilter').delete().eq('guild_id', message.guild.id).eq('word', word);
                    return message.reply({ 
                        embeds: [await buildEmbed(message, 'success',
                            lang === 'de' ? 'Wort entfernt' : 'Word Removed',
                            lang === 'de' ? `"${word}" ist nicht mehr gefiltert.` : `"${word}" is no longer filtered.`
                        )] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase.from('wordfilter').select('word').eq('guild_id', message.guild.id);
                    const words = data?.map(w => w.word).join(', ') || (lang === 'de' ? 'Keine Wörter gefiltert' : 'No words filtered');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '📝 Gefilterte Wörter' : '📝 Filtered Words')
                        .setDescription(words)
                        .setFooter({ iconURL: message.author.displayAvatarURL() })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(message, 'error',
                        lang === 'de' ? 'Falsche Nutzung' : 'Invalid Usage',
                        lang === 'de' ? '!wordfilter <add/remove/list>' : '!wordfilter <add/remove/list>'
                    )] 
                });
            }
        }
    }
};

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    const lang = client.languages?.get(message.guild?.id) || 'de';
    
    const colors = {
        success: 0x57F287,  // Grün
        error: 0xED4245,    // Rot
        info: 0x5865F2,     // Blau
        warn: 0xFEE75C      // Gelb
    };
    
    const emoji = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warn: '⚠️'
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`${emoji[type]} ${title}`)
        .setDescription(description)
        .setFooter({ 
            text: message.author.tag, 
            iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}
