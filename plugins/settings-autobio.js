const axios = require('axios');
const config = require('../settings');
const { malvin } = require('../malvin');
const fs = require('fs');

let bioInterval;
const defaultBio = config.AUTO_BIO_TEXT || "⚡ MALVIN XD | Quote: {quote}";
const quoteApiUrl = config.QUOTE_API_URL || 'https://apis.davidcyriltech.my.id/random/quotes';
const updateInterval = config.AUTO_BIO_INTERVAL || 30 * 1000; // Default to 30 seconds

// Fallback quotes if API fails
const fallbackQuotes = [
    "Stay curious, keep learning!",
    "Dream big, work hard!",
    "The best is yet to come.",
    "Keep it real, always.",
    "Life is a journey, enjoy it!"
];

malvin({
    pattern: 'autobio',
    alias: ['autoabout'],
    desc: 'Toggle automatic bio updates with random quotes',
    category: 'misc',
    filename: __filename,
    usage: `${config.PREFIX}autobio [on/off] [text]`
}, async (malvin, mek, m, { args, reply, isOwner }) => {
    if (!isOwner) return reply("❌ ᴏɴʟʏ ᴛʜᴇ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ");

    const [action, ...bioParts] = args;
    const customBio = bioParts.join(' ') || defaultBio;

    try {
        if (action === 'on') {
            if (config.AUTO_BIO === "true") {
                return reply("ℹ️ ᴀᴜᴛᴏ-ʙɪᴏ ɪs ᴀʟʀᴇᴀᴅʏ ᴇɴᴀʙʟᴇᴅ");
            }

            config.AUTO_BIO = "true";
            config.AUTO_BIO_TEXT = customBio;
            // Optionally persist config
            // fs.writeFileSync('./settings.json', JSON.stringify(config, null, 2));

            startAutoBio(malvin, customBio);
            return reply(`✅ ᴀᴜᴛᴏ-ʙɪᴏ ᴇɴᴀʙʟᴇᴅ\nᴄᴜʀʀᴇɴᴛ ᴛᴇxᴛ: "${customBio}"`);

        } else if (action === 'off') {
            if (config.AUTO_BIO !== "true") {
                return reply("ℹ️ ᴀᴜᴛᴏ-ʙɪᴏ ɪs ᴀʟʀᴇᴀᴅʏ ᴅɪsᴀʙʟᴇᴅ");
            }

            config.AUTO_BIO = "false";
            stopAutoBio();
            // Optionally persist config
            // fs.writeFileSync('./settings.json', JSON.stringify(config, null, 2));
            return reply("✅ ᴀᴜᴛᴏ-ʙɪᴏ ᴅɪsᴀʙʟᴇᴅ");

        } else {
            return reply(
                `╭═✦〔 🤖 *ᴀᴜᴛᴏ-ʙɪᴏ* 〕✦═╮\n` +
                `│\n` +
                `│ 📜 *ᴜsᴀɢᴇ:*\n` +
                `│ ➸ ${config.PREFIX}autobio on [text] - ᴇɴᴀʙʟᴇ ᴡɪᴛʜ ᴄᴜsᴛᴏᴍ ᴛᴇxᴛ\n` +
                `│ ➸ ${config.PREFIX}autobio off - ᴅɪsᴀʙʟᴇ ᴀᴜᴛᴏ-ʙɪᴏ\n` +
                `│\n` +
                `│ 🔖 *ᴘʟᴀᴄᴇʜᴏʟᴅᴇʀs:*\n` +
                `│ ➸ {quote} - ʀᴀɴᴅᴏᴍ ᴏᴜᴏᴛᴇ\n` +
                `│\n` +
                `│ 💡 *sᴛᴀᴛᴜs:* ${config.AUTO_BIO === "true" ? 'ON' : 'OFF'}\n` +
                `│ 📝 *ᴛᴇxᴛ:* "${config.AUTO_BIO_TEXT || defaultBio}"\n` +
                `╰═⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬═╯`
            );
        }
    } catch (error) {
        console.error('❌ Auto-bio error:', error.message);
        return reply("❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴜᴘᴅᴀᴛᴇ ᴀᴜᴛᴏ-ʙɪᴏ sᴇᴛᴛɪɴɢs");
    }
});

// Fetch random quote
async function fetchQuote() {
    try {
        const response = await axios.get(quoteApiUrl);
        if (response.status === 200 && response.data.content) {
            return response.data.content;
        }
        throw new Error('Invalid quote API response');
    } catch (error) {
        console.error('Quote fetch error:', error.message);
        return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    }
}

// Start auto-bio updates
async function startAutoBio(malvin, bioText) {
    stopAutoBio();

    bioInterval = setInterval(async () => {
        try {
            const quote = await fetchQuote();
            const formattedBio = bioText.replace('{quote}', quote);
            await malvin.updateProfileStatus(formattedBio);
        } catch (error) {
            console.error('❌ Bio update error:', error.message);
            setTimeout(async () => {
                try {
                    const quote = await fetchQuote();
                    const formattedBio = bioText.replace('{quote}', quote);
                    await malvin.updateProfileStatus(formattedBio);
                } catch (retryError) {
                    console.error('❌ Bio retry error:', retryError.message);
                    stopAutoBio();
                }
            }, 5000);
        }
    }, updateInterval);
}

// Stop auto-bio updates
function stopAutoBio() {
    if (bioInterval) {
        clearInterval(bioInterval);
        bioInterval = null;
    }
}

// Initialize auto-bio if enabled
module.exports.init = (malvin) => {
    if (config.AUTO_BIO === "true") {
        const bioText = config.AUTO_BIO_TEXT || defaultBio;
        startAutoBio(malvin, bioText);
    }
};