const { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');

// ⭐ SoundCloud Authorization (UMGEHT BLOCKS)
play.setToken({
    soundcloud: {
        client_id: 'iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX'
    }
});

// Music Queue System
const musicQueues = new Map();

function getQueue(guildId) {
    if (!musicQueues.has(guildId)) {
        musicQueues.set(guildId, {
            songs: [],
            player: createAudioPlayer(),
            connection: null,
            channel: null,
            loop: false,
            volume: 0.5,
            nowPlaying: null
        });
    }
    return musicQueues.get(guildId);
}

// ⭐ SoundCloud Suche (KORRIGIERT)
async function searchSoundCloud(query) {
    try {
        // Direkte SoundCloud Suche
        const results = await play.search(query, {
            limit: 1,
            source: { soundcloud: 'tracks' }
        });
        
        if (results && results.length > 0) {
            return {
                title: results[0].title,
                url: results[0].url,
                duration: results[0].durationRaw,
                thumbnail: results[0].thumbnails[0]?.url || null,
                platform: 'soundcloud'
            };
        }
        return null;
    } catch (error) {
        console.error('SoundCloud search error:', error);
        return null;
    }
}

// ⭐ Spotify zu SoundCloud
async function spotifyToSoundCloud(query) {
    try {
        const spotify = require('spotify-url-info')();
        const track = await spotify.getPreview(query);
        const searchQuery = `${track.artist} ${track.title}`;
        return await searchSoundCloud(searchQuery);
    } catch (error) {
        console.error('Spotify conversion error:', error);
        return null;
    }
}

// ⭐ Song Info
async function getSongInfo(query) {
    // Spotify Link?
    if (query.includes('spotify.com') || query.includes('spotify.link')) {
        return await spotifyToSoundCloud(query);
    }
    
    // SoundCloud Link?
    if (query.includes('soundcloud.com')) {
        try {
            const info = await play.video_info(query);
            return {
                title: info.video_details.title,
                url: info.video_details.url,
                duration: info.video_details.durationRaw,
                thumbnail: info.video_details.thumbnails[0]?.url || null,
                platform: 'soundcloud'
            };
        } catch (error) {
            console.error('SoundCloud info error:', error);
            return null;
        }
    }
    
    // Normale Suche
    return await searchSoundCloud(query);
}

// ⭐ Play Song
async function playSong(guild, channel, song, client) {
    const queue = getQueue(guild.id);
    
    try {
        console.log(`🎵 Versuche abzuspielen: ${song.title}`);
        
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { 
            inputType: stream.type,
            inlineVolume: true 
        });
        resource.volume.setVolume(queue.volume);
        
        queue.player.play(resource);
        queue.nowPlaying = song;
        queue.channel = channel;
        
        const embed = new EmbedBuilder()
            .setColor(0xFF5500)
            .setTitle('🟠 Jetzt spielt (SoundCloud)')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields(
                { name: '👤 Angefordert von', value: song.requestedBy, inline: true },
                { name: '⏱️ Dauer', value: song.duration || 'Unbekannt', inline: true }
            )
            .setTimestamp();
        
        if (song.thumbnail) {
            embed.setThumbnail(song.thumbnail);
        }
        
        channel.send({ embeds: [embed] });
        
        queue.player.once(AudioPlayerStatus.Idle, () => {
            if (queue.loop && queue.nowPlaying) {
                queue.songs.push(queue.nowPlaying);
            }
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(guild, channel, queue.songs[0], client);
            } else {
                queue.nowPlaying = null;
            }
        });
        
    } catch (error) {
        console.error('Play error:', error);
        
        // ⭐ Fallback: Anderen Song versuchen
        if (queue.songs.length > 0) {
            channel.send({ embeds: [global.embed.error('Fehler', 'Song nicht verfügbar, versuche nächsten...')] });
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(guild, channel, queue.songs[0], client);
            }
        } else {
            channel.send({ embeds: [global.embed.error('Fehler', 'Konnte keinen Song abspielen!')] });
        }
    }
}

