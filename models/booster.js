module.exports = {
    category: 'Booster',
    subCommands: {
        
        // ========== BR (Übersicht) ==========
        br: {
            aliases: ['boosterrole'],
            description: 'Booster-Role Übersicht',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: settings } = await supabase
                    .from('booster_settings')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                const { data: roles } = await supabase
                    .from('booster_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id);
                
                const status = settings?.enabled ? '🟢 Aktiviert' : '🔴 Deaktiviert';
                const baseRole = settings?.base_role_id ? `<@&${settings.base_role_id}>` : '❌ Nicht gesetzt';
                const roleCount = roles?.length || 0;
                
                return message.reply({ embeds: [{
                    color: 0xFF73FA,
                    title: '🚀 Booster Rollen System',
                    fields: [
                        { name: 'Status', value: status, inline: true },
                        { name: 'Base-Rolle', value: baseRole, inline: true },
                        { name: 'Erstellte Rollen', value: `${roleCount}`, inline: true }
                    ],
                    footer: { text: '!help booster für alle Befehle' }
                }] });
            }
        },
        
        // ========== _BOOSTERS_DISABLED ==========
        _boosters_disabled: {
            aliases: ['br-disable', 'br-off'],
            permissions: 'Administrator',
            description: 'Deaktiviert Booster-Rollen',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                await supabase.from('booster_settings').upsert({
                    guild_id: message.guild.id,
                    enabled: false
                });
                
                return message.reply({ embeds: [global.embed.success('Deaktiviert', 'Booster-Rollen wurden deaktiviert.')] });
            }
        },
        
        // ========== BR-BASE ==========
        'br-base': {
            aliases: ['br-setbase'],
            permissions: 'Administrator',
            description: 'Setzt Base-Rolle für Booster',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const role = message.mentions.roles.first();
                if (!role) return message.reply({ embeds: [global.embed.error('Keine Rolle', '!br-base @Rolle')] });
                
                await supabase.from('booster_settings').upsert({
                    guild_id: message.guild.id,
                    base_role_id: role.id,
                    enabled: true
                });
                
                // Base-Rolle allen Booster-Rollen-Inhabern geben
                const { data: boosterRoles } = await supabase
                    .from('booster_roles')
                    .select('user_id')
                    .eq('guild_id', message.guild.id);
                
                if (boosterRoles) {
                    for (const br of boosterRoles) {
                        const member = await message.guild.members.fetch(br.user_id).catch(() => null);
                        if (member) await member.roles.add(role).catch(() => {});
                    }
                }
                
                return message.reply({ embeds: [global.embed.success('Base-Rolle gesetzt', `${role} ist jetzt die Booster-Base-Rolle.`)] });
            }
        },
        
        // ========== BR-COLOR ==========
        'br-color': {
            aliases: ['br-setcolor'],
            description: 'Ändert Farbe deiner Booster-Rolle',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                // Prüfen ob User Booster ist
                if (!message.member.premiumSince && !message.member.roles.cache.some(r => r.name.includes('Booster'))) {
                    return message.reply({ embeds: [global.embed.error('Kein Booster', 'Nur Server-Booster können diesen Befehl nutzen!')] });
                }
                
                const color = args[0]?.replace('#', '').toUpperCase();
                if (!color || !/^[0-9A-F]{6}$/i.test(color)) {
                    return message.reply({ embeds: [global.embed.error('Ungültige Farbe', '!br-color <Hex>\nBeispiel: !br-color FF73FA')] });
                }
                
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (existing) {
                    // Rolle updaten
                    const role = message.guild.roles.cache.get(existing.role_id);
                    if (role) {
                        await role.setColor(`#${color}`).catch(() => {});
                    }
                    
                    await supabase.from('booster_roles').update({
                        role_color: `#${color}`
                    }).eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                }
                
                return message.reply({ embeds: [global.embed.success('Farbe geändert', `Deine Booster-Rolle hat jetzt die Farbe #${color}`)] });
            }
        },
        
        // ========== BR-CREATE ==========
        'br-create': {
            aliases: ['br-make'],
            description: 'Erstellt deine Booster-Rolle',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                // Prüfen ob User Booster ist
                if (!message.member.premiumSince && !message.member.roles.cache.some(r => r.tags?.premiumSubscriberRole)) {
                    return message.reply({ embeds: [global.embed.error('Kein Booster', 'Nur Server-Booster können diesen Befehl nutzen!')] });
                }
                
                // Prüfen ob bereits Rolle existiert
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (existing) {
                    return message.reply({ embeds: [global.embed.error('Bereits erstellt', 'Du hast bereits eine Booster-Rolle!')] });
                }
                
                const roleName = args.join(' ') || `${message.author.username}'s Rolle`;
                
                // Rolle erstellen
                const role = await message.guild.roles.create({
                    name: roleName,
                    color: 0xFF73FA,
                    position: message.guild.members.me.roles.highest.position - 1,
                    reason: `Booster-Rolle für ${message.author.tag}`
                });
                
                // User die Rolle geben
                await message.member.roles.add(role);
                
                // Base-Rolle geben falls vorhanden
                const { data: settings } = await supabase
                    .from('booster_settings')
                    .select('base_role_id')
                    .eq('guild_id', message.guild.id)
                    .single();
                
                if (settings?.base_role_id) {
                    const baseRole = message.guild.roles.cache.get(settings.base_role_id);
                    if (baseRole) await message.member.roles.add(baseRole).catch(() => {});
                }
                
                // In DB speichern
                await supabase.from('booster_roles').insert({
                    guild_id: message.guild.id,
                    user_id: message.author.id,
                    role_id: role.id,
                    role_name: roleName,
                    role_color: '#FF73FA'
                });
                
                return message.reply({ embeds: [global.embed.success('Rolle erstellt', `${role} wurde erstellt und dir zugewiesen!`)] });
            }
        },
        
        // ========== BR-ICON ==========
        'br-icon': {
            aliases: ['br-seticon'],
            description: 'Setzt Icon für deine Booster-Rolle',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ embeds: [global.embed.error('Keine Rolle', 'Erstelle erst eine Rolle mit `!br-create`!')] });
                }
                
                const emoji = args[0];
                const attachment = message.attachments.first();
                
                let icon;
                if (emoji) {
                    const emojiMatch = emoji.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
                    if (emojiMatch) {
                        icon = `https://cdn.discordapp.com/emojis/${emojiMatch[3]}.${emojiMatch[1] ? 'gif' : 'png'}`;
                    }
                } else if (attachment) {
                    icon = attachment.url;
                }
                
                if (!icon) {
                    return message.reply({ embeds: [global.embed.error('Kein Icon', '!br-icon <Emoji> oder Bild anhängen')] });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) {
                    await role.setIcon(icon).catch(() => {
                        return message.reply({ embeds: [global.embed.error('Fehler', 'Icon konnte nicht gesetzt werden! (Server benötigt Boost Level 2)')] });
                    });
                }
                
                await supabase.from('booster_roles').update({
                    role_icon: icon
                }).eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                
                return message.reply({ embeds: [global.embed.success('Icon gesetzt', 'Deine Booster-Rolle hat jetzt ein Icon!')] });
            }
        },
        
        // ========== BR-LEAVE ==========
        'br-leave': {
            aliases: ['br-delete', 'br-remove'],
            description: 'Löscht deine Booster-Rolle',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ embeds: [global.embed.error('Keine Rolle', 'Du hast keine Booster-Rolle!')] });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) await role.delete().catch(() => {});
                
                await supabase.from('booster_roles')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id);
                
                await supabase.from('booster_shares')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id);
                
                return message.reply({ embeds: [global.embed.success('Rolle gelöscht', 'Deine Booster-Rolle wurde gelöscht.')] });
            }
        },
        
        // ========== BR-REMOVE (Admin) ==========
        'br-remove': {
            aliases: ['br-deleteadmin'],
            permissions: 'ManageRoles',
            description: 'Löscht Booster-Rolle eines Users',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!br-remove @User')] });
                
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ embeds: [global.embed.error('Keine Rolle', `${target} hat keine Booster-Rolle!')] });
                }
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) await role.delete().catch(() => {});
                
                await supabase.from('booster_roles')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', target.id);
                
                return message.reply({ embeds: [global.embed.success('Rolle gelöscht', `Booster-Rolle von ${target} wurde gelöscht.`)] });
            }
        },
        
        // ========== BR-RENAME ==========
        'br-rename': {
            aliases: ['br-name'],
            description: 'Benennt deine Booster-Rolle um',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ embeds: [global.embed.error('Keine Rolle', 'Du hast keine Booster-Rolle!')] });
                }
                
                const newName = args.join(' ');
                if (!newName) return message.reply({ embeds: [global.embed.error('Kein Name', '!br-rename <Neuer Name>')] });
                
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) await role.setName(newName).catch(() => {});
                
                await supabase.from('booster_roles').update({
                    role_name: newName
                }).eq('guild_id', message.guild.id).eq('user_id', message.author.id);
                
                return message.reply({ embeds: [global.embed.success('Umbenannt', `Deine Rolle heißt jetzt **${newName}**`)] });
            }
        },
        
        // ========== BR-SHARE ==========
        'br-share': {
            aliases: ['br-give'],
            description: 'Teilt deine Booster-Rolle',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ embeds: [global.embed.error('Keine Rolle', 'Du hast keine Booster-Rolle!')] });
                }
                
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!br-share @User')] });
                if (target.id === message.author.id) return message.reply({ embeds: [global.embed.error('Echt jetzt?', 'Du kannst die Rolle nicht mit dir selbst teilen!')] });
                
                // Prüfen ob bereits geteilt
                const { data: shared } = await supabase
                    .from('booster_shares')
                    .select('*')
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id)
                    .eq('shared_with', target.id)
                    .single();
                
                if (shared) {
                    return message.reply({ embeds: [global.embed.error('Bereits geteilt', `Du teilst die Rolle bereits mit ${target}!')] });
                }
                
                await supabase.from('booster_shares').insert({
                    guild_id: message.guild.id,
                    owner_id: message.author.id,
                    shared_with: target.id
                });
                
                // Rolle geben
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) {
                    const member = await message.guild.members.fetch(target.id).catch(() => null);
                    if (member) await member.roles.add(role).catch(() => {});
                }
                
                return message.reply({ embeds: [global.embed.success('Rolle geteilt', `${target} hat jetzt deine Booster-Rolle!`)] });
            }
        },
        
        // ========== BR-SHARES ==========
        'br-shares': {
            aliases: ['br-shared'],
            description: 'Zeigt mit wem du deine Rolle teilst',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: shares } = await supabase
                    .from('booster_shares')
                    .select('shared_with')
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id);
                
                if (!shares || shares.length === 0) {
                    return message.reply({ embeds: [global.embed.info('Keine Shares', 'Du teilst deine Rolle mit niemandem.')] });
                }
                
                const sharedList = shares.map(s => `<@${s.shared_with}>`).join('\n');
                
                return message.reply({ embeds: [{
                    color: 0xFF73FA,
                    title: '🤝 Geteilte Booster-Rolle',
                    description: sharedList,
                    footer: { text: `${shares.length} User` }
                }] });
            }
        },
        
        // ========== BR-UNSHARE ==========
        'br-unshare': {
            aliases: ['br-remove-share'],
            description: 'Entfernt geteilte Rolle',
            category: 'Booster',
            async execute(message, args, { supabase }) {
                const { data: existing } = await supabase
                    .from('booster_roles')
                    .select('role_id')
                    .eq('guild_id', message.guild.id)
                    .eq('user_id', message.author.id)
                    .single();
                
                if (!existing) {
                    return message.reply({ embeds: [global.embed.error('Keine Rolle', 'Du hast keine Booster-Rolle!')] });
                }
                
                const target = message.mentions.users.first();
                if (!target) return message.reply({ embeds: [global.embed.error('Kein User', '!br-unshare @User')] });
                
                await supabase.from('booster_shares')
                    .delete()
                    .eq('guild_id', message.guild.id)
                    .eq('owner_id', message.author.id)
                    .eq('shared_with', target.id);
                
                // Rolle entfernen
                const role = message.guild.roles.cache.get(existing.role_id);
                if (role) {
                    const member = await message.guild.members.fetch(target.id).catch(() => null);
                    if (member) await member.roles.remove(role).catch(() => {});
                }
                
                return message.reply({ embeds: [global.embed.success('Share entfernt', `${target} hat deine Rolle nicht mehr.`)] });
            }
        }
    }
};

