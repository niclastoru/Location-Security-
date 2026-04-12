require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const moderation = require('./commands/moderation');
const help = require('./commands/help');

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

// Embed Helper
const embed = {
    success: (title, desc) => ({ color: 0x00FF00, title: `✅ ${title}`, description: desc }),
    error: (title, desc) => ({ color: 0xFF0000, title: `❌ ${title}`, description: desc })
};

client.once('ready', () => {
    console.log(`✅ ${client.user.tag} ist online!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // Help Command
    if (command === 'help') {
        return help.execute(message, args, { client, embed });
    }
    
    // Moderation Commands
    const modCommands = ['ban', 'kick', 'role', 'r', 'purge', 'lock', 'unlock'];
    if (modCommands.includes(command)) {
        return moderation.execute(message, args, command, { client, supabase, embed });
    }
});

client.login(process.env.TOKEN);
