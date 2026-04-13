const { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel } = require('@discordjs/voice');
const play = require('play-dl');
const scdl = require('soundcloud-downloader').default;
const { EmbedBuilder } = require('discord.js');
const https = require('https');

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

// ⭐ SoundCloud Suche
async function searchSoundCloud(query) {
    try {
        const results = await scdl.search({
            query: query,
            limit: 1,
            resourceType: 'tracks'
        });
        
        if (results.collection.length > 0) {
            const track = results.collection[0];
            return {
                title: track.title,
                url: track.permalink_url,
                duration: formatDuration(track.duration / 1000),
                thumbnail: track.artwork_url || track.user.avatar_url,
                platform: 'soundcloud'
            };
        }
        return null;
    } catch (error) {
        console.error('SoundCloud search error:', error);
        return null;
    }
}

// ⭐ Spotify Suche (konvertiert zu SoundCloud)
async function searchSpotify(query) {
    try {
        const spotify = require('spotify-url-info')();
        const track = await spotify.getPreview(query);
        const searchQuery = `${track.artist} ${track.title}`;
        
        // Auf SoundCloud suchen statt YouTube!
        return await searchSoundCloud(searchQuery);
    } catch (error) {
        console.error('Spotify search error:', error);
        return null;
    }
}

// ⭐ MP3 Direkt-Stream
async function getMp3Stream(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                resolve(response);
            } else {
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', reject);
    });
}

// ⭐ Song Info je nach Plattform
async function getSongInfo(query) {
    // SoundCloud Link?
    if (query.includes('soundcloud.com')) {
        try {
            const info = await scdl.getInfo(query);
            return {
                title: info.title,
                url: info.permalink_url,
                duration: formatDuration(info.duration / 1000),
                thumbnail: info.artwork_url || info.user.avatar_url,
                platform: 'soundcloud'
            };
        } catch (error) {
            console.error('SoundCloud info error:', error);
            return null;
        }
    }
    
    // Spotify Link?
    if (query.includes('spotify.com')) {
        return await searchSpotify(query);
    }
    
    // MP3 Link?
    if (query.endsWith('.mp3') || query.includes('.mp3?')) {
        return {
            title: query.split('/').pop() || 'MP3 Stream',
            url: query,
            duration: 'Unbekannt',
            thumbnail: null,
            platform: 'mp3'
        };
    }
    
    // Normale Suche (SoundCloud)
    return await searchSoundCloud(query);
}

// ⭐ Play Song
async function playSong(guild, channel, song, client) {
    const queue = getQueue(guild.id);
    
    try {
        console.log(`🎵 Versuche abzuspielen: ${song.title} (${song.platform})`);
        
        let stream;
        
        if (song.platform === 'soundcloud') {
            // SoundCloud Stream
            stream = await scdl.download(song.url);
            const resource = createAudioResource(stream, { inlineVolume: true });
            resource.volume.setVolume(queue.volume);
            queue.player.play(resource);
            
        } else if (song.platform === 'mp3') {
            // MP3 Direkt-Stream
            const mp3Stream = await getMp3Stream(song.url);
            const resource = createAudioResource(mp3Stream, { inlineVolume: true });
            resource.volume.setVolume(queue.volume);
            queue.player.play(resource);
            
        } else {
            // Fallback: play-dl
            const dlStream = await play.stream(song.url);
            const resource = createAudioResource(dlStream.stream, { 
                inputType: dlStream.type,
                inlineVolume: true 
            });
            resource.volume.setVolume(queue.volume);
            queue.player.play(resource);
        }
        
        queue.nowPlaying = song;
        queue.channel = channel;
        
        const platformEmoji = song.platform === 'soundcloud' ? '🟠' : 
                              song.platform === 'spotify' ? '🟢' : '🔵';
        
        const embed = new EmbedBuilder()
            .setColor(song.platform === 'soundcloud' ? 0xFF5500 : 
                     song.platform === 'spotify' ? 0x1DB954 : 0x0099FF)
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
        
        play: {
            aliases: ['p', 'add'],
            description: 'Spielt Musik (SoundCloud/Spotify/MP3)',
            category: 'Music',
            async execute(message, args, { client }) {
                const voiceChannel = message.member.voice.channel;
                if (!voiceChannel) {
                    return message.reply({ embeds: [global.embed.error('Kein VC', 'Du musst in einem Voice-Channel sein!')] });
                }
                
                const query = args.join(' ');
                if (!query) return message.reply({ embeds: [global.embed.error('Kein Song', '!play <SoundCloud/Spotify/MP3>')] });
                
                const queue = getQueue(message.guild.id);
                
                try {
                    const songInfo = await getSongInfo(query);
                    
                    if (!songInfo) {
                        return message.reply({ embeds: [global.embed.error('Nicht gefunden', 'Kein Song gefunden! Versuche SoundCloud oder Spotify.')] });
                    }
                    
                    const song = { ...songInfo, requestedBy: message.author.username };
                    queue.songs.push(song);
                    
                    const embed = new EmbedBuilder()
                        .setColor(song.platform === 'soundcloud' ? 0xFF5500 : 
                                 song.platform === 'spotify' ? 0x1DB954 : 0x0099FF)
                        .setTitle(queue.songs.length === 1 ? '🎵 Spielt jetzt' : '📋 Zur Queue hinzugefügt')
                        .setDescription(`[${song.title}](${song.url})`)
                        .addFields(
                            { name: '👤 Angefordert von', value: message.author.username, inline: true },
                            { name: '⏱️ Dauer', value: song.duration || 'Unbekannt', inline: true },
                            { name: '📊 Position', value: `#${queue.songs.length}`, inline: true }
                        )
                        .setTimestamp();
                    
                    if (song.thumbnail) {
                        embed.setThumbnail(song.thumbnail);
                    }
                    
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
                    .setColor(0x0099FF)
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
                    .setColor(song.platform === 'soundcloud' ? 0xFF5500 : 0x1DB954)
                    .setTitle('🎵 Jetzt spielt')
                    .setDescription(`[${song.title}](${song.url})`)
                    .addFields(
                        { name: '👤 Angefordert von', value: song.requestedBy, inline: true },
                        { name: '⏱️ Dauer', value: song.duration || 'Unbekannt', inline: true },
                        { name: '🎧 Plattform', value: song.platform || 'Unbekannt', inline: true }
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
                    color: 0x0099FF,
                    title: '🎵 Music Befehle',
                    fields: [
                        { name: '🎧 Plattformen', value: 'SoundCloud ✅\nSpotify (Suche) ✅\nMP3 Links ✅\nYouTube ❌ (geblockt)', inline: false },
                        { name: '🎮 Wiedergabe', value: '`!play` `!pause` `!resume` `!stop` `!skip` `!volume`', inline: false },
                        { name: '📋 Queue', value: '`!queue` `!nowplaying` `!shuffle` `!loop`', inline: false }
                    ]
                }] });
            }
        }
    }
};

module.exports.musicQueues = musicQueues;
