const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

// Cache für VoiceMaster Channels
const vmCache = new Map();

// ========== HELPER FUNKTION ==========
function isOwner(userId, channel, guildId) {
    const config = vmCache.get(guildId);
    if (!config) return false;
    
    const ownerId = config.voiceChannels.get(channel.id);
    return ownerId === userId;
}

// ========== VOICEMASTER BUTTON HANDLER (OPTIMIERT) ==========
async function handleVoiceMasterButton(interaction, client) {
    const { customId, member, guild } = interaction;
    const channel = member.voice.channel;
    
    // ⭐ SOFORT deferen für schnelle Antwort
    await interaction.deferReply({ ephemeral: true });
    
    if (!channel) {
        return interaction.editReply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
    }
    
    if (!channel.name.includes('🎤')) {
        return interaction.editReply({ embeds: [global.embed.error('Kein VM Channel', 'Das ist kein VoiceMaster Channel!')] });
    }
    
    const config = vmCache.get(guild.id);
    if (!config) {
        return interaction.editReply({ embeds: [global.embed.error('Kein Setup', 'VoiceMaster ist nicht eingerichtet!')] });
    }
    
    const ownerCheck = config.voiceChannels.get(channel.id) === member.id;
    
    switch (customId) {
        case 'vm_lock':
            if (!ownerCheck) return interaction.editReply({ embeds: [global.embed.error('Kein Owner', 'Nur der Channel-Owner kann das!')] });
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
            return interaction.editReply({ embeds: [global.embed.success('Gesperrt', 'Channel wurde gesperrt!')] });
            
        case 'vm_unlock':
            if (!ownerCheck) return interaction.editReply({ embeds: [global.embed.error('Kein Owner', 'Nur der Channel-Owner kann das!')] });
            await channel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
            return interaction.editReply({ embeds: [global.embed.success('Entsperrt', 'Channel wurde entsperrt!')] });
            
        case 'vm_hide':
            if (!ownerCheck) return interaction.editReply({ embeds: [global.embed.error('Kein Owner', 'Nur der Channel-Owner kann das!')] });
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
            return interaction.editReply({ embeds: [global.embed.success('Versteckt', 'Channel ist jetzt versteckt!')] });
            
        case 'vm_reveal':
            if (!ownerCheck) return interaction.editReply({ embeds: [global.embed.error('Kein Owner', 'Nur der Channel-Owner kann das!')] });
            await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
            return interaction.editReply({ embeds: [global.embed.success('Sichtbar', 'Channel ist jetzt sichtbar!')] });
            
        case 'vm_claim':
            if (config.voiceChannels.has(channel.id)) {
                return interaction.editReply({ embeds: [global.embed.error('Bereits geclaimed', 'Dieser Channel hat bereits einen Owner!')] });
            }
            config.voiceChannels.set(channel.id, member.id);
            vmCache.set(guild.id, config);
            await channel.setName(`🎤 ${member.user.username}'s Channel`);
            return interaction.editReply({ embeds: [global.embed.success('Geclaimed', `Du bist jetzt Owner von ${channel}!`)] });
            
        case 'vm_disconnect':
            if (!ownerCheck) return interaction.editReply({ embeds: [global.embed.error('Kein Owner', 'Nur der Channel-Owner kann das!')] });
            return interaction.editReply({ embeds: [global.embed.info('Disconnect', 'Nutze `!voice-kick @User` um jemanden zu kicken.')] });
            
        case 'vm_activity':
            if (!ownerCheck) return interaction.editReply({ embeds: [global.embed.error('Kein Owner', 'Nur der Channel-Owner kann das!')] });
            try {
                const invite = await channel.createInvite({
                    targetApplication: '880218394199220334',
                    targetType: 2,
                    maxAge: 300
                });
                return interaction.editReply({ embeds: [global.embed.success('Aktivität', `[Klick hier für YouTube Together](https://discord.gg/${invite.code})`)] });
            } catch {
                return interaction.editReply({ embeds: [global.embed.error('Fehler', 'Konnte Aktivität nicht starten!')] });
            }
            
        case 'vm_info':
            const owner = config.voiceChannels.get(channel.id);
            const ownerUser = owner ? await client.users.fetch(owner).catch(() => null) : null;
            
            return interaction.editReply({ embeds: [{
                color: 0x0099FF,
                title: `ℹ️ ${channel.name}`,
                fields: [
                    { name: 'Owner', value: ownerUser?.username || 'Keiner', inline: true },
                    { name: 'User', value: `${channel.members.size}`, inline: true },
                    { name: 'User-Limit', value: channel.userLimit === 0 ? 'Unbegrenzt' : `${channel.userLimit}`, inline: true },
                    { name: 'Bitrate', value: `${channel.bitrate / 1000} kbps`, inline: true }
                ]
            }] });
            
        case 'vm_limit_plus':
            if (!ownerCheck) return interaction.editReply({ embeds: [global.embed.error('Kein Owner', 'Nur der Channel-Owner kann das!')] });
            const newLimit = Math.min((channel.userLimit || 0) + 1, 99);
            await channel.setUserLimit(newLimit);
            return interaction.editReply({ embeds: [global.embed.success('Limit erhöht', `Neues Limit: ${newLimit}`)] });
            
        case 'vm_limit_minus':
            if (!ownerCheck) return interaction.editReply({ embeds: [global.embed.error('Kein Owner', 'Nur der Channel-Owner kann das!')] });
            const decreasedLimit = Math.max((channel.userLimit || 0) - 1, 0);
            await channel.setUserLimit(decreasedLimit);
            return interaction.editReply({ embeds: [global.embed.success('Limit verringert', `Neues Limit: ${decreasedLimit === 0 ? 'Unbegrenzt' : decreasedLimit}`)] });
            
        default:
            return interaction.editReply({ embeds: [global.embed.error('Unbekannt', 'Dieser Button ist nicht konfiguriert.')] });
    }
}

