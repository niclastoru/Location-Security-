const { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
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

// ⭐ Spotify zu YouTube konvertieren
async function getSongInfo(query) {
    try {
        // Spotify Link?
        if (query.includes('spotify.com') || query.includes('spotify.link')) {
            const track = await spotify.getPreview(query);
            const searchQuery = `${track.artist} ${track.title}`;
            const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            
            const response = await fetch(searchUrl);
            const html = await response.text();
            const match = html.match(/"videoId":"([^"]+)"/);
            
            if (match) {
                const videoId = match[1];
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                const songInfo = await ytdl.getInfo(videoUrl);
                
                return {
                    title: `${track.title} - ${track.artist}`,
                    url: videoUrl,
                    duration: formatDuration(songInfo.videoDetails.lengthSeconds),
                    thumbnail: songInfo.videoDetails.thumbnails[0].url,
                    spotify: true
                };
            }
        }
        
        // YouTube Link?
        if (query.includes('youtube.com') || query.includes('youtu.be')) {
            const songInfo = await ytdl.getInfo(query);
            return {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
                duration: formatDuration(songInfo.videoDetails.lengthSeconds),
                thumbnail: songInfo.videoDetails.thumbnails[0].url
            };
        }
        
        // Normale Suche
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl);
        const html = await response.text();
        const match = html.match(/"videoId":"([^"]+)"/);
        
        if (match) {
            const videoId = match[1];
            const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
            const songInfo = await ytdl.getInfo(videoUrl);
            
            return {
                title: songInfo.videoDetails.title,
                url: videoUrl,
                duration: formatDuration(songInfo.videoDetails.lengthSeconds),
                thumbnail: songInfo.videoDetails.thumbnails[0].url
            };
        }
        
        return null;
    } catch (error) {
        console.error('Search error:', error);
        return null;
    }
}

// Playlist Support
async function getSpotifyPlaylist(url) {
    try {
        const playlist = await spotify.getTracks(url);
        const songs = [];
        
        for (const track of playlist) {
            const searchQuery = `${track.artists[0].name} ${track.name}`;
            const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
            
            const response = await fetch(searchUrl);
            const html = await response.text();
            const match = html.match(/"videoId":"([^"]+)"/);
            
            if (match) {
                const videoId = match[1];
                const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
                songs.push({
                    title: `${track.name} - ${track.artists[0].name}`,
                    url: videoUrl,
                    duration: formatDuration(Math.floor(track.duration_ms / 1000)),
                    thumbnail: track.album.images[0]?.url,
                    spotify: true
                });
            }
        }
        
        return songs;
    } catch (error) {
        console.error('Playlist error:', error);
        return [];
    }
}

