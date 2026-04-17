const { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const spotify = require('spotify-url-info')();

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

// ⭐ Spotify Track Info holen
async function getSpotifyTrack(url) {
    try {
        const track = await spotify.getPreview(url);
        return {
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            thumbnail: track.image,
            url: url
        };
    } catch (error) {
        console.error('Spotify Track error:', error);
        return null;
    }
}

// ⭐ Spotify Playlist/Album Tracks holen
async function getSpotifyTracks(url) {
    try {
        const tracks = await spotify.getTracks(url);
        return tracks.map(track => ({
            title: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            duration: track.duration_ms ? formatDuration(track.duration_ms) : 'Unbekannt',
            thumbnail: track.album?.images[0]?.url || null
        }));
    } catch (error) {
        console.error('Spotify Tracks error:', error);
        return [];
    }
}

// ⭐ Song auf YouTube/SoundCloud suchen
async function searchSong(query) {
    try {
        // Erst YouTube suchen
        const ytResults = await play.search(query, { limit: 1, source: { youtube: 'video' } });
        
        if (ytResults.length > 0) {
            return {
                title: ytResults[0].title,
                url: ytResults[0].url,
                duration: ytResults[0].durationRaw,
                thumbnail: ytResults[0].thumbnails[0]?.url,
                platform: 'youtube'
            };
        }
        
        // Fallback: SoundCloud
        const scResults = await play.search(query, { limit: 1, source: { soundcloud: 'tracks' } });
        
        if (scResults.length > 0) {
            return {
                title: scResults[0].title,
                url: scResults[0].url,
                duration: scResults[0].durationRaw,
                thumbnail: scResults[0].thumbnails[0]?.url,
                platform: 'soundcloud'
            };
        }
        
        return null;
    } catch (error) {
        console.error('Search error:', error);
        return null;
    }
}

// ⭐ Song abspielen
async function playSong(guild, channel, song, client) {
    const queue = getQueue(guild.id);
    
    try {
        console.log(`🎵 Versuche abzuspielen: ${song.title} (${song.platform})`);
        
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { 
            inputType: stream.type,
            inlineVolume: true 
        });
        resource.volume.setVolume(queue.volume);
        
        queue.player.play(resource);
        queue.nowPlaying = song;
        queue.channel = channel;
        
        const platformEmoji = song.platform === 'youtube' ? '▶️' : 
                              song.platform === 'soundcloud' ? '🟠' : '🟢';
        
        const embed = new EmbedBuilder()
            .setColor(song.platform === 'youtube' ? 0xFF0000 : 
                     song.platform === 'soundcloud' ? 0xFF5500 : 0x1DB954)
            .setTitle(`${platformEmoji} Jetzt spielt`)
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
        channel.send({ embeds: [global.embed.error('Fehler', 'Konnte Song nicht abspielen! Versuche einen anderen.')] });
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(guild, channel, queue.songs[0], client);
        }
    }
}

