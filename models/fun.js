const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');

// ⭐ HELPER: Create embed (modern & clean)
function createEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        fun: 0x2B2D31,
        marriage: 0x2B2D31
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x2B2D31)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(title)
        .setDescription(description || ' ')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

// ⭐ Generate ship image like in the screenshot
async function generateShipImage(user1, user2) {
    const width = 500;
    const height = 250;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background - dark theme
    ctx.fillStyle = '#1a1b1e';
    ctx.fillRect(0, 0, width, height);
    
    // Get avatars
    const avatar1 = await loadImage(user1.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatar2 = await loadImage(user2.displayAvatarURL({ extension: 'png', size: 256 }));
    
    // Create clipping circles for avatars
    // Avatar 1 (left side, slightly mixed with right)
    ctx.save();
    ctx.beginPath();
    ctx.arc(180, 125, 60, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar1, 120, 65, 120, 120);
    ctx.restore();
    
    // Avatar 2 (right side, slightly mixed with left)
    ctx.save();
    ctx.beginPath();
    ctx.arc(320, 125, 60, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar2, 260, 65, 120, 120);
    ctx.restore();
    
    // Draw overlapping effect (semi-transparent overlay for mixing)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(26, 27, 30, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw heart in the middle
    ctx.font = '50px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#FF69B4';
    ctx.fillText('❤️', 225, 140);
    
    // Draw border
    ctx.strokeStyle = '#2c2f33';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    
    // Draw mixed name at the bottom
    const combinedName = user1.username.slice(0, Math.ceil(user1.username.length / 2)) + 
                         user2.username.slice(Math.floor(user2.username.length / 2));
    
    ctx.font = 'bold 22px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(combinedName, width / 2, 210);
    
    // Draw usernames above avatars
    ctx.font = '12px "Segoe UI", "Arial", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(user1.username, 180, 45);
    ctx.fillText(user2.username, 320, 45);
    
    return canvas.toBuffer('image/png');
}

module.exports = {
    category: 'Fun',
    subCommands: {
        
        // ========== SHIP ==========
        ship: {
            aliases: ['ship'],
            description: 'Ship two users with image',
            category: 'Fun',
            async execute(message, args) {
                try {
                    let user1 = message.mentions.users.first();
                    let user2 = message.mentions.users.last();
                    
                    // If only one mention or none, use author as first
                    if (!user1 && args[0]) {
                        try {
                            user1 = await message.client.users.fetch(args[0]);
                        } catch (e) {}
                    }
                    
                    if (!user1) {
                        user1 = message.author;
                    }
                    
                    // If only one user or same user, get random second user
                    if (user1 === message.author && (!user2 || user2 === message.author)) {
                        const randomMember = message.guild.members.cache.filter(m => !m.user.bot && m.user.id !== user1.id).random();
                        if (randomMember) user2 = randomMember.user;
                    }
                    
                    if (!user2 || user1.id === user2.id) {
                        user2 = message.guild.members.cache.filter(m => !m.user.bot && m.user.id !== user1.id).random()?.user || message.client.user;
                    }
                    
                    // Generate ship image
                    const imageBuffer = await generateShipImage(user1, user2);
                    const attachment = { attachment: imageBuffer, name: 'ship.png' };
                    
                    // Send as embed with image
                    const embed = new EmbedBuilder()
                        .setColor(0x2B2D31)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle(`${user1.username} ❤️ ${user2.username}`)
                        .setImage('attachment://ship.png')
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed], files: [attachment] });
                    
                } catch (error) {
                    console.error('Ship error:', error);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Error', 'Could not generate ship image!')] 
                    });
                }
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
                        embeds: [createEmbed(message, 'error', 'Invalid', 'You cannot marry yourself!')] 
                    });
                }
                
                if (target.bot) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid', 'You cannot marry a bot!')] 
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
                        embeds: [createEmbed(message, 'error', 'Already Married', `You are already married to **${partner?.username || 'someone'}**.\nUse !divorce to separate.`)] 
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
                            .setLabel('Accept')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💍'),
                        new ButtonBuilder()
                            .setCustomId(`marry_reject_${message.author.id}`)
                            .setLabel('Reject')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('💔')
                    );
                
                const proposalEmbed = new EmbedBuilder()
                    .setColor(0x2B2D31)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('Marriage Proposal')
                    .setDescription(`**${message.author.username}** wants to marry **${target.username}**.\n\n${target}, do you accept?`)
                    .setFooter({ text: 'Answer with the buttons below' })
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
                            .setColor(0x57F287)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle('Married')
                            .setDescription(`**${message.author.username}** and **${target.username}** are now married!\nBest wishes for the future.`)
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [successEmbed], components: [] });
                        await message.channel.send({ content: `🎊 Congratulations ${message.author} & ${target}! 🎊` });
                        
                    } else {
                        const rejectEmbed = new EmbedBuilder()
                            .setColor(0xED4245)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle('Proposal Rejected')
                            .setDescription(`**${target.username}** rejected **${message.author.username}**'s proposal.`)
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
                            .setTitle('Proposal Expired')
                            .setDescription(`**${target.username}** did not respond in time.`)
                            .setTimestamp();
                        
                        await message.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                    }
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
                    embeds: [createEmbed(message, 'info', 'Divorced', `**${message.author.username}** divorced **${partnerName}**.\nBetter luck next time.`)] 
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
                
                let status = 'Single';
                let partner = null;
                let marriedAt = null;
                
                if (marriage) {
                    status = 'Married';
                    partner = await client.users.fetch(marriage.partner_id).catch(() => null);
                    marriedAt = marriage.married_at;
                }
                
                const embed = createEmbed(message, 'info', 'Relationship Status', `**${target.username}** is **${status}**.`)
                    .setThumbnail(target.displayAvatarURL({ dynamic: true }));
                
                if (partner) {
                    embed.addFields([
                        { name: 'Partner', value: partner.username, inline: true },
                        { name: 'Married Since', value: `<t:${Math.floor(new Date(marriedAt).getTime() / 1000)}:D>`, inline: true }
                    ]);
                }
                
                return message.reply({ embeds: [embed] });
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
                    embeds: [createEmbed(message, 'info', 'Hug', `**${message.author.username}** hugs **${target.username}**.`)] 
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
                        embeds: [createEmbed(message, 'error', 'Invalid', 'You cannot kiss yourself!')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Kiss', `**${message.author.username}** kisses **${target.username}**.`)] 
                });
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
                    .setColor(0x2B2D31)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(`PP Size: ${target.username}`)
                    .setDescription(`**${size}cm**\n\`${bar}\``)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== CRY ==========
        cry: {
            aliases: ['weep'],
            description: 'Cry',
            category: 'Fun',
            async execute(message) {
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Cry', `**${message.author.username}** is crying.`)] 
                });
            }
        },
        
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
                        embeds: [createEmbed(message, 'error', 'Invalid', 'You cannot do this to yourself!')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Blowjob', `**${message.author.username}** gives **${target.username}** a blowjob.`)] 
                });
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
                        embeds: [createEmbed(message, 'error', 'Invalid', 'You cannot slap yourself!')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Slap', `**${message.author.username}** slaps **${target.username}**.`)] 
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
                    embeds: [createEmbed(message, 'info', 'Wink', `**${message.author.username}** winks at **${target.username}**.`)] 
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
                    embeds: [createEmbed(message, 'info', 'Cuddle', `**${message.author.username}** cuddles with **${target.username}**.`)] 
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
                    embeds: [createEmbed(message, 'info', 'Handhold', `**${message.author.username}** holds hands with **${target.username}**.`)] 
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
                    embeds: [createEmbed(message, 'info', 'Highfive', `**${message.author.username}** high-fives **${target.username}**.`)] 
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
                    embeds: [createEmbed(message, 'info', 'Lick', `**${message.author.username}** licks **${target.username}**.`)] 
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
                    embeds: [createEmbed(message, 'info', 'Cheat', `**${message.author.username}** is cheating on **${target.username}**.`)] 
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
                    embeds: [createEmbed(message, 'info', 'Bodycount', `**${message.author.username}** has a bodycount of **${count}**.`)] 
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
                    'A big surprise is waiting for you.',
                    'Your future looks bright.',
                    'Money is coming your way.',
                    'Love is knocking at your door.',
                    'A celebration awaits you.',
                    'You should sleep more.',
                    'Pizza is the answer to everything.'
                ];
                
                const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Fortune Cookie', fortune)] 
                });
            }
        }
    }
};
