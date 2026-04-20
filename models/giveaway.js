const { EmbedBuilder } = require('discord.js');

// Aktive Giveaway-Timer speichern
const activeGiveaways = new Map();

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        giveaway: 0x2F3136,  // ⭐ GRAU für Start
        ended: 0x57F287,      // ⭐ GRÜN für Gewinner
        reroll: 0x57F287      // ⭐ GRÜN für Reroll
    };
    
    const titles = {
        de: {
            your_id: 'Deine ID',
            giveaway_started: 'Giveaway gestartet',
            giveaway_ended: 'Giveaway beendet',
            reroll: 'Reroll',
            active_giveaways: 'Aktive Giveaways',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info',
            invalid_usage: 'Falsche Nutzung',
            no_id: 'Keine ID',
            not_found: 'Nicht gefunden',
            still_running: 'Läuft noch',
            channel_not_found: 'Channel nicht gefunden',
            no_entries: 'Keine Teilnehmer',
            no_giveaways: 'Keine Giveaways'
        },
        en: {
            your_id: 'Your ID',
            giveaway_started: 'Giveaway Started',
            giveaway_ended: 'Giveaway Ended',
            reroll: 'Reroll',
            active_giveaways: 'Active Giveaways',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage',
            no_id: 'No ID',
            not_found: 'Not Found',
            still_running: 'Still Running',
            channel_not_found: 'Channel Not Found',
            no_entries: 'No Entries',
            no_giveaways: 'No Giveaways'
        }
    };
    
    const descriptions = {
        de: {
            your_id: (id) => `\`${id}\``,
            gstart_usage: '!gstart <Zeit> <Gewinner> <Preis>\nBeispiel: !gstart 10m 1 Nitro\n\nZeit: 30s, 10m, 2h, 1d',
            invalid_time: 'Nutze: 30s, 10m, 2h, 1d',
            invalid_winners: 'Gewinner muss zwischen 1 und 10 sein!',
            giveaway_started: (channel) => `Giveaway wurde in ${channel} erstellt!`,
            gend_usage: '!gend <Nachrichten-ID>',
            giveaway_not_found: 'Giveaway nicht gefunden oder bereits beendet!',
            giveaway_ended_early: 'Giveaway wurde vorzeitig beendet!',
            greroll_usage: '!greroll <Nachrichten-ID>',
            giveaway_not_found_simple: 'Giveaway nicht gefunden!',
            giveaway_still_running: 'Das Giveaway läuft noch! Nutze `!gend` zum Beenden.',
            channel_not_found: 'Giveaway-Channel existiert nicht mehr!',
            no_entries: 'Niemand hat am Giveaway teilgenommen!',
            reroll_winners: (winners, prize) => `🎉 **REROLL:** ${winners}\nHerzlichen Glückwunsch! Du hast **${prize}** gewonnen!`,
            reroll_success: 'Neue Gewinner wurden gezogen!',
            no_active_giveaways: 'Es laufen aktuell keine Giveaways!',
            giveaway_count: (count) => `${count} Giveaways`,
            winners_announce: (winners, prize, host) => `🎉 **GEWINNER:** ${winners}\nHerzlichen Glückwunsch! Du hast **${prize}** gewonnen!\nHost: ${host}`,
            no_winners_error: (prize) => `Niemand hat am Giveaway für **${prize}** teilgenommen!`,
            unknown: 'Unbekannt',
            ends_at: 'Endet',
            winners_label: 'Gewinner',
            entries_label: 'Teilnehmer',
            hosted_by: 'Host'
        },
        en: {
            your_id: (id) => `\`${id}\``,
            gstart_usage: '!gstart <Time> <Winners> <Prize>\nExample: !gstart 10m 1 Nitro\n\nTime: 30s, 10m, 2h, 1d',
            invalid_time: 'Use: 30s, 10m, 2h, 1d',
            invalid_winners: 'Winners must be between 1 and 10!',
            giveaway_started: (channel) => `Giveaway created in ${channel}!`,
            gend_usage: '!gend <Message-ID>',
            giveaway_not_found: 'Giveaway not found or already ended!',
            giveaway_ended_early: 'Giveaway ended early!',
            greroll_usage: '!greroll <Message-ID>',
            giveaway_not_found_simple: 'Giveaway not found!',
            giveaway_still_running: 'Giveaway is still running! Use `!gend` to end it.',
            channel_not_found: 'Giveaway channel no longer exists!',
            no_entries: 'No one entered the giveaway!',
            reroll_winners: (winners, prize) => `🎉 **REROLL:** ${winners}\nCongratulations! You won **${prize}**!`,
            reroll_success: 'New winners have been drawn!',
            no_active_giveaways: 'There are currently no active giveaways!',
            giveaway_count: (count) => `${count} Giveaways`,
            winners_announce: (winners, prize, host) => `🎉 **WINNERS:** ${winners}\nCongratulations! You won **${prize}**!\nHost: ${host}`,
            no_winners_error: (prize) => `No one entered the giveaway for **${prize}**!`,
            unknown: 'Unknown',
            ends_at: 'Ends',
            winners_label: 'Winners',
            entries_label: 'Entries',
            hosted_by: 'Hosted by'
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
    }
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client?.user?.username || 'Bot', iconURL: client?.user?.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '🎉';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = client?.users?.cache.get(userId) || await client?.users?.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    embed.setTimestamp();
    
    return embed;
}

