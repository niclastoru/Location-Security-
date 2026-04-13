const { EmbedBuilder } = require('discord.js');
const { LavalinkManager } = require('lavalink-client');

// Lavalink Manager (einmalig initialisieren)
let manager = null;

function initLavalink(client) {
    if (manager) return manager;
    
    manager = new LavalinkManager({
        nodes: [
            {
                id: 'main',
                host: 'lava.link',           // KOSTENLOSER Public Lavalink
                port: 80,
                authorization: 'youshallnotpass',
                secure: false
            },
            {
                id: 'fallback',
                host: 'lavalink.oops.wtf',    // Backup Server
                port: 443,
                authorization: 'www.freelavalink.ga',
                secure: true
            },
            {
                id: 'fallback2',
                host: 'node1.kartadharta.xyz', // Backup 2
                port: 443,
                authorization: 'kdlavalink',
                secure: true
            }
        ],
        sendToShard: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        },
        client: client
    });
    
    manager.init(client);
    return manager;
}

// Music Queue System (nur für Queue-Management)
const musicQueues = new Map();

function getQueue(guildId) {
    if (!musicQueues.has(guildId)) {
        musicQueues.set(guildId, {
            songs: [],
            loop: false,
            volume: 50,
            nowPlaying: null
        });
    }
    return musicQueues.get(guildId);
}

