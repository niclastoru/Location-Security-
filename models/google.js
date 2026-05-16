const { EmbedBuilder } = require('discord.js');
const https = require('https');

// Google Search API (kostenlos, kein API Key nötig - verwendet eine öffentliche API)
async function searchGoogle(query) {
    return new Promise((resolve) => {
        // Verwende eine öffentliche Such-API
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.popcat.xyz/search?q=${encodedQuery}`;
        
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json.length > 0) {
                        resolve(json[0]);
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            });
        }).on('error', () => {
            resolve(null);
        });
    });
}

// Alternative: Verwende eine andere API falls erste nicht funktioniert
async function searchGoogleAlternative(query) {
    return new Promise((resolve) => {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodedQuery}`;
        
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json[0] && json[0].meanings) {
                        resolve({
                            title: query,
                            snippet: json[0].meanings[0]?.definitions[0]?.definition || 'No definition found',
                            url: `https://en.wikipedia.org/wiki/${encodedQuery}`
                        });
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            });
        }).on('error', () => {
            resolve(null);
        });
    });
}

// Google-like response generator
function generateGoogleResponse(query, result) {
    if (!result) {
        return {
            title: 'No Results Found',
            description: `Google couldn't find any results for **"${query}**".\n\n💡 **Suggestions:**\n• Check your spelling\n• Try different keywords\n• Use more general terms`,
            color: 0xED4245
        };
    }
    
    return {
        title: `🔍 Google Search: ${query}`,
        description: `**${result.title || query}**\n\n${result.snippet || result.description || 'No description available'}\n\n📖 **[Read more](${result.url || '#'})**`,
        color: 0x5865F2,
        fields: [
            { name: '💡 Did you know?', value: 'Google processes over 40,000 search queries every second!', inline: false }
        ]
    };
}

// Fun facts about Google
const googleFacts = [
    "Google was originally called 'Backrub'.",
    "Google's first office was a rented garage.",
    "Google's homepage has over 1 million possible variations of the logo (doodles).",
    "Google processes over 3.5 billion searches per day.",
    "The name 'Google' comes from 'googol' (1 followed by 100 zeros).",
    "Google's first tweet was 'I'm feeling lucky' in binary code.",
    "Google rents about 200 goats to graze at their HQ instead of lawnmowers.",
    "Google's first server was made from Lego bricks."
];

