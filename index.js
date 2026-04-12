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

global.embed = {
    success: (title, desc) => ({ color: 0x00FF00, title: `✅ ${title}`, description: desc, timestamp: new Date().toISOString() }),
    error: (title, desc) => ({ color: 0xFF0000, title: `❌ ${title}`, description: desc, timestamp: new Date().toISOString() }),
    info: (title, desc) => ({ color: 0x0099FF, title: `ℹ️ ${title}`, description: desc, timestamp: new Date().toISOString() })
};

client.commands = new Collection();
client.categories = new Collection();
client.subCommands = new Collection(); // NEU: Für moderation.js

const loadCommands = () => {
    const modelsPath = path.join(__dirname, 'models');
    
    if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath);
        console.log('📁 models Ordner erstellt');
    }
    
    const files = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));
    
    for (const file of files) {
        const module = require(path.join(modelsPath, file));
        
        // ⭐ NEU: Prüfen ob es Subcommands hat (wie moderation.js)
        if (module.subCommands) {
            for (const [name, cmd] of Object.entries(module.subCommands)) {
                client.commands.set(name, cmd);
                if (cmd.aliases) {
                    cmd.aliases.forEach(alias => client.commands.set(alias, cmd));
                }
                
                // Zur Kategorie hinzufügen
                const category = cmd.category || module.category || 'Sonstiges';
                if (!client.categories.has(category)) {
                    client.categories.set(category, []);
                }
                client.categories.get(category).push({ name, ...cmd });
            }
            console.log(`📦 ${Object.keys(module.subCommands).length} Subcommands aus ${file} geladen`);
        }
        // Normaler Einzel-Befehl (wie help.js)
        else if (module.name) {
            client.commands.set(module.name, module);
            if (module.aliases) {
                module.aliases.forEach(alias => client.commands.set(alias, module));
            }
            
            const category = module.category || 'Sonstiges';
            if (!client.categories.has(category)) {
                client.categories.set(category, []);
            }
            client.categories.get(category).push(module);
            
            console.log(`✅ Befehl geladen: ${module.name}`);
        }
    }
    
    console.log(`📦 ${client.commands.size} Befehle insgesamt geladen`);
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
