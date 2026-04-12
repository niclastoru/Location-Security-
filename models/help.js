const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    category: 'Utility',
    description: 'Zeigt alle Befehle',
    
    async execute(message, args, { client }) {
        
        // Kategorien für Dropdown erstellen
        const options = [];
        const categories = Array.from(client.categories.keys());
        
        const categoryEmojis = {
            'Moderation': '🛡️',
            'Utility': '🔧',
            'Fun': '🎮',
            'Economy': '💰',
            'Admin': '⚙️'
        };
        
        for (const cat of categories) {
            options.push({
                label: cat,
                description: `${client.categories.get(cat).length} Befehle`,
                value: cat.toLowerCase(),
                emoji: categoryEmojis[cat] || '📁'
            });
        }
        
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_menu')
                    .setPlaceholder('📋 Wähle eine Kategorie')
                    .addOptions(options)
            );
        
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Hilfe-Menü')
            .setDescription(`**${client.commands.size} Befehle** verfügbar!\nWähle eine Kategorie aus dem Dropdown-Menü!`)
            .setFooter({ text: `Angefordert von ${message.author.tag}` })
            .setTimestamp();
        
        const reply = await message.reply({ embeds: [helpEmbed], components: [row] });
        
        const collector = reply.createMessageComponentCollector({ componentType: 3, time: 60000 });
        
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ 
                    content: '❌ Nur der Befehls-Ausführer kann das Menü nutzen!', 
                    ephemeral: true 
                });
            }
            
            const selectedCategory = interaction.values[0];
            const categoryName = categories.find(c => c.toLowerCase() === selectedCategory);
            const commands = client.categories.get(categoryName);
            
            const categoryEmbed = new EmbedBuilder()
                .setColor(categoryName === 'Moderation' ? 0xFF0000 : 
                         categoryName === 'Utility' ? 0x00FF00 : 
                         categoryName === 'Fun' ? 0xFFA500 : 0x0099FF)
                .setTitle(`${categoryEmojis[categoryName] || '📁'} ${categoryName}`)
                .setFooter({ text: `${commands.length} Befehle in dieser Kategorie` });
            
            let description = '';
            for (const cmd of commands) {
                const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
                description += `**!${cmd.name}**${aliases}\n${cmd.description || 'Keine Beschreibung'}\n\n`;
            }
            
            categoryEmbed.setDescription(description || 'Keine Befehle gefunden');
            
            await interaction.update({ embeds: [categoryEmbed], components: [row] });
        });
        
        collector.on('end', () => {
            row.components[0].setDisabled(true);
            reply.edit({ components: [row] }).catch(() => {});
        });
    }
};
