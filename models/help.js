const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    async execute(message, args, { client, embed }) {
        
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_menu')
                    .setPlaceholder('📋 Wähle eine Kategorie')
                    .addOptions([
                        { label: 'Moderation', description: 'Moderations-Befehle', value: 'moderation', emoji: '🛡️' },
                        { label: 'Utility', description: 'Nützliche Befehle', value: 'utility', emoji: '🔧' },
                        { label: 'Fun', description: 'Spaß-Befehle', value: 'fun', emoji: '🎮' }
                    ])
            );
        
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📚 Hilfe-Menü')
            .setDescription('Wähle eine Kategorie aus dem Dropdown-Menü!')
            .setFooter({ text: `Angefordert von ${message.author.tag}` })
            .setTimestamp();
        
        const reply = await message.reply({ embeds: [helpEmbed], components: [row] });
        
        const collector = reply.createMessageComponentCollector({ componentType: 3, time: 60000 });
        
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: '❌ Nur der Befehls-Ausführer kann das Menü nutzen!', ephemeral: true });
            }
            
            let categoryEmbed;
            
            if (interaction.values[0] === 'moderation') {
                categoryEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🛡️ Moderation')
                    .addFields(
                        { name: '!ban @User [Grund]', value: 'Bannt einen User', inline: true },
                        { name: '!kick @User [Grund]', value: 'Kickt einen User', inline: true },
                        { name: '!role add/remove @User <Rolle>', value: 'Verwaltet Rollen', inline: true },
                        { name: '!r add/remove @User <Rolle>', value: 'Alias für !role', inline: true },
                        { name: '!purge <1-100>', value: 'Löscht Nachrichten', inline: true },
                        { name: '!lock / !unlock', value: 'Sperrt/Entsperrt Channel', inline: true }
                    );
            } else if (interaction.values[0] === 'utility') {
                categoryEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🔧 Utility')
                    .addFields(
                        { name: '!ping', value: 'Bot Latenz', inline: true },
                        { name: '!userinfo', value: 'User Info', inline: true },
                        { name: '!serverinfo', value: 'Server Info', inline: true }
                    );
            } else {
                categoryEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('🎮 Fun')
                    .addFields(
                        { name: '!register', value: 'Registrieren', inline: true },
                        { name: '!punkte', value: 'Punktestand', inline: true },
                        { name: '!add <Zahl>', value: 'Punkte hinzufügen', inline: true }
                    );
            }
            
            await interaction.update({ embeds: [categoryEmbed], components: [row] });
        });
        
        collector.on('end', () => {
            row.components[0].setDisabled(true);
            reply.edit({ components: [row] }).catch(() => {});
        });
    }
};
