require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const PREFIX = '!';

// Embed Helper (global verfügbar)
global.embed = {
    success: (title, desc) => ({ color: 0x00FF00, title: `✅ ${title}`, description: desc, timestamp: new Date().toISOString() }),
    error: (title, desc) => ({ color: 0xFF0000, title: `❌ ${title}`, description: desc, timestamp: new Date().toISOString() }),
    info: (title, desc) => ({ color: 0x0099FF, title: `ℹ️ ${title}`, description: desc, timestamp: new Date().toISOString() }),
    warn: (title, desc) => ({ color: 0xFFA500, title: `⚠️ ${title}`, description: desc, timestamp: new Date().toISOString() })
};

// Commands Collection
client.commands = new Collection();
client.categories = new Collection();

// Dynamisch alle Dateien aus /models laden
const loadCommands = () => {
    const modelsPath = path.join(__dirname, 'models');
    
    // Prüfen ob Ordner existiert
    if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath);
        console.log('📁 models Ordner erstellt');
    }
    
    const files = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));
    
    for (const file of files) {
        const command = require(path.join(modelsPath, file));
        
        if (command.name) {
            // Hauptbefehl speichern
            client.commands.set(command.name, command);
            
            // Aliase speichern
            if (command.aliases) {
                command.aliases.forEach(alias => client.commands.set(alias, command));
            }
            
            // Kategorie speichern
            if (command.category) {
                if (!client.categories.has(command.category)) {
                    client.categories.set(command.category, []);
                }
                client.categories.get(command.category).push(command);
            }
            
            console.log(`✅ Befehl geladen: ${command.name}`);
        }
    }
    
    console.log(`📦 ${client.commands.size} Befehle geladen`);
};

loadCommands();

client.once('ready', () => {
    console.log(`✅ ${client.user.tag} ist online!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    
    if (!command) return;
    
    // Permission Check
    if (command.permissions) {
        if (!message.member.permissions.has(command.permissions)) {
            return message.reply({ 
                embeds: [global.embed.error('Keine Rechte', 'Du hast nicht die benötigten Berechtigungen!')] 
            });
        }
    }
    
    try {
        await command.execute(message, args, { client, supabase });
    } catch (error) {
        console.error(`Fehler bei ${commandName}:`, error);
        message.reply({ 
            embeds: [global.embed.error('Fehler', 'Beim Ausführen des Befehls ist ein Fehler aufgetreten.')] 
        });
    }
});

client.login(process.env.TOKEN);
