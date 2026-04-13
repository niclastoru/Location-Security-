const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Aktive TicTacToe Spiele (Cache)
const tttGames = new Map();

module.exports = {
    category: 'Games',
    subCommands: {
        
        // ========== DAILY ==========
        daily: {
            aliases: ['dailyreward'],
            description: 'Tägliche Belohnung abholen',
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
                    return message.reply({ embeds: [global.embed.error('Bereits abgeholt', `Nächste Belohnung in **${timeLeft}** Stunden!`)] });
                }
                
                const reward = 500 + Math.floor(Math.random() * 500);
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: (user?.balance || 0) + reward,
                    daily_last: now.toISOString()
                });
                
                return message.reply({ embeds: [global.embed.success('Daily Reward', `Du hast **${reward}** 💰 erhalten!\nNeuer Kontostand: **${(user?.balance || 0) + reward}**`)] });
            }
        },
        
        // ========== WORK ==========
        work: {
            aliases: ['job'],
            description: 'Arbeite für Geld',
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
                    return message.reply({ embeds: [global.embed.error('Bereits gearbeitet', `Nächste Arbeit in **${timeLeft}** Minuten!`)] });
                }
                
                const jobs = [
                    { name: 'Pizzalieferant', min: 100, max: 300 },
                    { name: 'Programmierer', min: 200, max: 500 },
                    { name: 'Kellner', min: 80, max: 250 },
                    { name: 'Verkäufer', min: 120, max: 350 },
                    { name: 'Putzfrau', min: 90, max: 280 }
                ];
                
                const job = jobs[Math.floor(Math.random() * jobs.length)];
                const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: (user?.balance || 0) + earned,
                    work_last: now.toISOString()
                });
                
                return message.reply({ embeds: [global.embed.success('Arbeit', `Als **${job.name}** hast du **${earned}** 💰 verdient!\nNeuer Kontostand: **${(user?.balance || 0) + earned}**`)] });
            }
        },
        
        // ========== BALANCE ==========
        balance: {
            aliases: ['bal', 'money'],
            description: 'Zeigt deinen Kontostand',
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
                
                return message.reply({ embeds: [{
                    color: 0xF1C40F,
                    title: `💰 Kontostand von ${target.username}`,
                    fields: [
                        { name: '💵 Bargeld', value: `${balance}`, inline: true },
                        { name: '🏦 Bank', value: `${bank}`, inline: true },
                        { name: '📊 Gesamt', value: `${balance + bank}`, inline: true }
                    ]
                }] });
            }
        },
        
        // ========== PAY ==========
        pay: {
            aliases: ['send', 'give'],
            description: 'Sende Geld an einen User',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const amount = parseInt(args[1]);
                
                if (!target || isNaN(amount) || amount <= 0) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!pay @User <Betrag>')] });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst dir nicht selbst Geld senden!')] });
                }
                
                const { data: sender } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!sender || sender.balance < amount) {
                    return message.reply({ embeds: [global.embed.error('Nicht genug Geld', `Du hast nur **${sender?.balance || 0}**!`)] });
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
                
                return message.reply({ embeds: [global.embed.success('Überweisung', `Du hast **${amount}** 💰 an ${target} gesendet!`)] });
            }
        },
        
        // ========== DEPOSIT ==========
        deposit: {
            aliases: ['dep'],
            description: 'Zahle Geld auf die Bank ein',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const amount = args[0]?.toLowerCase() === 'all' ? 'all' : parseInt(args[0]);
                
                if (!amount || (amount !== 'all' && (isNaN(amount) || amount <= 0))) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!deposit <Betrag/all>')] });
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
                    return message.reply({ embeds: [global.embed.error('Nicht genug Geld', `Du hast nur **${balance}**!`)] });
                }
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: balance - depositAmount,
                    bank: (user?.bank || 0) + depositAmount
                });
                
                return message.reply({ embeds: [global.embed.success('Einzahlung', `**${depositAmount}** 💰 auf die Bank eingezahlt!`)] });
            }
        },
        
        // ========== WITHDRAW ==========
        withdraw: {
            aliases: ['with'],
            description: 'Hebe Geld von der Bank ab',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const amount = args[0]?.toLowerCase() === 'all' ? 'all' : parseInt(args[0]);
                
                if (!amount || (amount !== 'all' && (isNaN(amount) || amount <= 0))) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!withdraw <Betrag/all>')] });
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
                    return message.reply({ embeds: [global.embed.error('Nicht genug auf Bank', `Du hast nur **${bank}** auf der Bank!`)] });
                }
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: (user?.balance || 0) + withdrawAmount,
                    bank: bank - withdrawAmount
                });
                
                return message.reply({ embeds: [global.embed.success('Auszahlung', `**${withdrawAmount}** 💰 von der Bank abgehoben!`)] });
            }
        },
        
        // ========== ROULETTE ==========
        roulette: {
            aliases: ['roul'],
            description: 'Roulette spielen',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const bet = parseInt(args[0]);
                const choice = args[1]?.toLowerCase();
                
                if (isNaN(bet) || bet <= 0 || !choice) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!roulette <Betrag> <rot/schwarz/grün/zahl>')] });
                }
                
                const { data: user } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!user || user.balance < bet) {
                    return message.reply({ embeds: [global.embed.error('Nicht genug Geld', `Du hast nur **${user?.balance || 0}**!`)] });
                }
                
                const number = Math.floor(Math.random() * 37);
                let color = number === 0 ? 'grün' : (number % 2 === 0 ? 'rot' : 'schwarz');
                let win = 0;
                
                if (choice === 'rot' && color === 'rot') win = bet * 2;
                else if (choice === 'schwarz' && color === 'schwarz') win = bet * 2;
                else if (choice === 'grün' && color === 'grün') win = bet * 14;
                else if (!isNaN(parseInt(choice)) && parseInt(choice) === number) win = bet * 35;
                
                const newBalance = user.balance - bet + win;
                
                await supabase.from('economy').upsert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    balance: newBalance
                });
                
                const resultEmbed = {
                    color: win > 0 ? 0x00FF00 : 0xFF0000,
                    title: win > 0 ? '🎉 GEWONNEN!' : '😢 VERLOREN!',
                    description: `**Zahl:** ${number} (${color})\n**Einsatz:** ${bet} 💰\n**Gewinn:** ${win} 💰\n**Neuer Stand:** ${newBalance} 💰`
                };
                
                return message.reply({ embeds: [resultEmbed] });
            }
        },
        
        // ========== COINFLIP ==========
        coinflip: {
            aliases: ['cf'],
            description: 'Kopf oder Zahl gegen andere User',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const bet = parseInt(args[1]);
                
                if (!target || isNaN(bet) || bet <= 0) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!coinflip @User <Betrag>')] });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst nicht gegen dich selbst spielen!')] });
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
                    return message.reply({ embeds: [global.embed.error('Nicht genug Geld', `Du hast nur **${challenger?.balance || 0}**!`)] });
                }
                
                if (!opponent || opponent.balance < bet) {
                    return message.reply({ embeds: [global.embed.error('Gegner hat nicht genug', `${target} hat nur **${opponent?.balance || 0}**!`)] });
                }
                
                // Challenge Embed mit Buttons
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`cf_accept_${message.author.id}_${target.id}_${bet}`).setLabel('✅ Annehmen').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`cf_reject_${message.author.id}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger)
                    );
                
                const challengeEmbed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle('🪙 Coinflip Challenge')
                    .setDescription(`${message.author} fordert ${target} heraus!\n**Einsatz:** ${bet} 💰\n\n${target}, klicke auf Annehmen!`);
                
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
                            .setColor(0x00FF00)
                            .setTitle('🪙 Coinflip Ergebnis')
                            .setDescription(`**${winner.username}** gewinnt **${bet}** 💰!`);
                        
                        await i.update({ embeds: [resultEmbed], components: [] });
                    } else {
                        await i.update({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('❌ Abgelehnt').setDescription(`${target} hat die Challenge abgelehnt.`)], components: [] });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await msg.edit({ embeds: [new EmbedBuilder().setColor(0x808080).setTitle('⏰ Timeout').setDescription('Challenge abgelaufen.')], components: [] });
                    }
                });
            }
        },
        
        // ========== TICTACTOE ==========
        tictactoe: {
            aliases: ['ttt', 'xo'],
            description: 'TicTacToe gegen andere User',
            category: 'Games',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                const bet = parseInt(args[1]) || 0;
                
                if (!target) {
                    return message.reply({ embeds: [global.embed.error('Kein Gegner', '!tictactoe @User [Einsatz]')] });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst nicht gegen dich selbst spielen!')] });
                }
                
                if (target.bot) {
                    return message.reply({ embeds: [global.embed.error('Bot', 'Du kannst nicht gegen Bots spielen!')] });
                }
                
                // Prüfen ob bereits ein Spiel läuft
                const existingGame = Array.from(tttGames.values()).find(g => 
                    g.guildId === message.guild.id && 
                    (g.playerX === message.author.id || g.playerO === message.author.id || 
                     g.playerX === target.id || g.playerO === target.id)
                );
                
                if (existingGame) {
                    return message.reply({ embeds: [global.embed.error('Bereits im Spiel', 'Einer der Spieler ist bereits in einem TicTacToe-Spiel!')] });
                }
                
                // Bei Einsatz: Guthaben prüfen
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
                        return message.reply({ embeds: [global.embed.error('Nicht genug Geld', `Du hast nur **${challenger?.balance || 0}**!`)] });
                    }
                    
                    if (!opponent || opponent.balance < bet) {
                        return message.reply({ embeds: [global.embed.error('Gegner hat nicht genug', `${target} hat nur **${opponent?.balance || 0}**!`)] });
                    }
                }
                
                // Challenge Embed
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`ttt_accept_${message.author.id}_${target.id}_${bet}`).setLabel('✅ Annehmen').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`ttt_reject_${message.author.id}`).setLabel('❌ Ablehnen').setStyle(ButtonStyle.Danger)
                    );
                
                const challengeEmbed = new EmbedBuilder()
                    .setColor(0x3498DB)
                    .setTitle('🎮 TicTacToe Challenge')
                    .setDescription(`${message.author} fordert ${target} heraus!\n${bet > 0 ? `**Einsatz:** ${bet} 💰\n\n` : ''}${target}, klicke auf Annehmen!`);
                
                const msg = await message.reply({ content: `${target}`, embeds: [challengeEmbed], components: [row] });
                
                const filter = i => i.user.id === target.id;
                const collector = msg.createMessageComponentCollector({ filter, time: 60000, max: 1 });
                
                collector.on('collect', async (i) => {
                    if (i.customId.startsWith('ttt_accept')) {
                        await startTicTacToe(i, message.author, target, bet, supabase);
                    } else {
                        await i.update({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('❌ Abgelehnt').setDescription(`${target} hat die Challenge abgelehnt.`)], components: [] });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await msg.edit({ embeds: [new EmbedBuilder().setColor(0x808080).setTitle('⏰ Timeout').setDescription('Challenge abgelaufen.')], components: [] });
                    }
                });
            }
        },
        
        // ========== LEADERBOARD ==========
        leaderboard: {
            aliases: ['lb', 'top', 'rich'],
            description: 'Zeigt die reichsten User',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const { data: users } = await supabase
                    .from('economy')
                    .select('user_id, balance, bank')
                    .eq('guild_id', message.guild.id)
                    .order('balance', { ascending: false })
                    .limit(10);
                
                if (!users || users.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Daten', 'Noch niemand hat Geld!')] });
                }
                
                const lb = await Promise.all(users.map(async (u, i) => {
                    const user = await message.client.users.fetch(u.user_id).catch(() => null);
                    const total = (u.balance || 0) + (u.bank || 0);
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
                    return `${medal} **${user?.username || 'Unbekannt'}**: ${total} 💰`;
                }));
                
                return message.reply({ embeds: [{
                    color: 0xF1C40F,
                    title: '🏆 Leaderboard',
                    description: lb.join('\n'),
                    footer: { text: `Top 10 von ${users.length} Usern` }
                }] });
            }
        },
        
        // ========== SLOTS ==========
        slots: {
            aliases: ['slot'],
            description: 'Spielautomat',
            category: 'Economy',
            async execute(message, args, { supabase }) {
                const bet = parseInt(args[0]);
                
                if (isNaN(bet) || bet <= 0) {
                    return message.reply({ embeds: [global.embed.error('Falsche Nutzung', '!slots <Betrag>')] });
                }
                
                const { data: user } = await supabase
                    .from('economy')
                    .select('balance')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!user || user.balance < bet) {
                    return message.reply({ embeds: [global.embed.error('Nicht genug Geld', `Du hast nur **${user?.balance || 0}**!`)] });
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
                
                return message.reply({ embeds: [{
                    color: win > 0 ? 0x00FF00 : 0xFF0000,
                    title: win > 0 ? '🎰 GEWONNEN!' : '🎰 VERLOREN!',
                    description: `**${slots.join('  ')}**\n\nEinsatz: ${bet} 💰\nGewinn: ${win} 💰\nNeuer Stand: ${newBalance} 💰`
                }] });
            }
        }
    }
};

// ⭐ TicTacToe Spiel starten
async function startTicTacToe(interaction, playerX, playerO, bet, supabase) {
    const board = ['⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜', '⬜'];
    const gameId = `${interaction.guild.id}_${playerX.id}_${playerO.id}`;
    
    tttGames.set(gameId, {
        guildId: interaction.guild.id,
        playerX: playerX.id,
        playerO: playerO.id,
        currentTurn: playerX.id,
        board: board,
        bet: bet,
        message: null
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
        .setTitle('🎮 TicTacToe')
        .setDescription(`**${playerX.username}** ❌ vs **${playerO.username}** ⭕\n\n**${playerX.username}** ist am Zug!`);
    
    const msg = await interaction.update({ embeds: [embed], components: rows, fetchReply: true });
    tttGames.get(gameId).message = msg;
    
    // Collector für das Spiel
    const collector = msg.createMessageComponentCollector({ time: 120000 });
    
    collector.on('collect', async (i) => {
        const game = tttGames.get(gameId);
        if (!game) return i.reply({ content: 'Spiel existiert nicht mehr!', ephemeral: true });
        
        if (i.user.id !== game.currentTurn) {
            return i.reply({ content: 'Du bist nicht am Zug!', ephemeral: true });
        }
        
        const pos = parseInt(i.customId.split('_')[3]);
        
        if (game.board[pos] !== '⬜') {
            return i.reply({ content: 'Dieses Feld ist bereits belegt!', ephemeral: true });
        }
        
        const symbol = game.currentTurn === game.playerX ? '❌' : '⭕';
        game.board[pos] = symbol;
        
        // UI updaten
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
        
        // Gewinner prüfen
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
                resultText = `**${winnerUser.username}** hat gewonnen!`;
                
                // Bei Einsatz: Geld transferieren
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
                    
                    resultText += `\n\n💰 **${bet}** gewonnen!`;
                }
            } else {
                resultText = '**Unentschieden!**';
            }
            
            const finalEmbed = new EmbedBuilder()
                .setColor(winner ? 0x00FF00 : 0x808080)
                .setTitle(winner ? '🏆 Gewinner!' : '🤝 Unentschieden!')
                .setDescription(`${playerX.username} ❌ vs ${playerO.username} ⭕\n\n${resultText}`);
            
            await i.update({ embeds: [finalEmbed], components: [] });
            tttGames.delete(gameId);
            return;
        }
        
        // Nächster Zug
        game.currentTurn = game.currentTurn === game.playerX ? game.playerO : game.playerX;
        const nextUser = game.currentTurn === game.playerX ? playerX : playerO;
        
        const turnEmbed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🎮 TicTacToe')
            .setDescription(`**${playerX.username}** ❌ vs **${playerO.username}** ⭕\n\n**${nextUser.username}** ist am Zug!`);
        
        await i.update({ embeds: [turnEmbed], components: newRows });
    });
    
    collector.on('end', async (collected, reason) => {
        const game = tttGames.get(gameId);
        if (game && reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0x808080)
                .setTitle('⏰ Timeout')
                .setDescription('Spiel abgelaufen!');
            
            await game.message.edit({ embeds: [timeoutEmbed], components: [] });
            tttGames.delete(gameId);
        }
    });
}

module.exports.tttGames = tttGames;
