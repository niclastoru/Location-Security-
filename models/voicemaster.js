const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ChannelType, 
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
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

// ========== JOIN TO CREATE HANDLER ==========
async function handleJoinToCreate(newState, client, supabase) {
    const { guild, member, channelId } = newState;
    if (!channelId) return;

    const config = await loadConfig(guild.id, supabase);
    if (!config || channelId !== config.jtcChannel) return;

    try {
        const newChannel = await guild.channels.create({
            name: `🎤 ${member.user.username}'s Channel`,
            type: ChannelType.GuildVoice,
            parent: newState.channel.parent,
            permissionOverwrites: [
                { 
                    id: member.id, 
                    allow: [
                        PermissionFlagsBits.Connect, 
                        PermissionFlagsBits.Speak, 
                        PermissionFlagsBits.Stream,
                        PermissionFlagsBits.UseVAD,
                        PermissionFlagsBits.PrioritySpeaker,
                        PermissionFlagsBits.MoveMembers,
                        PermissionFlagsBits.MuteMembers,
                        PermissionFlagsBits.DeafenMembers
                    ] 
                },
                {
                    id: guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.Connect]
                }
            ]
        });

        await member.voice.setChannel(newChannel);

        await supabase.from('voicemaster_channels').insert({
            guild_id: guild.id,
            channel_id: newChannel.id,
            owner_id: member.id
        });

        config.voiceChannels.set(newChannel.id, member.id);
        vmCache.set(guild.id, config);

        console.log(`✅ VoiceMaster Channel created for ${member.user.tag}`);
    } catch (error) {
        console.error('Fehler beim Erstellen des Voice-Channels:', error);
        try {
            await member.send({ 
                embeds: [new EmbedBuilder().setColor(0xED4245).setTitle('❌ VoiceMaster Fehler').setDescription(`Ich konnte deinen Channel nicht erstellen!\n\n**Fehler:** \`${error.message}\``)]
            }).catch(() => {});
        } catch (e) {}
    }
}

