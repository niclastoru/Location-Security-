require('dotenv').config();
const { Client, GatewayIntentBits, Collection, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ⭐ LANGUAGE SYSTEM
const de = require('./languages/de.js');
const en = require('./languages/en.js');
const languages = { de, en };

// ⭐ ALLE IMPORTS
const { vmCache, handleVoiceMasterButton, loadConfig } = require('./models/voicemaster');
const { handleGiveawayReaction } = require('./models/giveaway');
const { logEvent } = require('./models/logs');
const { handleLevelingMessage } = require('./models/leveling');
const { handleAfkReturn } = require('./models/misc');
const { handleBoosterUpdate } = require('./models/booster');
const { trackMessage, trackVoiceStart, trackVoiceEnd } = require('./models/stats');
const { handleStarReaction, handleMessageDelete } = require('./models/starboard');

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
client.prefixes = new Map();
client.languages = new Map();

// ========== SNIPE CACHE ==========
client.snipes = new Map();

// ⭐ Sprache für Server laden
async function getLanguage(guildId) {
    if (!guildId) return 'de';
    
    if (client.languages.has(guildId)) {
        return client.languages.get(guildId);
    }
    
    const { data } = await supabase
        .from('server_languages')
        .select('language')
        .eq('guild_id', guildId)
        .single();
    
    const lang = data?.language || 'de';
    client.languages.set(guildId, lang);
    return lang;
}

// ⭐ Übersetzungs-Funktion
global.t = async (guildId, key, replacements = {}) => {
    const lang = await getLanguage(guildId);
    let text = languages[lang]?.[key] || languages.de[key] || key;
    
    for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(new RegExp(`{${k}}`, 'g'), v);
    }
    
    return text;
};

// ⭐ Embed Helper mit Übersetzung
global.tEmbed = async (guildId, type, titleKey, descKey, replacements = {}) => {
    const title = await global.t(guildId, titleKey, replacements);
    const description = await global.t(guildId, descKey, replacements);
    
    const colors = {
        success: 0x00FF00,
        error: 0xFF0000,
        info: 0x0099FF,
        warn: 0xFFA500
    };
    
    return {
        color: colors[type] || 0x0099FF,
        title: type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : type === 'warn' ? `⚠️ ${title}` : `ℹ️ ${title}`,
        description: description,
        timestamp: new Date().toISOString()
    };
};

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
    
    const { data: languages } = await supabase.from('server_languages').select('*');
    if (languages) {
        for (const l of languages) {
            client.languages.set(l.guild_id, l.language);
        }
        console.log(`🌍 ${languages.length} Sprachen geladen`);
    }
    
    const { data: prefixes } = await supabase.from('custom_prefixes').select('*');
    if (prefixes) {
        for (const p of prefixes) {
            client.prefixes.set(p.guild_id, p.prefix);
        }
        console.log(`📝 ${prefixes.length} Custom Prefixes geladen`);
    }
    
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
    
    await trackMessage(message, supabase);
    await handleAfkReturn(message, supabase);
    await handleLevelingMessage(message, supabase);
    
    const prefix = await getPrefix(message.guild?.id);
    
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    if (!command) return;
    
    if (command.permissions) {
        if (!message.member.permissions.has(command.permissions)) {
            const title = await global.t(message.guild.id, 'no_permission');
            return message.reply({ 
                embeds: [global.embed.error(title, await global.t(message.guild.id, 'error_user_missing_perms', { permissions: command.permissions }))] 
            });
        }
    }
    
    try {
        await command.execute(message, args, { client, supabase });
    } catch (error) {
        console.error(`Fehler bei ${commandName}:`, error);
        message.reply({ 
            embeds: [global.embed.error(await global.t(message.guild.id, 'error'), await global.t(message.guild.id, 'command_error'))] 
        });
    }
});

