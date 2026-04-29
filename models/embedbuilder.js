const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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
    if (data.timestamp) embed.setTimestamp();
    
    return embed;
}

// Helper: Build preview embed
async function buildPreviewEmbed(data, fields = []) {
    const embed = createEmbedFromData(data);
    
    if (fields.length > 0) {
        embed.addFields(fields.map(f => ({
            name: f.name,
            value: f.value,
            inline: f.inline
        })));
    } else {
        embed.addFields({ name: 'ℹ️ No Fields', value: 'Use the buttons below to add fields', inline: false });
    }
    
    return embed;
}

// Helper: Get current embed data from database
async function getCurrentEmbed(guildId, sessionId, supabase) {
    const { data: session } = await supabase
        .from('embed_sessions')
        .select('*')
        .eq('guild_id', guildId)
        .eq('session_id', sessionId)
        .single();
    
    if (!session) return null;
    
    const { data: fields } = await supabase
        .from('embed_fields')
        .select('*')
        .eq('session_id', sessionId)
        .order('position', { ascending: true });
    
    return { ...session, fields: fields || [] };
}

// Helper: Save or update embed session
async function saveEmbedSession(guildId, sessionId, data, supabase) {
    const { error } = await supabase
        .from('embed_sessions')
        .upsert({
            guild_id: guildId,
            session_id: sessionId,
            ...data,
            updated_at: new Date().toISOString()
        });
    
    if (error) console.error('Save session error:', error);
    return !error;
}

// Helper: Save field
async function saveField(sessionId, fieldData, supabase) {
    const { error } = await supabase
        .from('embed_fields')
        .insert({
            session_id: sessionId,
            ...fieldData,
            position: fieldData.position || 0
        });
    
    return !error;
}

// Helper: Delete field
async function deleteField(sessionId, fieldId, supabase) {
    const { error } = await supabase
        .from('embed_fields')
        .delete()
        .eq('id', fieldId)
        .eq('session_id', sessionId);
    
    return !error;
}

// Helper: Update field
async function updateField(sessionId, fieldId, updates, supabase) {
    const { error } = await supabase
        .from('embed_fields')
        .update(updates)
        .eq('id', fieldId)
        .eq('session_id', sessionId);
    
    return !error;
}

// Helper: Clear all fields
async function clearFields(sessionId, supabase) {
    const { error } = await supabase
        .from('embed_fields')
        .delete()
        .eq('session_id', sessionId);
    
    return !error;
}

// Helper: Create modal for text input
function createInputModal(customId, title, label, placeholder, required = true, style = TextInputStyle.Short) {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);
    
    const input = new TextInputBuilder()
        .setCustomId('input')
        .setLabel(label)
        .setPlaceholder(placeholder)
        .setRequired(required)
        .setStyle(style);
    
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return modal;
}