module.exports = {
    category: 'Music',
    subCommands: {
        
        play: {
            aliases: ['p', 'add', 'sc'],
            description: 'Spielt Musik von SoundCloud',
            category: 'Music',
            async execute(message, args, { client }) {
                const voiceChannel = message.member.voice.channel;
                if (!voiceChannel) {
                    return message.reply({ embeds: [global.embed.error('Kein VC', 'Du musst in einem Voice-Channel sein!')] });
                }
                
                const query = args.join(' ');
                if (!query) return message.reply({ embeds: [global.embed.error('Kein Song', '!play <SoundCloud/Spotify/Suche>')] });
                
                const queue = getQueue(message.guild.id);
                
                // Loading Nachricht
                const loadingMsg = await message.reply({ embeds: [global.embed.info('Suche', '🔍 Suche auf SoundCloud...')] });
                
                try {
                    const songInfo = await getSongInfo(query);
                    
                    if (!songInfo) {
                        return loadingMsg.edit({ embeds: [global.embed.error('Nicht gefunden', 'Kein Song auf SoundCloud gefunden!')] });
                    }
                    
                    const song = { ...songInfo, requestedBy: message.author.username };
                    queue.songs.push(song);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0xFF5500)
                        .setTitle(queue.songs.length === 1 ? '🎵 Spielt jetzt' : '📋 Zur Queue hinzugefügt')
                        .setDescription(`[${song.title}](${song.url})`)
                        .addFields(
                            { name: '👤 Angefordert von', value: message.author.username, inline: true },
                            { name: '⏱️ Dauer', value: song.duration || 'Unbekannt', inline: true },
                            { name: '📊 Position', value: `#${queue.songs.length}`, inline: true }
                        )
                        .setTimestamp();
                    
                    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
                    
                    await loadingMsg.edit({ embeds: [embed] });
                    
                    if (queue.songs.length === 1) {
                        if (!queue.connection) {
                            queue.connection = joinVoiceChannel({
                                channelId: voiceChannel.id,
                                guildId: message.guild.id,
                                adapterCreator: message.guild.voiceAdapterCreator
                            });
                            queue.connection.subscribe(queue.player);
                        }
                        playSong(message.guild, message.channel, song, client);
                    }
                    
                } catch (error) {
                    console.error('Play error:', error);
                    loadingMsg.edit({ embeds: [global.embed.error('Fehler', 'Song konnte nicht abgespielt werden!')] });
                }
            }
        },
        
        skip: {
            aliases: ['s', 'next'],
            description: 'Überspringt den aktuellen Song',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                if (!queue.nowPlaying) {
                    return message.reply({ embeds: [global.embed.error('Kein Song', 'Es wird kein Song abgespielt!')] });
                }
                queue.player.stop();
                return message.reply({ embeds: [global.embed.success('Übersprungen', 'Song wurde übersprungen! ⏭️')] });
            }
        },
        
        stop: {
            aliases: ['leave', 'dc'],
            description: 'Stoppt die Musik',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                queue.songs = [];
                queue.loop = false;
                queue.player.stop();
                if (queue.connection) {
                    queue.connection.destroy();
                    queue.connection = null;
                }
                queue.nowPlaying = null;
                return message.reply({ embeds: [global.embed.success('Gestoppt', 'Musik wurde gestoppt! 👋')] });
            }
        },
        
        pause: {
            aliases: ['hold'],
            description: 'Pausiert die Musik',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                if (!queue.nowPlaying) return message.reply({ embeds: [global.embed.error('Kein Song', 'Es wird kein Song abgespielt!')] });
                queue.player.pause();
                return message.reply({ embeds: [global.embed.success('Pausiert', 'Musik wurde pausiert! ⏸️')] });
            }
        },
        
        resume: {
            aliases: ['unpause'],
            description: 'Setzt die Musik fort',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                if (!queue.nowPlaying) return message.reply({ embeds: [global.embed.error('Kein Song', 'Es wird kein Song abgespielt!')] });
                queue.player.unpause();
                return message.reply({ embeds: [global.embed.success('Fortgesetzt', 'Musik wird fortgesetzt! ▶️')] });
            }
        },
        
        volume: {
            aliases: ['vol', 'v'],
            description: 'Ändert die Lautstärke',
            category: 'Music',
            async execute(message, args) {
                const queue = getQueue(message.guild.id);
                const volume = parseInt(args[0]);
                if (isNaN(volume) || volume < 0 || volume > 200) {
                    return message.reply({ embeds: [global.embed.error('Ungültig', 'Volume muss zwischen 0 und 200 sein!')] });
                }
                queue.volume = volume / 100;
                if (queue.player.state.resource) {
                    queue.player.state.resource.volume.setVolume(queue.volume);
                }
                return message.reply({ embeds: [global.embed.success('Lautstärke', `Lautstärke auf **${volume}%** gesetzt! 🔊`)] });
            }
        },
        
        queue: {
            aliases: ['q', 'list'],
            description: 'Zeigt die aktuelle Queue',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                if (queue.songs.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Queue leer', 'Keine Songs in der Queue!')] });
                }
                
                const nowPlaying = queue.nowPlaying;
                const upcoming = queue.songs.slice(0, 10);
                
                let description = '';
                if (nowPlaying) {
                    description += `**🎵 Jetzt spielt:**\n[${nowPlaying.title}](${nowPlaying.url})\n\n`;
                }
                
                if (upcoming.length > 0) {
                    description += '**📋 Als nächstes:**\n';
                    upcoming.forEach((song, i) => {
                        description += `\`${i+1}.\` [${song.title}](${song.url})\n`;
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF5500)
                    .setTitle('📋 Musik Queue')
                    .setDescription(description)
                    .addFields(
                        { name: '🔁 Loop', value: queue.loop ? '✅ An' : '❌ Aus', inline: true },
                        { name: '🔊 Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true }
                    )
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
            }
        },
        
        nowplaying: {
            aliases: ['np', 'current'],
            description: 'Zeigt den aktuellen Song',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                if (!queue.nowPlaying) {
                    return message.reply({ embeds: [global.embed.error('Kein Song', 'Es wird kein Song abgespielt!')] });
                }
                
                const song = queue.nowPlaying;
                const embed = new EmbedBuilder()
                    .setColor(0xFF5500)
                    .setTitle('🟠 Jetzt spielt (SoundCloud)')
                    .setDescription(`[${song.title}](${song.url})`)
                    .addFields(
                        { name: '👤 Angefordert von', value: song.requestedBy, inline: true },
                        { name: '⏱️ Dauer', value: song.duration || 'Unbekannt', inline: true }
                    )
                    .setTimestamp();
                
                if (song.thumbnail) embed.setThumbnail(song.thumbnail);
                
                message.reply({ embeds: [embed] });
            }
        },
        
        loop: {
            aliases: ['repeat', 'l'],
            description: 'Schaltet Loop ein/aus',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                queue.loop = !queue.loop;
                return message.reply({ embeds: [global.embed.success('Loop', `Loop ist jetzt **${queue.loop ? 'AN' : 'AUS'}**! 🔁`)] });
            }
        },
        
        shuffle: {
            aliases: ['mix'],
            description: 'Mischt die Queue',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                if (queue.songs.length < 2) {
                    return message.reply({ embeds: [global.embed.error('Zu wenige Songs', 'Nicht genug Songs zum Mischen!')] });
                }
                
                const current = queue.songs.shift();
                for (let i = queue.songs.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
                }
                queue.songs.unshift(current);
                
                return message.reply({ embeds: [global.embed.success('Gemischt', 'Queue wurde gemischt! 🔀')] });
            }
        },
        
        musichelp: {
            aliases: ['music', 'mhelp'],
            description: 'Zeigt alle Music-Befehle',
            category: 'Music',
            async execute(message) {
                return message.reply({ embeds: [{
                    color: 0xFF5500,
                    title: '🎵 Music Befehle (SoundCloud)',
                    description: '**Funktioniert:**\n✅ SoundCloud Links\n✅ SoundCloud Suche\n✅ Spotify → SoundCloud\n\n**Befehle:**\n`!play` `!pause` `!resume` `!stop` `!skip` `!volume` `!queue` `!nowplaying` `!loop` `!shuffle`'
                }] });
            }
        }
    }
};

module.exports.musicQueues = musicQueues;