// ========== TICKET BUTTON HANDLER ==========
async function handleTicketButton(interaction, client, supabase) {
    const parts = interaction.customId.split('_');
    const type = parts[1];
    const categoryId = parts[2];
    
    const category = interaction.guild.channels.cache.get(categoryId);
    
    if (!category) {
        return interaction.reply({ content: '❌ Category not found! Please contact an admin.', ephemeral: true });
    }
    
    const { data: counterData } = await supabase
        .from('ticket_counter')
        .select('counter')
        .eq('guild_id', interaction.guild.id)
        .single();
    
    const ticketNumber = (counterData?.counter || 1);
    
    await supabase
        .from('ticket_counter')
        .upsert({ guild_id: interaction.guild.id, counter: ticketNumber + 1 });
    
    const ticketName = `ticket-${type}-${ticketNumber}`;
    
    const ticketChannel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
            },
            {
                id: interaction.client.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
            }
        ]
    });
    
    await supabase.from('tickets').insert({
        guild_id: interaction.guild.id,
        channel_id: ticketChannel.id,
        creator_id: interaction.user.id,
        creator_tag: interaction.user.tag,
        type: type,
        ticket_id: `${type.toUpperCase()}-${ticketNumber}`,
        status: 'open',
        created_at: new Date().toISOString()
    });
    
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle(`🎫 Ticket: ${type.toUpperCase()}`)
        .setDescription(`Hello ${interaction.user},\n\nSupport will be with you shortly. Please describe your issue in detail.`)
        .addFields([
            { name: '📋 Ticket ID', value: `${type.toUpperCase()}-${ticketNumber}`, inline: true },
            { name: '👤 Created by', value: interaction.user.tag, inline: true },
            { name: '📅 Created at', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
        ])
        .setFooter({ text: 'Use !close to close this ticket' })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('📋')
        );
    
    await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Ticket created! Please go to ${ticketChannel}`, ephemeral: true });
}

// ========== TICKET CLOSE HANDLER (DIREKT, OHNE COMMAND) ==========
async function handleTicketClose(interaction, client, supabase) {
    const channel = interaction.channel;
    const transcriptsDir = path.join(__dirname, 'transcripts');
    
    if (!fs.existsSync(transcriptsDir)) {
        fs.mkdirSync(transcriptsDir, { recursive: true });
    }
    
    if (!channel.name?.startsWith('ticket-')) {
        return interaction.reply({ content: '❌ This is not a ticket channel!', ephemeral: true });
    }
    
    await interaction.reply({ content: '🔒 Closing ticket...', ephemeral: true });
    
    try {
        const { data: ticket } = await supabase
            .from('tickets')
            .select('*')
            .eq('channel_id', channel.id)
            .single();
        
        if (ticket) {
            // Fetch all messages for transcript
            const messages = [];
            let lastId = null;
            while (true) {
                const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
                if (fetched.size === 0) break;
                messages.push(...fetched.values());
                lastId = fetched.last().id;
            }
            messages.reverse();
            
            // Create HTML transcript
            const html = `<!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Ticket Transcript - ${ticket.ticket_id}</title>
            <style>
                body { font-family: Arial, sans-serif; background: #1a1b1e; color: #dcddde; padding: 20px; }
                .message { background: #2f3136; margin-bottom: 10px; padding: 10px; border-radius: 5px; border-left: 3px solid #5865f2; }
                .author { font-weight: bold; color: #fff; }
                .timestamp { font-size: 11px; color: #72767d; margin-left: 10px; }
                .content { margin-top: 5px; }
            </style>
            </head>
            <body>
            <h1>Ticket Transcript: ${ticket.ticket_id}</h1>
            <p><strong>Created by:</strong> ${ticket.creator_tag}</p>
            <p><strong>Created at:</strong> ${new Date(ticket.created_at).toLocaleString()}</p>
            <p><strong>Type:</strong> ${ticket.type}</p>
            <hr>
            ${messages.map(msg => `
                <div class="message">
                    <div class="author">${msg.author.tag}<span class="timestamp">${new Date(msg.createdTimestamp).toLocaleString()}</span></div>
                    <div class="content">${msg.content || '*No content*'}</div>
                </div>
            `).join('')}
            </body>
            </html>`;
            
            const filename = `transcript_${ticket.ticket_id}_${Date.now()}.html`;
            const filepath = path.join(transcriptsDir, filename);
            fs.writeFileSync(filepath, html);
            
            await supabase
                .from('tickets')
                .update({ 
                    status: 'closed', 
                    closed_at: new Date().toISOString(),
                    closed_by: interaction.user.id,
                    closed_by_tag: interaction.user.tag,
                    transcript: filename
                })
                .eq('id', ticket.id);
            
            // Send transcript to log channel
            const { data: settings } = await supabase
                .from('ticket_settings')
                .select('log_channel_id')
                .eq('guild_id', interaction.guild.id)
                .single();
            
            if (settings?.log_channel_id) {
                const logChannel = interaction.guild.channels.cache.get(settings.log_channel_id);
                if (logChannel) {
                    const transcriptEmbed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('Ticket Closed')
                        .setDescription(`Ticket **${ticket.ticket_id}** has been closed.`)
                        .addFields([
                            { name: 'Closed by', value: interaction.user.tag, inline: true },
                            { name: 'Created by', value: ticket.creator_tag, inline: true },
                            { name: 'Type', value: ticket.type, inline: true }
                        ])
                        .setTimestamp();
                    
                    await logChannel.send({ 
                        embeds: [transcriptEmbed],
                        files: [{ attachment: filepath, name: filename }]
                    });
                }
            }
            
            fs.unlinkSync(filepath);
        }
        
        await channel.delete();
        
    } catch (error) {
        console.error('Close error:', error);
        await interaction.followUp({ content: '❌ Error closing ticket!', ephemeral: true });
    }
}

// ========== TICKET CLAIM HANDLER ==========
async function handleTicketClaim(interaction, client, supabase) {
    const channel = interaction.channel;
    
    if (!channel.name?.startsWith('ticket-')) {
        return interaction.reply({ content: '❌ This is not a ticket channel!', ephemeral: true });
    }
    
    const member = interaction.member;
    const isStaffMember = member.permissions.has(PermissionFlagsBits.Administrator) || 
                          member.permissions.has(PermissionFlagsBits.ManageChannels);
    
    if (!isStaffMember) {
        return interaction.reply({ content: '❌ Only staff members can claim tickets!', ephemeral: true });
    }
    
    const { data: ticket } = await supabase
        .from('tickets')
        .select('claimed_by')
        .eq('channel_id', channel.id)
        .single();
    
    if (ticket?.claimed_by) {
        return interaction.reply({ content: `❌ This ticket has already been claimed by <@${ticket.claimed_by}>!`, ephemeral: true });
    }
    
    await supabase
        .from('tickets')
        .update({ 
            claimed_by: interaction.user.id,
            claimed_by_tag: interaction.user.tag,
            claimed_at: new Date().toISOString()
        })
        .eq('channel_id', channel.id);
    
    await interaction.reply({ content: `✅ ${interaction.user} has claimed this ticket!` });
    
    try {
        if (!channel.name.includes('-claimed')) {
            await channel.setName(`${channel.name}-claimed`);
        }
    } catch (e) {}
}

// ========== INTERACTION HANDLER ==========
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        // VoiceMaster Buttons
        if (interaction.customId.startsWith('vm_')) {
            return handleVoiceMasterButton(interaction, client, supabase);
        }
        
        // Ticket Creation Buttons
        if (interaction.customId.startsWith('ticket_') && !interaction.customId.includes('close') && !interaction.customId.includes('claim')) {
            return handleTicketButton(interaction, client, supabase);
        }
        
        // Ticket Close Button
        if (interaction.customId === 'ticket_close') {
            return handleTicketClose(interaction, client, supabase);
        }
        
        // Ticket Claim Button
        if (interaction.customId === 'ticket_claim') {
            return handleTicketClaim(interaction, client, supabase);
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
    
    if (!oldState.channelId && newState.channelId) await logEvent.voiceJoin(newState);
    if (oldState.channelId && !newState.channelId) await logEvent.voiceLeave(oldState);
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) await logEvent.voiceMove(oldState, newState);
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

// ========== STARBOARD REACTION HANDLER ==========
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    await handleStarReaction(reaction, user, supabase, client, true);
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;
    await handleStarReaction(reaction, user, supabase, client, false);
});

// ========== LOGGING LISTENERS ==========
client.on('messageDelete', async (message) => {
    if (!message.author?.bot || message.content || message.attachments.size) {
        const attachments = [];
        message.attachments.forEach(att => attachments.push(att.url));
        
        client.snipes.set(message.channel.id, {
            author: message.author?.tag || await global.t(message.guild?.id, 'unknown'),
            avatar: message.author?.displayAvatarURL() || null,
            content: message.content || null,
            attachments: attachments.length > 0 ? attachments : null,
            time: new Date().toLocaleTimeString('de-DE')
        });
    }
    
    await logEvent.messageDelete(message);
    await handleMessageDelete(message, supabase);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    await logEvent.messageEdit(oldMessage, newMessage);
});

client.on('messageDeleteBulk', async (messages, channel) => {
    await logEvent.messageDeleteBulk(messages, channel);
});

// ========== MEMBER JOIN ==========
client.on('guildMemberAdd', async (member) => {
    await logEvent.memberJoin(member);
    
    console.log(`🎉 Member Join: ${member.user.tag}, Guild: ${member.guild.id}`);
    
    const { data: welcomes, error } = await supabase
        .from('welcome_messages')
        .select('channel_id, message, embed_color, image_url')
        .eq('guild_id', member.guild.id);
    
    if (welcomes && welcomes.length > 0) {
        for (const w of welcomes) {
            const channel = member.guild.channels.cache.get(w.channel_id);
            if (channel) {
                const welcomeMsg = w.message
                    .replace(/{user}/g, member.user.username)
                    .replace(/{user.mention}/g, member.toString())
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{membercount}/g, member.guild.memberCount);
                
                const embed = new EmbedBuilder()
                    .setColor(parseInt(w.embed_color?.replace('#', '') || '00FF00', 16))
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`👋 Willkommen ${member.user.username}!`)
                    .setDescription(welcomeMsg)
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                    .setTimestamp();
                
                if (w.image_url) embed.setImage(w.image_url);
                await channel.send({ embeds: [embed] });
            }
        }
    }
    
    const { data: autorole } = await supabase
        .from('autorole')
        .select('role_id')
        .eq('guild_id', member.guild.id)
        .single();
    
    if (autorole) {
        const role = member.guild.roles.cache.get(autorole.role_id);
        if (role) {
            await member.roles.add(role).catch(err => console.error('❌ Auto-Role Fehler:', err));
        }
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