// Main embed builder interface
async function embedBuilder(interaction, client, supabase, isNew = true) {
    const sessionId = `embed_${interaction.user.id}_${Date.now()}`;
    
    // Create session in database
    await supabase.from('embed_sessions').insert({
        guild_id: interaction.guild.id,
        session_id: sessionId,
        user_id: interaction.user.id,
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
        timestamp: true
    });
    
    // Create main menu dropdown
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`embed_menu_${sessionId}`)
        .setPlaceholder('Select an option to edit...')
        .addOptions([
            { label: '📝 Title', value: 'title', description: 'Set the embed title', emoji: '📝' },
            { label: '📄 Description', value: 'description', description: 'Set the embed description', emoji: '📄' },
            { label: '🎨 Color', value: 'color', description: 'Set the embed color (hex)', emoji: '🎨' },
            { label: '👤 Author', value: 'author', description: 'Set the author name/icon/url', emoji: '👤' },
            { label: '🖼️ Thumbnail', value: 'thumbnail', description: 'Set a thumbnail image URL', emoji: '🖼️' },
            { label: '📷 Image', value: 'image', description: 'Set a main image URL', emoji: '📷' },
            { label: '📌 Footer', value: 'footer', description: 'Set the footer text/icon', emoji: '📌' },
            { label: '⏰ Timestamp', value: 'timestamp', description: 'Toggle timestamp', emoji: '⏰' },
            { label: '📋 Fields', value: 'fields', description: 'Manage embed fields', emoji: '📋' },
            { label: '💾 Save', value: 'save', description: 'Save as template', emoji: '💾' },
            { label: '📤 Send', value: 'send', description: 'Send the embed', emoji: '📤' },
            { label: '🗑️ Cancel', value: 'cancel', description: 'Cancel editing', emoji: '🗑️' }
        ]);
    
    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    
    // Preview embed
    const previewEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('Embed Builder')
        .setDescription('Use the dropdown menu below to build your embed.\n\n**Current settings:**\n• Title: Not set\n• Description: Not set\n• Color: #2B2D31\n• Timestamp: Enabled\n• Fields: 0')
        .setFooter({ text: 'Select an option to start building' })
        .setTimestamp();
    
    const reply = await interaction.reply({
        embeds: [previewEmbed],
        components: [row1],
        ephemeral: true
    });
    
    // Store session info
    const sessions = new Map();
    sessions.set(sessionId, { messageId: reply.id, channelId: interaction.channel.id });
    
    // Create collector for interactions
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 600000 });
    
    collector.on('collect', async (i) => {
        if (i.customId === `embed_menu_${sessionId}`) {
            const value = i.values[0];
            await i.deferUpdate();
            
            const current = await getCurrentEmbed(interaction.guild.id, sessionId, supabase);
            
            switch (value) {
                case 'title':
                    const titleModal = createInputModal(`embed_title_${sessionId}`, 'Set Title', 'Title', 'Enter a title for your embed...');
                    await i.followUp({ embeds: [], components: [], content: null, ephemeral: true });
                    await i.followUp({ modals: [titleModal] });
                    break;
                    
                case 'description':
                    const descModal = createInputModal(`embed_desc_${sessionId}`, 'Set Description', 'Description', 'Enter a description...', true, TextInputStyle.Paragraph);
                    await i.followUp({ embeds: [], components: [], content: null, ephemeral: true });
                    await i.followUp({ modals: [descModal] });
                    break;
                    
                case 'color':
                    const colorModal = createInputModal(`embed_color_${sessionId}`, 'Set Color', 'Hex Color', '#2B2D31 or FF5733');
                    await i.followUp({ embeds: [], components: [], content: null, ephemeral: true });
                    await i.followUp({ modals: [colorModal] });
                    break;
                    
                case 'author':
                    const authorModal = new ModalBuilder()
                        .setCustomId(`embed_author_${sessionId}`)
                        .setTitle('Set Author');
                    
                    const nameInput = new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Author Name')
                        .setPlaceholder('John Doe')
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
                    
                    await i.followUp({ modals: [authorModal] });
                    break;
                    
                case 'thumbnail':
                    const thumbnailModal = createInputModal(`embed_thumbnail_${sessionId}`, 'Set Thumbnail', 'Thumbnail URL', 'https://...');
                    await i.followUp({ modals: [thumbnailModal] });
                    break;
                    
                case 'image':
                    const imageModal = createInputModal(`embed_image_${sessionId}`, 'Set Image', 'Image URL', 'https://...');
                    await i.followUp({ modals: [imageModal] });
                    break;
                    
                case 'footer':
                    const footerModal = new ModalBuilder()
                        .setCustomId(`embed_footer_${sessionId}`)
                        .setTitle('Set Footer');
                    
                    const textInput = new TextInputBuilder()
                        .setCustomId('text')
                        .setLabel('Footer Text')
                        .setPlaceholder('Powered by Bot')
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
                    
                    await i.followUp({ modals: [footerModal] });
                    break;
                    
                case 'timestamp':
                    const newTimestamp = !current?.timestamp;
                    await saveEmbedSession(interaction.guild.id, sessionId, { timestamp: newTimestamp }, supabase);
                    await updatePreview(interaction, sessionId, supabase);
                    break;
                    
                case 'fields':
                    await showFieldMenu(i, sessionId, supabase);
                    break;
                    
                case 'save':
                    await saveTemplate(i, sessionId, supabase);
                    break;
                    
                case 'send':
                    await sendEmbed(i, sessionId, supabase);
                    break;
                    
                case 'cancel':
                    await supabase.from('embed_sessions').delete().eq('session_id', sessionId);
                    await supabase.from('embed_fields').delete().eq('session_id', sessionId);
                    await i.editReply({ content: '❌ Embed builder cancelled.', embeds: [], components: [] });
                    collector.stop();
                    break;
            }
        }
        
        // Handle field menu
        if (i.customId === `embed_fields_${sessionId}`) {
            const value = i.values[0];
            await i.deferUpdate();
            
            if (value === 'add') {
                const fieldModal = new ModalBuilder()
                    .setCustomId(`embed_field_add_${sessionId}`)
                    .setTitle('Add Field');
                
                const nameField = new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('Field Name')
                    .setPlaceholder('Example: Information')
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
                
                await i.followUp({ modals: [fieldModal] });
            } else if (value === 'clear') {
                await clearFields(sessionId, supabase);
                await updatePreview(interaction, sessionId, supabase);
            } else if (value.startsWith('remove_')) {
                const fieldId = parseInt(value.split('_')[1]);
                await deleteField(sessionId, fieldId, supabase);
                await updatePreview(interaction, sessionId, supabase);
            }
        }
    });
    
    // Handle modal submissions
    client.on('interactionCreate', async (modalInteraction) => {
        if (!modalInteraction.isModalSubmit()) return;
        if (!modalInteraction.customId.includes(sessionId)) return;
        
        const modalId = modalInteraction.customId;
        
        if (modalId.startsWith('embed_title_')) {
            const title = modalInteraction.fields.getTextInputValue('input');
            await saveEmbedSession(interaction.guild.id, sessionId, { title }, supabase);
            await updatePreview(modalInteraction, sessionId, supabase);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_desc_')) {
            const description = modalInteraction.fields.getTextInputValue('input');
            await saveEmbedSession(interaction.guild.id, sessionId, { description }, supabase);
            await updatePreview(modalInteraction, sessionId, supabase);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_color_')) {
            let color = modalInteraction.fields.getTextInputValue('input');
            if (!color.startsWith('#')) color = `#${color}`;
            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) color = '#2B2D31';
            await saveEmbedSession(interaction.guild.id, sessionId, { color }, supabase);
            await updatePreview(modalInteraction, sessionId, supabase);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_author_')) {
            const author_name = modalInteraction.fields.getTextInputValue('name') || null;
            const author_icon = modalInteraction.fields.getTextInputValue('icon') || null;
            const author_url = modalInteraction.fields.getTextInputValue('url') || null;
            await saveEmbedSession(interaction.guild.id, sessionId, { author_name, author_icon, author_url }, supabase);
            await updatePreview(modalInteraction, sessionId, supabase);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_thumbnail_')) {
            const thumbnail_url = modalInteraction.fields.getTextInputValue('input') || null;
            await saveEmbedSession(interaction.guild.id, sessionId, { thumbnail_url }, supabase);
            await updatePreview(modalInteraction, sessionId, supabase);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_image_')) {
            const image_url = modalInteraction.fields.getTextInputValue('input') || null;
            await saveEmbedSession(interaction.guild.id, sessionId, { image_url }, supabase);
            await updatePreview(modalInteraction, sessionId, supabase);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_footer_')) {
            const footer_text = modalInteraction.fields.getTextInputValue('text') || null;
            const footer_icon = modalInteraction.fields.getTextInputValue('icon') || null;
            await saveEmbedSession(interaction.guild.id, sessionId, { footer_text, footer_icon }, supabase);
            await updatePreview(modalInteraction, sessionId, supabase);
            await modalInteraction.deferUpdate();
        }
        
        else if (modalId.startsWith('embed_field_add_')) {
            const name = modalInteraction.fields.getTextInputValue('name');
            const value = modalInteraction.fields.getTextInputValue('value');
            const inlineRaw = modalInteraction.fields.getTextInputValue('inline')?.toLowerCase();
            const inline = inlineRaw === 'yes' || inlineRaw === 'true';
            
            const current = await getCurrentEmbed(interaction.guild.id, sessionId, supabase);
            const position = current?.fields?.length || 0;
            
            await saveField(sessionId, { name, value, inline, position }, supabase);
            await updatePreview(modalInteraction, sessionId, supabase);
            await modalInteraction.deferUpdate();
        }
    });
}

