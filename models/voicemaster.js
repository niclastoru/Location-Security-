const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ChannelType, 
    PermissionFlagsBits,
    MessageFlags
} = require('discord.js');

// Cache for fast access (loaded from Supabase)
const vmCache = new Map();

// ========== HELPER: Load config from Supabase ==========
async function loadConfig(guildId, supabase) {
    if (vmCache.has(guildId)) return vmCache.get(guildId);
    
    const { data } = await supabase
        .from('voicemaster_config')
        .select('*')
        .eq('guild_id', guildId)
        .single();
    
    if (data) {
        const { data: channels } = await supabase
            .from('voicemaster_channels')
            .select('*')
            .eq('guild_id', guildId);
        
        const voiceChannels = new Map();
        if (channels) {
            channels.forEach(c => voiceChannels.set(c.channel_id, c.owner_id));
        }
        
        const config = {
            jtcChannel: data.jtc_channel,
            interfaceChannel: data.interface_channel,
            voiceChannels: voiceChannels
        };
        
        vmCache.set(guildId, config);
        return config;
    }
    
    return null;
}

// ========== HELPER FUNCTION ==========
async function isOwner(userId, channel, guildId, supabase) {
    const config = await loadConfig(guildId, supabase);
    if (!config) return false;
    
    const ownerId = config.voiceChannels.get(channel.id);
    return ownerId === userId;
}

// ========== HELPER: Create modern embed ==========
function createVMEmbed(type, title, description) {
    const colors = { success: 0x57F287, error: 0xED4245, info: 0x5865F2, warn: 0xFEE75C };
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
    
    return new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setDescription(`${icons[type] || 'ℹ️'} ${description}`)
        .setTimestamp();
}

// ========== VOICEMASTER BUTTON HANDLER ==========
async function handleVoiceMasterButton(interaction, client, supabase) {
    const { customId, member, guild } = interaction;
    const channel = member.voice.channel;
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    // Validate channel
    if (!channel) {
        return interaction.editReply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] });
    }
    
    if (!channel.name.includes('🎤')) {
        return interaction.editReply({ embeds: [createVMEmbed('error', 'Error', 'This is not a VoiceMaster channel!')] });
    }
    
    const config = await loadConfig(guild.id, supabase);
    if (!config) {
        return interaction.editReply({ embeds: [createVMEmbed('error', 'Error', 'VoiceMaster is not set up properly!')] });
    }
    
    const currentOwner = config.voiceChannels.get(channel.id);
    const isOwner = currentOwner === member.id;
    
    // Helper for permission check
    const checkOwner = () => {
        if (!isOwner) {
            interaction.editReply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can use this button!')] });
            return false;
        }
        return true;
    };

    switch (customId) {
        
        // ========== LOCK ==========
        case 'vm_lock':
            if (!checkOwner()) return;
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Locked', '🔒 Your channel is now locked. New members cannot join.')] });
            
        // ========== UNLOCK ==========
        case 'vm_unlock':
            if (!checkOwner()) return;
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Unlocked', '🔓 Your channel is now unlocked. New members can join.')] });
            
        // ========== HIDE ==========
        case 'vm_hide':
            if (!checkOwner()) return;
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Hidden', '👻 Your channel is now hidden from the channel list.')] });
            
        // ========== REVEAL ==========
        case 'vm_reveal':
            if (!checkOwner()) return;
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Revealed', '👁️ Your channel is now visible to everyone.')] });
            
        // ========== CLAIM ==========
        case 'vm_claim':
            if (currentOwner) {
                const ownerMember = await guild.members.fetch(currentOwner).catch(() => null);
                if (ownerMember && ownerMember.voice.channelId === channel.id) {
                    return interaction.editReply({ embeds: [createVMEmbed('error', 'Claim Failed', 'The current owner is still in the channel!')] });
                }
            }
            
            config.voiceChannels.set(channel.id, member.id);
            vmCache.set(guild.id, config);
            
            await supabase.from('voicemaster_channels').upsert({
                guild_id: guild.id,
                channel_id: channel.id,
                owner_id: member.id
            });
            
            await channel.setName(`🎤 ${member.user.username}'s Channel`);
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Claimed', `📋 You are now the proud owner of **${channel.name}**!`)] });
            
        // ========== DISCONNECT ==========
        case 'vm_disconnect':
            if (!checkOwner()) return;
            return interaction.editReply({ embeds: [createVMEmbed('info', 'Disconnect', '👢 Please use the `!voice-kick @User` command to disconnect someone.')] });
            
        // ========== ACTIVITY ==========
        case 'vm_activity':
            if (!checkOwner()) return;
            try {
                const invite = await channel.createInvite({
                    targetApplication: '880218394199220334', // YouTube Together
                    targetType: 2,
                    maxAge: 300
                });
                return interaction.editReply({ embeds: [createVMEmbed('success', 'Activity Started', `🎮 [Click here to open YouTube Together](https://discord.gg/${invite.code})`)] });
            } catch {
                return interaction.editReply({ embeds: [createVMEmbed('error', 'Activity Failed', 'Could not start the activity. Make sure the channel is not full!')] });
            }
            
        // ========== INFO ==========
        case 'vm_info':
            const ownerUser = currentOwner ? await client.users.fetch(currentOwner).catch(() => null) : null;
            
            const infoEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setTitle(`ℹ️ Channel Info: ${channel.name}`)
                .addFields([
                    { name: '👑 Owner', value: ownerUser ? `<@${ownerUser.id}>` : 'None', inline: true },
                    { name: '👥 Members', value: `${channel.members.size} / ${channel.userLimit === 0 ? '∞' : channel.userLimit}`, inline: true },
                    { name: '🎵 Bitrate', value: `${Math.round(channel.bitrate / 1000)} kbps`, inline: true },
                    { name: '🔒 Status', value: channel.permissionsFor(guild.roles.everyone).has('Connect') ? 'Public' : 'Locked', inline: true }
                ])
                .setFooter({ text: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [infoEmbed] });
            
        // ========== LIMIT + ==========
        case 'vm_limit_plus':
            if (!checkOwner()) return;
            const newLimit = (channel.userLimit === 0 || channel.userLimit === 99) 
                ? (channel.userLimit === 99 ? 99 : 1) 
                : channel.userLimit + 1;
            await channel.setUserLimit(newLimit);
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Limit Increased', `⬆️ User limit is now **${newLimit}**.`)] });
            
        // ========== LIMIT - ==========
        case 'vm_limit_minus':
            if (!checkOwner()) return;
            const decreasedLimit = channel.userLimit <= 1 ? 0 : channel.userLimit - 1;
            await channel.setUserLimit(decreasedLimit);
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Limit Decreased', `⬇️ User limit is now **${decreasedLimit === 0 ? 'Unlimited' : decreasedLimit}**.`)] });
            
        default:
            return interaction.editReply({ embeds: [createVMEmbed('error', 'Error', 'This button is not configured correctly!')] });
    }
}

