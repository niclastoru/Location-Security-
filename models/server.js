const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { starboardStats, starboardTop, starboardSetup, starboardConfig } = require('./starboard');

// ⭐ HELPER: Build nice embeds with language support
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    if (!client) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(descKey || 'Error')
            .setTimestamp();
        return embed;
    }
    
    const lang = client.languages?.get(guildId) || 'en';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        server: 0x0099FF,
        welcome: 0x00FF00
    };
    
    const titles = {
        en: {
            autorole: 'Auto-Role',
            autorole_set: 'Auto-Role Set',
            autorole_removed: 'Auto-Role Removed',
            whitelist: 'Whitelist',
            guild_whitelist: 'Guild Whitelist',
            prefix: 'Prefix',
            prefix_changed: 'Prefix Changed',
            prefix_reset: 'Prefix Reset',
            current_prefix: 'Current Prefix',
            ticket_panel: 'Ticket Panel',
            ticket_created: 'Ticket Panel Created',
            ticket_removed: 'Ticket Panel Removed',
            ticket_info: 'Ticket Panel Info',
            vanity_role: 'Vanity Role',
            vanity_set: 'Vanity Role Set',
            vanity_removed: 'Vanity Role Removed',
            welcome: 'Welcome',
            welcome_added: 'Welcome Added',
            welcome_removed: 'Welcome Removed',
            welcome_list: 'Welcome Messages',
            welcome_view: 'Welcome',
            welcome_test: 'Welcome Test',
            test_sent: 'Test Sent',
            welcome_help: 'Welcome Commands',
            starboard: 'Starboard',
            starboard_set: 'Starboard Set',
            starboard_stats: 'Starboard Stats',
            starboard_top: 'Starboard Top',
            embed_builder: 'Embed Builder',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage'
        }
    };
    
    const descriptions = {
        en: {
            autorole_set: (role) => `${role} will be automatically given to new members.`,
            autorole_removed: 'Auto-Role has been disabled.',
            autorole_current: (role) => `Current Auto-Role: <@&${role}>\n\n**Usage:**\n!autorole set @Role\n!autorole remove`,
            autorole_none: 'No Auto-Role set.\n\n**Usage:**\n!autorole set @Role',
            whitelist_added: (id) => `Server ${id} has been added to the whitelist.`,
            whitelist_removed: (id) => `Server ${id} has been removed from the whitelist.`,
            whitelist_empty: 'No servers on the whitelist.',
            whitelist_usage: '!guildwhitelist add <ServerID>\n!guildwhitelist remove <ServerID>\n!guildwhitelist list',
            prefix_no_prefix: '!prefix <NewPrefix>',
            prefix_too_long: 'Prefix can be maximum 5 characters!',
            prefix_changed: (prefix) => `New prefix: **${prefix}**`,
            prefix_reset: 'Prefix reset to **!**',
            current_prefix: (prefix) => `The prefix for this server is: **${prefix}**`,
            ticket_created: (channel) => `Panel created in ${channel}!`,
            ticket_removed: 'Ticket panel has been removed.',
            ticket_no_panel: 'No ticket panel configured.\n\n**Usage:**\n!ticketpanel create [#channel]\n!ticketpanel remove',
            ticket_channel: 'Channel',
            ticket_category: 'Category',
            ticket_support: 'Support Role',
            ticket_none: 'None',
            ticket_usage: '!ticketpanel create [#channel]\n!ticketpanel remove\n!ticketpanel info',
            vanity_set: (role) => `${role} will be given on Vanity-URL join.`,
            vanity_removed: 'Vanity-Role has been disabled.',
            vanity_current: (role) => `Current Vanity-Role: <@&${role}>\n\n**Usage:**\n!vanity-role set @Role\n!vanity-role remove`,
            vanity_none: 'No Vanity-Role set.\n\n**Usage:**\n!vanity-role set @Role',
            welcome_add_usage: '!welcome-add #channel "Message"\n\n**Placeholders:** {user}, {user.mention}, {server}, {membercount}',
            welcome_added: (channel, msg) => `Welcome message in ${channel}:\n${msg}`,
            welcome_remove_usage: '!welcome-remove #channel',
            welcome_removed: (channel) => `Welcome message in ${channel} has been removed.`,
            welcome_not_found: 'No welcome message found in this channel.',
            welcome_empty: 'No welcome messages configured.',
            welcome_view_empty: (channel) => `No welcome message configured in ${channel}.`,
            welcome_test_none: 'No welcome messages configured!',
            welcome_test_sent: 'Welcome messages have been sent as a test!',
            welcome_test_title: '🧪 Welcome Test',
            welcome_help_text: '**!welcome-add** #channel "Message"\n**!welcome-remove** #channel\n**!welcome-list**\n**!welcome-view** #channel\n**!welcome test**\n\n**Placeholders:** {user}, {user.mention}, {server}, {membercount}',
            added_by: 'added by'
        }
    };
    
    const title = titles[lang]?.[titleKey] || titleKey;
    let description = descriptions[lang]?.[descKey] || descKey;
    
    if (typeof description === 'function') {
        if (Array.isArray(fields) && fields.length > 0) {
            description = description(...fields);
        } else if (fields.length === 1 && typeof fields[0] !== 'object') {
            description = description(fields[0]);
        } else if (fields.length === 2) {
            description = description(fields[0], fields[1]);
        } else {
            description = description();
        }
    } else {
        for (const [key, value] of Object.entries(replacements)) {
            description = description.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor(type === 'welcome' ? 0x00FF00 : type === 'server' ? 0x0099FF : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user?.username || 'Bot', iconURL: client.user?.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '🌐';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = client.users?.cache?.get(userId) || await client.users?.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    embed.setTimestamp();
    
    if (Array.isArray(fields) && fields.length > 0 && fields[0] && typeof fields[0] === 'object' && !fields[0].name) {
        embed.addFields(fields);
    }
    
    return embed;
}

// ========== EMBED BUILDER ==========

// Embed builder sessions cache
const embedSessions = new Map();

// Helper: Create embed from data
function createEmbedFromData(data) {
    const embed = new EmbedBuilder();
    
    if (data.title) embed.setTitle(data.title);
    if (data.description) embed.setDescription(data.description);
    if (data.color) embed.setColor(parseInt(data.color.replace('#', ''), 16));
    if (data.author_name) embed.setAuthor({ 
        name: data.author_name, 
        iconURL: data.author_icon || null, 
        url: data.author_url || null 
    });
    if (data.thumbnail_url) embed.setThumbnail(data.thumbnail_url);
    if (data.image_url) embed.setImage(data.image_url);
    if (data.footer_text) embed.setFooter({ 
        text: data.footer_text, 
        iconURL: data.footer_icon || null 
    });
    if (data.timestamp !== false) embed.setTimestamp();
    
    return embed;
}

// Main embed builder function
async function embedBuilder(message, client, supabase) {
    const sessionId = `embed_${message.author.id}_${Date.now()}`;
    
    // Store session
    embedSessions.set(sessionId, {
        userId: message.author.id,
        guildId: message.guild.id,
        title: null,
        description: null,
        color: '#2B2D31',
        author_name: null,
        author_icon: null,
        author_url: null,
        thumbnail_url: null,
        image_url: null,
        footer_text: null,
        footer_icon: null,
        timestamp: true,
        fields: []
    });
    
    // Create dropdown menu with ALL options visible
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`embed_menu_${sessionId}`)
        .setPlaceholder('📋 Select an option to edit...')
        .addOptions([
            { label: '📝 Title', value: 'title', description: 'Set the embed title', emoji: '📝' },
            { label: '📄 Description', value: 'description', description: 'Set the embed description', emoji: '📄' },
            { label: '🎨 Color', value: 'color', description: 'Set the embed color (Hex)', emoji: '🎨' },
            { label: '👤 Author', value: 'author', description: 'Set author name/icon/url', emoji: '👤' },
            { label: '🖼️ Thumbnail', value: 'thumbnail', description: 'Set a thumbnail image', emoji: '🖼️' },
            { label: '📷 Image', value: 'image', description: 'Set a main image', emoji: '📷' },
            { label: '📌 Footer', value: 'footer', description: 'Set footer text/icon', emoji: '📌' },
            { label: '⏰ Timestamp', value: 'timestamp', description: 'Toggle timestamp on/off', emoji: '⏰' },
            { label: '📋 Fields', value: 'fields', description: 'Manage embed fields', emoji: '📋' },
            { label: '💾 Save as Template', value: 'save', description: 'Save this embed as a template', emoji: '💾' },
            { label: '📤 Send', value: 'send', description: 'Send the embed to this channel', emoji: '📤' },
            { label: '❌ Cancel', value: 'cancel', description: 'Cancel editing', emoji: '❌' }
        ]);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    // Create LIST of current settings
    const session = embedSessions.get(sessionId);
    const settingsList = [
        `**📝 Title:** ${session.title || '❌ Not set'}`,
        `**📄 Description:** ${session.description ? session.description.substring(0, 50) + '...' : '❌ Not set'}`,
        `**🎨 Color:** ${session.color}`,
        `**👤 Author:** ${session.author_name || '❌ Not set'}`,
        `**🖼️ Thumbnail:** ${session.thumbnail_url ? '✅ Set' : '❌ Not set'}`,
        `**📷 Image:** ${session.image_url ? '✅ Set' : '❌ Not set'}`,
        `**📌 Footer:** ${session.footer_text || '❌ Not set'}`,
        `**⏰ Timestamp:** ${session.timestamp ? '✅ Enabled' : '❌ Disabled'}`,
        `**📋 Fields:** ${session.fields.length} fields`
    ].join('\n');
    
    const previewEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('🎨 Embed Builder')
        .setDescription(`### 📋 Settings\n${settingsList}\n\n---\n### 👇 Action\nSelect an option from the dropdown menu below.`)
        .setFooter({ text: 'Select an option from the dropdown menu' })
        .setTimestamp();
    
    // Live preview of the embed being built
    const liveEmbed = createEmbedFromData(session);
    if (session.fields.length > 0) {
        liveEmbed.addFields(session.fields);
    } else {
        liveEmbed.addFields({ name: 'ℹ️ No Fields', value: 'Add fields using the dropdown menu', inline: false });
    }
    
    const embedMsg = await message.reply({
        embeds: [previewEmbed, liveEmbed],
        components: [row]
    });
    
    // Create collector
    const filter = (i) => i.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter, time: 300000 });
    
    collector.on('collect', async (interaction) => {
        if (interaction.customId === `embed_menu_${sessionId}`) {
            const value = interaction.values[0];
            await interaction.deferUpdate();
            
            const session = embedSessions.get(sessionId);
            
            switch (value) {
                case 'title':
                    const titleModal = new ModalBuilder()
                        .setCustomId(`embed_title_${sessionId}`)
                        .setTitle('Set Title');
                    
                    const titleInput = new TextInputBuilder()
                        .setCustomId('input')
                        .setLabel('Title')
                        .setPlaceholder('Enter a title for your embed...')
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short);
                    
                    titleModal.addComponents(new ActionRowBuilder().addComponents(titleInput));
                    await interaction.followUp({ modals: [titleModal], ephemeral: true });
                    break;
                    
                case 'description':
                    const descModal = new ModalBuilder()
                        .setCustomId(`embed_desc_${sessionId}`)
                        .setTitle('Set Description');
                    
                    const descInput = new TextInputBuilder()
                        .setCustomId('input')
                        .setLabel('Description')
                        .setPlaceholder('Enter a description for your embed...')
                        .setRequired(true)
                        .setStyle(TextInputStyle.Paragraph);
                    
                    descModal.addComponents(new ActionRowBuilder().addComponents(descInput));
                    await interaction.followUp({ modals: [descModal], ephemeral: true });
                    break;
                    
                case 'color':
                    const colorModal = new ModalBuilder()
                        .setCustomId(`embed_color_${sessionId}`)
                        .setTitle('Set Color');
                    
                    const colorInput = new TextInputBuilder()
                        .setCustomId('input')
                        .setLabel('Hex Color')
                        .setPlaceholder('#2B2D31 or FF5733')
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short);
                    
                    colorModal.addComponents(new ActionRowBuilder().addComponents(colorInput));
                    await interaction.followUp({ modals: [colorModal], ephemeral: true });
                    break;
                    
                case 'author':
                    const authorModal = new ModalBuilder()
                        .setCustomId(`embed_author_${sessionId}`)
                        .setTitle('Set Author');
                    
                    const nameInput = new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Author Name')
                        .setPlaceholder('e.g., John Doe')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);
                    
                    const iconInput = new TextInputBuilder()
                        .setCustomId('icon')
                        .setLabel('Icon URL')
                        .setPlaceholder('https://...')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);
                    
                    const urlInput = new TextInputBuilder()
                        .setCustomId('url')
                        .setLabel('Author URL')
                        .setPlaceholder('https://...')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);
                    
                    authorModal.addComponents(
                        new ActionRowBuilder().addComponents(nameInput),
                        new ActionRowBuilder().addComponents(iconInput),
                        new ActionRowBuilder().addComponents(urlInput)
                    );
                    
                    await interaction.followUp({ modals: [authorModal], ephemeral: true });
                    break;
                    
                case 'thumbnail':
                    const thumbModal = new ModalBuilder()
                        .setCustomId(`embed_thumbnail_${sessionId}`)
                        .setTitle('Set Thumbnail');
                    
                    const thumbInput = new TextInputBuilder()
                        .setCustomId('input')
                        .setLabel('Thumbnail URL')
                        .setPlaceholder('https://...')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);
                    
                    thumbModal.addComponents(new ActionRowBuilder().addComponents(thumbInput));
                    await interaction.followUp({ modals: [thumbModal], ephemeral: true });
                    break;
                    
                case 'image':
                    const imageModal = new ModalBuilder()
                        .setCustomId(`embed_image_${sessionId}`)
                        .setTitle('Set Image');
                    
                    const imageInput = new TextInputBuilder()
                        .setCustomId('input')
                        .setLabel('Image URL')
                        .setPlaceholder('https://...')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);
                    
                    imageModal.addComponents(new ActionRowBuilder().addComponents(imageInput));
                    await interaction.followUp({ modals: [imageModal], ephemeral: true });
                    break;
                    
                case 'footer':
                    const footerModal = new ModalBuilder()
                        .setCustomId(`embed_footer_${sessionId}`)
                        .setTitle('Set Footer');
                    
                    const textInput = new TextInputBuilder()
                        .setCustomId('text')
                        .setLabel('Footer Text')
                        .setPlaceholder('e.g., Powered by Bot')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);
                    
                    const iconFooterInput = new TextInputBuilder()
                        .setCustomId('icon')
                        .setLabel('Icon URL')
                        .setPlaceholder('https://...')
                        .setRequired(false)
                        .setStyle(TextInputStyle.Short);
                    
                    footerModal.addComponents(
                        new ActionRowBuilder().addComponents(textInput),
                        new ActionRowBuilder().addComponents(iconFooterInput)
                    );
                    
                    await interaction.followUp({ modals: [footerModal], ephemeral: true });
                    break;
                    
                case 'timestamp':
                    session.timestamp = !session.timestamp;
                    embedSessions.set(sessionId, session);
                    await updateEmbedPreview(interaction, sessionId, embedMsg);
                    break;
                    
                case 'fields':
                    await showFieldMenu(interaction, sessionId, embedMsg);
                    break;
                    
                case 'save':
                    await saveTemplate(interaction, sessionId, message, supabase);
                    break;
                    
                case 'send':
                    await sendEmbedMessage(interaction, sessionId, message);
                    break;
                    
                case 'cancel':
                    embedSessions.delete(sessionId);
                    await interaction.editReply({ content: '❌ Embed builder cancelled.', embeds: [], components: [] });
                    collector.stop();
                    break;
            }
        }
        
        // Handle field menu
        if (interaction.customId === `embed_fields_${sessionId}`) {
            const value = interaction.values[0];
            await interaction.deferUpdate();
            
            const session = embedSessions.get(sessionId);
            
            if (value === 'add') {
                const fieldModal = new ModalBuilder()
                    .setCustomId(`embed_field_add_${sessionId}`)
                    .setTitle('Add Field');
                
                const nameField = new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('Field Name')
                    .setPlaceholder('e.g., Information')
                    .setRequired(true)
                    .setStyle(TextInputStyle.Short);
                
                const valueField = new TextInputBuilder()
                    .setCustomId('value')
                    .setLabel('Field Value')
                    .setPlaceholder('The content of the field...')
                    .setRequired(true)
                    .setStyle(TextInputStyle.Paragraph);
                
                const inlineField = new TextInputBuilder()
                    .setCustomId('inline')
                    .setLabel('Inline? (yes/no)')
                    .setPlaceholder('yes or no')
                    .setRequired(false)
                    .setStyle(TextInputStyle.Short);
                
                fieldModal.addComponents(
                    new ActionRowBuilder().addComponents(nameField),
                    new ActionRowBuilder().addComponents(valueField),
                    new ActionRowBuilder().addComponents(inlineField)
                );
                
                await interaction.followUp({ modals: [fieldModal], ephemeral: true });
            } else if (value === 'clear') {
                session.fields = [];
                embedSessions.set(sessionId, session);
                await updateEmbedPreview(interaction, sessionId, embedMsg);
                await showFieldMenu(interaction, sessionId, embedMsg);
            } else if (value.startsWith('remove_')) {
                const fieldId = parseInt(value.split('_')[1]);
                session.fields = session.fields.filter((_, i) => i !== fieldId);
                embedSessions.set(sessionId, session);
                await updateEmbedPreview(interaction, sessionId, embedMsg);
                await showFieldMenu(interaction, sessionId, embedMsg);
            }
        }
    });
    
    // Handle modal submissions
    const modalFilter = (i) => i.customId.includes(sessionId) && i.user.id === message.author.id;
    const modalCollector = message.channel.createMessageComponentCollector({ filter: modalFilter, time: 300000 });
    
    modalCollector.on('collect', async (modalInteraction) => {
        if (!modalInteraction.isModalSubmit()) return;
        
        const session = embedSessions.get(sessionId);
        const modalId = modalInteraction.customId;
        
        if (modalId.startsWith('embed_title_')) {
            session.title = modalInteraction.fields.getTextInputValue('input');
            embedSessions.set(sessionId, session);
            await updateEmbedPreview(modalInteraction, sessionId, embedMsg);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_desc_')) {
            session.description = modalInteraction.fields.getTextInputValue('input');
            embedSessions.set(sessionId, session);
            await updateEmbedPreview(modalInteraction, sessionId, embedMsg);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_color_')) {
            let color = modalInteraction.fields.getTextInputValue('input');
            if (!color.startsWith('#')) color = `#${color}`;
            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) color = '#2B2D31';
            session.color = color;
            embedSessions.set(sessionId, session);
            await updateEmbedPreview(modalInteraction, sessionId, embedMsg);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_author_')) {
            session.author_name = modalInteraction.fields.getTextInputValue('name') || null;
            session.author_icon = modalInteraction.fields.getTextInputValue('icon') || null;
            session.author_url = modalInteraction.fields.getTextInputValue('url') || null;
            embedSessions.set(sessionId, session);
            await updateEmbedPreview(modalInteraction, sessionId, embedMsg);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_thumbnail_')) {
            session.thumbnail_url = modalInteraction.fields.getTextInputValue('input') || null;
            embedSessions.set(sessionId, session);
            await updateEmbedPreview(modalInteraction, sessionId, embedMsg);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_image_')) {
            session.image_url = modalInteraction.fields.getTextInputValue('input') || null;
            embedSessions.set(sessionId, session);
            await updateEmbedPreview(modalInteraction, sessionId, embedMsg);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_footer_')) {
            session.footer_text = modalInteraction.fields.getTextInputValue('text') || null;
            session.footer_icon = modalInteraction.fields.getTextInputValue('icon') || null;
            embedSessions.set(sessionId, session);
            await updateEmbedPreview(modalInteraction, sessionId, embedMsg);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_field_add_')) {
            const name = modalInteraction.fields.getTextInputValue('name');
            const value = modalInteraction.fields.getTextInputValue('value');
            const inlineRaw = modalInteraction.fields.getTextInputValue('inline')?.toLowerCase();
            const inline = inlineRaw === 'yes' || inlineRaw === 'true';
            
            session.fields.push({ name, value, inline });
            embedSessions.set(sessionId, session);
            await updateEmbedPreview(modalInteraction, sessionId, embedMsg);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_save_')) {
            const templateName = modalInteraction.fields.getTextInputValue('name');
            
            await supabase.from('embed_templates').insert({
                guild_id: message.guild.id,
                name: templateName,
                title: session.title,
                description: session.description,
                color: session.color,
                author_name: session.author_name,
                author_icon: session.author_icon,
                author_url: session.author_url,
                thumbnail_url: session.thumbnail_url,
                image_url: session.image_url,
                footer_text: session.footer_text,
                footer_icon: session.footer_icon,
                timestamp: session.timestamp,
                created_by: message.author.id,
                created_at: new Date().toISOString()
            });
            
            await modalInteraction.reply({ content: `✅ Template **${templateName}** has been saved!`, ephemeral: true });
        }
    });
}

