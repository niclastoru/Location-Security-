const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Game sessions cache
const gameSessions = new Map();

// ========== MEMORY CARD GAME ==========
class MemoryGame {
    constructor(channel, player1, player2 = null) {
        this.channel = channel;
        this.players = [player1];
        if (player2) this.players.push(player2);
        this.currentPlayer = 0;
        this.board = [];
        this.cardBack = '❓';
        this.cardValues = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐸', '🐙', '🦄'];
        this.selectedCard = null;
        this.waitingForMatch = false;
        this.scores = this.players.map(() => 0);
        this.gameOver = false;
        this.messageId = null;
        
        this.initBoard();
    }
    
    initBoard() {
        // Use fewer cards for 2 players, more for 1 player
        const cardCount = this.players.length === 1 ? 16 : 8;
        const usedValues = this.cardValues.slice(0, cardCount / 2);
        let cards = [...usedValues, ...usedValues];
        
        // Shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        
        // Create board (4x4 or 4x4 for 1p)
        const size = Math.sqrt(cards.length);
        for (let i = 0; i < size; i++) {
            this.board[i] = [];
            for (let j = 0; j < size; j++) {
                this.board[i][j] = {
                    value: cards[i * size + j],
                    revealed: false,
                    matched: false
                };
            }
        }
    }
    
    getBoardString() {
        let result = '';
        for (let i = 0; i < this.board.length; i++) {
            let row = '';
            for (let j = 0; j < this.board[i].length; j++) {
                const cell = this.board[i][j];
                if (cell.matched) {
                    row += '✅ ';
                } else if (cell.revealed) {
                    row += `${cell.value} `;
                } else {
                    row += `${this.cardBack} `;
                }
            }
            result += row + '\n';
        }
        return result;
    }
    
    async handleCard(interaction, row, col) {
        if (this.gameOver) return { error: 'Game is already over!' };
        if (this.waitingForMatch) return { error: 'Please wait...' };
        
        const cell = this.board[row][col];
        if (cell.matched) return { error: 'This card is already matched!' };
        if (cell.revealed) return { error: 'This card is already revealed!' };
        
        if (this.selectedCard === null) {
            // First card selected
            cell.revealed = true;
            this.selectedCard = { row, col, value: cell.value };
            return { success: true, board: this.getBoardString(), firstCard: true };
        } else {
            // Second card selected
            cell.revealed = true;
            const firstCard = this.selectedCard;
            this.selectedCard = null;
            this.waitingForMatch = true;
            
            // Check match
            const isMatch = firstCard.value === cell.value;
            
            if (isMatch) {
                // Match found
                this.board[firstCard.row][firstCard.col].matched = true;
                this.board[row][col].matched = true;
                this.scores[this.currentPlayer]++;
                
                // Clear revealed status
                this.board[firstCard.row][firstCard.col].revealed = false;
                this.board[row][col].revealed = false;
                
                const result = {
                    success: true,
                    match: true,
                    player: this.players[this.currentPlayer],
                    score: this.scores[this.currentPlayer],
                    board: this.getBoardString()
                };
                
                this.waitingForMatch = false;
                
                // Check win
                const allMatched = this.board.every(row => row.every(cell => cell.matched));
                if (allMatched) {
                    this.gameOver = true;
                    result.gameOver = true;
                    result.winner = this.getWinner();
                }
                
                return result;
            } else {
                // No match - switch player
                const result = {
                    success: true,
                    match: false,
                    currentPlayer: this.players[this.currentPlayer],
                    board: this.getBoardString(),
                    firstCardValue: firstCard.value,
                    secondCardValue: cell.value
                };
                
                // Flip back after delay (handled by caller)
                setTimeout(() => {
                    this.board[firstCard.row][firstCard.col].revealed = false;
                    this.board[row][col].revealed = false;
                    this.waitingForMatch = false;
                    
                    if (this.players.length > 1) {
                        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
                    }
                }, 1500);
                
                return result;
            }
        }
    }
    
