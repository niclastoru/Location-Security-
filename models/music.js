const { 
    AudioPlayerStatus, 
    createAudioPlayer, 
    createAudioResource, 
    joinVoiceChannel, 
    StreamType, 
    NoSubscriberBehavior,
    setFFmpegPath // ⭐ Wichtig: Expliziter FFmpeg-Pfad
} = require('@discordjs/voice');
const play = require('play-dl');
const ytSearch = require('yt-search');
const { EmbedBuilder } = require('discord.js');
const ffmpegStatic = require('ffmpeg-static');

// ⭐ FFmpeg Pfad für Discord Voice setzen
setFFmpegPath(ffmpegStatic);
process.env.FFMPEG_PATH = ffmpegStatic;

console.log(`✅ FFmpeg path: ${ffmpegStatic}`);

// Music Queue System
const musicQueues = new Map();

function getQueue(guildId) {
    if (!musicQueues.has(guildId)) {
        musicQueues.set(guildId, {
            songs: [],
            player: null, // Wird bei jedem Play neu erstellt
            connection: null,
            channel: null,
            loop: false,
            volume: 0.5,
            nowPlaying: null
        });
    }
    return musicQueues.get(guildId);
}

// ⭐ HELPER: Build embed
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client?.languages?.get(guildId) || 'en';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        youtube: 0xFF0000
    };
    
    const titles = { en: {
        no_vc: 'No VC',
        no_song: 'No Song',
        search: 'Search',
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
    }};
    
    const descriptions = { en: {
        no_vc: 'You must be in a voice channel!',
        no_song_query: '!play <YouTube URL or Search>',
        searching: '🔍 Searching for song...',
        song_not_found: 'No song found! Try a different title.',
        play_error: 'Could not play song! Try a different video.',
        no_song_playing: 'No song is currently playing!',
        skipped: 'Song skipped! ⏭️',
        stopped: 'Music stopped! 👋',
        paused: 'Music paused! ⏸️',
        resumed: 'Music resumed! ▶️',
        volume_invalid: 'Volume must be between 0 and 200!',
        volume_set: (vol) => `Volume set to **${vol}%**! 🔊`,
        queue_empty: 'No songs in the queue!',
        loop_on: 'Loop is now **ON**! 🔁',
        loop_off: 'Loop is now **OFF**! 🔁',
        not_enough_songs: 'Not enough songs to shuffle!',
        shuffled: 'Queue shuffled! 🔀',
        remove_invalid: (max) => `Enter a number between 1 and ${max}!`,
        removed: (title) => `**${title}** removed from queue!`,
        cleared: 'Queue cleared! 🗑️',
        duration: '⏱️ Duration',
        position: '📊 Position'
    }};
    
    const title = titles[lang]?.[titleKey] || titleKey;
    let description = descriptions[lang]?.[descKey] || descKey;
    
    if (typeof description === 'function') {
        if (Array.isArray(fields)) description = description(...fields);
        else description = description(fields);
    } else {
        for (const [key, value] of Object.entries(replacements)) {
            description = description.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor(type === 'youtube' ? 0xFF0000 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client?.user?.username || 'Bot', iconURL: client?.user?.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : '🎵';
    embed.setTitle(`${emoji} ${title}`);
    embed.setDescription(description);
    
    if (userId) {
        const user = await client?.users?.fetch(userId).catch(() => null);
        if (user) embed.setFooter({ text: user.tag, iconURL: user.displayAvatarURL() });
    }
    embed.setTimestamp();
    
    if (Array.isArray(fields) && fields.length > 0 && fields[0] && typeof fields[0] === 'object') {
        embed.addFields(fields);
    }
    
    return embed;
}

// ⭐ Search YouTube using yt-search
async function searchYouTube(query) {
    try {
        // For direct URL
        if (query.includes('youtube.com/watch') || query.includes('youtu.be/')) {
            console.log(`🎵 Direct URL: ${query}`);
            const info = await play.video_info(query);
            return {
                title: info.video_details.title,
                url: info.video_details.url,
                duration: info.video_details.durationInSec,
                thumbnail: info.video_details.thumbnails[0]?.url || null
            };
        }
        
        // For search query
        console.log(`🔍 Searching: ${query}`);
        const searchResults = await ytSearch(query);
        
        if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
            console.log('❌ No results found');
            return null;
        }
        
        const video = searchResults.videos[0];
        console.log(`✅ Found: ${video.title}`);
        
        return {
            title: video.title,
            url: video.url,
            duration: video.duration.seconds || 0,
            thumbnail: video.thumbnail || null
        };
    } catch (error) {
        console.error('YouTube search error:', error);
        return null;
    }
}

// ⭐ Play song (KORRIGIERT für Audio-Ausgabe)
async function playSong(guild, channel, song, client) {
    const queue = getQueue(guild.id);
    
    try {
        console.log(`🎵 Playing: ${song.title}`);
        
        // 1. Stream von play-dl holen
        const stream = await play.stream(song.url, {
            quality: 2
        });
        
        // 2. AudioResource erstellen (Arbitrary zwingt FFmpeg zur Konvertierung)
        const resource = createAudioResource(stream.stream, { 
            inputType: StreamType.Arbitrary, // ⭐ Geändert von WebmOpus
            inlineVolume: true 
        });
        
        resource.volume.setVolume(queue.volume);
        
        // 3. Player konfigurieren
        queue.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        });
        
        queue.player.play(resource);
        queue.nowPlaying = song;
        
        // 4. Embed senden
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('🎵 Now Playing')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields([
                { name: '👤 Requested by', value: song.requestedBy, inline: true },
                { name: '⏱️ Duration', value: formatDuration(song.duration), inline: true }
            ])
            .setTimestamp();
        
        if (song.thumbnail) embed.setThumbnail(song.thumbnail);
        channel.send({ embeds: [embed] });
        
        // 5. Event-Listener (Idle = Song zu Ende)
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
        
        // 6. Fehler-Handling
        queue.player.on('error', (error) => {
            console.error('Player error:', error);
            queue.songs.shift();
            if (queue.songs.length > 0) {
                playSong(guild, channel, queue.songs[0], client);
            }
        });
        
    } catch (error) {
        console.error('Play error:', error);
        const errorEmbed = await buildEmbed(client, guild.id, song.requestedById, 'error', 'error', 'play_error');
        channel.send({ embeds: [errorEmbed] }).catch(() => {});
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(guild, channel, queue.songs[0], client);
        }
    }
}

