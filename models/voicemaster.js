const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

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

// ========== VOICEMASTER BUTTON HANDLER ==========
async function handleVoiceMasterButton(interaction, client, supabase) {
    const { customId, member, guild } = interaction;
    const channel = member.voice.channel;
    
    await interaction.deferReply({ ephemeral: true });
    
    if (!channel) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You are not in a voice channel!')
            .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
    }
    
    if (!channel.name.includes('🎤')) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ This is not a VoiceMaster channel!')
            .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
    }
    
    const config = await loadConfig(guild.id, supabase);
    if (!config) {
        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ VoiceMaster is not set up!')
            .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
    }
    
    const ownerCheck = config.voiceChannels.get(channel.id) === member.id;
    
    switch (customId) {
        case 'vm_lock':
            if (!ownerCheck) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Only the channel owner can do that!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
            const lockEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription('🔒 Channel locked!')
                .setTimestamp();
            return interaction.editReply({ embeds: [lockEmbed] });
            
        case 'vm_unlock':
            if (!ownerCheck) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Only the channel owner can do that!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
            const unlockEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription('🔓 Channel unlocked!')
                .setTimestamp();
            return interaction.editReply({ embeds: [unlockEmbed] });
            
        case 'vm_hide':
            if (!ownerCheck) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Only the channel owner can do that!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
            const hideEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription('👻 Channel is now hidden!')
                .setTimestamp();
            return interaction.editReply({ embeds: [hideEmbed] });
            
        case 'vm_reveal':
            if (!ownerCheck) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Only the channel owner can do that!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
            const revealEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription('👁️ Channel is now visible!')
                .setTimestamp();
            return interaction.editReply({ embeds: [revealEmbed] });
            
        case 'vm_claim':
            if (config.voiceChannels.has(channel.id)) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ This channel already has an owner!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            config.voiceChannels.set(channel.id, member.id);
            vmCache.set(guild.id, config);
            
            await supabase.from('voicemaster_channels').upsert({
                guild_id: guild.id,
                channel_id: channel.id,
                owner_id: member.id
            });
            
            await channel.setName(`🎤 ${member.user.username}'s Channel`);
            const claimEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`📋 You are now the owner of ${channel}!`)
                .setTimestamp();
            return interaction.editReply({ embeds: [claimEmbed] });
            
        case 'vm_disconnect':
            if (!ownerCheck) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Only the channel owner can do that!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            const disconnectEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setDescription('👢 Use `!voice-kick @User` to kick someone.')
                .setTimestamp();
            return interaction.editReply({ embeds: [disconnectEmbed] });
            
        case 'vm_activity':
            if (!ownerCheck) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Only the channel owner can do that!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            try {
                const invite = await channel.createInvite({
                    targetApplication: '880218394199220334',
                    targetType: 2,
                    maxAge: 300
                });
                const activityEmbed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`🎮 [Click here for YouTube Together](https://discord.gg/${invite.code})`)
                    .setTimestamp();
                return interaction.editReply({ embeds: [activityEmbed] });
            } catch {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Could not start activity!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            
        case 'vm_info':
            const owner = config.voiceChannels.get(channel.id);
            const ownerUser = owner ? await client.users.fetch(owner).catch(() => null) : null;
            
            const infoEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setTitle(`ℹ️ ${channel.name}`)
                .addFields([
                    { name: '👑 Owner', value: ownerUser?.username || 'None', inline: true },
                    { name: '👥 Users', value: `${channel.members.size}`, inline: true },
                    { name: '🔢 User Limit', value: channel.userLimit === 0 ? 'Unlimited' : `${channel.userLimit}`, inline: true },
                    { name: '🎵 Bitrate', value: `${channel.bitrate / 1000} kbps`, inline: true }
                ])
                .setFooter({ text: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [infoEmbed] });
            
        case 'vm_limit_plus':
            if (!ownerCheck) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Only the channel owner can do that!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            const newLimit = Math.min((channel.userLimit || 0) + 1, 99);
            await channel.setUserLimit(newLimit);
            const plusEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`⬆️ User limit increased to **${newLimit}**`)
                .setTimestamp();
            return interaction.editReply({ embeds: [plusEmbed] });
            
        case 'vm_limit_minus':
            if (!ownerCheck) {
                const embed = new EmbedBuilder()
                    .setColor(0xED4245)
                    .setDescription('❌ Only the channel owner can do that!')
                    .setTimestamp();
                return interaction.editReply({ embeds: [embed] });
            }
            const decreasedLimit = Math.max((channel.userLimit || 0) - 1, 0);
            await channel.setUserLimit(decreasedLimit);
            const minusEmbed = new EmbedBuilder()
                .setColor(0x57F287)
                .setDescription(`⬇️ User limit decreased to **${decreasedLimit === 0 ? 'Unlimited' : decreasedLimit}**`)
                .setTimestamp();
            return interaction.editReply({ embeds: [minusEmbed] });
            
        default:
            const embed = new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ This button is not configured!')
                .setTimestamp();
            return interaction.editReply({ embeds: [embed] });
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
                
                // Delete old config if exists
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
                
                // New Interface Panel Embed - Like in the image
                const panelEmbed = new EmbedBuilder()
                    .setColor(0x2B2D31)
                    .setAuthor({ name: 'VoiceMaster Interface', iconURL: client.user.displayAvatarURL() })
                    .setDescription('Use the buttons below to control your voice channel.\n\n*Responses are only visible to you!*')
                    .addFields(
                        { name: '🔒 Lock', value: 'Locks the channel', inline: true },
                        { name: '🔓 Unlock', value: 'Unlocks the channel', inline: true },
                        { name: '👻 Hide', value: 'Hides the channel', inline: true },
                        { name: '👁️ Reveal', value: 'Reveals the channel', inline: true },
                        { name: '📋 Claim', value: 'Claims the channel', inline: true },
                        { name: '👢 Disconnect', value: 'Kicks a user', inline: true },
                        { name: '🎮 Activity', value: 'Starts an activity', inline: true },
                        { name: 'ℹ️ Info', value: 'Channel information', inline: true },
                        { name: '⬆️ Limit+', value: 'Increases user limit', inline: true },
                        { name: '⬇️ Limit-', value: 'Decreases user limit', inline: true }
                    )
                    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
                    .setTimestamp();
                
                // Row 1: Lock, Unlock, Hide, Reveal, Claim
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
                        new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
                        new ButtonBuilder().setCustomId('vm_hide').setLabel('Hide').setStyle(ButtonStyle.Secondary).setEmoji('👻'),
                        new ButtonBuilder().setCustomId('vm_reveal').setLabel('Reveal').setStyle(ButtonStyle.Secondary).setEmoji('👁️'),
                        new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('📋')
                    );
                
                // Row 2: Disconnect, Activity, Info, Limit+, Limit-
                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('vm_disconnect').setLabel('Disconnect').setStyle(ButtonStyle.Danger).setEmoji('👢'),
                        new ButtonBuilder().setCustomId('vm_activity').setLabel('Activity').setStyle(ButtonStyle.Success).setEmoji('🎮'),
                        new ButtonBuilder().setCustomId('vm_info').setLabel('Info').setStyle(ButtonStyle.Primary).setEmoji('ℹ️'),
                        new ButtonBuilder().setCustomId('vm_limit_plus').setLabel('Limit+').setStyle(ButtonStyle.Success).setEmoji('⬆️'),
                        new ButtonBuilder().setCustomId('vm_limit_minus').setLabel('Limit-').setStyle(ButtonStyle.Danger).setEmoji('⬇️')
                    );
                
                await interfaceChannel.send({ embeds: [panelEmbed], components: [row1, row2] });
                
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
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
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
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription('✅ VoiceMaster has been reset.')
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-LOCK ==========
        'voice-lock': {
            aliases: ['vlock'],
            description: 'Locks your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`🔒 ${channel} has been locked.`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-UNLOCK ==========
        'voice-unlock': {
            aliases: ['vunlock'],
            description: 'Unlocks your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: null });
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`🔓 ${channel} has been unlocked.`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-HIDE ==========
        'voice-hide': {
            aliases: ['vhide', 'ghost'],
            description: 'Hides your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`👻 ${channel} is now hidden.`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-UNHIDE ==========
        'voice-unhide': {
            aliases: ['vunhide', 'reveal'],
            description: 'Reveals your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`👁️ ${channel} is now visible.`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-CLAIM ==========
        'voice-claim': {
            aliases: ['vclaim'],
            description: 'Claims a voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const config = await loadConfig(message.guild.id, supabase);
                if (!config) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ VoiceMaster is not set up!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!channel.name.includes('🎤')) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ This is not a VoiceMaster channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                config.voiceChannels.set(channel.id, message.author.id);
                vmCache.set(message.guild.id, config);
                
                await supabase.from('voicemaster_channels').upsert({
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    owner_id: message.author.id
                });
                
                await channel.setName(`🎤 ${message.author.username}'s Channel`);
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`📋 You are now the owner of ${channel}!`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-TRANSFER ==========
        'voice-transfer': {
            aliases: ['vtransfer', 'transfer-new'],
            description: 'Transfers channel ownership',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please mention a user to transfer ownership to!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!target.voice.channel || target.voice.channel.id !== channel.id) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription(`❌ ${target} is not in your channel!`)
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
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
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`✅ Channel ownership transferred to ${target}!`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-LIMIT ==========
        'voice-limit': {
            aliases: ['vlimit'],
            description: 'Sets user limit',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const limit = parseInt(args[0]);
                if (isNaN(limit) || limit < 0 || limit > 99) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Limit must be between 0 and 99!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                await channel.setUserLimit(limit);
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`✅ User limit set to **${limit === 0 ? 'Unlimited' : limit}**`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-RENAME ==========
        'voice-rename': {
            aliases: ['vrename'],
            description: 'Renames channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const name = args.join(' ');
                if (!name) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please provide a name!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (name.length > 100) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Name can be maximum 100 characters!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                await channel.setName(`🎤 ${name}`);
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`✅ Channel renamed to **${name}**`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-BAN ==========
        'voice-ban': {
            aliases: ['vban'],
            description: 'Bans user from channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please mention a user to ban!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (target.id === message.author.id) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You cannot ban yourself!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                await channel.permissionOverwrites.create(target.id, { Connect: false });
                
                if (target.voice.channel?.id === channel.id) {
                    await target.voice.disconnect();
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`✅ ${target} has been banned from the channel.`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== VOICE-UNBAN ==========
        'voice-unban': {
            aliases: ['vunban', 'voice-unban-new'],
            description: 'Unbans user from channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ You are not in a voice channel!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Only the channel owner can do that!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
                if (!target) {
                    const embed = new EmbedBuilder()
                        .setColor(0xED4245)
                        .setDescription('❌ Please provide a user to unban!')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                
                await channel.permissionOverwrites.delete(target.id).catch(() => {});
                
                const embed = new EmbedBuilder()
                    .setColor(0x57F287)
                    .setDescription(`✅ ${target} has been unbanned from the channel.`)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

module.exports.handleVoiceMasterButton = handleVoiceMasterButton;
module.exports.vmCache = vmCache;
module.exports.loadConfig = loadConfig;
