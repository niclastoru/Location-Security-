module.exports = {
    category: 'Fun',
    subCommands: {
        
        // ========== BLOWJOB ==========
        blowjob: {
            aliases: ['bj'],
            description: 'Gibt jemandem einen Blowjob',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!blowjob @User')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Das kannst du nicht bei dir selbst machen!')] });
                
                return message.reply({ embeds: [{
                    color: 0xFF69B4,
                    description: `😮 **${message.author.username}** gibt **${target.username}** einen Blowjob!`
                }] });
            }
        },
        
        // ========== BODYCOUNT ==========
        bodycount: {
            aliases: ['bc'],
            description: 'Zeigt deinen Bodycount',
            category: 'Fun',
            async execute(message) {
                const count = Math.floor(Math.random() * 50);
                return message.reply({ embeds: [global.embed.info('Bodycount', `🔪 **${message.author.username}** hat einen Bodycount von **${count}**!`)] });
            }
        },
        
        // ========== CHEAT ==========
        cheat: {
            aliases: ['fremdgehen'],
            description: 'Geht jemandem fremd',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!cheat @User')] });
                
                return message.reply({ embeds: [{
                    color: 0xFF0000,
                    description: `💔 **${message.author.username}** geht **${target.username}** fremd! Skandal!`
                }] });
            }
        },
        
        // ========== CRY ==========
        cry: {
            aliases: ['weinen'],
            description: 'Weint',
            category: 'Fun',
            async execute(message) {
                const cries = ['😭', '😢', '🥺', '😿', '💧'];
                const emoji = cries[Math.floor(Math.random() * cries.length)];
                return message.reply({ embeds: [{
                    color: 0x87CEEB,
                    description: `${emoji} **${message.author.username}** weint...`
                }] });
            }
        },
        
        // ========== CUDDLE ==========
        cuddle: {
            aliases: ['kuscheln'],
            description: 'Kuschelt mit jemandem',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!cuddle @User')] });
                
                return message.reply({ embeds: [{
                    color: 0xFFC0CB,
                    description: `🤗 **${message.author.username}** kuschelt mit **${target.username}**! So süß!`
                }] });
            }
        },
        
        // ========== DIVORCE ==========
        divorce: {
            aliases: ['scheidung'],
            description: 'Lässt sich scheiden',
            category: 'Fun',
            async execute(message, args, { supabase }) {
                // Prüfen ob verheiratet
                const { data: marriage } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!marriage) {
                    return message.reply({ embeds: [global.embed.error('Nicht verheiratet', 'Du bist nicht verheiratet!')] });
                }
                
                // Beide Einträge löschen
                await supabase.from('marriages').delete().eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                await supabase.from('marriages').delete().eq('guild_id', message.guild.id).eq('user_id', marriage.partner_id);
                
                const partner = await message.client.users.fetch(marriage.partner_id).catch(() => null);
                const partnerName = partner?.username || 'Unbekannt';
                
                return message.reply({ embeds: [{
                    color: 0xFF0000,
                    description: `💔 **${message.author.username}** hat sich von **${partnerName}** scheiden lassen!`
                }] });
            }
        },
        
        // ========== FORTUNE ==========
        fortune: {
            aliases: ['cookie', 'glückskeks'],
            description: 'Öffnet einen Glückskeks',
            category: 'Fun',
            async execute(message) {
                const fortunes = [
                    '🍀 Dir steht eine große Überraschung bevor!',
                    '🌟 Deine Zukunft sieht hell aus!',
                    '💰 Geld kommt bald zu dir!',
                    '❤️ Die Liebe klopft an deine Tür!',
                    '🎉 Ein Fest erwartet dich!',
                    '😴 Du solltest mehr schlafen...',
                    '🍕 Pizza ist die Antwort auf alles!'
                ];
                const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
                return message.reply({ embeds: [global.embed.info('🥠 Glückskeks', fortune)] });
            }
        },
        
        // ========== HANDHOLD ==========
        handhold: {
            aliases: ['händchenhalten'],
            description: 'Hält Händchen',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!handhold @User')] });
                
                return message.reply({ embeds: [{
                    color: 0xFFB6C1,
                    description: `🤝 **${message.author.username}** hält Händchen mit **${target.username}**!`
                }] });
            }
        },
        
        // ========== HIGHFIVE ==========
        highfive: {
            aliases: ['hf'],
            description: 'Gibt einen Highfive',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!highfive @User')] });
                
                return message.reply({ embeds: [{
                    color: 0xFFD700,
                    description: `✋ **${message.author.username}** gibt **${target.username}** einen Highfive!`
                }] });
            }
        },
        
        // ========== HUG ==========
        hug: {
            aliases: ['umarmen'],
            description: 'Umarmt jemanden',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!hug @User')] });
                
                return message.reply({ embeds: [{
                    color: 0xFF69B4,
                    description: `🫂 **${message.author.username}** umarmt **${target.username}**!`
                }] });
            }
        },
        
        // ========== IMPOSTER-START ==========
        'imposter-start': {
            aliases: ['amongus-start', 'imposter'],
            description: 'Startet eine Imposter-Runde',
            category: 'Fun',
            async execute(message) {
                message.client.imposterGame = message.client.imposterGame || new Map();
                
                if (message.client.imposterGame.has(message.channel.id)) {
                    return message.reply({ embeds: [global.embed.error('Spiel läuft', 'In diesem Channel läuft bereits ein Imposter-Spiel!')] });
                }
                
                message.client.imposterGame.set(message.channel.id, {
                    players: new Set([message.author.id]),
                    imposters: new Set(),
                    started: false,
                    host: message.author.id
                });
                
                return message.reply({ embeds: [global.embed.success('Imposter gestartet', `🎮 **${message.author.username}** hat ein Imposter-Spiel gestartet!\nNutze \`!imposter-join\` zum Mitmachen!\n\`!imposter-vote @User\` zum Voten!`)] });
            }
        },
        
        // ========== IMPOSTER-STOP ==========
        'imposter-stop': {
            aliases: ['amongus-stop'],
            description: 'Beendet Imposter-Runde',
            category: 'Fun',
            async execute(message) {
                message.client.imposterGame = message.client.imposterGame || new Map();
                
                if (!message.client.imposterGame.has(message.channel.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Spiel', 'In diesem Channel läuft kein Imposter-Spiel!')] });
                }
                
                message.client.imposterGame.delete(message.channel.id);
                return message.reply({ embeds: [global.embed.success('Spiel beendet', 'Imposter-Spiel wurde beendet!')] });
            }
        },
        
        // ========== IMPOSTER-VOTE ==========
        'imposter-vote': {
            aliases: ['amongus-vote', 'vote'],
            description: 'Votet einen Spieler raus',
            category: 'Fun',
            async execute(message, args) {
                const game = message.client.imposterGame?.get(message.channel.id);
                if (!game) return message.reply({ embeds: [global.embed.error('Kein Spiel', 'Kein aktives Imposter-Spiel!')] });
                
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!imposter-vote @User')] });
                
                const isImposter = Math.random() < 0.3;
                
                if (isImposter) {
                    return message.reply({ embeds: [global.embed.success('Erwischt!', `🔪 **${target.username}** war der Imposter! Gut gemacht!`)] });
                } else {
                    return message.reply({ embeds: [global.embed.error('Unschuldig', `😇 **${target.username}** war kein Imposter...`)] });
                }
            }
        },
        
        // ========== KISS ==========
        kiss: {
            aliases: ['küssen'],
            description: 'Küsst jemanden',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!kiss @User')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Dich selbst küssen? Wirklich?')] });
                
                return message.reply({ embeds: [{
                    color: 0xFF69B4,
                    description: `💋 **${message.author.username}** küsst **${target.username}**! Wie romantisch!`
                }] });
            }
        },
        
        // ========== LICK ==========
        lick: {
            aliases: ['lecken'],
            description: 'Leckt jemanden',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!lick @User')] });
                
                return message.reply({ embeds: [{
                    color: 0xFFA500,
                    description: `👅 **${message.author.username}** leckt **${target.username}**! Ewww!`
                }] });
            }
        },
        
        // ========== MARRY (MIT SUPABASE + ANFRAGE) ==========
        marry: {
            aliases: ['heiraten', 'marry'],
            description: 'Macht einen Heiratsantrag',
            category: 'Fun',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!marry @User')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst dich nicht selbst heiraten!')] });
                if (target.bot) return message.reply({ embeds: [global.embed.error('Bot?', 'Du kannst keinen Bot heiraten!')] });
                
                // Prüfen ob einer bereits verheiratet ist
                const { data: authorMarried } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (authorMarried) {
                    const partner = await client.users.fetch(authorMarried.partner_id).catch(() => null);
                    return message.reply({ embeds: [global.embed.error('Bereits verheiratet', `Du bist bereits mit **${partner?.username || 'jemandem'}** verheiratet!\nNutze \`!divorce\` für Scheidung.`)] });
                }
                
                const { data: targetMarried } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (targetMarried) {
                    return message.reply({ embeds: [global.embed.error('Bereits verheiratet', `**${target.username}** ist bereits verheiratet!`)] });
                }
                
                // Prüfen ob bereits eine Anfrage existiert
                const { data: existingRequest } = await supabase
                    .from('marriage_requests')
                    .select('id')
                    .eq('guild_id', message.guild.id)
                    .eq('from_user', message.author.id)
                    .eq('to_user', target.id)
                    .single();
                
                if (existingRequest) {
                    return message.reply({ embeds: [global.embed.error('Anfrage existiert', `Du hast **${target.username}** bereits einen Antrag gemacht!`)] });
                }
                
                // Anfrage speichern
                await supabase.from('marriage_requests').insert({
                    guild_id: message.guild.id,
                    from_user: message.author.id,
                    to_user: target.id
                });
                
                // Buttons für Ja/Nein
                const row = {
                    type: 1,
                    components: [
                        { type: 2, style: 3, label: '✅ Ja, ich will!', custom_id: `marry_accept_${message.author.id}`, emoji: { name: '💍' } },
                        { type: 2, style: 4, label: '❌ Nein', custom_id: `marry_reject_${message.author.id}`, emoji: { name: '💔' } }
                    ]
                };
                
                const proposalEmbed = {
                    color: 0xFF69B4,
                    title: '💍 Heiratsantrag!',
                    description: `**${message.author.username}** möchte **${target.username}** heiraten!\n\n${target}, willst du?`,
                    footer: { text: 'Antwort mit den Buttons unten!' }
                };
                
                await message.reply({ 
                    content: `${target}`,
                    embeds: [proposalEmbed], 
                    components: [row] 
                });
                
                // Collector für Button-Antwort
                const filter = i => i.user.id === target.id;
                const collector = message.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });
                
                collector.on('collect', async (interaction) => {
                    const isAccept = interaction.customId.startsWith('marry_accept');
                    
                    // Anfrage löschen
                    await supabase.from('marriage_requests')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('from_user', message.author.id)
                        .eq('to_user', target.id);
                    
                    if (isAccept) {
                        // Beide in DB eintragen
                        await supabase.from('marriages').insert([
                            { guild_id: message.guild.id, user_id: message.author.id, partner_id: target.id },
                            { guild_id: message.guild.id, user_id: target.id, partner_id: message.author.id }
                        ]);
                        
                        const successEmbed = {
                            color: 0xFF69B4,
                            title: '💒 Verheiratet!',
                            description: `🎉 **${message.author.username}** und **${target.username}** sind jetzt verheiratet!\nAlles Gute für die Zukunft! 💕`
                        };
                        
                        await interaction.update({ embeds: [successEmbed], components: [] });
                        message.channel.send({ content: `🎊 Glückwunsch ${message.author} & ${target}! 🎊` });
                        
                    } else {
                        const rejectEmbed = {
                            color: 0xFF0000,
                            title: '💔 Antrag abgelehnt',
                            description: `**${target.username}** hat den Antrag von **${message.author.username}** abgelehnt... 😢`
                        };
                        
                        await interaction.update({ embeds: [rejectEmbed], components: [] });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        // Timeout - Anfrage löschen
                        await supabase.from('marriage_requests')
                            .delete()
                            .eq('guild_id', message.guild.id)
                            .eq('from_user', message.author.id)
                            .eq('to_user', target.id);
                        
                        const timeoutEmbed = {
                            color: 0x808080,
                            title: '⏰ Antrag abgelaufen',
                            description: `**${target.username}** hat nicht rechtzeitig geantwortet...`
                        };
                        
                        await message.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                    }
                });
            }
        },
        
        // ========== MARRYSTATUS (MIT SUPABASE) ==========
        marrystatus: {
            aliases: ['beziehungsstatus', 'status', 'relationship'],
            description: 'Zeigt deinen Beziehungsstatus',
            category: 'Fun',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                
                const { data: marriage } = await supabase
                    .from('marriages')
                    .select('partner_id, married_at')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                let status = '❤️ Single';
                let partner = null;
                let marriedAt = null;
                
                if (marriage) {
                    status = '💍 Verheiratet';
                    partner = await client.users.fetch(marriage.partner_id).catch(() => null);
                    marriedAt = marriage.married_at;
                }
                
                // Pending Anfragen prüfen
                const { data: pendingFrom } = await supabase
                    .from('marriage_requests')
                    .select('from_user')
                    .eq('guild_id', message.guild.id)
                    .eq('to_user', target.id)
                    .single();
                
                const { data: pendingTo } = await supabase
                    .from('marriage_requests')
                    .select('to_user')
                    .eq('guild_id', message.guild.id)
                    .eq('from_user', target.id)
                    .single();
                
                let pendingText = '';
                if (pendingFrom) {
                    const fromUser = await client.users.fetch(pendingFrom.from_user).catch(() => null);
                    pendingText = `\n💌 Hat einen Antrag von **${fromUser?.username || 'Unbekannt'}** erhalten!`;
                } else if (pendingTo) {
                    const toUser = await client.users.fetch(pendingTo.to_user).catch(() => null);
                    pendingText = `\n💌 Hat **${toUser?.username || 'Unbekannt'}** einen Antrag gemacht!`;
                }
                
                const embed = {
                    color: 0xFF69B4,
                    title: `💕 Beziehungsstatus von ${target.username}`,
                    description: `**${status}**${pendingText}`,
                    thumbnail: { url: target.displayAvatarURL({ dynamic: true }) }
                };
                
                if (partner) {
                    embed.fields = [{
                        name: '💑 Partner',
                        value: `${partner.username}`,
                        inline: true
                    }, {
                        name: '📅 Verheiratet seit',
                        value: `<t:${Math.floor(new Date(marriedAt).getTime() / 1000)}:D>`,
                        inline: true
                    }];
                    embed.thumbnail = { url: partner.displayAvatarURL({ dynamic: true }) };
                }
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== PP ==========
        pp: {
            aliases: ['penis'],
            description: 'Misst die PP-Größe',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first() || message.author;
                const size = Math.floor(Math.random() * 20) + 1;
                const bar = '='.repeat(size) + '>' + ' '.repeat(20 - size);
                
                return message.reply({ embeds: [{
                    color: 0xFFA500,
                    title: `🍆 PP von ${target.username}`,
                    description: `**${size}cm**\n\`${bar}\``
                }] });
            }
        },
        
        // ========== SHIP ==========
        ship: {
            aliases: ['shippen'],
            description: 'Shippt zwei User',
            category: 'Fun',
            async execute(message, args) {
                const user1 = message.mentions.users.first() || message.author;
                const user2 = message.mentions.users.last() || message.author;
                
                if (user1.id === user2.id) {
                    return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst dich nicht selbst shippen!')] });
                }
                
                const percentage = Math.floor(Math.random() * 101);
                let rating = '';
                let emoji = '';
                
                if (percentage < 20) { rating = 'Keine Chance...'; emoji = '💔'; }
                else if (percentage < 40) { rating = 'Schwierig...'; emoji = '😕'; }
                else if (percentage < 60) { rating = 'Könnte klappen!'; emoji = '🤔'; }
                else if (percentage < 80) { rating = 'Gute Kombi!'; emoji = '💕'; }
                else { rating = 'PERFEKTES PAAR!'; emoji = '💘'; }
                
                const combinedName = user1.username.slice(0, Math.floor(user1.username.length / 2)) + 
                                    user2.username.slice(Math.floor(user2.username.length / 2));
                
                return message.reply({ embeds: [{
                    color: 0xFF69B4,
                    title: `${emoji} Ship: ${user1.username} ❤️ ${user2.username}`,
                    description: `**${combinedName}**\n\n**${percentage}%** - ${rating}`
                }] });
            }
        },
        
        // ========== SLAP ==========
        slap: {
            aliases: ['ohrfeige', 'schlagen'],
            description: 'Schlägt jemanden',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!slap @User')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Autsch!', 'Du schlägst dich selbst? Das tut weh!')] });
                
                return message.reply({ embeds: [{
                    color: 0xFF0000,
                    description: `👋 **${message.author.username}** schlägt **${target.username}**! Autsch!`
                }] });
            }
        },
        
        // ========== WINK ==========
        wink: {
            aliases: ['zwinkern'],
            description: 'Zwinkert jemandem zu',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!wink @User')] });
                
                return message.reply({ embeds: [{
                    color: 0xFFD700,
                    description: `😉 **${message.author.username}** zwinkert **${target.username}** zu!`
                }] });
            }
        }
    }
};
