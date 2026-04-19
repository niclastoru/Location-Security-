const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client?.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        misc: 0x9B59B6,
        wyr: 0xE67E22
    };
    
    const titles = {
        de: {
            afk: 'AFK',
            already_afk: 'Bereits AFK',
            welcome_back: 'Willkommen zurück!',
            user_afk: 'ist AFK',
            choose: 'Ich wähle...',
            color: 'Farbe',
            random_color: 'Zufällige Farbe',
            invalid_hex: 'Ungültiger Hex',
            would_you_rather: 'Would You Rather...',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info',
            invalid_usage: 'Falsche Nutzung'
        },
        en: {
            afk: 'AFK',
            already_afk: 'Already AFK',
            welcome_back: 'Welcome Back!',
            user_afk: 'is AFK',
            choose: 'I choose...',
            color: 'Color',
            random_color: 'Random Color',
            invalid_hex: 'Invalid Hex',
            would_you_rather: 'Would You Rather...',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage'
        }
    };
    
    const descriptions = {
        de: {
            afk_set: (user, reason) => `${user} ist jetzt AFK!\n**Grund:** ${reason}`,
            already_afk: 'Du bist bereits AFK!',
            welcome_back: (user, duration) => `${user} ist nicht mehr AFK.\n**AFK seit:** ${duration}`,
            user_afk: (user, reason, duration) => `**Grund:** ${reason || 'Kein Grund'}\n**Seit:** ${duration}`,
            choose_options: '!choose Option1, Option2, Option3...',
            too_few_options: 'Zu wenige Optionen',
            choose_result: (choice, count) => `**${choice}**\n\nAus ${count} Optionen`,
            color_invalid: 'Beispiel: !color FF5733 oder #FF5733',
            color_rgb: (r, g, b) => `**RGB:** ${r}, ${g}, ${b}`,
            wyr_question: (a, b) => `🅰️ **${a}**\n\n**ODER**\n\n🅱️ **${b}**`,
            wyr_footer: 'Reagiere mit 🅰️ oder 🅱️ um abzustimmen!',
            no_reason: 'Kein Grund angegeben',
            days: 'Tag(en)',
            hours: 'Stunde(n)',
            minutes: 'Minute(n)'
        },
        en: {
            afk_set: (user, reason) => `${user} is now AFK!\n**Reason:** ${reason}`,
            already_afk: 'You are already AFK!',
            welcome_back: (user, duration) => `${user} is no longer AFK.\n**AFK since:** ${duration}`,
            user_afk: (user, reason, duration) => `**Reason:** ${reason || 'No reason'}\n**Since:** ${duration}`,
            choose_options: '!choose Option1, Option2, Option3...',
            too_few_options: 'Too few options',
            choose_result: (choice, count) => `**${choice}**\n\nFrom ${count} options`,
            color_invalid: 'Example: !color FF5733 or #FF5733',
            color_rgb: (r, g, b) => `**RGB:** ${r}, ${g}, ${b}`,
            wyr_question: (a, b) => `🅰️ **${a}**\n\n**OR**\n\n🅱️ **${b}**`,
            wyr_footer: 'React with 🅰️ or 🅱️ to vote!',
            no_reason: 'No reason given',
            days: 'day(s)',
            hours: 'hour(s)',
            minutes: 'minute(s)'
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
        .setColor(type === 'wyr' ? 0xE67E22 : type === 'misc' ? 0x9B59B6 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client?.user?.username || 'Bot', iconURL: client?.user?.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'wyr' ? '🤔' : '🎲';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = await client?.users?.fetch(userId).catch(() => null);
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

// ⭐ Dauer formatieren
function getDuration(since, lang = 'de') {
    const diff = Date.now() - since.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (lang === 'de') {
        if (days > 0) return `${days} Tag(en), ${hours % 24} Stunde(n)`;
        if (hours > 0) return `${hours} Stunde(n), ${minutes % 60} Minute(n)`;
        return `${minutes} Minute(n)`;
    } else {
        if (days > 0) return `${days} day(s), ${hours % 24} hour(s)`;
        if (hours > 0) return `${hours} hour(s), ${minutes % 60} minute(s)`;
        return `${minutes} minute(s)`;
    }
}

// ========== AFK HANDLER ==========
async function handleAfkReturn(message, supabase) {
    if (message.author.bot || !message.guild) return;
    
    const lang = message.client.languages?.get(message.guild.id) || 'de';
    
    // Prüfen ob der Author AFK ist
    const { data: authorAfk } = await supabase
        .from('afk_users')
        .select('*')
        .eq('guild_id', message.guild.id)
        .eq('user_id', message.author.id)
        .single();
    
    if (authorAfk) {
        // AFK entfernen
        await supabase.from('afk_users')
            .delete()
            .eq('guild_id', message.guild.id)
            .eq('user_id', message.author.id);
        
        // Nickname zurücksetzen
        try {
            const member = message.member;
            if (member.manageable && member.displayName.startsWith('[AFK] ')) {
                await member.setNickname(member.displayName.slice(6)).catch(() => {});
            }
        } catch {}
        
        const afkTime = new Date(authorAfk.afk_since);
        const duration = getDuration(afkTime, lang);
        
        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
            .setTitle(lang === 'de' ? '✅ Willkommen zurück!' : '✅ Welcome Back!')
            .setDescription(lang === 'de' 
                ? `${message.author} ist nicht mehr AFK.\n**AFK seit:** ${duration}`
                : `${message.author} is no longer AFK.\n**AFK since:** ${duration}`)
            .setTimestamp();
        
        const reply = await message.reply({ embeds: [embed] });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
    }
    
    // Prüfen ob erwähnte User AFK sind
    const mentionedUsers = message.mentions.users.filter(u => !u.bot && u.id !== message.author.id);
    
    for (const [id, user] of mentionedUsers) {
        const { data: mentionedAfk } = await supabase
            .from('afk_users')
            .select('*')
            .eq('guild_id', message.guild.id)
            .eq('user_id', user.id)
            .single();
        
        if (mentionedAfk) {
            const afkTime = new Date(mentionedAfk.afk_since);
            const duration = getDuration(afkTime, lang);
            
            const embed = new EmbedBuilder()
                .setColor(0x95A5A6)
                .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                .setTitle(lang === 'de' ? `💤 ${user.username} ist AFK` : `💤 ${user.username} is AFK`)
                .setDescription(lang === 'de'
                    ? `**Grund:** ${mentionedAfk.reason || 'Kein Grund'}\n**Seit:** ${duration}`
                    : `**Reason:** ${mentionedAfk.reason || 'No reason'}\n**Since:** ${duration}`)
                .setTimestamp();
            
            message.reply({ embeds: [embed] });
        }
    }
}

module.exports = {
    category: 'Miscellaneous',
    subCommands: {
        
        // ========== AFK ==========
        afk: {
            aliases: ['away'],
            description: 'Setzt dich auf AFK / Sets you as AFK',
            category: 'Miscellaneous',
            async execute(message, args, { client, supabase }) {
                const reason = args.join(' ') || (client.languages?.get(message.guild.id) === 'de' ? 'Kein Grund angegeben' : 'No reason given');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                // Prüfen ob bereits AFK
                const { data: existing } = await supabase
                    .from('afk_users')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (existing) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '❌ Bereits AFK' : '❌ Already AFK')
                        .setDescription(lang === 'de' ? 'Du bist bereits AFK!' : 'You are already AFK!')
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                // AFK setzen
                await supabase.from('afk_users').insert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    reason: reason
                });
                
                // Nickname ändern (falls möglich)
                try {
                    if (message.member.manageable) {
                        const nickname = message.member.displayName;
                        if (!nickname.startsWith('[AFK] ')) {
                            await message.member.setNickname(`[AFK] ${nickname.slice(0, 24)}`).catch(() => {});
                        }
                    }
                } catch {}
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '✅ AFK gesetzt' : '✅ AFK Set')
                    .setDescription(lang === 'de' 
                        ? `${message.author} ist jetzt AFK!\n**Grund:** ${reason}`
                        : `${message.author} is now AFK!\n**Reason:** ${reason}`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== CHOOSE ==========
        choose: {
            aliases: ['pick', 'entscheide'],
            description: 'Wählt zufällig aus Optionen / Randomly chooses from options',
            category: 'Miscellaneous',
            async execute(message, args, { client }) {
                const options = args.join(' ').split(',').map(o => o.trim()).filter(o => o);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (options.length < 2) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '❌ Zu wenige Optionen' : '❌ Too Few Options')
                        .setDescription(lang === 'de' ? '!choose Option1, Option2, Option3...' : '!choose Option1, Option2, Option3...')
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                const choice = options[Math.floor(Math.random() * options.length)];
                
                const embed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🎲 Ich wähle...' : '🎲 I choose...')
                    .setDescription(lang === 'de' 
                        ? `**${choice}**\n\nAus ${options.length} Optionen`
                        : `**${choice}**\n\nFrom ${options.length} options`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== COLOR ==========
        color: {
            aliases: ['colour', 'hex'],
            description: 'Zeigt eine Farbe an / Shows a color',
            category: 'Miscellaneous',
            async execute(message, args, { client }) {
                let hex = args[0]?.replace('#', '').toUpperCase();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                // Zufällige Farbe wenn keine angegeben
                if (!hex) {
                    hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                }
                
                // Hex-Validierung
                if (!/^[0-9A-F]{6}$/i.test(hex)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(lang === 'de' ? '❌ Ungültiger Hex' : '❌ Invalid Hex')
                        .setDescription(lang === 'de' ? 'Beispiel: !color FF5733 oder #FF5733' : 'Example: !color FF5733 or #FF5733')
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                
                const embed = new EmbedBuilder()
                    .setColor(parseInt(hex, 16))
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `🎨 Farbe #${hex}` : `🎨 Color #${hex}`)
                    .setDescription(lang === 'de' ? `**RGB:** ${r}, ${g}, ${b}` : `**RGB:** ${r}, ${g}, ${b}`)
                    .setThumbnail(`https://singlecolorimage.com/get/${hex}/100x100`)
                    .setImage(`https://singlecolorimage.com/get/${hex}/400x200`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== RANDOMHEX ==========
        randomhex: {
            aliases: ['rhex', 'randomcolor'],
            description: 'Generiert zufällige Hex-Farbe / Generates random hex color',
            category: 'Miscellaneous',
            async execute(message, args, { client }) {
                const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const embed = new EmbedBuilder()
                    .setColor(parseInt(hex, 16))
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `🎲 Zufällige Farbe #${hex}` : `🎲 Random Color #${hex}`)
                    .setDescription(lang === 'de' ? `**RGB:** ${r}, ${g}, ${b}` : `**RGB:** ${r}, ${g}, ${b}`)
                    .setThumbnail(`https://singlecolorimage.com/get/${hex}/100x100`)
                    .setImage(`https://singlecolorimage.com/get/${hex}/400x200`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== WOULDYOURATHER ==========
        wouldyourather: {
            aliases: ['wyr', 'rather'],
            description: 'Would You Rather Frage / Would You Rather question',
            category: 'Miscellaneous',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const questionsDe = [
                    { a: 'Für immer nur Pizza essen', b: 'Nie wieder Pizza essen' },
                    { a: 'Fliegen können', b: 'Unsichtbar sein' },
                    { a: 'In die Vergangenheit reisen', b: 'In die Zukunft reisen' },
                    { a: '100 Millionen € haben', b: 'Für immer glücklich sein' },
                    { a: 'Mit Tieren sprechen können', b: 'Alle Sprachen der Welt sprechen' },
                    { a: 'Superkraft: Superstärke', b: 'Superkraft: Gedanken lesen' },
                    { a: 'Immer 25 Jahre alt bleiben', b: 'Mit 50 in Rente gehen' },
                    { a: 'Nie wieder schlafen müssen', b: 'Nie wieder essen müssen' },
                    { a: 'Auf dem Mars leben', b: 'Am tiefsten Punkt des Ozeans leben' },
                    { a: 'Jeden Film perfekt erinnern', b: 'Jeden Film zum ersten Mal sehen' }
                ];
                
                const questionsEn = [
                    { a: 'Only eat pizza forever', b: 'Never eat pizza again' },
                    { a: 'Be able to fly', b: 'Be invisible' },
                    { a: 'Travel to the past', b: 'Travel to the future' },
                    { a: 'Have 100 million €', b: 'Be happy forever' },
                    { a: 'Talk to animals', b: 'Speak all languages' },
                    { a: 'Superpower: Super strength', b: 'Superpower: Mind reading' },
                    { a: 'Stay 25 forever', b: 'Retire at 50' },
                    { a: 'Never need to sleep', b: 'Never need to eat' },
                    { a: 'Live on Mars', b: 'Live at the deepest point of the ocean' },
                    { a: 'Remember every movie perfectly', b: 'Watch every movie for the first time' }
                ];
                
                const questions = lang === 'de' ? questionsDe : questionsEn;
                const q = questions[Math.floor(Math.random() * questions.length)];
                
                const embed = new EmbedBuilder()
                    .setColor(0xE67E22)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🤔 Would You Rather...' : '🤔 Would You Rather...')
                    .setDescription(lang === 'de' 
                        ? `🅰️ **${q.a}**\n\n**ODER**\n\n🅱️ **${q.b}**`
                        : `🅰️ **${q.a}**\n\n**OR**\n\n🅱️ **${q.b}**`)
                    .setFooter({ text: lang === 'de' ? 'Reagiere mit 🅰️ oder 🅱️ um abzustimmen!' : 'React with 🅰️ or 🅱️ to vote!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                const msg = await message.reply({ embeds: [embed] });
                await msg.react('🅰️');
                await msg.react('🅱️');
            }
        }
    }
};

module.exports.handleAfkReturn = handleAfkReturn;