function formatDuration(seconds) {
    if (!seconds) return 'Live';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
    category: 'Music',
    subCommands: {
        
        // ========== PLAY ==========
        play: {
            aliases: ['p', 'add'],
            description: 'Plays music from YouTube',
            category: 'Music',
            async execute(message, args, { client }) {
                const voiceChannel = message.member.voice.channel;
                
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
                    const songInfo = await searchYouTube(query);
                    
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
                    
                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                        .setTitle(queue.songs.length === 1 ? '▶️ Now Playing' : '📋 Added to Queue')
                        .setDescription(`[${song.title}](${song.url})`)
                        .addFields([
                            { name: '👤 Requested by', value: message.author.username, inline: true },
                            { name: '⏱️ Duration', value: formatDuration(song.duration), inline: true },
                            { name: '📊 Position', value: `#${queue.songs.length}`, inline: true }
                        ])
                        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() })
                        .setTimestamp();
                    
                    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
                    
                    await loadingMsg.edit({ embeds: [embed] });
                    
                    if (queue.songs.length === 1) {
                        if (!queue.connection) {
                            queue.connection = joinVoiceChannel({
                                channelId: voiceChannel.id,
                                guildId: message.guild.id,
                                adapterCreator: message.guild.voiceAdapterCreator,
                                selfMute: false,
                                selfDeaf: false
                            });
                            console.log(`✅ Bot joined ${voiceChannel.name}`);
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
                if (!queue.nowPlaying) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_song', 'no_song_playing')] 
                    });
                }
                if (queue.player) queue.player.stop();
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
                queue.songs = [];
                queue.loop = false;
                if (queue.player) queue.player.stop();
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
                if (isNaN(volume) || volume < 0 || volume > 200) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'volume', 'volume_invalid')] 
                    });
                }
                queue.volume = volume / 100;
                if (queue.player && queue.player.state.resource) {
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
                if (queue.songs.length === 0) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'queue', 'queue_empty')] 
                    });
                }
                
                const nowPlaying = queue.nowPlaying;
                const upcoming = queue.songs.slice(0, 10);
                
                let description = '';
                if (nowPlaying) description += `**Now playing:**\n[${nowPlaying.title}](${nowPlaying.url})\n\n`;
                if (upcoming.length > 0) {
                    description += `**Up next:**\n`;
                    upcoming.forEach((song, i) => {
                        description += `\`${i+1}.\` [${song.title}](${song.url}) | ${song.requestedBy}\n`;
                    });
                }
                if (queue.songs.length > 10) description += `\n... and ${queue.songs.length - 10} more songs`;
                
                const embed = new EmbedBuilder()
                    .setColor(0x1DB954)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('📋 Music Queue')
                    .setDescription(description)
                    .addFields([
                        { name: '🔁 Loop', value: queue.loop ? '✅ On' : '❌ Off', inline: true },
                        { name: '🔊 Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== NOWPLAYING ==========
        nowplaying: {
            aliases: ['np', 'current'],
            description: 'Shows the current song',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
                if (!queue.nowPlaying) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_song', 'no_song_playing')] 
                    });
                }
                const song = queue.nowPlaying;
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🎵 Now Playing')
                    .setDescription(`[${song.title}](${song.url})`)
                    .addFields([
                        { name: '👤 Requested by', value: song.requestedBy, inline: true },
                        { name: '⏱️ Duration', value: formatDuration(song.duration), inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                if (song.thumbnail) embed.setThumbnail(song.thumbnail);
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== LOOP ==========
        loop: {
            aliases: ['repeat', 'l'],
            description: 'Toggles loop',
            category: 'Music',
            async execute(message, args, { client }) {
                const queue = getQueue(message.guild.id);
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
                const embed = new EmbedBuilder()
                    .setColor(0x1DB954)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle('🎵 Music Commands')
                    .addFields([
                        { name: '▶️ YouTube', value: '`!play <URL or Search>`', inline: false },
                        { name: '🎮 Playback', value: '`!pause` `!resume` `!stop` `!skip` `!volume`', inline: true },
                        { name: '📋 Queue', value: '`!queue` `!nowplaying` `!shuffle` `!remove` `!clear` `!loop`', inline: true }
                    ])
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }
        }
    }
};

module.exports.musicQueues = musicQueues;
