module.exports = {
    category: 'Server',
    subCommands: {
        
        // ========== LANGUAGE ==========
        language: {
            aliases: ['lang', 'sprache', 'setlanguage'],
            permissions: 'Administrator',
            description: 'Ändert die Bot-Sprache / Changes bot language',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const newLang = args[0]?.toLowerCase();
                const currentLang = client.languages.get(message.guild.id) || 'de';
                
                // Zeige aktuelle Sprache wenn kein Argument
                if (!newLang) {
                    const langName = currentLang === 'de' ? 'Deutsch 🇩🇪' : 'English 🇬🇧';
                    const available = currentLang === 'de' ? '`de`, `en`' : '`de`, `en`';
                    
                    return message.reply({ 
                        embeds: [{
                            color: 0x0099FF,
                            title: currentLang === 'de' ? '🌍 Aktuelle Sprache' : '🌍 Current Language',
                            description: currentLang === 'de' 
                                ? `Aktuelle Sprache: **${langName}**\n\nVerfügbare Sprachen: ${available}\n\nÄndern mit: \`!language de\` oder \`!language en\``
                                : `Current language: **${langName}**\n\nAvailable languages: ${available}\n\nChange with: \`!language de\` or \`!language en\``,
                            timestamp: new Date().toISOString()
                        }] 
                    });
                }
                
                // Prüfe ob Sprache gültig ist
                if (!['de', 'en'].includes(newLang)) {
                    return message.reply({ 
                        embeds: [{
                            color: 0xFF0000,
                            title: currentLang === 'de' ? '❌ Ungültige Sprache' : '❌ Invalid Language',
                            description: currentLang === 'de' 
                                ? 'Verfügbare Sprachen: `de`, `en`'
                                : 'Available languages: `de`, `en`',
                            timestamp: new Date().toISOString()
                        }] 
                    });
                }
                
                // In Supabase speichern
                await supabase.from('server_languages').upsert({
                    guild_id: message.guild.id,
                    language: newLang
                });
                
                // Cache updaten
                client.languages.set(message.guild.id, newLang);
                
                // Erfolgsmeldung
                const successTitle = newLang === 'de' ? '✅ Sprache geändert' : '✅ Language Changed';
                const successMsg = newLang === 'de' 
                    ? 'Bot-Sprache wurde auf **Deutsch** 🇩🇪 geändert!\n\nAlle Befehle und Antworten sind jetzt auf Deutsch.'
                    : 'Bot language changed to **English** 🇬🇧!\n\nAll commands and responses are now in English.';
                
                return message.reply({ 
                    embeds: [{
                        color: 0x00FF00,
                        title: successTitle,
                        description: successMsg,
                        timestamp: new Date().toISOString()
                    }] 
                });
            }
        },
        
        // ========== LANGUAGES (Info) ==========
        languages: {
            aliases: ['langs', 'sprachen'],
            description: 'Zeigt verfügbare Sprachen / Shows available languages',
            category: 'Server',
            async execute(message, args, { client }) {
                const currentLang = client.languages.get(message.guild.id) || 'de';
                
                const embed = {
                    color: 0x0099FF,
                    title: '🌍 Verfügbare Sprachen / Available Languages',
                    fields: [
                        {
                            name: '🇩🇪 Deutsch',
                            value: 'Standard-Sprache\n`!language de`',
                            inline: true
                        },
                        {
                            name: '🇬🇧 English',
                            value: 'English language\n`!language en`',
                            inline: true
                        }
                    ],
                    footer: {
                        text: currentLang === 'de' 
                            ? `Aktuelle Sprache: Deutsch 🇩🇪 • Admin-Befehl: !language <de/en>`
                            : `Current language: English 🇬🇧 • Admin command: !language <de/en>`
                    },
                    timestamp: new Date().toISOString()
                };
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
