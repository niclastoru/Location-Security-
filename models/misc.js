module.exports = {
    category: 'Miscellaneous',
    subCommands: {
        
        // ========== AFK ==========
        afk: {
            aliases: ['away'],
            description: 'Setzt dich auf AFK',
            category: 'Miscellaneous',
            async execute(message, args, { supabase }) {
                const reason = args.join(' ') || 'Kein Grund angegeben';
                
                // Prüfen ob bereits AFK
                const { data: existing } = await supabase
                    .from('afk_users')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (existing) {
                    return message.reply({ embeds: [global.embed.error('Bereits AFK', 'Du bist bereits AFK!')] });
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
                
                return message.reply({ embeds: [global.embed.success('AFK gesetzt', `${message.author} ist jetzt AFK!\n**Grund:** ${reason}`)] });
            }
        },
        
        // ========== CHOOSE ==========
        choose: {
            aliases: ['pick', 'entscheide'],
            description: 'Wählt zufällig aus Optionen',
            category: 'Miscellaneous',
            async execute(message, args) {
                const options = args.join(' ').split(',').map(o => o.trim()).filter(o => o);
                
                if (options.length < 2) {
                    return message.reply({ embeds: [global.embed.error('Zu wenige Optionen', '!choose Option1, Option2, Option3...')] });
                }
                
                const choice = options[Math.floor(Math.random() * options.length)];
                
                return message.reply({ embeds: [{
                    color: 0x9B59B6,
                    title: '🎲 Ich wähle...',
                    description: `**${choice}**`,
                    footer: { text: `Aus ${options.length} Optionen` }
                }] });
            }
        },
        
        // ========== COLOR ==========
        color: {
            aliases: ['colour', 'hex'],
            description: 'Zeigt eine Farbe an',
            category: 'Miscellaneous',
            async execute(message, args) {
                let hex = args[0]?.replace('#', '').toUpperCase();
                
                // Zufällige Farbe wenn keine angegeben
                if (!hex) {
                    hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                }
                
                // Hex-Validierung
                if (!/^[0-9A-F]{6}$/i.test(hex)) {
                    return message.reply({ embeds: [global.embed.error('Ungültiger Hex', 'Beispiel: !color FF5733 oder #FF5733')] });
                }
                
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                
                return message.reply({ embeds: [{
                    color: parseInt(hex, 16),
                    title: `🎨 Farbe #${hex}`,
                    description: `**RGB:** ${r}, ${g}, ${b}`,
                    thumbnail: { url: `https://singlecolorimage.com/get/${hex}/100x100` },
                    image: { url: `https://singlecolorimage.com/get/${hex}/400x200` }
                }] });
            }
        },
        
        // ========== RANDOMHEX ==========
        randomhex: {
            aliases: ['rhex', 'randomcolor'],
            description: 'Generiert zufällige Hex-Farbe',
            category: 'Miscellaneous',
            async execute(message) {
                const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                
                return message.reply({ embeds: [{
                    color: parseInt(hex, 16),
                    title: `🎲 Zufällige Farbe #${hex}`,
                    description: `**RGB:** ${r}, ${g}, ${b}`,
                    thumbnail: { url: `https://singlecolorimage.com/get/${hex}/100x100` },
                    image: { url: `https://singlecolorimage.com/get/${hex}/400x200` }
                }] });
            }
        },
        
        // ========== WOULDYOURATHER ==========
        wouldyourather: {
            aliases: ['wyr', 'rather'],
            description: 'Would You Rather Frage',
            category: 'Miscellaneous',
            async execute(message) {
                const questions = [
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
                
                const q = questions[Math.floor(Math.random() * questions.length)];
                
                return message.reply({ embeds: [{
                    color: 0xE67E22,
                    title: '🤔 Would You Rather...',
                    description: `🅰️ **${q.a}**\n\n**ODER**\n\n🅱️ **${q.b}**`,
                    footer: { text: 'Reagiere mit 🅰️ oder 🅱️ um abzustimmen!' }
                }] }).then(async (msg) => {
                    await msg.react('🅰️');
                    await msg.react('🅱️');
                });
            }
        }
    }
};

// ========== AFK HANDLER (in index.js einfügen) ==========
async function handleAfkReturn(message, supabase) {
    if (message.author.bot || !message.guild) return;
    
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
        const duration = getDuration(afkTime);
        
        const reply = await message.reply({ embeds: [global.embed.success('Willkommen zurück!', `${message.author} ist nicht mehr AFK.\n**AFK seit:** ${duration}`)] });
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
            const duration = getDuration(afkTime);
            
            message.reply({ embeds: [{
                color: 0x95A5A6,
                title: `💤 ${user.username} ist AFK`,
                description: `**Grund:** ${mentionedAfk.reason || 'Kein Grund'}\n**Seit:** ${duration}`
            }] });
        }
    }
}

function getDuration(since) {
    const diff = Date.now() - since.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} Tag(en), ${hours % 24} Stunde(n)`;
    if (hours > 0) return `${hours} Stunde(n), ${minutes % 60} Minute(n)`;
    return `${minutes} Minute(n)`;
}

module.exports.handleAfkReturn = handleAfkReturn;
