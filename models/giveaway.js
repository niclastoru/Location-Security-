const { EmbedBuilder } = require('discord.js');

// Aktive Giveaway-Timer speichern
const activeGiveaways = new Map();

// ⭐ HELPER: Giveaway beenden (MIT VOLLEN DEBUG-LOGS)
async function endGiveaway(messageId, client, supabase, lang = 'de', force = false) {
    console.log(`\n🔄 ========== GIVEAWAY BEENDEN ==========`);
    console.log(`🔄 Message ID: ${messageId}`);
    console.log(`🔄 Force: ${force}, Lang: ${lang}`);
    
    // ⭐ 1. Giveaway aus DB laden
    const { data: giveaway, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('message_id', messageId)
        .single();
    
    if (error) {
        console.error(`❌ DB Fehler:`, error);
        return;
    }
    
    if (!giveaway) {
        console.error(`❌ Giveaway nicht gefunden: ${messageId}`);
        return;
    }
    
    console.log(`✅ Giveaway gefunden: "${giveaway.prize}"`);
    console.log(`✅ Ended: ${giveaway.ended}, Entries: ${giveaway.entries?.length || 0}`);
    
    if (giveaway.ended) {
        console.log(`⚠️ Giveaway bereits beendet!`);
        return;
    }
    
    // ⭐ 2. Guild & Channel holen
    const guild = client.guilds.cache.get(giveaway.guild_id);
    if (!guild) {
        console.error(`❌ Guild nicht gefunden: ${giveaway.guild_id}`);
        return;
    }
    console.log(`✅ Guild gefunden: ${guild.name}`);
    
    const channel = guild.channels.cache.get(giveaway.channel_id);
    if (!channel) {
        console.error(`❌ Channel nicht gefunden: ${giveaway.channel_id}`);
        return;
    }
    console.log(`✅ Channel gefunden: #${channel.name}`);
    
    // ⭐ 3. Gewinner ziehen
    const entries = giveaway.entries || [];
    const winners = [];
    
    if (entries.length > 0) {
        const entriesCopy = [...entries];
        const winnerCount = Math.min(giveaway.winners, entries.length);
        console.log(`🎲 Ziehe ${winnerCount} Gewinner aus ${entries.length} Teilnehmern`);
        
        for (let i = 0; i < winnerCount; i++) {
            const randomIndex = Math.floor(Math.random() * entriesCopy.length);
            winners.push(entriesCopy[randomIndex]);
            entriesCopy.splice(randomIndex, 1);
        }
        console.log(`✅ Gewinner IDs: ${winners.join(', ')}`);
    } else {
        console.log(`⚠️ Keine Teilnehmer!`);
    }
    
    // ⭐ 4. Als beendet markieren
    const { error: updateError } = await supabase
        .from('giveaways')
        .update({ ended: true })
        .eq('message_id', messageId);
    
    if (updateError) {
        console.error(`❌ Update Fehler:`, updateError);
    } else {
        console.log(`✅ Als beendet markiert`);
    }
    
    // ⭐ 5. Timer aus Cache entfernen
    if (activeGiveaways.has(messageId)) {
        clearTimeout(activeGiveaways.get(messageId));
        activeGiveaways.delete(messageId);
        console.log(`✅ Timer aus Cache entfernt`);
    }
    
    // ⭐ 6. Nachricht aktualisieren
    try {
        const giveawayMsg = await channel.messages.fetch(messageId);
        console.log(`✅ Giveaway-Nachricht gefunden`);
        
        const winnerText = winners.length > 0 
            ? winners.map(id => `<@${id}>`).join(', ') 
            : (lang === 'de' ? 'Keine Teilnehmer' : 'No entries');
        
        const endedEmbed = new EmbedBuilder()
            .setColor(0x57F287) // GRÜN
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(lang === 'de' ? `🎉 GIVEAWAY BEENDET: ${giveaway.prize}` : `🎉 GIVEAWAY ENDED: ${giveaway.prize}`)
            .setDescription(
                `**${lang === 'de' ? 'Gewinner' : 'Winners'}:** ${winnerText}\n` +
                `**${lang === 'de' ? 'Host' : 'Host'}:** <@${giveaway.host_id}>\n` +
                `**${lang === 'de' ? 'Teilnehmer' : 'Entries'}:** ${entries.length}`
            )
            .setFooter({ text: lang === 'de' ? 'Giveaway beendet' : 'Giveaway ended' })
            .setTimestamp();
        
        await giveawayMsg.edit({ embeds: [endedEmbed] });
        console.log(`✅ Embed aktualisiert (GRÜN)`);
    } catch (e) {
        console.log(`⚠️ Nachricht nicht gefunden (wurde gelöscht)`);
    }
    
    // ⭐ 7. Gewinner verkünden
    if (winners.length > 0) {
        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
        await channel.send({ 
            content: lang === 'de'
                ? `🎉 **GEWINNER:** ${winnerMentions}\nHerzlichen Glückwunsch! Du hast **${giveaway.prize}** gewonnen!\nHost: <@${giveaway.host_id}>`
                : `🎉 **WINNERS:** ${winnerMentions}\nCongratulations! You won **${giveaway.prize}**!\nHost: <@${giveaway.host_id}>`
        });
        console.log(`✅ Gewinner verkündet`);
    } else {
        await channel.send({ 
            embeds: [{
                color: 0xED4245,
                title: lang === 'de' ? '❌ Keine Gewinner' : '❌ No Winners',
                description: lang === 'de' ? `Niemand hat am Giveaway für **${giveaway.prize}** teilgenommen!` : `No one entered the giveaway for **${giveaway.prize}**!`,
                timestamp: new Date().toISOString()
            }]
        });
        console.log(`⚠️ Keine Gewinner verkündet`);
    }
    
    console.log(`🎉 ========== GIVEAWAY BEENDET ==========\n`);
}

// ========== REACTION COLLECTOR ==========
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

// ⭐ HELPER: Schöne Embeds bauen
async function buildEmbed(client, guildId, userId, type, title, description) {
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
    
    if (userId) {
        const user = client.users.cache.get(userId) || await client.users.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    
    return embed;
}

module.exports = {
    category: 'Giveaway',
    subCommands: {
        
        // ========== GETID ==========
        getid: {
            aliases: ['id'],
            description: 'Zeigt deine Discord ID / Shows your Discord ID',
            category: 'Giveaway',
            async execute(message, args, { client }) {
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', '🆔 Deine ID', `\`${message.author.id}\``)] 
                });
            }
        },
        
        // ========== GSTART ==========
        gstart: {
            aliases: ['giveaway', 'gcreate'],
            permissions: 'ManageMessages',
            description: 'Startet ein Giveaway / Starts a giveaway',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                const timeStr = args[0];
                const winners = parseInt(args[1]);
                const prize = args.slice(2).join(' ');
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!timeStr || !winners || !prize) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Falsche Nutzung', 
                            '!gstart <Zeit> <Gewinner> <Preis>\nBeispiel: !gstart 10m 1 Nitro\n\nZeit: 30s, 10m, 2h, 1d')] 
                    });
                }
                
                let ms = 0;
                if (timeStr.endsWith('s')) ms = parseInt(timeStr) * 1000;
                else if (timeStr.endsWith('m')) ms = parseInt(timeStr) * 60 * 1000;
                else if (timeStr.endsWith('h')) ms = parseInt(timeStr) * 60 * 60 * 1000;
                else if (timeStr.endsWith('d')) ms = parseInt(timeStr) * 24 * 60 * 60 * 1000;
                
                if (isNaN(ms) || ms <= 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Ungültige Zeit', 
                            'Nutze: 30s, 10m, 2h, 1d')] 
                    });
                }
                
                if (isNaN(winners) || winners < 1 || winners > 10) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Ungültige Anzahl', 
                            'Gewinner muss zwischen 1 und 10 sein!')] 
                    });
                }
                
                const endTime = new Date(Date.now() + ms);
                const endTimestamp = Math.floor(endTime.getTime() / 1000);
                
                // ⭐ GRAUES EMBED
                const giveawayEmbed = new EmbedBuilder()
                    .setColor(0x2F3136) // GRAU
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`🎉 ${prize}`)
                    .setDescription(
                        `**${lang === 'de' ? 'Reagiere mit 🎉 um teilzunehmen!' : 'React with 🎉 to enter!'}**\n\n` +
                        `**${lang === 'de' ? 'Endet' : 'Ends'}:** <t:${endTimestamp}:R>\n` +
                        `**${lang === 'de' ? 'Gewinner' : 'Winners'}:** ${winners}\n` +
                        `**${lang === 'de' ? 'Host' : 'Host'}:** ${message.author}`
                    )
                    .setFooter({ text: lang === 'de' ? 'Endet am' : 'Ends at' })
                    .setTimestamp(endTime);
                
                const giveawayMsg = await channel.send({ embeds: [giveawayEmbed] });
                await giveawayMsg.react('🎉');
                
                console.log(`\n🎉 ========== GIVEAWAY GESTARTET ==========`);
                console.log(`🎉 Message ID: ${giveawayMsg.id}`);
                console.log(`🎉 Prize: ${prize}`);
                console.log(`🎉 Winners: ${winners}`);
                console.log(`🎉 End Time: ${endTime.toISOString()}`);
                console.log(`🎉 Duration: ${ms}ms`);
                
                // In Supabase speichern
                const { error: insertError } = await supabase.from('giveaways').insert({
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    message_id: giveawayMsg.id,
                    prize: prize,
                    winners: winners,
                    end_time: endTime.toISOString(),
                    host_id: message.author.id,
                    entries: []
                });
                
                if (insertError) {
                    console.error(`❌ Insert Fehler:`, insertError);
                } else {
                    console.log(`✅ In Supabase gespeichert`);
                }
                
                await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 
                        '✅ Giveaway gestartet', 
                        `Giveaway wurde in ${channel} erstellt!`)] 
                });
                
                // ⭐ TIMER SETZEN
                const timer = setTimeout(async () => {
                    console.log(`\n⏰ ========== TIMER ABGELAUFEN ==========`);
                    console.log(`⏰ Giveaway: ${giveawayMsg.id}`);
                    await endGiveaway(giveawayMsg.id, client, supabase, lang);
                    activeGiveaways.delete(giveawayMsg.id);
                }, ms);
                
                activeGiveaways.set(giveawayMsg.id, timer);
                console.log(`✅ Timer gesetzt für ${giveawayMsg.id}, läuft in ${ms}ms ab`);
                console.log(`🎉 ========================================\n`);
            }
        },
        
        // ========== GEND ==========
        gend: {
            aliases: ['gendgiveaway', 'gstop'],
            permissions: 'ManageMessages',
            description: 'Beendet ein Giveaway vorzeitig / Ends a giveaway early',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const messageId = args[0];
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!messageId) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Keine ID', 
                            '!gend <Nachrichten-ID>')] 
                    });
                }
                
                const { data: giveaway } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('message_id', messageId)
                    .single();
                
                if (!giveaway || giveaway.ended) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Nicht gefunden', 
                            'Giveaway nicht gefunden oder bereits beendet!')] 
                    });
                }
                
                await endGiveaway(messageId, client, supabase, lang, true);
                await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 
                        '✅ Giveaway beendet', 
                        'Giveaway wurde vorzeitig beendet!')] 
                });
            }
        },
        
        // ========== GREROLL ==========
        greroll: {
            aliases: ['gnew', 'reroll'],
            permissions: 'ManageMessages',
            description: 'Würfelt neue Gewinner / Rerolls new winners',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const messageId = args[0];
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!messageId) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Keine ID', 
                            '!greroll <Nachrichten-ID>')] 
                    });
                }
                
                const { data: giveaway } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('message_id', messageId)
                    .single();
                
                if (!giveaway) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Nicht gefunden', 
                            'Giveaway nicht gefunden!')] 
                    });
                }
                
                if (!giveaway.ended) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Läuft noch', 
                            'Das Giveaway läuft noch! Nutze `!gend` zum Beenden.')] 
                    });
                }
                
                const channel = message.guild.channels.cache.get(giveaway.channel_id);
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Channel nicht gefunden', 
                            'Giveaway-Channel existiert nicht mehr!')] 
                    });
                }
                
                const entries = giveaway.entries || [];
                
                if (entries.length === 0) {
                    return channel.send({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 
                            '❌ Keine Teilnehmer', 
                            'Niemand hat am Giveaway teilgenommen!')] 
                    });
                }
                
                const winners = [];
                const entriesCopy = [...entries];
                
                for (let i = 0; i < Math.min(giveaway.winners, entries.length); i++) {
                    const randomIndex = Math.floor(Math.random() * entriesCopy.length);
                    winners.push(entriesCopy[randomIndex]);
                    entriesCopy.splice(randomIndex, 1);
                }
                
                const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
                
                const rerollEmbed = new EmbedBuilder()
                    .setColor(0x57F287) // GRÜN
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🎉 REROLL' : '🎉 REROLL')
                    .setDescription(lang === 'de'
                        ? `**Neue Gewinner:** ${winnerMentions}\n\nHerzlichen Glückwunsch! Du hast **${giveaway.prize}** gewonnen!`
                        : `**New Winners:** ${winnerMentions}\n\nCongratulations! You won **${giveaway.prize}**!`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                await channel.send({ embeds: [rerollEmbed] });
                
                await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 
                        '✅ Reroll', 
                        'Neue Gewinner wurden gezogen!')] 
                });
            }
        },
        
        // ========== GLIST ==========
        glist: {
            aliases: ['giveaways', 'gshow'],
            description: 'Listet aktive Giveaways / Lists active giveaways',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data: giveaways } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('ended', false)
                    .order('end_time', { ascending: true });
                
                if (!giveaways || giveaways.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 
                            '📋 Keine Giveaways', 
                            lang === 'de' ? 'Es laufen aktuell keine Giveaways!' : 'There are currently no active giveaways!')] 
                    });
                }
                
                const list = giveaways.map(g => {
                    const channel = message.guild.channels.cache.get(g.channel_id);
                    const endTimestamp = Math.floor(new Date(g.end_time).getTime() / 1000);
                    return lang === 'de'
                        ? `🎁 **${g.prize}**\n📌 Channel: ${channel || 'Unbekannt'}\n👥 Teilnehmer: ${g.entries?.length || 0}\n🏆 Gewinner: ${g.winners}\n⏰ Endet: <t:${endTimestamp}:R>\n🆔 ID: \`${g.message_id}\``
                        : `🎁 **${g.prize}**\n📌 Channel: ${channel || 'Unknown'}\n👥 Entries: ${g.entries?.length || 0}\n🏆 Winners: ${g.winners}\n⏰ Ends: <t:${endTimestamp}:R>\n🆔 ID: \`${g.message_id}\``;
                }).join('\n\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x2F3136)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🎉 Aktive Giveaways' : '🎉 Active Giveaways')
                    .setDescription(list.slice(0, 4096))
                    .setFooter({ text: `${giveaways.length} ${lang === 'de' ? 'Giveaways' : 'Giveaways'}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

module.exports.handleGiveawayReaction = handleGiveawayReaction;
module.exports.activeGiveaways = activeGiveaways;
