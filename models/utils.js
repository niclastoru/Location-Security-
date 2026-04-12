module.exports = {
    category: 'Utility',
    subCommands: {
        
        // ========== USERAVATAR ==========
        useravatar: {
            aliases: ['av', 'avatar'],
            description: 'Zeigt das Profilbild eines Users',
            category: 'Utility',
            async execute(message, args) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const avatarURL = target.displayAvatarURL({ dynamic: true, size: 1024 });
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🖼️ Avatar von ${target.username}`,
                    image: { url: avatarURL },
                    footer: { text: `Angefordert von ${message.author.username}` }
                }] });
            }
        },
        
        // ========== BASE64 ==========
        base64: {
            aliases: ['b64'],
            description: 'Enkodiert/Dekodiert Base64',
            category: 'Utility',
            async execute(message, args) {
                const action = args[0]?.toLowerCase();
                const text = args.slice(1).join(' ');
                
                if (!action || !text) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!base64 <encode/decode> <Text>')] });
                }
                
                if (action === 'encode' || action === 'e') {
                    const encoded = Buffer.from(text).toString('base64');
                    return message.reply({ embeds: [global.embed.success('Base64 Encode', `\`\`\`${encoded}\`\`\``)] });
                }
                
                if (action === 'decode' || action === 'd') {
                    try {
                        const decoded = Buffer.from(text, 'base64').toString('utf-8');
                        return message.reply({ embeds: [global.embed.success('Base64 Decode', `\`\`\`${decoded}\`\`\``)] });
                    } catch {
                        return message.reply({ embeds: [global.embed.error('Fehler', 'Ungültiger Base64 String!')] });
                    }
                }
                
                return message.reply({ embeds: [global.embed.error('Falsche Aktion', 'Nutze `encode` oder `decode`!')] });
            }
        },
        
        // ========== BOOSTERS ==========
        boosters: {
            aliases: ['boosts', 'booster'],
            description: 'Zeigt alle Server-Booster',
            category: 'Utility',
            async execute(message) {
                const boosters = message.guild.premiumSubscriptionCount || 0;
                const boosterMembers = message.guild.members.cache.filter(m => m.premiumSince).map(m => m.user.tag);
                
                const embed = {
                    color: 0xFF73FA,
                    title: `🚀 Server Boosts`,
                    description: `**${boosters}** Boosts (Level ${message.guild.premiumTier})`,
                    fields: [],
                    footer: { text: `${boosterMembers.length} Booster` }
                };
                
                if (boosterMembers.length > 0) {
                    embed.fields.push({
                        name: 'Booster',
                        value: boosterMembers.join('\n').slice(0, 1024) || 'Keine'
                    });
                }
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== CHAT ==========
        chat: {
            aliases: ['talk'],
            description: 'Schreibt mit dem Bot',
            category: 'Utility',
            async execute(message, args) {
                const text = args.join(' ');
                if (!text) return message.reply({ embeds: [global.embed.error('Kein Text', '!chat <Nachricht>')] });
                
                // Einfache Antworten
                const responses = [
                    'Interessant! Erzähl mir mehr.',
                    'Aha, verstehe.',
                    '🤔 Das ist eine gute Frage!',
                    'Darüber muss ich nachdenken...',
                    'Echt? Das wusste ich nicht!'
                ];
                
                const response = responses[Math.floor(Math.random() * responses.length)];
                return message.reply({ embeds: [global.embed.info('Chat', response)] });
            }
        },
        
        // ========== CHATGPT ==========
        chatgpt: {
            aliases: ['gpt', 'ai'],
            description: 'Fragt ChatGPT (Simulation)',
            category: 'Utility',
            async execute(message, args) {
                const question = args.join(' ');
                if (!question) return message.reply({ embeds: [global.embed.error('Keine Frage', '!chatgpt <Frage>')] });
                
                // Simulation - für echte API müsste man OpenAI einbinden
                return message.reply({ embeds: [global.embed.info('ChatGPT', '🤖 *Simulation:* Das ist eine interessante Frage! Leider ist die API nicht konfiguriert.')] });
            }
        },
        
        // ========== CLEARSNIPE ==========
        clearsnipe: {
            aliases: ['cs'],
            permissions: 'ManageMessages',
            description: 'Löscht den Snipe-Cache',
            category: 'Utility',
            async execute(message) {
                message.client.snipes = message.client.snipes || new Map();
                message.client.snipes.delete(message.channel.id);
                return message.reply({ embeds: [global.embed.success('Snipe gelöscht', `Snipe-Cache für ${message.channel} wurde geleert.`)] });
            }
        },
        
        // ========== DUMP ==========
        dump: {
            aliases: ['export'],
            description: 'Exportiert Channel-Nachrichten',
            category: 'Utility',
            permissions: 'ManageMessages',
            async execute(message, args) {
                const limit = parseInt(args[0]) || 50;
                if (limit > 100) return message.reply({ embeds: [global.embed.error('Limit', 'Maximal 100 Nachrichten!')] });
                
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
            description: 'Zeigt den Server-Banner',
            category: 'Utility',
            async execute(message) {
                const banner = message.guild.bannerURL({ dynamic: true, size: 1024 });
                if (!banner) return message.reply({ embeds: [global.embed.error('Kein Banner', 'Dieser Server hat keinen Banner!')] });
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🖼️ Server Banner`,
                    image: { url: banner }
                }] });
            }
        },
        
        // ========== GUILDICON ==========
        guildicon: {
            aliases: ['servericon', 'gicon'],
            description: 'Zeigt das Server-Icon',
            category: 'Utility',
            async execute(message) {
                const icon = message.guild.iconURL({ dynamic: true, size: 1024 });
                if (!icon) return message.reply({ embeds: [global.embed.error('Kein Icon', 'Dieser Server hat kein Icon!')] });
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🖼️ Server Icon`,
                    image: { url: icon }
                }] });
            }
        },
        
        // ========== GUILDSPLASH ==========
        guildsplash: {
            aliases: ['serversplash', 'gsplash'],
            description: 'Zeigt den Server-Splash',
            category: 'Utility',
            async execute(message) {
                const splash = message.guild.splashURL({ dynamic: true, size: 1024 });
                if (!splash) return message.reply({ embeds: [global.embed.error('Kein Splash', 'Dieser Server hat keinen Splash!')] });
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🖼️ Server Splash`,
                    image: { url: splash }
                }] });
            }
        },
        
        // ========== MEMBERCOUNT ==========
        membercount: {
            aliases: ['mc', 'members'],
            description: 'Zeigt die Mitgliederzahl',
            category: 'Utility',
            async execute(message) {
                const guild = message.guild;
                const total = guild.memberCount;
                const humans = guild.members.cache.filter(m => !m.user.bot).size;
                const bots = guild.members.cache.filter(m => m.user.bot).size;
                const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `👥 Mitglieder von ${guild.name}`,
                    fields: [
                        { name: 'Gesamt', value: `${total}`, inline: true },
                        { name: '👤 Menschen', value: `${humans}`, inline: true },
                        { name: '🤖 Bots', value: `${bots}`, inline: true },
                        { name: '🟢 Online', value: `${online}`, inline: true }
                    ]
                }] });
            }
        },
        
        // ========== REMIND ==========
        remind: {
            aliases: ['reminder', 'erinnerung'],
            description: 'Setzt eine Erinnerung',
            category: 'Utility',
            async execute(message, args) {
                const time = args[0];
                const reminder = args.slice(1).join(' ');
                
                if (!time || !reminder) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!remind <Zeit> <Nachricht>\nBeispiel: !remind 10m Pizza holen')] });
                }
                
                // Zeit parsen
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
                        message.channel.send({ embeds: [global.embed.info('⏰ Erinnerung', `${message.author}, **${reminder}**`)] });
                    });
                }, ms);
            }
        },
        
        // ========== REMINDERS ==========
        reminders: {
            aliases: ['reminds'],
            description: 'Zeigt aktive Erinnerungen (Platzhalter)',
            category: 'Utility',
            async execute(message) {
                return message.reply({ embeds: [global.embed.info('Erinnerungen', 'Aktive Erinnerungen werden nicht persistent gespeichert.')] });
            }
        },
        
        // ========== SCREENSHOT ==========
        screenshot: {
            aliases: ['ss', 'web'],
            description: 'Macht Screenshot von Website',
            category: 'Utility',
            async execute(message, args) {
                const url = args[0];
                if (!url) return message.reply({ embeds: [global.embed.error('Keine URL', '!screenshot <https://...>')] });
                
                if (!url.startsWith('http')) {
                    return message.reply({ embeds: [global.embed.error('Ungültige URL', 'URL muss mit http:// oder https:// beginnen!')] });
                }
                
                // API-Simulation
                return message.reply({ embeds: [global.embed.info('Screenshot', `🔗 Screenshot von ${url}\n*Für echte Screenshots wird eine API benötigt.*`)] });
            }
        },
        
        // ========== SAV / BANNER ==========
        sav: {
            aliases: ['serverav', 'serveravatar'],
            description: 'Server Avatar (Alias für guildicon)',
            category: 'Utility',
            async execute(message) {
                const icon = message.guild.iconURL({ dynamic: true, size: 1024 });
                if (!icon) return message.reply({ embeds: [global.embed.error('Kein Icon', 'Dieser Server hat kein Icon!')] });
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🖼️ Server Icon`,
                    image: { url: icon }
                }] });
            }
        },
        
        banner: {
            aliases: ['ubanner'],
            description: 'Zeigt den User-Banner',
            category: 'Utility',
            async execute(message, args) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const user = await message.client.users.fetch(target.id, { force: true });
                const banner = user.bannerURL({ dynamic: true, size: 1024 });
                
                if (!banner) {
                    return message.reply({ embeds: [global.embed.error('Kein Banner', `${target.username} hat keinen Banner!`)] });
                }
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🖼️ Banner von ${target.username}`,
                    image: { url: banner }
                }] });
            }
        },
        
        // ========== SERVERINFO ==========
        serverinfo: {
            aliases: ['si', 'guildinfo'],
            description: 'Zeigt Server-Informationen',
            category: 'Utility',
            async execute(message) {
                const guild = message.guild;
                const owner = await guild.fetchOwner();
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `📊 ${guild.name}`,
                    thumbnail: { url: guild.iconURL({ dynamic: true }) },
                    fields: [
                        { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
                        { name: '🆔 Server ID', value: guild.id, inline: true },
                        { name: '📅 Erstellt', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: '👥 Mitglieder', value: `${guild.memberCount}`, inline: true },
                        { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
                        { name: '🎭 Rollen', value: `${guild.roles.cache.size}`, inline: true },
                        { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
                        { name: '🌍 Region', value: guild.preferredLocale, inline: true }
                    ],
                    footer: { text: `Angefordert von ${message.author.tag}` }
                }] });
            }
        },
        
        // ========== SNIPE ==========
        snipe: {
            aliases: ['s'],
            description: 'Zeigt die letzte gelöschte Nachricht',
            category: 'Utility',
            async execute(message) {
                message.client.snipes = message.client.snipes || new Map();
                const snipe = message.client.snipes.get(message.channel.id);
                
                if (!snipe) {
                    return message.reply({ embeds: [global.embed.info('Kein Snipe', 'In diesem Channel wurde kürzlich nichts gelöscht!')] });
                }
                
                const embed = {
                    color: 0xFFA500,
                    author: {
                        name: snipe.author,
                        icon_url: snipe.avatar
                    },
                    description: snipe.content || '*Kein Text*',
                    footer: { text: `Gelöscht um ${snipe.time}` }
                };
                
                if (snipe.attachments?.length > 0) {
                    embed.fields = [{ name: '📎 Anhänge', value: snipe.attachments.join('\n') }];
                    if (snipe.attachments[0].match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                        embed.image = { url: snipe.attachments[0] };
                    }
                }
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== STEALEMOJI ==========
        stealemoji: {
            aliases: ['steal', 'addemoji'],
            permissions: 'ManageEmojisAndStickers',
            description: 'Klaut ein Emoji',
            category: 'Utility',
            async execute(message, args) {
                const emojiName = args[0];
                const emojiUrl = args[1] || message.attachments.first()?.url;
                
                if (!emojiName) {
                    return message.reply({ embeds: [global.embed.error('Kein Name', '!stealemoji <Name> <URL/Bild>')] });
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
                    return message.reply({ embeds: [global.embed.error('Kein Bild', 'Bitte Emoji, URL oder Bild anhängen!')] });
                }
                
                try {
                    const emoji = await message.guild.emojis.create({ name: emojiName, attachment: url });
                    return message.reply({ embeds: [global.embed.success('Emoji geklaut', `${emoji} wurde hinzugefügt!`)] });
                } catch (err) {
                    return message.reply({ embeds: [global.embed.error('Fehler', 'Konnte Emoji nicht erstellen!')] });
                }
            }
        },
        
        // ========== USERBANNER ==========
        userbanner: {
            aliases: ['ub'],
            description: 'Zeigt User-Banner (Alias für banner)',
            category: 'Utility',
            async execute(message, args) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const user = await message.client.users.fetch(target.id, { force: true });
                const banner = user.bannerURL({ dynamic: true, size: 1024 });
                
                if (!banner) {
                    return message.reply({ embeds: [global.embed.error('Kein Banner', `${target.username} hat keinen Banner!`)] });
                }
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🖼️ Banner von ${target.username}`,
                    image: { url: banner }
                }] });
            }
        },
        
        // ========== USERINFO ==========
        userinfo: {
            aliases: ['ui', 'whois'],
            description: 'Zeigt User-Informationen',
            category: 'Utility',
            async execute(message, args) {
                const target = message.mentions.members.first() || 
                               await message.guild.members.fetch(args[0]).catch(() => null) || 
                               message.member;
                
                const user = target.user;
                const roles = target.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position);
                
                return message.reply({ embeds: [{
                    color: target.displayColor || 0x0099FF,
                    author: { name: user.tag, icon_url: user.displayAvatarURL() },
                    thumbnail: { url: user.displayAvatarURL({ dynamic: true }) },
                    fields: [
                        { name: '🆔 User ID', value: user.id, inline: true },
                        { name: '📅 Account erstellt', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: '📥 Beigetreten', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`, inline: true },
                        { name: `🎭 Rollen [${roles.size}]`, value: roles.map(r => `${r}`).join(' ').slice(0, 1024) || 'Keine' },
                        { name: '🚀 Booster', value: target.premiumSince ? `Seit <t:${Math.floor(target.premiumSinceTimestamp / 1000)}:D>` : 'Nein', inline: true }
                    ],
                    footer: { text: `Angefordert von ${message.author.tag}` }
                }] });
            }
        },
        
        // ========== VC ==========
        vc: {
            aliases: ['voice', 'voiceinfo'],
            description: 'Zeigt Voice-Channel Informationen',
            category: 'Utility',
            async execute(message) {
                const member = message.member;
                const vc = member.voice.channel;
                
                if (!vc) {
                    return message.reply({ embeds: [global.embed.error('Nicht im VC', 'Du bist in keinem Voice-Channel!')] });
                }
                
                const members = vc.members.map(m => m.user.tag);
                
                return message.reply({ embeds: [{
                    color: 0x0099FF,
                    title: `🔊 ${vc.name}`,
                    fields: [
                        { name: '📋 ID', value: vc.id, inline: true },
                        { name: '👥 User', value: `${vc.members.size}`, inline: true },
                        { name: '📊 Bitrate', value: `${vc.bitrate / 1000} kbps`, inline: true },
                        { name: `👤 Mitglieder (${members.length})`, value: members.join('\n').slice(0, 1024) || 'Keine' }
                    ]
                }] });
            }
        }
    }
};