    getWinner() {
        if (this.scores[0] > (this.scores[1] || 0)) return this.players[0];
        if (this.scores[1] && this.scores[1] > this.scores[0]) return this.players[1];
        return null; // Tie
    }
}

// ========== ROCK PAPER SCISSORS ==========
async function playRPS(message, args, client, supabase, isDuel = false, opponent = null) {
    const choices = ['🪨 Rock', '📄 Paper', '✂️ Scissors'];
    const emojis = { '🪨 Rock': '🪨', '📄 Paper': '📄', '✂️ Scissors': '✂️' };
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('rps_rock').setLabel('Rock').setStyle(ButtonStyle.Secondary).setEmoji('🪨'),
            new ButtonBuilder().setCustomId('rps_paper').setLabel('Paper').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
            new ButtonBuilder().setCustomId('rps_scissors').setLabel('Scissors').setStyle(ButtonStyle.Secondary).setEmoji('✂️')
        );
    
    if (isDuel && opponent) {
        // Duel mode - wait for both players
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(`🎮 Rock Paper Scissors Duel`)
            .setDescription(`${message.author} challenges ${opponent} to a duel!\n\nClick a button to choose your move.`)
            .setFooter({ text: `${message.author.username} vs ${opponent.user.username}` })
            .setTimestamp();
        
        const msg = await message.reply({ embeds: [embed], components: [row] });
        
        const sessionId = `rps_duel_${message.author.id}_${opponent.id}_${Date.now()}`;
        gameSessions.set(sessionId, {
            type: 'rps_duel',
            players: [message.author.id, opponent.id],
            choices: {},
            messageId: msg.id,
            channelId: message.channel.id
        });
        
        return;
    }
    
    // Single player mode
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`🎮 Rock Paper Scissors`)
        .setDescription(`Choose your move, ${message.author}!`)
        .setTimestamp();
    
    const msg = await message.reply({ embeds: [embed], components: [row] });
    
    const sessionId = `rps_${message.author.id}_${Date.now()}`;
    gameSessions.set(sessionId, {
        type: 'rps_single',
        userId: message.author.id,
        messageId: msg.id,
        channelId: message.channel.id
    });
}

// ========== PP DUEL ==========
async function playPPDuel(message, args, client, supabase) {
    const opponent = message.mentions.users.first();
    
    if (!opponent) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(`🍆 PP Duel`)
            .setDescription(`Usage: \`!ppduel @user\``)
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    if (opponent.id === message.author.id) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ You cannot duel yourself! That's weird...`)
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`🍆 PP DUEL!`)
        .setDescription(`${opponent}, you have been challenged to a PP Duel by ${message.author}!\n\nClick **Accept** to see who has the bigger PP!`)
        .setFooter({ text: "Don't be scared!" })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId(`pp_accept_${message.author.id}`).setLabel('Accept Duel').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
            new ButtonBuilder().setCustomId('pp_decline').setLabel('Decline').setStyle(ButtonStyle.Danger).setEmoji('🏳️')
        );
    
    const msg = await message.reply({ embeds: [embed], components: [row] });
    
    const sessionId = `ppduel_${message.author.id}_${opponent.id}_${Date.now()}`;
    gameSessions.set(sessionId, {
        type: 'ppduel',
        challenger: message.author.id,
        opponent: opponent.id,
        messageId: msg.id,
        channelId: message.channel.id
    });
}

function getPPImage(size) {
    if (size === 0) return '⚪';
    if (size < 5) return '·';
    if (size < 10) return '•';
    if (size < 15) return '●';
    return '💪';
}

function getPPVisual(size) {
    const bar = '='.repeat(Math.min(size, 20));
    const tip = '>';
    return `8${bar}${tip}`;
}

