 const { EmbedBuilder, ChannelType } = require('discord.js');

// Helper: Build embed
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const embed = new EmbedBuilder()
        .setColor(type === 'success' ? 0x57F287 : type === 'error' ? 0xED4245 : 0x5865F2)
        .setAuthor({ name: client.user?.username || 'Bot', iconURL: client.user?.displayAvatarURL() })
        .setTitle(type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : 'ℹ️ ')
        .setDescription(descKey)
        .setTimestamp();
    
    if (userId) {
        const user = await client.users?.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    
    if (fields && fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

module.exports = {
    category: 'Server',
    subCommands: {
        
        // ========== DELETE CHANNEL (cd / channeldelete) ==========
        cd: {
            aliases: ['channeldelete', 'cdelete', 'delchannel', 'deletechannel'],
            permissions: 'ManageChannels',
            description: 'Deletes a channel (text or voice)',
            category: 'Server',
            async execute(message, args, { client }) {
                // Get target channel from mention or ID
                let targetChannel = message.mentions.channels.first();
                
                if (!targetChannel && args[0]) {
                    // Try to get by ID
                    targetChannel = message.guild.channels.cache.get(args[0]);
                }
                
                if (!targetChannel && args[0]) {
                    // Try to get by name
                    targetChannel = message.guild.channels.cache.find(c => 
                        c.name.toLowerCase() === args[0].toLowerCase()
                    );
                }
                
                if (!targetChannel) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'No Channel', 'Please mention a channel, provide an ID, or channel name!\n\n**Usage:** `,cd #channel`\n**Examples:**\n• `,cd #general`\n• `,cd 123456789012345678`\n• `,cd general`'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                // Cannot delete the channel where the command was executed
                if (targetChannel.id === message.channel.id) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Cannot Delete', 'You cannot delete the channel you are currently in!'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                // Check if channel is deletable
                if (!targetChannel.deletable) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Cannot Delete', 'I do not have permission to delete this channel!'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                const channelType = targetChannel.type === ChannelType.GuildText ? 'Text Channel' : 
                                   targetChannel.type === ChannelType.GuildVoice ? 'Voice Channel' : 
                                   targetChannel.type === ChannelType.GuildCategory ? 'Category' : 'Channel';
                
                // Send confirmation message
                const confirmEmbed = await buildEmbed(
                    client, message.guild.id, message.author.id, 'info',
                    'Confirm Delete', `Are you sure you want to delete **${channelType}** \`#${targetChannel.name}\`?\n\nType **\`confirm\`** within 10 seconds to proceed.`,
                    [{ name: '⚠️ Warning', value: 'This action cannot be undone!', inline: false }]
                );
                
                const confirmMsg = await message.reply({ embeds: [confirmEmbed] });
                
                // Wait for confirmation
                const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
                
                try {
                    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] });
                    
                    if (collected.first()) {
                        // Delete the channel
                        const channelName = targetChannel.name;
                        const channelTypeName = channelType;
                        
                        await targetChannel.delete();
                        
                        const successEmbed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'success',
                            'Channel Deleted', `Successfully deleted **${channelTypeName}** \`#${channelName}\`!`
                        );
                        
                        // Try to send confirmation in the same channel (if it still exists)
                        try {
                            await message.reply({ embeds: [successEmbed] });
                        } catch (e) {
                            console.log('Channel deleted, could not send reply');
                        }
                    } else {
                        const cancelEmbed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'info',
                            'Cancelled', 'Channel deletion cancelled.'
                        );
                        await confirmMsg.edit({ embeds: [cancelEmbed] });
                    }
                } catch (error) {
                    const timeoutEmbed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'info',
                        'Timeout', 'Channel deletion cancelled (timeout).'
                    );
                    await confirmMsg.edit({ embeds: [timeoutEmbed] });
                }
            }
        },
        
        // ========== DELETE CATEGORY (catdelete / cdelete) ==========
        catdelete: {
            aliases: ['categorydelete', 'delcategory', 'deletecategory', 'cdc'],
            permissions: 'ManageChannels',
            description: 'Deletes a category and ALL channels inside it',
            category: 'Server',
            async execute(message, args, { client }) {
                // Get target category from mention or ID
                let targetCategory = message.mentions.channels.first();
                
                if (!targetCategory && args[0]) {
                    targetCategory = message.guild.channels.cache.get(args[0]);
                }
                
                if (!targetCategory && args[0]) {
                    targetCategory = message.guild.channels.cache.find(c => 
                        c.name.toLowerCase() === args[0].toLowerCase() && c.type === ChannelType.GuildCategory
                    );
                }
                
                if (!targetCategory || targetCategory.type !== ChannelType.GuildCategory) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'No Category', 'Please mention a category, provide an ID, or category name!\n\n**Usage:** `,catdelete #category`\n**Examples:**\n• `,catdelete "Voice Channels"`\n• `,catdelete 123456789012345678`'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                if (!targetCategory.deletable) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Cannot Delete', 'I do not have permission to delete this category!'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                // Get all channels in the category
                const channelsInCategory = message.guild.channels.cache.filter(c => c.parentId === targetCategory.id);
                const channelList = channelsInCategory.map(c => `• #${c.name} (${c.type === ChannelType.GuildText ? 'Text' : 'Voice'})`).join('\n') || '*No channels in this category*';
                
                const confirmEmbed = await buildEmbed(
                    client, message.guild.id, message.author.id, 'warn',
                    '⚠️ Confirm Category Deletion', `Are you sure you want to delete category **${targetCategory.name}**?\n\n**Channels that will be deleted:**\n${channelList}\n\n⚠️ **This will delete ALL channels inside this category!**\n\nType **\`confirm\`** within 15 seconds to proceed.`
                );
                
                const confirmMsg = await message.reply({ embeds: [confirmEmbed] });
                
                const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
                
                try {
                    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
                    
                    if (collected.first()) {
                        const categoryName = targetCategory.name;
                        const deletedChannels = [];
                        
                        // Delete all channels in category first
                        for (const [id, channel] of channelsInCategory) {
                            if (channel.deletable) {
                                await channel.delete().catch(() => {});
                                deletedChannels.push(`#${channel.name}`);
                            }
                        }
                        
                        // Delete the category
                        await targetCategory.delete();
                        
                        const successEmbed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'success',
                            'Category Deleted', `✅ Deleted category **${categoryName}**\n\n**Deleted channels:**\n${deletedChannels.join('\n') || 'None'}`
                        );
                        
                        try {
                            await message.reply({ embeds: [successEmbed] });
                        } catch (e) {
                            console.log('Category deleted, could not send reply');
                        }
                    } else {
                        const cancelEmbed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'info',
                            'Cancelled', 'Category deletion cancelled.'
                        );
                        await confirmMsg.edit({ embeds: [cancelEmbed] });
                    }
                } catch (error) {
                    const timeoutEmbed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'info',
                        'Timeout', 'Category deletion cancelled (timeout).'
                    );
                    await confirmMsg.edit({ embeds: [timeoutEmbed] });
                }
            }
        },
        
        // ========== CHANNEL INFO (cinfo) ==========
        cinfo: {
            aliases: ['channelinfo', 'channelinfo'],
            description: 'Shows information about a channel',
            category: 'Server',
            async execute(message, args, { client }) {
                let targetChannel = message.mentions.channels.first() || message.channel;
                
                if (args[0] && !targetChannel) {
                    targetChannel = message.guild.channels.cache.get(args[0]);
                }
                
                if (args[0] && !targetChannel) {
                    targetChannel = message.guild.channels.cache.find(c => 
                        c.name.toLowerCase() === args[0].toLowerCase()
                    );
                }
                
                const channelType = targetChannel.type === ChannelType.GuildText ? '📝 Text Channel' : 
                                   targetChannel.type === ChannelType.GuildVoice ? '🎤 Voice Channel' : 
                                   targetChannel.type === ChannelType.GuildCategory ? '📁 Category' : '❓ Unknown';
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`ℹ️ Channel Info: #${targetChannel.name}`)
                    .addFields([
                        { name: 'ID', value: targetChannel.id, inline: true },
                        { name: 'Type', value: channelType, inline: true },
                        { name: 'Created', value: `<t:${Math.floor(targetChannel.createdTimestamp / 1000)}:R>`, inline: true },
                        { name: 'Position', value: `${targetChannel.position}`, inline: true },
                        { name: 'Category', value: targetChannel.parent ? targetChannel.parent.name : 'None', inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                if (targetChannel.type === ChannelType.GuildText) {
                    embed.addFields({ name: 'Topic', value: targetChannel.topic || 'None', inline: false });
                }
                
                if (targetChannel.type === ChannelType.GuildVoice) {
                    embed.addFields({ name: 'User Limit', value: targetChannel.userLimit === 0 ? 'Unlimited' : `${targetChannel.userLimit}`, inline: true });
                    embed.addFields({ name: 'Bitrate', value: `${targetChannel.bitrate / 1000} kbps`, inline: true });
                }
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
