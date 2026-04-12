require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // WICHTIG: In Dev Portal aktivieren!
    ]
});

// MongoDB Verbindung
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB verbunden'))
    .catch(err => console.error('❌ MongoDB Fehler:', err));

// Beispiel Schema (models/User.js)
const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    username: String,
    balance: { type: Number, default: 100 }
});
const User = mongoose.model('User', userSchema);

client.once('ready', () => {
    console.log(`🤖 ${client.user.tag} ist online!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!register') {
        try {
            let user = await User.findOne({ discordId: message.author.id });
            if (!user) {
                user = new User({ discordId: message.author.id, username: message.author.username });
                await user.save();
                message.reply('📝 Registriert in der Datenbank!');
            } else {
                message.reply('Du bist bereits registriert.');
            }
        } catch (err) {
            console.error(err);
        }
    }
});

client.login(process.env.TOKEN);
