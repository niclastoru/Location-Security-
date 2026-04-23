const { EmbedBuilder, AuditLogEvent, PermissionFlagsBits } = require('discord.js');

// Helper: Build embed
async function buildEmbed(client, guildId, userId, type, title, description) {
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client.user?.username || 'Bot', iconURL: client.user?.displayAvatarURL() })
        .setTitle(type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : type === 'warn' ? `⚠️ ${title}` : `🛡️ ${title}`)
        .setDescription(description)
        .setTimestamp();
    
    if (userId) {
        const user = await client.users?.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    
    return embed;
}

module.exports = {
    category: 'Server',
    subCommands: {
        
        // ========== ANTI-NUKE LOG ==========
        antinukelog: {
            aliases: ['anlog', 'antinuke-log'],
            permissions: 'Administrator',
            description: 'Set the Anti-Nuke log channel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'No Channel', 'Please mention a channel!\nUsage: `!antinukelog #channel`');
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: existing } = await supabase
                    .from('antinuke_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (existing) {
                    await supabase
                        .from('antinuke_settings')
                        .update({ log_channel_id: channel.id })
                        .eq('guild_id', message.guild.id);
                } else {
                    await supabase
                        .from('antinuke_settings')
                        .insert({ guild_id: message.guild.id, log_channel_id: channel.id });
                }
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Log Channel Set', `Anti-Nuke log channel set to ${channel}`);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== ANTI-NUKE PUNISHMENT ==========
        antinukepunishment: {
            aliases: ['anpunish', 'antinuke-punish'],
            permissions: 'Administrator',
            description: 'Set punishment for Anti-Nuke violations (ban/kick/timeout)',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const type = args[0]?.toLowerCase();
                
                if (!['ban', 'kick', 'timeout'].includes(type)) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Punishment', 'Valid punishments: `ban`, `kick`, `timeout`\nUsage: `!antinukepunishment ban`');
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: existing } = await supabase
                    .from('antinuke_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (existing) {
                    await supabase
                        .from('antinuke_settings')
                        .update({ punishment: type })
                        .eq('guild_id', message.guild.id);
                } else {
                    await supabase
                        .from('antinuke_settings')
                        .insert({ guild_id: message.guild.id, punishment: type });
                }
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Punishment Set', `Anti-Nuke punishment set to **${type.toUpperCase()}**`);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== ANTI-NUKE TIMEOUT DURATION ==========
        antinuketimeout: {
            aliases: ['antimeout', 'an-timeout'],
            permissions: 'Administrator',
            description: 'Set timeout duration for Anti-Nuke (minutes)',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const minutes = parseInt(args[0]);
                
                if (isNaN(minutes) || minutes < 1 || minutes > 40320) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Timeout', 'Timeout must be between 1 and 40320 minutes (28 days)!\nUsage: `!antinuketimeout 60`');
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: existing } = await supabase
                    .from('antinuke_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (existing) {
                    await supabase
                        .from('antinuke_settings')
                        .update({ timeout_duration: minutes })
                        .eq('guild_id', message.guild.id);
                } else {
                    await supabase
                        .from('antinuke_settings')
                        .insert({ guild_id: message.guild.id, timeout_duration: minutes });
                }
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Timeout Duration Set', `Timeout duration set to **${minutes} minutes**`);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== ANTI-NUKE PROTECTION ==========
        antinukeprotection: {
            aliases: ['anprotect', 'an-protection'],
            permissions: 'Administrator',
            description: 'Toggle specific Anti-Nuke protections',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const protectionType = args[0]?.toLowerCase();
                const state = args[1]?.toLowerCase();
                
                const protectionMap = {
                    'bot': 'bot_protection',
                    'admin': 'admin_protection',
                    'channel': 'channel_protection',
                    'role': 'role_protection',
                    'ban': 'ban_protection',
                    'kick': 'kick_protection',
                    'webhook': 'webhook_protection',
                    'vanity': 'vanity_protection'
                };
                
                if (!protectionMap[protectionType]) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Protection', 'Valid types: `bot`, `admin`, `channel`, `role`, `ban`, `kick`, `webhook`, `vanity`\nUsage: `!antinukeprotection bot on`');
                    return message.reply({ embeds: [embed] });
                }
                
                if (state !== 'on' && state !== 'off') {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid State', 'Use `on` or `off`\nUsage: `!antinukeprotection bot on`');
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: existing } = await supabase
                    .from('antinuke_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const updateData = {};
                updateData[protectionMap[protectionType]] = (state === 'on');
                
                if (existing) {
                    await supabase
                        .from('antinuke_settings')
                        .update(updateData)
                        .eq('guild_id', message.guild.id);
                } else {
                    await supabase
                        .from('antinuke_settings')
                        .insert({ guild_id: message.guild.id, ...updateData });
                }
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Protection Updated', `${protectionType.toUpperCase()} protection turned **${state.toUpperCase()}**`);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== ANTI-NUKE LIMITS ==========
        antinukelimits: {
            aliases: ['anlimit', 'an-limits'],
            permissions: 'Administrator',
            description: 'Set rate limits for Anti-Nuke',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const limitType = args[0]?.toLowerCase();
                const value = parseInt(args[1]);
                
                const limitMap = {
                    'channelcreate': 'channel_create_limit',
                    'channeldelete': 'channel_delete_limit',
                    'rolecreate': 'role_create_limit',
                    'roledelete': 'role_delete_limit',
                    'ban': 'ban_limit',
                    'kick': 'kick_limit'
                };
                
                // Show current limits
                if (!limitType) {
                    const { data: settings } = await supabase
                        .from('antinuke_settings')
                        .select('*')
                        .eq('guild_id', message.guild.id)
                        .single();
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('📊 Anti-Nuke Rate Limits')
                        .addFields([
                            { name: 'Channel Create', value: `${settings?.channel_create_limit || 5} per minute`, inline: true },
                            { name: 'Channel Delete', value: `${settings?.channel_delete_limit || 5} per minute`, inline: true },
                            { name: 'Role Create', value: `${settings?.role_create_limit || 5} per minute`, inline: true },
                            { name: 'Role Delete', value: `${settings?.role_delete_limit || 5} per minute`, inline: true },
                            { name: 'Ban', value: `${settings?.ban_limit || 3} per minute`, inline: true },
                            { name: 'Kick', value: `${settings?.kick_limit || 5} per minute`, inline: true }
                        ])
                        .setFooter({ text: 'Use !antinukelimits <type> <number> to change' })
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!limitMap[limitType] || isNaN(value) || value < 1 || value > 50) {
                    const embed = await buildEmbed(client, message.guild.id, message.author.id, 'error', 'Invalid Limit', 'Limit must be between 1 and 50!\nValid types: `channelcreate`, `channeldelete`, `rolecreate`, `roledelete`, `ban`, `kick`');
                    return message.reply({ embeds: [embed] });
                }
                
                const { data: existing } = await supabase
                    .from('antinuke_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const updateData = {};
                updateData[limitMap[limitType]] = value;
                
                if (existing) {
                    await supabase
                        .from('antinuke_settings')
                        .update(updateData)
                        .eq('guild_id', message.guild.id);
                } else {
                    await supabase
                        .from('antinuke_settings')
                        .insert({ guild_id: message.guild.id, ...updateData });
                }
                
                const embed = await buildEmbed(client, message.guild.id, message.author.id, 'success', 'Limit Updated', `${limitType} limit set to **${value}** per minute`);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== ANTI-NUKE STATUS ==========
        antinukestatus: {
            aliases: ['anstatus', 'an-status'],
            permissions: 'Administrator',
            description: 'Show Anti-Nuke system status',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const { data: settings } = await supabase
                    .from('antinuke_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const embed = new EmbedBuilder()
                    .setColor(settings?.enabled ? 0x57F287 : 0xED4245)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🛡️ Anti-Nuke System')
                    .addFields([
                        { name: 'Status', value: settings?.enabled ? '✅ ENABLED' : '❌ DISABLED', inline: true },
                        { name: 'Log Channel', value: settings?.log_channel_id ? `<#${settings.log_channel_id}>` : 'Not set', inline: true },
                        { name: 'Punishment', value: settings?.punishment?.toUpperCase() || 'BAN', inline: true },
                        { name: 'Timeout Duration', value: settings?.timeout_duration ? `${settings.timeout_duration} min` : '60 min', inline: true },
                        { name: 'Bot Protection', value: settings?.bot_protection !== false ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Admin Protection', value: settings?.admin_protection !== false ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Channel Protection', value: settings?.channel_protection !== false ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Role Protection', value: settings?.role_protection !== false ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Ban Protection', value: settings?.ban_protection !== false ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Kick Protection', value: settings?.kick_protection !== false ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Webhook Protection', value: settings?.webhook_protection !== false ? '✅ On' : '❌ Off', inline: true },
                        { name: 'Vanity Protection', value: settings?.vanity_protection !== false ? '✅ On' : '❌ Off', inline: true }
                    ])
                    .setFooter({ text: 'Whitelisted users/roles are excluded from all protections' })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== ANTI-NUKE HELP ==========
        antinukehelp: {
            aliases: ['anhelp', 'an-help'],
            permissions: 'Administrator',
            description: 'Show Anti-Nuke commands',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🛡️ Anti-Nuke Commands')
                    .setDescription(`
                        **Already existing commands:** (you have)
                        \`!antinuke enable\` - Enable Anti-Nuke
                        \`!antinuke disable\` - Disable Anti-Nuke
                        \`!antinukewhitelist add/remove/list\` - Manage whitelist
                        
                        **New commands:**
                        \`!antinukelog #channel\` - Set log channel
                        \`!antinukepunishment <ban/kick/timeout>\` - Set punishment
                        \`!antinuketimeout <minutes>\` - Set timeout duration
                        \`!antinukeprotection <type> <on/off>\` - Toggle protections
                        \`!antinukelimits\` - Show rate limits
                        \`!antinukelimits <type> <number>\` - Set rate limits
                        \`!antinukestatus\` - Show system status
                        \`!antinukehelp\` - Show this help
                        
                        **Protection types:** \`bot\`, \`admin\`, \`channel\`, \`role\`, \`ban\`, \`kick\`, \`webhook\`, \`vanity\`
                        **Limit types:** \`channelcreate\`, \`channeldelete\`, \`rolecreate\`, \`roledelete\`, \`ban\`, \`kick\`
                    `)
                    .setFooter({ text: 'Server Owner is always whitelisted' })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
