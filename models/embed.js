const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

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

// Helper: Get embed code (JSON)
function getEmbedCode(data) {
    const embed = createEmbedFromData(data);
    return JSON.stringify(embed.toJSON(), null, 2);
}

// Main embed builder function
async function embedCreate(message, args, client, supabase) {
    const embedName = args[0]?.toLowerCase();
    
    if (!embedName) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('❌ Error')
            .setDescription('Please provide a name for your embed!\nUsage: `!embed create <name>`\nExample: `!embed create welcome`')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    const sessionId = `embed_${message.author.id}_${embedName}_${Date.now()}`;
    
    // Store session
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
    
    // Create buttons
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_basic_${sessionId}`)
                .setLabel('Edit Basic Info')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId(`embed_author_${sessionId}`)
                .setLabel('Edit Author')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('👤'),
            new ButtonBuilder()
                .setCustomId(`embed_footer_${sessionId}`)
                .setLabel('Edit Footer')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📌')
        );
    
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_images_${sessionId}`)
                .setLabel('Edit Images')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🖼️'),
            new ButtonBuilder()
                .setCustomId(`embed_fields_${sessionId}`)
                .setLabel('Edit Fields')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId(`embed_code_${sessionId}`)
                .setLabel('Code')
                .setStyle(ButtonStyle.Success)
                .setEmoji('</>')
        );
    
    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_preview_${sessionId}`)
                .setLabel('Preview')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👁️'),
            new ButtonBuilder()
                .setCustomId(`embed_send_${sessionId}`)
                .setLabel('Send')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📤'),
            new ButtonBuilder()
                .setCustomId(`embed_cancel_${sessionId}`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
        );
    
    const session = embedSessions.get(sessionId);
    
    const infoEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`🎨 Embed Builder: ${embedName}`)
        .setDescription(`Use the buttons below to customize this embed.\nYou can click the **Code** button to copy this embed or use **Preview** to show this embed.`)
        .addFields([
            { name: '📝 Title', value: session.title || 'Not set', inline: true },
            { name: '🎨 Color', value: session.color, inline: true },
            { name: '📄 Description', value: session.description ? session.description.substring(0, 30) + '...' : 'Not set', inline: false },
            { name: '👤 Author', value: session.author_name || 'Not set', inline: true },
            { name: '📌 Footer', value: session.footer_text || 'Not set', inline: true },
            { name: '📋 Fields', value: `${session.fields.length} fields`, inline: true }
        ])
        .setFooter({ text: `Embed: ${embedName} • Session ID: ${sessionId.slice(-8)}` })
        .setTimestamp();
    
    const msg = await message.reply({
        embeds: [infoEmbed],
        components: [row1, row2, row3]
    });
    
    // Create collector
    const filter = (i) => i.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter, time: 600000 });
    
    collector.on('collect', async (interaction) => {
        if (interaction.customId === `embed_basic_${sessionId}`) {
            await showBasicInfoModal(interaction, sessionId);
        }
        else if (interaction.customId === `embed_author_${sessionId}`) {
            await showAuthorModal(interaction, sessionId);
        }
        else if (interaction.customId === `embed_footer_${sessionId}`) {
            await showFooterModal(interaction, sessionId);
        }
        else if (interaction.customId === `embed_images_${sessionId}`) {
            await showImagesModal(interaction, sessionId);
        }
        else if (interaction.customId === `embed_fields_${sessionId}`) {
            await showFieldsMenu(interaction, sessionId);
        }
        else if (interaction.customId === `embed_code_${sessionId}`) {
            await showEmbedCode(interaction, sessionId);
        }
        else if (interaction.customId === `embed_preview_${sessionId}`) {
            await showEmbedPreview(interaction, sessionId);
        }
        else if (interaction.customId === `embed_send_${sessionId}`) {
            await sendEmbed(interaction, sessionId, message);
            collector.stop();
        }
        else if (interaction.customId === `embed_cancel_${sessionId}`) {
            embedSessions.delete(sessionId);
            await interaction.update({ content: '❌ Embed builder cancelled.', embeds: [], components: [] });
            collector.stop();
        }
        else if (interaction.customId.startsWith(`embed_field_remove_`)) {
            const fieldId = parseInt(interaction.customId.split('_')[3]);
            const session = embedSessions.get(sessionId);
            if (session && session.fields[fieldId]) {
                session.fields.splice(fieldId, 1);
                embedSessions.set(sessionId, session);
                await updateEmbedInfo(interaction, sessionId, msg);
                await showFieldsMenu(interaction, sessionId);
            }
            await interaction.deferUpdate();
        }
        else if (interaction.customId === `embed_field_add_${sessionId}`) {
            await showAddFieldModal(interaction, sessionId);
        }
        else if (interaction.customId === `embed_field_clear_${sessionId}`) {
            const session = embedSessions.get(sessionId);
            if (session) {
                session.fields = [];
                embedSessions.set(sessionId, session);
                await updateEmbedInfo(interaction, sessionId, msg);
                await showFieldsMenu(interaction, sessionId);
            }
            await interaction.deferUpdate();
        }
    });
    
    // Handle modals
    const modalFilter = (i) => i.customId.includes(sessionId) && i.user.id === message.author.id;
    const modalCollector = message.channel.createMessageComponentCollector({ filter: modalFilter, time: 600000 });
    
    modalCollector.on('collect', async (modalInteraction) => {
        if (!modalInteraction.isModalSubmit()) return;
        
        const session = embedSessions.get(sessionId);
        const modalId = modalInteraction.customId;
        
        if (modalId === `embed_basic_modal_${sessionId}`) {
            session.title = modalInteraction.fields.getTextInputValue('title') || null;
            session.description = modalInteraction.fields.getTextInputValue('description') || null;
            let color = modalInteraction.fields.getTextInputValue('color');
            if (!color.startsWith('#')) color = `#${color}`;
            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) color = '#2B2D31';
            session.color = color;
            const timestampVal = modalInteraction.fields.getTextInputValue('timestamp')?.toLowerCase();
            session.timestamp = timestampVal === 'yes' || timestampVal === 'true' || timestampVal === 'on';
            embedSessions.set(sessionId, session);
            await updateEmbedInfo(modalInteraction, sessionId, msg);
            await modalInteraction.deferUpdate();
        }
        else if (modalId === `embed_author_modal_${sessionId}`) {
            session.author_name = modalInteraction.fields.getTextInputValue('name') || null;
            session.author_icon = modalInteraction.fields.getTextInputValue('icon') || null;
            session.author_url = modalInteraction.fields.getTextInputValue('url') || null;
            embedSessions.set(sessionId, session);
            await updateEmbedInfo(modalInteraction, sessionId, msg);
            await modalInteraction.deferUpdate();
        }
        else if (modalId === `embed_footer_modal_${sessionId}`) {
            session.footer_text = modalInteraction.fields.getTextInputValue('text') || null;
            session.footer_icon = modalInteraction.fields.getTextInputValue('icon') || null;
            embedSessions.set(sessionId, session);
            await updateEmbedInfo(modalInteraction, sessionId, msg);
            await modalInteraction.deferUpdate();
        }
        else if (modalId === `embed_images_modal_${sessionId}`) {
            session.thumbnail_url = modalInteraction.fields.getTextInputValue('thumbnail') || null;
            session.image_url = modalInteraction.fields.getTextInputValue('image') || null;
            embedSessions.set(sessionId, session);
            await updateEmbedInfo(modalInteraction, sessionId, msg);
            await modalInteraction.deferUpdate();
        }
        else if (modalId === `embed_field_add_modal_${sessionId}`) {
            const name = modalInteraction.fields.getTextInputValue('name');
            const value = modalInteraction.fields.getTextInputValue('value');
            const inlineRaw = modalInteraction.fields.getTextInputValue('inline')?.toLowerCase();
            const inline = inlineRaw === 'yes' || inlineRaw === 'true';
            
            session.fields.push({ name, value, inline });
            embedSessions.set(sessionId, session);
            await updateEmbedInfo(modalInteraction, sessionId, msg);
            await modalInteraction.deferUpdate();
            await showFieldsMenu(modalInteraction, sessionId);
        }
    });
}

