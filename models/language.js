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
                    
                    return message.reply({ 
                        embeds: [{
                            color: 0x0099FF,
                            title: currentLang === 'de' ? '🌍 Aktuelle Sprache' : '🌍 Current Language',
                            description: currentLang === 'de' 
                                ? `Aktuelle Sprache: **${langName}**\n\nÄndern mit: \`!language en\``
                                : `Current language: **${langName}**\n\nChange with: \`!language de\``,
                            timestamp: new Date().toISOString()
                        }] 
                    });
                }
                
                // Prüfe ob Sprache gültig ist
                if (!['de', 'en'].includes(newLang)) {
                    return message.reply({ 
                        embeds: [{
                            color: 0xFF0000,
                            title: '❌ Ungültige Sprache / Invalid Language',
                            description: 'Verfügbar / Available: `de`, `en`',
                            timestamp: new Date().toISOString()
                        }] 
                    });
                }
                
                // ⭐ DEBUG: Prüfe Supabase Verbindung
                console.log(`🔍 Versuche Sprache zu speichern: Guild=${message.guild.id}, Lang=${newLang}`);
                
                // ⭐ In Supabase speichern - MIT ERROR HANDLING!
                const { data, error } = await supabase
                    .from('server_languages')
                    .upsert({
                        guild_id: message.guild.id,
                        language: newLang
                    })
                    .select();
                
                if (error) {
                    console.error('❌ Supabase Fehler:', error);
                    
                    // ⭐ FALLBACK: Trotzdem Cache setzen!
                    client.languages.set(message.guild.id, newLang);
                    
                    return message.reply({ 
                        embeds: [{
                            color: 0xFFA500,
                            title: '⚠️ Teilweise gespeichert',
                            description: `Sprache wurde auf **${newLang === 'de' ? 'Deutsch' : 'English'}** gesetzt, aber nicht in der Datenbank gespeichert!\n\nFehler: ${error.message}`,
                            timestamp: new Date().toISOString()
                        }] 
                    });
                }
                
                // ⭐ Erfolg: Cache updaten
                client.languages.set(message.guild.id, newLang);
                console.log(`✅ Sprache gespeichert: ${newLang}, Data:`, data);
                
                // Erfolgsmeldung
                const successTitle = newLang === 'de' ? '✅ Sprache geändert' : '✅ Language Changed';
                const successMsg = newLang === 'de' 
                    ? 'Bot-Sprache wurde auf **Deutsch** 🇩🇪 geändert!'
                    : 'Bot language changed to **English** 🇬🇧!';
                
                return message.reply({ 
                    embeds: [{
                        color: 0x00FF00,
                        title: successTitle,
                        description: successMsg,
                        timestamp: new Date().toISOString()
                    }] 
                });
            }
        }
    }
};