async function showFieldMenu(interaction, sessionId, embedMsg) {
    const session = embedSessions.get(sessionId);
    const fields = session?.fields || [];
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`embed_fields_${sessionId}`)
        .setPlaceholder('📋 Manage fields...')
        .addOptions([
            { label: '➕ Add Field', value: 'add', description: 'Add a new field', emoji: '➕' },
            { label: '🗑️ Clear All Fields', value: 'clear', description: 'Remove all fields', emoji: '🗑️' }
        ]);
    
    fields.forEach((field, index) => {
        if (index < 23) {
            selectMenu.addOptions({
                label: `❌ Remove: ${field.name.substring(0, 50)}`,
                value: `remove_${index}`,
                description: `Remove field "${field.name}"`,
                emoji: '❌'
            });
        }
    });
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('📋 Field Manager')
        .setDescription(`**Current Fields:** ${fields.length}/25\n\n${fields.map((f, i) => `${i+1}. **${f.name}**${f.inline ? ' (inline)' : ''}\n   ${f.value.substring(0, 50)}...`).join('\n\n') || '*No fields added yet*'}`);
    
    await interaction.editReply({ embeds: [embed], components: [row] });
}

async function saveTemplate(interaction, sessionId, message, supabase) {
    const session = embedSessions.get(sessionId);
    if (!session) return;
    
    const saveModal = new ModalBuilder()
        .setCustomId(`embed_save_${sessionId}`)
        .setTitle('Save Template');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Template Name')
        .setPlaceholder('e.g., Welcome Embed')
        .setRequired(true)
        .setStyle(TextInputStyle.Short);
    
    saveModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    await interaction.followUp({ modals: [saveModal], ephemeral: true });
}

