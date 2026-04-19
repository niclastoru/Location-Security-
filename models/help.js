const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    category: 'Utility',
    description: 'Zeigt alle Befehle / Shows all commands',
    
    async execute(message, args, { client }) {
        const lang = client.languages?.get(message.guild?.id) || 'de';
        
        // ⭐ Übersetzungen
        const texts = {
            de: {
                help_menu: '📚 Hilfe-Menü',
                commands_available: (count) => `**${count} Befehle** verfügbar!`,
                select_category: 'Wähle eine Kategorie aus dem Dropdown-Menü!',
                requested_by: (user) => `Angefordert von ${user}`,
                commands_in_category: (count) => `${count} Befehle in dieser Kategorie`,
                no_description: 'Keine Beschreibung',
                no_commands: 'Keine Befehle gefunden',
                only_requester: '❌ Nur der Befehls-Ausführer kann das Menü nutzen!',
                placeholder: '📋 Wähle eine Kategorie',
                category_names: {
                    'Moderation': '🛡️ Moderation',
                    'Utility': '🔧 Utility',
                    'Fun': '🎮 Fun',
                    'Music': '🎵 Musik',
                    'Economy': '💰 Economy',
                    'Leveling': '📊 Leveling',
                    'Admin': '⚙️ Admin',
                    'Server': '🌐 Server',
                    'Team': '👥 Team',
                    'Stats': '📈 Statistiken',
                    'Giveaway': '🎁 Giveaway',
                    'Voicemaster': '🎤 VoiceMaster',
                    'Logs': '📋 Logs',
                    'Booster': '🚀 Booster',
                    'Games': '🎲 Spiele',
                    'Miscellaneous': '📦 Sonstiges',
                    'Settings': '⚙️ Einstellungen'
                }
            },
            en: {
                help_menu: '📚 Help Menu',
                commands_available: (count) => `**${count} commands** available!`,
                select_category: 'Select a category from the dropdown menu!',
                requested_by: (user) => `Requested by ${user}`,
                commands_in_category: (count) => `${count} commands in this category`,
                no_description: 'No description',
                no_commands: 'No commands found',
                only_requester: '❌ Only the command requester can use this menu!',
                placeholder: '📋 Select a category',
                category_names: {
                    'Moderation': '🛡️ Moderation',
                    'Utility': '🔧 Utility',
                    'Fun': '🎮 Fun',
                    'Music': '🎵 Music',
                    'Economy': '💰 Economy',
                    'Leveling': '📊 Leveling',
                    'Admin': '⚙️ Admin',
                    'Server': '🌐 Server',
                    'Team': '👥 Team',
                    'Stats': '📈 Statistics',
                    'Giveaway': '🎁 Giveaway',
                    'Voicemaster': '🎤 VoiceMaster',
                    'Logs': '📋 Logs',
                    'Booster': '🚀 Booster',
                    'Games': '🎲 Games',
                    'Miscellaneous': '📦 Miscellaneous',
                    'Settings': '⚙️ Settings'
                }
            }
        };
        
        const t = texts[lang];
        
        // Kategorien für Dropdown erstellen
        const options = [];
        const categories = Array.from(client.categories.keys()).sort();
        
        const categoryColors = {
            'Moderation': 0xFF0000,
            'Utility': 0x00FF00,
            'Fun': 0xFFA500,
            'Music': 0x1DB954,
            'Economy': 0xF1C40F,
            'Leveling': 0x9B59B6,
            'Admin': 0xE74C3C,
            'Server': 0x3498DB,
            'Team': 0x2ECC71,
            'Stats': 0x2F3136,
            'Giveaway': 0x9B59B6,
            'Voicemaster': 0x5865F2,
            'Logs': 0x95A5A6,
            'Booster': 0xFF73FA,
            'Games': 0xE67E22,
            'Miscellaneous': 0x607D8B,
            'Settings': 0x808080
        };
        
        const categoryEmojis = {
            'Moderation': '🛡️',
            'Utility': '🔧',
            'Fun': '🎮',
            'Music': '🎵',
            'Economy': '💰',
            'Leveling': '📊',
            'Admin': '⚙️',
            'Server': '🌐',
            'Team': '👥',
            'Stats': '📈',
            'Giveaway': '🎁',
            'Voicemaster': '🎤',
            'Logs': '📋',
            'Booster': '🚀',
            'Games': '🎲',
            'Miscellaneous': '📦',
            'Settings': '⚙️'
        };
        
        for (const cat of categories) {
            const cmdCount = client.categories.get(cat)?.length || 0;
            const displayName = t.category_names[cat] || cat;
            
            options.push({
                label: displayName.replace(/^[^\s]+\s/, ''), // Emoji entfernen für Label
                description: `${cmdCount} ${lang === 'de' ? 'Befehle' : 'commands'}`,
                value: cat.toLowerCase(),
                emoji: categoryEmojis[cat] || '📁'
            });
        }
        
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_menu')
                    .setPlaceholder(t.placeholder)
                    .addOptions(options)
            );
        
        const helpEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(t.help_menu)
            .setDescription(`${t.commands_available(client.commands.size)}\n${t.select_category}`)
            .setFooter({ text: t.requested_by(message.author.tag), iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
        
        const reply = await message.reply({ embeds: [helpEmbed], components: [row] });
        
        const collector = reply.createMessageComponentCollector({ componentType: 3, time: 60000 });
        
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ 
                    content: t.only_requester, 
                    ephemeral: true 
                });
            }
            
            const selectedCategory = interaction.values[0];
            const categoryName = categories.find(c => c.toLowerCase() === selectedCategory);
            const commands = client.categories.get(categoryName) || [];
            
            const displayName = t.category_names[categoryName] || `${categoryEmojis[categoryName] || '📁'} ${categoryName}`;
            
            const categoryEmbed = new EmbedBuilder()
                .setColor(categoryColors[categoryName] || 0x5865F2)
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setTitle(displayName)
                .setFooter({ text: t.commands_in_category(commands.length), iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            
            let description = '';
            for (const cmd of commands) {
                const cmdName = cmd.name || cmd;
                const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
                const desc = cmd.description || t.no_description;
                description += `**!${cmdName}**${aliases}\n${desc}\n\n`;
            }
            
            categoryEmbed.setDescription(description || t.no_commands);
            
            await interaction.update({ embeds: [categoryEmbed], components: [row] });
        });
        
        collector.on('end', () => {
            row.components[0].setDisabled(true);
            reply.edit({ components: [row] }).catch(() => {});
        });
    }
};