module.exports = {
    category: 'Games',
    subCommands: {
        
        // ========== MEMORY GAME ==========
        memory: {
            aliases: ['mem', 'cardgame'],
            description: 'Play Memory card game (single or multiplayer)',
            category: 'Games',
            async execute(message, args, { client }) {
                const opponent = message.mentions.members?.first();
                
                let embed;
                let row;
                
                if (opponent && opponent.id !== message.author.id) {
                    // Multiplayer mode
                    embed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(`🎴 Memory Game - Multiplayer`)
                        .setDescription(`${opponent}, ${message.author} challenges you to a game of Memory!\n\nClick **Accept** to start.`)
                        .setFooter({ text: "Match pairs to win!" })
                        .setTimestamp();
                    
                    row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder().setCustomId(`memory_accept_${message.author.id}`).setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
                            new ButtonBuilder().setCustomId('memory_decline').setLabel('Decline').setStyle(ButtonStyle.Danger).setEmoji('❌')
                        );
                    
                    const msg = await message.reply({ embeds: [embed], components: [row] });
                    
                    const sessionId = `memory_${message.author.id}_${opponent.id}_${Date.now()}`;
                    gameSessions.set(sessionId, {
                        type: 'memory',
                        challenger: message.author,
                        opponent: opponent,
                        messageId: msg.id,
                        channelId: message.channel.id,
                        accepted: false
                    });
                } else {
                    // Single player mode
                    const game = new MemoryGame(message.channel, message.author);
                    
                    const gameEmbed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(`🎴 Memory Game - Single Player`)
                        .setDescription(`**${message.author.username}'s turn**\n\n${game.getBoardString()}\n\nClick a card to reveal it!`)
                        .setFooter({ text: "Match all pairs to win!" })
                        .setTimestamp();
                    
                    // Create buttons for each card position
                    const buttons = [];
                    for (let i = 0; i < 4; i++) {
                        const row = new ActionRowBuilder();
                        for (let j = 0; j < 4; j++) {
                            row.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`memory_card_${i}_${j}`)
                                    .setLabel('??')
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('🎴')
                            );
                        }
                        buttons.push(row);
                    }
                    
                    const msg = await message.reply({ embeds: [gameEmbed], components: buttons });
                    
                    const sessionId = `memory_${message.author.id}_${Date.now()}`;
                    gameSessions.set(sessionId, {
                        type: 'memory_single',
                        game: game,
                        messageId: msg.id,
                        channelId: message.channel.id,
                        userId: message.author.id
                    });
                }
            }
        },
        
        // ========== RPS (Rock Paper Scissors) ==========
        rps: {
            aliases: ['rockpaperscissors', 'rpsgame'],
            description: 'Play Rock Paper Scissors',
            category: 'Games',
            async execute(message, args, { client }) {
                const opponent = message.mentions.users.first();
                
                if (opponent && opponent.id !== message.author.id) {
                    // Duel mode
                    await playRPS(message, args, client, null, true, opponent);
                } else {
                    // Single player mode
                    await playRPS(message, args, client);
                }
            }
        },
        
        // ========== PP DUEL ==========
        ppduel: {
            aliases: ['pp', 'duel', 'ppbattle'],
            description: 'Challenge someone to a PP duel',
            category: 'Games',
            async execute(message, args, { client }) {
                await playPPDuel(message, args, client);
            }
        }
    }
};