async function sendEmbedMessage(interaction, sessionId, message) {
    const session = embedSessions.get(sessionId);
    if (!session) return;
    
    const embed = createEmbedFromData(session);
    if (session.fields.length > 0) {
        embed.addFields(session.fields);
    }
    
    await message.channel.send({ embeds: [embed] });
    await interaction.editReply({ content: '✅ Embed has been sent!', embeds: [], components: [] });
    embedSessions.delete(sessionId);
}

async function updateEmbedPreview(interaction, sessionId, embedMsg) {
    const session = embedSessions.get(sessionId);
    if (!session) return;
    
    // Update settings list
    const settingsList = [
        `**📝 Title:** ${session.title || '❌ Not set'}`,
        `**📄 Description:** ${session.description ? session.description.substring(0, 50) + '...' : '❌ Not set'}`,
        `**🎨 Color:** ${session.color}`,
        `**👤 Author:** ${session.author_name || '❌ Not set'}`,
        `**🖼️ Thumbnail:** ${session.thumbnail_url ? '✅ Set' : '❌ Not set'}`,
        `**📷 Image:** ${session.image_url ? '✅ Set' : '❌ Not set'}`,
        `**📌 Footer:** ${session.footer_text || '❌ Not set'}`,
        `**⏰ Timestamp:** ${session.timestamp ? '✅ Enabled' : '❌ Disabled'}`,
        `**📋 Fields:** ${session.fields.length} fields`
    ].join('\n');
    
    const previewEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('🎨 Embed Builder')
        .setDescription(`### 📋 Settings\n${settingsList}\n\n---\n### 👇 Action\nSelect an option from the dropdown menu below.`)
        .setFooter({ text: 'Select an option from the dropdown menu' })
        .setTimestamp();
    
    // Live preview
    const liveEmbed = createEmbedFromData(session);
    if (session.fields.length > 0) {
        liveEmbed.addFields(session.fields);
    } else {
        liveEmbed.addFields({ name: 'ℹ️ No Fields', value: 'Add fields using the dropdown menu', inline: false });
    }
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`embed_menu_${sessionId}`)
        .setPlaceholder('📋 Select an option to edit...')
        .addOptions([
            { label: '📝 Title', value: 'title', description: 'Set the embed title', emoji: '📝' },
            { label: '📄 Description', value: 'description', description: 'Set the embed description', emoji: '📄' },
            { label: '🎨 Color', value: 'color', description: 'Set the embed color (Hex)', emoji: '🎨' },
            { label: '👤 Author', value: 'author', description: 'Set author name/icon/url', emoji: '👤' },
            { label: '🖼️ Thumbnail', value: 'thumbnail', description: 'Set a thumbnail image', emoji: '🖼️' },
            { label: '📷 Image', value: 'image', description: 'Set a main image', emoji: '📷' },
            { label: '📌 Footer', value: 'footer', description: 'Set footer text/icon', emoji: '📌' },
            { label: '⏰ Timestamp', value: 'timestamp', description: 'Toggle timestamp on/off', emoji: '⏰' },
            { label: '📋 Fields', value: 'fields', description: 'Manage embed fields', emoji: '📋' },
            { label: '💾 Save as Template', value: 'save', description: 'Save this embed as a template', emoji: '💾' },
            { label: '📤 Send', value: 'send', description: 'Send the embed to this channel', emoji: '📤' },
            { label: '❌ Cancel', value: 'cancel', description: 'Cancel editing', emoji: '❌' }
        ]);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await embedMsg.edit({ embeds: [previewEmbed, liveEmbed], components: [row] });
}