// ========== VOICEMASTER BUTTON HANDLER ==========
async function handleVoiceMasterButton(interaction, client, supabase) {
    const { customId, member, guild } = interaction;
    const channel = member.voice.channel;
    
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    if (!channel) return interaction.editReply({ embeds: [createVMEmbed('error', 'Error', 'You are not in a voice channel!')] });
    if (!channel.name.includes('🎤')) return interaction.editReply({ embeds: [createVMEmbed('error', 'Error', 'This is not a VoiceMaster channel!')] });
    
    const config = await loadConfig(guild.id, supabase);
    if (!config) return interaction.editReply({ embeds: [createVMEmbed('error', 'Error', 'VoiceMaster is not set up properly!')] });
    
    const currentOwner = config.voiceChannels.get(channel.id);
    const isOwner = currentOwner === member.id;
    
    const checkOwner = () => {
        if (!isOwner) {
            interaction.editReply({ embeds: [createVMEmbed('error', 'Permission Denied', 'Only the channel owner can use this button!')] });
            return false;
        }
        return true;
    };

    switch (customId) {
        case 'vm_lock':
            if (!checkOwner()) return;
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Locked', '🔒 Your channel is now locked.')] });
            
        case 'vm_unlock':
            if (!checkOwner()) return;
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Unlocked', '🔓 Your channel is now unlocked.')] });
            
        case 'vm_hide':
            if (!checkOwner()) return;
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Hidden', '👻 Your channel is now hidden.')] });
            
        case 'vm_reveal':
            if (!checkOwner()) return;
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Revealed', '👁️ Your channel is now visible.')] });
            
        case 'vm_claim':
            if (currentOwner) {
                const ownerMember = await guild.members.fetch(currentOwner).catch(() => null);
                if (ownerMember && ownerMember.voice.channelId === channel.id) {
                    return interaction.editReply({ embeds: [createVMEmbed('error', 'Claim Failed', 'The current owner is still in the channel!')] });
                }
            }
            config.voiceChannels.set(channel.id, member.id);
            vmCache.set(guild.id, config);
            await supabase.from('voicemaster_channels').upsert({ guild_id: guild.id, channel_id: channel.id, owner_id: member.id });
            await channel.setName(`🎤 ${member.user.username}'s Channel`);
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Claimed', `📋 You are now the proud owner of **${channel.name}**!`)] });
            
        case 'vm_disconnect':
            if (!checkOwner()) return;
            return interaction.editReply({ embeds: [createVMEmbed('info', 'Disconnect', '👢 Please use the `!voice-kick @User` command.')] });
            
        case 'vm_activity':
            if (!checkOwner()) return;
            try {
                const invite = await channel.createInvite({ targetApplication: '880218394199220334', targetType: 2, maxAge: 300 });
                return interaction.editReply({ embeds: [createVMEmbed('success', 'Activity Started', `🎮 [Click here to open YouTube Together](https://discord.gg/${invite.code})`)] });
            } catch {
                return interaction.editReply({ embeds: [createVMEmbed('error', 'Activity Failed', 'Could not start the activity.')] });
            }
            
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
            
        case 'vm_limit_plus':
            if (!checkOwner()) return;
            const newLimit = (channel.userLimit === 0 || channel.userLimit === 99) ? (channel.userLimit === 99 ? 99 : 1) : channel.userLimit + 1;
            await channel.setUserLimit(newLimit);
            return interaction.editReply({ embeds: [createVMEmbed('success', 'Limit Increased', `⬆️ User limit is now **${newLimit}**.`)] });
            
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
        voicemaster: {
            aliases: ['setupvm', 'vm', 'voicesetup'],
            permissions: 'Administrator',
            description: 'Creates the VoiceMaster system',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const loadingMsg = await message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription('⏳ Creating VoiceMaster...')] });
                
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
                    name: '🎤｜interface',
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: message.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });
                
                // ⭐ DAS NEUE DESIGN (wie im Screenshot)
                const container = new ContainerBuilder()
                    .setAccentColor(0x5865F2); // Blauer Rand

                // Kopfzeile: Avatar + VoiceMaster Interface
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### <:void:1329079892723363972> VoiceMaster Interface`)
                );
                
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Use the buttons below to manage your voice channel.`)
                );

                container.addSeparatorComponents(new SeparatorBuilder());

                // Liste der Buttons (als Text)
                const buttonList = 
                    `**Buttons**\n` +
                    `🔒 - **Lock** your voice channel\n` +
                    `🔓 - **Unlock** your voice channel\n` +
                    `👻 - **Hide** your voice channel\n` +
                    `👁️ - **Reveal** your voice channel\n` +
                    `✏️ - **Rename** your voice channel\n` +
                    `⬆️ - **Increase** your voice channel's user limit\n` +
                    `⬇️ - **Decrease** your voice channel's user limit\n` +
                    `👑 - **Claim** your voice channel\n` +
                    `➡️ - **Transfer** ownership of your voice channel\n` +
                    `🗑️ - **Delete** your voice channel`;

                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(buttonList)
                );

                // Die Buttons (2 Reihen, alle grau mit Emojis)
                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('vm_lock').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
                    new ButtonBuilder().setCustomId('vm_unlock').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
                    new ButtonBuilder().setCustomId('vm_hide').setStyle(ButtonStyle.Secondary).setEmoji('👻'),
                    new ButtonBuilder().setCustomId('vm_reveal').setStyle(ButtonStyle.Secondary).setEmoji('👁️'),
                    new ButtonBuilder().setCustomId('vm_limit_plus').setStyle(ButtonStyle.Secondary).setEmoji('⬆️')
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('vm_limit_minus').setStyle(ButtonStyle.Secondary).setEmoji('⬇️'),
                    new ButtonBuilder().setCustomId('vm_claim').setStyle(ButtonStyle.Secondary).setEmoji('👑'),
                    new ButtonBuilder().setCustomId('vm_activity').setStyle(ButtonStyle.Secondary).setEmoji('➡️'),
                    new ButtonBuilder().setCustomId('vm_disconnect').setStyle(ButtonStyle.Secondary).setEmoji('👢'),
                    new ButtonBuilder().setCustomId('vm_info').setStyle(ButtonStyle.Secondary).setEmoji('🗑️')
                );

                container.addActionRowComponents(row1);
                container.addActionRowComponents(row2);

                // Senden der Nachricht mit Components V2
                await interfaceChannel.send({ 
                    components: [container], 
                    flags: MessageFlags.IsComponentsV2 
                });
                
                // In Supabase speichern
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
                    .setDescription(`✅ **Join-to-Create:** ${jtcChannel}\n✅ **Interface:** ${interfaceChannel}`)
                    .setTimestamp();
                
                await loadingMsg.edit({ embeds: [successEmbed] });
            }
        },
        
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
                    for (const [channelId] of config.voiceChannels) {
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

// ⭐ Export für index.js
module.exports.handleVoiceMasterButton = handleVoiceMasterButton;
module.exports.handleJoinToCreate = handleJoinToCreate;
module.exports.vmCache = vmCache;
module.exports.loadConfig = loadConfig;
