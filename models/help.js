const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

module.exports = {
    name: 'help',
    category: 'Utility',
    description: 'Shows all available commands with search',

    async execute(message, args, { client }) {
        // Sammle alle Commands manuell aus client.commands
        const categories = new Map();
        
        for (const [cmdName, cmdData] of client.commands) {
            // Prüfe ob es ein gültiger Command ist
            if (cmdData && typeof cmdData === 'object' && cmdData.description) {
                const category = cmdData.category || 'Uncategorized';
                
                if (!categories.has(category)) {
                    categories.set(category, []);
                }
                
                categories.get(category).push({
                    name: cmdName,
                    aliases: cmdData.aliases || [],
                    description: cmdData.description || 'No description'
                });
            }
        }
        
        if (categories.size === 0) {
            return message.reply('❌ No commands found! Please check the bot setup.');
        }
        
        const sortedCategories = Array.from(categories.keys()).sort();
        
        // Emojis für Kategorien
        const categoryEmojis = {
            'Moderation': '🛡️', 'Utility': '🔧', 'Fun': '🎮', 'Music': '🎵',
            'Admin': '⚙️', 'Server': '🌐', 'Team': '👥', 'Stats': '📈',
            'Voicemaster': '🎤', 'Logs': '📋', 'Games': '🎲', 'Miscellaneous': '📦',
            'Settings': '⚙️', 'Tickets': '🎫', 'Developer': '🔧', 'Counting': '🔢',
            'Uncategorized': '📁'
        };
        
        const categoryColors = {
            'Moderation': 0xFF4D4D, 'Utility': 0x00D4FF, 'Fun': 0xFF9E00,
            'Music': 0x1ED760, 'Admin': 0xE74C3C, 'Server': 0x3498DB,
            'Team': 0x2ECC71, 'Stats': 0x7289DA, 'Voicemaster': 0x5865F2,
            'Logs': 0x95A5A6, 'Games': 0xE67E22, 'Miscellaneous': 0x607D8B,
            'Settings': 0x2F3136, 'Tickets': 0x57F287, 'Developer': 0xED4245,
            'Counting': 0x00FFAA, 'Uncategorized': 0x5865F2
        };
        
        // Dropdown Optionen (max 25)
        const options = sortedCategories.slice(0, 25).map(cat => ({
            label: cat,
            description: `${categories.get(cat).length} commands`,
            value: cat,
            emoji: categoryEmojis[cat] || '📁'
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('📋 Select a category')
            .addOptions(options);
        
        const searchButton = new ButtonBuilder()
            .setCustomId('help_search')
            .setLabel('Search Commands')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔍');
        
        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        const row2 = new ActionRowBuilder().addComponents(searchButton);
        
        const mainEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL() })
            .setTitle('📚 Command Menu')
            .setDescription(`**${client.commands.size} commands** available!\nSelect a category from the menu or search for a command.`)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();
        
        const reply = await message.reply({ embeds: [mainEmbed], components: [row1, row2] });
        
        // Collector für Buttons und Menüs
        const collector = reply.createMessageComponentCollector({ time: 180000 });
        
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: '❌ Only you can use this menu.', ephemeral: true });
            }
            
            // KATEGORIE AUSWAHL
            if (interaction.customId === 'help_menu') {
                const categoryName = interaction.values[0];
                const commands = categories.get(categoryName) || [];
                const emoji = categoryEmojis[categoryName] || '📁';
                const color = categoryColors[categoryName] || 0x5865F2;
                
                let description = '';
                for (const cmd of commands) {
                    const aliases = cmd.aliases.length ? ` (${cmd.aliases.slice(0, 3).join(', ')})` : '';
                    description += `**${cmd.name}**${aliases}\n${cmd.description}\n\n`;
                }
                
                if (description.length > 4000) {
                    description = description.substring(0, 3900) + '\n... and more';
                }
                
                const catEmbed = new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`${emoji} ${categoryName}`)
                    .setDescription(description || '*No commands in this category.*')
                    .setFooter({ text: `${commands.length} commands • Use !help <command> for details` })
                    .setTimestamp();
                
                const backBtn = new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠');
                
                await interaction.update({
                    embeds: [catEmbed],
                    components: [new ActionRowBuilder().addComponents(backBtn)]
                });
            }
            
            // ZURÜCK ZUM MENÜ
            if (interaction.customId === 'help_back') {
                await interaction.update({ embeds: [mainEmbed], components: [row1, row2] });
            }
            
            // SUCHEN BUTTON
            if (interaction.customId === 'help_search') {
                const modal = new ModalBuilder()
                    .setCustomId('help_search_modal')
                    .setTitle('🔍 Search Commands');
                
                const input = new TextInputBuilder()
                    .setCustomId('search_term')
                    .setLabel('Search term')
                    .setPlaceholder('ban, play, warn, level...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal);
            }
        });
        
        // MODAL HANDLER (außerhalb des Collectors)
        const modalHandler = async (interaction) => {
            if (!interaction.isModalSubmit()) return;
            if (interaction.customId !== 'help_search_modal') return;
            if (interaction.user.id !== message.author.id) return;
            
            const searchTerm = interaction.fields.getTextInputValue('search_term').toLowerCase();
            
            const results = [];
            for (const [cmdName, cmdData] of client.commands) {
                if (cmdData && typeof cmdData === 'object' && cmdData.description) {
                    if (cmdName.toLowerCase().includes(searchTerm) ||
                        (cmdData.aliases && cmdData.aliases.some(a => a.toLowerCase().includes(searchTerm))) ||
                        (cmdData.description && cmdData.description.toLowerCase().includes(searchTerm))) {
                        results.push({
                            name: cmdName,
                            aliases: cmdData.aliases || [],
                            description: cmdData.description
                        });
                    }
                }
            }
            
            const searchEmbed = new EmbedBuilder()
                .setColor(0x00FFAA)
                .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL() })
                .setTitle(`🔍 Results for "${searchTerm}"`)
                .setTimestamp();
            
            if (results.length === 0) {
                searchEmbed.setDescription('❌ No commands found. Try a different search term.');
            } else {
                let desc = '';
                const showCount = Math.min(results.length, 15);
                for (let i = 0; i < showCount; i++) {
                    const cmd = results[i];
                    const aliases = cmd.aliases.length ? ` (${cmd.aliases.slice(0, 3).join(', ')})` : '';
                    desc += `**${cmd.name}**${aliases}\n${cmd.description}\n\n`;
                }
                searchEmbed.setDescription(desc);
                searchEmbed.setFooter({ text: `${results.length} result${results.length !== 1 ? 's' : ''} found` });
            }
            
            const backBtn = new ButtonBuilder()
                .setCustomId('help_back')
                .setLabel('Back to Menu')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏠');
            
            await interaction.update({
                embeds: [searchEmbed],
                components: [new ActionRowBuilder().addComponents(backBtn)]
            });
        };
        
        // Event Listener für Modals (einmalig)
        client.once('interactionCreate', modalHandler);
        
        collector.on('end', () => {
            client.off('interactionCreate', modalHandler);
            reply.edit({ components: [] }).catch(() => {});
        });
    }
};
