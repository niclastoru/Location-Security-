// index.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// Supabase Client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ⭐ Bot ist bereit
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} ist online!`);
});

// ⭐ Nachrichten verarbeiten
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // !register
    if (message.content === '!register') {
        const { data, error } = await supabase
            .from('users')
            .upsert({
                discord_id: message.author.id,
                username: message.author.username,
                punkte: 0
            })
            .select();
        
        if (error) {
            console.error(error);
            return message.reply('❌ Fehler beim Registrieren!');
        }
        
        message.reply('✅ Erfolgreich registriert!');
    }
    
    // !punkte
    if (message.content === '!punkte') {
        const { data, error } = await supabase
            .from('users')
            .select('punkte')
            .eq('discord_id', message.author.id)
            .single();
        
        if (!data) {
            return message.reply('❌ Du bist nicht registriert! Nutze `!register`');
        }
        
        message.reply(`💰 Du hast **${data.punkte}** Punkte!`);
    }
    
    // !add 50
    if (message.content.startsWith('!add')) {
        const args = message.content.split(' ');
        const menge = parseInt(args[1]);
        
        if (isNaN(menge)) {
            return message.reply('❌ Nutzung: `!add 10`');
        }
        
        // Erst aktuellen Punktestand holen
        const { data: user } = await supabase
            .from('users')
            .select('punkte')
            .eq('discord_id', message.author.id)
            .single();
        
        if (!user) {
            return message.reply('❌ Du bist nicht registriert! Nutze `!register`');
        }
        
        // Punkte updaten
        const neuerStand = user.punkte + menge;
        const { error } = await supabase
            .from('users')
            .update({ punkte: neuerStand })
            .eq('discord_id', message.author.id);
        
        if (error) {
            console.error(error);
            return message.reply('❌ Fehler beim Speichern!');
        }
        
        message.reply(`✅ ${menge} Punkte hinzugefügt! Neuer Stand: **${neuerStand}**`);
    }
    
    // !ping - Test ob Bot überhaupt antwortet
    if (message.content === '!ping') {
        message.reply('🏓 Pong! Bot funktioniert!');
    }
});

// Bot starten
client.login(process.env.TOKEN);
