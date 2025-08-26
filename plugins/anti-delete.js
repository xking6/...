const { malvin } = require('../malvin');
const config = require('../settings');
const fsSync = require('fs');

malvin({
    pattern: "antidelete",
    alias: ['antidel', 'ad'],
    desc: "Toggle anti-delete feature",
    category: "misc",
    filename: __filename
},
async (malvin, mek, m, { from, reply, text, isCreator }) => {
    if (!isCreator) return reply('This command is only for the bot owner');
    
    try {
        // Current status from config
        const currentStatus = config.ANTI_DELETE === "true";
        
        if (!text || text.toLowerCase() === 'status') {
            return reply(`*AntiDelete Status:* ${currentStatus ? '✅ ON' : '❌ OFF'}\n\nUsage:\n• .antidelete on - Enable\n• .antidelete off - Disable`);
        }
        
        const action = text.toLowerCase().trim();
        
        if (action === 'on') {
            config.ANTI_DELETE = "true";
            // Optionally, persist the change to settings.js if needed
            // Note: This requires write access to settings.js
            // await fsSync.writeFileSync('./settings.js', `module.exports = ${JSON.stringify(config, null, 2)};`);
            return reply('✅ Anti-delete has been enabled');
        } 
        else if (action === 'off') {
            config.ANTI_DELETE = "false";
            // Optionally, persist the change to settings.js
            // await fsSync.writeFileSync('./settings.js', `module.exports = ${JSON.stringify(config, null, 2)};`);
            return reply('❌ Anti-delete has been disabled');
        } 
        else {
            return reply('Invalid command. Usage:\n• .antidelete on\n• .antidelete off\n• .antidelete status');
        }
    } catch (e) {
        console.error("Error in antidelete command:", e);
        return reply("An error occurred while processing your request.");
    }
});