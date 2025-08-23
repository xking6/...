const axios = require("axios");
const FormData = require('form-data');
const fs = require('fs');
const os = require('os');
const path = require("path");
const { malvin } = require("../malvin");
const { ButtonManager } = require('../button');
const config = require('../settings');

// Session storage for image buffers
const imageSessions = new Map();

const LIST_IMAGE = 'https://files.catbox.moe/qumhu4.jpg';
const NEWSLETTER_JID = config.NEWSLETTER_JID || '120363402507750390@newsletter';

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Tiny caps converter
const toTinyCaps = (str) => {
    const tinyCapsMap = {
        a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
        j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'q', r: 'ʀ',
        s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
    };
    return str
        .split('')
        .map((char) => tinyCapsMap[char.toLowerCase()] || char)
        .join('');
};

// Helper function to process image with buttons
async function processImage(client, message, from, effect, desc, react, buffer, ext, quoted, sessionId) {
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: message.key } });

        // Store buffer in session
        if (!imageSessions.has(sessionId)) {
            imageSessions.set(sessionId, { buffer, ext });
            setTimeout(() => imageSessions.delete(sessionId), 2 * 60 * 1000); // Expire after 2 minutes
        }

        const tempFilePath = path.join(os.tmpdir(), `imgscan_${Date.now()}${ext}`);
        fs.writeFileSync(tempFilePath, buffer);

        // Upload to Catbox
        const form = new FormData();
        form.append('fileToUpload', fs.createReadStream(tempFilePath), `image${ext}`);
        form.append('reqtype', 'fileupload');

        const uploadResponse = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: form.getHeaders()
        });

        const imageUrl = uploadResponse.data;
        fs.unlinkSync(tempFilePath); // Clean up temp file

        if (!imageUrl) {
            throw "Failed to upload image to Catbox";
        }

        // Define API endpoints for each effect
        const effectApis = {
            rmbg: `https://apis.davidcyriltech.my.id/removebg?url=${encodeURIComponent(imageUrl)}`,
            ad: `https://api.popcat.xyz/v2/ad?image=${encodeURIComponent(imageUrl)}`,
            blur: `https://api.popcat.xyz/v2/blur?image=${encodeURIComponent(imageUrl)}`,
            grey: `https://api.popcat.xyz/v2/greyscale?image=${encodeURIComponent(imageUrl)}`,
            invert: `https://api.popcat.xyz/v2/invert?image=${encodeURIComponent(imageUrl)}`,
            jail: `https://api.popcat.xyz/v2/jail?image=${encodeURIComponent(imageUrl)}`,
            imgjoke: `https://api.popcat.xyz/v2/jokeoverhead?image=${encodeURIComponent(imageUrl)}`,
            nokia: `https://api.popcat.xyz/v2/nokia?image=${encodeURIComponent(imageUrl)}`,
            wanted: `https://api.popcat.xyz/v2/wanted?image=${encodeURIComponent(imageUrl)}`
        };

        const apiUrl = effectApis[effect];
        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

        if (!response || !response.data) {
            return await client.sendMessage(from, {
                text: toTinyCaps("Error: The API did not return a valid image. Try again later.")
            }, { quoted });
        }

        const imageBuffer = Buffer.from(response.data, "binary");

        const caption = `
╭─[ *${toTinyCaps(desc)}* ]──
│
├ *sᴛᴀᴛᴜs*: ᴘʀᴏᴄᴇssᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ ${react}
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
`;

        // Initialize ButtonManager
        const buttonManager = new ButtonManager(client);

        // Define available effects
        const allEffects = [
            { name: 'rmbg', emoji: '📸', desc: 'remove background' },
            { name: 'ad', emoji: '📺', desc: 'apply ad effect' },
            { name: 'blur', emoji: '🌫️', desc: 'apply blur effect' },
            { name: 'grey', emoji: '🖤', desc: 'apply greyscale effect' },
            { name: 'invert', emoji: '🔄', desc: 'invert colors' },
            { name: 'jail', emoji: '🚨', desc: 'apply jail effect' },
            { name: 'imgjoke', emoji: '😂', desc: 'apply joke overhead effect' },
            { name: 'nokia', emoji: '📱', desc: 'apply nokia effect' },
            { name: 'wanted', emoji: '🤠', desc: 'apply wanted poster effect' }
        ];

        // Select up to 5 other effects (excluding current effect)
        const otherEffects = allEffects
            .filter(e => e.name !== effect)
            .slice(0, 5); // WhatsApp button limit

        // Define buttons
        const buttons = otherEffects.map(e => ({
            buttonId: `${e.name}-effect-${sessionId}`,
            buttonText: { displayText: `${e.emoji} ${toTinyCaps(e.name)}` },
            type: 1
        }));

        // Create and send buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
            imageUrl: LIST_IMAGE,
            caption,
            footer: toTinyCaps('> powered by malvin xd'),
            buttons,
            contextInfo: {
                mentionedJid: [message.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: NEWSLETTER_JID,
                    newsletterName: toTinyCaps('malvin xd'),
                    serverMessageId: 143
                }
            },
            quoted
        });

        const sentMsg = await client.sendMessage(from, buttonsMessage);
        const messageId = sentMsg.key.id;

        // Send image separately
        await client.sendMessage(from, {
            image: imageBuffer,
            caption: `> *${toTinyCaps('powered by malvin xd')}*`
        }, { quoted });

        // Define button actions
        const actions = {};
        otherEffects.forEach(e => {
            actions[`${e.name}-effect`] = async (receivedMsg) => {
                if (!imageSessions.has(sessionId)) {
                    await client.sendMessage(from, {
                        text: toTinyCaps('session expired, please send image again') + ' 😔'
                    }, { quoted: receivedMsg });
                    return;
                }
                const { buffer: sessionBuffer, ext: sessionExt } = imageSessions.get(sessionId);
                await processImage(client, message, from, e.name, e.desc, e.emoji, sessionBuffer, sessionExt, receivedMsg, sessionId);
            };
        });

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        await client.sendMessage(from, { react: { text: '✅', key: message.key } });
    } catch (error) {
        console.error(`${effect} Error:`, error);
        await client.sendMessage(from, {
            text: `❌ ${toTinyCaps('failed to process image')}: ${error.response?.data?.message || error.message || "unknown error"} 😞`
        }, { quoted });
        await client.sendMessage(from, { react: { text: '❌', key: message.key } });
    }
}

