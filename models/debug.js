module.exports = {
    name: 'debug',
    category: 'Developer',
    description: 'Debug command',
    async execute(message, args, { client }) {
        let cmdList = '';
        for (const [name, cmd] of client.commands) {
            if (cmd.category && !cmd.subCommands) {
                cmdList += `${name} (${cmd.category})\n`;
            }
        }
        await message.reply(`Commands found:\n\`\`\`\n${cmdList || 'None'}\n\`\`\``);
    }
};
