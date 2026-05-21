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
        // 🔧 FIX: Baue die Kategorien dynamisch aus client.commands auf
        const categories = new Map();
        
        for (const [name, cmd] of client.commands) {
            // Nur Subcommands berücksichtigen (nicht die Haupt-Command-Objekte)
            if (cmd.category && !cmd.subCommands) {
                if (!categories.has(cmd.category)) {
                    categories.set(cmd.category, []);
                }
                categories.get(cmd.category).push({
                    name: name,
                    aliases: cmd.aliases || [],
                    description: cmd.description || 'No description',
                    category: cmd.category
                });
            }
        }
        
        // Nach Kategorien sortieren
        const sortedCategories = Array.from(categories.keys()).sort();
        
        // Kategorie Emojis
        const categoryEmojis = {
            'Moderation': '🛡️', 'Utility': '🔧', 'Fun': '🎮', 'Music': '🎵',
            'Economy': '💰', 'Leveling': '📊', 'Admin': '⚙️', 'Server': '🌐',
            'Team': '👥', 'Stats': '📈', 'Giveaway': '🎁', 'Voicemaster': '🎤',
            'Logs': '📋', 'Booster': '🚀', 'Games': '🎲', 'Miscellaneous': '📦',
            'Settings': '⚙️', 'Tickets': '🎫', 'Developer': '🔧', 'Counting': '🔢'
        };
        
        const categoryColors = {
            'Moderation': 0xFF4D4D, 'Utility': 0x00D4FF, 'Fun': 0xFF9E00,
            'Music': 0x1ED760, 'Economy': 0xF1C40F, 'Leveling': 0x9B59B6,
            'Admin': 0xE74C3C, 'Server': 0x3498DB, 'Team': 0x2ECC71,
            'Stats': 0x7289DA, 'Giveaway': 0xFF73FA, 'Voicemaster': 0x5865F2,
            'Logs': 0x95A5A6, 'Booster': 0xFF00FF, 'Games': 0xE67E22,
            'Miscellaneous': 0x607D8B, 'Settings': 0x2F3136, 'Tickets': 0x57F287,
            'Developer': 0xED4245, 'Counting': 0x00FFAA
        };
        
        // Dropdown Optionen erstellen
        const options = sortedCategories.map(cat => ({
            label: cat,
            description: `${categories.get(cat)?.length || 0} commands`,
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
        
        // Hauptmenü Embed
        const mainEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: `${client.user.username} • Help Center`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
            .setTitle('📚 Command Menu')
            .setDescription(`**${client.commands.size} commands** available!\nUse the menu or search for a specific command.`)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
        
        const reply = await message.reply({ embeds: [mainEmbed], components: [row1, row2] });
        
        // Haupt-Collector für Buttons und Select Menus
        const collector = reply.createMessageComponentCollector({ time: 180000 });
        
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: '❌ Only the command user can interact.', ephemeral: true });
            }
            
            // === KATEGORIE AUSWAHL ===
            if (interaction.customId === 'help_menu') {
                const selected = interaction.values[0];
                const categoryName = sortedCategories.find(c => c.toLowerCase() === selected);
                const commands = categories.get(categoryName) || [];
                
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
            
            // === SUCHBUTTON ===
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
            
            // === ZURÜCK ZUM HAUPTMENÜ ===
            if (interaction.customId === 'back_to_main') {
                await interaction.update({ embeds: [mainEmbed], components: [row1, row2] });
            }
        });
        
        // === MODAL HANDLER (für Suche) ===
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
            
            // 🔧 FIX: Aus client.commands suchen
            const results = [];
            
            for (const [name, cmd] of client.commands) {
                // Nur Subcommands und echte Commands
                if (cmd.category && !cmd.subCommands) {
                    const matchesName = name.toLowerCase().includes(searchTerm);
                    const matchesAliases = cmd.aliases?.some(a => a.toLowerCase().includes(searchTerm));
                    const matchesDesc = cmd.description?.toLowerCase().includes(searchTerm);
                    const matchesCategory = cmd.category?.toLowerCase().includes(searchTerm);
                    
                    if (matchesName || matchesAliases || matchesDesc || matchesCategory) {
                        results.push({
                            name: name,
                            aliases: cmd.aliases || [],
                            description: cmd.description || 'No description',
                            category: cmd.category
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
                    const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : '';
                    desc += `**${cmd.name}**${aliases}\n${cmd.description}\n\n`;
                }
                searchEmbed.setDescription(desc);
                if (results.length > 15) {
                    searchEmbed.setFooter({ text: `Showing 15 of ${results.length} results` });
                } else {
                    searchEmbed.setFooter({ text: `${results.length} results found` });
                }
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
        
        // Aufräumen nach Ablauf
        collector.on('end', () => {
            reply.edit({ components: [] }).catch(() => {});
        });
    }
};
