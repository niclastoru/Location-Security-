const { ChannelType, PermissionFlagsBits } = require('discord.js');

async function handleTicketButton(interaction, client, supabase) {
    const { customId, member, guild } = interaction;
    
    if (!customId.startsWith('ticket_')) return false;
    
    await interaction.deferReply({ ephemeral: true });
    
    const ticketType = customId.replace('ticket_', '');
    const typeNames = {
        support: 'Support',
        report: 'Report',
        application: 'Application'
    };
    
    // Check if user already has an open ticket
    const { data: existing } = await supabase
        .from('tickets')
        .select('*')
        .eq('guild_id', guild.id)
        .eq('creator_id', member.id)
        .eq('status', 'open')
        .single();
    
    if (existing) {
        await interaction.editReply({ 
            content: `❌ You already have an open ticket! Please close it first.`,
            ephemeral: true 
        });
        return true;
    }
    
    // Get next ticket number
    const { data: counter } = await supabase
        .from('ticket_counter')
        .select('counter')
        .eq('guild_id', guild.id)
        .single();
    
    const ticketNumber = (counter?.counter || 1);
    const ticketId = `${typeNames[ticketType].substring(0, 3)}-${ticketNumber}`.toUpperCase();
    
    // Update counter
    await supabase
        .from('ticket_counter')
        .upsert({ guild_id: guild.id, counter: ticketNumber + 1 });
    
    // Get ticket settings
    const { data: settings } = await supabase
        .from('ticket_settings')
        .select('category_id, support_role_id')
        .eq('guild_id', guild.id)
        .single();
    
    // Create ticket channel
    const category = settings?.category_id ? guild.channels.cache.get(settings.category_id) : null;
    
    const channel = await guild.channels.create({
        name: `ticket-${member.user.username}-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
            {
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: member.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.EmbedLinks
                ]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageChannels
                ]
            }
        ]
    });
    
    // Add support role if configured
    if (settings?.support_role_id) {
        await channel.permissionOverwrites.create(settings.support_role_id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true
        });
    }
    
    // Save ticket to database
    await supabase.from('tickets').insert({
        guild_id: guild.id,
        ticket_id: ticketId,
        channel_id: channel.id,
        creator_id: member.id,
        creator_tag: member.user.tag,
        type: ticketType,
        status: 'open',
        created_at: new Date().toISOString()
    });
    
    // Send welcome message in ticket
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`🎫 ${typeNames[ticketType]} Ticket - ${ticketId}`)
        .setDescription(`Hello ${member},\n\nThank you for creating a ticket. A staff member will assist you shortly.\n\n**Please describe your issue in detail below.**`)
        .setFooter({ text: `Ticket ID: ${ticketId}` })
        .setTimestamp();
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒'),
            new ButtonBuilder()
                .setCustomId('ticket_claim')
                .setLabel('Claim Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✅')
        );
    
    await channel.send({ 
        content: `<@${member.id}> ${settings?.support_role_id ? `<@&${settings.support_role_id}>` : ''}`,
        embeds: [welcomeEmbed], 
        components: [row] 
    });
    
    await interaction.editReply({ 
        content: `✅ Ticket created! Please go to ${channel}`,
        ephemeral: true 
    });
    
    return true;
}

async function handleTicketCloseButton(interaction, client, supabase) {
    if (interaction.customId !== 'ticket_close') return false;
    
    await interaction.deferReply();
    
    const channel = interaction.channel;
    
    // Get ticket from database
    const { data: ticket } = await supabase
        .from('tickets')
        .select('*')
        .eq('channel_id', channel.id)
        .single();
    
    if (!ticket) {
        await interaction.editReply({ content: '❌ Ticket not found!' });
        return true;
    }
    
    // Create transcript (simplified)
    const messages = [];
    let lastId = null;
    
    while (true) {
        const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
        if (fetched.size === 0) break;
        messages.push(...fetched.values());
        lastId = fetched.last().id;
    }
    
    messages.reverse();
    
    // Simple transcript as text
    let transcript = `=== TICKET TRANSCRIPT ===\n`;
    transcript += `Ticket ID: ${ticket.ticket_id}\n`;
    transcript += `Created by: ${ticket.creator_tag}\n`;
    transcript += `Type: ${ticket.type}\n`;
    transcript += `Created at: ${new Date(ticket.created_at).toLocaleString()}\n`;
    transcript += `Closed by: ${interaction.user.tag}\n`;
    transcript += `\n=== MESSAGES ===\n`;
    
    for (const msg of messages) {
        transcript += `[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author.tag}: ${msg.content || '*No content*'}\n`;
        if (msg.attachments.size > 0) {
            transcript += `  Attachments: ${msg.attachments.map(a => a.url).join(', ')}\n`;
        }
    }
    
    // Update ticket in database
    await supabase
        .from('tickets')
        .update({ 
            status: 'closed', 
            closed_at: new Date().toISOString(),
            closed_by: interaction.user.id,
            closed_by_tag: interaction.user.tag
        })
        .eq('id', ticket.id);
    
    // Send transcript to log channel
    const { data: settings } = await supabase
        .from('ticket_settings')
        .select('log_channel_id')
        .eq('guild_id', channel.guild.id)
        .single();
    
    if (settings?.log_channel_id) {
        const logChannel = channel.guild.channels.cache.get(settings.log_channel_id);
        if (logChannel) {
            const transcriptEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('📄 Ticket Closed')
                .addFields([
                    { name: 'Ticket', value: ticket.ticket_id, inline: true },
                    { name: 'Closed by', value: interaction.user.tag, inline: true },
                    { name: 'Created by', value: ticket.creator_tag, inline: true }
                ])
                .setTimestamp();
            
            await logChannel.send({ 
                embeds: [transcriptEmbed],
                files: [{ attachment: Buffer.from(transcript, 'utf-8'), name: `transcript_${ticket.ticket_id}.txt` }]
            });
        }
    }
    
    // Delete the channel
    await interaction.editReply({ content: '✅ Ticket will be closed in 5 seconds...' });
    setTimeout(async () => {
        await channel.delete();
    }, 5000);
    
    return true;
}

async function handleTicketClaimButton(interaction, client, supabase) {
    if (interaction.customId !== 'ticket_claim') return false;
    
    await interaction.deferReply();
    
    await supabase
        .from('tickets')
        .update({ 
            claimed_by: interaction.user.id,
            claimed_by_tag: interaction.user.tag,
            claimed_at: new Date().toISOString()
        })
        .eq('channel_id', interaction.channel.id);
    
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`✅ ${interaction.user} has claimed this ticket!`)
        .setTimestamp();
    
    await interaction.channel.send({ embeds: [embed] });
    await interaction.editReply({ content: '✅ You have claimed this ticket!' });
    
    return true;
}

module.exports = {
    handleTicketButton,
    handleTicketCloseButton,
    handleTicketClaimButton
};
