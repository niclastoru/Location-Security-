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
    description: 'Shows all available commands with interactive menu and search',

    async execute(message, args, { client }) {
        const categories = Array.from(client.categories.keys()).sort();

        const categoryEmojis = {
            'Moderation': '🛡️', 'Utility': '🔧', 'Fun': '🎮', 'Music': '🎵',
            'Economy': '💰', 'Leveling': '📊', 'Admin': '⚙️', 'Server': '🌐',
            'Team': '👥', 'Stats': '📈', 'Giveaway': '🎁', 'Voicemaster': '🎤',
            'Logs': '📋', 'Booster': '🚀', 'Games': '🎲', 'Miscellaneous': '📦',
            'Settings': '⚙️'
        };

        const categoryColors = {
            'Moderation': 0xFF4D4D, 'Utility': 0x00D4FF, 'Fun': 0xFF9E00,
            'Music': 0x1ED760, 'Economy': 0xF1C40F, 'Leveling': 0x9B59B6,
            'Admin': 0xE74C3C, 'Server': 0x3498DB, 'Team': 0x2ECC71,
            'Stats': 0x7289DA, 'Giveaway': 0xFF73FA, 'Voicemaster': 0x5865F2,
            'Logs': 0x95A5A6, 'Booster': 0xFF00FF, 'Games': 0xE67E22,
            'Miscellaneous': 0x607D8B, 'Settings': 0x2F3136
        };

        const options = categories.map(cat => ({
            label: cat,
            description: `${client.categories.get(cat)?.length || 0} commands`,
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
            .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
            .setTitle('📚 Command Menu')
            .setDescription(`**${client.commands.size} commands** available!\nUse the menu or search for a specific command.`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        const reply = await message.reply({ embeds: [mainEmbed], components: [row1, row2] });

        const collector = reply.createMessageComponentCollector({ time: 180000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: '❌ Only the command user can interact.', ephemeral: true });
            }

            // === Category ===
            if (interaction.customId === 'help_menu') {
                // ... (bleibt gleich wie vorher)
                const selected = interaction.values[0];
                const categoryName = categories.find(c => c.toLowerCase() === selected);
                const commands = client.categories.get(categoryName) || [];

                const catEmbed = new EmbedBuilder()
                    .setColor(categoryColors[categoryName] || 0x5865F2)
                    .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`${categoryEmojis[categoryName] || '📁'} ${categoryName}`)
                    .setDescription(`**${commands.length} commands** in this category`)
                    .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();

                let desc = '';
                for (const cmd of commands) {
                    const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
                    desc += `**${cmd.name}**${aliases}\n${cmd.description || 'No description.'}\n\n`;
                }
                if (desc) catEmbed.setDescription(desc);

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

            // === Search Button ===
            if (interaction.customId === 'search_commands') {
                const modal = new ModalBuilder()
                    .setCustomId(`search_modal_${message.author.id}`)
                    .setTitle('🔍 Search Commands');

                const input = new TextInputBuilder()
                    .setCustomId('search_term')
                    .setLabel('Search term')
                    .setPlaceholder('ban, level, play, warn...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
                await interaction.showModal(modal);
            }

            // === Back ===
            if (interaction.customId === 'back_to_main') {
                await interaction.update({ embeds: [mainEmbed], components: [row1, row2] });
            }
        });

        // === Modal Handler (besser & stabiler) ===
        const modalFilter = i => 
            i.isModalSubmit() && 
            i.customId === `search_modal_${message.author.id}` &&
            i.user.id === message.author.id;

        const modalCollector = reply.createMessageComponentCollector({ 
            filter: modalFilter, 
            time: 180000 
        });

        modalCollector.on('collect', async (interaction) => {
            const searchTerm = interaction.fields.getTextInputValue('search_term').toLowerCase().trim();

            const allCommands = Array.from(client.commands.values());
            const results = allCommands.filter(cmd => 
                cmd.name.toLowerCase().includes(searchTerm) ||
                (cmd.aliases && cmd.aliases.some(a => a.toLowerCase().includes(searchTerm))) ||
                (cmd.description && cmd.description.toLowerCase().includes(searchTerm)) ||
                (cmd.category && cmd.category.toLowerCase().includes(searchTerm))
            );

            const searchEmbed = new EmbedBuilder()
                .setColor(0x00FFAA)
                .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL() })
                .setTitle(`🔍 Results for "${searchTerm}"`)
                .setTimestamp();

            if (results.length === 0) {
                searchEmbed.setDescription('No commands found.');
            } else {
                let desc = '';
                results.slice(0, 15).forEach(cmd => {
                    const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
                    desc += `**${cmd.name}**${aliases}\n${cmd.description || 'No description.'}\n\n`;
                });
                searchEmbed.setDescription(desc);
                if (results.length > 15) searchEmbed.setFooter({ text: `Showing 15 of ${results.length} results` });
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

        // Cleanup
        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    }
};
