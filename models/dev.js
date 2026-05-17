const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// ⭐ Developer only - dev.js
// Developer IDs (deine Discord User IDs)
const DEVELOPER_IDS = [
    '1487615239834046765',  // Deine Discord User ID
    // Füge hier weitere Developer IDs hinzu
];

// Helper: Check if user is developer
function isDeveloper(userId) {
    return DEVELOPER_IDS.includes(userId);
}

module.exports = {
    category: 'Developer',
    subCommands: {
        
        // ========== SEND DM TO USER ==========
        dm: {
            aliases: ['senddm', 'dmuser'],
            description: 'Send a direct message to a user by ID',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const userId = args[0];
                const dmMessage = args.slice(1).join(' ');
                
                if (!userId || !dmMessage) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Parameters', 'Usage: `!dm <user_id> <message>`')] });
                }
                
                try {
                    const user = await client.users.fetch(userId);
                    if (!user) throw new Error('User not found');
                    
                    // ⭐ KEIN Footer mehr mit "Sent by", nur noch Zeit
                    const dmEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('📨 Direct Message')
                        .setDescription(dmMessage)
                        .setTimestamp();  // Nur Zeit, kein Footer!
                    
                    await user.send({ embeds: [dmEmbed] });
                    
                    return message.reply({ embeds: [createSuccessEmbed(client, 'DM Sent', `Successfully sent DM to **${user.tag}**`)] });
                } catch (error) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Failed', `Could not send DM: ${error.message}`)] });
                }
            }
        },
        
        // ========== BROADCAST (OHNE FOOTER) ==========
        broadcast: {
            aliases: ['bc', 'massdm'],
            description: 'Send broadcast DM to all server members',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                if (!message.guild) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Error', 'This command must be used in a server.')] });
                }
                
                const broadcastMessage = args.join(' ');
                if (!broadcastMessage) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Message', 'Usage: `!broadcast <message>`')] });
                }
                
                // Confirmation
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setDescription(`⚠️ Send broadcast to **${message.guild.memberCount}** members?\n\n**Message:**\n${broadcastMessage}\n\nType \`confirm\` within 30 seconds.`)
                    .setTimestamp();
                
                await message.reply({ embeds: [confirmEmbed] });
                
                const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
                
                if (!collected) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Cancelled', 'Broadcast cancelled (timeout).')] });
                }
                
                const members = message.guild.members.cache.filter(m => !m.user.bot);
                let success = 0, fail = 0;
                
                const statusMsg = await message.reply({ embeds: [createInfoEmbed(client, 'Sending Broadcast...', `Sending to ${members.size} members...`)] });
                
                // ⭐ KEIN Footer mehr, nur Zeit
                const dmEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('📨 Broadcast')
                    .setDescription(broadcastMessage)
                    .setTimestamp();  // Nur Zeit, kein Footer!
                
                for (const [id, member] of members) {
                    try {
                        await member.send({ embeds: [dmEmbed] });
                        success++;
                    } catch { fail++; }
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                await statusMsg.edit({ embeds: [createSuccessEmbed(client, 'Broadcast Complete', `✅ Success: ${success} | ❌ Failed: ${fail}`)] });
            }
        },
        
        // ========== EVAL ==========
        eval: {
            aliases: ['e', 'exec'],
            description: 'Execute JavaScript code',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const code = args.join(' ');
                if (!code) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Code', 'Usage: `!eval <code>`')] });
                }
                
                try {
                    let result = eval(code);
                    if (result instanceof Promise) result = await result;
                    if (typeof result !== 'string') result = require('util').inspect(result, { depth: 0 });
                    if (result.length > 1900) result = result.substring(0, 1900) + '...';
                    
                    return message.reply({ embeds: [createSuccessEmbed(client, '📝 Eval Result', `\`\`\`js\n${result}\n\`\`\``)] });
                } catch (error) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Eval Error', `\`\`\`js\n${error.message}\n\`\`\``)] });
                }
            }
        },
        
        // ========== RELOAD COMMAND ==========
        reload: {
            aliases: ['r', 'reloadcmd'],
            description: 'Reload a command file',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const commandName = args[0]?.toLowerCase();
                if (!commandName) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Command', 'Usage: `!reload <command_name>`')] });
                }
                
                try {
                    delete require.cache[require.resolve(`./${commandName}`)];
                    const newCommand = require(`./${commandName}`);
                    client.commands.set(commandName, newCommand);
                    
                    return message.reply({ embeds: [createSuccessEmbed(client, 'Command Reloaded', `Successfully reloaded **${commandName}**`)] });
                } catch (error) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Reload Failed', error.message)] });
                }
            }
        },
        
        // ========== SERVERS LIST ==========
        servers: {
            aliases: ['guilds', 'serverlist'],
            description: 'Show all servers the bot is in',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const guilds = client.guilds.cache.map(g => `**${g.name}** - ${g.memberCount} members - \`${g.id}\``).join('\n');
                
                if (guilds.length > 4000) {
                    const chunks = guilds.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) {
                        await message.reply({ embeds: [createInfoEmbed(client, 'Server List', chunk)] });
                    }
                } else {
                    return message.reply({ embeds: [createInfoEmbed(client, `📊 Bot is in ${client.guilds.cache.size} Servers`, guilds)] });
                }
            }
        },
        
        // ========== LEAVE SERVER ==========
        leave: {
            aliases: ['leaveguild', 'leave server'],
            description: 'Make the bot leave a server',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const guildId = args[0];
                if (!guildId) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Server ID', 'Usage: `!leave <server_id>`\nUse `!servers` to see all server IDs.')] });
                }
                
                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Server Not Found', `No server found with ID: ${guildId}`)] });
                }
                
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setDescription(`⚠️ Make bot leave **${guild.name}**?\n\nType \`confirm\` within 15 seconds.`)
                    .setTimestamp();
                
                await message.reply({ embeds: [confirmEmbed] });
                
                const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] }).catch(() => null);
                
                if (!collected) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Cancelled', 'Leave cancelled (timeout).')] });
                }
                
                await guild.leave();
                return message.reply({ embeds: [createSuccessEmbed(client, 'Left Server', `Successfully left **${guild.name}**`)] });
            }
        },
        
        // ========== BOT STATS ==========
        botstats: {
            aliases: ['stats', 'botinfo'],
            description: 'Show detailed bot statistics',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
                const totalChannels = client.channels.cache.size;
                const uptime = formatUptime(client.uptime);
                const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🤖 Bot Statistics')
                    .addFields([
                        { name: '📊 Servers', value: `${client.guilds.cache.size}`, inline: true },
                        { name: '👥 Users', value: `${totalMembers}`, inline: true },
                        { name: '💬 Channels', value: `${totalChannels}`, inline: true },
                        { name: '⏰ Uptime', value: uptime, inline: true },
                        { name: '💾 Memory', value: `${memory} MB`, inline: true },
                        { name: '📦 Discord.js', value: `v${require('discord.js').version}`, inline: true },
                        { name: '🟢 Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== BLACKLIST ==========
        blacklist: {
            aliases: ['bl'],
            description: 'Blacklist a user from using the bot',
            category: 'Developer',
            async execute(message, args, { client, supabase }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const action = args[0]?.toLowerCase();
                const userId = args[1];
                const reason = args.slice(2).join(' ') || 'No reason provided';
                
                if (!action || !userId) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Parameters', 'Usage: `!blacklist <add/remove> <user_id> [reason]`')] });
                }
                
                if (action === 'add') {
                    await supabase.from('blacklist').upsert({
                        user_id: userId,
                        reason: reason,
                        blacklisted_by: message.author.id,
                        blacklisted_at: new Date().toISOString()
                    });
                    
                    return message.reply({ embeds: [createSuccessEmbed(client, 'User Blacklisted', `User \`${userId}\` has been blacklisted.\n**Reason:** ${reason}`)] });
                }
                
                if (action === 'remove') {
                    await supabase.from('blacklist').delete().eq('user_id', userId);
                    return message.reply({ embeds: [createSuccessEmbed(client, 'User Unblacklisted', `User \`${userId}\` has been removed from blacklist.`)] });
                }
                
                if (action === 'list') {
                    const { data } = await supabase.from('blacklist').select('*');
                    if (!data || data.length === 0) {
                        return message.reply({ embeds: [createInfoEmbed(client, 'Blacklist', 'No users blacklisted.')] });
                    }
                    
                    const list = data.map(u => `**${u.user_id}** - ${u.reason} (by <@${u.blacklisted_by}>)`).join('\n');
                    return message.reply({ embeds: [createInfoEmbed(client, `Blacklisted Users (${data.length})`, list)] });
                }
            }
        },
        
        // ========== EXECUTE COMMAND AS BOT ==========
        execute: {
            aliases: ['ex', 'run'],
            description: 'Execute a command as the bot',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const commandName = args[0]?.toLowerCase();
                const commandArgs = args.slice(1);
                
                if (!commandName) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Command', 'Usage: `!execute <command> [args]`')] });
                }
                
                const command = client.commands.get(commandName);
                if (!command) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Command Not Found', `Command \`${commandName}\` not found.`)] });
                }
                
                try {
                    await command.execute(message, commandArgs, { client, supabase: message.client.supabase });
                    return message.reply({ embeds: [createSuccessEmbed(client, 'Command Executed', `Successfully executed \`${commandName}\``)] });
                } catch (error) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Execution Failed', error.message)] });
                }
            }
        },
        
        // ========== SET ACTIVITY ==========
        setactivity: {
            aliases: ['setstatus', 'activity'],
            description: 'Change bot activity status',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const type = args[0]?.toLowerCase();
                const activity = args.slice(1).join(' ');
                
                const validTypes = ['playing', 'streaming', 'listening', 'watching', 'competing'];
                
                if (!type || !validTypes.includes(type) || !activity) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Invalid Usage', 'Usage: `!setactivity <playing/streaming/listening/watching/competing> <text>`\nExample: `!setactivity playing with code`')] });
                }
                
                const typeMap = {
                    'playing': 0,
                    'streaming': 1,
                    'listening': 2,
                    'watching': 3,
                    'competing': 5
                };
                
                await client.user.setActivity(activity, { type: typeMap[type] });
                
                return message.reply({ embeds: [createSuccessEmbed(client, 'Activity Updated', `Status changed to: **${type}** ${activity}`)] });
            }
        },
        
        // ========== SET AVATAR ==========
        setavatar: {
            aliases: ['setav', 'avatar'],
            description: 'Change bot avatar',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const attachment = message.attachments.first();
                const url = args[0];
                
                if (!attachment && !url) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Image', 'Please upload an image or provide a URL.\nUsage: `!setavatar <image_url>` or attach an image.')] });
                }
                
                const imageUrl = attachment ? attachment.url : url;
                
                try {
                    await client.user.setAvatar(imageUrl);
                    return message.reply({ embeds: [createSuccessEmbed(client, 'Avatar Updated', 'Bot avatar has been changed!')] });
                } catch (error) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Failed', error.message)] });
                }
            }
        },
        
        // ========== SET USERNAME ==========
        setusername: {
            aliases: ['setname', 'username'],
            description: 'Change bot username',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const newName = args.join(' ');
                if (!newName) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Missing Name', 'Usage: `!setusername <new_username>`')] });
                }
                
                if (newName.length < 2 || newName.length > 32) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Invalid Name', 'Username must be between 2 and 32 characters.')] });
                }
                
                try {
                    await client.user.setUsername(newName);
                    return message.reply({ embeds: [createSuccessEmbed(client, 'Username Updated', `Bot username changed to **${newName}**`)] });
                } catch (error) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Failed', error.message)] });
                }
            }
        },
        
        // ========== SHUTDOWN ==========
        shutdown: {
            aliases: ['stop', 'kill'],
            description: 'Shutdown the bot',
            category: 'Developer',
            async execute(message, args, { client }) {
                if (!isDeveloper(message.author.id)) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Access Denied', 'You are not authorized to use this command.')] });
                }
                
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setDescription('⚠️ **WARNING** ⚠️\nAre you sure you want to shutdown the bot?\n\nType `confirm` within 15 seconds.')
                    .setTimestamp();
                
                await message.reply({ embeds: [confirmEmbed] });
                
                const filter = (m) => m.author.id === message.author.id && m.content.toLowerCase() === 'confirm';
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] }).catch(() => null);
                
                if (!collected) {
                    return message.reply({ embeds: [createErrorEmbed(client, 'Cancelled', 'Shutdown cancelled (timeout).')] });
                }
                
                await message.reply({ embeds: [createInfoEmbed(client, 'Shutting Down...', 'Bot is going offline now.')] });
                process.exit(0);
            }
        }
    }
};

// ========== HELPER FUNCTIONS ==========
function createSuccessEmbed(client, title, description) {
    return new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createErrorEmbed(client, title, description) {
    return new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function createInfoEmbed(client, title, description) {
    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}
