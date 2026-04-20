const { EmbedBuilder } = require('discord.js');

// Active giveaway timers
const activeGiveaways = new Map();

// ⭐ HELPER: End giveaway
async function endGiveaway(messageId, client, supabase, force = false) {
    console.log(`\n🔄 ========== ENDING GIVEAWAY ==========`);
    console.log(`🔄 Message ID: ${messageId}`);
    console.log(`🔄 Force: ${force}`);
    
    // 1. Get giveaway from DB
    const { data: giveaway, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('message_id', messageId)
        .single();
    
    if (error) {
        console.error(`❌ DB Error:`, error);
        return;
    }
    
    if (!giveaway) {
        console.error(`❌ Giveaway not found: ${messageId}`);
        return;
    }
    
    console.log(`✅ Giveaway found: "${giveaway.prize}"`);
    console.log(`✅ Ended: ${giveaway.ended}, Entries: ${giveaway.entries?.length || 0}`);
    
    if (giveaway.ended) {
        console.log(`⚠️ Giveaway already ended!`);
        return;
    }
    
    // 2. Get guild & channel
    const guild = client.guilds.cache.get(giveaway.guild_id);
    if (!guild) {
        console.error(`❌ Guild not found: ${giveaway.guild_id}`);
        return;
    }
    console.log(`✅ Guild found: ${guild.name}`);
    
    const channel = guild.channels.cache.get(giveaway.channel_id);
    if (!channel) {
        console.error(`❌ Channel not found: ${giveaway.channel_id}`);
        return;
    }
    console.log(`✅ Channel found: #${channel.name}`);
    
    // 3. Pick winners
    const entries = giveaway.entries || [];
    const winners = [];
    
    if (entries.length > 0) {
        const entriesCopy = [...entries];
        const winnerCount = Math.min(giveaway.winners, entries.length);
        console.log(`🎲 Picking ${winnerCount} winners from ${entries.length} entries`);
        
        for (let i = 0; i < winnerCount; i++) {
            const randomIndex = Math.floor(Math.random() * entriesCopy.length);
            winners.push(entriesCopy[randomIndex]);
            entriesCopy.splice(randomIndex, 1);
        }
        console.log(`✅ Winner IDs: ${winners.join(', ')}`);
    } else {
        console.log(`⚠️ No entries!`);
    }
    
    // 4. Mark as ended
    const { error: updateError } = await supabase
        .from('giveaways')
        .update({ ended: true })
        .eq('message_id', messageId);
    
    if (updateError) {
        console.error(`❌ Update Error:`, updateError);
    } else {
        console.log(`✅ Marked as ended`);
    }
    
    // 5. Remove timer from cache
    if (activeGiveaways.has(messageId)) {
        clearTimeout(activeGiveaways.get(messageId));
        activeGiveaways.delete(messageId);
        console.log(`✅ Timer removed from cache`);
    }
    
    // 6. Update message
    try {
        const giveawayMsg = await channel.messages.fetch(messageId);
        console.log(`✅ Giveaway message found`);
        
        const winnerText = winners.length > 0 
            ? winners.map(id => `<@${id}>`).join(', ') 
            : 'No entries';
        
        const endedEmbed = new EmbedBuilder()
            .setColor(0x57F287) // GREEN
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(`🎉 GIVEAWAY ENDED: ${giveaway.prize}`)
            .setDescription(
                `**Winners:** ${winnerText}\n` +
                `**Host:** <@${giveaway.host_id}>\n` +
                `**Entries:** ${entries.length}`
            )
            .setFooter({ text: 'Giveaway ended' })
            .setTimestamp();
        
        await giveawayMsg.edit({ embeds: [endedEmbed] });
        console.log(`✅ Embed updated (GREEN)`);
    } catch (e) {
        console.log(`⚠️ Message not found (was deleted)`);
    }
    
    // 7. Announce winners
    if (winners.length > 0) {
        const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
        await channel.send({ 
            content: `🎉 **WINNERS:** ${winnerMentions}\nCongratulations! You won **${giveaway.prize}**!\nHost: <@${giveaway.host_id}>`
        });
        console.log(`✅ Winners announced`);
    } else {
        const noWinnerEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('❌ No Winners')
            .setDescription(`No one entered the giveaway for **${giveaway.prize}**!`)
            .setTimestamp();
        
        await channel.send({ embeds: [noWinnerEmbed] });
        console.log(`⚠️ No winners announced`);
    }
    
    console.log(`🎉 ========== GIVEAWAY ENDED ==========\n`);
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

// ⭐ HELPER: Create embed
function createEmbed(message, type, title, description) {
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
        .setTitle(type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : `ℹ️ ${title}`)
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    return embed;
}

module.exports = {
    category: 'Giveaway',
    subCommands: {
        
        // ========== GETID ==========
        getid: {
            aliases: ['id'],
            description: 'Show your Discord ID',
            category: 'Giveaway',
            async execute(message) {
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Your ID', `\`${message.author.id}\``)] 
                });
            }
        },
        
        // ========== GSTART ==========
        gstart: {
            aliases: ['giveaway', 'gcreate'],
            permissions: 'ManageMessages',
            description: 'Start a giveaway',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                const timeStr = args[0];
                const winners = parseInt(args[1]);
                const prize = args.slice(2).join(' ');
                
                if (!timeStr || !winners || !prize) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!gstart <Time> <Winners> <Prize>\nExample: !gstart 10m 1 Nitro\n\nTime: 30s, 10m, 2h, 1d')] 
                    });
                }
                
                let ms = 0;
                if (timeStr.endsWith('s')) ms = parseInt(timeStr) * 1000;
                else if (timeStr.endsWith('m')) ms = parseInt(timeStr) * 60 * 1000;
                else if (timeStr.endsWith('h')) ms = parseInt(timeStr) * 60 * 60 * 1000;
                else if (timeStr.endsWith('d')) ms = parseInt(timeStr) * 24 * 60 * 60 * 1000;
                
                if (isNaN(ms) || ms <= 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Time', 'Use: 30s, 10m, 2h, 1d')] 
                    });
                }
                
                if (isNaN(winners) || winners < 1 || winners > 10) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Number', 'Winners must be between 1 and 10!')] 
                    });
                }
                
                const endTime = new Date(Date.now() + ms);
                const endTimestamp = Math.floor(endTime.getTime() / 1000);
                
                // GRAY EMBED
                const giveawayEmbed = new EmbedBuilder()
                    .setColor(0x2F3136) // GRAY
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`🎉 ${prize}`)
                    .setDescription(
                        `**React with 🎉 to enter!**\n\n` +
                        `**Ends:** <t:${endTimestamp}:R>\n` +
                        `**Winners:** ${winners}\n` +
                        `**Host:** ${message.author}`
                    )
                    .setFooter({ text: 'Ends at' })
                    .setTimestamp(endTime);
                
                const giveawayMsg = await channel.send({ embeds: [giveawayEmbed] });
                await giveawayMsg.react('🎉');
                
                console.log(`\n🎉 ========== GIVEAWAY STARTED ==========`);
                console.log(`🎉 Message ID: ${giveawayMsg.id}`);
                console.log(`🎉 Prize: ${prize}`);
                console.log(`🎉 Winners: ${winners}`);
                console.log(`🎉 Duration: ${ms}ms`);
                
                // Save to Supabase
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
                    console.error(`❌ Insert Error:`, insertError);
                } else {
                    console.log(`✅ Saved to Supabase`);
                }
                
                await message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Giveaway Started', `Giveaway created in ${channel}!`)] 
                });
                
                // SET TIMER
                const timer = setTimeout(async () => {
                    console.log(`\n⏰ ========== TIMER EXPIRED ==========`);
                    console.log(`⏰ Giveaway: ${giveawayMsg.id}`);
                    await endGiveaway(giveawayMsg.id, client, supabase);
                    activeGiveaways.delete(giveawayMsg.id);
                }, ms);
                
                activeGiveaways.set(giveawayMsg.id, timer);
                console.log(`✅ Timer set for ${giveawayMsg.id}`);
                console.log(`🎉 ========================================\n`);
            }
        },
        
        // ========== GEND ==========
        gend: {
            aliases: ['gendgiveaway', 'gstop'],
            permissions: 'ManageMessages',
            description: 'End a giveaway early',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const messageId = args[0];
                
                if (!messageId) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No ID', '!gend <Message-ID>')] 
                    });
                }
                
                const { data: giveaway } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('message_id', messageId)
                    .single();
                
                if (!giveaway || giveaway.ended) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Found', 'Giveaway not found or already ended!')] 
                    });
                }
                
                await endGiveaway(messageId, client, supabase, true);
                await message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Giveaway Ended', 'Giveaway ended early!')] 
                });
            }
        },
        
        // ========== GREROLL ==========
        greroll: {
            aliases: ['gnew', 'reroll'],
            permissions: 'ManageMessages',
            description: 'Reroll new winners',
            category: 'Giveaway',
            async execute(message, args, { client, supabase }) {
                const messageId = args[0];
                
                if (!messageId) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No ID', '!greroll <Message-ID>')] 
                    });
                }
                
                const { data: giveaway } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('message_id', messageId)
                    .single();
                
                if (!giveaway) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Found', 'Giveaway not found!')] 
                    });
                }
                
                if (!giveaway.ended) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Still Running', 'Giveaway is still running! Use `!gend` to end it.')] 
                    });
                }
                
                const channel = message.guild.channels.cache.get(giveaway.channel_id);
                if (!channel) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Channel Not Found', 'Giveaway channel no longer exists!')] 
                    });
                }
                
                const entries = giveaway.entries || [];
                
                if (entries.length === 0) {
                    return channel.send({ 
                        embeds: [createEmbed(message, 'error', 'No Entries', 'No one entered the giveaway!')] 
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
                    .setColor(0x57F287) // GREEN
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🎉 REROLL')
                    .setDescription(`**New Winners:** ${winnerMentions}\n\nCongratulations! You won **${giveaway.prize}**!`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                await channel.send({ embeds: [rerollEmbed] });
                
                await message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Reroll', 'New winners have been drawn!')] 
                });
            }
        },
        
        // ========== GLIST ==========
        glist: {
            aliases: ['giveaways', 'gshow'],
            description: 'List active giveaways',
            category: 'Giveaway',
            async execute(message, args, { supabase }) {
                const { data: giveaways } = await supabase
                    .from('giveaways')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('ended', false)
                    .order('end_time', { ascending: true });
                
                if (!giveaways || giveaways.length === 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'No Giveaways', 'There are currently no active giveaways!')] 
                    });
                }
                
                const list = giveaways.map(g => {
                    const channel = message.guild.channels.cache.get(g.channel_id);
                    const endTimestamp = Math.floor(new Date(g.end_time).getTime() / 1000);
                    return `🎁 **${g.prize}**\n📌 Channel: ${channel || 'Unknown'}\n👥 Entries: ${g.entries?.length || 0}\n🏆 Winners: ${g.winners}\n⏰ Ends: <t:${endTimestamp}:R>\n🆔 ID: \`${g.message_id}\``;
                }).join('\n\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x2F3136)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🎉 Active Giveaways')
                    .setDescription(list.slice(0, 4096))
                    .setFooter({ text: `${giveaways.length} Giveaways`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

module.exports.handleGiveawayReaction = handleGiveawayReaction;
module.exports.activeGiveaways = activeGiveaways;
