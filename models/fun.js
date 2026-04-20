const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ⭐ HELPER: Create embed (ENGLISH ONLY)
function createEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        fun: 0xFF69B4,
        marriage: 0xFF69B4
    };
    
    const embed = new EmbedBuilder()
        .setColor(type === 'fun' || type === 'marriage' ? 0xFF69B4 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(type === 'marriage' ? `💍 ${title}` : (type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : type === 'warn' ? `⚠️ ${title}` : `ℹ️ ${title}`))
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

module.exports = {
    category: 'Fun',
    subCommands: {
        
        // ========== BLOWJOB ==========
        blowjob: {
            aliases: ['bj'],
            description: 'Give someone a blowjob',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!blowjob @User')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot do this to yourself!')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Blowjob', `😮 **${message.author.username}** gives **${target.username}** a blowjob!`)] 
                });
            }
        },
        
        // ========== BODYCOUNT ==========
        bodycount: {
            aliases: ['bc'],
            description: 'Show your bodycount',
            category: 'Fun',
            async execute(message) {
                const count = Math.floor(Math.random() * 50);
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Bodycount', `🔪 **${message.author.username}** has a bodycount of **${count}**!`)] 
                });
            }
        },
        
        // ========== CHEAT ==========
        cheat: {
            aliases: ['cheating'],
            description: 'Cheat on someone',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!cheat @User')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Cheat', `💔 **${message.author.username}** is cheating on **${target.username}**! Scandal!`)] 
                });
            }
        },
        
        // ========== CRY ==========
        cry: {
            aliases: ['weep'],
            description: 'Cry',
            category: 'Fun',
            async execute(message) {
                const cries = ['😭', '😢', '🥺', '😿', '💧'];
                const emoji = cries[Math.floor(Math.random() * cries.length)];
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Cry', `${emoji} **${message.author.username}** is crying...`)] 
                });
            }
        },
        
        // ========== CUDDLE ==========
        cuddle: {
            aliases: ['snuggle'],
            description: 'Cuddle with someone',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!cuddle @User')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Cuddle', `🤗 **${message.author.username}** cuddles with **${target.username}**! So cute!`)] 
                });
            }
        },
        
        // ========== DIVORCE ==========
        divorce: {
            aliases: ['div'],
            description: 'Divorce your partner',
            category: 'Fun',
            async execute(message, args, { supabase }) {
                const { data: marriage } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!marriage) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Married', 'You are not married!')] 
                    });
                }
                
                await supabase.from('marriages').delete().eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                await supabase.from('marriages').delete().eq('guild_id', message.guild.id).eq('user_id', marriage.partner_id);
                
                const partner = await message.client.users.fetch(marriage.partner_id).catch(() => null);
                const partnerName = partner?.username || 'Unknown';
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Divorced', `💔 **${message.author.username}** divorced **${partnerName}**!`)] 
                });
            }
        },
        
        // ========== FORTUNE ==========
        fortune: {
            aliases: ['cookie'],
            description: 'Open a fortune cookie',
            category: 'Fun',
            async execute(message) {
                const fortunes = [
                    '🍀 A big surprise is waiting for you!',
                    '🌟 Your future looks bright!',
                    '💰 Money is coming your way!',
                    '❤️ Love is knocking at your door!',
                    '🎉 A celebration awaits you!',
                    '😴 You should sleep more...',
                    '🍕 Pizza is the answer to everything!'
                ];
                
                const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Fortune Cookie', fortune)] 
                });
            }
        },
        
        // ========== HANDHOLD ==========
        handhold: {
            aliases: ['holdhands'],
            description: 'Hold hands with someone',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!handhold @User')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Handhold', `🤝 **${message.author.username}** holds hands with **${target.username}**!`)] 
                });
            }
        },
        
        // ========== HIGHFIVE ==========
        highfive: {
            aliases: ['hf'],
            description: 'Give a highfive',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!highfive @User')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Highfive', `✋ **${message.author.username}** high-fives **${target.username}**!`)] 
                });
            }
        },
        
        // ========== HUG ==========
        hug: {
            aliases: ['embrace'],
            description: 'Hug someone',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!hug @User')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Hug', `🫂 **${message.author.username}** hugs **${target.username}**!`)] 
                });
            }
        },
        
        // ========== KISS ==========
        kiss: {
            aliases: ['smooch'],
            description: 'Kiss someone',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!kiss @User')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot kiss yourself!')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Kiss', `💋 **${message.author.username}** kisses **${target.username}**! How romantic!`)] 
                });
            }
        },
        
        // ========== LICK ==========
        lick: {
            aliases: ['slurp'],
            description: 'Lick someone',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!lick @User')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Lick', `👅 **${message.author.username}** licks **${target.username}**! Ewww!`)] 
                });
            }
        },
        
        // ========== MARRY ==========
        marry: {
            aliases: ['propose'],
            description: 'Propose to someone',
            category: 'Fun',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!marry @User')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot marry yourself!')] 
                    });
                }
                
                if (target.bot) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot marry a bot!')] 
                    });
                }
                
                const { data: authorMarried } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (authorMarried) {
                    const partner = await client.users.fetch(authorMarried.partner_id).catch(() => null);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Already Married', `You are already married to **${partner?.username || 'someone'}**!\nUse \`!divorce\` to divorce.`)] 
                    });
                }
                
                const { data: targetMarried } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (targetMarried) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Already Married', `**${target.username}** is already married!`)] 
                    });
                }
                
                const { data: existingRequest } = await supabase
                    .from('marriage_requests')
                    .select('id')
                    .eq('guild_id', message.guild.id)
                    .eq('from_user', message.author.id)
                    .eq('to_user', target.id)
                    .single();
                
                if (existingRequest) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Request Exists', `You already proposed to **${target.username}**!`)] 
                    });
                }
                
                await supabase.from('marriage_requests').insert({
                    guild_id: message.guild.id,
                    from_user: message.author.id,
                    to_user: target.id
                });
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`marry_accept_${message.author.id}`)
                            .setLabel('✅ Yes, I do!')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💍'),
                        new ButtonBuilder()
                            .setCustomId(`marry_reject_${message.author.id}`)
                            .setLabel('❌ No')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('💔')
                    );
                
                const proposalEmbed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('💍 Marriage Proposal!')
                    .setDescription(`**${message.author.username}** wants to marry **${target.username}**!\n\n${target}, do you accept?`)
                    .setFooter({ text: 'Answer with the buttons below!' })
                    .setTimestamp();
                
                await message.reply({ 
                    content: `${target}`,
                    embeds: [proposalEmbed], 
                    components: [row] 
                });
                
                const filter = i => i.user.id === target.id;
                const collector = message.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });
                
                collector.on('collect', async (interaction) => {
                    const isAccept = interaction.customId.startsWith('marry_accept');
                    
                    await supabase.from('marriage_requests')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('from_user', message.author.id)
                        .eq('to_user', target.id);
                    
                    if (isAccept) {
                        await supabase.from('marriages').insert([
                            { guild_id: message.guild.id, user_id: message.author.id, partner_id: target.id },
                            { guild_id: message.guild.id, user_id: target.id, partner_id: message.author.id }
                        ]);
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(0xFF69B4)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle('💒 Married!')
                            .setDescription(`🎉 **${message.author.username}** and **${target.username}** are now married!\nBest wishes for the future! 💕`)
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [successEmbed], components: [] });
                        await message.channel.send({ content: `🎊 Congratulations ${message.author} & ${target}! 🎊` });
                        
                    } else {
                        const rejectEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle('💔 Proposal Rejected')
                            .setDescription(`**${target.username}** rejected **${message.author.username}**'s proposal... 😢`)
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [rejectEmbed], components: [] });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await supabase.from('marriage_requests')
                            .delete()
                            .eq('guild_id', message.guild.id)
                            .eq('from_user', message.author.id)
                            .eq('to_user', target.id);
                        
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(0x808080)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle('⏰ Proposal Expired')
                            .setDescription(`**${target.username}** didn't respond in time...`)
                            .setTimestamp();
                        
                        await message.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                    }
                });
            }
        },
        
        // ========== MARRYSTATUS ==========
        marrystatus: {
            aliases: ['relationship', 'status'],
            description: 'Show relationship status',
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
                    status = '💍 Married';
                    partner = await client.users.fetch(marriage.partner_id).catch(() => null);
                    marriedAt = marriage.married_at;
                }
                
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
                    pendingText = `\n💌 Received a proposal from **${fromUser?.username || 'Unknown'}**!`;
                } else if (pendingTo) {
                    const toUser = await client.users.fetch(pendingTo.to_user).catch(() => null);
                    pendingText = `\n💌 Proposed to **${toUser?.username || 'Unknown'}**!`;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`💕 Relationship Status of ${target.username}`)
                    .setDescription(`**${status}**${pendingText}`)
                    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                if (partner) {
                    embed.addFields([
                        { name: '💑 Partner', value: partner.username, inline: true },
                        { name: '📅 Married since', value: `<t:${Math.floor(new Date(marriedAt).getTime() / 1000)}:D>`, inline: true }
                    ]);
                    embed.setThumbnail(partner.displayAvatarURL({ dynamic: true }));
                }
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== PP ==========
        pp: {
            aliases: ['penis'],
            description: 'Measure PP size',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first() || message.author;
                const size = Math.floor(Math.random() * 20) + 1;
                const bar = '='.repeat(size) + '>' + ' '.repeat(20 - size);
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(`🍆 PP of ${target.username}`)
                    .setDescription(`**${size}cm**\n\`${bar}\``)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SHIP ==========
        ship: {
            aliases: ['ship'],
            description: 'Ship two users',
            category: 'Fun',
            async execute(message, args) {
                const user1 = message.mentions.users.first() || message.author;
                const user2 = message.mentions.users.last() || message.author;
                
                if (user1.id === user2.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot ship someone with themselves!')] 
                    });
                }
                
                const percentage = Math.floor(Math.random() * 101);
                let rating = '';
                let emoji = '';
                
                if (percentage < 20) { rating = 'No chance...'; emoji = '💔'; } 
                else if (percentage < 40) { rating = 'Difficult...'; emoji = '😕'; } 
                else if (percentage < 60) { rating = 'Could work!'; emoji = '🤔'; } 
                else if (percentage < 80) { rating = 'Good combo!'; emoji = '💕'; } 
                else { rating = 'PERFECT MATCH!'; emoji = '💘'; }
                
                const combinedName = user1.username.slice(0, Math.floor(user1.username.length / 2)) + 
                                    user2.username.slice(Math.floor(user2.username.length / 2));
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(`${emoji} Ship: ${user1.username} ❤️ ${user2.username}`)
                    .setDescription(`**${combinedName}**\n\n**${percentage}%** - ${rating}`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SLAP ==========
        slap: {
            aliases: ['hit'],
            description: 'Slap someone',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!slap @User')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot slap yourself!')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Slap', `👋 **${message.author.username}** slaps **${target.username}**! Ouch!`)] 
                });
            }
        },
        
        // ========== WINK ==========
        wink: {
            aliases: ['wink'],
            description: 'Wink at someone',
            category: 'Fun',
            async execute(message, args) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No User', '!wink @User')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'fun', 'Wink', `😉 **${message.author.username}** winks at **${target.username}**!`)] 
                });
            }
        }
    }
};