// Image effect commands
const effects = [
    { pattern: 'rmbg', alias: ['removebg'], desc: 'remove background', react: '📸' },
    { pattern: 'ad', alias: ['adedit'], desc: 'apply ad effect', react: '📺' },
    { pattern: 'blur', alias: ['bluredit'], desc: 'apply blur effect', react: '🌫️' },
    { pattern: 'grey', alias: ['greyedit'], desc: 'apply greyscale effect', react: '🖤' },
    { pattern: 'invert', alias: ['invertedit'], desc: 'invert colors', react: '🔄' },
    { pattern: 'jail', alias: ['jailedit'], desc: 'apply jail effect', react: '🚨' },
    { pattern: 'imgjoke', alias: ['jokedit'], desc: 'apply joke overhead effect', react: '😂' },
    { pattern: 'nokia', alias: ['nokiaedit'], desc: 'apply nokia effect', react: '📱' },
    { pattern: 'wanted', alias: ['wantededit'], desc: 'apply wanted poster effect', react: '🤠' }
];

effects.forEach(({ pattern, alias, desc, react }) => {
    malvin({
        pattern,
        alias,
        react,
        desc: toTinyCaps(desc),
        category: 'convert',
        use: `.${pattern} [reply to image]`,
        filename: __filename
    }, async (client, message, m, { reply, from }) => {
        try {
            const quotedMsg = message.quoted ? message.quoted : message;
            const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

            if (!mimeType || !mimeType.startsWith('image/')) {
                return reply(toTinyCaps('please reply to an image file (jpeg/png)') + ' 📸');
            }

            const mediaBuffer = await quotedMsg.download();
            const fileSize = formatBytes(mediaBuffer.length);

            let extension = '';
            if (mimeType.includes('image/jpeg')) extension = '.jpg';
            else if (mimeType.includes('image/png')) extension = '.png';
            else {
                return reply(toTinyCaps('unsupported image format. please use jpeg or png') + ' 📸');
            }

            const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await processImage(client, message, from, pattern, desc, react, mediaBuffer, extension, message, sessionId);
        } catch (error) {
            console.error(`${pattern} Error:`, error);
            reply(`❌ ${toTinyCaps('failed to process image')}: ${error.message || 'unknown error'} 😞`);
        }
    });
});