// ========== INTERACTION HANDLER (für Buttons) ==========
async function handleGameButtons(interaction, client, supabase) {
    const customId = interaction.customId;
    
    // Memory Game handling
    if (customId.startsWith('memory_card_')) {
        const parts = customId.split('_');
        const row = parseInt(parts[2]);
        const col = parseInt(parts[3]);
        
        // Find session
        for (const [sessionId, session] of gameSessions) {
            if (session.type === 'memory_single' && session.userId === interaction.user.id && session.channelId === interaction.channel.id) {
                const result = await session.game.handleCard(interaction, row, col);
                
                if (result.error) {
                    return interaction.reply({ content: result.error, ephemeral: true });
                }
                
                if (result.gameOver) {
                    const embed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(`🎉 Game Over! 🎉`)
                        .setDescription(`You scored **${result.score}** pairs!\n${result.winner ? `🏆 Winner: ${result.winner}!` : '🤝 It\'s a tie!'}`)
                        .setTimestamp();
                    
                    await interaction.update({ embeds: [embed], components: [] });
                    gameSessions.delete(sessionId);
                } else if (result.match) {
                    const embed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setDescription(`✅ Match found! +1 point\n**Score: ${result.score}**`)
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    
                    // Update game board
                    const newEmbed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setTitle(`🎴 Memory Game - Single Player`)
                        .setDescription(`**Your turn**\n\n${result.board}\n\nScore: ${result.score}`)
                        .setTimestamp();
                    
                    await interaction.message.edit({ embeds: [newEmbed] });
                } else {
                    await interaction.reply({ content: `❌ No match! The cards were ${result.firstCardValue} and ${result.secondCardValue}.`, ephemeral: true });
                    
                    // Update board after delay
                    setTimeout(async () => {
                        const newEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setTitle(`🎴 Memory Game - Single Player`)
                            .setDescription(`**Your turn**\n\n${result.board}\n\nScore: ${session.game.scores[0]}`)
                            .setTimestamp();
                        
                        await interaction.message.edit({ embeds: [newEmbed] });
                    }, 1500);
                }
                return;
            }
        }
        
        return interaction.reply({ content: '❌ Game session expired! Start a new game with `!memory`.', ephemeral: true });
    }
    
    // RPS handling
    if (customId.startsWith('rps_')) {
        const choice = customId.split('_')[1];
        const choices = { rock: '🪨 Rock', paper: '📄 Paper', scissors: '✂️ Scissors' };
        const userChoice = choices[choice];
        
        // Find session
        for (const [sessionId, session] of gameSessions) {
            if (session.type === 'rps_single' && session.userId === interaction.user.id) {
                const botChoice = Object.values(choices)[Math.floor(Math.random() * 3)];
                
                let result;
                let color = 0x5865F2;
                
                if (userChoice === botChoice) {
                    result = "It's a tie! 🤝";
                    color = 0xFEE75C;
                } else if (
                    (userChoice === '🪨 Rock' && botChoice === '✂️ Scissors') ||
                    (userChoice === '📄 Paper' && botChoice === '🪨 Rock') ||
                    (userChoice === '✂️ Scissors' && botChoice === '📄 Paper')
                ) {
                    result = "You win! 🎉";
                    color = 0x57F287;
                } else {
                    result = "You lose! 😭";
                    color = 0xED4245;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
                    .setTitle(`🎮 Rock Paper Scissors`)
                    .addFields([
                        { name: 'You', value: userChoice, inline: true },
                        { name: 'Bot', value: botChoice, inline: true },
                        { name: 'Result', value: result, inline: true }
                    ])
                    .setFooter({ text: `Play again with !rps` })
                    .setTimestamp();
                
                await interaction.update({ embeds: [embed], components: [] });
                gameSessions.delete(sessionId);
                return;
            }
            
            if (session.type === 'rps_duel') {
                if (!session.players.includes(interaction.user.id)) {
                    return interaction.reply({ content: '❌ This game is not for you!', ephemeral: true });
                }
                
                const choiceMap = { rock: '🪨 Rock', paper: '📄 Paper', scissors: '✂️ Scissors' };
                const userChoice = choiceMap[choice];
                
                session.choices[interaction.user.id] = userChoice;
                await interaction.reply({ content: `✅ You chose ${userChoice}! Waiting for opponent...`, ephemeral: true });
                
                // Check if both have chosen
                if (Object.keys(session.choices).length === 2) {
                    const player1Choice = session.choices[session.players[0]];
                    const player2Choice = session.choices[session.players[1]];
                    const player1 = await interaction.client.users.fetch(session.players[0]);
                    const player2 = await interaction.client.users.fetch(session.players[1]);
                    
                    let result;
                    let winner;
                    
                    if (player1Choice === player2Choice) {
                        result = "It's a tie! 🤝";
                        winner = null;
                    } else if (
                        (player1Choice === '🪨 Rock' && player2Choice === '✂️ Scissors') ||
                        (player1Choice === '📄 Paper' && player2Choice === '🪨 Rock') ||
                        (player1Choice === '✂️ Scissors' && player2Choice === '📄 Paper')
                    ) {
                        result = `${player1.username} wins! 🎉`;
                        winner = player1;
                    } else {
                        result = `${player2.username} wins! 🎉`;
                        winner = player2;
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(winner ? 0x57F287 : 0xFEE75C)
                        .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
                        .setTitle(`🎮 Rock Paper Scissors Duel`)
                        .addFields([
                            { name: player1.username, value: player1Choice, inline: true },
                            { name: player2.username, value: player2Choice, inline: true },
                            { name: 'Result', value: result, inline: true }
                        ])
                        .setTimestamp();
                    
                    const channel = await interaction.client.channels.fetch(session.channelId);
                    const msg = await channel.messages.fetch(session.messageId);
                    await msg.edit({ embeds: [embed], components: [] });
                    
                    gameSessions.delete(sessionId);
                }
                return;
            }
        }
        
        return interaction.reply({ content: '❌ Game session expired! Start a new game with `!rps`.', ephemeral: true });
    }
    
    // PP Duel handling
    if (customId === 'pp_accept') {
        const sessionId = [...gameSessions.keys()].find(id => id.includes(customId.split('_')[2]));
        const session = gameSessions.get(sessionId);
        
        if (!session) {
            return interaction.reply({ content: '❌ Duel expired! Start a new one with `!ppduel @user`.', ephemeral: true });
        }
        
        if (interaction.user.id !== session.opponent) {
            return interaction.reply({ content: '❌ You are not the challenged player!', ephemeral: true });
        }
        
        // Generate random PP sizes
        const player1Size = Math.floor(Math.random() * 21);
        const player2Size = Math.floor(Math.random() * 21);
        
        const challenger = await interaction.client.users.fetch(session.challenger);
        const opponent = interaction.user;
        
        const winner = player1Size > player2Size ? challenger : player2Size > player1Size ? opponent : null;
        const loser = winner === challenger ? opponent : winner === opponent ? challenger : null;
        
        const embed = new EmbedBuilder()
            .setColor(winner ? 0x57F287 : 0xFEE75C)
            .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(`🍆 PP DUEL RESULTS! 🍆`)
            .setDescription(`${challenger} vs ${opponent}`)
            .addFields([
                { name: `${challenger.username}'s PP`, value: `${player1Size}cm\n\`${'='.repeat(Math.min(player1Size, 20))}>\``, inline: true },
                { name: `${opponent.username}'s PP`, value: `${player2Size}cm\n\`${'='.repeat(Math.min(player2Size, 20))}>\``, inline: true }
            ])
            .setFooter({ text: winner ? `🏆 WINNER: ${winner.username}! 🏆` : "It's a tie! Both are equally... average." })
            .setTimestamp();
        
        const channel = await interaction.client.channels.fetch(session.channelId);
        const msg = await channel.messages.fetch(session.messageId);
        await msg.edit({ embeds: [embed], components: [] });
        
        await interaction.reply({ content: '🍆 Duel completed! Check the results above!', ephemeral: true });
        
        gameSessions.delete(sessionId);
        return;
    }
    
    if (customId === 'pp_decline') {
        const session = [...gameSessions.values()].find(s => s.type === 'ppduel' && s.opponent === interaction.user.id);
        if (session) {
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription(`❌ ${interaction.user} declined the PP Duel!`)
                .setTimestamp();
            
            const channel = await interaction.client.channels.fetch(session.channelId);
            const msg = await channel.messages.fetch(session.messageId);
            await msg.edit({ embeds: [embed], components: [] });
            
            const sessionId = [...gameSessions.keys()].find(id => gameSessions.get(id) === session);
            gameSessions.delete(sessionId);
            
            await interaction.reply({ content: 'You declined the duel.', ephemeral: true });
        }
        return;
    }
}

module.exports.handleGameButtons = handleGameButtons;
