const { EmbedBuilder } = require('discord.js');
const { playRPS, playPPDuel, MemoryGame, handleGameButtons } = require('./games');

module.exports = {
    category: 'Games',
    subCommands: {
        
        // ========== MEMORY GAME ==========
        memory: {
            aliases: ['mem', 'cardgame'],
            description: 'Play Memory card game',
            category: 'Games',
            async execute(message, args, { client }) {
                const game = new MemoryGame(message.channel, message.author);
                
                // Create 4x4 board buttons
                const rows = [];
                for (let i = 0; i < 4; i++) {
                    const row = new ActionRowBuilder();
                    for (let j = 0; j < 4; j++) {
                        row.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`memory_card_${i}_${j}`)
                                .setLabel('?')
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji('🎴')
                        );
                    }
                    rows.push(row);
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`🎴 Memory Game`)
                    .setDescription(`**${message.author.username}'s turn**\n\n${game.getBoardString()}\n\nScore: 0`)
                    .setFooter({ text: "Match pairs to win!" })
                    .setTimestamp();
                
                const msg = await message.reply({ embeds: [embed], components: rows });
                
                const sessionId = `memory_single_${Date.now()}`;
                const { gameSessions } = require('./games');
                gameSessions.set(sessionId, {
                    type: 'memory_single',
                    game: game,
                    userId: message.author.id,
                    messageId: msg.id,
                    channelId: message.channel.id
                });
            }
        },
        
        // ========== RPS ==========
        rps: {
            aliases: ['rockpaperscissors'],
            description: 'Play Rock Paper Scissors',
            category: 'Games',
            async execute(message, args, { client }) {
                await playRPS(message, args, client);
            }
        },
        
        // ========== PP DUEL ==========
        ppduel: {
            aliases: ['pp', 'duel'],
            description: 'Challenge someone to a PP duel',
            category: 'Games',
            async execute(message, args, { client }) {
                await playPPDuel(message, args, client);
            }
        }
    }
};
