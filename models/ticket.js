const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Transkripte Ordner erstellen falls nicht vorhanden
const transcriptsDir = path.join(__dirname, '../transcripts');
if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
}

// Helper: Build modern embed
async function buildEmbed(client, guildId, userId, type, title, description, fields = []) {
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        ticket: 0x2B2D31
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x2B2D31)
        .setAuthor({ name: client.user?.username || 'Bot', iconURL: client.user?.displayAvatarURL() })
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
    
    if (userId) {
        const user = await client.users?.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

// Helper: Check if user is staff
async function isStaff(member, supabase) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    
    const { data: staffRoles } = await supabase
        .from('staff_roles')
        .select('role_id')
        .eq('guild_id', member.guild.id);
    
    if (staffRoles && staffRoles.length > 0) {
        const hasStaffRole = member.roles.cache.some(r => staffRoles.some(sr => sr.role_id === r.id));
        if (hasStaffRole) return true;
    }
    
    if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
    
    return false;
}

// Ticket Counter Cache
const ticketCounters = new Map();

async function getNextTicketNumber(guildId, supabase) {
    if (!ticketCounters.has(guildId)) {
        const { data } = await supabase
            .from('ticket_counter')
            .select('counter')
            .eq('guild_id', guildId)
            .single();
        
        ticketCounters.set(guildId, data?.counter || 1);
    }
    
    const number = ticketCounters.get(guildId);
    ticketCounters.set(guildId, number + 1);
    
    await supabase
        .from('ticket_counter')
        .upsert({ guild_id: guildId, counter: number + 1 });
    
    return number;
}

