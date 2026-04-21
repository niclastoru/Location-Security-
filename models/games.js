const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Active TicTacToe games (Cache)
const tttGames = new Map();

// ⭐ HELPER: Create embed (ENGLISH ONLY)
function createEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        economy: 0xF1C40F,
        games: 0x3498DB
    };
    
    const embed = new EmbedBuilder()
        .setColor(type === 'economy' ? 0xF1C40F : type === 'games' ? 0x3498DB : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : type === 'warn' ? `⚠️ ${title}` : `ℹ️ ${title}`)
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

module.exports = {
    category: 'Games',
    subCommands: {
        
        // ========== DAILY ==========
        daily: {
            aliases: ['dailyreward'],
            description: 'Claim your daily reward',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const { data: user } = await supabase
                    .from('economy')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                const now = new Date();
                const lastDaily = user?.daily_last ? new Date(user.daily_last) : null;
                
                if (lastDaily && now - lastDaily < 24 * 60 * 60 * 1000) {
                    const nextDaily = new Date(lastDaily.getTime() + 24 * 60 * 60 * 1000);
                    const timeLeft = Math.floor((nextDaily - now) / 1000 / 60 / 60);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Already Claimed', `Next reward in **${timeLeft}** hours!`)] 
                    });
                }
                
                const reward = 500 + Math.floor(Math.random() * 500);
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: (user?.balance || 0) + reward,
                    daily_last: now.toISOString()
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Daily Reward', `You received **${reward}** 💰!\nNew Balance: **${(user?.balance || 0) + reward}**`)] 
                });
            }
        },
        
        // ========== WORK ==========
        work: {
            aliases: ['job'],
            description: 'Work for money',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const { data: user } = await supabase
                    .from('economy')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                const now = new Date();
                const lastWork = user?.work_last ? new Date(user.work_last) : null;
                
                if (lastWork && now - lastWork < 60 * 60 * 1000) {
                    const nextWork = new Date(lastWork.getTime() + 60 * 60 * 1000);
                    const timeLeft = Math.floor((nextWork - now) / 1000 / 60);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Already Worked', `Next work in **${timeLeft}** minutes!`)] 
                    });
                }
                
                const jobs = [
                    { name: 'Pizza Delivery', min: 100, max: 300 },
                    { name: 'Programmer', min: 200, max: 500 },
                    { name: 'Waiter', min: 80, max: 250 },
                    { name: 'Salesperson', min: 120, max: 350 },
                    { name: 'Cleaner', min: 90, max: 280 }
                ];
                
                const job = jobs[Math.floor(Math.random() * jobs.length)];
                const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: (user?.balance || 0) + earned,
                    work_last: now.toISOString()
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Work Complete', `As a **${job.name}** you earned **${earned}** 💰!\nNew Balance: **${(user?.balance || 0) + earned}**`)] 
                });
            }
        },
        
        // ========== BALANCE ==========
        balance: {
            aliases: ['bal', 'money'],
            description: 'Show your balance',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first() || message.author;
                
                const { data: user } = await supabase
                    .from('economy')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                const balance = user?.balance || 0;
                const bank = user?.bank || 0;
                
                const embed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(`💰 ${target.username}'s Balance`)
                    .addFields([
                        { name: '💵 Wallet', value: `${balance}`, inline: true },
                        { name: '🏦 Bank', value: `${bank}`, inline: true },
                        { name: '📊 Total', value: `${balance + bank}`, inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== PAY ==========
        pay: {
            aliases: ['send', 'give'],
            description: 'Send money to a user',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const amount = parseInt(args[1]);
                
                if (!target || isNaN(amount) || amount <= 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!pay @User <Amount>')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot send money to yourself!')] 
                    });
                }
                
                const { data: sender } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!sender || sender.balance < amount) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Enough Money', `You only have **${sender?.balance || 0}**!`)] 
                    });
                }
                
                const { data: receiver } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: sender.balance - amount
                });
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: target.id,
                    balance: (receiver?.balance || 0) + amount
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Payment Sent', `You sent **${amount}** 💰 to ${target}!`)] 
                });
            }
        },
        
        // ========== DEPOSIT ==========
        deposit: {
            aliases: ['dep'],
            description: 'Deposit money to your bank',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const amount = args[0]?.toLowerCase() === 'all' ? 'all' : parseInt(args[0]);
                
                if (!amount || (amount !== 'all' && (isNaN(amount) || amount <= 0))) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!deposit <Amount/all>')] 
                    });
                }
                
                const { data: user } = await supabase
                    .from('economy')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                const balance = user?.balance || 0;
                const depositAmount = amount === 'all' ? balance : amount;
                
                if (depositAmount > balance) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Enough Money', `You only have **${balance}**!`)] 
                    });
                }
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: balance - depositAmount,
                    bank: (user?.bank || 0) + depositAmount
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Deposit Successful', `**${depositAmount}** 💰 deposited to your bank!`)] 
                });
            }
        },
        
        // ========== WITHDRAW ==========
        withdraw: {
            aliases: ['with'],
            description: 'Withdraw money from your bank',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const amount = args[0]?.toLowerCase() === 'all' ? 'all' : parseInt(args[0]);
                
                if (!amount || (amount !== 'all' && (isNaN(amount) || amount <= 0))) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!withdraw <Amount/all>')] 
                    });
                }
                
                const { data: user } = await supabase
                    .from('economy')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                const bank = user?.bank || 0;
                const withdrawAmount = amount === 'all' ? bank : amount;
                
                if (withdrawAmount > bank) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Enough in Bank', `You only have **${bank}** in your bank!`)] 
                    });
                }
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: (user?.balance || 0) + withdrawAmount,
                    bank: bank - withdrawAmount
                });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Withdrawal Successful', `**${withdrawAmount}** 💰 withdrawn from your bank!`)] 
                });
            }
        },
        
        // ========== ROULETTE ==========
        roulette: {
            aliases: ['roul'],
            description: 'Play roulette',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const bet = parseInt(args[0]);
                const choice = args[1]?.toLowerCase();
                
                if (isNaN(bet) || bet <= 0 || !choice) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!roulette <Bet> <red/black/green/number>')] 
                    });
                }
                
                const { data: user } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!user || user.balance < bet) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Enough Money', `You only have **${user?.balance || 0}**!`)] 
                    });
                }
                
                const number = Math.floor(Math.random() * 37);
                let color = number === 0 ? 'green' : (number % 2 === 0 ? 'red' : 'black');
                let win = 0;
                
                if (choice === 'red' && color === 'red') win = bet * 2;
                else if (choice === 'black' && color === 'black') win = bet * 2;
                else if (choice === 'green' && color === 'green') win = bet * 14;
                else if (!isNaN(parseInt(choice)) && parseInt(choice) === number) win = bet * 35;
                
                const newBalance = user.balance - bet + win;
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: newBalance
                });
                
                const resultEmbed = new EmbedBuilder()
                    .setColor(win > 0 ? 0x57F287 : 0xED4245)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(win > 0 ? '🎉 YOU WON!' : '😢 YOU LOST!')
                    .setDescription(`**Number:** ${number} (${color})\n**Bet:** ${bet} 💰\n**Win:** ${win} 💰\n**New Balance:** ${newBalance} 💰`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [resultEmbed] });
            }
        },
        
        // ========== COINFLIP ==========
        coinflip: {
            aliases: ['cf'],
            description: 'Coin flip against another user',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const bet = parseInt(args[1]);
                
                if (!target || isNaN(bet) || bet <= 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!coinflip @User <Bet>')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot play against yourself!')] 
                    });
                }
                
                const { data: challenger } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                const { data: opponent } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (!challenger || challenger.balance < bet) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Enough Money', `You only have **${challenger?.balance || 0}**!`)] 
                    });
                }
                
                if (!opponent || opponent.balance < bet) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Opponent Lacks Funds', `${target} only has **${opponent?.balance || 0}**!`)] 
                    });
                }
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`cf_accept_${message.author.id}_${target.id}_${bet}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`cf_reject_${message.author.id}`).setLabel('❌ Reject').setStyle(ButtonStyle.Danger)
                    );
                
                const challengeEmbed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🪙 Coinflip Challenge')
                    .setDescription(`${message.author} challenges ${target}!\n**Bet:** ${bet} 💰\n\n${target}, click Accept to play!`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                const msg = await message.reply({ content: `${target}`, embeds: [challengeEmbed], components: [row] });
                
                const filter = i => i.user.id === target.id;
                const collector = msg.createMessageComponentCollector({ filter, time: 30000, max: 1 });
                
                collector.on('collect', async (i) => {
                    if (i.customId.startsWith('cf_accept')) {
                        const winner = Math.random() < 0.5 ? message.author : target;
                        const loser = winner.id === message.author.id ? target : message.author;
                        
                        await supabase.from('economy').upsert({
                            guild_id: message.guild.id,
                            user_id: winner.id,
                            balance: (winner.id === message.author.id ? challenger.balance : opponent.balance) + bet
                        });
                        
                        await supabase.from('economy').upsert({
                            guild_id: message.guild.id,
                            user_id: loser.id,
                            balance: (loser.id === message.author.id ? challenger.balance : opponent.balance) - bet
                        });
                        
                        const resultEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                            .setTitle('🪙 Coinflip Result')
                            .setDescription(`**${winner.username}** wins **${bet}** 💰!`)
                            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                            .setTimestamp();
                        
                        await i.update({ embeds: [resultEmbed], components: [] });
                    } else {
                        const rejectEmbed = new EmbedBuilder()
                            .setColor(0xED4245)
                            .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                            .setTitle('❌ Rejected')
                            .setDescription(`${target} rejected the challenge.`)
                            .setTimestamp();
                        
                        await i.update({ embeds: [rejectEmbed], components: [] });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(0x808080)
                            .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                            .setTitle('⏰ Timeout')
                            .setDescription('Challenge expired.')
                            .setTimestamp();
                        
                        await msg.edit({ embeds: [timeoutEmbed], components: [] });
                    }
                });
            }
        },
        
        // ========== TICTACTOE ==========
        tictactoe: {
            aliases: ['ttt', 'xo'],
            description: 'Play TicTacToe against another user',
            category: 'Games',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const bet = parseInt(args[1]) || 0;
                
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Opponent', '!tictactoe @User [Bet]')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Really?', 'You cannot play against yourself!')] 
                    });
                }
                
                if (target.bot) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Bot', 'You cannot play against bots!')] 
                    });
                }
                
                // Check if already in a game
                const existingGame = Array.from(tttGames.values()).find(g => 
                    g.guildId === message.guild.id && 
                    (g.playerX === message.author.id || g.playerO === message.author.id || 
                     g.playerX === target.id || g.playerO === target.id)
                );
                
                if (existingGame) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Already in Game', 'One of the players is already in a TicTacToe game!')] 
                    });
                }
                
                // Check balances if betting
                if (bet > 0) {
                    const { data: challenger } = await supabase
                        .from('economy')
                        .select('balance')
                        .eq('guild_id', message.guild.id)
                        .eq('user_id', message.author.id)
                        .single();
                    
                    const { data: opponent } = await supabase
                        .from('economy')
                        .select('balance')
                        .eq('guild_id', message.guild.id)
                        .eq('user_id', target.id)
                        .single();
                    
                    if (!challenger || challenger.balance < bet) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Not Enough Money', `You only have **${challenger?.balance || 0}**!`)] 
                        });
                    }
                    
                    if (!opponent || opponent.balance < bet) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Opponent Lacks Funds', `${target} only has **${opponent?.balance || 0}**!`)] 
                        });
                    }
                }
                
                // Challenge Embed
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`ttt_accept_${message.author.id}_${target.id}_${bet}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`ttt_reject_${message.author.id}`).setLabel('❌ Reject').setStyle(ButtonStyle.Danger)
                    );
                
                const challengeEmbed = new EmbedBuilder()
                    .setColor(0x3498DB)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🎮 TicTacToe Challenge')
                    .setDescription(`${message.author} challenges ${target}!\n${bet > 0 ? `**Bet:** ${bet} 💰\n\n` : '\n'}${target}, click Accept to play!`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                const msg = await message.reply({ content: `${target}`, embeds: [challengeEmbed], components: [row] });
                
                const filter = i => i.user.id === target.id;
                const collector = msg.createMessageComponentCollector({ filter, time: 60000, max: 1 });
                
                collector.on('collect', async (i) => {
                    if (i.customId.startsWith('ttt_accept')) {
                        await startTicTacToe(i, message.author, target, bet, supabase, message.client);
                    } else {
                        const rejectEmbed = new EmbedBuilder()
                            .setColor(0xED4245)
                            .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                            .setTitle('❌ Rejected')
                            .setDescription(`${target} rejected the challenge.`)
                            .setTimestamp();
                        
                        await i.update({ embeds: [rejectEmbed], components: [] });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(0x808080)
                            .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                            .setTitle('⏰ Timeout')
                            .setDescription('Challenge expired.')
                            .setTimestamp();
                        
                        await msg.edit({ embeds: [timeoutEmbed], components: [] });
                    }
                });
            }
        },
        
        // ========== LEADERBOARD ==========
        leaderboard: {
            aliases: ['lb', 'top', 'rich'],
            description: 'Show the richest users',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const { data: users } = await supabase
                    .from('economy')
                    .select('user_id, balance, bank')
                    .eq('guild_id', message.guild.id)
                    .order('balance', { ascending: false })
                    .limit(10);
                
                if (!users || users.length === 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'No Data', 'No one has money yet!')] 
                    });
                }
                
                const lb = await Promise.all(users.map(async (u, i) => {
                    const user = await message.client.users.fetch(u.user_id).catch(() => null);
                    const total = (u.balance || 0) + (u.bank || 0);
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                    return `${medal} **${user?.username || 'Unknown'}**: ${total} 💰`;
                }));
                
                const embed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('🏆 Leaderboard')
                    .setDescription(lb.join('\n'))
                    .setFooter({ text: `Top 10 of ${users.length} users`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SLOTS ==========
        slots: {
            aliases: ['slot'],
            description: 'Play the slot machine',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const bet = parseInt(args[0]);
                
                if (isNaN(bet) || bet <= 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!slots <Bet>')] 
                    });
                }
                
                const { data: user } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!user || user.balance < bet) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Enough Money', `You only have **${user?.balance || 0}**!`)] 
                    });
                }
                
                const emojis = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
                const slots = [
                    emojis[Math.floor(Math.random() * emojis.length)],
                    emojis[Math.floor(Math.random() * emojis.length)],
                    emojis[Math.floor(Math.random() * emojis.length)]
                ];
                
                let win = 0;
                if (slots[0] === slots[1] && slots[1] === slots[2]) {
                    if (slots[0] === '7️⃣') win = bet * 10;
                    else if (slots[0] === '💎') win = bet * 5;
                    else win = bet * 3;
                } else if (slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2]) {
                    win = bet * 1.5;
                }
                
                const newBalance = user.balance - bet + win;
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: newBalance
                });
                
                const resultEmbed = new EmbedBuilder()
                    .setColor(win > 0 ? 0x57F287 : 0xED4245)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(win > 0 ? '🎰 YOU WON!' : '🎰 YOU LOST!')
                    .setDescription(`**${slots.join('  ')}**\n\nBet: ${bet} 💰\nWin: ${win} 💰\nNew Balance: ${newBalance} 💰`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [resultEmbed] });
            }
        }
    }
};