async function playSong(guild, channel, song, client) {
    const queue = getQueue(guild.id);
    
    try {
        const stream = ytdl(song.url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });
        
        const resource = createAudioResource(stream, { inlineVolume: true });
        resource.volume.setVolume(queue.volume);
        
        queue.player.play(resource);
        queue.nowPlaying = song;
        queue.channel = channel;
        
        const embed = new EmbedBuilder()
            .setColor(song.spotify ? 0x1DB954 : 0xFF0000)
            .setTitle(song.spotify ? '🎵 Jetzt spielt (Spotify)' : '🎵 Jetzt spielt')
            .setDescription(`[${song.title}](${song.url})`)
            .addFields(
                { name: '👤 Angefordert von', value: song.requestedBy, inline: true },
                { name: '⏱️ Dauer', value: song.duration || 'Unbekannt', inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();
        
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
        console.error('Fehler beim Abspielen:', error);
        channel.send({ embeds: [global.embed.error('Fehler', 'Konnte Song nicht abspielen!')] });
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playSong(guild, channel, queue.songs[0], client);
        }
    }
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
    category: 'Music',
    subCommands: {
        
        // ========== PLAY ==========
        play: {
            aliases: ['p', 'add'],
            description: 'Spielt einen Song ab (YouTube/Spotify)',
            category: 'Music',
            async execute(message, args, { client }) {
                const voiceChannel = message.member.voice.channel;
                if (!voiceChannel) {
                    return message.reply({ embeds: [global.embed.error('Kein VC', 'Du musst in einem Voice-Channel sein!')] });
                }
                
                const query = args.join(' ');
                if (!query) return message.reply({ embeds: [global.embed.error('Kein Song', '!play <Titel/URL>')] });
                
                const queue = getQueue(message.guild.id);
                
                try {
                    // Spotify Playlist?
                    if (query.includes('spotify.com/playlist')) {
                        message.reply({ embeds: [global.embed.info('Lade Playlist', '⏳ Lade Spotify Playlist...')] });
                        
                        const songs = await getSpotifyPlaylist(query);
                        if (songs.length === 0) {
                            return message.reply({ embeds: [global.embed.error('Fehler', 'Playlist konnte nicht geladen werden!')] });
                        }
                        
                        for (const song of songs) {
                            song.requestedBy = message.author.username;
                            queue.songs.push(song);
                        }
                        
                        message.channel.send({ embeds: [global.embed.success('Playlist hinzugefügt', `${songs.length} Songs zur Queue hinzugefügt!`)] });
                        
                        if (queue.songs.length === songs.length) {
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
                    
                    // Einzelner Song
                    const songInfo = await getSongInfo(query);
                    
                    if (!songInfo) {
                        return message.reply({ embeds: [global.embed.error('Nicht gefunden', 'Kein Song gefunden!')] });
                    }
                    
                    const song = {
                        ...songInfo,
                        requestedBy: message.author.username
                    };
                    
                    queue.songs.push(song);
                    
                    const embed = new EmbedBuilder()
                        .setColor(song.spotify ? 0x1DB954 : 0xFF0000)
                        .setTitle(queue.songs.length === 1 ? '🎵 Spielt jetzt' : '📋 Zur Queue hinzugefügt')
                        .setDescription(`[${song.title}](${song.url})`)
                        .addFields(
                            { name: '👤 Angefordert von', value: message.author.username, inline: true },
                            { name: '⏱️ Dauer', value: song.duration || 'Unbekannt', inline: true },
                            { name: '📊 Position', value: `#${queue.songs.length}`, inline: true }
                        )
                        .setThumbnail(song.thumbnail)
                        .setTimestamp();
                    
                    message.reply({ embeds: [embed] });
                    
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
                    message.reply({ embeds: [global.embed.error('Fehler', 'Song konnte nicht abgespielt werden!')] });
                }
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
                
                if (queue.player.state.status === AudioPlayerStatus.Paused) {
                    return message.reply({ embeds: [global.embed.error('Bereits pausiert', 'Musik ist bereits pausiert!')] });
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
                
                if (queue.player.state.status === AudioPlayerStatus.Playing) {
                    return message.reply({ embeds: [global.embed.error('Spielt bereits', 'Musik spielt bereits!')] });
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
                    description += `**🎵 Jetzt spielt:**\n[${nowPlaying.title}](${nowPlaying.url}) | \`${nowPlaying.duration || 'Live'}\`\n\n`;
                }
                
                if (upcoming.length > 0) {
                    description += '**📋 Als nächstes:**\n';
                    upcoming.forEach((song, i) => {
                        description += `\`${i+1}.\` [${song.title}](${song.url}) | \`${song.duration || 'Live'}\`\n`;
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
                        { name: '🔊 Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true },
                        { name: '📊 Songs', value: `${queue.songs.length}`, inline: true }
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
                const embed = new EmbedBuilder()
                    .setColor(song.spotify ? 0x1DB954 : 0xFF0000)
                    .setTitle('🎵 Jetzt spielt')
                    .setDescription(`[${song.title}](${song.url})`)
                    .addFields(
                        { name: '👤 Angefordert von', value: song.requestedBy, inline: true },
                        { name: '⏱️ Dauer', value: song.duration || 'Unbekannt', inline: true },
                        { name: '🔊 Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true },
                        { name: '🔁 Loop', value: queue.loop ? '✅ An' : '❌ Aus', inline: true }
                    )
                    .setThumbnail(song.thumbnail)
                    .setTimestamp();
                
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
        
        // ========== LYRICS ==========
        lyrics: {
            aliases: ['ly', 'text'],
            description: 'Sucht Lyrics',
            category: 'Music',
            async execute(message, args) {
                const query = args.join(' ') || 'aktueller Song';
                return message.reply({ embeds: [global.embed.info('Lyrics', `🔍 Lyrics für "${query}"\n\nhttps://genius.com/search?q=${encodeURIComponent(query)}`)] });
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
                        { name: '🎮 Wiedergabe', value: '`!play <Spotify/YouTube>`\n`!pause`, `!resume`, `!stop`, `!skip`, `!volume`', inline: false },
                        { name: '📋 Queue', value: '`!queue`, `!nowplaying`, `!shuffle`, `!remove`, `!clear`, `!loop`', inline: false },
                        { name: '🔧 Sonstiges', value: '`!lyrics`, `!spotify`', inline: false }
                    ]
                }] });
            }
        }
    }
};

module.exports.musicQueues = musicQueues;
