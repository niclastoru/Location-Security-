const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        utility: 0x0099FF,
        booster: 0xFF73FA
    };
    
    const titles = {
        de: {
            avatar: 'Avatar',
            base64_encode: 'Base64 Encode',
            base64_decode: 'Base64 Decode',
            server_boosts: 'Server Boosts',
            chat: 'Chat',
            chatgpt: 'ChatGPT',
            snipe_cleared: 'Snipe gelöscht',
            channel_dump: 'Channel Dump',
            server_banner: 'Server Banner',
            server_icon: 'Server Icon',
            server_splash: 'Server Splash',
            member_count: 'Mitglieder',
            reminder_set: 'Erinnerung gesetzt',
            reminders: 'Erinnerungen',
            screenshot: 'Screenshot',
            user_banner: 'Banner',
            server_info: 'Server Info',
            snipe: 'Snipe',
            emoji_stolen: 'Emoji geklaut',
            user_info: 'User Info',
            voice_info: 'Voice Info',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info',
            invalid_usage: 'Falsche Nutzung',
            no_data: 'Keine Daten'
        },
        en: {
            avatar: 'Avatar',
            base64_encode: 'Base64 Encode',
            base64_decode: 'Base64 Decode',
            server_boosts: 'Server Boosts',
            chat: 'Chat',
            chatgpt: 'ChatGPT',
            snipe_cleared: 'Snipe Cleared',
            channel_dump: 'Channel Dump',
            server_banner: 'Server Banner',
            server_icon: 'Server Icon',
            server_splash: 'Server Splash',
            member_count: 'Members',
            reminder_set: 'Reminder Set',
            reminders: 'Reminders',
            screenshot: 'Screenshot',
            user_banner: 'Banner',
            server_info: 'Server Info',
            snipe: 'Snipe',
            emoji_stolen: 'Emoji Stolen',
            user_info: 'User Info',
            voice_info: 'Voice Info',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage',
            no_data: 'No Data'
        }
    };
    
    const descriptions = {
        de: {
            avatar_footer: (user) => `Angefordert von ${user}`,
            base64_usage: '!base64 <encode/decode> <Text>',
            base64_invalid: 'Ungültiger Base64 String!',
            base64_action: 'Nutze `encode` oder `decode`!',
            booster_count: (count, level) => `**${count}** Boosts (Level ${level})`,
            booster_members: 'Booster',
            no_boosters: 'Keine',
            chat_usage: '!chat <Nachricht>',
            chat_responses: [
                'Interessant! Erzähl mir mehr.',
                'Aha, verstehe.',
                '🤔 Das ist eine gute Frage!',
                'Darüber muss ich nachdenken...',
                'Echt? Das wusste ich nicht!'
            ],
            chatgpt_usage: '!chatgpt <Frage>',
            chatgpt_simulation: '🤖 *Simulation:* Das ist eine interessante Frage! Leider ist die API nicht konfiguriert.',
            snipe_cleared: (channel) => `Snipe-Cache für ${channel} wurde geleert.`,
            dump_limit: 'Maximal 100 Nachrichten!',
            no_banner: 'Dieser Server hat keinen Banner!',
            no_icon: 'Dieser Server hat kein Icon!',
            no_splash: 'Dieser Server hat keinen Splash!',
            member_count_fields: {
                total: 'Gesamt',
                humans: '👤 Menschen',
                bots: '🤖 Bots',
                online: '🟢 Online'
            },
            remind_usage: '!remind <Zeit> <Nachricht>\nBeispiel: !remind 10m Pizza holen',
            remind_invalid: 'Nutze: 10s, 5m, 2h, 1d',
            remind_set: (time, reminder) => `Ich erinnere dich in ${time} an: **${reminder}**`,
            remind_triggered: (reminder, channel) => `**${reminder}**\nVon: ${channel}`,
            reminders_placeholder: 'Aktive Erinnerungen werden nicht persistent gespeichert.',
            screenshot_usage: '!screenshot <https://...>',
            screenshot_invalid: 'URL muss mit http:// oder https:// beginnen!',
            screenshot_simulation: (url) => `🔗 Screenshot von ${url}\n*Für echte Screenshots wird eine API benötigt.*`,
            no_user_banner: (user) => `${user} hat keinen Banner!`,
            server_info_fields: {
                owner: '👑 Owner',
                id: '🆔 Server ID',
                created: '📅 Erstellt',
                members: '👥 Mitglieder',
                channels: '💬 Channels',
                roles: '🎭 Rollen',
                boosts: '🚀 Boosts',
                region: '🌍 Region'
            },
            server_info_footer: (user) => `Angefordert von ${user}`,
            snipe_empty: 'In diesem Channel wurde kürzlich nichts gelöscht!',
            snipe_deleted: 'Gelöscht um',
            snipe_attachments: '📎 Anhänge',
            snipe_no_text: '*Kein Text*',
            steal_usage: '!stealemoji <Name> <URL/Bild>',
            steal_no_image: 'Bitte Emoji, URL oder Bild anhängen!',
            steal_success: (emoji) => `${emoji} wurde hinzugefügt!`,
            steal_error: 'Konnte Emoji nicht erstellen!',
            user_info_fields: {
                id: '🆔 User ID',
                created: '📅 Account erstellt',
                joined: '📥 Beigetreten',
                roles: (count) => `🎭 Rollen [${count}]`,
                booster: '🚀 Booster',
                booster_since: (date) => `Seit <t:${date}:D>`,
                no: 'Nein',
                none: 'Keine'
            },
            user_info_footer: (user) => `Angefordert von ${user}`,
            vc_not_in: 'Du bist in keinem Voice-Channel!',
            vc_fields: {
                id: '📋 ID',
                users: '👥 User',
                bitrate: '📊 Bitrate',
                members: (count) => `👤 Mitglieder (${count})`
            }
        },
        en: {
            avatar_footer: (user) => `Requested by ${user}`,
            base64_usage: '!base64 <encode/decode> <Text>',
            base64_invalid: 'Invalid Base64 string!',
            base64_action: 'Use `encode` or `decode`!',
            booster_count: (count, level) => `**${count}** Boosts (Level ${level})`,
            booster_members: 'Boosters',
            no_boosters: 'None',
            chat_usage: '!chat <Message>',
            chat_responses: [
                'Interesting! Tell me more.',
                'I see, understood.',
                '🤔 That\'s a good question!',
                'I need to think about that...',
                'Really? I didn\'t know that!'
            ],
            chatgpt_usage: '!chatgpt <Question>',
            chatgpt_simulation: '🤖 *Simulation:* That\'s an interesting question! Unfortunately, the API is not configured.',
            snipe_cleared: (channel) => `Snipe cache for ${channel} has been cleared.`,
            dump_limit: 'Maximum 100 messages!',
            no_banner: 'This server has no banner!',
            no_icon: 'This server has no icon!',
            no_splash: 'This server has no splash!',
            member_count_fields: {
                total: 'Total',
                humans: '👤 Humans',
                bots: '🤖 Bots',
                online: '🟢 Online'
            },
            remind_usage: '!remind <Time> <Message>\nExample: !remind 10m Get pizza',
            remind_invalid: 'Use: 10s, 5m, 2h, 1d',
            remind_set: (time, reminder) => `I will remind you in ${time} about: **${reminder}**`,
            remind_triggered: (reminder, channel) => `**${reminder}**\nFrom: ${channel}`,
            reminders_placeholder: 'Active reminders are not stored persistently.',
            screenshot_usage: '!screenshot <https://...>',
            screenshot_invalid: 'URL must start with http:// or https://!',
            screenshot_simulation: (url) => `🔗 Screenshot of ${url}\n*A real API is needed for actual screenshots.*`,
            no_user_banner: (user) => `${user} has no banner!`,
            server_info_fields: {
                owner: '👑 Owner',
                id: '🆔 Server ID',
                created: '📅 Created',
                members: '👥 Members',
                channels: '💬 Channels',
                roles: '🎭 Roles',
                boosts: '🚀 Boosts',
                region: '🌍 Region'
            },
            server_info_footer: (user) => `Requested by ${user}`,
            snipe_empty: 'Nothing has been deleted in this channel recently!',
            snipe_deleted: 'Deleted at',
            snipe_attachments: '📎 Attachments',
            snipe_no_text: '*No text*',
            steal_usage: '!stealemoji <Name> <URL/Image>',
            steal_no_image: 'Please provide an emoji, URL, or attach an image!',
            steal_success: (emoji) => `${emoji} has been added!`,
            steal_error: 'Could not create emoji!',
            user_info_fields: {
                id: '🆔 User ID',
                created: '📅 Account Created',
                joined: '📥 Joined',
                roles: (count) => `🎭 Roles [${count}]`,
                booster: '🚀 Booster',
                booster_since: (date) => `Since <t:${date}:D>`,
                no: 'No',
                none: 'None'
            },
            user_info_footer: (user) => `Requested by ${user}`,
            vc_not_in: 'You are not in a voice channel!',
            vc_fields: {
                id: '📋 ID',
                users: '👥 Users',
                bitrate: '📊 Bitrate',
                members: (count) => `👤 Members (${count})`
            }
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
        .setColor(type === 'utility' ? 0x0099FF : type === 'booster' ? 0xFF73FA : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
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
    category: 'Utility',
    subCommands: {
        
        // ========== USERAVATAR ==========
        useravatar: {
            aliases: ['av', 'avatar'],
            description: 'Zeigt das Profilbild eines Users / Shows a user\'s avatar',
            category: 'Utility',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const avatarURL = target.displayAvatarURL({ dynamic: true, size: 1024 });
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`🖼️ ${target.username}`)
                    .setImage(avatarURL)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== BASE64 ==========
        base64: {
            aliases: ['b64'],
            description: 'Enkodiert/Dekodiert Base64 / Encodes/Decodes Base64',
            category: 'Utility',
            async execute(message, args, { client }) {
                const action = args[0]?.toLowerCase();
                const text = args.slice(1).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!action || !text) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'base64_usage')] 
                    });
                }
                
                if (action === 'encode' || action === 'e') {
                    const encoded = Buffer.from(text).toString('base64');
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'base64_encode', 'base64_encode', [`\`\`\`${encoded}\`\`\``])] 
                    });
                }
                
                if (action === 'decode' || action === 'd') {
                    try {
                        const decoded = Buffer.from(text, 'base64').toString('utf-8');
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'base64_decode', 'base64_decode', [`\`\`\`${decoded}\`\`\``])] 
                        });
                    } catch {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'base64_decode', 'base64_invalid')] 
                        });
                    }
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'base64_action')] 
                });
            }
        },
        
        // ========== BOOSTERS ==========
        boosters: {
            aliases: ['boosts', 'booster'],
            description: 'Zeigt alle Server-Booster / Shows all server boosters',
            category: 'Utility',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                const boosters = message.guild.premiumSubscriptionCount || 0;
                const boosterMembers = message.guild.members.cache.filter(m => m.premiumSince).map(m => m.user.tag);
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF73FA)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`🚀 ${lang === 'de' ? 'Server Boosts' : 'Server Boosts'}`)
                    .setDescription(lang === 'de' ? `**${boosters}** Boosts (Level ${message.guild.premiumTier})` : `**${boosters}** Boosts (Level ${message.guild.premiumTier})`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                if (boosterMembers.length > 0) {
                    embed.addFields([{
                        name: lang === 'de' ? 'Booster' : 'Boosters',
                        value: boosterMembers.join('\n').slice(0, 1024) || (lang === 'de' ? 'Keine' : 'None')
                    }]);
                }
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== CHAT ==========
        chat: {
            aliases: ['talk'],
            description: 'Schreibt mit dem Bot / Chats with the bot',
            category: 'Utility',
            async execute(message, args, { client }) {
                const text = args.join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!text) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'chat_usage')] 
                    });
                }
                
                const responsesDe = [
                    'Interessant! Erzähl mir mehr.',
                    'Aha, verstehe.',
                    '🤔 Das ist eine gute Frage!',
                    'Darüber muss ich nachdenken...',
                    'Echt? Das wusste ich nicht!'
                ];
                
                const responsesEn = [
                    'Interesting! Tell me more.',
                    'I see, understood.',
                    '🤔 That\'s a good question!',
                    'I need to think about that...',
                    'Really? I didn\'t know that!'
                ];
                
                const responses = lang === 'de' ? responsesDe : responsesEn;
                const response = responses[Math.floor(Math.random() * responses.length)];
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'chat', 'chat', [response])] 
                });
            }
        },
        
        // ========== CHATGPT ==========
        chatgpt: {
            aliases: ['gpt', 'ai'],
            description: 'Fragt ChatGPT (Simulation) / Asks ChatGPT (Simulation)',
            category: 'Utility',
            async execute(message, args, { client }) {
                const question = args.join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!question) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'chatgpt_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'chatgpt', 'chatgpt_simulation')] 
                });
            }
        },
        
        // ========== CLEARSNIPE ==========
        clearsnipe: {
            aliases: ['cs'],
            permissions: 'ManageMessages',
            description: 'Löscht den Snipe-Cache / Clears the snipe cache',
            category: 'Utility',
            async execute(message, args, { client }) {
                message.client.snipes = message.client.snipes || new Map();
                message.client.snipes.delete(message.channel.id);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'snipe_cleared', 'snipe_cleared', [message.channel.toString()])] 
                });
            }
        },
        
        // ========== DUMP ==========
        dump: {
            aliases: ['export'],
            description: 'Exportiert Channel-Nachrichten / Exports channel messages',
            category: 'Utility',
            permissions: 'ManageMessages',
            async execute(message, args, { client }) {
                const limit = parseInt(args[0]) || 50;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (limit > 100) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'dump_limit', 'dump_limit')] 
                    });
                }
                
                const messages = await message.channel.messages.fetch({ limit });
                const dump = messages.map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`).join('\n');
                
                return message.reply({ 
                    content: '📄 Channel Dump:',
                    files: [{
                        attachment: Buffer.from(dump),
                        name: `dump-${message.channel.name}.txt`
                    }]
                });
            }
        },
        
        // ========== GUILDBANNER ==========
        guildbanner: {
            aliases: ['serverbanner', 'gbanner'],
            description: 'Zeigt den Server-Banner / Shows the server banner',
            category: 'Utility',
            async execute(message, args, { client }) {
                const banner = message.guild.bannerURL({ dynamic: true, size: 1024 });
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!banner) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'server_banner', 'no_banner')] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🖼️ Server Banner' : '🖼️ Server Banner')
                    .setImage(banner)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== GUILDICON ==========
        guildicon: {
            aliases: ['servericon', 'gicon'],
            description: 'Zeigt das Server-Icon / Shows the server icon',
            category: 'Utility',
            async execute(message, args, { client }) {
                const icon = message.guild.iconURL({ dynamic: true, size: 1024 });
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!icon) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'server_icon', 'no_icon')] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🖼️ Server Icon' : '🖼️ Server Icon')
                    .setImage(icon)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== GUILDSPLASH ==========
        guildsplash: {
            aliases: ['serversplash', 'gsplash'],
            description: 'Zeigt den Server-Splash / Shows the server splash',
            category: 'Utility',
            async execute(message, args, { client }) {
                const splash = message.guild.splashURL({ dynamic: true, size: 1024 });
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!splash) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'server_splash', 'no_splash')] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🖼️ Server Splash' : '🖼️ Server Splash')
                    .setImage(splash)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== MEMBERCOUNT ==========
        membercount: {
            aliases: ['mc', 'members'],
            description: 'Zeigt die Mitgliederzahl / Shows member count',
            category: 'Utility',
            async execute(message, args, { client }) {
                const guild = message.guild;
                const lang = client.languages?.get(guild.id) || 'de';
                const total = guild.memberCount;
                const humans = guild.members.cache.filter(m => !m.user.bot).size;
                const bots = guild.members.cache.filter(m => m.user.bot).size;
                const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `👥 Mitglieder von ${guild.name}` : `👥 Members of ${guild.name}`)
                    .addFields([
                        { name: lang === 'de' ? 'Gesamt' : 'Total', value: `${total}`, inline: true },
                        { name: lang === 'de' ? '👤 Menschen' : '👤 Humans', value: `${humans}`, inline: true },
                        { name: lang === 'de' ? '🤖 Bots' : '🤖 Bots', value: `${bots}`, inline: true },
                        { name: lang === 'de' ? '🟢 Online' : '🟢 Online', value: `${online}`, inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== REMIND ==========
        remind: {
            aliases: ['reminder', 'erinnerung'],
            description: 'Setzt eine Erinnerung / Sets a reminder',
            category: 'Utility',
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'remind_invalid', 'remind_invalid')] 
                    });
                }
                
                await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'reminder_set', 'remind_set', [time, reminder])] 
                });
                
                setTimeout(() => {
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '⏰ Erinnerung' : '⏰ Reminder')
                        .setDescription(lang === 'de' ? `**${reminder}**\nVon: ${message.channel}` : `**${reminder}**\nFrom: ${message.channel}`)
                        .setTimestamp();
                    
                    message.author.send({ embeds: [embed] }).catch(() => {
                        message.channel.send({ content: `${message.author}`, embeds: [embed] });
                    });
                }, ms);
            }
        },
        
        // ========== REMINDERS ==========
        reminders: {
            aliases: ['reminds'],
            description: 'Zeigt aktive Erinnerungen / Shows active reminders',
            category: 'Utility',
            async execute(message, args, { client }) {
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'reminders', 'reminders_placeholder')] 
                });
            }
        },
        
        // ========== SCREENSHOT ==========
        screenshot: {
            aliases: ['ss', 'web'],
            description: 'Macht Screenshot von Website / Takes website screenshot',
            category: 'Utility',
            async execute(message, args, { client }) {
                const url = args[0];
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!url) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'screenshot_usage')] 
                    });
                }
                
                if (!url.startsWith('http')) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'screenshot_invalid')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'screenshot', 'screenshot_simulation', [url])] 
                });
            }
        },
        
        // ========== SAV (Server Avatar) ==========
        sav: {
            aliases: ['serverav', 'serveravatar'],
            description: 'Server Avatar (Alias für guildicon) / Server avatar',
            category: 'Utility',
            async execute(message, args, { client }) {
                const icon = message.guild.iconURL({ dynamic: true, size: 1024 });
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!icon) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'server_icon', 'no_icon')] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🖼️ Server Icon' : '🖼️ Server Icon')
                    .setImage(icon)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== BANNER ==========
        banner: {
            aliases: ['ubanner'],
            description: 'Zeigt den User-Banner / Shows user banner',
            category: 'Utility',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const user = await message.client.users.fetch(target.id, { force: true });
                const banner = user.bannerURL({ dynamic: true, size: 1024 });
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!banner) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'user_banner', 'no_user_banner', [target.username])] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `🖼️ Banner von ${target.username}` : `🖼️ Banner of ${target.username}`)
                    .setImage(banner)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SERVERINFO ==========
        serverinfo: {
            aliases: ['si', 'guildinfo'],
            description: 'Zeigt Server-Informationen / Shows server information',
            category: 'Utility',
            async execute(message, args, { client }) {
                const guild = message.guild;
                const lang = client.languages?.get(guild.id) || 'de';
                const owner = await guild.fetchOwner();
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`📊 ${guild.name}`)
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .addFields([
                        { name: lang === 'de' ? '👑 Owner' : '👑 Owner', value: `${owner.user.tag}`, inline: true },
                        { name: lang === 'de' ? '🆔 Server ID' : '🆔 Server ID', value: guild.id, inline: true },
                        { name: lang === 'de' ? '📅 Erstellt' : '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: lang === 'de' ? '👥 Mitglieder' : '👥 Members', value: `${guild.memberCount}`, inline: true },
                        { name: lang === 'de' ? '💬 Channels' : '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
                        { name: lang === 'de' ? '🎭 Rollen' : '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
                        { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
                        { name: lang === 'de' ? '🌍 Region' : '🌍 Region', value: guild.preferredLocale, inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SNIPE ==========
        snipe: {
            aliases: ['s'],
            description: 'Zeigt die letzte gelöschte Nachricht / Shows the last deleted message',
            category: 'Utility',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                message.client.snipes = message.client.snipes || new Map();
                const snipe = message.client.snipes.get(message.channel.id);
                
                if (!snipe) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'snipe', 'snipe_empty')] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setAuthor({ name: snipe.author, iconURL: snipe.avatar })
                    .setDescription(snipe.content || (lang === 'de' ? '*Kein Text*' : '*No text*'))
                    .setFooter({ text: `${lang === 'de' ? 'Gelöscht um' : 'Deleted at'} ${snipe.time}` })
                    .setTimestamp();
                
                if (snipe.attachments?.length > 0) {
                    embed.addFields([{ 
                        name: lang === 'de' ? '📎 Anhänge' : '📎 Attachments', 
                        value: snipe.attachments.join('\n') 
                    }]);
                    
                    if (snipe.attachments[0].match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                        embed.setImage(snipe.attachments[0]);
                    }
                }
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== STEALEMOJI ==========
        stealemoji: {
            aliases: ['steal', 'addemoji'],
            permissions: 'ManageEmojisAndStickers',
            description: 'Klaut ein Emoji / Steals an emoji',
            category: 'Utility',
            async execute(message, args, { client }) {
                const emojiName = args[0];
                const emojiUrl = args[1] || message.attachments.first()?.url;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!emojiName) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'steal_usage')] 
                    });
                }
                
                let url = emojiUrl;
                if (!url) {
                    const emojiMatch = message.content.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
                    if (emojiMatch) {
                        const animated = emojiMatch[1] === 'a';
                        url = `https://cdn.discordapp.com/emojis/${emojiMatch[3]}.${animated ? 'gif' : 'png'}`;
                    }
                }
                
                if (!url) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'steal_no_image', 'steal_no_image')] 
                    });
                }
                
                try {
                    const emoji = await message.guild.emojis.create({ name: emojiName, attachment: url });
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'emoji_stolen', 'steal_success', [emoji.toString()])] 
                    });
                } catch (err) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'steal_error')] 
                    });
                }
            }
        },
        
        // ========== USERBANNER ==========
        userbanner: {
            aliases: ['ub'],
            description: 'Zeigt User-Banner / Shows user banner',
            category: 'Utility',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const user = await message.client.users.fetch(target.id, { force: true });
                const banner = user.bannerURL({ dynamic: true, size: 1024 });
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!banner) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'user_banner', 'no_user_banner', [target.username])] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `🖼️ Banner von ${target.username}` : `🖼️ Banner of ${target.username}`)
                    .setImage(banner)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== USERINFO ==========
        userinfo: {
            aliases: ['ui', 'whois'],
            description: 'Zeigt User-Informationen / Shows user information',
            category: 'Utility',
            async execute(message, args, { client }) {
                const target = message.mentions.members.first() || 
                               await message.guild.members.fetch(args[0]).catch(() => null) || 
                               message.member;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const user = target.user;
                const roles = target.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position);
                
                const embed = new EmbedBuilder()
                    .setColor(target.displayColor || 0x5865F2)
                    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .addFields([
                        { name: '🆔 User ID', value: user.id, inline: true },
                        { name: lang === 'de' ? '📅 Account erstellt' : '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: lang === 'de' ? '📥 Beigetreten' : '📥 Joined', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`, inline: true },
                        { name: lang === 'de' ? `🎭 Rollen [${roles.size}]` : `🎭 Roles [${roles.size}]`, value: roles.map(r => `${r}`).join(' ').slice(0, 1024) || (lang === 'de' ? 'Keine' : 'None') },
                        { name: '🚀 Booster', value: target.premiumSince ? (lang === 'de' ? `Seit <t:${Math.floor(target.premiumSinceTimestamp / 1000)}:D>` : `Since <t:${Math.floor(target.premiumSinceTimestamp / 1000)}:D>`) : (lang === 'de' ? 'Nein' : 'No'), inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VC ==========
        vc: {
            aliases: ['voice', 'voiceinfo'],
            description: 'Zeigt Voice-Channel Informationen / Shows voice channel information',
            category: 'Utility',
            async execute(message, args, { client }) {
                const member = message.member;
                const vc = member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!vc) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'voice_info', 'vc_not_in')] 
                    });
                }
                
                const members = vc.members.map(m => m.user.tag);
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`🔊 ${vc.name}`)
                    .addFields([
                        { name: '📋 ID', value: vc.id, inline: true },
                        { name: lang === 'de' ? '👥 User' : '👥 Users', value: `${vc.members.size}`, inline: true },
                        { name: lang === 'de' ? '📊 Bitrate' : '📊 Bitrate', value: `${vc.bitrate / 1000} kbps`, inline: true },
                        { name: lang === 'de' ? `👤 Mitglieder (${members.length})` : `👤 Members (${members.length})`, value: members.join('\n').slice(0, 1024) || (lang === 'de' ? 'Keine' : 'None') }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
