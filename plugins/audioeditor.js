const { malvin } = require('../malvin');
const audioEditor = require('../data/audioeditor');
const { ButtonManager } = require('../button');
const config = require('../settings');

// Session storage for audio buffers
const audioSessions = new Map();

const LIST_IMAGE = 'https://files.catbox.moe/qumhu4.jpg'; // Match setsudo.js
const NEWSLETTER_JID = config.NEWSLETTER_JID || '120363402507750390@newsletter';

// Tiny caps converter (matching setsudo.js)
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

// Helper function to process audio with buttons
async function processAudio(client, message, from, effect, desc, react, buffer, ext, quoted, sessionId) {
    try {
        await client.sendMessage(from, { react: { text: '⏳', key: message.key } });

        // Store buffer in session
        if (!audioSessions.has(sessionId)) {
            audioSessions.set(sessionId, { buffer, ext });
            setTimeout(() => audioSessions.delete(sessionId), 2 * 60 * 1000); // Expire after 2 minutes
        }

        const audio = await audioEditor[effect](buffer, ext);
        const caption = `
╭─[ *${toTinyCaps(desc)}* ]──
│
├ *sᴛᴀᴛᴜs*: ᴘʀᴏᴄᴇssᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ ${react}
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
`;

        // Initialize ButtonManager
        const buttonManager = new ButtonManager(client);

        // Define available effects (excluding the current one)
        const allEffects = [
            { name: 'deep', emoji: '🗣️', desc: 'make audio sound deeper' },
            { name: 'smooth', emoji: '🌀', desc: 'smooth out audio' },
            { name: 'fat', emoji: '🍔', desc: 'make audio sound fat/bassy' },
            { name: 'tupai', emoji: '🐿️', desc: 'special tupai effect' },
            { name: 'blown', emoji: '💥', desc: 'make audio sound blown out' },
            { name: 'radio', emoji: '📻', desc: 'make audio sound like old radio' },
            { name: 'robot', emoji: '🤖', desc: 'make audio sound robotic' },
            { name: 'chipmunk', emoji: '🐿️', desc: 'make audio sound high-pitched' },
            { name: 'nightcore', emoji: '🎶', desc: 'apply nightcore effect' },
            { name: 'earrape', emoji: '📢', desc: 'max volume (use with caution)' },
            { name: 'bass', emoji: '🔊', desc: 'add heavy bass boost to audio' },
            { name: 'reverse', emoji: '⏪', desc: 'reverse audio' },
            { name: 'slow', emoji: '🐌', desc: 'slow down audio' },
            { name: 'fast', emoji: '⚡', desc: 'speed up audio' },
            { name: 'baby', emoji: '👶', desc: 'make audio sound like a baby' },
            { name: 'demon', emoji: '👹', desc: 'make audio sound demonic' }
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
            footer: toTinyCaps('> powered by malvin king'),
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

        // Send audio separately
        await client.sendMessage(from, {
            audio: audio,
            mimetype: 'audio/mpeg'
        }, { quoted });

        // Define button actions
        const actions = {};
        otherEffects.forEach(e => {
            actions[`${e.name}-effect`] = async (receivedMsg) => {
                if (!audioSessions.has(sessionId)) {
                    await client.sendMessage(from, {
                        text: toTinyCaps('session expired, please send audio again') + ' 😔'
                    }, { quoted: receivedMsg });
                    return;
                }
                const { buffer: sessionBuffer, ext: sessionExt } = audioSessions.get(sessionId);
                await processAudio(client, message, from, e.name, e.desc, e.emoji, sessionBuffer, sessionExt, receivedMsg, sessionId);
            };
        });

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        await client.sendMessage(from, { react: { text: '✅', key: message.key } });
    } catch (e) {
        console.error(`❌ ${effect} error:`, e);
        await client.sendMessage(from, {
            text: `❌ ${toTinyCaps('failed to process audio')}: ${e.message || 'unknown error'} 😞`
        }, { quoted });
        await client.sendMessage(from, { react: { text: '❌', key: message.key } });
    }
}

// Audio effect commands
const effects = [
    { pattern: 'deep', desc: 'make audio sound deeper', react: '🗣️' },
    { pattern: 'smooth', desc: 'smooth out audio', react: '🌀' },
    { pattern: 'fat', desc: 'make audio sound fat/bassy', react: '🍔' },
    { pattern: 'tupai', desc: 'special tupai effect', react: '🐿️' },
    { pattern: 'blown', desc: 'make audio sound blown out', react: '💥' },
    { pattern: 'radio', desc: 'make audio sound like old radio', react: '📻' },
    { pattern: 'robot', desc: 'make audio sound robotic', react: '🤖' },
    { pattern: 'chipmunk', desc: 'make audio sound high-pitched', react: '🐿️' },
    { pattern: 'nightcore', desc: 'apply nightcore effect', react: '🎶' },
    { pattern: 'earrape', desc: 'max volume (use with caution)', react: '📢' },
    { pattern: 'bass', desc: 'add heavy bass boost to audio', react: '🔊' },
    { pattern: 'reverse', desc: 'reverse audio', react: '⏪' },
    { pattern: 'slow', desc: 'slow down audio', react: '🐌' },
    { pattern: 'fast', desc: 'speed up audio', react: '⚡' },
    { pattern: 'baby', desc: 'make audio sound like a baby', react: '👶' },
    { pattern: 'demon', desc: 'make audio sound demonic', react: '👹' }
];

effects.forEach(({ pattern, desc, react }) => {
    malvin({
        pattern,
        desc: toTinyCaps(desc),
        category: 'audio',
        react,
        filename: __filename
    }, async (client, match, message, { from }) => {
        if (!message.quoted || !['audioMessage', 'videoMessage'].includes(message.quoted.mtype)) {
            return await client.sendMessage(from, {
                text: toTinyCaps('reply to an audio/video message') + ' 🔊'
            }, { quoted: message });
        }

        const buffer = await message.quoted.download();
        const ext = message.quoted.mtype === 'videoMessage' ? 'mp4' : 'mp3';
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await processAudio(client, message, from, pattern, desc, react, buffer, ext, message, sessionId);
    });
});