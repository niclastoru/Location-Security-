require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ⭐ ALLE IMPORTS
const { vmCache, handleVoiceMasterButton, loadConfig } = require('./models/voicemaster');
const { handleGiveawayReaction } = require('./models/giveaway');
const { logEvent } = require('./models/logs');
const { handleLevelingMessage } = require('./models/leveling');
const { handleAfkReturn } = require('./models/misc');
const { handleBoosterUpdate } = require('./models/booster');
const { trackMessage, trackVoiceStart, trackVoiceEnd } = require('./models/stats');

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
        GatewayIntentBits.GuildMessageReactions
    ]
});

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
client.prefixes = new Map(); // ⭐ Prefix Cache

// ========== SNIPE CACHE ==========
client.snipes = new Map();

// ⭐ Dynamischen Prefix für Server laden
async function getPrefix(guildId) {
    if (!guildId) return '!';
    
    if (client.prefixes.has(guildId)) {
        return client.prefixes.get(guildId);
    }
    
    const { data } = await supabase
        .from('custom_prefixes')
        .select('prefix')
        .eq('guild_id', guildId)
        .single();
    
    const prefix = data?.prefix || '!';
    client.prefixes.set(guildId, prefix);
    return prefix;
}

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
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} ist online!`);
    console.log(`🌐 ${client.guilds.cache.size} Server verbunden`);
    
    // ⭐ Alle Prefixes aus Supabase laden
    const { data: prefixes } = await supabase.from('custom_prefixes').select('*');
    if (prefixes) {
        for (const p of prefixes) {
            client.prefixes.set(p.guild_id, p.prefix);
        }
        console.log(`📝 ${prefixes.length} Custom Prefixes geladen`);
    }
    
    // ⭐ Alle VoiceMaster Configs aus Supabase laden
    const { data: configs } = await supabase.from('voicemaster_config').select('*');
    if (configs) {
        for (const cfg of configs) {
            const { data: channels } = await supabase
                .from('voicemaster_channels')
                .select('*')
                .eq('guild_id', cfg.guild_id);
            
            const voiceChannels = new Map();
            if (channels) {
                channels.forEach(c => voiceChannels.set(c.channel_id, c.owner_id));
            }
            
            vmCache.set(cfg.guild_id, {
                jtcChannel: cfg.jtc_channel,
                interfaceChannel: cfg.interface_channel,
                voiceChannels: voiceChannels
            });
        }
        console.log(`📦 ${configs.length} VoiceMaster Configs geladen`);
    }
});

// ========== MESSAGE CREATE ==========
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // ⭐ STATS TRACKING (Messages)
    await trackMessage(message, supabase);
    
    // ⭐ AFK CHECK
    await handleAfkReturn(message, supabase);
    
    // ⭐ LEVELING XP
    await handleLevelingMessage(message, supabase);
    
    // ⭐ DYNAMISCHEN PREFIX LADEN!
    const prefix = await getPrefix(message.guild?.id);
    
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
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
        if (interaction.customId.startsWith('vm_')) {
            return handleVoiceMasterButton(interaction, client, supabase);
        }
    }
});

// ========== GUILD MEMBER UPDATE ==========
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    await handleBoosterUpdate(oldMember, newMember, supabase);
    
    await logEvent.memberNicknameChange(oldMember, newMember);
    
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    
    for (const role of addedRoles.values()) {
        if (role.id !== newMember.guild.id) {
            await logEvent.memberRoleAdd(newMember, role);
        }
    }
    
    for (const role of removedRoles.values()) {
        if (role.id !== newMember.guild.id) {
            await logEvent.memberRoleRemove(newMember, role);
        }
    }
});

// ========== VOICE STATE UPDATE ==========
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channelId && newState.channelId) {
        trackVoiceStart(newState, supabase);
    }
    if (oldState.channelId && !newState.channelId) {
        await trackVoiceEnd(oldState, supabase);
    }
    
    const config = await loadConfig(newState.guild.id, supabase);
    
    if (config) {
        if (newState.channelId === config.jtcChannel) {
            const member = newState.member;
            
            try {
                const newChannel = await newState.guild.channels.create({
                    name: `🎤 ${member.user.username}'s Channel`,
                    type: ChannelType.GuildVoice,
                    parent: newState.channel.parent,
                    permissionOverwrites: [
                        { 
                            id: member.id, 
                            allow: [
                                PermissionFlagsBits.Connect, 
                                PermissionFlagsBits.Speak, 
                                PermissionFlagsBits.Stream,
                                PermissionFlagsBits.UseVAD,
                                PermissionFlagsBits.PrioritySpeaker,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers
                            ] 
                        },
                        {
                            id: newState.guild.roles.everyone.id,
                            allow: [PermissionFlagsBits.Connect]
                        }
                    ]
                });
                
                await member.voice.setChannel(newChannel);
                
                await supabase.from('voicemaster_channels').insert({
                    guild_id: newState.guild.id,
                    channel_id: newChannel.id,
                    owner_id: member.id
                });
                
                config.voiceChannels.set(newChannel.id, member.id);
                vmCache.set(newState.guild.id, config);
                
            } catch (error) {
                console.error('Fehler beim Erstellen des Voice-Channels:', error);
            }
        }
        
        if (oldState.channel && oldState.channel.name?.includes('🎤') && oldState.channel.members.size === 0) {
            const channel = oldState.channel;
            const cfg = vmCache.get(oldState.guild.id);
            
            if (cfg && cfg.voiceChannels.has(channel.id)) {
                cfg.voiceChannels.delete(channel.id);
                vmCache.set(oldState.guild.id, cfg);
                
                await supabase.from('voicemaster_channels').delete().eq('channel_id', channel.id);
                await channel.delete().catch(() => {});
            }
        }
    }
    
    if (!oldState.channelId && newState.channelId) {
        await logEvent.voiceJoin(newState);
    }
    if (oldState.channelId && !newState.channelId) {
        await logEvent.voiceLeave(oldState);
    }
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        await logEvent.voiceMove(oldState, newState);
    }
});

