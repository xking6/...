const axios = require('axios');
const { malvin } = require('../malvin');
const { ButtonManager } = require('../button');

// In-memory store for image sessions
const imageSessions = new Map();

// Tiny caps converter (for consistency with menu.js, alive.js, etc.)
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

// Function to send an image with buttons
async function sendImageWithButtons(malvin, mek, from, sender, query, imageUrl, currentIndex, totalImages, sessionId, results) {
    const caption = `
╭───[ *ɪᴍᴀɢᴇ sᴇᴀʀᴄʜ* ]───
│
├ *ǫᴜᴇʀʏ*: ${query} 🔍
├ *ʀᴇsᴜʟᴛ*: ${currentIndex + 1} of ${totalImages} 🖼️
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;

    const buttonManager = new ButtonManager(malvin);
    const buttons = [
        {
            buttonId: `img-next-${sessionId}`,
            buttonText: { displayText: '➡️ Next Image' },
            type: 1
        },
        {
            buttonId: `img-end-${sessionId}`,
            buttonText: { displayText: '🛑 End' },
            type: 1
        }
    ];

    const buttonsMessage = buttonManager.createButtonsMessage({
        imageUrl,
        caption,
        footer: toTinyCaps('powered by malvin'),
        buttons,
        contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363402507750390@newsletter',
                newsletterName: toTinyCaps('malvin xd'),
                serverMessageId: 143
            }
        },
        quoted: mek
    });

    const sentMsg = await malvin.sendMessage(from, buttonsMessage);
    const messageId = sentMsg.key.id;

    // Store session data
    imageSessions.set(sessionId, { results, currentIndex, query, sender, from });

    // Define button actions
    const actions = {
        'img-next': async (receivedMsg) => {
            const session = imageSessions.get(sessionId);
            if (!session) {
                await malvin.sendMessage(from, {
                    text: toTinyCaps('session expired, please use .img again') + ' 😔'
                }, { quoted: receivedMsg });
                return;
            }

            const { results, currentIndex, query, sender, from } = session;
            const nextIndex = currentIndex + 1;

            if (nextIndex >= results.length) {
                await malvin.sendMessage(from, {
                    text: toTinyCaps('no more images available') + ' 😔\n' + toTinyCaps('use .img again to start a new search')
                }, { quoted: receivedMsg });
                imageSessions.delete(sessionId);
                return;
            }

            try {
                await sendImageWithButtons(
                    malvin,
                    receivedMsg,
                    from,
                    sender,
                    query,
                    results[nextIndex],
                    nextIndex,
                    results.length,
                    sessionId,
                    results
                );
                imageSessions.set(sessionId, { results, currentIndex: nextIndex, query, sender, from });
            } catch (err) {
                console.warn(`⚠️ failed to send image ${nextIndex + 1}: ${results[nextIndex]}`, err);
                await malvin.sendMessage(from, {
                    text: toTinyCaps('failed to send next image') + ' 😞'
                }, { quoted: receivedMsg });
            }
        },
        'img-end': async (receivedMsg) => {
            await malvin.sendMessage(from, {
                text: toTinyCaps('image search session ended') + ' ✅\n' + toTinyCaps('use .img to start a new search')
            }, { quoted: receivedMsg });
            imageSessions.delete(sessionId);
        }
    };

    buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
        buttonManager.handleAction(receivedMsg, buttonId, actions);
    });
}

malvin({
    pattern: 'img',
    alias: ['image', 'googleimage', 'searchimg'],
    react: '🖼️',
    desc: 'search google images 📷',
    category: 'download',
    use: '.img <keywords>',
    filename: __filename
}, async (malvin, mek, m, { reply, args, from, sender }) => {
    try {
        const query = args.join(' ');
        if (!query) {
            await reply(toTinyCaps('please provide a search query') + '\n' + toTinyCaps('example: .img cute cats') + ' 😔');
            await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
            return;
        }

        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });
        await reply(toTinyCaps(`searching for *${query}*`) + ' 🔍');

        const url = `https://apis.davidcyriltech.my.id/googleimage?query=${encodeURIComponent(query)}`;
        const response = await axios.get(url, { timeout: 15000 });

        if (!response.data?.success || !response.data.results?.length) {
            await reply(toTinyCaps('no images found') + ' 😔\n' + toTinyCaps('try different keywords'));
            await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
            return;
        }

        const results = response.data.results;
        await reply(toTinyCaps(`found *${results.length}* images for *${query}*`) + ' ✅');

        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const randomImage = results[Math.floor(Math.random() * results.length)];

        try {
            await sendImageWithButtons(malvin, mek, from, sender, query, randomImage, 0, results.length, sessionId, results);
            await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });
        } catch (err) {
            console.warn(`⚠️ failed to send image: ${randomImage}`, err);
            await reply(toTinyCaps('failed to send image') + ' 😞');
            await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
        }

    } catch (error) {
        console.error('❌ image search error:', error);
        const errorMsg = error.message.includes('timeout')
            ? toTinyCaps('request timed out') + ' ⏰'
            : toTinyCaps('failed to fetch images') + ' 😞';
        await reply(errorMsg);
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});