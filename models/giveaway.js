module.exports = {
    category: 'Giveaway',
    subCommands: {
        
        // ========== GETID ==========
        getid: {
            aliases: ['id'],
            description: 'Zeigt deine Discord ID',
            category: 'Giveaway',
            async execute(message) {
                return message.reply({ embeds: [global.embed.info('Deine ID', `\`${message.author.id}\``)] });
            }
        },
        
        // ========== GSTART ==========
        gstart: {
            aliases: ['giveaway', 'gcreate'],
            permissions: 'ManageMessages',
            description: 'Startet ein Giveaway',
            category: 'Giveaway',
            async execute(message, args, { supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                const timeStr = args[0];
                const winners = parseInt(args[1]);
                const prize = args.slice(2).join(' ');
                
                if (!timeStr || !winners || !prize) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!gstart <Zeit> <Gewinner> <Preis>\nBeispiel: !gstart 10m 1 Nitro\n\nZeit: 30s, 10m, 2h, 1d')] });
                }
                
                // Zeit parsen
                let ms = 0;
                if (timeStr.endsWith('s')) ms = parseInt(timeStr) * 1000;
                else if (timeStr.endsWith('m')) ms = parseInt(timeStr) * 60 * 1000;
                else if (timeStr.endsWith('h')) ms = parseInt(timeStr) * 60 * 60 * 1000;
                else if (timeStr.endsWith('d')) ms = parseInt(timeStr) * 24 * 60 * 60 * 1000;
                
                if (isNaN(ms) || ms <= 0) {
                    return message.reply({ embeds: [global.embed.error('Ungültige Zeit', 'Nutze: 30s, 10m, 2h, 1d')] });
                }
                
                if (isNaN(winners) || winners < 1 || winners > 10) {
                    return message.reply({ embeds: [global.embed.error('Ungültige Anzahl', 'Gewinner muss zwischen 1 und 10 sein!')] });
                }
                
                const endTime = new Date(Date.now() + ms);
                
                // Giveaway Embed
                const giveawayEmbed = {
                    color: 0x9B59B6,
                    title: `🎉 GIVEAWAY: ${prize}`,
                    description: `Reagiere mit 🎉 um teilzunehmen!\n\n` +
                                `**Endet:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n` +
                                `**Gewinner:** ${winners}\n` +
                                `**Host:** ${message.author}`,
                    footer: { text: `Endet am` },
                    timestamp: endTime.toISOString()
                };
                
                const giveawayMsg = await channel.send({ embeds: [giveawayEmbed] });
                await giveawayMsg.react('🎉');
                
                // In Supabase speichern
                await supabase.from('giveaways').insert({
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    message_id: giveawayMsg.id,
                    prize: prize,
                    winners: winners,
                    end_time: endTime.toISOString(),
                    host_id: message.author.id,
                    entries: []
                });
                
                message.reply({ embeds: [global.embed.success('Giveaway gestartet', `Giveaway wurde in ${channel} erstellt!`)] });
                
                // Timer für Ende
                setTimeout(() => endGiveaway(giveawayMsg.id, message.client, supabase), ms);
            }
        },
        
        // ========== GEND ==========
        gend: {
            aliases: ['gendgiveaway', 'gstop'],
            permissions: 'ManageMessages',
            description: 'Beendet ein Giveaway vorzeitig',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const messageId = args[0];
                if (!messageId) return message.reply({ embeds: [global.embed.error('Keine ID', '!gend <Nachrichten-ID>')] });
                
                const { data: giveaway } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('message_id', messageId)
                    .single();
                
                if (!giveaway || giveaway.ended) {
                    return message.reply({ embeds: [global.embed.error('Nicht gefunden', 'Giveaway nicht gefunden oder bereits beendet!')] });
                }
                
                await endGiveaway(messageId, client, supabase, true);
                message.reply({ embeds: [global.embed.success('Giveaway beendet', 'Giveaway wurde vorzeitig beendet!')] });
            }
        },
        
        // ========== GREROLL ==========
        greroll: {
            aliases: ['gnew', 'reroll'],
            permissions: 'ManageMessages',
            description: 'Würfelt neue Gewinner',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const messageId = args[0];
                if (!messageId) return message.reply({ embeds: [global.embed.error('Keine ID', '!greroll <Nachrichten-ID>')] });
                
                const { data: giveaway } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('message_id', messageId)
                    .single();
                
                if (!giveaway) {
                    return message.reply({ embeds: [global.embed.error('Nicht gefunden', 'Giveaway nicht gefunden!')] });
                }
                
                if (!giveaway.ended) {
                    return message.reply({ embeds: [global.embed.error('Läuft noch', 'Das Giveaway läuft noch! Nutze `!gend` zum Beenden.')] });
                }
                
                const channel = message.guild.channels.cache.get(giveaway.channel_id);
                if (!channel) return message.reply({ embeds: [global.embed.error('Channel nicht gefunden', 'Giveaway-Channel existiert nicht mehr!')] });
                
                const entries = giveaway.entries || [];
                
                if (entries.length === 0) {
                    return channel.send({ embeds: [global.embed.error('Keine Teilnehmer', 'Niemand hat am Giveaway teilgenommen!')] });
                }
                
                // Neue Gewinner ziehen
                const winners = [];
                const entriesCopy = [...entries];
                
                for (let i = 0; i < Math.min(giveaway.winners, entries.length); i++) {
                    const randomIndex = Math.floor(Math.random() * entriesCopy.length);
                    winners.push(entriesCopy[randomIndex]);
                    entriesCopy.splice(randomIndex, 1);
                }
                
                const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
                
                channel.send({ 
                    content: `🎉 **REROLL:** ${winnerMentions}\nHerzlichen Glückwunsch! Du hast **${giveaway.prize}** gewonnen!`
                });
                
                message.reply({ embeds: [global.embed.success('Reroll', 'Neue Gewinner wurden gezogen!')] });
            }
        },
        
        // ========== GLIST ==========
        glist: {
            aliases: ['giveaways', 'gshow'],
            description: 'Listet aktive Giveaways',
            category: 'Giveaway',
            async execute(message, args, { supabase }) {
                const { data: giveaways } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('ended', false)
                    .order('end_time', { ascending: true });
                
                if (!giveaways || giveaways.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Giveaways', 'Es laufen aktuell keine Giveaways!')] });
                }
                
                const list = giveaways.map(g => {
                    const channel = message.guild.channels.cache.get(g.channel_id);
                    return `🎁 **${g.prize}**\n` +
                           `📌 Channel: ${channel || 'Unbekannt'}\n` +
                           `👥 Teilnehmer: ${g.entries?.length || 0}\n` +
                           `🏆 Gewinner: ${g.winners}\n` +
                           `⏰ Endet: <t:${Math.floor(new Date(g.end_time).getTime() / 1000)}:R>\n` +
                           `🆔 ID: \`${g.message_id}\``;
                }).join('\n\n');
                
                return message.reply({ embeds: [{
                    color: 0x9B59B6,
                    title: '🎉 Aktive Giveaways',
                    description: list.slice(0, 4096),
                    footer: { text: `${giveaways.length} Giveaways` }
                }] });
            }
        }
    }
};

