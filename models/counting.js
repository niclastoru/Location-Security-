const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

// Cache für schnellen Zugriff
const countingCache = new Map();

// ========== HELPER FUNCTIONS ==========

async function getCountingChannel(guildId, supabase) {
    if (countingCache.has(guildId)) {
        return countingCache.get(guildId);
    }
    
    const { data } = await supabase
        .from('counting_channels')
        .select('*')
        .eq('guild_id', guildId)
        .single();
    
    countingCache.set(guildId, data);
    return data;
}

async function getCountingSettings(guildId, supabase) {
    const { data } = await supabase
        .from('counting_settings')
        .select('*')
        .eq('guild_id', guildId)
        .single();
    
    return data || {
        reset_on_mistake: true,
        punish_on_mistake: false,
        punish_action: 'none',
        punish_duration: 5,
        announce_reset: true,
        allowed_roles: []
    };
}

async function updateUserStats(guildId, userId, supabase) {
    const { data: existing } = await supabase
        .from('counting_stats')
        .select('*')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .single();
    
    if (existing) {
        await supabase
            .from('counting_stats')
            .update({ 
                total_counts: existing.total_counts + 1,
                last_count: new Date().toISOString()
            })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('counting_stats')
            .insert({
                guild_id: guildId,
                user_id: userId,
                total_counts: 1,
                last_count: new Date().toISOString()
            });
    }
}

async function updateHighestNumber(guildId, currentNumber, supabase) {
    const { data } = await supabase
        .from('counting_channels')
        .select('highest_number')
        .eq('guild_id', guildId)
        .single();
    
    if (data && currentNumber > (data.highest_number || 0)) {
        await supabase
            .from('counting_channels')
            .update({ highest_number: currentNumber })
            .eq('guild_id', guildId);
        return true;
    }
    return false;
}

async function resetCounter(guildId, channel, supabase) {
    const settings = await getCountingSettings(guildId, supabase);
    
    await supabase
        .from('counting_channels')
        .update({ 
            current_number: 1,
            last_user_id: null
        })
        .eq('guild_id', guildId);
    
    countingCache.delete(guildId);
    
    if (settings.announce_reset) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setAuthor({ name: '💥 Counter Reset', iconURL: channel.guild.iconURL() })
            .setDescription(`The counting has been reset back to **1**!`)
            .setFooter({ text: 'Start counting again!' })
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
    }
}

function checkUserPermission(member, settings) {
    if (settings.allowed_roles && settings.allowed_roles.length > 0) {
        return member.roles.cache.some(r => settings.allowed_roles.includes(r.id));
    }
    return true;
}

// ========== COUNTING CHANNEL SETUP ==========
async function setupCountingChannel(message, args, client, supabase) {
    const channel = message.mentions.channels.first() || message.channel;
    
    // Prüfen ob bereits ein Counting Channel existiert
    const existing = await getCountingChannel(message.guild.id, supabase);
    if (existing) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ A counting channel already exists! Use \`!counting-disable\` first.`)
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    // Counting Channel erstellen
    await supabase.from('counting_channels').insert({
        guild_id: message.guild.id,
        channel_id: channel.id,
        current_number: 1,
        highest_number: 0,
        total_counts: 0,
        enabled: true
    });
    
    countingCache.delete(message.guild.id);
    
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle('✅ Counting Channel Setup')
        .setDescription(`${channel} is now a counting channel!\n\nType **1** to start counting!`)
        .addFields([
            { name: 'Rules', value: '• Count in order (1, 2, 3...)\n• No double posts by same user\n• No skipping numbers', inline: false },
            { name: 'Commands', value: '`!counting-stats` - Show stats\n`!counting-leaderboard` - Top counters\n`!counting-settings` - Configure\n`!counting-disable` - Disable channel', inline: false }
        ])
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
    // Send welcome message in counting channel
    const welcomeEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🎉 Counting Channel Started!')
        .setDescription('Type **1** to start counting!\n\n**Rules:**\n• Count in order\n• No double posts by same user\n• No skipping numbers')
        .setTimestamp();
    
    await channel.send({ embeds: [welcomeEmbed] });
}