module.exports = {
    category: 'Voicemaster',
    subCommands: {
        
        // ========== VOICEMASTER / SETUPVM ==========
        voicemaster: {
            aliases: ['setupvm', 'vm', 'voicesetup'],
            permissions: 'Administrator',
            description: 'Erstellt das VoiceMaster System',
            category: 'Voicemaster',
            async execute(message, args, { client }) {
                
                // Loading Nachricht
                const loadingMsg = await message.reply({ embeds: [global.embed.info('Setup', '⏳ Erstelle VoiceMaster...')] });
                
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
                    .setColor(0x0099FF)
                    .setTitle('🎛️ VoiceMaster Interface')
                    .setDescription('Nutze die Buttons unten um deinen Voice-Channel zu steuern.\n\n*Antworten sind nur für dich sichtbar!*')
                    .addFields(
                        { name: '🔒 Lock', value: 'Sperrt den Channel', inline: true },
                        { name: '🔓 Unlock', value: 'Entsperrt den Channel', inline: true },
                        { name: '👻 Hide', value: 'Versteckt den Channel', inline: true },
                        { name: '👁️ Reveal', value: 'Zeigt den Channel', inline: true },
                        { name: '📋 Claim', value: 'Übernimmt den Channel', inline: true },
                        { name: '👢 Disconnect', value: 'Kickt einen User', inline: true },
                        { name: '🎮 Activity', value: 'Startet eine Aktivität', inline: true },
                        { name: 'ℹ️ Info', value: 'Channel-Informationen', inline: true },
                        { name: '⬆️ Limit+', value: 'Erhöht User-Limit', inline: true },
                        { name: '⬇️ Limit-', value: 'Verringert User-Limit', inline: true }
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
                
                vmCache.set(message.guild.id, {
                    jtcChannel: jtcChannel.id,
                    interfaceChannel: interfaceChannel.id,
                    voiceChannels: new Map()
                });
                
                await loadingMsg.edit({ 
                    embeds: [global.embed.success('VoiceMaster Setup', 
                        `✅ **Join-to-Create:** ${jtcChannel}\n` +
                        `✅ **Interface:** ${interfaceChannel}\n\n` +
                        `User können jetzt dem Join-to-Create Channel beitreten!`
                    )] 
                });
            }
        },
        
        // ========== VOICEMASTER-RESET ==========
        'voicemaster-reset': {
            aliases: ['vm-reset', 'resetvm'],
            permissions: 'Administrator',
            description: 'Setzt VoiceMaster zurück',
            category: 'Voicemaster',
            async execute(message) {
                const config = vmCache.get(message.guild.id);
                if (config) {
                    const jtcChannel = message.guild.channels.cache.get(config.jtcChannel);
                    const interfaceChannel = message.guild.channels.cache.get(config.interfaceChannel);
                    
                    if (jtcChannel) await jtcChannel.delete().catch(() => {});
                    if (interfaceChannel) await interfaceChannel.delete().catch(() => {});
                    
                    for (const [userId, channelId] of config.voiceChannels) {
                        const channel = message.guild.channels.cache.get(channelId);
                        if (channel) await channel.delete().catch(() => {});
                    }
                    
                    vmCache.delete(message.guild.id);
                }
                
                return message.reply({ embeds: [global.embed.success('VoiceMaster Reset', 'VoiceMaster wurde zurückgesetzt.')] });
            }
        },
        
        // ========== VOICE-LOCK ==========
        'voice-lock': {
            aliases: ['vlock'],
            description: 'Sperrt deinen Voice-Channel',
            category: 'Voicemaster',
            async execute(message) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: false });
                return message.reply({ embeds: [global.embed.success('Channel gesperrt', `${channel} wurde gesperrt.`)] });
            }
        },
        
        // ========== VOICE-UNLOCK ==========
        'voice-unlock': {
            aliases: ['vunlock'],
            description: 'Entsperrt deinen Voice-Channel',
            category: 'Voicemaster',
            async execute(message) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { Connect: null });
                return message.reply({ embeds: [global.embed.success('Channel entsperrt', `${channel} wurde entsperrt.`)] });
            }
        },
        
        // ========== VOICE-HIDE ==========
        'voice-hide': {
            aliases: ['vhide', 'ghost'],
            description: 'Versteckt deinen Voice-Channel',
            category: 'Voicemaster',
            async execute(message) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false });
                return message.reply({ embeds: [global.embed.success('Channel versteckt', `${channel} ist jetzt versteckt.`)] });
            }
        },
        
        // ========== VOICE-UNHIDE ==========
        'voice-unhide': {
            aliases: ['vunhide', 'reveal'],
            description: 'Zeigt deinen Voice-Channel',
            category: 'Voicemaster',
            async execute(message) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null });
                return message.reply({ embeds: [global.embed.success('Channel sichtbar', `${channel} ist jetzt sichtbar.`)] });
            }
        },
        
        // ========== VOICE-CLAIM ==========
        'voice-claim': {
            aliases: ['vclaim'],
            description: 'Übernimmt einen Voice-Channel',
            category: 'Voicemaster',
            async execute(message) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                const config = vmCache.get(message.guild.id);
                if (!config) return message.reply({ embeds: [global.embed.error('Kein Setup', 'VoiceMaster ist nicht eingerichtet!')] });
                
                if (!channel.name.includes('🎤')) {
                    return message.reply({ embeds: [global.embed.error('Kein VM Channel', 'Das ist kein VoiceMaster Channel!')] });
                }
                
                config.voiceChannels.set(channel.id, message.author.id);
                vmCache.set(message.guild.id, config);
                
                await channel.setName(`🎤 ${message.author.username}'s Channel`);
                
                return message.reply({ embeds: [global.embed.success('Channel übernommen', `Du bist jetzt Owner von ${channel}!`)] });
            }
        },
        
        // ========== VOICE-TRANSFER ==========
        'voice-transfer': {
            aliases: ['vtransfer', 'transfer-new'],
            description: 'Überträgt Channel-Ownership',
            category: 'Voicemaster',
            async execute(message, args) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!voice-transfer @User')] });
                if (!target.voice.channel || target.voice.channel.id !== channel.id) {
                    return message.reply({ embeds: [global.embed.error('Nicht im Channel', `${target} ist nicht in deinem Channel!`)] });
                }
                
                const config = vmCache.get(message.guild.id);
                if (config) {
                    config.voiceChannels.set(channel.id, target.id);
                    vmCache.set(message.guild.id, config);
                }
                
                await channel.setName(`🎤 ${target.user.username}'s Channel`);
                
                return message.reply({ embeds: [global.embed.success('Transfer', `Channel-Ownership wurde an ${target} übertragen!`)] });
            }
        },
        
        // ========== VOICE-LIMIT ==========
        'voice-limit': {
            aliases: ['vlimit'],
            description: 'Setzt User-Limit',
            category: 'Voicemaster',
            async execute(message, args) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                const limit = parseInt(args[0]);
                if (isNaN(limit) || limit < 0 || limit > 99) {
                    return message.reply({ embeds: [global.embed.error('Ungültig', 'Limit muss zwischen 0 und 99 sein!')] });
                }
                
                await channel.setUserLimit(limit);
                return message.reply({ embeds: [global.embed.success('Limit gesetzt', `User-Limit: ${limit === 0 ? 'Unbegrenzt' : limit}`)] });
            }
        },
        
        // ========== VOICE-RENAME ==========
        'voice-rename': {
            aliases: ['vrename'],
            description: 'Benennt Channel um',
            category: 'Voicemaster',
            async execute(message, args) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                const name = args.join(' ');
                if (!name) return message.reply({ embeds: [global.embed.error('Kein Name', '!voice-rename <Name>')] });
                if (name.length > 100) return message.reply({ embeds: [global.embed.error('Zu lang', 'Name darf maximal 100 Zeichen haben!')] });
                
                await channel.setName(`🎤 ${name}`);
                return message.reply({ embeds: [global.embed.success('Umbenannt', `Channel heißt jetzt **${name}**`)] });
            }
        },
        
        // ========== VOICE-BAN ==========
        'voice-ban': {
            aliases: ['vban'],
            description: 'Bannt User vom Channel',
            category: 'Voicemaster',
            async execute(message, args) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                const target = message.mentions.members.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!voice-ban @User')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst dich nicht selbst bannen!')] });
                
                await channel.permissionOverwrites.create(target.id, { Connect: false });
                
                if (target.voice.channel?.id === channel.id) {
                    await target.voice.disconnect();
                }
                
                return message.reply({ embeds: [global.embed.success('User gebannt', `${target} wurde vom Channel gebannt.`)] });
            }
        },
        
        // ========== VOICE-UNBAN ==========
        'voice-unban': {
            aliases: ['vunban', 'voice-unban-new'],
            description: 'Entbannt User vom Channel',
            category: 'Voicemaster',
            async execute(message, args) {
                const channel = message.member.voice.channel;
                if (!channel) return message.reply({ embeds: [global.embed.error('Kein VC', 'Du bist in keinem Voice-Channel!')] });
                
                if (!isOwner(message.author.id, channel, message.guild.id)) {
                    return message.reply({ embeds: [global.embed.error('Kein Owner', 'Du bist nicht der Owner dieses Channels!')] });
                }
                
                const target = message.mentions.users.first() || await message.client.users.fetch(args[0]).catch(() => null);
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!voice-unban @User / ID')] });
                
                await channel.permissionOverwrites.delete(target.id).catch(() => {});
                
                return message.reply({ embeds: [global.embed.success('User entbannt', `${target} wurde entbannt.`)] });
            }
        }
    }
};

module.exports.handleVoiceMasterButton = handleVoiceMasterButton;
module.exports.vmCache = vmCache;
