const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { starboardStats, starboardTop, starboardSetup, starboardConfig } = require('./starboard');
const { embedCreate, embedSessions, createEmbedFromData, getEmbedCode } = require('./embed');

// ⭐ HELPER: Build nice embeds with language support
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    if (!client) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription(descKey || 'Error')
            .setTimestamp();
        return embed;
    }
    
    const lang = client.languages?.get(guildId) || 'en';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        server: 0x0099FF,
        welcome: 0x00FF00
    };
    
    const titles = {
        en: {
            autorole: 'Auto-Role',
            autorole_set: 'Auto-Role Set',
            autorole_removed: 'Auto-Role Removed',
            whitelist: 'Whitelist',
            guild_whitelist: 'Guild Whitelist',
            prefix: 'Prefix',
            prefix_changed: 'Prefix Changed',
            prefix_reset: 'Prefix Reset',
            current_prefix: 'Current Prefix',
            ticket_panel: 'Ticket Panel',
            ticket_created: 'Ticket Panel Created',
            ticket_removed: 'Ticket Panel Removed',
            ticket_info: 'Ticket Panel Info',
            vanity_role: 'Vanity Role',
            vanity_set: 'Vanity Role Set',
            vanity_removed: 'Vanity Role Removed',
            welcome: 'Welcome',
            welcome_added: 'Welcome Added',
            welcome_removed: 'Welcome Removed',
            welcome_list: 'Welcome Messages',
            welcome_view: 'Welcome',
            welcome_test: 'Welcome Test',
            test_sent: 'Test Sent',
            welcome_help: 'Welcome Commands',
            starboard: 'Starboard',
            starboard_set: 'Starboard Set',
            starboard_stats: 'Starboard Stats',
            starboard_top: 'Starboard Top',
            embed_builder: 'Embed Builder',
            error: 'Error',
            success: 'Success',
            info: 'Info',
            invalid_usage: 'Invalid Usage'
        }
    };
    
    const descriptions = {
        en: {
            autorole_set: (role) => `${role} will be automatically given to new members.`,
            autorole_removed: 'Auto-Role has been disabled.',
            autorole_current: (role) => `Current Auto-Role: <@&${role}>\n\n**Usage:**\n!autorole set @Role\n!autorole remove`,
            autorole_none: 'No Auto-Role set.\n\n**Usage:**\n!autorole set @Role',
            whitelist_added: (id) => `Server ${id} has been added to the whitelist.`,
            whitelist_removed: (id) => `Server ${id} has been removed from the whitelist.`,
            whitelist_empty: 'No servers on the whitelist.',
            whitelist_usage: '!guildwhitelist add <ServerID>\n!guildwhitelist remove <ServerID>\n!guildwhitelist list',
            prefix_no_prefix: '!prefix <NewPrefix>',
            prefix_too_long: 'Prefix can be maximum 5 characters!',
            prefix_changed: (prefix) => `New prefix: **${prefix}**`,
            prefix_reset: 'Prefix reset to **!**',
            current_prefix: (prefix) => `The prefix for this server is: **${prefix}**`,
            ticket_created: (channel) => `Panel created in ${channel}!`,
            ticket_removed: 'Ticket panel has been removed.',
            ticket_no_panel: 'No ticket panel configured.\n\n**Usage:**\n!ticketpanel create [#channel]\n!ticketpanel remove',
            ticket_channel: 'Channel',
            ticket_category: 'Category',
            ticket_support: 'Support Role',
            ticket_none: 'None',
            ticket_usage: '!ticketpanel create [#channel]\n!ticketpanel remove\n!ticketpanel info',
            vanity_set: (role) => `${role} will be given on Vanity-URL join.`,
            vanity_removed: 'Vanity-Role has been disabled.',
            vanity_current: (role) => `Current Vanity-Role: <@&${role}>\n\n**Usage:**\n!vanity-role set @Role\n!vanity-role remove`,
            vanity_none: 'No Vanity-Role set.\n\n**Usage:**\n!vanity-role set @Role',
            welcome_add_usage: '!welcome-add #channel <Message> [embed]\n\n**Placeholders:** {user}, {user.mention}, {server}, {membercount}\n\n**Add `embed` at the end to send as embed.**',
            welcome_added: (channel, msg, isEmbed) => `Welcome message in ${channel}:\n${msg}\n\n**Type:** ${isEmbed ? 'Embed' : 'Normal Message'}`,
            welcome_remove_usage: '!welcome-remove #channel',
            welcome_removed: (channel) => `Welcome message in ${channel} has been removed.`,
            welcome_not_found: 'No welcome message found in this channel.',
            welcome_empty: 'No welcome messages configured.',
            welcome_view_empty: (channel) => `No welcome message configured in ${channel}.`,
            welcome_test_none: 'No welcome messages configured!',
            welcome_test_sent: 'Welcome messages have been sent as a test!',
            welcome_test_title: '🧪 Welcome Test',
            welcome_help_text: '**!welcome-add** #channel <Message> [embed]\n**!welcome-remove** #channel\n**!welcome-list**\n**!welcome-view** #channel\n**!welcome test**\n\n**Placeholders:** {user}, {user.mention}, {server}, {membercount}\n\n**Add `embed` at the end to send as embed.**',
            added_by: 'added by'
        }
    };
    
    const title = titles[lang]?.[titleKey] || titleKey;
    let description = descriptions[lang]?.[descKey] || descKey;
    
    if (typeof description === 'function') {
        if (Array.isArray(fields) && fields.length > 0) {
            description = description(...fields);
        } else if (fields.length === 1 && typeof fields[0] !== 'object') {
            description = description(fields[0]);
        } else if (fields.length === 2) {
            description = description(fields[0], fields[1]);
        } else {
            description = description();
        }
    } else {
        for (const [key, value] of Object.entries(replacements)) {
            description = description.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor(type === 'welcome' ? 0x00FF00 : type === 'server' ? 0x0099FF : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user?.username || 'Bot', iconURL: client.user?.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '🌐';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = client.users?.cache?.get(userId) || await client.users?.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    embed.setTimestamp();
    
    if (Array.isArray(fields) && fields.length > 0 && fields[0] && typeof fields[0] === 'object' && !fields[0].name) {
        embed.addFields(fields);
    }
    
    return embed;
}

// ========== EMBED BUILDER SESSIONS ==========
// Imported from ./embed.js

module.exports = {
    category: 'Server',
    subCommands: {
        
        // ========== AUTOROLE ==========
        autorole: {
            aliases: ['auto-role', 'joinrole'],
            permissions: 'Administrator',
            description: 'Sets auto-role for new members',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                
                if (action === 'set' && role) {
                    await supabase.from('autorole').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'autorole_set', 'autorole_set', [role.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('autorole').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'autorole_removed', 'autorole_removed')] 
                    });
                }
                
                const { data } = await supabase
                    .from('autorole')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'autorole', 'autorole_current', [data.role_id])] 
                    });
                } else {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'autorole', 'autorole_none')] 
                    });
                }
            }
        },
        
        // ========== GUILDWHITELIST ==========
        guildwhitelist: {
            aliases: ['guild-wl', 'serverwhitelist'],
            permissions: 'Administrator',
            description: 'Manage server whitelist',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const targetGuildId = args[1];
                
                if (action === 'add' && targetGuildId) {
                    await supabase.from('guild_whitelist').upsert({
                        guild_id: targetGuildId,
                        added_by: message.author.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'whitelist', 'whitelist_added', [targetGuildId])] 
                    });
                }
                
                if (action === 'remove' && targetGuildId) {
                    await supabase.from('guild_whitelist').delete().eq('guild_id', targetGuildId);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'whitelist', 'whitelist_removed', [targetGuildId])] 
                    });
                }
                
                if (action === 'list') {
                    const { data } = await supabase.from('guild_whitelist').select('guild_id, added_by, created_at');
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'guild_whitelist', 'whitelist_empty')] 
                        });
                    }
                    
                    const list = data.map(g => `🆔 ${g.guild_id} (added <t:${Math.floor(new Date(g.created_at).getTime() / 1000)}:R>)`).join('\n');
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('📋 Guild Whitelist')
                        .setDescription(list.slice(0, 4096))
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'whitelist_usage')] 
                });
            }
        },
        
        // ========== PREFIX ==========
        prefix: {
            aliases: ['setprefix', 'newprefix'],
            permissions: 'Administrator',
            description: 'Changes the bot prefix',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const newPrefix = args[0];
                
                if (!newPrefix) {
                    const currentPrefix = client.prefixes.get(message.guild.id) || '!';
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'current_prefix', 'current_prefix', [currentPrefix])] 
                    });
                }
                
                if (newPrefix.length > 5) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'prefix', 'prefix_too_long')] 
                    });
                }
                
                try {
                    const { error } = await supabase
                        .from('custom_prefixes')
                        .upsert({
                            guild_id: message.guild.id,
                            prefix: newPrefix
                        });
                    
                    if (error) {
                        console.error('❌ Prefix Save Error:', error);
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'Could not save prefix!')] 
                        });
                    }
                    
                    client.prefixes.set(message.guild.id, newPrefix);
                    console.log(`✅ Prefix saved: ${newPrefix}`);
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'prefix_changed', 'prefix_changed', [newPrefix])] 
                    });
                } catch (err) {
                    console.error('❌ Prefix Error:', err);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', err.message)] 
                    });
                }
            }
        },
        
        // ========== PREFIX-REMOVE ==========
        'prefix-remove': {
            aliases: ['prefix-delete', 'resetprefix'],
            permissions: 'Administrator',
            description: 'Resets prefix to default',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                try {
                    await supabase.from('custom_prefixes').delete().eq('guild_id', message.guild.id);
                    client.prefixes.set(message.guild.id, '!');
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'prefix_reset', 'prefix_reset')] 
                    });
                } catch (err) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', err.message)] 
                    });
                }
            }
        },
        
        // ========== PREFIX-VIEW ==========
        'prefix-view': {
            aliases: ['prefix-show', 'showprefix'],
            description: 'Shows current prefix',
            category: 'Server',
            async execute(message, args, { client }) {
                const prefix = client.prefixes.get(message.guild.id) || '!';
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'current_prefix', 'current_prefix', [prefix])] 
                });
            }
        },
        
        // ========== TICKETPANEL ==========
        ticketpanel: {
            aliases: ['ticket-panel', 'ticketsetup'],
            permissions: 'Administrator',
            description: 'Creates ticket panel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'create' || action === 'setup') {
                    const channel = message.mentions.channels.first() || message.channel;
                    const category = message.mentions.channels.last();
                    const supportRole = message.mentions.roles.first();
                    
                    const panelEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('🎫 Create Ticket')
                        .setDescription('Click the button to open a ticket!')
                        .setFooter({ text: message.guild.name })
                        .setTimestamp();
                    
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('create_ticket')
                                .setLabel('Open Ticket')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('🎫')
                        );
                    
                    const msg = await channel.send({ embeds: [panelEmbed], components: [row] });
                    
                    await supabase.from('ticket_panels').insert({
                        guild_id: message.guild.id,
                        channel_id: channel.id,
                        message_id: msg.id,
                        category_id: category?.id || null,
                        support_role_id: supportRole?.id || null
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'ticket_created', 'ticket_created', [channel.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('ticket_panels').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'ticket_removed', 'ticket_removed')] 
                    });
                }
                
                if (action === 'info' || !action) {
                    const { data } = await supabase
                        .from('ticket_panels')
                        .select('*')
                        .eq('guild_id', message.guild.id)
                        .single();
                    
                    if (!data) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'ticket_panel', 'ticket_no_panel')] 
                        });
                    }
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('🎫 Ticket Panel Info')
                        .addFields([
                            { name: 'Channel', value: `<#${data.channel_id}>`, inline: true },
                            { name: 'Category', value: data.category_id ? `<#${data.category_id}>` : 'None', inline: true },
                            { name: 'Support Role', value: data.support_role_id ? `<@&${data.support_role_id}>` : 'None', inline: true }
                        ])
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [embed] });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'ticket_usage')] 
                });
            }
        },
        
        // ========== VANITY-ROLE ==========
        'vanity-role': {
            aliases: ['vanityrole', 'vrole'],
            permissions: 'Administrator',
            description: 'Sets role for vanity URL joins',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                const role = message.mentions.roles.first();
                
                if (action === 'set' && role) {
                    await supabase.from('vanity_role').upsert({
                        guild_id: message.guild.id,
                        role_id: role.id
                    });
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'vanity_set', 'vanity_set', [role.toString()])] 
                    });
                }
                
                if (action === 'remove' || action === 'delete') {
                    await supabase.from('vanity_role').delete().eq('guild_id', message.guild.id);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'vanity_removed', 'vanity_removed')] 
                    });
                }
                
                const { data } = await supabase
                    .from('vanity_role')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'vanity_role', 'vanity_current', [data.role_id])] 
                    });
                } else {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'vanity_role', 'vanity_none')] 
                    });
                }
            }
        },
        
        // ========== WELCOME-ADD (ÜBERARBEITET) ==========
        'welcome-add': {
            aliases: ['welcome-set', 'setwelcome'],
            permissions: 'Administrator',
            description: 'Adds welcome message (normal text or embed)',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                let welcomeMessage = args.slice(1).join(' ');
                
                // Check if last word is "embed" (send as embed)
                const words = welcomeMessage.trim().split(/\s+/);
                const sendAsEmbed = words[words.length - 1]?.toLowerCase() === 'embed';
                
                if (sendAsEmbed) {
                    // Remove "embed" from the message
                    words.pop();
                    welcomeMessage = words.join(' ');
                }
                
                // Remove quotes
                welcomeMessage = welcomeMessage.replace(/^["']|["']$/g, '');
                
                if (!channel || !welcomeMessage) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_add_usage')] 
                    });
                }
                
                try {
                    const { data: existing } = await supabase
                        .from('welcome_messages')
                        .select('id')
                        .eq('guild_id', message.guild.id)
                        .eq('channel_id', channel.id)
                        .maybeSingle();
                    
                    if (existing) {
                        await supabase
                            .from('welcome_messages')
                            .update({ 
                                message: welcomeMessage,
                                send_as_embed: sendAsEmbed
                            })
                            .eq('guild_id', message.guild.id)
                            .eq('channel_id', channel.id);
                    } else {
                        await supabase
                            .from('welcome_messages')
                            .insert({
                                guild_id: message.guild.id,
                                channel_id: channel.id,
                                message: welcomeMessage,
                                embed_color: '#00FF00',
                                send_as_embed: sendAsEmbed
                            });
                    }
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'welcome_added', 'welcome_added', [channel.toString(), welcomeMessage, sendAsEmbed])] 
                    });
                } catch (err) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', err.message)] 
                    });
                }
            }
        },
        
        // ========== WELCOME-REMOVE ==========
        'welcome-remove': {
            aliases: ['welcome-delete', 'delwelcome'],
            permissions: 'Administrator',
            description: 'Removes welcome message',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_remove_usage')] 
                    });
                }
                
                const { error } = await supabase
                    .from('welcome_messages')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id);
                
                if (error) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'welcome_not_found')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'welcome_removed', 'welcome_removed', [channel.toString()])] 
                });
            }
        },
        
        // ========== WELCOME-LIST ==========
        'welcome-list': {
            aliases: ['welcomes', 'listwelcome'],
            permissions: 'Administrator',
            description: 'Lists all welcome messages',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const { data, error } = await supabase
                    .from('welcome_messages')
                    .select('*')
                    .eq('guild_id', message.guild.id);
                
                if (error || !data || data.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_list', 'welcome_empty')] 
                    });
                }
                
                const list = data.map(w => `📝 <#${w.channel_id}>\n${w.message.substring(0, 100)}${w.message.length > 100 ? '...' : ''}\n┗ **Type:** ${w.send_as_embed ? 'Embed' : 'Normal Message'}`).join('\n\n');
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('👋 Welcome Messages')
                    .setDescription(list.slice(0, 4096))
                    .setFooter({ text: `${data.length} messages`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== WELCOME-VIEW ==========
        'welcome-view': {
            aliases: ['welcome-show', 'showwelcome'],
            permissions: 'Administrator',
            description: 'Shows welcome message of a channel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const channel = message.mentions.channels.first();
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_usage', 'welcome_remove_usage')] 
                    });
                }
                
                const { data, error } = await supabase
                    .from('welcome_messages')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('channel_id', channel.id)
                    .single();
                
                if (error || !data) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_view', 'welcome_view_empty', [channel.toString()])] 
                    });
                }
                
                if (data.send_as_embed) {
                    const embed = new EmbedBuilder()
                        .setColor(parseInt(data.embed_color?.replace('#', '') || '00FF00', 16))
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(`👋 Welcome to ${channel.name}`)
                        .setDescription(data.message)
                        .setFooter({ text: `Type: Embed • ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    if (data.image_url) embed.setImage(data.image_url);
                    return message.reply({ embeds: [embed] });
                } else {
                    return message.reply({ content: `📝 **Welcome Message in ${channel}**\n\n${data.message}\n\n*Type: Normal Message*` });
                }
            }
        },
        
        // ========== WELCOME ==========
        welcome: {
            aliases: ['welcome-info'],
            permissions: 'Administrator',
            description: 'Welcome info & test',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'test') {
                    const { data } = await supabase
                        .from('welcome_messages')
                        .select('channel_id, message, send_as_embed, embed_color, image_url')
                        .eq('guild_id', message.guild.id);
                    
                    if (!data || data.length === 0) {
                        return message.reply({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'welcome', 'welcome_test_none')] 
                        });
                    }
                    
                    for (const w of data) {
                        const channel = message.guild.channels.cache.get(w.channel_id);
                        if (channel) {
                            const welcomeMsg = w.message
                                .replace(/{user}/g, message.author.username)
                                .replace(/{user.mention}/g, message.author.toString())
                                .replace(/{server}/g, message.guild.name)
                                .replace(/{membercount}/g, message.guild.memberCount);
                            
                            if (w.send_as_embed) {
                                const embed = new EmbedBuilder()
                                    .setColor(parseInt(w.embed_color?.replace('#', '') || '00FF00', 16))
                                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                                    .setTitle('🧪 Welcome Test')
                                    .setDescription(welcomeMsg)
                                    .setTimestamp();
                                
                                if (w.image_url) embed.setImage(w.image_url);
                                await channel.send({ embeds: [embed] });
                            } else {
                                await channel.send(welcomeMsg);
                            }
                        }
                    }
                    
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'test_sent', 'welcome_test_sent')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'welcome_help', 'welcome_help_text')] 
                });
            }
        },
        
        // ========== STARBOARD ==========
        starboard: {
            aliases: ['sb', 'starboard-setup'],
            permissions: 'Administrator',
            description: 'Setup starboard channel',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const result = await starboardSetup(message, args, { client, supabase });
                return message.reply(result);
            }
        },
        
        // ========== STARBOARD CONFIG ==========
        starboardconfig: {
            aliases: ['sbconfig'],
            permissions: 'Administrator',
            description: 'Configure starboard settings',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const result = await starboardConfig(message, args, { client, supabase });
                return message.reply(result);
            }
        },
        
        // ========== STARBOARD STATS ==========
        starboardstats: {
            aliases: ['sbstats', 'sbstat'],
            description: 'Show starboard stats for a user',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const result = await starboardStats(message, args, { client, supabase });
                return message.reply(result);
            }
        },
        
        // ========== STARBOARD TOP ==========
        starboardtop: {
            aliases: ['sbtop', 'sbleaderboard'],
            description: 'Show top starred messages',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const result = await starboardTop(message, args, { client, supabase });
                return message.reply(result);
            }
        },
        
        // ========== EMBED BUILDER ==========
        embed: {
            aliases: ['eb', 'embedbuilder'],
            permissions: 'ManageMessages',
            description: 'Create custom embeds',
            category: 'Server',
            async execute(message, args, { client, supabase }) {
                const action = args[0]?.toLowerCase();
                
                if (action === 'create') {
                    await embedCreate(message, args.slice(1), client, supabase);
                } else {
                    const helpEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle('🎨 Embed Builder')
                        .setDescription('Create custom embeds with an easy-to-use interface.')
                        .addFields([
                            { name: '📝 Create Embed', value: '`!embed create <name>`\nExample: `!embed create welcome`', inline: false },
                            { name: '🎨 Features', value: '• Edit Basic Info (Title, Description, Color, Timestamp)\n• Edit Author (Name, Icon URL, URL)\n• Edit Footer (Text, Icon URL)\n• Edit Images (Thumbnail, Main Image)\n• Add/Remove Fields\n• Get JSON Code\n• Preview before sending', inline: false }
                        ])
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                        .setTimestamp();
                    
                    return message.reply({ embeds: [helpEmbed] });
                }
            }
        }
    }
};