module.exports = {
    category: 'Voicemaster',
    subCommands: {
        
        // ========== VOICEMASTER / SETUPVM ==========
        voicemaster: {
            aliases: ['setupvm', 'vm', 'voicesetup'],
            permissions: 'Administrator',
            description: 'Creates the VoiceMaster system',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const loadingMsg = await message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription('⏳ Creating VoiceMaster...').setTimestamp()] });
                
                const existing = await loadConfig(message.guild.id, supabase);
                if (existing) {
                    const jtcChannel = message.guild.channels.cache.get(existing.jtcChannel);
                    const interfaceChannel = message.guild.channels.cache.get(existing.interfaceChannel);
                    if (jtcChannel) await jtcChannel.delete().catch(() => {});
                    if (interfaceChannel) await interfaceChannel.delete().catch(() => {});
                    
                    await supabase.from('voicemaster_config').delete().eq('guild_id', message.guild.id);
                    await supabase.from('voicemaster_channels').delete().eq('guild_id', message.guild.id);
                    vmCache.delete(message.guild.id);
                }
                
                const jtcChannel = await message.guild.channels.create({
                    name: '➕ Join to Create',
                    type: ChannelType.GuildVoice,
                    userLimit: 1
                });
                
                const interfaceChannel = await message.guild.channels.create({
                    name: '🎤｜voice-interface',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: message.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });
                
                const panelEmbed = new EmbedBuilder()
                    .setColor(0x2B2D31)
                    .setAuthor({ name: 'VoiceMaster Control Panel', iconURL: client.user.displayAvatarURL() })
                    .setDescription('> **Manage your voice channel elegantly**\n> Use the buttons below to customize your channel.\n\n*All interactions are only visible to you.*')
                    .setImage('https://i.imgur.com/AfFp7pu.png')
                    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
                    .setTimestamp();
                
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                        new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                        new ButtonBuilder().setCustomId('vm_hide').setLabel('Hide').setStyle(ButtonStyle.Secondary).setEmoji('👻'),
                        new ButtonBuilder().setCustomId('vm_reveal').setLabel('Reveal').setStyle(ButtonStyle.Secondary).setEmoji('👁️')
                    );
                
                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('📋'),
                        new ButtonBuilder().setCustomId('vm_info').setLabel('Info').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️'),
                        new ButtonBuilder().setCustomId('vm_disconnect').setLabel('Kick').setStyle(ButtonStyle.Danger).setEmoji('👢'),
                        new ButtonBuilder().setCustomId('vm_activity').setLabel('Activity').setStyle(ButtonStyle.Success).setEmoji('🎮')
                    );
                
                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('vm_limit_minus').setLabel('Limit -').setStyle(ButtonStyle.Secondary).setEmoji('⬇️'),
                        new ButtonBuilder().setCustomId('vm_limit_plus').setLabel('Limit +').setStyle(ButtonStyle.Secondary).setEmoji('⬆️')
                    );
                
                await interfaceChannel.send({ embeds: [panelEmbed], components: [row1, row2, row3] });
                
                await supabase.from('voicemaster_config').insert({
                    guild_id: message.guild.id,
                    jtc_channel: jtcChannel.id,
                    interface_channel: interfaceChannel.id
                });
                
                vmCache.set(message.guild.id, {
                    jtcChannel: jtcChannel.id,
                    interfaceChannel: interfaceChannel.id,
                    voiceChannels: new Map()
                });
                
                const successEmbed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('✅ VoiceMaster Setup Complete')
                    .setDescription(`✅ **Join-to-Create:** ${jtcChannel}\n✅ **Interface:** ${interfaceChannel}\n\nUsers can now join the Join-to-Create channel!`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                await loadingMsg.edit({ embeds: [successEmbed] });
            }
        },
        
        // ========== VOICEMASTER-RESET ==========
        'voicemaster-reset': {
            aliases: ['vm-reset', 'resetvm'],
            permissions: 'Administrator',
            description: 'Resets VoiceMaster',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const config = await loadConfig(message.guild.id, supabase);
                
                if (config) {
                    const jtcChannel = message.guild.channels.cache.get(config.jtcChannel);
                    const interfaceChannel = message.guild.channels.cache.get(config.interfaceChannel);
                    
                    if (jtcChannel) await jtcChannel.delete().catch(() => {});
                    if (interfaceChannel) await interfaceChannel.delete().catch(() => {});
                    
                    for (const [channelId, ownerId] of config.voiceChannels) {
                        const channel = message.guild.channels.cache.get(channelId);
                        if (channel) await channel.delete().catch(() => {});
                    }
                    
                    await supabase.from('voicemaster_config').delete().eq('guild_id', message.guild.id);
                    await supabase.from('voicemaster_channels').delete().eq('guild_id', message.guild.id);
                    vmCache.delete(message.guild.id);
                }
                
                return message.reply({ embeds: [createVMEmbed('success', 'Reset', '✅ VoiceMaster has been completely reset.')] });
            }
        },
        
        // ========== VOICE-LOCK ==========
        'voice-lock': {
            aliases: ['vlock'],
            description: 'Locks your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
                return message.reply({ embeds: [createVMEmbed('success', 'Locked', `🔒 ${channel} has been locked.`)] });
            }
        },
        
        // ========== VOICE-UNLOCK ==========
        'voice-unlock': {
            aliases: ['vunlock'],
            description: 'Unlocks your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: null });
                return message.reply({ embeds: [createVMEmbed('success', 'Unlocked', `🔓 ${channel} has been unlocked.`)] });
            }
        },
        
        // ========== VOICE-HIDE ==========
        'voice-hide': {
            aliases: ['vhide', 'ghost'],
            description: 'Hides your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                return message.reply({ embeds: [createVMEmbed('success', 'Hidden', `👻 ${channel} is now hidden.`)] });
            }
        },
        
        // ========== VOICE-UNHIDE ==========
        'voice-unhide': {
            aliases: ['vunhide', 'reveal'],
            description: 'Reveals your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });
                return message.reply({ embeds: [createVMEmbed('success', 'Revealed', `👁️ ${channel} is now visible.`)] });
            }
        },
        
        // ========== VOICE-CLAIM ==========
        'voice-claim': {
            aliases: ['vclaim'],
            description: 'Claims a voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                
                const config = await loadConfig(message.guild.id, supabase);
                if (!config) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'VoiceMaster is not set up!')] }); }
                if (!channel.name.includes('🎤')) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'This is not a VoiceMaster channel!')] }); }
                
                config.voiceChannels.set(channel.id, message.author.id);
                vmCache.set(message.guild.id, config);
                
                await supabase.from('voicemaster_channels').upsert({
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    owner_id: message.author.id
                });
                
                await channel.setName(`🎤 ${message.author.username}'s Channel`);
                return message.reply({ embeds: [createVMEmbed('success', 'Claimed', `📋 You are now the owner of ${channel}!`)] });
            }
        },
        
        // ========== VOICE-TRANSFER ==========
        'voice-transfer': {
            aliases: ['vtransfer', 'transfer-new'],
            description: 'Transfers channel ownership',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                const target = message.mentions.members.first();
                if (!target) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'Please mention a user to transfer ownership to!')] }); }
                if (!target.voice.channel || target.voice.channel.id !== channel.id) { return message.reply({ embeds: [createVMEmbed('error', 'Error', `${target} is not in your channel!`)] }); }
                
                const config = await loadConfig(message.guild.id, supabase);
                if (config) {
                    config.voiceChannels.set(channel.id, target.id);
                    vmCache.set(message.guild.id, config);
                    
                    await supabase.from('voicemaster_channels').upsert({
                        guild_id: message.guild.id,
                        channel_id: channel.id,
                        owner_id: target.id
                    });
                }
                
                await channel.setName(`🎤 ${target.user.username}'s Channel`);
                return message.reply({ embeds: [createVMEmbed('success', 'Transferred', `✅ Channel ownership transferred to ${target}!`)] });
            }
        },
        
        // ========== VOICE-LIMIT ==========
        'voice-limit': {
            aliases: ['vlimit'],
            description: 'Sets user limit',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                const limit = parseInt(args[0]);
                if (isNaN(limit) || limit < 0 || limit > 99) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'Limit must be between 0 and 99!')] }); }
                
                await channel.setUserLimit(limit);
                return message.reply({ embeds: [createVMEmbed('success', 'Limit Set', `✅ User limit set to **${limit === 0 ? 'Unlimited' : limit}**`)] });
            }
        },
        
        // ========== VOICE-RENAME ==========
        'voice-rename': {
            aliases: ['vrename'],
            description: 'Renames channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                const name = args.join(' ');
                if (!name) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'Please provide a name!')] }); }
                if (name.length > 100) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'Name can be maximum 100 characters!')] }); }
                
                await channel.setName(`🎤 ${name}`);
                return message.reply({ embeds: [createVMEmbed('success', 'Renamed', `✅ Channel renamed to **${name}**`)] });
            }
        },
        
        // ========== VOICE-BAN ==========
        'voice-ban': {
            aliases: ['vban'],
            description: 'Bans user from channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                const target = message.mentions.members.first();
                if (!target) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'Please mention a user to ban!')] }); }
                if (target.id === message.author.id) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You cannot ban yourself!')] }); }
                
                await channel.permissionOverwrites.create(target.id, { Connect: false });
                if (target.voice.channel?.id === channel.id) { await target.voice.disconnect().catch(() => {}); }
                
                return message.reply({ embeds: [createVMEmbed('success', 'Banned', `✅ ${target} has been banned from the channel.`)] });
            }
        },
        
        // ========== VOICE-UNBAN ==========
        'voice-unban': {
            aliases: ['vunban', 'voice-unban-new'],
            description: 'Unbans user from channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                if (!channel) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] }); }
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) { return message.reply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can do that!')] }); }
                
                const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
                if (!target) { return message.reply({ embeds: [createVMEmbed('error', 'Error', 'Please provide a user to unban!')] }); }
                
                await channel.permissionOverwrites.delete(target.id).catch(() => {});
                return message.reply({ embeds: [createVMEmbed('success', 'Unbanned', `✅ ${target} has been unbanned from the channel.`)] });
            }
        }
    }
};

module.exports.handleVoiceMasterButton = handleVoiceMasterButton;
module.exports.vmCache = vmCache;
module.exports.loadConfig = loadConfig;
