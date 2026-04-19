const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

// Cache für schnellen Zugriff (wird aus Supabase geladen)
const vmCache = new Map();

// ========== HELPER: Konfiguration aus Supabase laden ==========
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

// ========== HELPER FUNKTION ==========
async function isOwner(userId, channel, guildId, supabase) {
    const config = await loadConfig(guildId, supabase);
    if (!config) return false;
    
    const ownerId = config.voiceChannels.get(channel.id);
    return ownerId === userId;
}

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = []) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C
    };
    
    const titles = {
        de: {
            no_vc: 'Kein VC',
            no_vm_channel: 'Kein VM Channel',
            no_setup: 'Kein Setup',
            no_owner: 'Kein Owner',
            already_claimed: 'Bereits geclaimed',
            locked: 'Gesperrt',
            unlocked: 'Entsperrt',
            hidden: 'Versteckt',
            revealed: 'Sichtbar',
            claimed: 'Geclaimed',
            disconnect: 'Disconnect',
            activity: 'Aktivität',
            error: 'Fehler',
            info: 'Info',
            limit_increased: 'Limit erhöht',
            limit_decreased: 'Limit verringert',
            setup: 'Setup',
            reset: 'VoiceMaster Reset',
            channel_locked: 'Channel gesperrt',
            channel_unlocked: 'Channel entsperrt',
            channel_hidden: 'Channel versteckt',
            channel_revealed: 'Channel sichtbar',
            channel_claimed: 'Channel übernommen',
            transfer: 'Transfer',
            limit_set: 'Limit gesetzt',
            renamed: 'Umbenannt',
            user_banned: 'User gebannt',
            user_unbanned: 'User entbannt',
            unlimited: 'Unbegrenzt',
            voice_master: 'VoiceMaster',
            setup_complete: 'VoiceMaster Setup',
            unknown: 'Unbekannt'
        },
        en: {
            no_vc: 'No VC',
            no_vm_channel: 'No VM Channel',
            no_setup: 'No Setup',
            no_owner: 'No Owner',
            already_claimed: 'Already Claimed',
            locked: 'Locked',
            unlocked: 'Unlocked',
            hidden: 'Hidden',
            revealed: 'Revealed',
            claimed: 'Claimed',
            disconnect: 'Disconnect',
            activity: 'Activity',
            error: 'Error',
            info: 'Info',
            limit_increased: 'Limit Increased',
            limit_decreased: 'Limit Decreased',
            setup: 'Setup',
            reset: 'VoiceMaster Reset',
            channel_locked: 'Channel Locked',
            channel_unlocked: 'Channel Unlocked',
            channel_hidden: 'Channel Hidden',
            channel_revealed: 'Channel Revealed',
            channel_claimed: 'Channel Claimed',
            transfer: 'Transfer',
            limit_set: 'Limit Set',
            renamed: 'Renamed',
            user_banned: 'User Banned',
            user_unbanned: 'User Unbanned',
            unlimited: 'Unlimited',
            voice_master: 'VoiceMaster',
            setup_complete: 'VoiceMaster Setup',
            unknown: 'Unknown'
        }
    };
    
    const descriptions = {
        de: {
            no_vc: 'Du bist in keinem Voice-Channel!',
            no_vm_channel: 'Das ist kein VoiceMaster Channel!',
            no_setup: 'VoiceMaster ist nicht eingerichtet!',
            no_owner: 'Nur der Channel-Owner kann das!',
            already_claimed: 'Dieser Channel hat bereits einen Owner!',
            locked: 'Channel wurde gesperrt!',
            unlocked: 'Channel wurde entsperrt!',
            hidden: 'Channel ist jetzt versteckt!',
            revealed: 'Channel ist jetzt sichtbar!',
            claimed: (user) => `Du bist jetzt Owner von ${user}!`,
            disconnect: 'Nutze `!voice-kick @User` um jemanden zu kicken.',
            activity: (link) => `[Klick hier für YouTube Together](https://discord.gg/${link})`,
            error_activity: 'Konnte Aktivität nicht starten!',
            limit_increased: (limit) => `Neues Limit: ${limit}`,
            limit_decreased: (limit) => `Neues Limit: ${limit === 0 ? 'Unbegrenzt' : limit}`,
            setup: '⏳ Erstelle VoiceMaster...',
            reset: 'VoiceMaster wurde zurückgesetzt.',
            channel_locked: (channel) => `${channel} wurde gesperrt.`,
            channel_unlocked: (channel) => `${channel} wurde entsperrt.`,
            channel_hidden: (channel) => `${channel} ist jetzt versteckt.`,
            channel_revealed: (channel) => `${channel} ist jetzt sichtbar.`,
            channel_claimed: (channel) => `Du bist jetzt Owner von ${channel}!`,
            transfer: (user) => `Channel-Ownership wurde an ${user} übertragen!`,
            limit_set: (limit) => `User-Limit: ${limit === 0 ? 'Unbegrenzt' : limit}`,
            renamed: (name) => `Channel heißt jetzt **${name}**`,
            user_banned: (user) => `${user} wurde vom Channel gebannt.`,
            user_unbanned: (user) => `${user} wurde entbannt.`,
            invalid_limit: 'Limit muss zwischen 0 und 99 sein!',
            no_name: '!voice-rename <Name>',
            name_too_long: 'Name darf maximal 100 Zeichen haben!',
            no_user: '!voice-ban @User',
            no_user_unban: '!voice-unban @User / ID',
            self_ban: 'Du kannst dich nicht selbst bannen!',
            no_transfer_user: '!voice-transfer @User',
            not_in_channel: (user) => `${user} ist nicht in deinem Channel!`,
            setup_success: (jtc, iface) => `✅ **Join-to-Create:** ${jtc}\n✅ **Interface:** ${iface}\n\nUser können jetzt dem Join-to-Create Channel beitreten!`,
            unknown: 'Dieser Button ist nicht konfiguriert.'
        },
        en: {
            no_vc: 'You are not in a voice channel!',
            no_vm_channel: 'This is not a VoiceMaster channel!',
            no_setup: 'VoiceMaster is not set up!',
            no_owner: 'Only the channel owner can do that!',
            already_claimed: 'This channel already has an owner!',
            locked: 'Channel locked!',
            unlocked: 'Channel unlocked!',
            hidden: 'Channel is now hidden!',
            revealed: 'Channel is now visible!',
            claimed: (user) => `You are now the owner of ${user}!`,
            disconnect: 'Use `!voice-kick @User` to kick someone.',
            activity: (link) => `[Click here for YouTube Together](https://discord.gg/${link})`,
            error_activity: 'Could not start activity!',
            limit_increased: (limit) => `New limit: ${limit}`,
            limit_decreased: (limit) => `New limit: ${limit === 0 ? 'Unlimited' : limit}`,
            setup: '⏳ Creating VoiceMaster...',
            reset: 'VoiceMaster has been reset.',
            channel_locked: (channel) => `${channel} has been locked.`,
            channel_unlocked: (channel) => `${channel} has been unlocked.`,
            channel_hidden: (channel) => `${channel} is now hidden.`,
            channel_revealed: (channel) => `${channel} is now visible.`,
            channel_claimed: (channel) => `You are now the owner of ${channel}!`,
            transfer: (user) => `Channel ownership transferred to ${user}!`,
            limit_set: (limit) => `User limit: ${limit === 0 ? 'Unlimited' : limit}`,
            renamed: (name) => `Channel renamed to **${name}**`,
            user_banned: (user) => `${user} has been banned from the channel.`,
            user_unbanned: (user) => `${user} has been unbanned.`,
            invalid_limit: 'Limit must be between 0 and 99!',
            no_name: '!voice-rename <Name>',
            name_too_long: 'Name can be maximum 100 characters!',
            no_user: '!voice-ban @User',
            no_user_unban: '!voice-unban @User / ID',
            self_ban: 'You cannot ban yourself!',
            no_transfer_user: '!voice-transfer @User',
            not_in_channel: (user) => `${user} is not in your channel!`,
            setup_success: (jtc, iface) => `✅ **Join-to-Create:** ${jtc}\n✅ **Interface:** ${iface}\n\nUsers can now join the Join-to-Create channel!`,
            unknown: 'This button is not configured.'
        }
    };
    
    const title = titles[lang]?.[titleKey] || titleKey;
    let description = descriptions[lang]?.[descKey] || descKey;
    
    // Funktionen in descriptions ausführen
    if (typeof description === 'function') {
        if (fields.length > 0) {
            description = description(...fields);
        } else {
            description = description();
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor(colors[type] || 0x5865F2)
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    // Footer mit User
    if (userId) {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    embed.setTimestamp();
    
    return embed;
}

// ========== VOICEMASTER BUTTON HANDLER ==========
async function handleVoiceMasterButton(interaction, client, supabase) {
    const { customId, member, guild } = interaction;
    const channel = member.voice.channel;
    const lang = client.languages?.get(guild.id) || 'de';
    
    await interaction.deferReply({ ephemeral: true });
    
    if (!channel) {
        return interaction.editReply({ 
            embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_vc', 'no_vc')] 
        });
    }
    
    if (!channel.name.includes('🎤')) {
        return interaction.editReply({ 
            embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_vm_channel', 'no_vm_channel')] 
        });
    }
    
    const config = await loadConfig(guild.id, supabase);
    if (!config) {
        return interaction.editReply({ 
            embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_setup', 'no_setup')] 
        });
    }
    
    const ownerCheck = config.voiceChannels.get(channel.id) === member.id;
    
    switch (customId) {
        case 'vm_lock':
            if (!ownerCheck) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_owner', 'no_owner')] 
                });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'success', 'locked', 'locked')] 
            });
            
        case 'vm_unlock':
            if (!ownerCheck) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_owner', 'no_owner')] 
                });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'success', 'unlocked', 'unlocked')] 
            });
            
        case 'vm_hide':
            if (!ownerCheck) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_owner', 'no_owner')] 
                });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'success', 'hidden', 'hidden')] 
            });
            
        case 'vm_reveal':
            if (!ownerCheck) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_owner', 'no_owner')] 
                });
            }
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'success', 'revealed', 'revealed')] 
            });
            
        case 'vm_claim':
            if (config.voiceChannels.has(channel.id)) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'already_claimed', 'already_claimed')] 
                });
            }
            config.voiceChannels.set(channel.id, member.id);
            vmCache.set(guild.id, config);
            
            await supabase.from('voicemaster_channels').upsert({
                guild_id: guild.id,
                channel_id: channel.id,
                owner_id: member.id
            });
            
            await channel.setName(`🎤 ${member.user.username}'s Channel`);
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'success', 'claimed', 'claimed', [channel.toString()])] 
            });
            
        case 'vm_disconnect':
            if (!ownerCheck) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_owner', 'no_owner')] 
                });
            }
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'info', 'disconnect', 'disconnect')] 
            });
            
        case 'vm_activity':
            if (!ownerCheck) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_owner', 'no_owner')] 
                });
            }
            try {
                const invite = await channel.createInvite({
                    targetApplication: '880218394199220334',
                    targetType: 2,
                    maxAge: 300
                });
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'success', 'activity', 'activity', [invite.code])] 
                });
            } catch {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'error', 'error_activity')] 
                });
            }
            
        case 'vm_info':
            const owner = config.voiceChannels.get(channel.id);
            const ownerUser = owner ? await client.users.fetch(owner).catch(() => null) : null;
            
            const infoEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setTitle(`ℹ️ ${channel.name}`)
                .addFields([
                    { name: lang === 'de' ? 'Owner' : 'Owner', value: ownerUser?.username || (lang === 'de' ? 'Keiner' : 'None'), inline: true },
                    { name: lang === 'de' ? 'User' : 'Users', value: `${channel.members.size}`, inline: true },
                    { name: lang === 'de' ? 'User-Limit' : 'User Limit', value: channel.userLimit === 0 ? (lang === 'de' ? 'Unbegrenzt' : 'Unlimited') : `${channel.userLimit}`, inline: true },
                    { name: lang === 'de' ? 'Bitrate' : 'Bitrate', value: `${channel.bitrate / 1000} kbps`, inline: true }
                ])
                .setFooter({ text: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
                .setTimestamp();
            
            return interaction.editReply({ embeds: [infoEmbed] });
            
        case 'vm_limit_plus':
            if (!ownerCheck) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_owner', 'no_owner')] 
                });
            }
            const newLimit = Math.min((channel.userLimit || 0) + 1, 99);
            await channel.setUserLimit(newLimit);
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'success', 'limit_increased', 'limit_increased', [newLimit])] 
            });
            
        case 'vm_limit_minus':
            if (!ownerCheck) {
                return interaction.editReply({ 
                    embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'no_owner', 'no_owner')] 
                });
            }
            const decreasedLimit = Math.max((channel.userLimit || 0) - 1, 0);
            await channel.setUserLimit(decreasedLimit);
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'success', 'limit_decreased', 'limit_decreased', [decreasedLimit])] 
            });
            
        default:
            return interaction.editReply({ 
                embeds: [await buildEmbed(client, guild.id, member.id, 'error', 'unknown', 'unknown')] 
            });
    }
}

