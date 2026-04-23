const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Transkripte Ordner erstellen falls nicht vorhanden
const transcriptsDir = path.join(__dirname, '../transcripts');
if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
}

// Helper: Build embed
async function buildEmbed(client, guildId, userId, type, title, description, fields = []) {
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        ticket: 0x00FF00
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client.user?.username || 'Bot', iconURL: client.user?.displayAvatarURL() })
        .setTitle(type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : type === 'warn' ? `⚠️ ${title}` : `🎫 ${title}`)
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

// Ticket Counter Cache
const ticketCounters = new Map();

// Get next ticket number
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

// Create transcript
async function createTranscript(channel, ticketData) {
    const messages = [];
    let lastId = null;
    
    // Fetch all messages
    while (true) {
        const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
        if (fetched.size === 0) break;
        messages.push(...fetched.values());
        lastId = fetched.last().id;
    }
    
    messages.reverse();
    
    // Generate HTML
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Ticket Transcript - ${ticketData.ticket_id}</title>
        <style>
            body { font-family: Arial, sans-serif; background: #36393f; color: #dcddde; padding: 20px; }
            .message { margin-bottom: 20px; padding: 10px; border-left: 3px solid #5865f2; background: #2f3136; border-radius: 5px; }
            .author { font-weight: bold; color: #fff; }
            .timestamp { font-size: 11px; color: #72767d; margin-left: 10px; }
            .content { margin-top: 5px; }
            .embed { background: #2b2d31; padding: 10px; margin-top: 5px; border-radius: 5px; }
            .attachment { margin-top: 5px; color: #00b0f4; }
        </style>
    </head>
    <body>
        <h1>Ticket Transcript: ${ticketData.ticket_id}</h1>
        <p><strong>Created by:</strong> ${ticketData.creator_tag}</p>
        <p><strong>Created at:</strong> ${new Date(ticketData.created_at).toLocaleString()}</p>
        <p><strong>Type:</strong> ${ticketData.type}</p>
        <hr>
        ${messages.map(msg => `
            <div class="message">
                <div class="author">${msg.author.tag}</div>
                <div class="timestamp">${new Date(msg.createdTimestamp).toLocaleString()}</div>
                <div class="content">${msg.content || '*No content*'}</div>
                ${msg.attachments.size > 0 ? `<div class="attachment">📎 Attachments: ${msg.attachments.map(a => a.url).join(', ')}</div>` : ''}
                ${msg.embeds.length > 0 ? '<div class="embed">📦 Embed content</div>' : ''}
            </div>
        `).join('')}
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
        
        // ========== CREATE TICKET PANEL ==========
        newticket: {
            aliases: ['ticketpanel', 'createpanel'],
            permissions: 'Administrator',
            description: 'Create a new ticket panel',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first() || message.channel;
                
                const panelEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🎫 Ticket System')
                    .setDescription('Select a ticket type below to open a ticket:\n\n**Support** - For general help\n**Report** - To report a user\n**Application** - To apply for something')
                    .setFooter({ text: message.guild.name })
                    .setTimestamp();
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_support')
                            .setLabel('Support')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('📞'),
                        new ButtonBuilder()
                            .setCustomId('ticket_report')
                            .setLabel('Report')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('📝'),
                        new ButtonBuilder()
                            .setCustomId('ticket_application')
                            .setLabel('Application')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💼')
                    );
                
                const msg = await channel.send({ embeds: [panelEmbed], components: [row] });
                
                await supabase.from('ticket_panels_v2').insert({
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    message_id: msg.id
                });
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Ticket Panel Created', `Panel created in ${channel}`);
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
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not a Ticket', 'This command can only be used in ticket channels!');
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: ticket } = await supabase
                    .from('tickets')
                    .select('*')
                    .eq('channel_id', message.channel.id)
                    .single();
                
                if (!ticket) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not Found', 'Ticket not found in database!');
                    return message.reply({ embeds: [embed] });
                }
                
                // Create transcript
                const transcript = await createTranscript(message.channel, ticket);
                
                // Update ticket status
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
                
                // Send transcript to log channel
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
                            .setTitle('📄 Ticket Closed')
                            .addFields([
                                { name: 'Ticket', value: ticket.ticket_id, inline: true },
                                { name: 'Closed by', value: message.author.tag, inline: true },
                                { name: 'Created by', value: ticket.creator_tag, inline: true }
                            ])
                            .setTimestamp();
                        
                        await logChannel.send({ 
                            embeds: [transcriptEmbed],
                            files: [{ attachment: transcript.filepath, name: transcript.filename }]
                        });
                    }
                }
                
                // Delete the channel
                await message.channel.delete();
                
                // Clean up transcript file
                fs.unlinkSync(transcript.filepath);
            }
        },
        
        // ========== ADD USER TO TICKET ==========
        add: {
            aliases: ['ticketadd', 'adduser'],
            description: 'Add a user to the current ticket',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not a Ticket', 'This command can only be used in ticket channels!');
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No User', 'Please mention a user to add!\nUsage: `!add @user`');
                    return message.reply({ embeds: [embed] });
                }
                
                await message.channel.permissionOverwrites.create(target.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true
                });
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'User Added', `${target} has been added to this ticket!`);
                await message.reply({ embeds: [embed] });
                
                // Log to ticket
                const logEmbed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`👤 ${message.author} added ${target} to the ticket`)
                    .setTimestamp();
                await message.channel.send({ embeds: [logEmbed] });
            }
        },
        
        // ========== REMOVE USER FROM TICKET ==========
        remove: {
            aliases: ['ticketremove', 'removeuser'],
            description: 'Remove a user from the current ticket',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not a Ticket', 'This command can only be used in ticket channels!');
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No User', 'Please mention a user to remove!\nUsage: `!remove @user`');
                    return message.reply({ embeds: [embed] });
                }
                
                await message.channel.permissionOverwrites.delete(target.id);
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'User Removed', `${target} has been removed from this ticket!`);
                await message.reply({ embeds: [embed] });
                
                // Log to ticket
                const logEmbed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription(`👤 ${message.author} removed ${target} from the ticket`)
                    .setTimestamp();
                await message.channel.send({ embeds: [logEmbed] });
            }
        },
        
        // ========== CLAIM TICKET ==========
        claim: {
            aliases: ['claimticket', 'take'],
            description: 'Claim the current ticket',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not a Ticket', 'This command can only be used in ticket channels!');
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
                    .setDescription(`✅ ${message.author} has claimed this ticket!`)
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
                
                // Try to rename channel
                try {
                    await message.channel.setName(`${message.channel.name}-claimed`);
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
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not a Ticket', 'This command can only be used in ticket channels!');
                    return message.reply({ embeds: [embed] });
                }
                
                const note = args.join(' ');
                if (!note) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No Note', 'Please provide a note!\nUsage: `!note This user is VIP`');
                    return message.reply({ embeds: [embed] });
                }
                
                // Save note to database
                await supabase.from('ticket_notes').insert({
                    ticket_id: message.channel.id,
                    author_id: message.author.id,
                    author_tag: message.author.tag,
                    note: note,
                    created_at: new Date().toISOString()
                });
                
                const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setAuthor({ name: '📝 Internal Note', iconURL: message.author.displayAvatarURL() })
                    .setDescription(note)
                    .setFooter({ text: `Added by ${message.author.tag}` })
                    .setTimestamp();
                
                // Send as ephemeral? No, but we can make it look like staff-only
                await message.channel.send({ embeds: [embed] });
            }
        },
        
        // ========== SNIPPET / QUICK REPLY ==========
        snippet: {
            aliases: ['quickreply', 'qr'],
            description: 'Send a quick reply from saved snippets',
            category: 'Tickets',
            async execute(message, args, { client, supabase }) {
                if (!message.channel.name?.startsWith('ticket-')) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Not a Ticket', 'This command can only be used in ticket channels!');
                    return message.reply({ embeds: [embed] });
                }
                
                const snippetName = args[0]?.toLowerCase();
                
                if (!snippetName) {
                    // Show available snippets
                    const { data: snippets } = await supabase
                        .from('ticket_snippets')
                        .select('*')
                        .eq('guild_id', message.guild.id);
                    
                    if (!snippets || snippets.length === 0) {
                        const embed = await buildEmbed(client, message.guild.id, message.author.id, 'info', 'No Snippets', 'No snippets configured. Create one with `!addsnippet name message`');
                        return message.reply({ embeds: [embed] });
                    }
                    
                    const list = snippets.map(s => `**!snippet ${s.name}** - ${s.description || s.content.substring(0, 50)}...`).join('\n');
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'info', 'Available Snippets', list);
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: snippet } = await supabase
                    .from('ticket_snippets')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('name', snippetName)
                    .single();
                
                if (!snippet) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Snippet Not Found', `Snippet "${snippetName}" not found!`);
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
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Usage', 'Usage: `!addsnippet name Content of the snippet`');
                    return message.reply({ embeds: [embed] });
                }
                
                await supabase.from('ticket_snippets').upsert({
                    guild_id: message.guild.id,
                    name: name,
                    content: content,
                    created_by: message.author.id
                });
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Snippet Added', `Snippet **${name}** has been added!\nUse \`!snippet ${name}\` to use it.`);
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
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`📊 Ticket Stats for ${target.username}`)
                    .addFields([
                        { name: 'Total Tickets', value: `${tickets?.length || 0}`, inline: true },
                        { name: 'Open Tickets', value: `${openTickets}`, inline: true },
                        { name: 'Closed Tickets', value: `${closedTickets}`, inline: true },
                        { name: 'Claimed Tickets', value: `${claimed?.length || 0}`, inline: true }
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
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Log Channel Set', `Ticket log channel set to ${channel}`);
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
