const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ⭐ HELPER: Schöne Embeds mit Sprache bauen
async function buildEmbed(client, guildId, userId, type, titleKey, descKey, fields = [], replacements = {}) {
    const lang = client.languages?.get(guildId) || 'de';
    
    const colors = {
        success: 0x57F287,
        error: 0xED4245,
        info: 0x5865F2,
        warn: 0xFEE75C,
        fun: 0xFF69B4,
        marriage: 0xFF69B4
    };
    
    const titles = {
        de: {
            no_user: 'Kein User',
            self_action: 'Echt jetzt?',
            bodycount: 'Bodycount',
            cry: 'Weinen',
            fortune: 'Glückskeks',
            game_running: 'Spiel läuft',
            no_game: 'Kein Spiel',
            game_started: 'Imposter gestartet',
            game_ended: 'Spiel beendet',
            caught: 'Erwischt!',
            innocent: 'Unschuldig',
            not_married: 'Nicht verheiratet',
            already_married: 'Bereits verheiratet',
            request_exists: 'Anfrage existiert',
            proposal: 'Heiratsantrag!',
            married: 'Verheiratet!',
            proposal_rejected: 'Antrag abgelehnt',
            proposal_timeout: 'Antrag abgelaufen',
            relationship_status: 'Beziehungsstatus',
            pp: 'PP',
            ship: 'Ship',
            error: 'Fehler',
            success: 'Erfolg',
            info: 'Info'
        },
        en: {
            no_user: 'No User',
            self_action: 'Really?',
            bodycount: 'Bodycount',
            cry: 'Cry',
            fortune: 'Fortune Cookie',
            game_running: 'Game Running',
            no_game: 'No Game',
            game_started: 'Imposter Started',
            game_ended: 'Game Ended',
            caught: 'Caught!',
            innocent: 'Innocent',
            not_married: 'Not Married',
            already_married: 'Already Married',
            request_exists: 'Request Exists',
            proposal: 'Marriage Proposal!',
            married: 'Married!',
            proposal_rejected: 'Proposal Rejected',
            proposal_timeout: 'Proposal Expired',
            relationship_status: 'Relationship Status',
            pp: 'PP',
            ship: 'Ship',
            error: 'Error',
            success: 'Success',
            info: 'Info'
        }
    };
    
    const descriptions = {
        de: {
            blowjob_usage: '!blowjob @User',
            blowjob: (user, target) => `😮 **${user}** gibt **${target}** einen Blowjob!`,
            bodycount: (user, count) => `🔪 **${user}** hat einen Bodycount von **${count}**!`,
            cheat: (user, target) => `💔 **${user}** geht **${target}** fremd! Skandal!`,
            cry: (user, emoji) => `${emoji} **${user}** weint...`,
            cuddle: (user, target) => `🤗 **${user}** kuschelt mit **${target}**! So süß!`,
            divorce_success: (user, partner) => `💔 **${user}** hat sich von **${partner}** scheiden lassen!`,
            divorce_not_married: 'Du bist nicht verheiratet!',
            fortune: (fortune) => fortune,
            handhold: (user, target) => `🤝 **${user}** hält Händchen mit **${target}**!`,
            highfive: (user, target) => `✋ **${user}** gibt **${target}** einen Highfive!`,
            hug: (user, target) => `🫂 **${user}** umarmt **${target}**!`,
            imposter_started: (user) => `🎮 **${user}** hat ein Imposter-Spiel gestartet!\nNutze \`!imposter-join\` zum Mitmachen!\n\`!imposter-vote @User\` zum Voten!`,
            imposter_running: 'In diesem Channel läuft bereits ein Imposter-Spiel!',
            imposter_not_running: 'In diesem Channel läuft kein Imposter-Spiel!',
            imposter_ended: 'Imposter-Spiel wurde beendet!',
            imposter_caught: (user) => `🔪 **${user}** war der Imposter! Gut gemacht!`,
            imposter_innocent: (user) => `😇 **${user}** war kein Imposter...`,
            kiss: (user, target) => `💋 **${user}** küsst **${target}**! Wie romantisch!`,
            kiss_self: 'Dich selbst küssen? Wirklich?',
            lick: (user, target) => `👅 **${user}** leckt **${target}**! Ewww!`,
            marry_usage: '!marry @User',
            marry_self: 'Du kannst dich nicht selbst heiraten!',
            marry_bot: 'Du kannst keinen Bot heiraten!',
            marry_already: (partner) => `Du bist bereits mit **${partner}** verheiratet!\nNutze \`!divorce\` für Scheidung.`,
            marry_target_already: (user) => `**${user}** ist bereits verheiratet!`,
            marry_request_exists: (user) => `Du hast **${user}** bereits einen Antrag gemacht!`,
            proposal_text: (user, target) => `**${user}** möchte **${target}** heiraten!\n\n${target}, willst du?`,
            proposal_footer: 'Antwort mit den Buttons unten!',
            married_success: (user, target) => `🎉 **${user}** und **${target}** sind jetzt verheiratet!\nAlles Gute für die Zukunft! 💕`,
            proposal_rejected: (user, target) => `**${target}** hat den Antrag von **${user}** abgelehnt... 😢`,
            proposal_timeout: (user) => `**${user}** hat nicht rechtzeitig geantwortet...`,
            status_single: '❤️ Single',
            status_married: '💍 Verheiratet',
            status_pending_from: (user) => `\n💌 Hat einen Antrag von **${user}** erhalten!`,
            status_pending_to: (user) => `\n💌 Hat **${user}** einen Antrag gemacht!`,
            partner: '💑 Partner',
            married_since: '📅 Verheiratet seit',
            pp_size: (user, size, bar) => `**${size}cm**\n\`${bar}\``,
            ship_self: 'Du kannst dich nicht selbst shippen!',
            ship_perfect: 'PERFEKTES PAAR!',
            ship_good: 'Gute Kombi!',
            ship_okay: 'Könnte klappen!',
            ship_bad: 'Schwierig...',
            ship_terrible: 'Keine Chance...',
            ship_result: (name, percentage, rating) => `**${name}**\n\n**${percentage}%** - ${rating}`,
            slap: (user, target) => `👋 **${user}** schlägt **${target}**! Autsch!`,
            slap_self: 'Du schlägst dich selbst? Das tut weh!',
            wink: (user, target) => `😉 **${user}** zwinkert **${target}** zu!`,
            unknown: 'Unbekannt',
            congratulations: 'Glückwunsch'
        },
        en: {
            blowjob_usage: '!blowjob @User',
            blowjob: (user, target) => `😮 **${user}** gives **${target}** a blowjob!`,
            bodycount: (user, count) => `🔪 **${user}** has a bodycount of **${count}**!`,
            cheat: (user, target) => `💔 **${user}** is cheating on **${target}**! Scandal!`,
            cry: (user, emoji) => `${emoji} **${user}** is crying...`,
            cuddle: (user, target) => `🤗 **${user}** cuddles with **${target}**! So cute!`,
            divorce_success: (user, partner) => `💔 **${user}** divorced **${partner}**!`,
            divorce_not_married: 'You are not married!',
            fortune: (fortune) => fortune,
            handhold: (user, target) => `🤝 **${user}** holds hands with **${target}**!`,
            highfive: (user, target) => `✋ **${user}** high-fives **${target}**!`,
            hug: (user, target) => `🫂 **${user}** hugs **${target}**!`,
            imposter_started: (user) => `🎮 **${user}** started an Imposter game!\nUse \`!imposter-join\` to join!\n\`!imposter-vote @User\` to vote!`,
            imposter_running: 'There is already an Imposter game in this channel!',
            imposter_not_running: 'There is no Imposter game in this channel!',
            imposter_ended: 'Imposter game ended!',
            imposter_caught: (user) => `🔪 **${user}** was the Imposter! Well done!`,
            imposter_innocent: (user) => `😇 **${user}** was not the Imposter...`,
            kiss: (user, target) => `💋 **${user}** kisses **${target}**! How romantic!`,
            kiss_self: 'Kiss yourself? Really?',
            lick: (user, target) => `👅 **${user}** licks **${target}**! Ewww!`,
            marry_usage: '!marry @User',
            marry_self: 'You cannot marry yourself!',
            marry_bot: 'You cannot marry a bot!',
            marry_already: (partner) => `You are already married to **${partner}**!\nUse \`!divorce\` to divorce.`,
            marry_target_already: (user) => `**${user}** is already married!`,
            marry_request_exists: (user) => `You already proposed to **${user}**!`,
            proposal_text: (user, target) => `**${user}** wants to marry **${target}**!\n\n${target}, do you accept?`,
            proposal_footer: 'Answer with the buttons below!',
            married_success: (user, target) => `🎉 **${user}** and **${target}** are now married!\nBest wishes for the future! 💕`,
            proposal_rejected: (user, target) => `**${target}** rejected **${user}**'s proposal... 😢`,
            proposal_timeout: (user) => `**${user}** didn't respond in time...`,
            status_single: '❤️ Single',
            status_married: '💍 Married',
            status_pending_from: (user) => `\n💌 Received a proposal from **${user}**!`,
            status_pending_to: (user) => `\n💌 Proposed to **${user}**!`,
            partner: '💑 Partner',
            married_since: '📅 Married since',
            pp_size: (user, size, bar) => `**${size}cm**\n\`${bar}\``,
            ship_self: 'You cannot ship yourself!',
            ship_perfect: 'PERFECT MATCH!',
            ship_good: 'Good combo!',
            ship_okay: 'Could work!',
            ship_bad: 'Difficult...',
            ship_terrible: 'No chance...',
            ship_result: (name, percentage, rating) => `**${name}**\n\n**${percentage}%** - ${rating}`,
            slap: (user, target) => `👋 **${user}** slaps **${target}**! Ouch!`,
            slap_self: 'Slapping yourself? That hurts!',
            wink: (user, target) => `😉 **${user}** winks at **${target}**!`,
            unknown: 'Unknown',
            congratulations: 'Congratulations'
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
        .setColor(type === 'fun' || type === 'marriage' ? 0xFF69B4 : (colors[type] || 0x5865F2))
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() });
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'fun' ? '🎮' : 'ℹ️';
    embed.setTitle(type === 'marriage' ? `💍 ${title}` : `${emoji} ${title}`);
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

module.exports = {
    category: 'Fun',
    subCommands: {
        
        // ========== BLOWJOB ==========
        blowjob: {
            aliases: ['bj'],
            description: 'Gibt jemandem einen Blowjob / Gives someone a blowjob',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'self_action', 'blowjob_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'blowjob', 'blowjob', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== BODYCOUNT ==========
        bodycount: {
            aliases: ['bc'],
            description: 'Zeigt deinen Bodycount / Shows your bodycount',
            category: 'Fun',
            async execute(message, args, { client }) {
                const count = Math.floor(Math.random() * 50);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'bodycount', 'bodycount', [message.author.username, count])] 
                });
            }
        },
        
        // ========== CHEAT ==========
        cheat: {
            aliases: ['fremdgehen'],
            description: 'Geht jemandem fremd / Cheats on someone',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'cheat', 'cheat', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== CRY ==========
        cry: {
            aliases: ['weinen'],
            description: 'Weint / Cries',
            category: 'Fun',
            async execute(message, args, { client }) {
                const cries = ['😭', '😢', '🥺', '😿', '💧'];
                const emoji = cries[Math.floor(Math.random() * cries.length)];
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'cry', 'cry', [message.author.username, emoji])] 
                });
            }
        },
        
        // ========== CUDDLE ==========
        cuddle: {
            aliases: ['kuscheln'],
            description: 'Kuschelt mit jemandem / Cuddles with someone',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'cuddle', 'cuddle', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== DIVORCE ==========
        divorce: {
            aliases: ['scheidung'],
            description: 'Lässt sich scheiden / Gets divorced',
            category: 'Fun',
            async execute(message, args, { client, supabase }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data: marriage } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!marriage) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'not_married', 'divorce_not_married')] 
                    });
                }
                
                await supabase.from('marriages').delete().eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                await supabase.from('marriages').delete().eq('guild_id', message.guild.id).eq('user_id', marriage.partner_id);
                
                const partner = await client.users.fetch(marriage.partner_id).catch(() => null);
                const partnerName = partner?.username || (lang === 'de' ? 'Unbekannt' : 'Unknown');
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'divorce', 'divorce_success', [message.author.username, partnerName])] 
                });
            }
        },
        
        // ========== FORTUNE ==========
        fortune: {
            aliases: ['cookie', 'glückskeks'],
            description: 'Öffnet einen Glückskeks / Opens a fortune cookie',
            category: 'Fun',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const fortunesDe = [
                    '🍀 Dir steht eine große Überraschung bevor!',
                    '🌟 Deine Zukunft sieht hell aus!',
                    '💰 Geld kommt bald zu dir!',
                    '❤️ Die Liebe klopft an deine Tür!',
                    '🎉 Ein Fest erwartet dich!',
                    '😴 Du solltest mehr schlafen...',
                    '🍕 Pizza ist die Antwort auf alles!'
                ];
                
                const fortunesEn = [
                    '🍀 A big surprise is waiting for you!',
                    '🌟 Your future looks bright!',
                    '💰 Money is coming your way!',
                    '❤️ Love is knocking at your door!',
                    '🎉 A celebration awaits you!',
                    '😴 You should sleep more...',
                    '🍕 Pizza is the answer to everything!'
                ];
                
                const fortunes = lang === 'de' ? fortunesDe : fortunesEn;
                const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'info', 'fortune', 'fortune', [fortune])] 
                });
            }
        },
        
        // ========== HANDHOLD ==========
        handhold: {
            aliases: ['händchenhalten'],
            description: 'Hält Händchen / Holds hands',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'handhold', 'handhold', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== HIGHFIVE ==========
        highfive: {
            aliases: ['hf'],
            description: 'Gibt einen Highfive / Gives a highfive',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'highfive', 'highfive', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== HUG ==========
        hug: {
            aliases: ['umarmen'],
            description: 'Umarmt jemanden / Hugs someone',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'hug', 'hug', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== IMPOSTER-START ==========
        'imposter-start': {
            aliases: ['amongus-start', 'imposter'],
            description: 'Startet eine Imposter-Runde / Starts an Imposter game',
            category: 'Fun',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                message.client.imposterGame = message.client.imposterGame || new Map();
                
                if (message.client.imposterGame.has(message.channel.id)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'game_running', 'imposter_running')] 
                    });
                }
                
                message.client.imposterGame.set(message.channel.id, {
                    players: new Set([message.author.id]),
                    imposters: new Set(),
                    started: false,
                    host: message.author.id
                });
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'game_started', 'imposter_started', [message.author.username])] 
                });
            }
        },
        
        // ========== IMPOSTER-STOP ==========
        'imposter-stop': {
            aliases: ['amongus-stop'],
            description: 'Beendet Imposter-Runde / Ends Imposter game',
            category: 'Fun',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                message.client.imposterGame = message.client.imposterGame || new Map();
                
                if (!message.client.imposterGame.has(message.channel.id)) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_game', 'imposter_not_running')] 
                    });
                }
                
                message.client.imposterGame.delete(message.channel.id);
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'game_ended', 'imposter_ended')] 
                });
            }
        },
        
        // ========== IMPOSTER-VOTE ==========
        'imposter-vote': {
            aliases: ['amongus-vote', 'vote'],
            description: 'Votet einen Spieler raus / Votes a player out',
            category: 'Fun',
            async execute(message, args, { client }) {
                const lang = client.languages?.get(message.guild.id) || 'de';
                const game = message.client.imposterGame?.get(message.channel.id);
                
                if (!game) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_game', 'imposter_not_running')] 
                    });
                }
                
                const target = message.mentions.users.first();
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                const isImposter = Math.random() < 0.3;
                
                if (isImposter) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'success', 'caught', 'imposter_caught', [target.username])] 
                    });
                } else {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'innocent', 'imposter_innocent', [target.username])] 
                    });
                }
            }
        },
        
        // ========== KISS ==========
        kiss: {
            aliases: ['küssen'],
            description: 'Küsst jemanden / Kisses someone',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'self_action', 'kiss_self')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'kiss', 'kiss', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== LICK ==========
        lick: {
            aliases: ['lecken'],
            description: 'Leckt jemanden / Licks someone',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'lick', 'lick', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== MARRY ==========
        marry: {
            aliases: ['heiraten'],
            description: 'Macht einen Heiratsantrag / Proposes marriage',
            category: 'Fun',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'marry_usage')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'self_action', 'marry_self')] 
                    });
                }
                
                if (target.bot) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'self_action', 'marry_bot')] 
                    });
                }
                
                const { data: authorMarried } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (authorMarried) {
                    const partner = await client.users.fetch(authorMarried.partner_id).catch(() => null);
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'already_married', 'marry_already', [partner?.username || (lang === 'de' ? 'jemandem' : 'someone')])] 
                    });
                }
                
                const { data: targetMarried } = await supabase
                    .from('marriages')
                    .select('partner_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (targetMarried) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'already_married', 'marry_target_already', [target.username])] 
                    });
                }
                
                const { data: existingRequest } = await supabase
                    .from('marriage_requests')
                    .select('id')
                    .eq('guild_id', message.guild.id)
                    .eq('from_user', message.author.id)
                    .eq('to_user', target.id)
                    .single();
                
                if (existingRequest) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'request_exists', 'marry_request_exists', [target.username])] 
                    });
                }
                
                await supabase.from('marriage_requests').insert({
                    guild_id: message.guild.id,
                    from_user: message.author.id,
                    to_user: target.id
                });
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`marry_accept_${message.author.id}`)
                            .setLabel(lang === 'de' ? '✅ Ja, ich will!' : '✅ Yes, I do!')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('💍'),
                        new ButtonBuilder()
                            .setCustomId(`marry_reject_${message.author.id}`)
                            .setLabel(lang === 'de' ? '❌ Nein' : '❌ No')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('💔')
                    );
                
                const proposalEmbed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? '💍 Heiratsantrag!' : '💍 Marriage Proposal!')
                    .setDescription(lang === 'de' 
                        ? `**${message.author.username}** möchte **${target.username}** heiraten!\n\n${target}, willst du?`
                        : `**${message.author.username}** wants to marry **${target.username}**!\n\n${target}, do you accept?`)
                    .setFooter({ text: lang === 'de' ? 'Antwort mit den Buttons unten!' : 'Answer with the buttons below!' })
                    .setTimestamp();
                
                await message.reply({ 
                    content: `${target}`,
                    embeds: [proposalEmbed], 
                    components: [row] 
                });
                
                const filter = i => i.user.id === target.id;
                const collector = message.channel.createMessageComponentCollector({ filter, time: 60000, max: 1 });
                
                collector.on('collect', async (interaction) => {
                    const isAccept = interaction.customId.startsWith('marry_accept');
                    
                    await supabase.from('marriage_requests')
                        .delete()
                        .eq('guild_id', message.guild.id)
                        .eq('from_user', message.author.id)
                        .eq('to_user', target.id);
                    
                    if (isAccept) {
                        await supabase.from('marriages').insert([
                            { guild_id: message.guild.id, user_id: message.author.id, partner_id: target.id },
                            { guild_id: message.guild.id, user_id: target.id, partner_id: message.author.id }
                        ]);
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(0xFF69B4)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle(lang === 'de' ? '💒 Verheiratet!' : '💒 Married!')
                            .setDescription(lang === 'de' 
                                ? `🎉 **${message.author.username}** und **${target.username}** sind jetzt verheiratet!\nAlles Gute für die Zukunft! 💕`
                                : `🎉 **${message.author.username}** and **${target.username}** are now married!\nBest wishes for the future! 💕`)
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [successEmbed], components: [] });
                        await message.channel.send({ 
                            content: lang === 'de' 
                                ? `🎊 Glückwunsch ${message.author} & ${target}! 🎊`
                                : `🎊 Congratulations ${message.author} & ${target}! 🎊`
                        });
                        
                    } else {
                        const rejectEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle(lang === 'de' ? '💔 Antrag abgelehnt' : '💔 Proposal Rejected')
                            .setDescription(lang === 'de' 
                                ? `**${target.username}** hat den Antrag von **${message.author.username}** abgelehnt... 😢`
                                : `**${target.username}** rejected **${message.author.username}**'s proposal... 😢`)
                            .setTimestamp();
                        
                        await interaction.update({ embeds: [rejectEmbed], components: [] });
                    }
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        await supabase.from('marriage_requests')
                            .delete()
                            .eq('guild_id', message.guild.id)
                            .eq('from_user', message.author.id)
                            .eq('to_user', target.id);
                        
                        const timeoutEmbed = new EmbedBuilder()
                            .setColor(0x808080)
                            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                            .setTitle(lang === 'de' ? '⏰ Antrag abgelaufen' : '⏰ Proposal Expired')
                            .setDescription(lang === 'de' 
                                ? `**${target.username}** hat nicht rechtzeitig geantwortet...`
                                : `**${target.username}** didn't respond in time...`)
                            .setTimestamp();
                        
                        await message.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                    }
                });
            }
        },
        
        // ========== MARRYSTATUS ==========
        marrystatus: {
            aliases: ['beziehungsstatus', 'status', 'relationship'],
            description: 'Zeigt deinen Beziehungsstatus / Shows your relationship status',
            category: 'Fun',
            async execute(message, args, { client, supabase }) {
                const target = message.mentions.users.first() || message.author;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                const { data: marriage } = await supabase
                    .from('marriages')
                    .select('partner_id, married_at')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                let status = lang === 'de' ? '❤️ Single' : '❤️ Single';
                let partner = null;
                let marriedAt = null;
                
                if (marriage) {
                    status = lang === 'de' ? '💍 Verheiratet' : '💍 Married';
                    partner = await client.users.fetch(marriage.partner_id).catch(() => null);
                    marriedAt = marriage.married_at;
                }
                
                const { data: pendingFrom } = await supabase
                    .from('marriage_requests')
                    .select('from_user')
                    .eq('guild_id', message.guild.id)
                    .eq('to_user', target.id)
                    .single();
                
                const { data: pendingTo } = await supabase
                    .from('marriage_requests')
                    .select('to_user')
                    .eq('guild_id', message.guild.id)
                    .eq('from_user', target.id)
                    .single();
                
                let pendingText = '';
                if (pendingFrom) {
                    const fromUser = await client.users.fetch(pendingFrom.from_user).catch(() => null);
                    pendingText = lang === 'de' 
                        ? `\n💌 Hat einen Antrag von **${fromUser?.username || 'Unbekannt'}** erhalten!`
                        : `\n💌 Received a proposal from **${fromUser?.username || 'Unknown'}**!`;
                } else if (pendingTo) {
                    const toUser = await client.users.fetch(pendingTo.to_user).catch(() => null);
                    pendingText = lang === 'de'
                        ? `\n💌 Hat **${toUser?.username || 'Unbekannt'}** einen Antrag gemacht!`
                        : `\n💌 Proposed to **${toUser?.username || 'Unknown'}**!`;
                }
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(lang === 'de' ? `💕 Beziehungsstatus von ${target.username}` : `💕 Relationship Status of ${target.username}`)
                    .setDescription(`**${status}**${pendingText}`)
                    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                if (partner) {
                    embed.addFields([
                        { name: lang === 'de' ? '💑 Partner' : '💑 Partner', value: `${partner.username}`, inline: true },
                        { name: lang === 'de' ? '📅 Verheiratet seit' : '📅 Married since', value: `<t:${Math.floor(new Date(marriedAt).getTime() / 1000)}:D>`, inline: true }
                    ]);
                    embed.setThumbnail(partner.displayAvatarURL({ dynamic: true }));
                }
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== PP ==========
        pp: {
            aliases: ['penis'],
            description: 'Misst die PP-Größe / Measures PP size',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first() || message.author;
                const size = Math.floor(Math.random() * 20) + 1;
                const bar = '='.repeat(size) + '>' + ' '.repeat(20 - size);
                
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`🍆 PP von ${target.username}`)
                    .setDescription(`**${size}cm**\n\`${bar}\``)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SHIP ==========
        ship: {
            aliases: ['shippen'],
            description: 'Shippt zwei User / Ships two users',
            category: 'Fun',
            async execute(message, args, { client }) {
                const user1 = message.mentions.users.first() || message.author;
                const user2 = message.mentions.users.last() || message.author;
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (user1.id === user2.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'self_action', 'ship_self')] 
                    });
                }
                
                const percentage = Math.floor(Math.random() * 101);
                let rating = '';
                let emoji = '';
                
                if (percentage < 20) { 
                    rating = lang === 'de' ? 'Keine Chance...' : 'No chance...'; 
                    emoji = '💔'; 
                } else if (percentage < 40) { 
                    rating = lang === 'de' ? 'Schwierig...' : 'Difficult...'; 
                    emoji = '😕'; 
                } else if (percentage < 60) { 
                    rating = lang === 'de' ? 'Könnte klappen!' : 'Could work!'; 
                    emoji = '🤔'; 
                } else if (percentage < 80) { 
                    rating = lang === 'de' ? 'Gute Kombi!' : 'Good combo!'; 
                    emoji = '💕'; 
                } else { 
                    rating = lang === 'de' ? 'PERFEKTES PAAR!' : 'PERFECT MATCH!'; 
                    emoji = '💘'; 
                }
                
                const combinedName = user1.username.slice(0, Math.floor(user1.username.length / 2)) + 
                                    user2.username.slice(Math.floor(user2.username.length / 2));
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTitle(`${emoji} Ship: ${user1.username} ❤️ ${user2.username}`)
                    .setDescription(`**${combinedName}**\n\n**${percentage}%** - ${rating}`)
                    .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                return message.reply({ embeds: [embed] });
            }
        },
        
        // ========== SLAP ==========
        slap: {
            aliases: ['ohrfeige', 'schlagen'],
            description: 'Schlägt jemanden / Slaps someone',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                const lang = client.languages?.get(message.guild.id) || 'de';
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                if (target.id === message.author.id) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'self_action', 'slap_self')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'slap', 'slap', [message.author.username, target.username])] 
                });
            }
        },
        
        // ========== WINK ==========
        wink: {
            aliases: ['zwinkern'],
            description: 'Zwinkert jemandem zu / Winks at someone',
            category: 'Fun',
            async execute(message, args, { client }) {
                const target = message.mentions.users.first();
                
                if (!target) {
                    return message.reply({ 
                        embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'error', 'no_user', 'blowjob_usage')] 
                    });
                }
                
                return message.reply({ 
                    embeds: [await buildEmbed(client, message.guild.id, message.author.id, 'fun', 'wink', 'wink', [message.author.username, target.username])] 
                });
            }
        }
    }
};
