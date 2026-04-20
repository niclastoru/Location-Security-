const { EmbedBuilder } = require('discord.js');

// ⭐ HELPER: Create embed (ENGLISH ONLY)
function createEmbed(message, type, title, description, fields = []) {
    const client = message.client;
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C
    };
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setTitle(type === 'success' ? `✅ ${title}` : type === 'error' ? `❌ ${title}` : type === 'warn' ? `⚠️ ${title}` : `ℹ️ ${title}`)
        .setDescription(description)
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

module.exports = {
    category: 'Admin',
    subCommands: {
        
        // ========== ACTIVITY ==========
        activity: {
            aliases: ['act'],
            permissions: 'Administrator',
            description: 'Start an activity in VC',
            category: 'Admin',
            async execute(message, args) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No VC', 'You must be in a voice channel!')] 
                    });
                }
                
                const activity = args[0]?.toLowerCase();
                const activities = {
                    poker: '755827207812677713',
                    chess: '832012774040141894',
                    betrayal: '773336526917861400',
                    fishing: '814288819477020702',
                    youtube: '880218394199220334',
                    wordsnack: '879863976006127627',
                    doodle: '878067389634314250',
                    lettertile: '879863686565621790'
                };
                
                if (!activities[activity]) {
                    const list = Object.keys(activities).join(', ');
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Activity', `Available: ${list}`)] 
                    });
                }
                
                try {
                    const invite = await channel.createInvite({
                        targetApplication: activities[activity],
                        targetType: 2,
                        maxAge: 300
                    });
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Activity Started', `[Click here for ${activity}](https://discord.gg/${invite.code})`)] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Error', 'Could not start activity!')] 
                    });
                }
            }
        },
        
        // ========== ANNOUNCE ==========
        announce: {
            aliases: ['say'],
            permissions: 'Administrator',
            description: 'Send an announcement',
            category: 'Admin',
            async execute(message, args) {
                const channel = message.mentions.channels.first();
                const text = args.slice(1).join(' ');
                
                if (!channel || !text) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!announce #channel <Text>')] 
                    });
                }
                
                const announceEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('📢 Announcement')
                    .setDescription(text)
                    .setFooter({ text: `By ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                await channel.send({ embeds: [announceEmbed] });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Announcement Sent', `Announcement sent in ${channel}!`)] 
                });
            }
        },
        
        // ========== ANTINUKE ==========
        antinuke: {
            aliases: ['an'],
            permissions: 'Administrator',
            description: 'Anti-Nuke settings',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const punish = args[1]?.toLowerCase();
                
                if (action === 'on' || action === 'enable') {
                    const punishment = ['ban', 'kick', 'timeout'].includes(punish) ? punish : 'ban';
                    
                    await supabase.from('antinuke').upsert({
                        guild_id: message.guild.id,
                        enabled: true,
                        punish_action: punishment
                    });
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Antinuke Enabled', `✅ Antinuke is now ACTIVE!\nPunishment: **${punishment}**`)] 
                    });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('antinuke').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Antinuke Disabled', '❌ Antinuke has been disabled!')] 
                    });
                }
                
                const { data } = await supabase
                    .from('antinuke')
                    .select('enabled, punish_action')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? '🟢 ACTIVE' : '🔴 INACTIVE';
                const punishment = data?.punish_action || 'ban';
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Antinuke Status', `Status: ${status}\nPunishment: **${punishment}**\n\n**Usage:**\n!antinuke on [ban/kick/timeout]\n!antinuke off`)] 
                });
            }
        },
        
        // ========== ANTIRAID ==========
        antiraid: {
            aliases: ['ar'],
            permissions: 'Administrator',
            description: 'Anti-Raid settings',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'on' || action === 'enable') {
                    const limit = parseInt(args[1]) || 5;
                    const window = parseInt(args[2]) || 10;
                    
                    await supabase.from('antiraid').upsert({
                        guild_id: message.guild.id,
                        enabled: true,
                        join_limit: limit,
                        time_window: window
                    });
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Antiraid Enabled', `🛡️ Antiraid is ACTIVE!\nLimit: **${limit}** joins in **${window}s**`)] 
                    });
                }
                
                if (action === 'off' || action === 'disable') {
                    await supabase.from('antiraid').upsert({
                        guild_id: message.guild.id,
                        enabled: false
                    });
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Antiraid Disabled', '🔓 Antiraid has been disabled!')] 
                    });
                }
                
                const { data } = await supabase
                    .from('antiraid')
                    .select('enabled, join_limit, time_window')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const status = data?.enabled ? '🟢 ACTIVE' : '🔴 INACTIVE';
                const limit = data?.join_limit || 5;
                const window = data?.time_window || 10;
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Antiraid Status', `Status: ${status}\nLimit: **${limit}** joins in **${window}s**\n\n**Usage:**\n!antiraid on [limit] [seconds]\n!antiraid off`)] 
                });
            }
        },
        
        // ========== AUTORESPONDER ==========
        autoresponder: {
            aliases: ['arsp', 'autoreply'],
            permissions: 'Administrator',
            description: 'Manage auto-responder',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                const trigger = args[1]?.toLowerCase();
                const response = args.slice(2).join(' ');
                
                if (action === '12') {
                    if (!trigger || !response) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Invalid Usage', '!autoresponder add <Trigger> <Response>')] 
                        });
                    }
                    
                    await supabase.from('autoresponder').upsert({
                        guild_id: message.guild.id,
                        trigger: trigger,
                        response: response
                    });
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Added', `✅ Trigger **"${trigger}"** → **"${response}"**`)] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    if (!trigger) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Invalid Usage', '!autoresponder remove <Trigger>')] 
                        });
                    }
                    
                    const { error } = await supabase
                        .from('autoresponder')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('trigger', trigger);
                    
                    if (error) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Error', 'Trigger not found!')] 
                        });
                    }
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Removed', `Trigger **"${trigger}"** removed.`)] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('autoresponder')
                        .select('trigger, response')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'info', 'Auto-Responder', 'No entries found.')] 
                        });
                    }
                    
                    const list = data.map(ar => `**${ar.trigger}** → ${ar.response}`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('🤖 Auto-Responder')
                        .setDescription(list.slice(0, 4096))
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'error', 'Invalid Usage', '!autoresponder add/remove/list')] 
                });
            }
        },
        
        // ========== CUSTOMIZE AVATAR ==========
        'customize avatar': {
            aliases: ['setavatar', 'botavatar'],
            permissions: 'Administrator',
            description: 'Change bot avatar',
            category: 'Admin',
            async execute(message, args) {
                const url = args[0] || message.attachments.first()?.url;
                
                if (!url) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Image', '!customize avatar <URL> or attach image')] 
                    });
                }
                
                try {
                    await message.client.user.setAvatar(url);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Avatar Changed', 'Bot avatar updated!')] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Error', 'Could not change avatar!')] 
                    });
                }
            }
        },
        
        // ========== CUSTOMIZE BANNER ==========
        'customize banner': {
            aliases: ['setbanner', 'botbanner'],
            permissions: 'Administrator',
            description: 'Change bot banner',
            category: 'Admin',
            async execute(message, args) {
                const url = args[0] || message.attachments.first()?.url;
                
                if (!url) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Image', '!customize banner <URL>')] 
                    });
                }
                
                try {
                    await message.client.user.setBanner(url);
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Banner Changed', 'Bot banner updated!')] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Error', 'Could not change banner!')] 
                    });
                }
            }
        },
        
        // ========== CUSTOMIZE BIO ==========
        'customize bio': {
            aliases: ['setbio', 'botbio'],
            permissions: 'Administrator',
            description: 'Change bot bio',
            category: 'Admin',
            async execute(message) {
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Bio', 'Bio can only be changed manually.')] 
                });
            }
        },
        
        // ========== CUSTOMIZE ==========
        customize: {
            aliases: ['custom'],
            permissions: 'Administrator',
            description: 'Bot customization',
            category: 'Admin',
            async execute(message) {
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Customize', '`!customize avatar <URL>`\n`!customize banner <URL>`\n`!customize bio <Text>`')] 
                });
            }
        },
        
        // ========== DISABLECOMMAND ==========
        disablecommand: {
            aliases: ['disable', 'cmdoff'],
            permissions: 'Administrator',
            description: 'Disable a command',
            category: 'Admin',
            async execute(message, args) {
                const cmd = args[0]?.toLowerCase();
                
                if (!cmd) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Command', '!disablecommand <Command>')] 
                    });
                }
                
                if (!message.client.commands.has(cmd)) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Not Found', `Command "${cmd}" does not exist!`)] 
                    });
                }
                
                message.client.disabledCommands = message.client.disabledCommands || new Set();
                message.client.disabledCommands.add(cmd);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Deactivated', `Command \`${cmd}\` has been deactivated.`)] 
                });
            }
        },
        
        // ========== ENABLECOMMAND ==========
        enablecommand: {
            aliases: ['enable', 'cmdon'],
            permissions: 'Administrator',
            description: 'Enable a command',
            category: 'Admin',
            async execute(message, args) {
                const cmd = args[0]?.toLowerCase();
                
                if (!cmd) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Command', '!enablecommand <Command>')] 
                    });
                }
                
                message.client.disabledCommands = message.client.disabledCommands || new Set();
                message.client.disabledCommands.delete(cmd);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Activated', `Command \`${cmd}\` has been activated.`)] 
                });
            }
        },
        
        // ========== DMALL ==========
        dmall: {
            aliases: ['massdm'],
            permissions: 'Administrator',
            description: 'Send DM to all members',
            category: 'Admin',
            async execute(message) {
                return message.reply({ 
                    embeds: [createEmbed(message, 'warn', 'Warning', '⚠️ Mass-DM is dangerous and can lead to a bot ban!')] 
                });
            }
        },
        
        // ========== FAKEPERMISSIONS ==========
        fakepermissions: {
            aliases: ['fakeperm'],
            permissions: 'Administrator',
            description: 'Show fake permissions',
            category: 'Admin',
            async execute(message, args) {
                const target = message.mentions.members.first() || message.member;
                const perms = target.permissions.toArray().map(p => p.replace(/_/g, ' ')).join('\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle(`🔧 Permissions of ${target.user.username}`)
                    .setDescription(perms.slice(0, 4096) || 'None')
                    .setFooter({ text: 'Simulation - Real permissions may differ', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LISTPERMISSIONS ==========
        listpermissions: {
            aliases: ['listperm', 'perms'],
            permissions: 'Administrator',
            description: 'List all permissions',
            category: 'Admin',
            async execute(message) {
                const perms = [
                    'Administrator', 'BanMembers', 'KickMembers', 'ManageChannels',
                    'ManageMessages', 'ManageRoles', 'ManageNicknames', 'ManageWebhooks',
                    'ModerateMembers', 'MoveMembers', 'MuteMembers', 'DeafenMembers'
                ];
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('📋 Available Permissions')
                    .setDescription(perms.join('\n'))
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== NUKE ==========
        nuke: {
            aliases: ['nukechannel', 'reset'],
            permissions: 'Administrator',
            description: 'Nuke a channel',
            category: 'Admin',
            async execute(message) {
                const channel = message.mentions.channels.first() || message.channel;
                
                const confirmMsg = await message.reply({ 
                    embeds: [createEmbed(message, 'warn', 'Nuke', '⚠️ Are you sure? Type `!confirm` within 10 seconds.')] 
                });
                
                const filter = m => m.author.id === message.author.id && m.content === '!confirm';
                const collector = message.channel.createMessageCollector({ filter, time: 10000, max: 1 });
                
                collector.on('collect', async () => {
                    try {
                        const newChannel = await channel.clone();
                        await channel.delete();
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                            .setTitle('✅ Nuke')
                            .setDescription('💥 Channel has been nuked!')
                            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                            .setTimestamp();
                        
                        await newChannel.send({ embeds: [successEmbed] });
                        await confirmMsg.delete().catch(() => {});
                    } catch {
                        await message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Error', 'Could not nuke channel!')] 
                        });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await confirmMsg.edit({ 
                            embeds: [createEmbed(message, 'error', 'Cancelled', 'Nuke cancelled.')] 
                        });
                    }
                });
            }
        },
        
        // ========== REACTION-SETUP ==========
        'reaction-setup': {
            aliases: ['reactsetup'],
            permissions: 'Administrator',
            description: 'Reaction-Role setup',
            category: 'Admin',
            async execute(message) {
                return message.reply({ 
                    embeds: [createEmbed(message, 'info', 'Reaction Setup', 'Use `!reactionroles add <Message-ID> <Emoji> @Role`')] 
                });
            }
        },
        
        // ========== REACTIONROLES ==========
        reactionroles: {
            aliases: ['rr', 'reactrole'],
            permissions: 'Administrator',
            description: 'Manage reaction roles',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === '13') {
                    const msgId = args[1];
                    const emoji = args[2];
                    const role = message.mentions.roles.first();
                    
                    if (!msgId || !emoji || !role) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Invalid Usage', '!reactionroles add <Message-ID> <Emoji> @Role')] 
                        });
                    }
                    
                    await supabase.from('reaction_roles').insert({
                        guild_id: message.guild.id,
                        message_id: msgId,
                        channel_id: message.channel.id,
                        emoji: emoji,
                        role_id: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Reaction Role Added', `${emoji} → ${role}`)] 
                    });
                }
                
                if (action === 'remove') {
                    const msgId = args[1];
                    const emoji = args[2];
                    
                    if (!msgId || !emoji) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Invalid Usage', '!reactionroles remove <Message-ID> <Emoji>')] 
                        });
                    }
                    
                    await supabase.from('reaction_roles')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('message_id', msgId)
                        .eq('emoji', emoji);
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Reaction Role Removed', `${emoji} has been removed.`)] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('reaction_roles')
                        .select('message_id, emoji, role_id')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'info', 'Reaction Roles', 'No entries found.')] 
                        });
                    }
                    
                    const list = data.map(rr => `📝 ${rr.message_id}: ${rr.emoji} → <@&${rr.role_id}>`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('🎭 Reaction Roles')
                        .setDescription(list.slice(0, 4096))
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'error', 'Invalid Usage', '!reactionroles add/remove/list')] 
                });
            }
        },
        
        // ========== SERVERRULES ==========
        serverrules: {
            aliases: ['rules'],
            permissions: 'Administrator',
            description: 'Set server rules',
            category: 'Admin',
            async execute(message, args) {
                const rules = args.join(' ');
                
                if (!rules) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'Server Rules', 'No rules set. Use `!serverrules <Rules>`')] 
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setTitle('📜 Server Rules')
                    .setDescription(rules)
                    .setFooter({ text: `Set by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SETTINGS ==========
        settings: {
            aliases: ['config'],
            permissions: 'Administrator',
            description: 'Bot settings',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const setting = args[0]?.toLowerCase();
                const value = args.slice(1).join(' ');
                
                const validSettings = ['prefix', 'log_channel', 'welcome_channel', 'welcome_message', 'leave_channel', 'leave_message'];
                
                if (setting && validSettings.includes(setting)) {
                    let updateData = { guild_id: message.guild.id };
                    
                    if (setting === 'prefix') updateData.prefix = value;
                    else if (setting.includes('channel')) {
                        const channel = message.mentions.channels.first();
                        if (!channel) {
                            return message.reply({ 
                                embeds: [createEmbed(message, 'error', 'Invalid Usage', 'Mention a channel!')] 
                            });
                        }
                        updateData[setting] = channel.id;
                    } else {
                        updateData[setting] = value;
                    }
                    
                    await supabase.from('bot_settings').upsert(updateData);
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Settings Saved', `${setting} = ${value || `<#${updateData[setting]}>`}`)] 
                    });
                }
                
                const { data } = await supabase
                    .from('bot_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const prefix = data?.prefix || '!';
                const log = data?.log_channel ? `<#${data.log_channel}>` : '❌ Not set';
                const welcome = data?.welcome_channel ? `<#${data.welcome_channel}>` : '❌ Not set';
                const leave = data?.leave_channel ? `<#${data.leave_channel}>` : '❌ Not set';
                
                const { data: an } = await supabase.from('antinuke').select('enabled').eq('guild_id', message.guild.id).single();
                const { data: ar } = await supabase.from('antiraid').select('enabled').eq('guild_id', message.guild.id).single();
                
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                    .setTitle('⚙️ Bot Settings')
                    .addFields([
                        { name: 'Prefix', value: prefix, inline: true },
                        { name: 'Log Channel', value: log, inline: true },
                        { name: 'Welcome Channel', value: welcome, inline: true },
                        { name: 'Leave Channel', value: leave, inline: true },
                        { name: '🛡️ Antinuke', value: an?.enabled ? '🟢 On' : '🔴 Off', inline: true },
                        { name: '🛡️ Antiraid', value: ar?.enabled ? '🟢 On' : '🔴 Off', inline: true }
                    ])
                    .setFooter({ text: '!settings <option> <value> to change', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== STATUS ==========
        status: {
            aliases: ['setstatus', 'botstatus'],
            permissions: 'Administrator',
            description: 'Change bot status',
            category: 'Admin',
            async execute(message, args) {
                const type = args[0]?.toLowerCase();
                const text = args.slice(1).join(' ');
                
                const types = {
                    playing: 0, play: 0, game: 0,
                    streaming: 1, stream: 1,
                    listening: 2, listen: 2,
                    watching: 3, watch: 3,
                    competing: 5, comp: 5
                };
                
                if (!types[type] && types[type] !== 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Type', 'playing, streaming, listening, watching, competing')] 
                    });
                }
                
                if (!text) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Text', '!status <Type> <Text>')] 
                    });
                }
                
                message.client.user.setActivity(text, { type: types[type] });
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Status Changed', `${type}: ${text}`)] 
                });
            }
        },
        
        // ========== STICKYMESSAGE ==========
        stickymessage: {
            aliases: ['sticky'],
            permissions: 'Administrator',
            description: 'Set sticky message',
            category: 'Admin',
            async execute(message, args) {
                const channel = message.mentions.channels.first() || message.channel;
                const text = args.slice(1).join(' ') || args.join(' ');
                
                if (!text) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Text', '!stickymessage [#channel] <Text>')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Sticky Set', `Message in ${channel} will stay pinned.`)] 
                });
            }
        },
        
        // ========== STRIPSTAFF ==========
        stripstaff: {
            aliases: ['removestaff'],
            permissions: 'Administrator',
            description: 'Remove staff roles',
            category: 'Admin',
            async execute(message, args, { supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'add') {
                    const role = message.mentions.roles.first();
                    if (!role) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Invalid Usage', '!stripstaff add @Role')] 
                        });
                    }
                    
                    await supabase.from('staff_roles').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id,
                        role_name: role.name
                    });
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Staff Role Added', `${role} saved as staff role.`)] 
                    });
                }
                
                if (action === 'remove') {
                    const role = message.mentions.roles.first();
                    if (!role) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'error', 'Invalid Usage', '!stripstaff remove @Role')] 
                        });
                    }
                    
                    await supabase.from('staff_roles')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('role_id', role.id);
                    
                    return message.reply({ 
                        embeds: [createEmbed(message, 'success', 'Staff Role Removed', `${role} is no longer a staff role.`)] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase
                        .from('staff_roles')
                        .select('role_id, role_name')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [createEmbed(message, 'info', 'Staff Roles', 'No staff roles saved.')] 
                        });
                    }
                    
                    const list = data.map(r => `<@&${r.role_id}> (${r.role_name})`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('👮 Staff Roles')
                        .setDescription(list)
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!stripstaff @User\n!stripstaff add @Role\n!stripstaff remove @Role\n!stripstaff list')] 
                    });
                }
                
                const { data } = await supabase
                    .from('staff_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id);
                
                let staffRoles;
                if (data && data.length > 0) {
                    const roleIds = data.map(r => r.role_id);
                    staffRoles = target.roles.cache.filter(r => roleIds.includes(r.id));
                } else {
                    staffRoles = target.roles.cache.filter(r => 
                        r.permissions.has('Administrator') || 
                        r.permissions.has('BanMembers') || 
                        r.permissions.has('KickMembers') ||
                        r.permissions.has('ManageMessages')
                    );
                }
                
                if (staffRoles.size === 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'No Staff Roles', `${target} has no staff roles.`)] 
                    });
                }
                
                await target.roles.remove(staffRoles);
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Staff Removed', `${staffRoles.size} staff roles removed from ${target}.`)] 
                });
            }
        },
        
        // ========== UNBANALL ==========
        unbanall: {
            aliases: ['unbannall'],
            permissions: 'Administrator',
            description: 'Unban all users',
            category: 'Admin',
            async execute(message) {
                const confirmMsg = await message.reply({ 
                    embeds: [createEmbed(message, 'warn', 'Confirm', '⚠️ Are you sure? Type `!confirm`')] 
                });
                
                const filter = m => m.author.id === message.author.id && m.content === '!confirm';
                const collector = message.channel.createMessageCollector({ filter, time: 10000, max: 1 });
                
                collector.on('collect', async () => {
                    const bans = await message.guild.bans.fetch();
                    let count = 0;
                    
                    for (const ban of bans.values()) {
                        await message.guild.members.unban(ban.user.id).catch(() => {});
                        count++;
                    }
                    
                    await confirmMsg.edit({ 
                        embeds: [createEmbed(message, 'success', 'All Unbanned', `${count} users have been unbanned.`)] 
                    });
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await confirmMsg.edit({ 
                            embeds: [createEmbed(message, 'error', 'Cancelled', 'Unban cancelled.')] 
                        });
                    }
                });
            }
        },
        
        // ========== UNJAILALL ==========
        unjailall: {
            aliases: ['unjailall'],
            permissions: 'Administrator',
            description: 'Release all from jail',
            category: 'Admin',
            async execute(message) {
                const jailRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'jail');
                
                if (!jailRole) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Error', 'No jail role exists!')] 
                    });
                }
                
                let count = 0;
                for (const [id, member] of jailRole.members) {
                    await member.roles.remove(jailRole);
                    count++;
                }
                
                return message.reply({ 
                    embeds: [createEmbed(message, 'success', 'All Released', `${count} users released from jail.`)] 
                });
            }
        },
        
        // ========== VANITY-URL ==========
        'vanity-url': {
            aliases: ['vanity', 'vurl'],
            permissions: 'Administrator',
            description: 'Show vanity URL',
            category: 'Admin',
            async execute(message) {
                try {
                    const invite = await message.guild.fetchVanityData();
                    return message.reply({ 
                        embeds: [createEmbed(message, 'info', 'Vanity URL', `**${invite.code}**\nUses: ${invite.uses} times`)] 
                    });
                } catch {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'No Vanity URL', 'This server has no vanity URL! (Requires Boost Level 3)')] 
                    });
                }
            }
        },
        
        // ========== REMIND ==========
        remind: {
            aliases: ['reminder', 'rw'],
            description: 'Set a reminder',
            category: 'Admin',
            async execute(message, args) {
                const time = args[0];
                const reminder = args.slice(1).join(' ');
                
                if (!time || !reminder) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Usage', '!remind <Time> <Message>\nExample: !remind 10m Get pizza')] 
                    });
                }
                
                let ms = 0;
                if (time.endsWith('s')) ms = parseInt(time) * 1000;
                else if (time.endsWith('m')) ms = parseInt(time) * 60 * 1000;
                else if (time.endsWith('h')) ms = parseInt(time) * 60 * 60 * 1000;
                else if (time.endsWith('d')) ms = parseInt(time) * 24 * 60 * 60 * 1000;
                else ms = parseInt(time) * 1000;
                
                if (isNaN(ms) || ms <= 0) {
                    return message.reply({ 
                        embeds: [createEmbed(message, 'error', 'Invalid Time', 'Use: 10s, 5m, 2h, 1d')] 
                    });
                }
                
                await message.reply({ 
                    embeds: [createEmbed(message, 'success', 'Reminder Set', `I will remind you in ${time} about: **${reminder}**`)] 
                });
                
                setTimeout(() => {
                    const triggerEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: message.client.user.username, iconURL: message.client.user.displayAvatarURL() })
                        .setTitle('⏰ Reminder')
                        .setDescription(`**${reminder}**\nFrom: ${message.channel}`)
                        .setTimestamp();
                    
                    message.author.send({ embeds: [triggerEmbed] }).catch(() => {
                        message.channel.send({ content: `${message.author}`, embeds: [triggerEmbed] });
                    });
                }, ms);
            }
        }
    }
};