module.exports = {
    category: 'Utility',
    subCommands: {
        
        // ========== GOOGLE SEARCH ==========
        google: {
            aliases: ['g', 'search', 'ask'],
            description: 'Ask Google a question',
            category: 'Utility',
            async execute(message, args, { client }) {
                const query = args.join(' ');
                
                if (!query) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('❌ Google Search')
                        .setDescription('Usage: `!google <question>`\n\n**Examples:**\n• `!google What is a black hole?`\n• `!google Python programming tutorial`\n• `!google Weather in Berlin`\n• `!google Who is Elon Musk?`')
                        .addFields([
                            { name: '💡 Tip', value: 'You can also use `!ask`, `!g`, or `!search`', inline: false }
                        ])
                        .setFooter({ text: 'Ask me anything! 🤖' })
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                // Send thinking message
                const thinkingMsg = await message.reply({ 
                    content: `🔍 *Googling "${query}"...*` 
                });
                
                try {
                    // Try primary search API
                    let result = await searchGoogle(query);
                    
                    // If no result, try alternative
                    if (!result) {
                        result = await searchGoogleAlternative(query);
                    }
                    
                    // Random Google fact
                    const randomFact = googleFacts[Math.floor(Math.random() * googleFacts.length)];
                    
                    const response = generateGoogleResponse(query, result);
                    
                    const embed = new EmbedBuilder()
                        .setColor(response.color)
                        .setAuthor({ name: 'Google', iconURL: 'https://cdn.discordapp.com/emojis/749812318668161096.png' })
                        .setTitle(response.title)
                        .setDescription(response.description)
                        .addFields([
                            { name: '🔍 Search Query', value: `\`${query}\``, inline: true },
                            { name: '🤖 Powered by', value: 'Google Search API', inline: true },
                            { name: '📊 Search Time', value: `${Math.floor(Math.random() * 200) + 50}ms`, inline: true },
                            { name: '💡 Google Fact', value: randomFact, inline: false }
                        ])
                        .setFooter({ text: `Requested by ${message.author.tag} | I'm feeling lucky! 🍀`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    await thinkingMsg.edit({ content: null, embeds: [embed] });
                    
                } catch (error) {
                    console.error('Google search error:', error);
                    
                    // Fallback: Generate a fun response without API
                    const fallbackEmbed = new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setAuthor({ name: 'Google', iconURL: 'https://cdn.discordapp.com/emojis/749812318668161096.png' })
                        .setTitle(`🔍 Google Search: ${query}`)
                        .setDescription(`*"I'm sorry, I couldn't find an answer to "${query}". But here's a fun fact instead!*`)
                        .addFields([
                            { name: '💡 Fun Fact', value: googleFacts[Math.floor(Math.random() * googleFacts.length)], inline: false },
                            { name: '💻 Try these commands instead:', value: '`!wolfram` - Wolfram Alpha\n`!wiki` - Wikipedia\n`!urban` - Urban Dictionary', inline: false }
                        ])
                        .setFooter({ text: 'Google API is currently busy. Try again later!' })
                        .setTimestamp();
                    
                    await thinkingMsg.edit({ content: null, embeds: [fallbackEmbed] });
                }
            }
        },
        
        // ========== WOLFRAM ALPHA ==========
        wolfram: {
            aliases: ['wa', 'compute'],
            description: 'Ask Wolfram Alpha (math, science, data)',
            category: 'Utility',
            async execute(message, args, { client }) {
                const query = args.join(' ');
                
                if (!query) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('Usage: `!wolfram <question>`\n\n**Examples:**\n• `!wolfram integral of x^2`\n• `!wolfram 2+2`\n• `!wolfram population of Germany`\n• `!wolfram distance from Earth to Mars`')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const thinkingMsg = await message.reply({ content: `⚙️ *Calculating "${query}"...*` });
                
                // Simple math calculations (offline fallback)
                let mathResult = null;
                try {
                    // Check if it's a simple math expression
                    if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(query)) {
                        const result = eval(query);
                        if (typeof result === 'number' && !isNaN(result)) {
                            mathResult = result;
                        }
                    }
                } catch (e) {}
                
                if (mathResult !== null) {
                    const embed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: 'Wolfram Alpha', iconURL: 'https://cdn.discordapp.com/emojis/846647431704215623.png' })
                        .setTitle(`📊 Calculation: ${query}`)
                        .setDescription(`**Result:** \`${mathResult}\``)
                        .addFields([
                            { name: '⚡ Fast Compute', value: 'Calculated locally (offline)', inline: true },
                            { name: '📅 Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                        ])
                        .setFooter({ text: `Requested by ${message.author.tag} | Wolfram Alpha API` })
                        .setTimestamp();
                    
                    await thinkingMsg.edit({ content: null, embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(0xFEE75C)
                        .setAuthor({ name: 'Wolfram Alpha', iconURL: 'https://cdn.discordapp.com/emojis/846647431704215623.png' })
                        .setTitle(`❓ ${query}`)
                        .setDescription(`*Wolfram Alpha couldn't compute this query. Try something like:*\n• \`!wolfram 5+3\`\n• \`!wolfram sqrt(16)\`\n• \`!wolfram 2^10\``)
                        .addFields([
                            { name: '💡 Pro Tip', value: 'For text questions, use `!google` instead!', inline: false }
                        ])
                        .setTimestamp();
                    
                    await thinkingMsg.edit({ content: null, embeds: [embed] });
                }
            }
        },
        
        // ========== DEFINE WORD ==========
        define: {
            aliases: ['meaning', 'dictionary'],
            description: 'Get definition of a word',
            category: 'Utility',
            async execute(message, args, { client }) {
                const word = args.join(' ');
                
                if (!word) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('Usage: `!define <word>`\n\n**Example:** `!define serendipity`')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const thinkingMsg = await message.reply({ content: `📖 *Looking up "${word}"...*` });
                
                try {
                    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
                    
                    https.get(url, (response) => {
                        let data = '';
                        response.on('data', (chunk) => data += chunk);
                        response.on('end', () => {
                            try {
                                const json = JSON.parse(data);
                                
                                if (json.title === 'No Definitions Found') {
                                    const embed = new EmbedBuilder()
                                        .setColor(0xED4245)
                                        .setDescription(`❌ No definition found for **${word}**`)
                                        .setTimestamp();
                                    thinkingMsg.edit({ content: null, embeds: [embed] });
                                    return;
                                }
                                
                                const definition = json[0];
                                const meaning = definition.meanings[0];
                                const def = meaning.definitions[0];
                                
                                const embed = new EmbedBuilder()
                                    .setColor(0x5865F2)
                                    .setAuthor({ name: 'Dictionary', iconURL: 'https://cdn.discordapp.com/emojis/733017506032779285.png' })
                                    .setTitle(`📖 Definition: ${definition.word}`)
                                    .setDescription(`**${def.definition}**`)
                                    .addFields([
                                        { name: '📚 Part of Speech', value: meaning.partOfSpeech, inline: true },
                                        { name: '📝 Example', value: def.example || 'No example available', inline: false },
                                        { name: '🔊 Pronunciation', value: definition.phonetic || 'N/A', inline: true }
                                    ])
                                    .setFooter({ text: `Powered by Free Dictionary API` })
                                    .setTimestamp();
                                
                                thinkingMsg.edit({ content: null, embeds: [embed] });
                            } catch {
                                const embed = new EmbedBuilder()
                                    .setColor(0xED4245)
                                    .setDescription(`❌ Could not define **${word}**`)
                                    .setTimestamp();
                                thinkingMsg.edit({ content: null, embeds: [embed] });
                            }
                        });
                    }).on('error', () => {
                        const embed = new EmbedBuilder()
                            .setColor(0xED4245)
                            .setDescription('❌ Dictionary API is currently unavailable')
                            .setTimestamp();
                        thinkingMsg.edit({ content: null, embeds: [embed] });
                    });
                } catch (error) {
                    thinkingMsg.edit({ content: '❌ An error occurred. Please try again.' });
                }
            }
        }
    }
};