function formatDuration(ms) {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
    category: 'Music',
    subCommands: {
        
        // ========== PLAY ==========
        play: {
            aliases: ['p', 'add'],
            description: 'Spielt Musik (Spotify/YouTube/SoundCloud)',
            category: 'Music',
            async execute(message, args, { client }) {
                const voiceChannel = message.member.voice.channel;
                if (!voiceChannel) {
                    return message.reply({ embeds: [global.embed.error('Kein VC', 'Du musst in einem Voice-Channel sein!')] });
                }
                
                const query = args.join(' ');
                if (!query) return message.reply({ embeds: [global.embed.error('Kein Song', '!play <Spotify/YouTube/SoundCloud/Suche>')] });
                
                const queue = getQueue(message.guild.id);
                
                // Loading Nachricht
                const loadingMsg = await message.reply({ embeds: [global.embed.info('Suche', '🔍 Suche Song...')] });
                
                try {
                    const isSpotify = query.includes('spotify.com') || query.includes('spotify.link');
                    const isPlaylist = query.includes('playlist') || query.includes('album');
                    
                    // ⭐ SPOTIFY PLAYLIST/ALBUM
                    if (isSpotify && isPlaylist) {
                        await loadingMsg.edit({ embeds: [global.embed.info('Spotify', '🎵 Lade Spotify Playlist...')] });
                        
                        const tracks = await getSpotifyTracks(query);
                        
                        if (tracks.length === 0) {
                            return loadingMsg.edit({ embeds: [global.embed.error('Fehler', 'Playlist konnte nicht geladen werden!')] });
                        }
                        
                        let added = 0;
                        for (const track of tracks) {
                            const searchQuery = `${track.artist} ${track.title}`;
                            const songInfo = await searchSong(searchQuery);
                            
                            if (songInfo) {
                                songInfo.requestedBy = message.author.username;
                                songInfo.spotifyTrack = track;
                                queue.songs.push(songInfo);
                                added++;
                            }
                        }
                        
                        const embed = new EmbedBuilder()
                            .setColor(0x1DB954)
                            .setTitle('🟢 Spotify Playlist')
                            .setDescription(`**${added}** von **${tracks.length}** Songs zur Queue hinzugefügt!`)
                            .setFooter({ text: `Angefordert von ${message.author.username}` })
                            .setTimestamp();
                        
                        await loadingMsg.edit({ embeds: [embed] });
                        
                        if (queue.songs.length === added) {
                            if (!queue.connection) {
                                queue.connection = joinVoiceChannel({
                                    channelId: voiceChannel.id,
                                    guildId: message.guild.id,
                                    adapterCreator: message.guild.voiceAdapterCreator
                                });
                                queue.connection.subscribe(queue.player);
                            }
                            playSong(message.guild, message.channel, queue.songs[0], client);
                        }
                        return;
                    }
                    
                    // ⭐ SPOTIFY EINZELNER TRACK
                    if (isSpotify) {
                        await loadingMsg.edit({ embeds: [global.embed.info('Spotify', '🎵 Suche Spotify Track...')] });
                        
                        const spotifyTrack = await getSpotifyTrack(query);
                        
                        if (!spotifyTrack) {
                            return loadingMsg.edit({ embeds: [global.embed.error('Fehler', 'Spotify Track nicht gefunden!')] });
                        }
                        
                        const searchQuery = `${spotifyTrack.artist} ${spotifyTrack.title}`;
                        const songInfo = await searchSong(searchQuery);
                        
                        if (!songInfo) {
                            return loadingMsg.edit({ embeds: [global.embed.error('Nicht gefunden', 'Kein passender Song auf YouTube/SoundCloud!')] });
                        }
                        
                        const song = {
                            ...songInfo,
                            requestedBy: message.author.username,
                            spotifyTrack: spotifyTrack
                        };
                        
                        queue.songs.push(song);
                        
                        const embed = new EmbedBuilder()
                            .setColor(0x1DB954)
                            .setTitle(queue.songs.length === 1 ? '🎵 Spielt jetzt' : '📋 Zur Queue hinzugefügt')
                            .setDescription(`**${spotifyTrack.title}**\n*${spotifyTrack.artist}*`)
                            .addFields(
                                { name: '👤 Angefordert von', value: message.author.username, inline: true },
                                { name: '⏱️ Dauer', value: spotifyTrack.duration || song.duration || 'Unbekannt', inline: true },
                                { name: '📊 Position', value: `#${queue.songs.length}`, inline: true }
                            )
                            .setFooter({ text: 'Spotify → YouTube/SoundCloud' })
                            .setTimestamp();
                        
                        if (spotifyTrack.thumbnail) embed.setThumbnail(spotifyTrack.thumbnail);
                        
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
                        return;
                    }
                    
                    // ⭐ YOUTUBE/SOUNDCLOUD/SUCHE
                    const songInfo = await searchSong(query);
                    
                    if (!songInfo) {
                        return loadingMsg.edit({ embeds: [global.embed.error('Nicht gefunden', 'Kein Song gefunden! Versuche einen anderen Titel.')] });
                    }
                    
                    const song = {
                        ...songInfo,
                        requestedBy: message.author.username
                    };
                    
                    queue.songs.push(song);
                    
                    const platformEmoji = song.platform === 'youtube' ? '▶️' : '🟠';
                    const platformColor = song.platform === 'youtube' ? 0xFF0000 : 0xFF5500;
                    
                    const embed = new EmbedBuilder()
                        .setColor(platformColor)
                        .setTitle(queue.songs.length === 1 ? `${platformEmoji} Spielt jetzt` : `${platformEmoji} Zur Queue hinzugefügt`)
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
        
        // ========== SKIP ==========
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
        
        // ========== STOP ==========
        stop: {
            aliases: ['leave', 'dc'],
            description: 'Stoppt die Musik und verlässt den VC',
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
        
        // ========== PAUSE ==========
        pause: {
            aliases: ['hold'],
            description: 'Pausiert die Musik',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                if (!queue.nowPlaying) {
                    return message.reply({ embeds: [global.embed.error('Kein Song', 'Es wird kein Song abgespielt!')] });
                }
                queue.player.pause();
                return message.reply({ embeds: [global.embed.success('Pausiert', 'Musik wurde pausiert! ⏸️')] });
            }
        },
        
        // ========== RESUME ==========
        resume: {
            aliases: ['unpause'],
            description: 'Setzt die Musik fort',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                if (!queue.nowPlaying) {
                    return message.reply({ embeds: [global.embed.error('Kein Song', 'Es wird kein Song abgespielt!')] });
                }
                queue.player.unpause();
                return message.reply({ embeds: [global.embed.success('Fortgesetzt', 'Musik wird fortgesetzt! ▶️')] });
            }
        },
        
        // ========== VOLUME ==========
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
        
        // ========== QUEUE ==========
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
                        description += `\`${i+1}.\` [${song.title}](${song.url}) | ${song.requestedBy}\n`;
                    });
                }
                
                if (queue.songs.length > 10) {
                    description += `\n... und ${queue.songs.length - 10} weitere Songs`;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x1DB954)
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
        
        // ========== NOWPLAYING ==========
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
                const platformEmoji = song.platform === 'youtube' ? '▶️' : 
                                     song.platform === 'soundcloud' ? '🟠' : '🟢';
                
                const embed = new EmbedBuilder()
                    .setColor(song.platform === 'youtube' ? 0xFF0000 : 
                             song.platform === 'soundcloud' ? 0xFF5500 : 0x1DB954)
                    .setTitle(`${platformEmoji} Jetzt spielt`)
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
        
        // ========== LOOP ==========
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
        
        // ========== SHUFFLE ==========
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
        
        // ========== REMOVE ==========
        remove: {
            aliases: ['delete', 'rm'],
            description: 'Entfernt einen Song aus der Queue',
            category: 'Music',
            async execute(message, args) {
                const queue = getQueue(message.guild.id);
                const index = parseInt(args[0]) - 1;
                
                if (isNaN(index) || index < 0 || index >= queue.songs.length) {
                    return message.reply({ embeds: [global.embed.error('Ungültig', `Gib eine Nummer zwischen 1 und ${queue.songs.length} an!`)] });
                }
                
                const removed = queue.songs.splice(index, 1)[0];
                return message.reply({ embeds: [global.embed.success('Entfernt', `**${removed.title}** wurde aus der Queue entfernt!`)] });
            }
        },
        
        // ========== CLEAR ==========
        clear: {
            aliases: ['empty', 'cq'],
            description: 'Leert die Queue',
            category: 'Music',
            async execute(message) {
                const queue = getQueue(message.guild.id);
                const current = queue.songs[0];
                queue.songs = current ? [current] : [];
                return message.reply({ embeds: [global.embed.success('Geleert', 'Queue wurde geleert! 🗑️')] });
            }
        },
        
        // ========== SPOTIFY ==========
        spotify: {
            aliases: ['sp'],
            description: 'Spielt Spotify Songs/Playlists',
            category: 'Music',
            async execute(message, args, { client }) {
                return module.exports.subCommands.play.execute(message, args, { client });
            }
        },
        
        // ========== MUSICHELP ==========
        musichelp: {
            aliases: ['music', 'mhelp'],
            description: 'Zeigt alle Music-Befehle',
            category: 'Music',
            async execute(message) {
                return message.reply({ embeds: [{
                    color: 0x1DB954,
                    title: '🎵 Music Befehle',
                    fields: [
                        { name: '🟢 Spotify', value: '`!play <Spotify Link>`\n`!play <Spotify Playlist>`\n`!spotify <Link>`', inline: false },
                        { name: '▶️ YouTube / 🟠 SoundCloud', value: '`!play <Link/Suche>`', inline: false },
                        { name: '🎮 Wiedergabe', value: '`!pause` `!resume` `!stop` `!skip` `!volume`', inline: false },
                        { name: '📋 Queue', value: '`!queue` `!nowplaying` `!shuffle` `!remove` `!clear` `!loop`', inline: false }
                    ]
                }] });
            }
        }
    }
};

module.exports.musicQueues = musicQueues;