// ========== BOOSTER EVENT HANDLER ==========
async function handleBoosterUpdate(oldMember, newMember, supabase) {
    // Booster hinzugefügt
    if (!oldMember.premiumSince && newMember.premiumSince) {
        // Automatisch Rolle erstellen?
        const { data: settings } = await supabase
            .from('booster_settings')
            .select('*')
            .eq('guild_id', newMember.guild.id)
            .single();
        
        if (settings?.enabled) {
            // Base-Rolle geben
            if (settings.base_role_id) {
                const baseRole = newMember.guild.roles.cache.get(settings.base_role_id);
                if (baseRole) await newMember.roles.add(baseRole).catch(() => {});
            }
        }
    }
    
    // Booster entfernt
    if (oldMember.premiumSince && !newMember.premiumSince) {
        const { data: boosterRole } = await supabase
            .from('booster_roles')
            .select('role_id')
            .eq('guild_id', newMember.guild.id)
            .eq('user_id', newMember.id)
            .single();
        
        if (boosterRole) {
            // Optional: Rolle löschen oder nur entfernen
            const role = newMember.guild.roles.cache.get(boosterRole.role_id);
            if (role) {
                // Rolle von allen entfernen
                for (const [id, member] of role.members) {
                    await member.roles.remove(role).catch(() => {});
                }
                // Rolle löschen
                await role.delete().catch(() => {});
            }
            
            await supabase.from('booster_roles')
                .delete()
                .eq('guild_id', newMember.guild.id)
                .eq('user_id', newMember.id);
            
            await supabase.from('booster_shares')
                .delete()
                .eq('guild_id', newMember.guild.id)
                .eq('owner_id', newMember.id);
        }
        
        // Base-Rolle entfernen
        const { data: settings } = await supabase
            .from('booster_settings')
            .select('base_role_id')
            .eq('guild_id', newMember.guild.id)
            .single();
        
        if (settings?.base_role_id) {
            await newMember.roles.remove(settings.base_role_id).catch(() => {});
        }
    }
}

module.exports.handleBoosterUpdate = handleBoosterUpdate;
