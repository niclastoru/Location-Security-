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

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        spotify: 0x1DB954,
        youtube: 0xFF0000,
        soundcloud: 0xFF5500
    };
    
    const titles = {
        de: {
            no_vc: 'Kein VC',
            no_song: 'Kein Song',
            search: 'Suche',
            spotify_playlist: 'Spotify Playlist',
            spotify_track: 'Spotify',
            now_playing: 'Spielt jetzt',
            added_to_queue: 'Zur Queue hinzugefügt',
            skipped: 'Übersprungen',
            stopped: 'Gestoppt',
            paused: 'Pausiert',
            resumed: 'Fortgesetzt',
            volume: 'Lautstärke',
            queue: 'Musik Queue',
            loop: 'Loop',
            shuffled: 'Gemischt',
            removed: 'Entfernt',
            cleared: 'Geleert',
            music_help: 'Music Befehle',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info'
        },
        en: {
            no_vc: 'No VC',
            no_song: 'No Song',
            search: 'Search',
            spotify_playlist: 'Spotify Playlist',
            spotify_track: 'Spotify',
            now_playing: 'Now Playing',
            added_to_queue: 'Added to Queue',
            skipped: 'Skipped',
            stopped: 'Stopped',
            paused: 'Paused',
            resumed: 'Resumed',
            volume: 'Volume',
            queue: 'Music Queue',
            loop: 'Loop',
            shuffled: 'Shuffled',
            removed: 'Removed',
            cleared: 'Cleared',
            music_help: 'Music Commands',
            error: 'Error',
            success: 'Success',
            info: 'Info'
        }
    };
    
    const descriptions = {
        de: {
            no_vc: 'Du musst in einem Voice-Channel sein!',
            no_song_query: '!play <Spotify/YouTube/SoundCloud/Suche>',
            searching: '🔍 Suche Song...',
            loading_spotify: '🎵 Lade Spotify Playlist...',
            playlist_error: 'Playlist konnte nicht geladen werden!',
            playlist_added: (added, total) => `**${added}** von **${total}** Songs zur Queue hinzugefügt!`,
            requested_by: (user) => `Angefordert von ${user}`,
            spotify_track_not_found: 'Spotify Track nicht gefunden!',
            no_match_found: 'Kein passender Song auf YouTube/SoundCloud!',
            song_not_found: 'Kein Song gefunden! Versuche einen anderen Titel.',
            play_error: 'Song konnte nicht abgespielt werden!',
            no_song_playing: 'Es wird kein Song abgespielt!',
            skipped: 'Song wurde übersprungen! ⏭️',
            stopped: 'Musik wurde gestoppt! 👋',
            paused: 'Musik wurde pausiert! ⏸️',
            resumed: 'Musik wird fortgesetzt! ▶️',
            volume_invalid: 'Volume muss zwischen 0 und 200 sein!',
            volume_set: (vol) => `Lautstärke auf **${vol}%** gesetzt! 🔊`,
            queue_empty: 'Keine Songs in der Queue!',
            now_playing_label: '🎵 Jetzt spielt:',
            up_next: '📋 Als nächstes:',
            more_songs: (count) => `\n... und ${count} weitere Songs`,
            loop_on: 'Loop ist jetzt **AN**! 🔁',
            loop_off: 'Loop ist jetzt **AUS**! 🔁',
            not_enough_songs: 'Nicht genug Songs zum Mischen!',
            shuffled: 'Queue wurde gemischt! 🔀',
            remove_invalid: (max) => `Gib eine Nummer zwischen 1 und ${max} an!`,
            removed: (title) => `**${title}** wurde aus der Queue entfernt!`,
            cleared: 'Queue wurde geleert! 🗑️',
            spotify_footer: 'Spotify → YouTube/SoundCloud',
            duration: '⏱️ Dauer',
            position: '📊 Position',
            unknown: 'Unbekannt',
            try_another: 'Versuche einen anderen.'
        },
        en: {
            no_vc: 'You must be in a voice channel!',
            no_song_query: '!play <Spotify/YouTube/SoundCloud/Search>',
            searching: '🔍 Searching for song...',
            loading_spotify: '🎵 Loading Spotify Playlist...',
            playlist_error: 'Could not load playlist!',
            playlist_added: (added, total) => `**${added}** of **${total}** songs added to queue!`,
            requested_by: (user) => `Requested by ${user}`,
            spotify_track_not_found: 'Spotify track not found!',
            no_match_found: 'No matching song found on YouTube/SoundCloud!',
            song_not_found: 'No song found! Try a different title.',
            play_error: 'Could not play song!',
            no_song_playing: 'No song is currently playing!',
            skipped: 'Song skipped! ⏭️',
            stopped: 'Music stopped! 👋',
            paused: 'Music paused! ⏸️',
            resumed: 'Music resumed! ▶️',
            volume_invalid: 'Volume must be between 0 and 200!',
            volume_set: (vol) => `Volume set to **${vol}%**! 🔊`,
            queue_empty: 'No songs in the queue!',
            now_playing_label: '🎵 Now playing:',
            up_next: '📋 Up next:',
            more_songs: (count) => `\n... and ${count} more songs`,
            loop_on: 'Loop is now **ON**! 🔁',
            loop_off: 'Loop is now **OFF**! 🔁',
            not_enough_songs: 'Not enough songs to shuffle!',
            shuffled: 'Queue shuffled! 🔀',
            remove_invalid: (max) => `Enter a number between 1 and ${max}!`,
            removed: (title) => `**${title}** removed from queue!`,
            cleared: 'Queue cleared! 🗑️',
            spotify_footer: 'Spotify → YouTube/SoundCloud',
            duration: '⏱️ Duration',
            position: '📊 Position',
            unknown: 'Unknown',
            try_another: 'Try another one.'
        }
    };
    
    const title = titles[lang]?.[titleKey] || titleKey;
    let description = descriptions[lang]?.[descKey] || descKey;
    
    if (typeof description === 'function') {
        if (Array.isArray(fields)) {
            description = description(...fields);
        } else {
            description = description(fields);
        }
    } else {
        for (const [key, value] of Object.entries(replacements)) {
            description = description.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor(type === 'spotify' ? 0x1DB954 : type === 'youtube' ? 0xFF0000 : type === 'soundcloud' ? 0xFF5500 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'spotify' ? '🟢' : type === 'youtube' ? '▶️' : type === 'soundcloud' ? '🟠' : '🎵';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = await client.users.fetch(userId).catch(() => null);
        if (user) {
            embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) });
        }
    }
    embed.setTimestamp();
    
    if (Array.isArray(fields) && fields.length > 0 && fields[0] && typeof fields[0] === 'object') {
        embed.addFields(fields);
    }
    
    return embed;
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
    const lang = client.languages?.get(guild.id) || 'de';
    
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
        
        const embed = new EmbedBuilder()
            .setColor(song.platform === 'youtube' ? 0xFF0000 : song.platform === 'soundcloud' ? 0xFF5500 : 0x1DB954)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(lang === 'de' ? '🎵 Jetzt spielt' : '🎵 Now Playing')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields([
                { name: lang === 'de' ? '👤 Angefordert von' : '👤 Requested by', value: song.requestedBy, inline: true },
                { name: lang === 'de' ? '⏱️ Dauer' : '⏱️ Duration', value: song.duration || (lang === 'de' ? 'Unbekannt' : 'Unknown'), inline: true }
            ])
            .setFooter({ text: song.requestedBy, iconURL: channel.guild.members.cache.get(song.requestedById)?.displayAvatarURL() || client.user.displayAvatarURL() })
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
        channel.send({ 
            embeds: [await buildEmbed(client, guild.id, song.requestedBy, 'error', 'error', 'play_error')] 
        });
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
            description: 'Spielt Musik (Spotify/YouTube/SoundCloud) / Plays music',
            category: 'Music',
            async execute(message, args, { client }) {
                const voiceChannel = message.member.voice.channel;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!voiceChannel) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_vc', 'no_vc')] 
                    });
                }
                
                const query = args.join(' ');
                if (!query) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_song', 'no_song_query')] 
                    });
                }
                
                const queue = getQueue(message.guild.id);
                
                const loadingMsg = await message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'search', 'searching')] 
                });
                
                try {
                    const isSpotify = query.includes('spotify.com') || query.includes('spotify.link');
                    const isPlaylist = query.includes('playlist') || query.includes('album');
                    
                    // ⭐ SPOTIFY PLAYLIST/ALBUM
                    if (isSpotify && isPlaylist) {
                        await loadingMsg.edit({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'spotify', 'spotify_playlist', 'loading_spotify')] 
                        });
                        
                        const tracks = await getSpotifyTracks(query);
                        
                        if (tracks.length === 0) {
                            return loadingMsg.edit({ 
                                embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'playlist_error')] 
                            });
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
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle(lang === 'de' ? '🟢 Spotify Playlist' : '🟢 Spotify Playlist')
                            .setDescription(lang === 'de' ? `**${added}** von **${tracks.length}** Songs zur Queue hinzugefügt!` : `**${added}** of **${tracks.length}** songs added to queue!`)
                            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
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
                        await loadingMsg.edit({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'spotify', 'spotify_track', 'searching')] 
                        });
                        
                        const spotifyTrack = await getSpotifyTrack(query);
                        
                        if (!spotifyTrack) {
                            return loadingMsg.edit({ 
                                embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'spotify_track_not_found')] 
                            });
                        }
                        
                        const searchQuery = `${spotifyTrack.artist} ${spotifyTrack.title}`;
                        const songInfo = await searchSong(searchQuery);
                        
                        if (!songInfo) {
                            return loadingMsg.edit({ 
                                embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'no_match_found')] 
                            });
                        }
                        
                        const song = {
                            ...songInfo,
                            requestedBy: message.author.username,
                            spotifyTrack: spotifyTrack
                        };
                        
                        queue.songs.push(song);
                        
                        const embed = new EmbedBuilder()
                            .setColor(0x1DB954)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle(queue.songs.length === 1 ? (lang === 'de' ? '🎵 Spielt jetzt' : '🎵 Now Playing') : (lang === 'de' ? '📋 Zur Queue hinzugefügt' : '📋 Added to Queue'))
                            .setDescription(`**${spotifyTrack.title}**\n*${spotifyTrack.artist}*`)
                            .addFields([
                                { name: lang === 'de' ? '👤 Angefordert von' : '👤 Requested by', value: message.author.username, inline: true },
                                { name: lang === 'de' ? '⏱️ Dauer' : '⏱️ Duration', value: spotifyTrack.duration || song.duration || (lang === 'de' ? 'Unbekannt' : 'Unknown'), inline: true },
                                { name: lang === 'de' ? '📊 Position' : '📊 Position', value: `#${queue.songs.length}`, inline: true }
                            ])
                            .setFooter({ text: lang === 'de' ? 'Spotify → YouTube/SoundCloud' : 'Spotify → YouTube/SoundCloud', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
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
                        return loadingMsg.edit({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'song_not_found')] 
                        });
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
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(queue.songs.length === 1 ? `${platformEmoji} ${lang === 'de' ? 'Spielt jetzt' : 'Now Playing'}` : `${platformEmoji} ${lang === 'de' ? 'Zur Queue hinzugefügt' : 'Added to Queue'}`)
                        .setDescription(`[${song.title}](${song.url})`)
                        .addFields([
                            { name: lang === 'de' ? '👤 Angefordert von' : '👤 Requested by', value: message.author.username, inline: true },
                            { name: lang === 'de' ? '⏱️ Dauer' : '⏱️ Duration', value: song.duration || (lang === 'de' ? 'Unbekannt' : 'Unknown'), inline: true },
                            { name: lang === 'de' ? '📊 Position' : '📊 Position', value: `#${queue.songs.length}`, inline: true }
                        ])
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
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
                    loadingMsg.edit({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'play_error')] 
                    });
                }
            }
        },
        
        // ========== SKIP ==========
        skip: {
            aliases: ['s', 'next'],
            description: 'Überspringt den aktuellen Song / Skips the current song',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!queue.nowPlaying) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_song', 'no_song_playing')] 
                    });
                }
                
                queue.player.stop();
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'skipped', 'skipped')] 
                });
            }
        },
        
        // ========== STOP ==========
        stop: {
            aliases: ['leave', 'dc'],
            description: 'Stoppt die Musik und verlässt den VC / Stops music and leaves VC',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                queue.songs = [];
                queue.loop = false;
                queue.player.stop();
                if (queue.connection) {
                    queue.connection.destroy();
                    queue.connection = null;
                }
                queue.nowPlaying = null;
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'stopped', 'stopped')] 
                });
            }
        },
        
        // ========== PAUSE ==========
        pause: {
            aliases: ['hold'],
            description: 'Pausiert die Musik / Pauses the music',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!queue.nowPlaying) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_song', 'no_song_playing')] 
                    });
                }
                
                queue.player.pause();
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'paused', 'paused')] 
                });
            }
        },
        
        // ========== RESUME ==========
        resume: {
            aliases: ['unpause'],
            description: 'Setzt die Musik fort / Resumes the music',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!queue.nowPlaying) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_song', 'no_song_playing')] 
                    });
                }
                
                queue.player.unpause();
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'resumed', 'resumed')] 
                });
            }
        },
        
        // ========== VOLUME ==========
        volume: {
            aliases: ['vol', 'v'],
            description: 'Ändert die Lautstärke / Changes the volume',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const volume = parseInt(args[0]);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (isNaN(volume) || volume < 0 || volume > 200) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'volume', 'volume_invalid')] 
                    });
                }
                
                queue.volume = volume / 100;
                if (queue.player.state.resource) {
                    queue.player.state.resource.volume.setVolume(queue.volume);
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'volume', 'volume_set', [volume])] 
                });
            }
        },
        
        // ========== QUEUE ==========
        queue: {
            aliases: ['q', 'list'],
            description: 'Zeigt die aktuelle Queue / Shows the current queue',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (queue.songs.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'queue', 'queue_empty')] 
                    });
                }
                
                const nowPlaying = queue.nowPlaying;
                const upcoming = queue.songs.slice(0, 10);
                
                let description = '';
                if (nowPlaying) {
                    description += `**${lang === 'de' ? '🎵 Jetzt spielt:' : '🎵 Now playing:'}**\n[${nowPlaying.title}](${nowPlaying.url})\n\n`;
                }
                
                if (upcoming.length > 0) {
                    description += `**${lang === 'de' ? '📋 Als nächstes:' : '📋 Up next:'}**\n`;
                    upcoming.forEach((song, i) => {
                        description += `\`${i+1}.\` [${song.title}](${song.url}) | ${song.requestedBy}\n`;
                    });
                }
                
                if (queue.songs.length > 10) {
                    description += lang === 'de' ? `\n... und ${queue.songs.length - 10} weitere Songs` : `\n... and ${queue.songs.length - 10} more songs`;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x1DB954)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '📋 Musik Queue' : '📋 Music Queue')
                    .setDescription(description)
                    .addFields([
                        { name: '🔁 Loop', value: queue.loop ? (lang === 'de' ? '✅ An' : '✅ On') : (lang === 'de' ? '❌ Aus' : '❌ Off'), inline: true },
                        { name: '🔊 Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                message.reply({ embeds: [embed] });
            }
        },
        
        // ========== NOWPLAYING ==========
        nowplaying: {
            aliases: ['np', 'current'],
            description: 'Zeigt den aktuellen Song / Shows the current song',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!queue.nowPlaying) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_song', 'no_song_playing')] 
                    });
                }
                
                const song = queue.nowPlaying;
                
                const embed = new EmbedBuilder()
                    .setColor(song.platform === 'youtube' ? 0xFF0000 : song.platform === 'soundcloud' ? 0xFF5500 : 0x1DB954)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🎵 Jetzt spielt' : '🎵 Now Playing')
                    .setDescription(`[${song.title}](${song.url})`)
                    .addFields([
                        { name: lang === 'de' ? '👤 Angefordert von' : '👤 Requested by', value: song.requestedBy, inline: true },
                        { name: lang === 'de' ? '⏱️ Dauer' : '⏱️ Duration', value: song.duration || (lang === 'de' ? 'Unbekannt' : 'Unknown'), inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                if (song.thumbnail) embed.setThumbnail(song.thumbnail);
                
                message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LOOP ==========
        loop: {
            aliases: ['repeat', 'l'],
            description: 'Schaltet Loop ein/aus / Toggles loop',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                queue.loop = !queue.loop;
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'loop', queue.loop ? 'loop_on' : 'loop_off')] 
                });
            }
        },
        
        // ========== SHUFFLE ==========
        shuffle: {
            aliases: ['mix'],
            description: 'Mischt die Queue / Shuffles the queue',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (queue.songs.length < 2) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'shuffled', 'not_enough_songs')] 
                    });
                }
                
                const current = queue.songs.shift();
                for (let i = queue.songs.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
                }
                queue.songs.unshift(current);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'shuffled', 'shuffled')] 
                });
            }
        },
        
        // ========== REMOVE ==========
        remove: {
            aliases: ['delete', 'rm'],
            description: 'Entfernt einen Song aus der Queue / Removes a song from queue',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const index = parseInt(args[0]) - 1;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (isNaN(index) || index < 0 || index >= queue.songs.length) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'removed', 'remove_invalid', [queue.songs.length])] 
                    });
                }
                
                const removed = queue.songs.splice(index, 1)[0];
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'removed', 'removed', [removed.title])] 
                });
            }
        },
        
        // ========== CLEAR ==========
        clear: {
            aliases: ['empty', 'cq'],
            description: 'Leert die Queue / Clears the queue',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client.languages?.get(message.guild.id) || 'de';
                const current = queue.songs[0];
                queue.songs = current ? [current] : [];
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'cleared', 'cleared')] 
                });
            }
        },
        
        // ========== SPOTIFY ==========
        spotify: {
            aliases: ['sp'],
            description: 'Spielt Spotify Songs/Playlists / Plays Spotify songs/playlists',
            category: 'Music',
            async execute(message, args, { client }) {
                return module.exports.subCommands.play.execute(message, args, { client });
            }
        },
        
        // ========== MUSICHELP ==========
        musichelp: {
            aliases: ['music', 'mhelp'],
            description: 'Zeigt alle Music-Befehle / Shows all music commands',
            category: 'Music',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const embed = new EmbedBuilder()
                    .setColor(0x1DB954)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '🎵 Music Befehle' : '🎵 Music Commands')
                    .addFields([
                        { name: '🟢 Spotify', value: lang === 'de' ? '`!play <Spotify Link>`\n`!play <Spotify Playlist>`\n`!spotify <Link>`' : '`!play <Spotify Link>`\n`!play <Spotify Playlist>`\n`!spotify <Link>`', inline: false },
                        { name: lang === 'de' ? '▶️ YouTube / 🟠 SoundCloud' : '▶️ YouTube / 🟠 SoundCloud', value: '`!play <Link/Suche>`', inline: false },
                        { name: lang === 'de' ? '🎮 Wiedergabe' : '🎮 Playback', value: '`!pause` `!resume` `!stop` `!skip` `!volume`', inline:30 },
                        { name: lang === 'de' ? '📋 Queue' : '📋 Queue', value: '`!queue` `!nowplaying` `!shuffle` `!remove` `!clear` `!loop`', inline:30 }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

module.exports.musicQueues = musicQueues;
