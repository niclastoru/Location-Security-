const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// Helper: Build embed
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = []) {
    const embed = new EmbedBuilder()
        .setColor(type === 'success' ? 0x57F287 : type === 'error' ? 0xED4245 : type === 'warn' ? 0xFEE75C : 0x5865F2)
        .setAuthor({ name: client.user?.username || 'Bot', iconURL: client.user?.displayAvatarURL() })
        .setTitle(type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : type === 'warn' ? '⚠️ ' : 'ℹ️ ')
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

// Helper: Get role from mention, ID, or name
async function getRoleFromInput(message, input) {
    // Try mention first
    let role = message.mentions.roles.first();
    if (role) return role;
    
    // Try ID
    if (input) {
        role = message.guild.roles.cache.get(input);
        if (role) return role;
        
        // Try name (case insensitive)
        role = message.guild.roles.cache.find(r => r.name.toLowerCase() === input.toLowerCase());
        if (role) return role;
    }
    
    return null;
}

module.exports = {
    category: 'Moderation',
    subCommands: {
        
        // ========== ROLE CREATE ==========
        rolecreate: {
            aliases: ['createrole', 'addrole', 'rc'],
            permissions: 'ManageRoles',
            description: 'Creates a new role',
            category: 'Moderation',
            async execute(message, args, { client }) {
                if (!args.length) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Role Create', 'Usage: `!rolecreate <name> [color] [hoist] [mentionable]`\n\n**Examples:**\n• `!rolecreate Member`\n• `!rolecreate Admin #FF0000`\n• `!rolecreate VIP FF9900 true`\n• `!rolecreate Support 00FF00 false true`\n\n**Color:** Hex code (FF5733) or name (red, blue, green)'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                // Parse role name (first argument)
                let roleName = args[0];
                let color = null;
                let hoist = false;
                let mentionable = false;
                
                // Check for color (second argument)
                if (args[1]) {
                    color = args[1];
                    
                    // Check for hoist (third argument)
                    if (args[2] && args[2].toLowerCase() === 'true') {
                        hoist = true;
                    }
                    
                    // Check for mentionable (fourth argument)
                    if (args[3] && args[3].toLowerCase() === 'true') {
                        mentionable = true;
                    }
                }
                
                // Parse color
                let roleColor = null;
                const colorNames = {
                    red: '#FF0000',
                    green: '#00FF00',
                    blue: '#0000FF',
                    yellow: '#FFFF00',
                    purple: '#800080',
                    orange: '#FFA500',
                    pink: '#FFC0CB',
                    black: '#000000',
                    white: '#FFFFFF',
                    gray: '#808080',
                    cyan: '#00FFFF',
                    magenta: '#FF00FF',
                    gold: '#FFD700',
                    silver: '#C0C0C0',
                    bronze: '#CD7F32'
                };
                
                if (color) {
                    // Check if color is a name
                    if (colorNames[color.toLowerCase()]) {
                        roleColor = colorNames[color.toLowerCase()];
                    } 
                    // Check if color is hex (with or without #)
                    else if (/^#?[0-9A-Fa-f]{6}$/.test(color)) {
                        roleColor = color.startsWith('#') ? color : `#${color}`;
                    }
                    // Check if color is hex (shorthand 3 digit)
                    else if (/^#?[0-9A-Fa-f]{3}$/.test(color)) {
                        const hex = color.replace('#', '');
                        roleColor = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
                    }
                    else {
                        const embed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'error',
                            'Invalid Color', 'Invalid color format! Use hex code (FF5733) or color name (red, blue, green, etc.)'
                        );
                        return message.reply({ embeds: [embed] });
                    }
                }
                
                // Check if role already exists
                const existingRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
                if (existingRole) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Role Exists', `A role named **${roleName}** already exists!`
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                try {
                    // Create the role
                    const newRole = await message.guild.roles.create({
                        name: roleName,
                        color: roleColor,
                        hoist: hoist,
                        mentionable: mentionable,
                        reason: `Created by ${message.author.tag}`
                    });
                    
                    const fields = [
                        { name: '📛 Name', value: newRole.name, inline: true },
                        { name: '🎨 Color', value: newRole.hexColor || 'Default', inline: true },
                        { name: '📌 Display Separately', value: hoist ? '✅ Yes' : '❌ No', inline: true },
                        { name: '💬 Mentionable', value: mentionable ? '✅ Yes' : '❌ No', inline: true },
                        { name: '🆔 ID', value: newRole.id, inline: true }
                    ];
                    
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'success',
                        'Role Created', `Successfully created role ${newRole}!`,
                        fields
                    );
                    
                    return message.reply({ embeds: [embed] });
                    
                } catch (error) {
                    console.error('Role Create Error:', error);
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Error', `Could not create role: ${error.message}`
                    );
                    return message.reply({ embeds: [embed] });
                }
            }
        },
        
        // ========== ROLE ICON ==========
        roleicon: {
            aliases: ['role-icon', 'setroleicon', 'ri'],
            permissions: 'ManageRoles',
            description: 'Sets an icon/emoji for a role (displayed next to role name)',
            category: 'Moderation',
            async execute(message, args, { client }) {
                if (args.length < 2) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Role Icon', 'Usage: `!roleicon <role> <emoji>`\n\n**Examples:**\n• `!roleicon @Mod ⚔️`\n• `!roleicon Admin 👑`\n• `!roleicon Support 🛡️`\n• `!roleicon Member ✅`\n\n**Remove icon:** `!roleicon @Role remove`'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                // Get role
                const roleInput = args[0];
                const role = await getRoleFromInput(message, roleInput);
                
                if (!role) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Role Not Found', `Could not find role: **${roleInput}**`
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                // Check permissions
                if (!role.editable) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Cannot Edit', `I cannot edit the role **${role.name}**! Make sure my role is higher than this role.`
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                const emojiInput = args[1];
                
                // Check if removing icon
                if (emojiInput.toLowerCase() === 'remove' || emojiInput.toLowerCase() === 'delete' || emojiInput.toLowerCase() === 'none') {
                    try {
                        await role.setIcon(null);
                        const embed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'success',
                            'Role Icon Removed', `Removed icon from role ${role}`
                        );
                        return message.reply({ embeds: [embed] });
                    } catch (error) {
                        const embed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'error',
                            'Error', `Could not remove icon: ${error.message}`
                        );
                        return message.reply({ embeds: [embed] });
                    }
                }
                
                // Check if input is a custom emoji or standard emoji
                let emojiId = null;
                let emojiName = null;
                let animated = false;
                
                // Custom emoji format: <:name:123456789> or <a:name:123456789> (animated)
                const customEmojiRegex = /<a?:(\w+):(\d+)>/;
                const match = emojiInput.match(customEmojiRegex);
                
                if (match) {
                    // Custom emoji
                    emojiName = match[1];
                    emojiId = match[2];
                    animated = emojiInput.startsWith('<a:');
                    
                    // Check if bot has the emoji (optional)
                    const emoji = message.guild.emojis.cache.get(emojiId);
                    if (!emoji) {
                        const embed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'warn',
                            'Emoji Not Found', `Could not find that emoji in this server.\nUsing it anyway...`
                        );
                        await message.reply({ embeds: [embed] });
                    }
                } else {
                    // Standard Unicode emoji
                    emojiName = emojiInput;
                }
                
                // Role icon is only available for boosted servers (Level 2+)
                const guildLevel = message.guild.premiumTier;
                
                if (guildLevel < 2 && emojiId) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'warn',
                        'Boost Required', `Custom role icons require **Server Boost Level 2** (7 boosts).\nYour server is Level ${guildLevel}.\n\nYou can use standard Unicode emojis instead: \`!roleicon ${role.name} 🛡️\``
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                try {
                    // Set the role icon
                    if (emojiId) {
                        // Custom emoji
                        await role.setIcon(emojiId);
                    } else {
                        // Unicode emoji - role.icon uses unicode directly
                        await role.setIcon(emojiName);
                    }
                    
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'success',
                        'Role Icon Set', `${emojiInput} ${role} now has this icon!\n\nRole: **${role.name}**\nIcon: ${emojiInput}`
                    );
                    
                    return message.reply({ embeds: [embed] });
                    
                } catch (error) {
                    console.error('Role Icon Error:', error);
                    
                    let errorMessage = error.message;
                    if (error.code === 50035) {
                        errorMessage = 'Invalid emoji format. Please provide a valid emoji.';
                    }
                    
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Error', `Could not set role icon: ${errorMessage}`
                    );
                    return message.reply({ embeds: [embed] });
                }
            }
        },
        
        // ========== ROLE DELETE ==========
        roledelete: {
            aliases: ['deleterole', 'delrole', 'rd'],
            permissions: 'ManageRoles',
            description: 'Deletes a role',
            category: 'Moderation',
            async execute(message, args, { client }) {
                if (!args.length) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Role Delete', 'Usage: `!roledelete <role>`\n\n**Examples:**\n• `!roledelete @Mod`\n• `!roledelete Admin`\n• `!roledelete 123456789012345678`'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                const role = await getRoleFromInput(message, args[0]);
                
                if (!role) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Role Not Found', `Could not find role: **${args[0]}**`
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                // Cannot delete @everyone
                if (role.id === message.guild.id) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Cannot Delete', 'You cannot delete the @everyone role!'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                if (!role.editable) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Cannot Delete', `I cannot delete the role **${role.name}**! Make sure my role is higher than this role.`
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                // Confirmation
                const confirmEmbed = await buildEmbed(
                    client, message.guild.id, message.author.id, 'warn',
                    'Confirm Delete', `Are you sure you want to delete role **${role.name}**?\n\nType **\`confirm\`** within 10 seconds to proceed.`,
                    [{ name: '⚠️ Warning', value: 'This action cannot be undone!', inline: false }]
                );
                
                const confirmMsg = await message.reply({ embeds: [confirmEmbed] });
                
                const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
                
                try {
                    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] });
                    
                    if (collected.first()) {
                        const roleName = role.name;
                        await role.delete();
                        
                        const embed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'success',
                            'Role Deleted', `Successfully deleted role **${roleName}**!`
                        );
                        
                        try {
                            await message.reply({ embeds: [embed] });
                        } catch (e) {
                            console.log('Role deleted, could not send reply');
                        }
                    } else {
                        const cancelEmbed = await buildEmbed(
                            client, message.guild.id, message.author.id, 'info',
                            'Cancelled', 'Role deletion cancelled.'
                        );
                        await confirmMsg.edit({ embeds: [cancelEmbed] });
                    }
                } catch (error) {
                    const timeoutEmbed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'info',
                        'Timeout', 'Role deletion cancelled (timeout).'
                    );
                    await confirmMsg.edit({ embeds: [timeoutEmbed] });
                }
            }
        },
        
        // ========== ROLE COLOR ==========
        rolecolor: {
            aliases: ['role-color', 'setrolecolor', 'rc'],
            permissions: 'ManageRoles',
            description: 'Changes a role\'s color',
            category: 'Moderation',
            async execute(message, args, { client }) {
                if (args.length < 2) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Role Color', 'Usage: `!rolecolor <role> <color>`\n\n**Examples:**\n• `!rolecolor @Mod #FF0000`\n• `!rolecolor Admin red`\n• `!rolecolor Support 00FF00`'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                const role = await getRoleFromInput(message, args[0]);
                
                if (!role) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Role Not Found', `Could not find role: **${args[0]}**`
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                if (!role.editable) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Cannot Edit', `I cannot edit the role **${role.name}**!`
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                let color = args[1];
                let roleColor = null;
                
                const colorNames = {
                    red: '#FF0000', green: '#00FF00', blue: '#0000FF',
                    yellow: '#FFFF00', purple: '#800080', orange: '#FFA500',
                    pink: '#FFC0CB', black: '#000000', white: '#FFFFFF',
                    gray: '#808080', cyan: '#00FFFF', magenta: '#FF00FF',
                    gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32'
                };
                
                if (colorNames[color.toLowerCase()]) {
                    roleColor = colorNames[color.toLowerCase()];
                } else if (/^#?[0-9A-Fa-f]{6}$/.test(color)) {
                    roleColor = color.startsWith('#') ? color : `#${color}`;
                } else if (/^#?[0-9A-Fa-f]{3}$/.test(color)) {
                    const hex = color.replace('#', '');
                    roleColor = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
                } else {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Invalid Color', 'Invalid color format! Use hex code (FF5733) or color name.'
                    );
                    return message.reply({ embeds: [embed] });
                }
                
                try {
                    await role.setColor(roleColor);
                    
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'success',
                        'Role Color Changed', `Changed color of ${role} to \`${roleColor}\``
                    );
                    
                    return message.reply({ embeds: [embed] });
                } catch (error) {
                    const embed = await buildEmbed(
                        client, message.guild.id, message.author.id, 'error',
                        'Error', `Could not change color: ${error.message}`
                    );
                    return message.reply({ embeds: [embed] });
                }
            }
        }
    }
};
