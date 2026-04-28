const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Modern clean embed
function createEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x2B2D31,
        warn: 0xFEE75C,
        utility: 0x2B2D31,
        booster: 0xFF73FA
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x2B2D31)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : type === 'warn' ? `⚠️ ${title}` : title)
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

// ⭐ Modern info embed without emoji prefix
function infoEmbed(message, title, description, fields = []) {
    const client = message.client;
    const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    if (fields.length > 0) {
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
            description: 'Show a user\'s avatar',
            category: 'Utility',
            async execute(message, args) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const avatarURL = target.displayAvatarURL({ dynamic: true, size: 1024 });
                
                const embed = infoEmbed(message, `${target.username}'s Avatar`, `[Download](${avatarURL})`)
                    .setImage(avatarURL);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== BASE64 ==========
        base64: {
            aliases: ['b64'],
            description: 'Encode/Decode Base64',
            category: 'Utility',
            async execute(message, args) {
                const action = args[0]?.toLowerCase();
                const text = args.slice(1).join(' ');
                
                if (!action || !text) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '`!base64 encode/decode <text>`')] 
                    });
                }
                
                if (action === 'encode' || action === 'e') {
                    const encoded = Buffer.from(text).toString('base64');
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Base64 Encode', `\`\`\`${encoded}\`\`\``)] 
                    });
                }
                
                if (action === 'decode' || action === 'd') {
                    try {
                        const decoded = Buffer.from(text, 'base64').toString('utf-8');
                        return message.reply({ 
                            embeds: [createEmbed(message, 'success', 'Base64 Decode', `\`\`\`${decoded}\`\`\``)] 
                        });
                    } catch {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Base64 Decode', 'Invalid Base64 string!')] 
                        });
                    }
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'error', 'Invalid Action', 'Use `encode` or `decode`!')] 
                });
            }
        },
        
        // ========== BOOSTERS ==========
        boosters: {
            aliases: ['boosts', 'booster'],
            description: 'Show all server boosters',
            category: 'Utility',
            async execute(message) {
                const boosters = message.guild.premiumSubscriptionCount || 0;
                const boosterMembers = message.guild.members.cache.filter(m => m.premiumSince).map(m => m.user.tag);
                
                const embed = infoEmbed(message, 'Server Boosts', `**${boosters}** Boosts (Level ${message.guild.premiumTier})`)
                    .setColor(0xFF73FA);
                
                if (boosterMembers.length > 0) {
                    embed.addFields([{
                        name: 'Boosters',
                        value: boosterMembers.join('\n').slice(0, 1024) || 'None'
                    }]);
                }
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== CHAT ==========
        chat: {
            aliases: ['talk'],
            description: 'Chat with the bot',
            category: 'Utility',
            async execute(message, args) {
                const text = args.join(' ');
                
                if (!text) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '`!chat <message>`')] 
                    });
                }
                
                const responses = [
                    'Interesting! Tell me more.',
                    'I see, understood.',
                    '🤔 That\'s a good question!',
                    'I need to think about that...',
                    'Really? I didn\'t know that!'
                ];
                
                const response = responses[Math.floor(Math.random() * responses.length)];
                
                return message.reply({ 
                    embeds: [infoEmbed(message, 'Chat', response)] 
                });
            }
        },
        
        // ========== CLEARSNIPE ==========
        clearsnipe: {
            aliases: ['cs'],
            permissions: 'ManageMessages',
            description: 'Clear the snipe cache',
            category: 'Utility',
            async execute(message) {
                message.client.snipes = message.client.snipes || new Map();
                message.client.snipes.delete(message.channel.id);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Snipe Cleared', `Snipe cache for ${message.channel} has been cleared.`)] 
                });
            }
        },
        
        // ========== DUMP ==========
        dump: {
            aliases: ['export'],
            description: 'Export channel messages',
            category: 'Utility',
            permissions: 'ManageMessages',
            async execute(message, args) {
                const limit = parseInt(args[0]) || 50;
                
                if (limit > 100) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Limit Exceeded', 'Maximum 100 messages!')] 
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
            description: 'Show the server banner',
            category: 'Utility',
            async execute(message) {
                const banner = message.guild.bannerURL({ dynamic: true, size: 1024 });
                
                if (!banner) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Banner', 'This server has no banner!')] 
                    });
                }
                
                const embed = infoEmbed(message, 'Server Banner', `[Download](${banner})`)
                    .setImage(banner);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== GUILDICON ==========
        guildicon: {
            aliases: ['servericon', 'gicon'],
            description: 'Show the server icon',
            category: 'Utility',
            async execute(message) {
                const icon = message.guild.iconURL({ dynamic: true, size: 1024 });
                
                if (!icon) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Icon', 'This server has no icon!')] 
                    });
                }
                
                const embed = infoEmbed(message, 'Server Icon', `[Download](${icon})`)
                    .setImage(icon);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== GUILDSPLASH ==========
        guildsplash: {
            aliases: ['serversplash', 'gsplash'],
            description: 'Show the server splash',
            category: 'Utility',
            async execute(message) {
                const splash = message.guild.splashURL({ dynamic: true, size: 1024 });
                
                if (!splash) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Splash', 'This server has no splash!')] 
                    });
                }
                
                const embed = infoEmbed(message, 'Server Splash', `[Download](${splash})`)
                    .setImage(splash);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== MEMBERCOUNT ==========
        membercount: {
            aliases: ['mc', 'members'],
            description: 'Show member count',
            category: 'Utility',
            async execute(message) {
                const guild = message.guild;
                const total = guild.memberCount;
                const humans = guild.members.cache.filter(m => !m.user.bot).size;
                const bots = guild.members.cache.filter(m => m.user.bot).size;
                const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
                
                const embed = infoEmbed(message, `Members of ${guild.name}`, '')
                    .addFields([
                        { name: 'Total', value: `${total}`, inline: true },
                        { name: '👤 Humans', value: `${humans}`, inline: true },
                        { name: '🤖 Bots', value: `${bots}`, inline: true },
                        { name: '🟢 Online', value: `${online}`, inline: true }
                    ]);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== REMIND ==========
        remind: {
            aliases: ['reminder'],
            description: 'Set a reminder',
            category: 'Utility',
            async execute(message, args) {
                const time = args[0];
                const reminder = args.slice(1).join(' ');
                
                if (!time || !reminder) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '`!remind <time> <message>`\nExample: `!remind 10m Get pizza`')] 
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
                        embeds: [createEmbed(message, 'error', 'Invalid Time', 'Use: `10s`, `5m`, `2h`, `1d`')] 
                    });
                }
                
                await message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Reminder Set', `I will remind you in ${time} about: **${reminder}**`)] 
                });
                
                setTimeout(() => {
                    const embed = infoEmbed(message, '⏰ Reminder', `**${reminder}**\nFrom: ${message.channel}`);
                    message.author.send({ embeds: [embed] }).catch(() => {
                        message.channel.send({ content: `${message.author}`, embeds: [embed] });
                    });
                }, ms);
            }
        },
        
        // ========== SAV (Server Avatar) ==========
        sav: {
            aliases: ['serverav', 'serveravatar'],
            description: 'Show server icon',
            category: 'Utility',
            async execute(message) {
                const icon = message.guild.iconURL({ dynamic: true, size: 1024 });
                
                if (!icon) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Icon', 'This server has no icon!')] 
                    });
                }
                
                const embed = infoEmbed(message, 'Server Icon', `[Download](${icon})`)
                    .setImage(icon);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== BANNER ==========
        banner: {
            aliases: ['ubanner'],
            description: 'Show user banner',
            category: 'Utility',
            async execute(message, args) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const user = await message.client.users.fetch(target.id, { force: true });
                const banner = user.bannerURL({ dynamic: true, size: 1024 });
                
                if (!banner) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Banner', `${target.username} has no banner!`)] 
                    });
                }
                
                const embed = infoEmbed(message, `${target.username}'s Banner`, `[Download](${banner})`)
                    .setImage(banner);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SERVERINFO (FIXED) ==========
        serverinfo: {
            aliases: ['si', 'guildinfo'],
            description: 'Show server information',
            category: 'Utility',
            async execute(message) {
                const guild = message.guild;
                const owner = await guild.fetchOwner();
                
                const embed = infoEmbed(message, guild.name, '')
                    .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
                    .addFields([
                        { name: '👑 Owner', value: `<@${owner.id}>`, inline: true },
                        { name: '🆔 Server ID', value: guild.id, inline: true },
                        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
                        { name: '💬 Channels', value: `${guild.channels.cache.size}`, inline: true },
                        { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
                        { name: '🚀 Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
                        { name: '🌍 Locale', value: guild.preferredLocale, inline: true }
                    ]);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SNIPE ==========
        snipe: {
            aliases: ['s'],
            description: 'Show the last deleted message',
            category: 'Utility',
            async execute(message) {
                message.client.snipes = message.client.snipes || new Map();
                const snipe = message.client.snipes.get(message.channel.id);
                
                if (!snipe) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'Snipe', 'Nothing has been deleted in this channel recently!')] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x2B2D31)
                    .setAuthor({ name: snipe.author, iconURL: snipe.avatar })
                    .setDescription(snipe.content || '*No text*')
                    .setFooter({ text: `Deleted at ${snipe.time}` })
                    .setTimestamp();
                
                if (snipe.attachments?.length > 0) {
                    embed.addFields([{ 
                        name: '📎 Attachments', 
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
            description: 'Steal an emoji',
            category: 'Utility',
            async execute(message, args) {
                const emojiName = args[0];
                const emojiUrl = args[1] || message.attachments.first()?.url;
                
                if (!emojiName) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '`!stealemoji <name> <emoji/url>`')] 
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
                        embeds: [createEmbed(message, 'error', 'No Image', 'Please provide an emoji, URL, or attach an image!')] 
                    });
                }
                
                try {
                    const emoji = await message.guild.emojis.create({ name: emojiName, attachment: url });
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Emoji Stolen', `${emoji} has been added!`)] 
                    });
                } catch (err) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Error', 'Could not create emoji!')] 
                    });
                }
            }
        },
        
        // ========== USERBANNER ==========
        userbanner: {
            aliases: ['ub'],
            description: 'Show user banner',
            category: 'Utility',
            async execute(message, args) {
                const target = message.mentions.users.first() || 
                               await message.client.users.fetch(args[0]).catch(() => null) || 
                               message.author;
                
                const user = await message.client.users.fetch(target.id, { force: true });
                const banner = user.bannerURL({ dynamic: true, size: 1024 });
                
                if (!banner) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Banner', `${target.username} has no banner!`)] 
                    });
                }
                
                const embed = infoEmbed(message, `${target.username}'s Banner`, `[Download](${banner})`)
                    .setImage(banner);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== USERINFO ==========
        userinfo: {
            aliases: ['ui', 'whois'],
            description: 'Show user information',
            category: 'Utility',
            async execute(message, args) {
                const target = message.mentions.members.first() || 
                               await message.guild.members.fetch(args[0]).catch(() => null) || 
                               message.member;
                
                const user = target.user;
                const roles = target.roles.cache.filter(r => r.id !== message.guild.id).sort((a, b) => b.position - a.position);
                
                const embed = infoEmbed(message, user.tag, '')
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setColor(target.displayColor || 0x2B2D31)
                    .addFields([
                        { name: '🆔 User ID', value: user.id, inline: true },
                        { name: '📅 Account', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
                        { name: '📥 Joined', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:D>`, inline: true },
                        { name: `🎭 Roles [${roles.size}]`, value: roles.map(r => `${r}`).join(' ').slice(0, 1024) || 'None' },
                        { name: '🚀 Booster', value: target.premiumSince ? `Since <t:${Math.floor(target.premiumSinceTimestamp / 1000)}:D>` : 'No', inline: true }
                    ]);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VC ==========
        vc: {
            aliases: ['voice', 'voiceinfo'],
            description: 'Show voice channel information',
            category: 'Utility',
            async execute(message) {
                const member = message.member;
                const vc = member.voice.channel;
                
                if (!vc) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Voice Info', 'You are not in a voice channel!')] 
                    });
                }
                
                const members = vc.members.map(m => m.user.tag);
                
                const embed = infoEmbed(message, vc.name, '')
                    .addFields([
                        { name: '📋 ID', value: vc.id, inline: true },
                        { name: '👥 Users', value: `${vc.members.size}`, inline: true },
                        { name: '📊 Bitrate', value: `${vc.bitrate / 1000} kbps`, inline: true },
                        { name: `👤 Members (${members.length})`, value: members.join('\n').slice(0, 1024) || 'None' }
                    ]);
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