async function showBasicInfoModal(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_basic_modal_${sessionId}`)
        .setTitle('Edit Basic Information');
    
    const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Title')
        .setPlaceholder('Enter embed title...')
        .setValue(session.title || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    const descInput = new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Description')
        .setPlaceholder('Enter embed description...')
        .setValue(session.description || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Paragraph);
    
    const colorInput = new TextInputBuilder()
        .setCustomId('color')
        .setLabel('Color (Hex)')
        .setPlaceholder('#2B2D31')
        .setValue(session.color)
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    const timestampInput = new TextInputBuilder()
        .setCustomId('timestamp')
        .setLabel('Timestamp (yes/no)')
        .setPlaceholder('yes or no')
        .setValue(session.timestamp ? 'yes' : 'no')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(descInput),
        new ActionRowBuilder().addComponents(colorInput),
        new ActionRowBuilder().addComponents(timestampInput)
    );
    
    await interaction.showModal(modal);
}

async function showAuthorModal(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_author_modal_${sessionId}`)
        .setTitle('Edit Author');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Author Name')
        .setPlaceholder('e.g., John Doe')
        .setValue(session.author_name || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    const iconInput = new TextInputBuilder()
        .setCustomId('icon')
        .setLabel('Icon URL')
        .setPlaceholder('https://...')
        .setValue(session.author_icon || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    const urlInput = new TextInputBuilder()
        .setCustomId('url')
        .setLabel('Author URL')
        .setPlaceholder('https://...')
        .setValue(session.author_url || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(iconInput),
        new ActionRowBuilder().addComponents(urlInput)
    );
    
    await interaction.showModal(modal);
}

async function showFooterModal(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_footer_modal_${sessionId}`)
        .setTitle('Edit Footer');
    
    const textInput = new TextInputBuilder()
        .setCustomId('text')
        .setLabel('Footer Text')
        .setPlaceholder('e.g., Powered by Bot')
        .setValue(session.footer_text || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    const iconInput = new TextInputBuilder()
        .setCustomId('icon')
        .setLabel('Icon URL')
        .setPlaceholder('https://...')
        .setValue(session.footer_icon || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(textInput),
        new ActionRowBuilder().addComponents(iconInput)
    );
    
    await interaction.showModal(modal);
}

async function showImagesModal(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    
    const modal = new ModalBuilder()
        .setCustomId(`embed_images_modal_${sessionId}`)
        .setTitle('Edit Images');
    
    const thumbnailInput = new TextInputBuilder()
        .setCustomId('thumbnail')
        .setLabel('Thumbnail URL')
        .setPlaceholder('https://...')
        .setValue(session.thumbnail_url || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    const imageInput = new TextInputBuilder()
        .setCustomId('image')
        .setLabel('Image URL')
        .setPlaceholder('https://...')
        .setValue(session.image_url || '')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(thumbnailInput),
        new ActionRowBuilder().addComponents(imageInput)
    );
    
    await interaction.showModal(modal);
}

async function showFieldsMenu(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    const fields = session?.fields || [];
    
    const rows = [];
    
    const addRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_field_add_${sessionId}`)
                .setLabel('Add Field')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId(`embed_field_clear_${sessionId}`)
                .setLabel('Clear All')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
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
        currentRow.addComponents(
            new ButtonBuilder()
                .setCustomId(`embed_field_remove_${sessionId}_${index}`)
                .setLabel(`${index + 1}. ${field.name.substring(0, 30)}`)
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );
        buttonCount++;
    });
    
    if (buttonCount > 0) {
        rows.push(currentRow);
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('📋 Field Manager')
        .setDescription(`**Current Fields:** ${fields.length}/25\n\n${fields.map((f, i) => `${i+1}. **${f.name}**${f.inline ? ' (inline)' : ''}\n   ${f.value.substring(0, 100)}...`).join('\n\n') || '*No fields added yet*'}`);
    
    await interaction.update({ embeds: [embed], components: rows });
}