module.exports = {
    category: 'Voicemaster',
    subCommands: {
        
        // ========== VOICEMASTER / SETUPVM ==========
        voicemaster: {
            aliases: ['setupvm', 'vm', 'voicesetup'],
            permissions: 'Administrator',
            description: 'Erstellt das VoiceMaster System / Creates VoiceMaster System',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const loadingMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'setup', 'setup')] 
                });
                
                // Alte Config löschen falls vorhanden
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
                    .setColor(0x5865F2)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🎛️ VoiceMaster Interface' : '🎛️ VoiceMaster Interface')
                    .setDescription(lang === 'de' 
                        ? 'Nutze die Buttons unten um deinen Voice-Channel zu steuern.\n\n*Antworten sind nur für dich sichtbar!*'
                        : 'Use the buttons below to control your voice channel.\n\n*Responses are only visible to you!*')
                    .addFields(
                        { name: '🔒 Lock', value: lang === 'de' ? 'Sperrt den Channel' : 'Locks the channel', inline: true },
                        { name: '🔓 Unlock', value: lang === 'de' ? 'Entsperrt den Channel' : 'Unlocks the channel', inline: true },
                        { name: '👻 Hide', value: lang === 'de' ? 'Versteckt den Channel' : 'Hides the channel', inline: true },
                        { name: '👁️ Reveal', value: lang === 'de' ? 'Zeigt den Channel' : 'Reveals the channel', inline: true },
                        { name: '📋 Claim', value: lang === 'de' ? 'Übernimmt den Channel' : 'Claims the channel', inline: true },
                        { name: '👢 Disconnect', value: lang === 'de' ? 'Kickt einen User' : 'Kicks a user', inline: true },
                        { name: '🎮 Activity', value: lang === 'de' ? 'Startet eine Aktivität' : 'Starts an activity', inline: true },
                        { name: 'ℹ️ Info', value: lang === 'de' ? 'Channel-Informationen' : 'Channel information', inline: true },
                        { name: '⬆️ Limit+', value: lang === 'de' ? 'Erhöht User-Limit' : 'Increases user limit', inline: true },
                        { name: '⬇️ Limit-', value: lang === 'de' ? 'Verringert User-Limit' : 'Decreases user limit', inline: true }
                    )
                    .setFooter({ text: message.guild.name })
                    .setTimestamp();
                
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('vm_lock').setLabel('Lock').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
                        new ButtonBuilder().setCustomId('vm_unlock').setLabel('Unlock').setStyle(ButtonStyle.Secondary).setEmoji('🔓'),
                        new ButtonBuilder().setCustomId('vm_hide').setLabel('Hide').setStyle(ButtonStyle.Secondary).setEmoji('👻'),
                        new ButtonBuilder().setCustomId('vm_reveal').setLabel('Reveal').setStyle(ButtonStyle.Secondary).setEmoji('👁️'),
                        new ButtonBuilder().setCustomId('vm_claim').setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('📋')
                    );
                
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
                    .setTitle(lang === 'de' ? '✅ VoiceMaster Setup' : '✅ VoiceMaster Setup')
                    .setDescription(lang === 'de' 
                        ? `✅ **Join-to-Create:** ${jtcChannel}\n✅ **Interface:** ${interfaceChannel}\n\nUser können jetzt dem Join-to-Create Channel beitreten!`
                        : `✅ **Join-to-Create:** ${jtcChannel}\n✅ **Interface:** ${interfaceChannel}\n\nUsers can now join the Join-to-Create channel!`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                await loadingMsg.edit({ embeds: [successEmbed] });
            }
        },
        
        // ========== VOICEMASTER-RESET ==========
        'voicemaster-reset': {
            aliases: ['vm-reset', 'resetvm'],
            permissions: 'Administrator',
            description: 'Setzt VoiceMaster zurück / Resets VoiceMaster',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
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
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'reset', 'reset')] 
                });
            }
        },
        
        // ========== VOICE-LOCK ==========
        'voice-lock': {
            aliases: ['vlock'],
            description: 'Sperrt deinen Voice-Channel / Locks your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'channel_locked', 'channel_locked', [channel.toString()])] 
                });
            }
        },
        
        // ========== VOICE-UNLOCK ==========
        'voice-unlock': {
            aliases: ['vunlock'],
            description: 'Entsperrt deinen Voice-Channel / Unlocks your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: null });
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'channel_unlocked', 'channel_unlocked', [channel.toString()])] 
                });
            }
        },
        
        // ========== VOICE-HIDE ==========
        'voice-hide': {
            aliases: ['vhide', 'ghost'],
            description: 'Versteckt deinen Voice-Channel / Hides your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'channel_hidden', 'channel_hidden', [channel.toString()])] 
                });
            }
        },
        
        // ========== VOICE-UNHIDE ==========
        'voice-unhide': {
            aliases: ['vunhide', 'reveal'],
            description: 'Zeigt deinen Voice-Channel / Reveals your voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'channel_revealed', 'channel_revealed', [channel.toString()])] 
                });
            }
        },
        
        // ========== VOICE-CLAIM ==========
        'voice-claim': {
            aliases: ['vclaim'],
            description: 'Übernimmt einen Voice-Channel / Claims a voice channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                const config = await loadConfig(message.guild.id, supabase);
                if (!config) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_setup', 'no_setup')] 
                    });
                }
                
                if (!channel.name.includes('🎤')) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vm_channel', 'no_vm_channel')] 
                    });
                }
                
                config.voiceChannels.set(channel.id, message.author.id);
                vmCache.set(message.guild.id, config);
                
                await supabase.from('voicemaster_channels').upsert({
                    guild_id: message.guild.id,
                    channel_id: channel.id,
                    owner_id: message.author.id
                });
                
                await channel.setName(`🎤 ${message.author.username}'s Channel`);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'channel_claimed', 'channel_claimed', [channel.toString()])] 
                });
            }
        },
        
        // ========== VOICE-TRANSFER ==========
        'voice-transfer': {
            aliases: ['vtransfer', 'transfer-new'],
            description: 'Überträgt Channel-Ownership / Transfers channel ownership',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'no_transfer_user')] 
                    });
                }
                
                if (!target.voice.channel || target.voice.channel.id !== channel.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'not_in_channel', 'not_in_channel', [target.toString()])] 
                    });
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
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'transfer', 'transfer', [target.toString()])] 
                });
            }
        },
        
        // ========== VOICE-LIMIT ==========
        'voice-limit': {
            aliases: ['vlimit'],
            description: 'Setzt User-Limit / Sets user limit',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                const limit = parseInt(args[0]);
                if (isNaN(limit) || limit < 0 || limit > 99) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'invalid_limit', 'invalid_limit')] 
                    });
                }
                
                await channel.setUserLimit(limit);
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'limit_set', 'limit_set', [limit])] 
                });
            }
        },
        
        // ========== VOICE-RENAME ==========
        'voice-rename': {
            aliases: ['vrename'],
            description: 'Benennt Channel um / Renames channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                const name = args.join(' ');
                if (!name) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_name', 'no_name')] 
                    });
                }
                
                if (name.length > 100) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'name_too_long', 'name_too_long')] 
                    });
                }
                
                await channel.setName(`🎤 ${name}`);
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'renamed', 'renamed', [name])] 
                });
            }
        },
        
        // ========== VOICE-BAN ==========
        'voice-ban': {
            aliases: ['vban'],
            description: 'Bannt User vom Channel / Bans user from channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                const target = message.mentions.members.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'no_user')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'self_ban', 'self_ban')] 
                    });
                }
                
                await channel.permissionOverwrites.create(target.id, { Connect: false });
                
                if (target.voice.channel?.id === channel.id) {
                    await target.voice.disconnect();
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'user_banned', 'user_banned', [target.toString()])] 
                });
            }
        },
        
        // ========== VOICE-UNBAN ==========
        'voice-unban': {
            aliases: ['vunban', 'voice-unban-new'],
            description: 'Entbannt User vom Channel / Unbans user from channel',
            category: 'Voicemaster',
            async execute(message, args, { client, supabase }) {
                const channel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!channel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                if (!await isOwner(message.author.id, channel, message.guild.id, supabase)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_owner', 'no_owner')] 
                    });
                }
                
                const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'no_user_unban')] 
                    });
                }
                
                await channel.permissionOverwrites.delete(target.id).catch(() => {});
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'user_unbanned', 'user_unbanned', [target.toString()])] 
                });
            }
        }
    }
};

module.exports.handleVoiceMasterButton = handleVoiceMasterButton;
module.exports.vmCache = vmCache;
module.exports.loadConfig = loadConfig;