async function showFieldMenu(interaction, sessionId, supabase) {
    const current = await getCurrentEmbed(interaction.guild.id, sessionId, supabase);
    const fields = current?.fields || [];
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`embed_fields_${sessionId}`)
        .setPlaceholder('Manage fields...')
        .addOptions([
            { label: '➕ Add Field', value: 'add', description: 'Add a new field to the embed', emoji: '➕' },
            { label: '🗑️ Clear All Fields', value: 'clear', description: 'Remove all fields', emoji: '🗑️' }
        ]);
    
    // Add remove options for existing fields
    fields.forEach((field, index) => {
        if (index < 24) { // Max 25 options in select menu
            selectMenu.addOptions({
                label: `❌ Remove: ${field.name.substring(0, 50)}`,
                value: `remove_${field.id}`,
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

async function updatePreview(interaction, sessionId, supabase) {
    const current = await getCurrentEmbed(interaction.guild.id, sessionId, supabase);
    const embed = await buildPreviewEmbed(current, current.fields);
    
    const previewEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('🎨 Embed Builder')
        .setDescription(`**Current settings:**\n• Title: ${current.title || 'Not set'}\n• Description: ${current.description ? current.description.substring(0, 50) + '...' : 'Not set'}\n• Color: ${current.color}\n• Timestamp: ${current.timestamp ? 'Enabled' : 'Disabled'}\n• Fields: ${current.fields?.length || 0}\n• Author: ${current.author_name || 'Not set'}\n• Footer: ${current.footer_text || 'Not set'}`)
        .setFooter({ text: 'This is a preview of your embed ↓' })
        .setTimestamp();
    
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`embed_menu_${sessionId}`)
        .setPlaceholder('Select an option to edit...')
        .addOptions([
            { label: '📝 Title', value: 'title', description: 'Set the embed title', emoji: '📝' },
            { label: '📄 Description', value: 'description', description: 'Set the embed description', emoji: '📄' },
            { label: '🎨 Color', value: 'color', description: 'Set the embed color (hex)', emoji: '🎨' },
            { label: '👤 Author', value: 'author', description: 'Set the author name/icon/url', emoji: '👤' },
            { label: '🖼️ Thumbnail', value: 'thumbnail', description: 'Set a thumbnail image URL', emoji: '🖼️' },
            { label: '📷 Image', value: 'image', description: 'Set a main image URL', emoji: '📷' },
            { label: '📌 Footer', value: 'footer', description: 'Set the footer text/icon', emoji: '📌' },
            { label: '⏰ Timestamp', value: 'timestamp', description: 'Toggle timestamp', emoji: '⏰' },
            { label: '📋 Fields', value: 'fields', description: 'Manage embed fields', emoji: '📋' },
            { label: '💾 Save', value: 'save', description: 'Save as template', emoji: '💾' },
            { label: '📤 Send', value: 'send', description: 'Send the embed', emoji: '📤' },
            { label: '🗑️ Cancel', value: 'cancel', description: 'Cancel editing', emoji: '🗑️' }
        ]);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.editReply({ embeds: [previewEmbed, embed], components: [row] });
}

async function saveTemplate(interaction, sessionId, supabase) {
    const current = await getCurrentEmbed(interaction.guild.id, sessionId, supabase);
    
    const nameModal = new ModalBuilder()
        .setCustomId(`embed_save_${sessionId}`)
        .setTitle('Save Template');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Template Name')
        .setPlaceholder('My Awesome Embed')
        .setRequired(true)
        .setStyle(TextInputStyle.Short);
    
    nameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    
    await interaction.showModal(nameModal);
    
    // Handle save modal
    const filter = (i) => i.customId === `embed_save_${sessionId}` && i.user.id === interaction.user.id;
    try {
        const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });
        const templateName = modalInteraction.fields.getTextInputValue('name');
        
        await supabase.from('embed_templates').insert({
            guild_id: interaction.guild.id,
            name: templateName,
            title: current.title,
            description: current.description,
            color: current.color,
            author_name: current.author_name,
            author_icon: current.author_icon,
            author_url: current.author_url,
            thumbnail_url: current.thumbnail_url,
            image_url: current.image_url,
            footer_text: current.footer_text,
            footer_icon: current.footer_icon,
            timestamp: current.timestamp,
            created_by: interaction.user.id
        });
        
        await modalInteraction.reply({ content: `✅ Template **${templateName}** saved!`, ephemeral: true });
    } catch (e) {}
}

async function sendEmbed(interaction, sessionId, supabase) {
    const current = await getCurrentEmbed(interaction.guild.id, sessionId, supabase);
    const embed = await buildPreviewEmbed(current, current.fields);
    
    // Ask for channel
    const channelModal = new ModalBuilder()
        .setCustomId(`embed_send_${sessionId}`)
        .setTitle('Send Embed');
    
    const channelInput = new TextInputBuilder()
        .setCustomId('channel')
        .setLabel('Channel ID or #channel')
        .setPlaceholder('#general or 123456789')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    channelModal.addComponents(new ActionRowBuilder().addComponents(channelInput));
    
    await interaction.showModal(channelModal);
    
    const filter = (i) => i.customId === `embed_send_${sessionId}` && i.user.id === interaction.user.id;
    try {
        const modalInteraction = await interaction.awaitModalSubmit({ filter, time: 60000 });
        const channelInputValue = modalInteraction.fields.getTextInputValue('channel');
        
        let targetChannel = interaction.channel;
        if (channelInputValue) {
            const channelId = channelInputValue.replace(/[<#>]/g, '');
            targetChannel = interaction.guild.channels.cache.get(channelId);
            if (!targetChannel) targetChannel = interaction.channel;
        }
        
        await targetChannel.send({ embeds: [embed] });
        await modalInteraction.reply({ content: `✅ Embed sent to ${targetChannel}`, ephemeral: true });
    } catch (e) {}
}

module.exports = {
    embedBuilder,
    createEmbedFromData,
    buildPreviewEmbed,
    saveEmbedSession,
    getCurrentEmbed
};
