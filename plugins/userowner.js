const { malvin } = require('../malvin');
const config = require('../settings');
const axios = require('axios');

const getOwnerCaption = (ownerName, ownerNumber, version) => `
╭── ❍ 𝙼𝙰𝙻𝚅𝙸𝙽-𝚇𝙳 ❍
│  𝙽𝚊𝚖𝚎   : *${ownerName}*
│  𝙽𝚞𝚖𝚋𝚎𝚛 : *${ownerNumber}*
│  𝚅𝚎𝚛𝚜𝚒𝚘𝚗 : *${version || 'Unknown'}*
╰─────────⭓
> Stay connected for 🔥 updates!`;

const validateImage = async (url) => {
    try {
        await axios.head(url);
        return url;
    } catch {
        return 'https://files.catbox.moe/01f9y1.jpg'; // Fallback
    }
};

malvin({
    pattern: "owner",
    react: "📞",
    desc: "Send bot owner's contact",
    category: "main",
    filename: __filename
}, async (malvin, mek, m, { from, reply }) => {
    try {
        const ownerName = (config.OWNER_NAME || "Malvin King").replace(/[\n\r;]/g, '');
        const ownerNumber = config.OWNER_NUMBER || "263714757857";
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(ownerNumber)) {
            throw new Error("Invalid owner phone number");
        }

        const vcard = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            `FN:${ownerName}`,
            `TEL;type=CELL;type=VOICE;waid=${ownerNumber.replace('+', '')}:${ownerNumber}`,
            "END:VCARD"
        ].join('\n');

        await malvin.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        });

        const imageUrl = await validateImage(config.OWNER_IMAGE_URL || 'https://files.catbox.moe/01f9y1.jpg');

        await malvin.sendMessage(from, {
            image: { url: imageUrl },
            caption: getOwnerCaption(ownerName, ownerNumber, config.version),
            contextInfo: {
                mentionedJid: [`${ownerNumber.replace('+', '')}@s.whatsapp.net`],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.NEWSLETTER_JID || throw new Error("Newsletter JID not configured"),
                    newsletterName: ownerName,
                    serverMessageId: 143
                }
            }
        });

    } catch (error) {
        console.error(`❌ Error in .owner command (from: ${from}):`, error);
        reply("⚠️ Failed to send owner details. Please try again later.");
    }
});
