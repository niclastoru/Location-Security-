const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

// Embed sessions cache
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
    
    if (data.fields && data.fields.length > 0) {
        embed.addFields(data.fields);
    }
    
    return embed;
}

function getEmbedCode(data) {
    const embed = createEmbedFromData(data);
    return JSON.stringify(embed.toJSON(), null, 2);
}

// ⭐ Helper: Erstellt den Haupt-Container mit allen Buttons
function buildMainContainer(session, sessionId, client) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🎨 Embed Builder: ${session.name}`)
    );
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`> Use the buttons below to customize this embed.\n> Click **Code** to copy the JSON or **Preview** to see it.`)
    );
    container.addSeparatorComponents(new SeparatorBuilder());

    const previewLines = [];
    if (session.title) previewLines.push(`**${session.title}**`);
    if (session.description) previewLines.push(session.description);
    if (session.footer_text) previewLines.push(`*${session.footer_text}*`);
    if (session.fields.length > 0) previewLines.push(`📋 ${session.fields.length} Field(s)`);
    
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(previewLines.length > 0 
            ? `**📝 Live Preview:**\n${previewLines.join('\n')}` 
            : `**📝 Live Preview:**\n*No content yet. Use the buttons below to start.*`)
    );

    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `**📋 Stats:** Title: \`${session.title || 'None'}\` | Color: \`${session.color}\` | Fields: \`${session.fields.length}\`\n` +
            `**👤 Author:** \`${session.author_name || 'None'}\` | **📌 Footer:** \`${session.footer_text || 'None'}\``
        )
    );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`embed_basic_${sessionId}`).setLabel('Basic Info').setStyle(ButtonStyle.Primary).setEmoji('📝'),
        new ButtonBuilder().setCustomId(`embed_author_${sessionId}`).setLabel('Author').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
        new ButtonBuilder().setCustomId(`embed_footer_${sessionId}`).setLabel('Footer').setStyle(ButtonStyle.Secondary).setEmoji('📌'),
        new ButtonBuilder().setCustomId(`embed_images_${sessionId}`).setLabel('Images').setStyle(ButtonStyle.Secondary).setEmoji('🖼️')
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`embed_fields_${sessionId}`).setLabel('Fields').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
        new ButtonBuilder().setCustomId(`embed_code_${sessionId}`).setLabel('Code').setStyle(ButtonStyle.Success).setEmoji('📜'),
        new ButtonBuilder().setCustomId(`embed_preview_${sessionId}`).setLabel('Preview').setStyle(ButtonStyle.Primary).setEmoji('👁️'),
        new ButtonBuilder().setCustomId(`embed_send_${sessionId}`).setLabel('Send').setStyle(ButtonStyle.Success).setEmoji('📤'),
        new ButtonBuilder().setCustomId(`embed_cancel_${sessionId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );
    
    container.addActionRowComponents(row1);
    container.addActionRowComponents(row2);

    return container;
}

// Main embed builder function
async function embedCreate(message, args, client) {
    const embedName = args[0]?.toLowerCase();
    
    if (!embedName) {
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription('Please provide a name! Usage: `!embed create <name>`');
        return message.reply({ embeds: [embed] });
    }
    
    const sessionId = `embed_${message.author.id}_${embedName}_${Date.now()}`;
    
    embedSessions.set(sessionId, {
        userId: message.author.id,
        guildId: message.guild.id,
        name: embedName,
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
    
    const session = embedSessions.get(sessionId);
    const container = buildMainContainer(session, sessionId, client);
    
    const msg = await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    });
    
    const filter = (i) => i.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 600000 });
    
    collector.on('collect', async (interaction) => {
        const s = embedSessions.get(sessionId);
        if (!s) return interaction.reply({ content: '❌ Session expired.', ephemeral: true });

        if (interaction.customId === `embed_basic_${sessionId}`) await showBasicInfoModal(interaction, sessionId);
        else if (interaction.customId === `embed_author_${sessionId}`) await showAuthorModal(interaction, sessionId);
        else if (interaction.customId === `embed_footer_${sessionId}`) await showFooterModal(interaction, sessionId);
        else if (interaction.customId === `embed_images_${sessionId}`) await showImagesModal(interaction, sessionId);
        else if (interaction.customId === `embed_fields_${sessionId}`) await showFieldsMenu(interaction, sessionId);
        else if (interaction.customId === `embed_code_${sessionId}`) await showEmbedCode(interaction, sessionId);
        else if (interaction.customId === `embed_preview_${sessionId}`) await showEmbedPreview(interaction, sessionId);
        else if (interaction.customId === `embed_send_${sessionId}`) {
            await sendEmbed(interaction, sessionId, message);
            collector.stop();
        }
        else if (interaction.customId === `embed_cancel_${sessionId}`) {
            embedSessions.delete(sessionId);
            await interaction.update({ content: '❌ Embed builder cancelled.', components: [], flags: MessageFlags.IsComponentsV2 });
            collector.stop();
        }
        // Field Manager Aktionen
        else if (interaction.customId === `embed_back_${sessionId}`) {
            await interaction.update({ components: [buildMainContainer(s, sessionId, client)], flags: MessageFlags.IsComponentsV2 });
        }
        else if (interaction.customId === `embed_field_add_${sessionId}`) {
            await showAddFieldModal(interaction, sessionId, msg, client);
        }
        else if (interaction.customId === `embed_field_clear_${sessionId}`) {
            s.fields = [];
            await interaction.update({ components: [buildMainContainer(s, sessionId, client)], flags: MessageFlags.IsComponentsV2 });
            await interaction.followUp({ content: '✅ All fields cleared.', ephemeral: true });
        }
        else if (interaction.customId.startsWith(`embed_field_remove_`)) {
            const fieldId = parseInt(interaction.customId.split('_')[3]);
            if (s.fields[fieldId]) {
                s.fields.splice(fieldId, 1);
                await showFieldsMenu(interaction, sessionId);
            }
        }
    });
    
    collector.on('end', () => embedSessions.delete(sessionId));
}

// ⭐ MODALS (Verarbeitung direkt im awaitModalSubmit)
async function showBasicInfoModal(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    const modal = new ModalBuilder().setCustomId(`embed_basic_modal_${sessionId}`).setTitle('Edit Basic Information');
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Title').setValue(session.title || '').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('Description').setValue(session.description || '').setStyle(TextInputStyle.Paragraph).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('color').setLabel('Color (Hex)').setValue(session.color).setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('timestamp').setLabel('Timestamp (yes/no)').setValue(session.timestamp ? 'yes' : 'no').setStyle(TextInputStyle.Short).setRequired(false))
    );
    
    await interaction.showModal(modal);

    try {
        const modalInt = await interaction.awaitModalSubmit({ time: 60000, filter: (i) => i.customId === modal.customId });
        
        session.title = modalInt.fields.getTextInputValue('title') || null;
        session.description = modalInt.fields.getTextInputValue('description') || null;
        let color = modalInt.fields.getTextInputValue('color');
        if (!color.startsWith('#')) color = `#${color}`;
        if (!/^#[0-9A-Fa-f]{6}$/.test(color)) color = '#2B2D31';
        session.color = color;
        const tsVal = modalInt.fields.getTextInputValue('timestamp')?.toLowerCase();
        session.timestamp = tsVal === 'yes' || tsVal === 'true' || tsVal === 'on';
        
        // ⭐ WICHTIG: Die Interaktion des Modals bearbeitet jetzt die Hauptnachricht
        await modalInt.update({ components: [buildMainContainer(session, sessionId, interaction.client)], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {}
}

async function showAuthorModal(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    const modal = new ModalBuilder().setCustomId(`embed_author_modal_${sessionId}`).setTitle('Edit Author');
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Author Name').setValue(session.author_name || '').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icon').setLabel('Icon URL').setValue(session.author_icon || '').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('url').setLabel('Author URL').setValue(session.author_url || '').setStyle(TextInputStyle.Short).setRequired(false))
    );
    
    await interaction.showModal(modal);

    try {
        const modalInt = await interaction.awaitModalSubmit({ time: 60000, filter: (i) => i.customId === modal.customId });
        session.author_name = modalInt.fields.getTextInputValue('name') || null;
        session.author_icon = modalInt.fields.getTextInputValue('icon') || null;
        session.author_url = modalInt.fields.getTextInputValue('url') || null;
        await modalInt.update({ components: [buildMainContainer(session, sessionId, interaction.client)], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {}
}

async function showFooterModal(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    const modal = new ModalBuilder().setCustomId(`embed_footer_modal_${sessionId}`).setTitle('Edit Footer');
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('text').setLabel('Footer Text').setValue(session.footer_text || '').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('icon').setLabel('Icon URL').setValue(session.footer_icon || '').setStyle(TextInputStyle.Short).setRequired(false))
    );
    
    await interaction.showModal(modal);

    try {
        const modalInt = await interaction.awaitModalSubmit({ time: 60000, filter: (i) => i.customId === modal.customId });
        session.footer_text = modalInt.fields.getTextInputValue('text') || null;
        session.footer_icon = modalInt.fields.getTextInputValue('icon') || null;
        await modalInt.update({ components: [buildMainContainer(session, sessionId, interaction.client)], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {}
}

async function showImagesModal(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    const modal = new ModalBuilder().setCustomId(`embed_images_modal_${sessionId}`).setTitle('Edit Images');
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('thumbnail').setLabel('Thumbnail URL').setValue(session.thumbnail_url || '').setStyle(TextInputStyle.Short).setRequired(false)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('image').setLabel('Image URL').setValue(session.image_url || '').setStyle(TextInputStyle.Short).setRequired(false))
    );
    
    await interaction.showModal(modal);

    try {
        const modalInt = await interaction.awaitModalSubmit({ time: 60000, filter: (i) => i.customId === modal.customId });
        session.thumbnail_url = modalInt.fields.getTextInputValue('thumbnail') || null;
        session.image_url = modalInt.fields.getTextInputValue('image') || null;
        await modalInt.update({ components: [buildMainContainer(session, sessionId, interaction.client)], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {}
}

async function showAddFieldModal(interaction, sessionId, originalMsg, client) {
    const modal = new ModalBuilder().setCustomId(`embed_field_add_modal_${sessionId}`).setTitle('Add Field');
    modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Field Name').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('value').setLabel('Field Value').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('inline').setLabel('Inline? (yes/no)').setStyle(TextInputStyle.Short).setRequired(false))
    );
    
    await interaction.showModal(modal);

    try {
        const modalInt = await interaction.awaitModalSubmit({ time: 60000, filter: (i) => i.customId === modal.customId });
        const session = embedSessions.get(sessionId);
        
        if (session.fields.length >= 25) {
            return modalInt.reply({ content: '❌ Max 25 fields allowed!', ephemeral: true });
        }

        const name = modalInt.fields.getTextInputValue('name');
        const value = modalInt.fields.getTextInputValue('value');
        const inline = modalInt.fields.getTextInputValue('inline')?.toLowerCase() === 'yes';
        
        session.fields.push({ name, value, inline });
        
        // Nach dem Hinzufügen zurück zum Hauptmenü
        await modalInt.update({ components: [buildMainContainer(session, sessionId, client)], flags: MessageFlags.IsComponentsV2 });
    } catch (e) {}
}

async function showFieldsMenu(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    const fields = session?.fields || [];
    
    const container = new ContainerBuilder().setAccentColor(0x5865F2);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📋 Field Manager\n**Current Fields:** ${fields.length}/25`));
    
    let fieldsText = fields.length === 0 ? '*No fields added yet*' : fields.map((f, i) => `**${i+1}. ${f.name}**${f.inline ? ' (inline)' : ''}\n${f.value.substring(0, 100)}`).join('\n\n');
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fieldsText));
    container.addSeparatorComponents(new SeparatorBuilder());

    const rows = [];
    const addRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`embed_field_add_${sessionId}`).setLabel('Add Field').setStyle(ButtonStyle.Success).setEmoji('➕'),
        new ButtonBuilder().setCustomId(`embed_field_clear_${sessionId}`).setLabel('Clear All').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
        new ButtonBuilder().setCustomId(`embed_back_${sessionId}`).setLabel('Back').setStyle(ButtonStyle.Secondary).setEmoji('↩️')
    );
    rows.push(addRow);

    let currentRow = new ActionRowBuilder();
    let buttonCount = 0;
    fields.forEach((field, index) => {
        if (buttonCount === 5) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            buttonCount = 0;
        }
        currentRow.addComponents(new ButtonBuilder().setCustomId(`embed_field_remove_${sessionId}_${index}`).setLabel(`${index + 1}. ${field.name.substring(0, 20)}`).setStyle(ButtonStyle.Danger).setEmoji('❌'));
        buttonCount++;
    });
    if (buttonCount > 0) rows.push(currentRow);

    for (const row of rows) container.addActionRowComponents(row);

    // ⭐ WICHTIG: Wenn es ein Button war, updaten wir die Nachricht. Wenn ein Modal, nutzen wir editReply (wird oben schon abgefangen)
    if (!interaction.replied && !interaction.deferred) {
        await interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
}

async function showEmbedCode(interaction, sessionId) {
    const code = getEmbedCode(embedSessions.get(sessionId));
    if (code.length > 1900) {
        const parts = code.match(/(.|[\r\n]){1,1900}/g);
        for (let i = 0; i < parts.length; i++) await interaction.followUp({ content: `\`\`\`json\n${parts[i]}\n\`\`\``, ephemeral: true });
        await interaction.reply({ content: '✅ Embed code sent above!', ephemeral: true });
    } else {
        await interaction.reply({ content: `\`\`\`json\n${code}\n\`\`\``, ephemeral: true });
    }
}

async function showEmbedPreview(interaction, sessionId) {
    await interaction.reply({ embeds: [createEmbedFromData(embedSessions.get(sessionId))], ephemeral: true });
}

async function sendEmbed(interaction, sessionId, message) {
    await message.channel.send({ embeds: [createEmbedFromData(embedSessions.get(sessionId))] });
    embedSessions.delete(sessionId);
    await interaction.update({ content: '✅ Embed has been sent!', components: [], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
    embedCreate,
    embedSessions,
    createEmbedFromData,
    getEmbedCode
};