// ========== HELPER: Giveaway beenden ==========
async function endGiveaway(messageId, client, supabase, force = false) {
    const { data: giveaway } = await supabase
        .from('giveaways')
        .select('*')
        .eq('message_id', messageId)
        .single();
    
    if (!giveaway || giveaway.ended) return;
    
    const guild = client.guilds.cache.get(giveaway.guild_id);
    if (!guild) return;
    
    const channel = guild.channels.cache.get(giveaway.channel_id);
    if (!channel) return;
    
    let giveawayMsg;
    try {
        giveawayMsg = await channel.messages.fetch(messageId);
    } catch {
        // Nachricht gelöscht
    }
    
    const entries = giveaway.entries || [];
    let winners = [];
    
    if (entries.length > 0) {
        const entriesCopy = [...entries];
        for (let i = 0; i < Math.min(giveaway.winners, entries.length); i++) {
            const randomIndex = Math.floor(Math.random() * entriesCopy.length);
            winners.push(entriesCopy[randomIndex]);
            entriesCopy.splice(randomIndex, 1);
        }
    }
    
    // Als beendet markieren
    await supabase.from('giveaways')
        .update({ ended: true })
        .eq('message_id', messageId);
    
    // Embed aktualisieren
    if (giveawayMsg) {
        const endedEmbed = {
            color: 0xFF0000,
            title: `🎉 GIVEAWAY BEENDET: ${giveaway.prize}`,
            description: `**Gewinner:** ${winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'Keine Teilnehmer'}\n` +
                        `**Host:** <@${giveaway.host_id}>\n` +
                        `**Teilnehmer:** ${entries.length}`,
            footer: { text: 'Giveaway beendet' },
            timestamp: new Date().toISOString()
        };
        
        await giveawayMsg.edit({ embeds: [endedEmbed] }).catch(() => {});
    }
    
    // Gewinner verkünden
    if (winners.length > 0) {
        channel.send({ 
            content: `🎉 **GEWINNER:** ${winners.map(id => `<@${id}>`).join(', ')}\n` +
                     `Herzlichen Glückwunsch! Du hast **${giveaway.prize}** gewonnen!\n` +
                     `Host: <@${giveaway.host_id}>`
        });
    } else {
        channel.send({ 
            embeds: [global.embed.error('Keine Gewinner', `Niemand hat am Giveaway für **${giveaway.prize}** teilgenommen!`)] 
        });
    }
}

// ========== REACTION COLLECTOR (in index.js einfügen) ==========
async function handleGiveawayReaction(reaction, user, client, supabase, add = true) {
    if (user.bot) return;
    if (reaction.emoji.name !== '🎉') return;
    
    const { data: giveaway } = await supabase
        .from('giveaways')
        .select('*')
        .eq('message_id', reaction.message.id)
        .single();
    
    if (!giveaway || giveaway.ended) return;
    
    let entries = giveaway.entries || [];
    
    if (add) {
        if (!entries.includes(user.id)) {
            entries.push(user.id);
        }
    } else {
        entries = entries.filter(id => id !== user.id);
    }
    
    await supabase.from('giveaways')
        .update({ entries })
        .eq('message_id', reaction.message.id);
}

module.exports.handleGiveawayReaction = handleGiveawayReaction;