// ⭐ HELPER: Giveaway beenden (KOMPLETT ÜBERARBEITET)
async function endGiveaway(messageId, client, supabase, lang = 'de', force = false) {
    console.log(`🔄 Versuche Giveaway zu beenden: ${messageId}`);
    
    const { data: giveaway, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('message_id', messageId)
        .single();
    
    if (error) {
        console.error('❌ Fehler beim Laden des Giveaways:', error);
        return;
    }
    
    if (!giveaway) {
        console.log('❌ Giveaway nicht gefunden:', messageId);
        return;
    }
    
    if (giveaway.ended) {
        console.log('⚠️ Giveaway bereits beendet:', messageId);
        return;
    }
    
    console.log(`✅ Giveaway geladen: ${giveaway.prize}, Teilnehmer: ${giveaway.entries?.length || 0}`);
    
    const guild = client.guilds.cache.get(giveaway.guild_id);
    if (!guild) {
        console.log('❌ Guild nicht gefunden:', giveaway.guild_id);
        return;
    }
    
    const channel = guild.channels.cache.get(giveaway.channel_id);
    if (!channel) {
        console.log('❌ Channel nicht gefunden:', giveaway.channel_id);
        return;
    }
    
    let giveawayMsg;
    try {
        giveawayMsg = await channel.messages.fetch(messageId);
        console.log('✅ Nachricht gefunden');
    } catch (e) {
        console.log('⚠️ Nachricht wurde gelöscht');
    }
    
    const entries = giveaway.entries || [];
    let winners = [];
    
    if (entries.length > 0) {
        const entriesCopy = [...entries];
        const winnerCount = Math.min(giveaway.winners, entries.length);
        console.log(`🎲 Ziehe ${winnerCount} Gewinner aus ${entries.length} Teilnehmern`);
        
        for (let i = 0; i < winnerCount; i++) {
            const randomIndex = Math.floor(Math.random() * entriesCopy.length);
            winners.push(entriesCopy[randomIndex]);
            entriesCopy.splice(randomIndex, 1);
        }
    }
    
    // ⭐ ALS BEENDET MARKIEREN
    const { error: updateError } = await supabase
        .from('giveaways')
        .update({ ended: true })
        .eq('message_id', messageId);
    
    if (updateError) {
        console.error('❌ Fehler beim Update:', updateError);
    } else {
        console.log('✅ Giveaway als beendet markiert');
    }
    
    // Timer aus Cache entfernen
    if (activeGiveaways.has(messageId)) {
        clearTimeout(activeGiveaways.get(messageId));
        activeGiveaways.delete(messageId);
        console.log('✅ Timer aus Cache entfernt');
    }
    
    // ⭐ EMBED AKTUALISIEREN (GRÜN)
    if (giveawayMsg) {
        const winnerText = winners.length > 0 
            ? winners.map(id => `<@${id}>`).join(', ') 
            : (lang === 'de' ? 'Keine Teilnehmer' : 'No entries');
        
        const endedEmbed = new EmbedBuilder()
            .setColor(0x57F287) // ⭐ GRÜN
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(lang === 'de' ? `🎉 GIVEAWAY BEENDET: ${giveaway.prize}` : `🎉 GIVEAWAY ENDED: ${giveaway.prize}`)
            .setDescription(
                `**${lang === 'de' ? 'Gewinner' : 'Winners'}:** ${winnerText}\n` +
                `**${lang === 'de' ? 'Host' : 'Host'}:** <@${giveaway.host_id}>\n` +
                `**${lang === 'de' ? 'Teilnehmer' : 'Entries'}:** ${entries.length}`
            )
            .setFooter({ text: lang === 'de' ? 'Giveaway beendet' : 'Giveaway ended' })
            .setTimestamp();
        
        await giveawayMsg.edit({ embeds: [endedEmbed] }).catch(e => console.log('❌ Fehler beim Editieren:', e));
        console.log('✅ Embed aktualisiert (GRÜN)');
    }
    
    // ⭐ GEWINNER VERKÜNDEN
    if (winners.length > 0) {
        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
        await channel.send({ 
            content: lang === 'de'
                ? `🎉 **GEWINNER:** ${winnerMentions}\nHerzlichen Glückwunsch! Du hast **${giveaway.prize}** gewonnen!\nHost: <@${giveaway.host_id}>`
                : `🎉 **WINNERS:** ${winnerMentions}\nCongratulations! You won **${giveaway.prize}**!\nHost: <@${giveaway.host_id}>`
        });
        console.log(`✅ Gewinner verkündet: ${winners.length}`);
    } else {
        const noWinnerEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(lang === 'de' ? '❌ Keine Gewinner' : '❌ No Winners')
            .setDescription(lang === 'de' ? `Niemand hat am Giveaway für **${giveaway.prize}** teilgenommen!` : `No one entered the giveaway for **${giveaway.prize}**!`)
            .setTimestamp();
        
        await channel.send({ embeds: [noWinnerEmbed] });
        console.log('⚠️ Keine Teilnehmer');
    }
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
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'your_id', 'your_id', [message.author.id])] 
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'gstart_usage')] 
                    });
                }
                
                let ms = 0;
                if (timeStr.endsWith('s')) ms = parseInt(timeStr) * 1000;
                else if (timeStr.endsWith('m')) ms = parseInt(timeStr) * 60 * 1000;
                else if (timeStr.endsWith('h')) ms = parseInt(timeStr) * 60 * 60 * 1000;
                else if (timeStr.endsWith('d')) ms = parseInt(timeStr) * 24 * 60 * 60 * 1000;
                
                if (isNaN(ms) || ms <= 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'invalid_time')] 
                    });
                }
                
                if (isNaN(winners) || winners < 1 || winners > 10) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'invalid_winners')] 
                    });
                }
                
                const endTime = new Date(Date.now() + ms);
                const endTimestamp = Math.floor(endTime.getTime() / 1000);
                
                // ⭐ GRAUES EMBED
                const giveawayEmbed = new EmbedBuilder()
                    .setColor(0x2F3136) // ⭐ GRAU
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
                
                await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'giveaway_started', 'giveaway_started', [channel.toString()])] 
                });
                
                // ⭐ TIMER SETZEN (WICHTIG!)
                const timer = setTimeout(async () => {
                    console.log(`⏰ Timer abgelaufen für Giveaway: ${giveawayMsg.id}`);
                    await endGiveaway(giveawayMsg.id, client, supabase, lang);
                    activeGiveaways.delete(giveawayMsg.id);
                }, ms);
                
                activeGiveaways.set(giveawayMsg.id, timer);
                console.log(`✅ Timer gesetzt für ${giveawayMsg.id}, läuft in ${ms}ms ab`);
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_id', 'gend_usage')] 
                    });
                }
                
                const { data: giveaway } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('message_id', messageId)
                    .single();
                
                if (!giveaway || giveaway.ended) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'not_found', 'giveaway_not_found')] 
                    });
                }
                
                await endGiveaway(messageId, client, supabase, lang, true);
                await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'giveaway_ended', 'giveaway_ended_early')] 
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_id', 'greroll_usage')] 
                    });
                }
                
                const { data: giveaway } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('message_id', messageId)
                    .single();
                
                if (!giveaway) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'not_found', 'giveaway_not_found_simple')] 
                    });
                }
                
                if (!giveaway.ended) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'still_running', 'giveaway_still_running')] 
                    });
                }
                
                const channel = message.guild.channels.cache.get(giveaway.channel_id);
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'channel_not_found', 'channel_not_found')] 
                    });
                }
                
                const entries = giveaway.entries || [];
                
                if (entries.length === 0) {
                    return channel.send({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_entries', 'no_entries')] 
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
                
                // ⭐ GRÜNER REROLL EMBED
                const rerollEmbed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🎉 REROLL' : '🎉 REROLL')
                    .setDescription(lang === 'de'
                        ? `**Neue Gewinner:** ${winnerMentions}\n\nHerzlichen Glückwunsch! Du hast **${giveaway.prize}** gewonnen!`
                        : `**New Winners:** ${winnerMentions}\n\nCongratulations! You won **${giveaway.prize}**!`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                await channel.send({ embeds: [rerollEmbed] });
                
                await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'reroll', 'reroll_success')] 
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
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'no_giveaways', 'no_active_giveaways')] 
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
