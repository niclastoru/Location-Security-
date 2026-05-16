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
        this.cardValues = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
        this.selectedCard = null;
        this.waitingForMatch = false;
        this.scores = this.players.map(() => 0);
        this.gameOver = false;
        this.messageId = null;
        
        this.initBoard();
    }
    
    initBoard() {
        const usedValues = this.cardValues.slice(0, 8);
        let cards = [...usedValues, ...usedValues];
        
        // Shuffle
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        
        // Create board 4x4
        for (let i = 0; i < 4; i++) {
            this.board[i] = [];
            for (let j = 0; j < 4; j++) {
                this.board[i][j] = {
                    value: cards[i * 4 + j],
                    revealed: false,
                    matched: false
                };
            }
        }
    }
    
    getBoardString() {
        let result = '';
        for (let i = 0; i < 4; i++) {
            let row = '';
            for (let j = 0; j < 4; j++) {
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
    
    async handleCard(row, col) {
        if (this.gameOver) return { error: 'Game is already over!' };
        if (this.waitingForMatch) return { error: 'Please wait...' };
        
        const cell = this.board[row][col];
        if (cell.matched) return { error: 'This card is already matched!' };
        if (cell.revealed) return { error: 'This card is already revealed!' };
        
        if (this.selectedCard === null) {
            cell.revealed = true;
            this.selectedCard = { row, col, value: cell.value };
            return { success: true, board: this.getBoardString(), firstCard: true };
        } else {
            cell.revealed = true;
            const firstCard = this.selectedCard;
            this.selectedCard = null;
            this.waitingForMatch = true;
            
            const isMatch = firstCard.value === cell.value;
            
            if (isMatch) {
                this.board[firstCard.row][firstCard.col].matched = true;
                this.board[row][col].matched = true;
                this.scores[this.currentPlayer]++;
                
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
                
                const allMatched = this.board.every(row => row.every(cell => cell.matched));
                if (allMatched) {
                    this.gameOver = true;
                    result.gameOver = true;
                    result.winner = this.scores[0] > (this.scores[1] || 0) ? this.players[0] : 
                                   (this.scores[1] && this.scores[1] > this.scores[0]) ? this.players[1] : null;
                }
                
                return result;
            } else {
                const result = {
                    success: true,
                    match: false,
                    board: this.getBoardString(),
                    firstCardValue: firstCard.value,
                    secondCardValue: cell.value
                };
                
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
}

// ========== ROCK PAPER SCISSORS (Gegen Bot) ==========
async function playRPS(message, args, client) {
    const opponent = message.mentions.users.first();
    
    if (opponent && opponent.id !== message.author.id) {
        // Duel mode - 2 players
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(`🎮 Rock Paper Scissors Duel`)
            .setDescription(`${message.author} challenges ${opponent} to a duel!\n\nClick a button to choose your move.`)
            .setFooter({ text: `${message.author.username} vs ${opponent.username}` })
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('rps_rock').setLabel('Rock').setStyle(ButtonStyle.Secondary).setEmoji('🪨'),
                new ButtonBuilder().setCustomId('rps_paper').setLabel('Paper').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
                new ButtonBuilder().setCustomId('rps_scissors').setLabel('Scissors').setStyle(ButtonStyle.Secondary).setEmoji('✂️')
            );
        
        const msg = await message.reply({ embeds: [embed], components: [row] });
        
        const sessionId = `rps_duel_${Date.now()}`;
        gameSessions.set(sessionId, {
            type: 'rps_duel',
            players: [message.author.id, opponent.id],
            choices: {},
            messageId: msg.id,
            channelId: message.channel.id,
            challenger: message.author.id,
            opponent: opponent.id
        });
        return;
    }
    
    // Single player vs Bot
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`🎮 Rock Paper Scissors vs Bot`)
        .setDescription(`${message.author}, choose your move!`)
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('rps_single_rock').setLabel('Rock').setStyle(ButtonStyle.Secondary).setEmoji('🪨'),
            new ButtonBuilder().setCustomId('rps_single_paper').setLabel('Paper').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
            new ButtonBuilder().setCustomId('rps_single_scissors').setLabel('Scissors').setStyle(ButtonStyle.Secondary).setEmoji('✂️')
        );
    
    const msg = await message.reply({ embeds: [embed], components: [row] });
    
    const sessionId = `rps_single_${Date.now()}`;
    gameSessions.set(sessionId, {
        type: 'rps_single',
        userId: message.author.id,
        messageId: msg.id,
        channelId: message.channel.id
    });
}

// ========== PP DUEL ==========
async function playPPDuel(message, args, client) {
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
    
    const sessionId = `ppduel_${Date.now()}`;
    gameSessions.set(sessionId, {
        type: 'ppduel',
        challenger: message.author.id,
        opponent: opponent.id,
        messageId: msg.id,
        channelId: message.channel.id
    });
}

// ========== HANDLE ALL GAME BUTTONS ==========
async function handleGameButtons(interaction, client, supabase) {
    const customId = interaction.customId;
    
    // ========== MEMORY GAME ==========
    if (customId.startsWith('memory_')) {
        if (customId === 'memory_accept') {
            // Accept duel - to be implemented
            await interaction.reply({ content: 'Memory duel coming soon!', ephemeral: true });
            return;
        }
        
        if (customId === 'memory_decline') {
            await interaction.reply({ content: 'You declined the memory duel.', ephemeral: true });
            return;
        }
        
        if (customId.startsWith('memory_card_')) {
            const parts = customId.split('_');
            const row = parseInt(parts[2]);
            const col = parseInt(parts[3]);
            
            // Find active memory game
            for (const [sessionId, session] of gameSessions) {
                if (session.type === 'memory_single' && session.userId === interaction.user.id) {
                    const result = await session.game.handleCard(row, col);
                    
                    if (result.error) {
                        return interaction.reply({ content: result.error, ephemeral: true });
                    }
                    
                    if (result.gameOver) {
                        const embed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setTitle(`🎉 Game Over! 🎉`)
                            .setDescription(`You scored **${result.score}** pairs!\n${result.winner ? `🏆 Winner: ${result.winner.username || result.winner}!` : '🤝 It\'s a tie!'}`)
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [embed], components: [] });
                        gameSessions.delete(sessionId);
                    } else if (result.match) {
                        const embed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setDescription(`✅ Match found! +1 point\n**Score: ${result.score}**`)
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                        
                        const newEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setTitle(`🎴 Memory Game`)
                            .setDescription(`**${interaction.user.username}'s turn**\n\n${result.board}\n\nScore: ${result.score}`)
                            .setTimestamp();
                        
                        await interaction.message.edit({ embeds: [newEmbed] });
                    } else {
                        await interaction.reply({ content: `❌ No match! The cards were ${result.firstCardValue} and ${result.secondCardValue}.`, ephemeral: true });
                        
                        setTimeout(async () => {
                            const newEmbed = new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle(`🎴 Memory Game`)
                                .setDescription(`**${interaction.user.username}'s turn**\n\n${result.board}\n\nScore: ${session.game.scores[0]}`)
                                .setTimestamp();
                            
                            await interaction.message.edit({ embeds: [newEmbed] });
                        }, 1500);
                    }
                    return;
                }
            }
            
            return interaction.reply({ content: '❌ Game session expired! Start a new game with `!memory`.', ephemeral: true });
        }
    }
    
    // ========== RPS BUTTONS ==========
    if (customId.startsWith('rps_')) {
        const choiceMap = { rock: '🪨 Rock', paper: '📄 Paper', scissors: '✂️ Scissors' };
        let userChoice, botChoice, result, color, winnerText;
        
        // Single player vs Bot
        if (customId.startsWith('rps_single_')) {
            const choice = customId.replace('rps_single_', '');
            userChoice = choiceMap[choice];
            const choices = ['rock', 'paper', 'scissors'];
            const botChoiceKey = choices[Math.floor(Math.random() * 3)];
            botChoice = choiceMap[botChoiceKey];
            
            if (choice === botChoiceKey) {
                result = "It's a tie! 🤝";
                color = 0xFEE75C;
                winnerText = "Tie!";
            } else if (
                (choice === 'rock' && botChoiceKey === 'scissors') ||
                (choice === 'paper' && botChoiceKey === 'rock') ||
                (choice === 'scissors' && botChoiceKey === 'paper')
            ) {
                result = "You win! 🎉";
                color = 0x57F287;
                winnerText = `${interaction.user.username} wins!`;
            } else {
                result = "You lose! 😭";
                color = 0xED4245;
                winnerText = "Bot wins!";
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
                .setFooter({ text: winnerText })
                .setTimestamp();
            
            await interaction.update({ embeds: [embed], components: [] });
            
            // Remove session
            for (const [sid, session] of gameSessions) {
                if (session.type === 'rps_single' && session.userId === interaction.user.id) {
                    gameSessions.delete(sid);
                    break;
                }
            }
            return;
        }
        
        // Duel mode - 2 players
        if (customId.startsWith('rps_') && !customId.includes('single')) {
            const choice = customId.replace('rps_', '');
            userChoice = choiceMap[choice];
            
            // Find active duel session
            for (const [sessionId, session] of gameSessions) {
                if (session.type === 'rps_duel' && session.players.includes(interaction.user.id)) {
                    session.choices[interaction.user.id] = userChoice;
                    await interaction.reply({ content: `✅ You chose ${userChoice}! Waiting for opponent...`, ephemeral: true });
                    
                    if (Object.keys(session.choices).length === 2) {
                        const player1Choice = session.choices[session.players[0]];
                        const player2Choice = session.choices[session.players[1]];
                        const player1 = await interaction.client.users.fetch(session.players[0]);
                        const player2 = await interaction.client.users.fetch(session.players[1]);
                        
                        let resultEmbed;
                        if (player1Choice === player2Choice) {
                            resultEmbed = new EmbedBuilder()
                                .setColor(0xFEE75C)
                                .setTitle(`🎮 Rock Paper Scissors Duel`)
                                .addFields([
                                    { name: player1.username, value: player1Choice, inline: true },
                                    { name: player2.username, value: player2Choice, inline: true },
                                    { name: 'Result', value: "It's a tie! 🤝", inline: true }
                                ])
                                .setFooter({ text: "No winner!" })
                                .setTimestamp();
                        } else if (
                            (player1Choice === '🪨 Rock' && player2Choice === '✂️ Scissors') ||
                            (player1Choice === '📄 Paper' && player2Choice === '🪨 Rock') ||
                            (player1Choice === '✂️ Scissors' && player2Choice === '📄 Paper')
                        ) {
                            resultEmbed = new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle(`🎮 Rock Paper Scissors Duel`)
                                .addFields([
                                    { name: player1.username, value: player1Choice, inline: true },
                                    { name: player2.username, value: player2Choice, inline: true },
                                    { name: 'Result', value: `${player1.username} wins! 🎉`, inline: true }
                                ])
                                .setFooter({ text: `🏆 Winner: ${player1.username}` })
                                .setTimestamp();
                        } else {
                            resultEmbed = new EmbedBuilder()
                                .setColor(0x57F287)
                                .setTitle(`🎮 Rock Paper Scissors Duel`)
                                .addFields([
                                    { name: player1.username, value: player1Choice, inline: true },
                                    { name: player2.username, value: player2Choice, inline: true },
                                    { name: 'Result', value: `${player2.username} wins! 🎉`, inline: true }
                                ])
                                .setFooter({ text: `🏆 Winner: ${player2.username}` })
                                .setTimestamp();
                        }
                        
                        const channel = await interaction.client.channels.fetch(session.channelId);
                        const msg = await channel.messages.fetch(session.messageId);
                        await msg.edit({ embeds: [resultEmbed], components: [] });
                        
                        gameSessions.delete(sessionId);
                    }
                    return;
                }
            }
        }
    }
    
    // ========== PP DUEL BUTTONS ==========
    if (customId.startsWith('pp_')) {
        if (customId.startsWith('pp_accept_')) {
            const challengerId = customId.split('_')[2];
            
            for (const [sessionId, session] of gameSessions) {
                if (session.type === 'ppduel' && session.challenger === challengerId && session.opponent === interaction.user.id) {
                    // Generate random PP sizes
                    const challengerSize = Math.floor(Math.random() * 21);
                    const opponentSize = Math.floor(Math.random() * 21);
                    
                    const challenger = await interaction.client.users.fetch(session.challenger);
                    const opponent = interaction.user;
                    
                    const winner = challengerSize > opponentSize ? challenger : opponentSize > challengerSize ? opponent : null;
                    
                    const embed = new EmbedBuilder()
                        .setColor(winner ? 0x57F287 : 0xFEE75C)
                        .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
                        .setTitle(`🍆 PP DUEL RESULTS! 🍆`)
                        .setDescription(`${challenger} vs ${opponent}`)
                        .addFields([
                            { name: `${challenger.username}'s PP`, value: `${challengerSize}cm\n\`${'='.repeat(Math.min(challengerSize, 20))}>\``, inline: true },
                            { name: `${opponent.username}'s PP`, value: `${opponentSize}cm\n\`${'='.repeat(Math.min(opponentSize, 20))}>\``, inline: true }
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
            }
            
            return interaction.reply({ content: '❌ Duel expired! Start a new one with `!ppduel @user`.', ephemeral: true });
        }
        
        if (customId === 'pp_decline') {
            for (const [sessionId, session] of gameSessions) {
                if (session.type === 'ppduel' && session.opponent === interaction.user.id) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`❌ ${interaction.user} declined the PP Duel!`)
                        .setTimestamp();
                    
                    const channel = await interaction.client.channels.fetch(session.channelId);
                    const msg = await channel.messages.fetch(session.messageId);
                    await msg.edit({ embeds: [embed], components: [] });
                    
                    await interaction.reply({ content: 'You declined the duel.', ephemeral: true });
                    gameSessions.delete(sessionId);
                    return;
                }
            }
        }
    }
}

module.exports = {
    playRPS,
    playPPDuel,
    MemoryGame,
    handleGameButtons
};