module.exports = {
    category: 'Music',
    subCommands: {
        
        play: {
            aliases: ['p', 'add'],
            description: 'Spielt Musik (YouTube/Spotify/SoundCloud)',
            category: 'Music',
            async execute(message, args, { client }) {
                const voiceChannel = message.member.voice.channel;
                if (!voiceChannel) {
                    return message.reply({ embeds: [global.embed.error('Kein VC', 'Du musst in einem Voice-Channel sein!')] });
                }
                
                const query = args.join(' ');
                if (!query) return message.reply({ embeds: [global.embed.error('Kein Song', '!play <Titel/URL>')] });
                
                const lavalink = initLavalink(client);
                const queue = getQueue(message.guild.id);
                
                try {
                    // Player erstellen oder holen
                    let player = lavalink.getPlayer(message.guild.id);
                    
                    if (!player) {
                        player = lavalink.createPlayer({
                            guildId: message.guild.id,
                            voiceChannelId: voiceChannel.id,
                            textChannelId: message.channel.id,
                            selfMute: false,
                            selfDeaf: true,
                            volume: queue.volume
                        });
                        
                        player.connect();
                    }
                    
                    if (!player.connected) {
                        player.voiceChannelId = voiceChannel.id;
                        player.connect();
                    }
                    
                    // Song suchen
                    const result = await player.search({
                        query: query,
                        source: 'ytsearch' // YouTube, findet auch Spotify/SoundCloud!
                    }, message.author);
                    
                    if (!result.tracks.length) {
                        return message.reply({ embeds: [global.embed.error('Nicht gefunden', 'Kein Song gefunden!')] });
                    }
                    
                    const track = result.tracks[0];
                    track.requester = message.author;
                    
                    queue.songs.push(track);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(queue.songs.length === 1 ? '🎵 Spielt jetzt' : '📋 Zur Queue hinzugefügt')
                        .setDescription(`[${track.info.title}](${track.info.uri})`)
                        .addFields(
                            { name: '👤 Angefordert von', value: message.author.username, inline: true },
                            { name: '⏱️ Dauer', value: formatDuration(track.info.duration), inline: true },
                            { name: '📊 Position', value: `#${queue.songs.length}`, inline: true }
                        )
                        .setThumbnail(track.info.artworkUrl || track.info.thumbnail)
                        .setTimestamp();
                    
                    message.reply({ embeds: [embed] });
                    
                    // Song abspielen
                    if (!player.playing && !player.paused) {
                        player.play(track);
                        queue.nowPlaying = track;
                    } else if (player.playing || player.paused) {
                        player.queue.add(track);
                    }
                    
                    // Event Handler
                    player.on('end', () => {
                        queue.songs.shift();
                        
                        if (queue.loop && queue.nowPlaying) {
                            player.queue.add(queue.nowPlaying);
                        }
                        
                        if (queue.songs.length > 0) {
                            const nextTrack = queue.songs[0];
                            player.play(nextTrack);
                            queue.nowPlaying = nextTrack;
                            
                            const nextEmbed = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setTitle('🎵 Jetzt spielt')
                                .setDescription(`[${nextTrack.info.title}](${nextTrack.info.uri})`)
                                .addFields(
                                    { name: '👤 Angefordert von', value: nextTrack.requester.username, inline: true }
                                )
                                .setTimestamp();
                            
                            message.channel.send({ embeds: [nextEmbed] });
                        } else {
                            queue.nowPlaying = null;
                        }
                    });
                    
                    player.on('error', (error) => {
                        console.error('Player error:', error);
                        message.channel.send({ embeds: [global.embed.error('Fehler', 'Player-Fehler!')] });
                    });
                    
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
            async execute(message, args, { client }) {
                const lavalink = initLavalink(client);
                const player = lavalink.getPlayer(message.guild.id);
                
                if (!player || !player.playing) {
                    return message.reply({ embeds: [global.embed.error('Kein Song', 'Es wird kein Song abgespielt!')] });
                }
                
                player.stop();
                return message.reply({ embeds: [global.embed.success('Übersprungen', 'Song wurde übersprungen! ⏭️')] });
            }
        },
        
        stop: {
            aliases: ['leave', 'dc'],
            description: 'Stoppt die Musik',
            category: 'Music',
            async execute(message, args, { client }) {
                const lavalink = initLavalink(client);
                const player = lavalink.getPlayer(message.guild.id);
                
                if (player) {
                    player.destroy();
                }
                
                const queue = getQueue(message.guild.id);
                queue.songs = [];
                queue.nowPlaying = null;
                
                return message.reply({ embeds: [global.embed.success('Gestoppt', 'Musik wurde gestoppt! 👋')] });
            }
        },
        
        pause: {
            aliases: ['hold'],
            description: 'Pausiert die Musik',
            category: 'Music',
            async execute(message, args, { client }) {
                const lavalink = initLavalink(client);
                const player = lavalink.getPlayer(message.guild.id);
                
                if (!player || !player.playing) {
                    return message.reply({ embeds: [global.embed.error('Kein Song', 'Es wird kein Song abgespielt!')] });
                }
                
                player.pause();
                return message.reply({ embeds: [global.embed.success('Pausiert', 'Musik wurde pausiert! ⏸️')] });
            }
        },
        
        resume: {
            aliases: ['unpause'],
            description: 'Setzt die Musik fort',
            category: 'Music',
            async execute(message, args, { client }) {
                const lavalink = initLavalink(client);
                const player = lavalink.getPlayer(message.guild.id);
                
                if (!player || !player.paused) {
                    return message.reply({ embeds: [global.embed.error('Kein Song', 'Musik ist nicht pausiert!')] });
                }
                
                player.resume();
                return message.reply({ embeds: [global.embed.success('Fortgesetzt', 'Musik wird fortgesetzt! ▶️')] });
            }
        },
        
        volume: {
            aliases: ['vol', 'v'],
            description: 'Ändert die Lautstärke',
            category: 'Music',
            async execute(message, args, { client }) {
                const lavalink = initLavalink(client);
                const player = lavalink.getPlayer(message.guild.id);
                
                if (!player) {
                    return message.reply({ embeds: [global.embed.error('Kein Player', 'Kein aktiver Player!')] });
                }
                
                const volume = parseInt(args[0]);
                if (isNaN(volume) || volume < 0 || volume > 200) {
                    return message.reply({ embeds: [global.embed.error('Ungültig', 'Volume muss zwischen 0 und 200 sein!')] });
                }
                
                player.setVolume(volume);
                const queue = getQueue(message.guild.id);
                queue.volume = volume;
                
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
                    description += `**🎵 Jetzt spielt:**\n[${nowPlaying.info.title}](${nowPlaying.info.uri})\n\n`;
                }
                
                if (upcoming.length > 0) {
                    description += '**📋 Als nächstes:**\n';
                    upcoming.forEach((track, i) => {
                        description += `\`${i+1}.\` [${track.info.title}](${track.info.uri}) | ${track.requester.username}\n`;
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('📋 Musik Queue')
                    .setDescription(description)
                    .addFields(
                        { name: '🔁 Loop', value: queue.loop ? '✅ An' : '❌ Aus', inline: true },
                        { name: '🔊 Volume', value: `${queue.volume}%`, inline: true }
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
                
                const track = queue.nowPlaying;
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎵 Jetzt spielt')
                    .setDescription(`[${track.info.title}](${track.info.uri})`)
                    .addFields(
                        { name: '👤 Angefordert von', value: track.requester.username, inline: true },
                        { name: '⏱️ Dauer', value: formatDuration(track.info.duration), inline: true }
                    )
                    .setThumbnail(track.info.artworkUrl || track.info.thumbnail)
                    .setTimestamp();
                
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
                
                for (let i = queue.songs.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [queue.songs[i], queue.songs[j]] = [queue.songs[j], queue.songs[i]];
                }
                
                return message.reply({ embeds: [global.embed.success('Gemischt', 'Queue wurde gemischt! 🔀')] });
            }
        },
        
        musichelp: {
            aliases: ['music', 'mhelp'],
            description: 'Zeigt alle Music-Befehle',
            category: 'Music',
            async execute(message) {
                return message.reply({ embeds: [{
                    color: 0x00FF00,
                    title: '🎵 Music Befehle (Lavalink)',
                    fields: [
                        { name: '🎧 Plattformen', value: '✅ YouTube\n✅ Spotify\n✅ SoundCloud\n✅ ALLES!', inline: false },
                        { name: '🎮 Wiedergabe', value: '`!play` `!pause` `!resume` `!stop` `!skip` `!volume`', inline: false },
                        { name: '📋 Queue', value: '`!queue` `!nowplaying` `!shuffle` `!loop`', inline: false }
                    ]
                }] });
            }
        }
    }
};

function formatDuration(ms) {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports.initLavalink = initLavalink;
module.exports.musicQueues = musicQueues;
