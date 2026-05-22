module.exports = {
    name: 'debug',
    category: 'Developer',
    description: 'Debug command',
    async execute(message, args, { client }) {
        let output = '=== COMMAND DEBUG ===\n';
        output += `Total commands: ${client.commands.size}\n\n`;
        
        let categories = new Set();
        
        for (const [cmdName, cmdData] of client.commands) {
            output += `📌 ${cmdName}\n`;
            output += `   ├─ Type: ${typeof cmdData}\n`;
            output += `   ├─ Category: ${cmdData.category || 'undefined'}\n`;
            output += `   ├─ Has subCommands: ${!!cmdData.subCommands}\n`;
            output += `   └─ Description: ${cmdData.description || 'undefined'}\n\n`;
            
            if (cmdData.category) {
                categories.add(cmdData.category);
            }
        }
        
        output += `\n=== CATEGORIES ===\n`;
        output += Array.from(categories).join(', ');
        
        // Aufteilen falls zu lang
        if (output.length > 1900) {
            const parts = output.match(/.{1,1900}/g);
            for (const part of parts) {
                await message.reply(`\`\`\`\n${part}\n\`\`\``);
            }
        } else {
            await message.reply(`\`\`\`\n${output}\n\`\`\``);
        }
    }
};
