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
        // Baue Kategorien aus client.commands auf
        const categories = new Map();
        
        for (const [name, cmd] of client.commands) {
            // Filtere nur echte Commands (nicht die Haupt-Objekte)
            if (cmd.category && typeof cmd === 'object' && !cmd.subCommands && name !== 'help') {
                if (!categories.has(cmd.category)) {
                    categories.set(cmd.category, []);
                }
                categories.get(cmd.category).push({
                    name: name,
                    aliases: cmd.aliases || [],
                    description: cmd.description || 'No description'
                });
            }
        }
        
        const sortedCategories = Array.from(categories.keys()).sort();
        
        const categoryEmojis = {
            'Moderation': '🛡️', 'Utility': '🔧', 'Fun': '🎮', 'Music': '🎵',
            'Admin': '⚙️', 'Server': '🌐', 'Team': '👥', 'Stats': '📈',
            'Voicemaster': '🎤', 'Logs': '📋', 'Games': '🎲', 'Miscellaneous': '📦',
            'Settings': '⚙️', 'Tickets': '🎫', 'Developer': '🔧', 'Counting': '🔢'
        };
        
        const categoryColors = {
            'Moderation': 0xFF4D4D, 'Utility': 0x00D4FF, 'Fun': 0xFF9E00,
            'Music': 0x1ED760, 'Admin': 0xE74C3C, 'Server': 0x3498DB,
            'Team': 0x2ECC71, 'Stats': 0x7289DA, 'Voicemaster': 0x5865F2,
            'Logs': 0x95A5A6, 'Games': 0xE67E22, 'Miscellaneous': 0x607D8B,
            'Settings': 0x2F3136, 'Tickets': 0x57F287, 'Developer': 0xED4245,
            'Counting': 0x00FFAA
        };
        
        // Dropdown Optionen
        const options = sortedCategories.map(cat => ({
            label: cat,
            description: `${categories.get(cat).length} commands`,
            value: cat.toLowerCase(),
            emoji: categoryEmojis[cat] || '📁'
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('📋 Select a category')
            .addOptions(options);
        
        const searchButton = new ButtonBuilder()
            .setCustomId('search_commands')
            .setLabel('Search Commands')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔍');
        
        const row1 = new ActionRowBuilder().addComponents(selectMenu);
        const row2 = new ActionRowBuilder().addComponents(searchButton);
        
        const mainEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL() })
            .setTitle('📚 Command Menu')
            .setDescription(`**${client.commands.size} commands** available!\nUse the menu or search for a command.`)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();
        
        const reply = await message.reply({ embeds: [mainEmbed], components: [row1, row2] });
        
        // Collector für Interaktionen
        const collector = reply.createMessageComponentCollector({ time: 180000 });
        
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: '❌ Only you can use this menu.', ephemeral: true });
            }
            
            // KATEGORIE AUSWAHL
            if (interaction.customId === 'help_menu') {
                const selected = interaction.values[0];
                const categoryName = sortedCategories.find(c => c.toLowerCase() === selected);
                const commands = categories.get(categoryName);
                
                const color = categoryColors[categoryName] || 0x5865F2;
                const emoji = categoryEmojis[categoryName] || '📁';
                
                let description = '';
                for (const cmd of commands) {
                    const aliases = cmd.aliases.length ? ` (${cmd.aliases.join(', ')})` : '';
                    description += `**${cmd.name}**${aliases}\n${cmd.description}\n\n`;
                }
                
                const catEmbed = new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`${emoji} ${categoryName}`)
                    .setDescription(description || 'No commands in this category.')
                    .setFooter({ text: `${commands.length} commands` })
                    .setTimestamp();
                
                const backBtn = new ButtonBuilder()
                    .setCustomId('back_to_main')
                    .setLabel('Back to Menu')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏠');
                
                await interaction.update({
                    embeds: [catEmbed],
                    components: [new ActionRowBuilder().addComponents(backBtn)]
                });
            }
            
            // SUCHEN
            if (interaction.customId === 'search_commands') {
                const modal = new ModalBuilder()
                    .setCustomId('search_modal')
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
            
            // ZURÜCK
            if (interaction.customId === 'back_to_main') {
                await interaction.update({ embeds: [mainEmbed], components: [row1, row2] });
            }
        });
        
        // MODAL HANDLER (Suche)
        client.once('interactionCreate', async (interaction) => {
            if (!interaction.isModalSubmit()) return;
            if (interaction.customId !== 'search_modal') return;
            if (interaction.user.id !== message.author.id) return;
            
            const searchTerm = interaction.fields.getTextInputValue('search_term').toLowerCase();
            
            const results = [];
            for (const [name, cmd] of client.commands) {
                if (cmd.category && typeof cmd === 'object' && !cmd.subCommands && name !== 'help') {
                    if (name.toLowerCase().includes(searchTerm) ||
                        (cmd.aliases && cmd.aliases.some(a => a.toLowerCase().includes(searchTerm))) ||
                        (cmd.description && cmd.description.toLowerCase().includes(searchTerm))) {
                        results.push({
                            name: name,
                            aliases: cmd.aliases || [],
                            description: cmd.description || 'No description'
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
                searchEmbed.setDescription('❌ No commands found.');
            } else {
                let desc = '';
                const showCount = Math.min(results.length, 15);
                for (let i = 0; i < showCount; i++) {
                    const cmd = results[i];
                    const aliases = cmd.aliases.length ? ` (${cmd.aliases.join(', ')})` : '';
                    desc += `**${cmd.name}**${aliases}\n${cmd.description}\n\n`;
                }
                searchEmbed.setDescription(desc);
                searchEmbed.setFooter({ text: `${results.length} results found` });
            }
            
            const backBtn = new ButtonBuilder()
                .setCustomId('back_to_main')
                .setLabel('Back to Menu')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏠');
            
            await interaction.update({
                embeds: [searchEmbed],
                components: [new ActionRowBuilder().addComponents(backBtn)]
            });
        });
        
        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    }
};
