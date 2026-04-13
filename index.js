require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ⭐ VOICEMASTER IMPORT
const { vmCache, handleVoiceMasterButton } = require('./models/voicemaster');
// ⭐ GIVEAWAY IMPORT
const { handleGiveawayReaction } = require('./models/giveaway');

// ⭐ SUPABASE CLIENT
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions  // ⭐ WICHTIG für Giveaways!
    ]
});

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

// ========== SNIPE CACHE ==========
client.snipes = new Map();

// Dynamisch alle Dateien aus /models laden
const loadCommands = () => {
    const modelsPath = path.join(__dirname, 'models');
    
    if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath);
        console.log('📁 models Ordner erstellt');
    }
    
    const files = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));
    
    for (const file of files) {
        const module = require(path.join(modelsPath, file));
        
        if (module.subCommands) {
            for (const [name, cmd] of Object.entries(module.subCommands)) {
                client.commands.set(name, cmd);
                if (cmd.aliases) {
                    cmd.aliases.forEach(alias => client.commands.set(alias, cmd));
                }
                
                const category = cmd.category || module.category || 'Sonstiges';
                if (!client.categories.has(category)) {
                    client.categories.set(category, []);
                }
                client.categories.get(category).push({ name, ...cmd });
            }
            console.log(`📦 ${Object.keys(module.subCommands).length} Subcommands aus ${file} geladen`);
        }
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
    console.log(`📂 Kategorien: ${Array.from(client.categories.keys()).join(', ')}`);
};

loadCommands();

// ========== BOT READY ==========
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} ist online!`);
    console.log(`🌐 ${client.guilds.cache.size} Server verbunden`);
});

// ========== MESSAGE CREATE ==========
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    if (!command) return;
    
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

// ========== INTERACTION HANDLER ==========
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        // ⭐ VoiceMaster Buttons
        if (interaction.customId.startsWith('vm_')) {
            return handleVoiceMasterButton(interaction, client);
        }
    }
});

// ========== VOICE STATE UPDATE (Join-to-Create) ==========
client.on('voiceStateUpdate', async (oldState, newState) => {
    const config = vmCache.get(newState.guild.id);
    if (!config) return;
    
    // User joint Join-to-Create Channel
    if (newState.channelId === config.jtcChannel) {
        const member = newState.member;
        
        // Neuen Voice-Channel erstellen
        const newChannel = await newState.guild.channels.create({
            name: `🎤 ${member.user.username}'s Channel`,
            type: ChannelType.GuildVoice,
            parent: newState.channel.parent,
            permissionOverwrites: [
                { id: member.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.MoveMembers] }
            ]
        });
        
        // User in neuen Channel moven
        await member.voice.setChannel(newChannel);
        
        // Als Owner speichern
        config.voiceChannels.set(newChannel.id, member.id);
        vmCache.set(newState.guild.id, config);
    }
    
    // Leere Voice-Channel löschen
    if (oldState.channel && oldState.channel.name?.includes('🎤') && oldState.channel.members.size === 0) {
        const channel = oldState.channel;
        const config = vmCache.get(oldState.guild.id);
        
        if (config && config.voiceChannels.has(channel.id)) {
            config.voiceChannels.delete(channel.id);
            vmCache.set(oldState.guild.id, config);
        }
        
        await channel.delete().catch(() => {});
    }
});

// ========== GIVEAWAY REACTION HANDLER ==========
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch {
            return;
        }
    }
    await handleGiveawayReaction(reaction, user, client, supabase, true);
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch {
            return;
        }
    }
    await handleGiveawayReaction(reaction, user, client, supabase, false);
});

// ========== SNIPE LISTENER ==========
client.on('messageDelete', async (message) => {
    if (message.author?.bot || (!message.content && !message.attachments.size)) return;
    
    const attachments = [];
    message.attachments.forEach(att => attachments.push(att.url));
    
    client.snipes.set(message.channel.id, {
        author: message.author?.tag || 'Unbekannt',
        avatar: message.author?.displayAvatarURL() || null,
        content: message.content || null,
        attachments: attachments.length > 0 ? attachments : null,
        time: new Date().toLocaleTimeString('de-DE')
    });
});

// ========== ERROR HANDLING ==========
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// ========== BOT LOGIN ==========
client.login(process.env.TOKEN);