// ========== GIVEAWAY REACTION HANDLER ==========
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
    }
    await handleGiveawayReaction(reaction, user, client, supabase, true);
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
    }
    await handleGiveawayReaction(reaction, user, client, supabase, false);
});

// ========== LOGGING LISTENERS ==========

client.on('messageDelete', async (message) => {
    if (!message.author?.bot || message.content || message.attachments.size) {
        const attachments = [];
        message.attachments.forEach(att => attachments.push(att.url));
        
        client.snipes.set(message.channel.id, {
            author: message.author?.tag || 'Unbekannt',
            avatar: message.author?.displayAvatarURL() || null,
            content: message.content || null,
            attachments: attachments.length > 0 ? attachments : null,
            time: new Date().toLocaleTimeString('de-DE')
        });
    }
    
    await logEvent.messageDelete(message);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    await logEvent.messageEdit(oldMessage, newMessage);
});

client.on('messageDeleteBulk', async (messages, channel) => {
    await logEvent.messageDeleteBulk(messages, channel);
});

// ========== MEMBER JOIN (WELCOME + AUTO-ROLE) ==========
client.on('guildMemberAdd', async (member) => {
    await logEvent.memberJoin(member);
    
    // ⭐ WELCOME NACHRICHTEN
    const { data: welcomes, error } = await supabase
        .from('welcome_messages')
        .select('channel_id, message, embed_color, image_url')
        .eq('guild_id', member.guild.id);
    
    console.log(`🎉 Member Join: ${member.user.tag}, Guild: ${member.guild.id}`);
    console.log(`📨 Welcomes gefunden: ${welcomes?.length || 0}`);
    if (error) console.error('Welcome Error:', error);
    
    if (welcomes && welcomes.length > 0) {
        for (const w of welcomes) {
            const channel = member.guild.channels.cache.get(w.channel_id);
            
            if (channel) {
                const welcomeMsg = w.message
                    .replace(/{user}/g, member.user.username)
                    .replace(/{user.mention}/g, member.toString())
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{membercount}/g, member.guild.memberCount);
                
                await channel.send({ 
                    embeds: [{
                        color: parseInt(w.embed_color?.replace('#', '') || '00FF00', 16),
                        title: `👋 Willkommen ${member.user.username}!`,
                        description: welcomeMsg,
                        image: w.image_url ? { url: w.image_url } : null,
                        thumbnail: { url: member.user.displayAvatarURL({ dynamic: true }) }
                    }] 
                }).then(() => {
                    console.log(`✅ Welcome gesendet in ${channel.name}`);
                }).catch(err => {
                    console.error(`❌ Welcome Fehler in ${channel.name}:`, err);
                });
            }
        }
    }
    
    // ⭐ AUTO-ROLE
    const { data: autorole } = await supabase
        .from('autorole')
        .select('role_id')
        .eq('guild_id', member.guild.id)
        .single();
    
    if (autorole) {
        const role = member.guild.roles.cache.get(autorole.role_id);
        if (role) await member.roles.add(role).catch(() => {});
    }
});

client.on('guildMemberRemove', async (member) => {
    await logEvent.memberLeave(member);
});

client.on('guildBanAdd', async (ban) => {
    const logs = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 });
    const entry = logs.entries.first();
    await logEvent.memberBan(ban.guild, ban.user, entry?.executor, entry?.reason);
});

client.on('guildBanRemove', async (ban) => {
    const logs = await ban.guild.fetchAuditLogs({ type: 23, limit: 1 });
    const entry = logs.entries.first();
    await logEvent.memberUnban(ban.guild, ban.user, entry?.executor);
});

client.on('channelCreate', async (channel) => {
    await logEvent.channelCreate(channel);
});

client.on('channelDelete', async (channel) => {
    await logEvent.channelDelete(channel);
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    await logEvent.channelUpdate(oldChannel, newChannel);
});

client.on('roleCreate', async (role) => {
    await logEvent.roleCreate(role);
});

client.on('roleDelete', async (role) => {
    await logEvent.roleDelete(role);
});

client.on('roleUpdate', async (oldRole, newRole) => {
    await logEvent.roleUpdate(oldRole, newRole);
});

client.on('emojiCreate', async (emoji) => {
    await logEvent.emojiCreate(emoji);
});

client.on('emojiDelete', async (emoji) => {
    await logEvent.emojiDelete(emoji);
});

client.on('inviteCreate', async (invite) => {
    await logEvent.inviteCreate(invite);
});

client.on('inviteDelete', async (invite) => {
    await logEvent.inviteDelete(invite);
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