async function showAddFieldModal(interaction, sessionId) {
    const modal = new ModalBuilder()
        .setCustomId(`embed_field_add_modal_${sessionId}`)
        .setTitle('Add Field');
    
    const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Field Name')
        .setPlaceholder('e.g., Information')
        .setRequired(true)
        .setStyle(TextInputStyle.Short);
    
    const valueInput = new TextInputBuilder()
        .setCustomId('value')
        .setLabel('Field Value')
        .setPlaceholder('The content of the field...')
        .setRequired(true)
        .setStyle(TextInputStyle.Paragraph);
    
    const inlineInput = new TextInputBuilder()
        .setCustomId('inline')
        .setLabel('Inline? (yes/no)')
        .setPlaceholder('yes or no')
        .setRequired(false)
        .setStyle(TextInputStyle.Short);
    
    modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(valueInput),
        new ActionRowBuilder().addComponents(inlineInput)
    );
    
    await interaction.showModal(modal);
}

async function showEmbedCode(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    const code = getEmbedCode(session);
    
    if (code.length > 1900) {
        const parts = code.match(/(.|[\r\n]){1,1900}/g);
        for (let i = 0; i < parts.length; i++) {
            await interaction.followUp({ 
                content: `\`\`\`json\n${parts[i]}\n\`\`\``,
                ephemeral: true 
            });
        }
        await interaction.reply({ content: '✅ Embed code sent above!', ephemeral: true });
    } else {
        await interaction.reply({ 
            content: `\`\`\`json\n${code}\n\`\`\``,
            ephemeral: true 
        });
    }
}

async function showEmbedPreview(interaction, sessionId) {
    const session = embedSessions.get(sessionId);
    const embed = createEmbedFromData(session);
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function sendEmbed(interaction, sessionId, message) {
    const session = embedSessions.get(sessionId);
    const embed = createEmbedFromData(session);
    
    await message.channel.send({ embeds: [embed] });
    await interaction.update({ content: '✅ Embed has been sent!', embeds: [], components: [] });
    embedSessions.delete(sessionId);
}

async function updateEmbedInfo(interaction, sessionId, msg) {
    const session = embedSessions.get(sessionId);
    
    const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle(`🎨 Embed Builder: ${session.name}`)
        .setDescription(`Use the buttons below to customize this embed.\nYou can click the **Code** button to copy this embed or use **Preview** to show this embed.`)
        .addFields([
            { name: '📝 Title', value: session.title || 'Not set', inline: true },
            { name: '🎨 Color', value: session.color, inline: true },
            { name: '📄 Description', value: session.description ? session.description.substring(0, 30) + '...' : 'Not set', inline: false },
            { name: '👤 Author', value: session.author_name || 'Not set', inline: true },
            { name: '📌 Footer', value: session.footer_text || 'Not set', inline: true },
            { name: '📋 Fields', value: `${session.fields.length} fields`, inline: true }
        ])
        .setFooter({ text: `Embed: ${session.name} • Session ID: ${sessionId.slice(-8)}` })
        .setTimestamp();
    
    await msg.edit({ embeds: [embed] });
    await interaction.deferUpdate();
}

module.exports = {
    embedCreate,
    embedSessions,
    createEmbedFromData,
    getEmbedCode
};