// ⭐ TicTacToe Game Starter (FIXED)
async function startTicTacToe(interaction, playerX, playerO, bet, supabase, client) {
    const board = ['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'];
    const gameId = `${interaction.guild.id}_${playerX.id}_${playerO.id}`;
    
    tttGames.set(gameId, {
        guildId: interaction.guild.id,
        playerX: playerX.id,
        playerO: playerO.id,
        currentTurn: playerX.id,
        board: board,
        bet: bet
    });
    
    const rows = [];
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${gameId}_${i*3+j}`)
                    .setLabel('⬜')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        rows.push(row);
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle('🎮 TicTacToe')
        .setDescription(`**${playerX.username}** ❌ vs **${playerO.username}** ⭕\n\n**${playerX.username}**'s turn!`)
        .setFooter({ text: `${playerX.username} vs ${playerO.username}` })
        .setTimestamp();
    
    const msg = await interaction.update({ embeds: [embed], components: rows, fetchReply: true });
    
    // Game collector
    const collector = msg.createMessageComponentCollector({ time: 120000 });
    
    collector.on('collect', async (i) => {
        const game = tttGames.get(gameId);
        if (!game) return i.reply({ content: 'Game no longer exists!', ephemeral: true });
        
        if (i.user.id !== game.currentTurn) {
            return i.reply({ content: 'It\'s not your turn!', ephemeral: true });
        }
        
        const pos = parseInt(i.customId.split('_')[3]);
        
        if (game.board[pos] !== '⬜') {
            return i.reply({ content: 'This field is already taken!', ephemeral: true });
        }
        
        const symbol = game.currentTurn === game.playerX ? '❌' : '⭕';
        game.board[pos] = symbol;
        
        // Update UI
        const newRows = [];
        for (let r = 0; r < 3; r++) {
            const row = new ActionRowBuilder();
            for (let c = 0; c < 3; c++) {
                const idx = r * 3 + c;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ttt_${gameId}_${idx}`)
                        .setLabel(game.board[idx])
                        .setStyle(game.board[idx] === '❌' ? ButtonStyle.Danger : 
                                 game.board[idx] === '⭕' ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setDisabled(game.board[idx] !== '⬜')
                );
            }
            newRows.push(row);
        }
        
        // Check winner
        const winPatterns = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];
        
        let winner = null;
        for (const pattern of winPatterns) {
            if (game.board[pattern[0]] !== '⬜' &&
                game.board[pattern[0]] === game.board[pattern[1]] &&
                game.board[pattern[1]] === game.board[pattern[2]]) {
                winner = game.board[pattern[0]] === '❌' ? game.playerX : game.playerO;
                break;
            }
        }
        
        const isDraw = !winner && game.board.every(cell => cell !== '⬜');
        
        if (winner || isDraw) {
            collector.stop();
            
            let resultText = '';
            if (winner) {
                const winnerUser = winner === game.playerX ? playerX : playerO;
                const loserUser = winner === game.playerX ? playerO : playerX;
                resultText = `**${winnerUser.username}** wins!`;
                
                // Handle bet
                if (bet > 0) {
                    const { data: winnerData } = await supabase
                        .from('economy')
                        .select('balance')
                        .eq('guild_id', interaction.guild.id)
                        .eq('user_id', winner)
                        .single();
                    
                    const { data: loserData } = await supabase
                        .from('economy')
                        .select('balance')
                        .eq('guild_id', interaction.guild.id)
                        .eq('user_id', winner === game.playerX ? game.playerO : game.playerX)
                        .single();
                    
                    await supabase.from('economy').upsert({
                        guild_id: interaction.guild.id,
                        user_id: winner,
                        balance: (winnerData?.balance || 0) + bet
                    });
                    
                    await supabase.from('economy').upsert({
                        guild_id: interaction.guild.id,
                        user_id: winner === game.playerX ? game.playerO : game.playerX,
                        balance: (loserData?.balance || 0) - bet
                    });
                    
                    resultText += `\n\n💰 **${bet}** won!`;
                }
            } else {
                resultText = '**It\'s a draw!**';
            }
            
            const finalEmbed = new EmbedBuilder()
                .setColor(winner ? 0x57F287 : 0x808080)
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setTitle(winner ? '🏆 Winner!' : '🤝 Draw!')
                .setDescription(`${playerX.username} ❌ vs ${playerO.username} ⭕\n\n${resultText}`)
                .setTimestamp();
            
            await i.update({ embeds: [finalEmbed], components: [] });
            tttGames.delete(gameId);
            return;
        }
        
        // Next turn
        game.currentTurn = game.currentTurn === game.playerX ? game.playerO : game.playerX;
        const nextUser = game.currentTurn === game.playerX ? playerX : playerO;
        
        const turnEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('🎮 TicTacToe')
            .setDescription(`**${playerX.username}** ❌ vs **${playerO.username}** ⭕\n\n**${nextUser.username}**'s turn!`)
            .setFooter({ text: `${playerX.username} vs ${playerO.username}` })
            .setTimestamp();
        
        await i.update({ embeds: [turnEmbed], components: newRows });
    });
    
    collector.on('end', async (collected, reason) => {
        const game = tttGames.get(gameId);
        if (game && reason === 'time') {
            try {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0x808080)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('⏰ Timeout')
                    .setDescription('Game expired due to inactivity.')
                    .setTimestamp();
                
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
            } catch {}
            tttGames.delete(gameId);
        }
    });
}

module.exports.tttGames = tttGames;