async function createTranscript(channel, ticketData, messages) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Ticket Transcript - ${ticketData.ticket_id}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #1a1b1e; color: #dcddde; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { background: #2c2f33; padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #5865f2; }
            .header h1 { color: #fff; margin-bottom: 10px; }
            .header p { color: #b9bbbe; margin: 5px 0; }
            .message { background: #2f3136; margin-bottom: 15px; padding: 15px; border-radius: 8px; border-left: 3px solid #5865f2; }
            .message:hover { background: #383a40; }
            .author { font-weight: bold; color: #fff; }
            .timestamp { font-size: 11px; color: #72767d; margin-left: 10px; }
            .content { margin-top: 8px; color: #dcddde; }
            .embed { background: #2b2d31; padding: 10px; margin-top: 8px; border-radius: 5px; border-left: 3px solid #57F287; }
            .attachment { margin-top: 8px; color: #00b0f4; }
            hr { border-color: #40444b; margin: 20px 0; }
            .footer { text-align: center; color: #72767d; font-size: 12px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📄 Ticket Transcript</h1>
                <p><strong>Ticket ID:</strong> ${ticketData.ticket_id}</p>
                <p><strong>Created by:</strong> ${ticketData.creator_tag}</p>
                <p><strong>Created at:</strong> ${new Date(ticketData.created_at).toLocaleString()}</p>
                <p><strong>Type:</strong> ${ticketData.type}</p>
                ${ticketData.claimed_by_tag ? `<p><strong>Claimed by:</strong> ${ticketData.claimed_by_tag}</p>` : ''}
                ${ticketData.closed_by_tag ? `<p><strong>Closed by:</strong> ${ticketData.closed_by_tag}</p>` : ''}
            </div>
            <hr>
            ${messages.map(msg => `
                <div class="message">
                    <div class="author">${msg.author.tag}</div>
                    <div class="timestamp">${new Date(msg.createdTimestamp).toLocaleString()}</div>
                    <div class="content">${msg.content || '*No content*'}</div>
                    ${msg.attachments.size > 0 ? `<div class="attachment">📎 ${msg.attachments.map(a => `<a href="${a.url}" style="color:#00b0f4;">${a.name}</a>`).join(', ')}</div>` : ''}
                    ${msg.embeds.length > 0 ? '<div class="embed">📦 Embed content was removed</div>' : ''}
                </div>
            `).join('')}
            <div class="footer">
                Generated by ${ticketData.guild_name} • ${new Date().toLocaleString()}
            </div>
        </div>
    </body>
    </html>`;
    
    const filename = `transcript_${ticketData.ticket_id}_${Date.now()}.html`;
    const filepath = path.join(transcriptsDir, filename);
    fs.writeFileSync(filepath, html);
    
    return { filename, filepath };
}

module.exports = {
    category: 'Tickets',
    subCommands: {
        
        // ========== CREATE TICKET PANEL (MIT KATEGORIE AUSWAHL) ==========
        newticket: {
            aliases: ['ticketpanel', 'createpanel'],
            permissions: 'Administrator',
            description: 'Create a new ticket panel in a specific category',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                // Kategorie auslesen (erwähnte Kategorie oder nach ID/Name)
                let category = message.mentions.channels.find(c => c.type === ChannelType.GuildCategory);
                
                if (!category && args[0]) {
                    // Versuche nach ID
                    category = message.guild.channels.cache.get(args[0]);
                    // Versuche nach Namen
                    if (!category) {
                        category = message.guild.channels.cache.find(c => 
                            c.type === ChannelType.GuildCategory && 
                            c.name.toLowerCase() === args[0].toLowerCase()
                        );
                    }
                }
                
                if (!category) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No Category', 
                        'Please mention a category where tickets should be created!\n\nUsage: `!newticket #Kategorie`\nExample: `!newticket #Tickets`');
                    return message.reply({ embeds: [embed] });
                }
                
                const channel = message.mentions.channels.first() || message.channel;
                
                const panelEmbed = new EmbedBuilder()
                    .setColor(0x2B2D31)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('Support Ticket')
                    .setDescription('Need help? Click a button below to open a ticket.\nOur support team will assist you as soon as possible.')
                    .addFields([
                        { name: '📞 Support', value: 'General help and questions', inline: true },
                        { name: '👑 Admin', value: 'Admin-related issues', inline: true },
                        { name: '👥 Owner', value: 'Owner/Server management', inline: true }
                    ])
                    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
                    .setTimestamp();
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket_support_${category.id}`)
                            .setLabel('Support')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📞'),
                        new ButtonBuilder()
                            .setCustomId(`ticket_admin_${category.id}`)
                            .setLabel('Admin')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('👑'),
                        new ButtonBuilder()
                            .setCustomId(`ticket_owner_${category.id}`)
                            .setLabel('Owner')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('👥')
                    );
                
                const msg = await channel.send({ embeds: [panelEmbed], components: [row] });
                
                await supabase.from('ticket_panels_v2').insert({
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    message_id: msg.id,
                    category_id: category.id
                });
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Panel Created', 
                    `Ticket panel has been created in ${channel}\nTickets will be created in category: **${category.name}**`);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== CLOSE TICKET ==========
        close: {
            aliases: ['close-ticket', 'ticketclose'],
            description: 'Close the current ticket',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Channel', 'This command can only be used in ticket channels.');
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isStaff(message.member, supabase) && message.author.id !== message.channel.topic?.split('|')[0]) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Permission Denied', 'Only staff members or the ticket creator can close this ticket.');
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: ticket } = await supabase
                    .from('tickets')
                    .select('*')
                    .eq('channel_id', message.channel.id)
                    .single();
                
                if (!ticket) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not Found', 'Ticket not found in database.');
                    return message.reply({ embeds: [embed] });
                }
                
                const messages = [];
                let lastId = null;
                while (true) {
                    const fetched = await message.channel.messages.fetch({ limit: 100, before: lastId });
                    if (fetched.size === 0) break;
                    messages.push(...fetched.values());
                    lastId = fetched.last().id;
                }
                messages.reverse();
                
                const transcript = await createTranscript(message.channel, ticket, messages);
                
                await supabase
                    .from('tickets')
                    .update({ 
                        status: 'closed', 
                        closed_at: new Date().toISOString(),
                        closed_by: message.author.id,
                        closed_by_tag: message.author.tag,
                        transcript: transcript.filename
                    })
                    .eq('id', ticket.id);
                
                const { data: settings } = await supabase
                    .from('ticket_settings')
                    .select('log_channel_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (settings?.log_channel_id) {
                    const logChannel = message.guild.channels.cache.get(settings.log_channel_id);
                    if (logChannel) {
                        const transcriptEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle('Ticket Closed')
                            .setDescription(`Ticket **${ticket.ticket_id}** has been closed.`)
                            .addFields([
                                { name: 'Closed by', value: message.author.tag, inline: true },
                                { name: 'Created by', value: ticket.creator_tag, inline: true },
                                { name: 'Type', value: ticket.type, inline: true }
                            ])
                            .setTimestamp();
                        
                        await logChannel.send({ 
                            embeds: [transcriptEmbed],
                            files: [{ attachment: transcript.filepath, name: transcript.filename }]
                        });
                    }
                }
                
                await message.channel.delete();
                fs.unlinkSync(transcript.filepath);
            }
        },
        
        // ========== ADD USER ==========
        add: {
            aliases: ['ticketadd', 'adduser'],
            description: 'Add a user to the current ticket',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Channel', 'This command can only be used in ticket channels.');
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isStaff(message.member, supabase)) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Permission Denied', 'Only staff members can add users to tickets.');
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No User', 'Please mention a user to add.\nUsage: `!add @user`');
                    return message.reply({ embeds: [embed] });
                }
                
                await message.channel.permissionOverwrites.create(target.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                });
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`✅ ${target} has been added to this ticket by ${message.author}`)
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
            }
        },
        
        // ========== REMOVE USER ==========
        remove: {
            aliases: ['ticketremove', 'removeuser'],
            description: 'Remove a user from the current ticket',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Channel', 'This command can only be used in ticket channels.');
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isStaff(message.member, supabase)) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Permission Denied', 'Only staff members can remove users from tickets.');
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No User', 'Please mention a user to remove.\nUsage: `!remove @user`');
                    return message.reply({ embeds: [embed] });
                }
                
                await message.channel.permissionOverwrites.delete(target.id);
                
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription(`❌ ${target} has been removed from this ticket by ${message.author}`)
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
            }
        },
        
        // ========== CLAIM ==========
        claim: {
            aliases: ['claimticket', 'take'],
            description: 'Claim the current ticket (Staff only)',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Channel', 'This command can only be used in ticket channels.');
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isStaff(message.member, supabase)) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Permission Denied', 'Only staff members can claim tickets.');
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: ticket } = await supabase
                    .from('tickets')
                    .select('claimed_by')
                    .eq('channel_id', message.channel.id)
                    .single();
                
                if (ticket?.claimed_by) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'warn', 'Already Claimed', `This ticket has already been claimed by <@${ticket.claimed_by}>.`);
                    return message.reply({ embeds: [embed] });
                }
                
                await supabase
                    .from('tickets')
                    .update({ 
                        claimed_by: message.author.id,
                        claimed_by_tag: message.author.tag,
                        claimed_at: new Date().toISOString()
                    })
                    .eq('channel_id', message.channel.id);
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`🎫 ${message.author} has claimed this ticket and will now handle it.`)
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
                
                try {
                    const currentName = message.channel.name;
                    if (!currentName.includes('-claimed')) {
                        await message.channel.setName(`${currentName}-claimed`);
                    }
                } catch (e) {}
            }
        },
        
        // ========== INTERNAL NOTE ==========
        note: {
            aliases: ['ticketnote', 'internal'],
            description: 'Add an internal note (only visible to staff)',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Channel', 'This command can only be used in ticket channels.');
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isStaff(message.member, supabase)) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Permission Denied', 'Only staff members can add internal notes.');
                    return message.reply({ embeds: [embed] });
                }
                
                const note = args.join(' ');
                if (!note) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No Note', 'Please provide a note.\nUsage: `!note This user is VIP`');
                    return message.reply({ embeds: [embed] });
                }
                
                await supabase.from('ticket_notes').insert({
                    ticket_id: message.channel.id,
                    author_id: message.author.id,
                    author_tag: message.author.tag,
                    note: note,
                    created_at: new Date().toISOString()
                });
                
                const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setAuthor({ name: 'Internal Note', iconURL: message.author.displayAvatarURL() })
                    .setDescription(`📝 ${note}`)
                    .setFooter({ text: `Added by ${message.author.tag}` })
                    .setTimestamp();
                
                await message.channel.send({ embeds: [embed] });
            }
        },
        
        // ========== SNIPPET ==========
        snippet: {
            aliases: ['quickreply', 'qr'],
            description: 'Send a quick reply from saved snippets',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Channel', 'This command can only be used in ticket channels.');
                    return message.reply({ embeds: [embed] });
                }
                
                const snippetName = args[0]?.toLowerCase();
                
                if (!snippetName) {
                    const { data: snippets } = await supabase
                        .from('ticket_snippets')
                        .select('*')
                        .eq('guild_id', message.guild.id);
                    
                    if (!snippets || snippets.length === 0) {
                        const embed = await buildEmbed(client, message.guild.id, message.author.id, 'info', 'No Snippets', 'No snippets configured yet. Create one with `!addsnippet <name> <message>`');
                        return message.reply({ embeds: [embed] });
                    }
                    
                    const list = snippets.map(s => `**!snippet ${s.name}** - ${(s.description || s.content).substring(0, 60)}...`).join('\n');
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'info', 'Quick Replies', list);
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: snippet } = await supabase
                    .from('ticket_snippets')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('name', snippetName)
                    .single();
                
                if (!snippet) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not Found', `Quick reply **${snippetName}** not found.`);
                    return message.reply({ embeds: [embed] });
                }
                
                await message.channel.send(snippet.content);
            }
        },
        
        // ========== ADD SNIPPET ==========
        addsnippet: {
            aliases: ['createsnippet', 'newsnippet'],
            permissions: 'ManageMessages',
            description: 'Add a new ticket snippet',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                const name = args[0]?.toLowerCase();
                const content = args.slice(1).join(' ');
                
                if (!name || !content) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Usage', 'Usage: `!addsnippet <name> <content>`\nExample: `!addsnippet thankyou Thank you for contacting support!`');
                    return message.reply({ embeds: [embed] });
                }
                
                await supabase.from('ticket_snippets').upsert({
                    guild_id: message.guild.id,
                    name: name,
                    content: content,
                    created_by: message.author.id,
                    created_by_tag: message.author.tag,
                    created_at: new Date().toISOString()
                });
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Snippet Added', `Quick reply **${name}** has been added.\nUse \`!snippet ${name}\` to use it.`);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== TICKET STATS ==========
        ticketstats: {
            aliases: ['ticket-stats', 'tstat'],
            description: 'Show ticket statistics',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                
                const { data: tickets } = await supabase
                    .from('tickets')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('creator_id', target.id);
                
                const { data: claimed } = await supabase
                    .from('tickets')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('claimed_by', target.id);
                
                const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
                const closedTickets = tickets?.filter(t => t.status === 'closed').length || 0;
                
                const embed = new EmbedBuilder()
                    .setColor(0x2B2D31)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`Ticket Statistics`)
                    .setThumbnail(target.displayAvatarURL())
                    .addFields([
                        { name: 'User', value: target.tag, inline: true },
                        { name: 'Total Tickets', value: `${tickets?.length || 0}`, inline: true },
                        { name: 'Open', value: `${openTickets}`, inline: true },
                        { name: 'Closed', value: `${closedTickets}`, inline: true },
                        { name: 'Claimed', value: `${claimed?.length || 0}`, inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== TICKET LOG CHANNEL ==========
        ticketlog: {
            aliases: ['ticket-log', 'tlog'],
            permissions: 'Administrator',
            description: 'Set the ticket log channel',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No Channel', 'Usage: `!ticketlog #channel`');
                    return message.reply({ embeds: [embed] });
                }
                
                await supabase.from('ticket_settings').upsert({
                    guild_id: message.guild.id,
                    log_channel_id: channel.id
                });
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Log Channel Set', `Ticket logs will be sent to ${channel}`);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== TICKET PANEL SETTINGS ==========
        ticketpanel: {
            aliases: ['panel'],
            permissions: 'Administrator',
            description: 'Configure the ticket panel',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                const embed = new EmbedBuilder()
                    .setColor(0x2B2D31)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('Ticket Panel Configuration')
                    .setDescription('Use the buttons below to configure the ticket system.')
                    .addFields([
                        { name: '📋 Create Panel', value: 'Create a new ticket panel', inline: true },
                        { name: '📊 Log Channel', value: 'Set where ticket logs are sent', inline: true },
                        { name: '👥 Staff Roles', value: 'Configure which roles can manage tickets', inline: true }
                    ])
                    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
                    .setTimestamp();
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_create_panel')
                            .setLabel('Create Panel')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📋'),
                        new ButtonBuilder()
                            .setCustomId('ticket_set_log')
                            .setLabel('Log Channel')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📊'),
                        new ButtonBuilder()
                            .setCustomId('ticket_staff_roles')
                            .setLabel('Staff Roles')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('👥')
                    );
                
                return message.reply({ embeds: [embed], components: [row] });
            }
        }
    }
};
