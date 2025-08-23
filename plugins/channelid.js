const { malvin } = require('../malvin');
const config = require('../settings');
const { ButtonManager } = require('../button');

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

malvin({
    pattern: 'newsletter',
    alias: ['cjid', 'id'],
    react: '📡',
    desc: toTinyCaps('get whatsapp channel info from link'),
    category: 'whatsapp',
    filename: __filename
}, async (malvin, mek, m, { from, args, q, reply, sender }) => {
    try {
        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        if (!q) {
            return reply(toTinyCaps('please provide a whatsapp channel link') + `\n\n📌 *${toTinyCaps('example')}*:\n.newsletter https://whatsapp.com/channel/xxxxxxxxxx`);
        }

        const match = q.match(/whatsapp\.com\/channel\/([\w-]+)/);
        if (!match) {
            return reply(toTinyCaps('invalid channel link') + `\n\n${toTinyCaps('make sure it looks like')}:\nhttps://whatsapp.com/channel/xxxxxxxxx`);
        }

        const inviteId = match[1];
        let metadata;

        try {
            metadata = await malvin.newsletterMetadata('invite', inviteId);
        } catch {
            return reply(toTinyCaps('failed to fetch channel info') + '\n' + toTinyCaps('double-check the link and try again') + ' 🚫');
        }

        if (!metadata?.id) {
            return reply(toTinyCaps('channel not found or inaccessible') + ' ❌');
        }

        const infoText = `
╭───[ *${toTinyCaps('channel info')}* ]───
│
├🆔️ *${toTinyCaps('id')}*: ${metadata.id}
├ℹ️ *${toTinyCaps('name')}*: ${metadata.name}
├👥 *${toTinyCaps('followers')}*: ${metadata.subscribers?.toLocaleString() || 'N/A'}
├🗓️ *${toTinyCaps('created')}*: ${metadata.creation_time ? new Date(metadata.creation_time * 1000).toLocaleString('id-ID') : 'Unknown'}
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
`;

        // Initialize ButtonManager
        const buttonManager = new ButtonManager(malvin);

        // Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Define button
        const buttons = [
            {
                buttonId: `newsletter-copyid-${sessionId}`,
                buttonText: { displayText: '📋 Copy ID' },
                type: 1
            }
        ];

        // Create buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
            imageUrl: metadata.preview ? `https://pps.whatsapp.net${metadata.preview}` : LIST_IMAGE,
            caption: infoText,
            footer: toTinyCaps('powered by malvin King'),
            buttons,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: NEWSLETTER_JID,
                    newsletterName: toTinyCaps('malvin xd'),
                    serverMessageId: 143
                }
            },
            quoted: m
        });

        const sentMsg = await malvin.sendMessage(from, buttonsMessage);
        const messageId = sentMsg.key.id;

        // Define button action
        const actions = {
            'newsletter-copyid': async (receivedMsg) => {
                await malvin.sendMessage(from, {
                    text: metadata.id
                }, { quoted: receivedMsg });
            }
        };

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('❌ Newsletter Error:', err);
        await reply(toTinyCaps('an unexpected error occurred while fetching the channel info') + ' ⚠️');
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});             