async function disableCountingChannel(message, client, supabase) {
    const counting = await getCountingChannel(message.guild.id, supabase);
    
    if (!counting) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ No counting channel is set up!')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    await supabase
        .from('counting_channels')
        .delete()
        .eq('guild_id', message.guild.id);
    
    countingCache.delete(message.guild.id);
    
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription('✅ Counting channel has been disabled.')
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function showCountingStats(message, client, supabase) {
    const counting = await getCountingChannel(message.guild.id, supabase);
    
    if (!counting) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ No counting channel is set up!')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    const { data: userCounts } = await supabase
        .from('counting_stats')
        .select('user_id, total_counts')
        .eq('guild_id', message.guild.id)
        .order('total_counts', { ascending: false });
    
    const totalCounters = userCounts?.length || 0;
    const totalCounts = counting.total_counts || 0;
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
        .setTitle('📊 Counting Channel Stats')
        .addFields([
            { name: '🔢 Current Number', value: `${counting.current_number}`, inline: true },
            { name: '🏆 Highest Number', value: `${counting.highest_number}`, inline: true },
            { name: '📝 Total Counts', value: `${totalCounts}`, inline: true },
            { name: '👥 Total Counters', value: `${totalCounters}`, inline: true },
            { name: '📅 Channel', value: `<#${counting.channel_id}>`, inline: true }
        ])
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function showCountingLeaderboard(message, client, supabase) {
    const counting = await getCountingChannel(message.guild.id, supabase);
    
    if (!counting) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ No counting channel is set up!')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    const { data } = await supabase
        .from('counting_stats')
        .select('user_id, total_counts, highest_streak')
        .eq('guild_id', message.guild.id)
        .order('total_counts', { ascending: false })
        .limit(10);
    
    if (!data || data.length === 0) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ No counting statistics yet!')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    let description = '';
    for (let i = 0; i < data.length; i++) {
        const user = await client.users.fetch(data[i].user_id).catch(() => null);
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        description += `${medal} **${user?.username || 'Unknown'}** - ${data[i].total_counts} counts\n`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
        .setTitle('🏆 Counting Leaderboard')
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function showCountingSettings(message, client, supabase) {
    const counting = await getCountingChannel(message.guild.id, supabase);
    
    if (!counting) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ No counting channel is set up!')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    const settings = await getCountingSettings(message.guild.id, supabase);
    
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle('⚙️ Counting Settings')
        .addFields([
            { name: '🔄 Reset on Mistake', value: settings.reset_on_mistake ? '✅ Yes' : '❌ No', inline: true },
            { name: '⚠️ Punish on Mistake', value: settings.punish_on_mistake ? '✅ Yes' : '❌ No', inline: true },
            { name: '🔨 Punish Action', value: settings.punish_action === 'timeout' ? '⏰ Timeout' : settings.punish_action === 'kick' ? '👢 Kick' : settings.punish_action === 'ban' ? '🔨 Ban' : 'None', inline: true },
            { name: '⏱️ Punish Duration', value: settings.punish_duration ? `${settings.punish_duration} minutes` : 'N/A', inline: true },
            { name: '📢 Announce Reset', value: settings.announce_reset ? '✅ Yes' : '❌ No', inline: true },
            { name: '👥 Allowed Roles', value: settings.allowed_roles && settings.allowed_roles.length > 0 ? settings.allowed_roles.map(r => `<@&${r}>`).join(', ') : 'Everyone', inline: false }
        ])
        .setFooter({ text: 'Use !counting-set to change settings' })
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

async function setCountingSetting(message, args, client, supabase) {
    const action = args[0]?.toLowerCase();
    const value = args[1];
    
    const counting = await getCountingChannel(message.guild.id, supabase);
    if (!counting) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ No counting channel is set up!')
            .setTimestamp();
        return message.reply({ embeds: [embed] });
    }
    
    const settings = await getCountingSettings(message.guild.id, supabase);
    
    switch (action) {
        case 'reset':
            await supabase
                .from('counting_settings')
                .upsert({ guild_id: message.guild.id, reset_on_mistake: value === 'true' || value === 'on' });
            break;
            
        case 'punish':
            await supabase
                .from('counting_settings')
                .upsert({ guild_id: message.guild.id, punish_on_mistake: value === 'true' || value === 'on' });
            break;
            
        case 'action':
            if (!['timeout', 'kick', 'ban', 'none'].includes(value)) {
                return message.reply('❌ Invalid action! Use: `timeout`, `kick`, `ban`, or `none`');
            }
            await supabase
                .from('counting_settings')
                .upsert({ guild_id: message.guild.id, punish_action: value });
            break;
            
        case 'duration':
            const duration = parseInt(value);
            if (isNaN(duration) || duration < 1 || duration > 60) {
                return message.reply('❌ Duration must be between 1 and 60 minutes!');
            }
            await supabase
                .from('counting_settings')
                .upsert({ guild_id: message.guild.id, punish_duration: duration });
            break;
            
        case 'announce':
            await supabase
                .from('counting_settings')
                .upsert({ guild_id: message.guild.id, announce_reset: value === 'true' || value === 'on' });
            break;
            
        case 'role':
            const role = message.mentions.roles.first();
            if (!role) {
                return message.reply('❌ Please mention a role!');
            }
            let roles = settings.allowed_roles || [];
            if (roles.includes(role.id)) {
                roles = roles.filter(r => r !== role.id);
            } else {
                roles.push(role.id);
            }
            await supabase
                .from('counting_settings')
                .upsert({ guild_id: message.guild.id, allowed_roles: roles });
            break;
            
        default:
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('**Usage:** `!counting-set <option> <value>`\n\n**Options:**\n• `reset on/off` - Reset on mistake\n• `punish on/off` - Punish on mistake\n• `action <timeout/kick/ban/none>` - Punish action\n• `duration <minutes>` - Punish duration\n• `announce on/off` - Announce reset\n• `role @role` - Toggle allowed role')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
    }
    
    countingCache.delete(message.guild.id);
    
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`✅ Counting setting **${action}** has been updated!`)
        .setTimestamp();
    
    await message.reply({ embeds: [embed] });
}

// ========== COUNTING MESSAGE HANDLER ==========
async function handleCountingMessage(message, supabase) {
    if (message.author.bot) return;
    
    const counting = await getCountingChannel(message.guild.id, supabase);
    if (!counting || !counting.enabled) return;
    
    if (message.channel.id !== counting.channel_id) return;
    
    const settings = await getCountingSettings(message.guild.id, supabase);
    
    // Check if user has required role
    if (!checkUserPermission(message.member, settings)) {
        await message.delete();
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ You don't have permission to count in this channel!`)
            .setTimestamp();
        const warning = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warning.delete().catch(() => {}), 3000);
        return;
    }
    
    const number = parseInt(message.content);
    
    // Check if message is a number
    if (isNaN(number)) {
        await message.delete();
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ Only numbers are allowed in the counting channel!`)
            .setTimestamp();
        const warning = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warning.delete().catch(() => {}), 3000);
        return;
    }
    
    // Check if number is correct
    if (number !== counting.current_number) {
        await message.delete();
        
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ Wrong number! Expected **${counting.current_number}**, got **${number}**`)
            .setTimestamp();
        
        const warning = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warning.delete().catch(() => {}), 5000);
        
        // Punish if enabled
        if (settings.punish_on_mistake && settings.punish_action !== 'none') {
            let punishMsg = '';
            try {
                switch (settings.punish_action) {
                    case 'timeout':
                        await message.member.timeout(settings.punish_duration * 60 * 1000, 'Counting mistake');
                        punishMsg = `${message.author} has been timed out for ${settings.punish_duration} minutes!`;
                        break;
                    case 'kick':
                        await message.member.kick('Counting mistake');
                        punishMsg = `${message.author.tag} has been kicked!`;
                        break;
                    case 'ban':
                        await message.member.ban({ reason: 'Counting mistake' });
                        punishMsg = `${message.author.tag} has been banned!`;
                        break;
                }
                
                if (punishMsg) {
                    const punishEmbed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`⚠️ ${punishMsg}`)
                        .setTimestamp();
                    await message.channel.send({ embeds: [punishEmbed] });
                }
            } catch (error) {
                console.error('Punish error:', error);
            }
        }
        
        // Reset counter
        if (settings.reset_on_mistake) {
            await resetCounter(message.guild.id, message.channel, supabase);
        }
        return;
    }
    
    // Check for double count (same user)
    if (counting.last_user_id === message.author.id) {
        await message.delete();
        
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ You cannot count twice in a row, ${message.author}! Wait for someone else.`)
            .setTimestamp();
        
        const warning = await message.channel.send({ embeds: [embed] });
        setTimeout(() => warning.delete().catch(() => {}), 3000);
        return;
    }
    
    // Success! Update counter
    const newNumber = counting.current_number + 1;
    const wasHighest = await updateHighestNumber(message.guild.id, counting.current_number, supabase);
    
    await supabase
        .from('counting_channels')
        .update({ 
            current_number: newNumber,
            last_user_id: message.author.id,
            total_counts: (counting.total_counts || 0) + 1
        })
        .eq('guild_id', message.guild.id);
    
    await updateUserStats(message.guild.id, message.author.id, supabase);
    
    countingCache.delete(message.guild.id);
    
    // Send confirmation message for milestone numbers
    const currentNum = counting.current_number;
    if (currentNum === 1) {
        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`🎉 **${message.author}** started the count at **1**!`)
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
    
    // Milestone achievements (10, 50, 100, 500, 1000, etc.)
    const milestones = [10, 50, 100, 250, 500, 750, 1000, 2500, 5000, 10000];
    if (milestones.includes(currentNum)) {
        const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setDescription(`🎉 **MILESTONE!** We reached **${currentNum}** counts! 🎉`)
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
    
    if (wasHighest && currentNum > 1) {
        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`🏆 **NEW RECORD!** Highest count reached: **${currentNum}**! 🏆`)
            .setTimestamp();
        await message.channel.send({ embeds: [embed] });
    }
    
    // React with checkmark on successful count
    await message.react('✅').catch(() => {});
}

// ========== EXPORT ==========
module.exports = {
    category: 'Counting',
    subCommands: {
        'counting-setup': {
            aliases: ['csetup', 'counting-set'],
            permissions: 'Administrator',
            description: 'Set up the counting channel',
            category: 'Counting',
            async execute(message, args, { client, supabase }) {
                await setupCountingChannel(message, args, client, supabase);
            }
        },
        
        'counting-disable': {
            aliases: ['cdisable', 'counting-remove'],
            permissions: 'Administrator',
            description: 'Disable the counting channel',
            category: 'Counting',
            async execute(message, args, { client, supabase }) {
                await disableCountingChannel(message, client, supabase);
            }
        },
        
        'counting-stats': {
            aliases: ['cstats', 'counting'],
            description: 'Show counting channel statistics',
            category: 'Counting',
            async execute(message, args, { client, supabase }) {
                await showCountingStats(message, client, supabase);
            }
        },
        
        'counting-leaderboard': {
            aliases: ['cleader', 'ctop'],
            description: 'Show counting leaderboard',
            category: 'Counting',
            async execute(message, args, { client, supabase }) {
                await showCountingLeaderboard(message, client, supabase);
            }
        },
        
        'counting-settings': {
            aliases: ['csettings'],
            permissions: 'Administrator',
            description: 'Show counting channel settings',
            category: 'Counting',
            async execute(message, args, { client, supabase }) {
                await showCountingSettings(message, client, supabase);
            }
        },
        
        'counting-set': {
            aliases: ['cset'],
            permissions: 'Administrator',
            description: 'Change counting settings',
            category: 'Counting',
            async execute(message, args, { client, supabase }) {
                await setCountingSetting(message, args, client, supabase);
            }
        }
    },
    
    // Export handler for messageCreate event
    handleCountingMessage
};
