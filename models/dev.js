const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// ⭐ Developer only - dev.js
// Dieser Command ist NUR für den Bot-Entwickler (dich)

module.exports = {
    category: 'Developer',
    subCommands: {
        
        // ========== SEND DM TO USER ==========
        dm: {
            aliases: ['senddm', 'dmuser'],
            description: 'Send a direct message to a user by ID',
            category: 'Developer',
            // Keine permissions, wird manuell geprüft
            async execute(message, args, { client }) {
                // Check if author is bot owner (deine User ID)
                const developerIds = [
                    '1487615239834046765',  // Deine Discord User ID - HIER EINTRAGEN!
                    // Füge hier weitere Developer IDs hinzu falls nötig
                ];
                
                if (!developerIds.includes(message.author.id)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('❌ Access Denied')
                        .setDescription('This command is only available to the bot developer.')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const userId = args[0];
                const dmMessage = args.slice(1).join(' ');
                
                if (!userId) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('❌ Missing User ID')
                        .setDescription('Usage: `!dm <user_id> <message>`\n\nExample: `!dm 123456789012345678 Hello!`')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!dmMessage) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('❌ Missing Message')
                        .setDescription('Usage: `!dm <user_id> <message>`\n\nExample: `!dm 123456789012345678 Hello!`')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                try {
                    // Fetch user
                    const user = await client.users.fetch(userId);
                    
                    if (!user) {
                        const embed = new EmbedBuilder()
                            .setColor(0xED4245)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle('❌ User Not Found')
                            .setDescription(`Could not find user with ID: \`${userId}\``)
                            .setTimestamp();
                        return message.reply({ embeds: [embed] });
                    }
                    
                    // Send DM
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('📨 Direct Message')
                        .setDescription(dmMessage)
                        .setFooter({ text: `Sent by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                        .setTimestamp();
                    
                    await user.send({ embeds: [dmEmbed] });
                    
                    // Success response
                    const successEmbed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('✅ DM Sent')
                        .setDescription(`Successfully sent a DM to **${user.tag}** (\`${userId}\`)`)
                        .addFields([
                            { name: 'Message', value: dmMessage.length > 500 ? dmMessage.substring(0, 500) + '...' : dmMessage, inline: false }
                        ])
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [successEmbed] });
                    
                } catch (error) {
                    console.error('DM Error:', error);
                    
                    let errorMessage = 'Could not send DM to this user.';
                    if (error.code === 50007) {
                        errorMessage = 'Cannot send DM to this user (DMs disabled or bot blocked).';
                    } else if (error.code === 10013) {
                        errorMessage = 'User not found.';
                    }
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('❌ Failed to Send DM')
                        .setDescription(errorMessage)
                        .addFields([
                            { name: 'User ID', value: userId, inline: true },
                            { name: 'Error', value: `\`${error.message}\``, inline: false }
                        ])
                        .setTimestamp();
                    
                    return message.reply({ embeds: [errorEmbed] });
                }
            }
        },
        
        // ========== BROADCAST DM ==========
        broadcast: {
            aliases: ['bc', 'massdm'],
            description: 'Send a broadcast DM to all server members (Befehl in einem Server ausführen)',
            category: 'Developer',
            async execute(message, args, { client, supabase }) {
                // Developer check
                const developerIds = [
                    '1487615239834046765',  // Deine Discord User ID
                ];
                
                if (!developerIds.includes(message.author.id)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not authorized to use this command.')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!message.guild) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ This command must be used in a server.')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const broadcastMessage = args.join(' ');
                
                if (!broadcastMessage) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('❌ Missing Message')
                        .setDescription('Usage: `!broadcast <message>`\n\n⚠️ This will DM **ALL** members in this server!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                // Confirmation
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('⚠️ Confirmation Required')
                    .setDescription(`Are you sure you want to send a broadcast DM to **ALL** members of **${message.guild.name}**?\n\n**Message:**\n${broadcastMessage}\n\nType \`confirm\` within 30 seconds to proceed.`)
                    .setTimestamp();
                
                await message.reply({ embeds: [confirmEmbed] });
                
                const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
                
                if (!collected) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Broadcast cancelled (timeout).')
                        .setTimestamp();
                    return message.reply({ embeds: [timeoutEmbed] });
                }
                
                // Send broadcast
                const members = message.guild.members.cache.filter(m => !m.user.bot);
                let successCount = 0;
                let failCount = 0;
                
                const statusEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('📡 Sending Broadcast...')
                    .setDescription(`Sending to ${members.size} members...`)
                    .setTimestamp();
                
                const statusMsg = await message.reply({ embeds: [statusEmbed] });
                
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('📨 Broadcast Message')
                    .setDescription(broadcastMessage)
                    .setFooter({ text: `From ${message.guild.name} • ${message.author.tag}` })
                    .setTimestamp();
                
                for (const [id, member] of members) {
                    try {
                        await member.send({ embeds: [dmEmbed] });
                        successCount++;
                    } catch (error) {
                        failCount++;
                    }
                    
                    // Rate limit protection
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                const resultEmbed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('✅ Broadcast Complete')
                    .setDescription(`Broadcast sent to **${message.guild.name}**`)
                    .addFields([
                        { name: '✅ Success', value: `${successCount}`, inline: true },
                        { name: '❌ Failed', value: `${failCount}`, inline: true },
                        { name: '📊 Total', value: `${members.size}`, inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                await statusMsg.edit({ embeds: [resultEmbed] });
            }
        },
        
        // ========== EVAL (Execute Code) ==========
        eval: {
            aliases: ['e', 'exec'],
            description: 'Execute JavaScript code (Developer only)',
            category: 'Developer',
            async execute(message, args, { client }) {
                const developerIds = [
                    '1487615239834046765',  // Deine Discord User ID
                ];
                
                if (!developerIds.includes(message.author.id)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not authorized to use this command.')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const code = args.join(' ');
                
                if (!code) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('Usage: `!eval <code>`')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                try {
                    let result = eval(code);
                    
                    if (result instanceof Promise) {
                        result = await result;
                    }
                    
                    if (typeof result !== 'string') {
                        result = require('util').inspect(result, { depth: 0 });
                    }
                    
                    if (result.length > 1900) {
                        result = result.substring(0, 1900) + '...';
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: '📝 Eval Result', iconURL: client.user.displayAvatarURL() })
                        .setDescription(`\`\`\`js\n${result}\n\`\`\``)
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    await message.reply({ embeds: [embed] });
                    
                } catch (error) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setAuthor({ name: '❌ Eval Error', iconURL: client.user.displayAvatarURL() })
                        .setDescription(`\`\`\`js\n${error.message}\n\`\`\``)
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    await message.reply({ embeds: [embed] });
                }
            }
        },
        
        // ========== RELOAD COMMAND ==========
        reload: {
            aliases: ['r', 'reloadcmd'],
            description: 'Reload a command file (Developer only)',
            category: 'Developer',
            async execute(message, args, { client }) {
                const developerIds = [
                    '1487615239834046765',
                ];
                
                if (!developerIds.includes(message.author.id)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not authorized to use this command.')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const commandName = args[0]?.toLowerCase();
                
                if (!commandName) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('Usage: `!reload <command_name>`\nExample: `!reload moderation`')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                try {
                    // Find command
                    const command = client.commands.get(commandName);
                    
                    if (!command) {
                        const embed = new EmbedBuilder()
                            .setColor(0xED4245)
                            .setDescription(`❌ Command not found: \`${commandName}\``)
                            .setTimestamp();
                        return message.reply({ embeds: [embed] });
                    }
                    
                    // Clear cache and reload
                    const commandPath = require.resolve(`./${commandName}`);
                    delete require.cache[commandPath];
                    const newCommand = require(`./${commandName}`);
                    
                    // Update command collection
                    client.commands.set(commandName, newCommand);
                    if (newCommand.aliases) {
                        newCommand.aliases.forEach(alias => client.commands.set(alias, newCommand));
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x57F287)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('✅ Command Reloaded')
                        .setDescription(`Successfully reloaded command: **${commandName}**`)
                        .setTimestamp();
                    
                    await message.reply({ embeds: [embed] });
                    
                } catch (error) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`❌ Error reloading command: \`${error.message}\``)
                        .setTimestamp();
                    await message.reply({ embeds: [embed] });
                }
            }
        }
    }
};
