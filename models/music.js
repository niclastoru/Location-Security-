const { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');

// Initialize play-dl
(async () => {
    await play.setToken({
        youtube: {
            cookie: process.env.YOUTUBE_COOKIE || '',
        }
    });
})().catch(console.error);

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

// ⭐ HELPER: Build nice embeds with language support
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client?.languages?.get(guildId) || 'en';
    
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
            play_error: 'Could not play song! Make sure the video is available.',
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
        .setAuthor({ name: client?.user?.username || 'Bot', iconURL: client?.user?.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'spotify' ? '🟢' : type === 'youtube' ? '▶️' : type === 'soundcloud' ? '🟠' : '🎵';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = await client?.users?.fetch(userId).catch(() => null);
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

// ⭐ Search song on YouTube
async function searchSong(query) {
    try {
        // Try YouTube first
        let results = await play.search(query, { limit: 1, source: { youtube: 'video' } });
        
        if (results.length > 0) {
            return {
                title: results[0].title,
                url: results[0].url,
                duration: results[0].durationRaw || 'Unknown',
                thumbnail: results[0].thumbnails?.[0]?.url || null,
                platform: 'youtube'
            };
        }
        
        // Try SoundCloud if YouTube fails
        results = await play.search(query, { limit: 1, source: { soundcloud: 'tracks' } });
        
        if (results.length > 0) {
            return {
                title: results[0].title,
                url: results[0].url,
                duration: results[0].durationRaw || 'Unknown',
                thumbnail: results[0].thumbnails?.[0]?.url || null,
                platform: 'soundcloud'
            };
        }
        
        return null;
    } catch (error) {
        console.error('Search error:', error);
        return null;
    }
}

// ⭐ Play song
async function playSong(guild, channel, song, client) {
    const queue = getQueue(guild.id);
    const lang = client?.languages?.get(guild.id) || 'en';
    
    try {
        console.log(`🎵 Attempting to play: ${song.title} (${song.platform})`);
        
        // Validate URL
        if (!song.url) {
            throw new Error('No URL provided');
        }
        
        // Get stream
        let stream;
        try {
            stream = await play.stream(song.url);
        } catch (streamError) {
            console.error('Stream error:', streamError);
            // Try alternative method for YouTube
            if (song.platform === 'youtube') {
                const videoInfo = await play.video_basic_info(song.url);
                stream = await play.stream_from_info(videoInfo);
            } else {
                throw streamError;
            }
        }
        
        if (!stream || !stream.stream) {
            throw new Error('No stream available');
        }
        
        const resource = createAudioResource(stream.stream, { 
            inputType: stream.type,
            inlineVolume: true 
        });
        resource.volume.setVolume(queue.volume);
        
        queue.player.play(resource);
        queue.nowPlaying = song;
        queue.channel = channel;
        
        // Send now playing embed
        const embed = new EmbedBuilder()
            .setColor(song.platform === 'youtube' ? 0xFF0000 : song.platform === 'soundcloud' ? 0xFF5500 : 0x1DB954)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle(lang === 'en' ? '🎵 Now Playing' : '🎵 Now Playing')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields([
                { name: lang === 'en' ? '👤 Requested by' : '👤 Requested by', value: song.requestedBy, inline: true },
                { name: lang === 'en' ? '⏱️ Duration' : '⏱️ Duration', value: song.duration || 'Unknown', inline: true }
            ])
            .setFooter({ text: song.requestedBy })
            .setTimestamp();
        
        if (song.thumbnail) {
            embed.setThumbnail(song.thumbnail);
        }
        
        channel.send({ embeds: [embed] });
        
        // Handle next song
        queue.player.once(AudioPlayerStatus.Idle, () => {
            if (queue.loop && queue.nowPlaying) {
                queue.songs.push({ ...queue.nowPlaying });
            }
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(guild, channel, queue.songs[0], client);
            } else {
                queue.nowPlaying = null;
            }
        });
        
        queue.player.on('error', (error) => {
            console.error('Player error:', error);
            channel.send({ 
                embeds: [buildEmbed(client, guild.id, song.requestedById, 'error', 'error', 'play_error')] 
            });
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(guild, channel, queue.songs[0], client);
            }
        });
        
    } catch (error) {
        console.error('Play error:', error);
        channel.send({ 
            embeds: [await buildEmbed(client, guild.id, song.requestedById, 'error', 'error', 'play_error')] 
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
            description: 'Plays music (YouTube/SoundCloud)',
            category: 'Music',
            async execute(message, args, { client }) {
                const voiceChannel = message.member.voice.channel;
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
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
                    // Check if it's a direct YouTube/SoundCloud URL
                    let songInfo = null;
                    let isUrl = false;
                    
                    // Check for YouTube URL
                    if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
                        isUrl = true;
                        try {
                            const videoInfo = await play.video_basic_info(query);
                            songInfo = {
                                title: videoInfo.video_details.title,
                                url: videoInfo.video_details.url,
                                duration: videoInfo.video_details.durationRaw || 'Unknown',
                                thumbnail: videoInfo.video_details.thumbnails?.[0]?.url || null,
                                platform: 'youtube'
                            };
                        } catch (error) {
                            console.error('YouTube URL error:', error);
                        }
                    }
                    
                    // Check for SoundCloud URL
                    if (!songInfo && (query.includes('soundcloud.com') || query.includes('on.soundcloud.com'))) {
                        isUrl = true;
                        try {
                            const trackInfo = await play.soundcloud(query);
                            songInfo = {
                                title: trackInfo.name,
                                url: trackInfo.permalink_url,
                                duration: trackInfo.durationRaw || 'Unknown',
                                thumbnail: trackInfo.thumbnail || null,
                                platform: 'soundcloud'
                            };
                        } catch (error) {
                            console.error('SoundCloud URL error:', error);
                        }
                    }
                    
                    // If not a URL, search for the song
                    if (!songInfo && !isUrl) {
                        songInfo = await searchSong(query);
                    }
                    
                    if (!songInfo) {
                        return loadingMsg.edit({ 
                            embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'error', 'song_not_found')] 
                        });
                    }
                    
                    const song = {
                        ...songInfo,
                        requestedBy: message.author.username,
                        requestedById: message.author.id
                    };
                    
                    queue.songs.push(song);
                    
                    const platformEmoji = song.platform === 'youtube' ? '▶️' : '🟠';
                    const platformColor = song.platform === 'youtube' ? 0xFF0000 : 0xFF5500;
                    
                    const embed = new EmbedBuilder()
                        .setColor(platformColor)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(queue.songs.length === 1 ? `${platformEmoji} Now Playing` : `${platformEmoji} Added to Queue`)
                        .setDescription(`[${song.title}](${song.url})`)
                        .addFields([
                            { name: '👤 Requested by', value: message.author.username, inline: true },
                            { name: '⏱️ Duration', value: song.duration || 'Unknown', inline: true },
                            { name: '📊 Position', value: `#${queue.songs.length}`, inline: true }
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
            description: 'Skips the current song',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
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
            description: 'Stops music and leaves VC',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
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
            description: 'Pauses the music',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
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
            description: 'Resumes the music',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
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
            description: 'Changes the volume',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const volume = parseInt(args[0]);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
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
            description: 'Shows the current queue',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
                if (queue.songs.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'queue', 'queue_empty')] 
                    });
                }
                
                const nowPlaying = queue.nowPlaying;
                const upcoming = queue.songs.slice(0, 10);
                
                let description = '';
                if (nowPlaying) {
                    description += `**Now playing:**\n[${nowPlaying.title}](${nowPlaying.url})\n\n`;
                }
                
                if (upcoming.length > 0) {
                    description += `**Up next:**\n`;
                    upcoming.forEach((song, i) => {
                        description += `\`${i+1}.\` [${song.title}](${song.url}) | ${song.requestedBy}\n`;
                    });
                }
                
                if (queue.songs.length > 10) {
                    description += `\n... and ${queue.songs.length - 10} more songs`;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x1DB954)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('📋 Music Queue')
                    .setDescription(description)
                    .addFields([
                        { name: '🔁 Loop', value: queue.loop ? '✅ On' : '❌ Off', inline: true },
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
            description: 'Shows the current song',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
                if (!queue.nowPlaying) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_song', 'no_song_playing')] 
                    });
                }
                
                const song = queue.nowPlaying;
                
                const embed = new EmbedBuilder()
                    .setColor(song.platform === 'youtube' ? 0xFF0000 : song.platform === 'soundcloud' ? 0xFF5500 : 0x1DB954)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🎵 Now Playing')
                    .setDescription(`[${song.title}](${song.url})`)
                    .addFields([
                        { name: '👤 Requested by', value: song.requestedBy, inline: true },
                        { name: '⏱️ Duration', value: song.duration || 'Unknown', inline: true }
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
            description: 'Toggles loop',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
                queue.loop = !queue.loop;
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'loop', queue.loop ? 'loop_on' : 'loop_off')] 
                });
            }
        },
        
        // ========== SHUFFLE ==========
        shuffle: {
            aliases: ['mix'],
            description: 'Shuffles the queue',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
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
            description: 'Removes a song from queue',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const index = parseInt(args[0]) - 1;
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
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
            description: 'Clears the queue',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                const lang = client?.languages?.get(message.guild.id) || 'en';
                const current = queue.songs[0];
                queue.songs = current ? [current] : [];
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'cleared', 'cleared')] 
                });
            }
        },
        
        // ========== MUSICHELP ==========
        musichelp: {
            aliases: ['music', 'mhelp'],
            description: 'Shows all music commands',
            category: 'Music',
            async execute(message, args, { client }) {
                const lang = client?.languages?.get(message.guild.id) || 'en';
                
                const embed = new EmbedBuilder()
                    .setColor(0x1DB954)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🎵 Music Commands')
                    .addFields([
                        { name: '▶️ YouTube / 🟠 SoundCloud', value: '`!play <Link/Search>`', inline: false },
                        { name: '🎮 Playback', value: '`!pause` `!resume` `!stop` `!skip` `!volume`', inline: true },
                        { name: '📋 Queue', value: '`!queue` `!nowplaying` `!shuffle` `!remove` `!clear` `!loop`', inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

module.exports.musicQueues = musicQueues;
