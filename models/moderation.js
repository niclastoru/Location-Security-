module.exports = {
    async execute(message, args, command, { client, supabase, embed }) {
        
        // Permission Check
        const permissions = {
            ban: 'BanMembers',
            kick: 'KickMembers',
            role: 'ManageRoles',
            r: 'ManageRoles',
            purge: 'ManageMessages',
            lock: 'ManageChannels',
            unlock: 'ManageChannels'
        };
        
        if (permissions[command] && !message.member.permissions.has(permissions[command])) {
            return message.reply({ embeds: [embed.error('Keine Rechte', 'Du hast nicht die benötigten Berechtigungen!')] });
        }
        
        // ========== BAN ==========
        if (command === 'ban') {
            const target = message.mentions.members.first();
            if (!target) return message.reply({ embeds: [embed.error('Kein User', '!ban @User [Grund]')] });
            if (!target.bannable) return message.reply({ embeds: [embed.error('Keine Rechte', 'Ich kann diesen User nicht bannen!')] });
            
            const reason = args.slice(1).join(' ') || 'Kein Grund';
            await target.ban({ reason });
            return message.reply({ embeds: [embed.success('User gebannt', `${target.user.tag} wurde gebannt.\n**Grund:** ${reason}`)] });
        }
        
        // ========== KICK ==========
        if (command === 'kick') {
            const target = message.mentions.members.first();
            if (!target) return message.reply({ embeds: [embed.error('Kein User', '!kick @User [Grund]')] });
            if (!target.kickable) return message.reply({ embeds: [embed.error('Keine Rechte', 'Ich kann diesen User nicht kicken!')] });
            
            const reason = args.slice(1).join(' ') || 'Kein Grund';
            await target.kick(reason);
            return message.reply({ embeds: [embed.success('User gekickt', `${target.user.tag} wurde gekickt.\n**Grund:** ${reason}`)] });
        }
        
        // ========== ROLE (alias: r) ==========
        if (command === 'role' || command === 'r') {
            if (args.length < 2) {
                return message.reply({ embeds: [embed.error('Falsche Nutzung', '`!role <add/remove> @User <Rollenname>`\nAlias: `!r add @User Member`')] });
            }
            
            const action = args[0].toLowerCase();
            const target = message.mentions.members.first();
            
            if (!target) return message.reply({ embeds: [embed.error('Kein User', 'Bitte erwähne einen gültigen User!')] });
            if (action !== 'add' && action !== 'remove') {
                return message.reply({ embeds: [embed.error('Falsche Aktion', 'Nutze `add` oder `remove`!')] });
            }
            
            const roleName = args.slice(2).join(' ');
            if (!roleName) return message.reply({ embeds: [embed.error('Keine Rolle', 'Bitte gib einen Rollennamen an!')] });
            
            const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
            if (!role) return message.reply({ embeds: [embed.error('Rolle nicht gefunden', `Keine Rolle mit dem Namen "${roleName}" gefunden.`)] });
            
            if (role.position >= message.guild.members.me.roles.highest.position) {
                return message.reply({ embeds: [embed.error('Keine Rechte', 'Ich kann diese Rolle nicht verwalten (zu hoch)!')] });
            }
            
            if (role.position >= message.member.roles.highest.position) {
                return message.reply({ embeds: [embed.error('Keine Rechte', 'Du kannst diese Rolle nicht verwalten (zu hoch)!')] });
            }
            
            if (action === 'add') {
                if (target.roles.cache.has(role.id)) {
                    return message.reply({ embeds: [{ color: 0x0099FF, title: 'ℹ️ Bereits vorhanden', description: `${target} hat die Rolle ${role} bereits.` }] });
                }
                await target.roles.add(role);
                return message.reply({ embeds: [embed.success('Rolle hinzugefügt', `${target} hat jetzt die Rolle ${role}`)] });
            } else {
                if (!target.roles.cache.has(role.id)) {
                    return message.reply({ embeds: [{ color: 0x0099FF, title: 'ℹ️ Nicht vorhanden', description: `${target} hat die Rolle ${role} nicht.` }] });
                }
                await target.roles.remove(role);
                return message.reply({ embeds: [embed.success('Rolle entfernt', `Die Rolle ${role} wurde von ${target} entfernt.`)] });
            }
        }
        
        // ========== PURGE ==========
        if (command === 'purge') {
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) {
                return message.reply({ embeds: [embed.error('Ungültige Anzahl', 'Bitte gib eine Zahl zwischen 1 und 100 an!')] });
            }
            
            const deleted = await message.channel.bulkDelete(amount, true);
            const msg = await message.channel.send({ embeds: [embed.success('Nachrichten gelöscht', `${deleted.size} Nachrichten wurden gelöscht.`)] });
            setTimeout(() => msg.delete(), 3000);
            return;
        }
        
        // ========== LOCK ==========
        if (command === 'lock') {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            return message.reply({ embeds: [embed.success('Channel gesperrt', `${message.channel} wurde für @everyone gesperrt.`)] });
        }
        
        // ========== UNLOCK ==========
        if (command === 'unlock') {
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
            return message.reply({ embeds: [embed.success('Channel entsperrt', `${message.channel} wurde für @everyone entsperrt.`)] });
        }
    }
};