module.exports = {
    category: 'Server',
    subCommands: {
        
        // ========== AUTOROLE ==========
        autorole: {
            aliases: ['auto-role', 'joinrole'],
            permissions: 'Administrator',
            description: 'Sets auto-role for new members',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                
                if (action === 'set' && role) {
                    await supabase.from('autorole').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'autorole_set', 'autorole_set', [role.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('autorole').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'autorole_removed', 'autorole_removed')] 
                    });
                }
                
                const { data } = await supabase
                    .from('autorole')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'autorole', 'autorole_current', [data.role_id])] 
                    });
                } else {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'autorole', 'autorole_none')] 
                    });
                }
            }
        },
        
        // ========== GUILDWHITELIST ==========
        guildwhitelist: {
            aliases: ['guild-wl', 'serverwhitelist'],
            permissions: 'Administrator',
            description: 'Manage server whitelist',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const targetGuildId = args[1];
                
                if (action === 'add' && targetGuildId) {
                    await supabase.from('guild_whitelist').upsert({
                        guild_id: targetGuildId,
                        added_by: message.author.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'whitelist', 'whitelist_added', [targetGuildId])] 
                    });
                }
                
                if (action === 'remove' && targetGuildId) {
                    await supabase.from('guild_whitelist').delete().eq('guild_id', targetGuildId);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'whitelist', 'whitelist_removed', [targetGuildId])] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase.from('guild_whitelist').select('guild_id, added_by, created_at');
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'guild_whitelist', 'whitelist_empty')] 
                        });
                    }
                    
                    const list = data.map(g => `🆔 ${g.guild_id} (added <t:${Math.floor(new Date(g.created_at).getTime() / 1000)}:R>)`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('📋 Guild Whitelist')
                        .setDescription(list.slice(0, 4096))
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'whitelist_usage')] 
                });
            }
        },
        
        // ========== PREFIX ==========
        prefix: {
            aliases: ['setprefix', 'newprefix'],
            permissions: 'Administrator',
            description: 'Changes the bot prefix',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const newPrefix = args[0];
                
                if (!newPrefix) {
                    const currentPrefix = client.prefixes.get(message.guild.id) || '!';
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'current_prefix', 'current_prefix', [currentPrefix])] 
                    });
                }
                
                if (newPrefix.length > 5) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'prefix', 'prefix_too_long')] 
                    });
                }
                
                try {
                    const { error } = await supabase
                        .from('custom_prefixes')
                        .upsert({
                            guild_id: message.guild.id,
                            prefix: newPrefix
                        });
                    
                    if (error) {
                        console.error('❌ Prefix Save Error:', error);
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'Could not save prefix!')] 
                        });
                    }
                    
                    client.prefixes.set(message.guild.id, newPrefix);
                    console.log(`✅ Prefix saved: ${newPrefix}`);
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'prefix_changed', 'prefix_changed', [newPrefix])] 
                    });
                } catch (err) {
                    console.error('❌ Prefix Error:', err);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', err.message)] 
                    });
                }
            }
        },
        
        // ========== PREFIX-REMOVE ==========
        'prefix-remove': {
            aliases: ['prefix-delete', 'resetprefix'],
            permissions: 'Administrator',
            description: 'Resets prefix to default',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                try {
                    await supabase.from('custom_prefixes').delete().eq('guild_id', message.guild.id);
                    client.prefixes.set(message.guild.id, '!');
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'prefix_reset', 'prefix_reset')] 
                    });
                } catch (err) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', err.message)] 
                    });
                }
            }
        },
        
        // ========== PREFIX-VIEW ==========
        'prefix-view': {
            aliases: ['prefix-show', 'showprefix'],
            description: 'Shows current prefix',
            category: 'Server',
            async execute(message, args, { client }) {
                const prefix = client.prefixes.get(message.guild.id) || '!';
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'current_prefix', 'current_prefix', [prefix])] 
                });
            }
        },
        
        // ========== TICKETPANEL ==========
        ticketpanel: {
            aliases: ['ticket-panel', 'ticketsetup'],
            permissions: 'Administrator',
            description: 'Creates ticket panel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'create' || action === 'setup') {
                    const channel = message.mentions.channels.first() || message.channel;
                    const category = message.mentions.channels.last();
                    const supportRole = message.mentions.roles.first();
                    
                    const panelEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('🎫 Create Ticket')
                        .setDescription('Click the button to open a ticket!')
                        .setFooter({ text: message.guild.name })
                        .setTimestamp();
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('create_ticket')
                                .setLabel('Open Ticket')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🎫')
                        );
                    
                    const msg = await channel.send({ embeds: [panelEmbed], components: [row] });
                    
                    await supabase.from('ticket_panels').insert({
                        guild_id: message.guild.id,
                        channel_id: channel.id,
                        message_id: msg.id,
                        category_id: category?.id || null,
                        support_role_id: supportRole?.id || null
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'ticket_created', 'ticket_created', [channel.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('ticket_panels').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'ticket_removed', 'ticket_removed')] 
                    });
                }
                
                if (action === 'info' || !action) {
                    const { data } = await supabase
                        .from('ticket_panels')
                        .select('*')
                        .eq('guild_id', message.guild.id)
                        .single();
                    
                    if (!data) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'ticket_panel', 'ticket_no_panel')] 
                        });
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('🎫 Ticket Panel Info')
                        .addFields([
                            { name: 'Channel', value: `<#${data.channel_id}>`, inline: true },
                            { name: 'Category', value: data.category_id ? `<#${data.category_id}>` : 'None', inline: true },
                            { name: 'Support Role', value: data.support_role_id ? `<@&${data.support_role_id}>` : 'None', inline: true }
                        ])
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'ticket_usage')] 
                });
            }
        },
        
        // ========== VANITY-ROLE ==========
        'vanity-role': {
            aliases: ['vanityrole', 'vrole'],
            permissions: 'Administrator',
            description: 'Sets role for vanity URL joins',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                
                if (action === 'set' && role) {
                    await supabase.from('vanity_role').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'vanity_set', 'vanity_set', [role.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('vanity_role').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'vanity_removed', 'vanity_removed')] 
                    });
                }
                
                const { data } = await supabase
                    .from('vanity_role')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'vanity_role', 'vanity_current', [data.role_id])] 
                    });
                } else {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'vanity_role', 'vanity_none')] 
                    });
                }
            }
        },
        
        // ========== WELCOME-ADD ==========
        'welcome-add': {
            aliases: ['welcome-set', 'setwelcome'],
            permissions: 'Administrator',
            description: 'Adds welcome message',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                let welcomeMessage = args.slice(1).join(' ');
                welcomeMessage = welcomeMessage.replace(/^["']|["']$/g, '');
                
                if (!channel || !welcomeMessage) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_add_usage')] 
                    });
                }
                
                try {
                    const { data: existing } = await supabase
                        .from('welcome_messages')
                        .select('id')
                        .eq('guild_id', message.guild.id)
                        .eq('channel_id', channel.id)
                        .maybeSingle();
                    
                    if (existing) {
                        await supabase
                            .from('welcome_messages')
                            .update({ message: welcomeMessage })
                            .eq('guild_id', message.guild.id)
                            .eq('channel_id', channel.id);
                    } else {
                        await supabase
                            .from('welcome_messages')
                            .insert({
                                guild_id: message.guild.id,
                                channel_id: channel.id,
                                message: welcomeMessage,
                                embed_color: '#00FF00'
                            });
                    }
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'welcome_added', 'welcome_added', [channel.toString(), welcomeMessage])] 
                    });
                } catch (err) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', err.message)] 
                    });
                }
            }
        },
        
        // ========== WELCOME-REMOVE ==========
        'welcome-remove': {
            aliases: ['welcome-delete', 'delwelcome'],
            permissions: 'Administrator',
            description: 'Removes welcome message',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_remove_usage')] 
                    });
                }
                
                const { error } = await supabase
                    .from('welcome_messages')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id);
                
                if (error) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'welcome_not_found')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'welcome_removed', 'welcome_removed', [channel.toString()])] 
                });
            }
        },
        
        // ========== WELCOME-LIST ==========
        'welcome-list': {
            aliases: ['welcomes', 'listwelcome'],
            permissions: 'Administrator',
            description: 'Lists all welcome messages',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const { data, error } = await supabase
                    .from('welcome_messages')
                    .select('*')
                    .eq('guild_id', message.guild.id);
                
                if (error || !data || data.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_list', 'welcome_empty')] 
                    });
                }
                
                const list = data.map(w => `📝 <#${w.channel_id}>\n${w.message.substring(0, 100)}${w.message.length > 100 ? '...' : ''}`).join('\n\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('👋 Welcome Messages')
                    .setDescription(list.slice(0, 4096))
                    .setFooter({ text: `${data.length} messages`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== WELCOME-VIEW ==========
        'welcome-view': {
            aliases: ['welcome-show', 'showwelcome'],
            permissions: 'Administrator',
            description: 'Shows welcome message of a channel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_remove_usage')] 
                    });
                }
                
                const { data, error } = await supabase
                    .from('welcome_messages')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id)
                    .single();
                
                if (error || !data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_view', 'welcome_view_empty', [channel.toString()])] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(parseInt(data.embed_color?.replace('#', '') || '00FF00', 16))
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`👋 Welcome to ${channel.name}`)
                    .setDescription(data.message)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                if (data.image_url) embed.setImage(data.image_url);
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== WELCOME ==========
        welcome: {
            aliases: ['welcome-info'],
            permissions: 'Administrator',
            description: 'Welcome info & test',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'test') {
                    const { data } = await supabase
                        .from('welcome_messages')
                        .select('channel_id, message')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'welcome', 'welcome_test_none')] 
                        });
                    }
                    
                    for (const w of data) {
                        const channel = message.guild.channels.cache.get(w.channel_id);
                        if (channel) {
                            const testMessage = w.message
                                .replace(/{user}/g, message.author.username)
                                .replace(/{user.mention}/g, message.author.toString())
                                .replace(/{server}/g, message.guild.name)
                                .replace(/{membercount}/g, message.guild.memberCount);
                            
                            const embed = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                                .setTitle('🧪 Welcome Test')
                                .setDescription(testMessage)
                                .setTimestamp();
                            
                            await channel.send({ embeds: [embed] });
                        }
                    }
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'test_sent', 'welcome_test_sent')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_help', 'welcome_help_text')] 
                });
            }
        },
        
        // ========== STARBOARD ==========
        starboard: {
            aliases: ['sb', 'starboard-setup'],
            permissions: 'Administrator',
            description: 'Setup starboard channel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const result = await starboardSetup(message, args, { client, supabase });
                return message.reply(result);
            }
        },
        
        // ========== STARBOARD CONFIG ==========
        starboardconfig: {
            aliases: ['sbconfig'],
            permissions: 'Administrator',
            description: 'Configure starboard settings',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const result = await starboardConfig(message, args, { client, supabase });
                return message.reply(result);
            }
        },
        
        // ========== STARBOARD STATS ==========
        starboardstats: {
            aliases: ['sbstats', 'sbstat'],
            description: 'Show starboard stats for a user',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const result = await starboardStats(message, args, { client, supabase });
                return message.reply(result);
            }
        },
        
        // ========== STARBOARD TOP ==========
        starboardtop: {
            aliases: ['sbtop', 'sbleaderboard'],
            description: 'Show top starred messages',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const result = await starboardTop(message, args, { client, supabase });
                return message.reply(result);
            }
        },
        
        // ========== EMBED BUILDER ==========
        embed: {
            aliases: ['eb', 'embedbuilder'],
            permissions: 'ManageMessages',
            description: 'Open the embed builder interface',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                await embedBuilder(message, client, supabase);
            }
        }
    }
};
