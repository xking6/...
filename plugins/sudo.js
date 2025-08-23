const fs = require('fs');
const path = require('path');
const { malvin } = require('../malvin');
const config = require('../settings');
const { ButtonManager } = require('../button');

const ownerFile = path.resolve(__dirname, '../lib/sudo.json');
const LIST_IMAGE = 'https://files.catbox.moe/qumhu4.jpg';
const NEWSLETTER_JID = config.NEWSLETTER_JID || '120363402507750390@newsletter';

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

// Ensure sudo.json exists
const ensureOwnerFile = () => {
    if (!fs.existsSync(ownerFile)) {
        fs.writeFileSync(ownerFile, JSON.stringify([], null, 2));
    }
};

// Helper to read owner list
const readOwnerList = () => JSON.parse(fs.readFileSync(ownerFile, 'utf-8'));

// Helper to write owner list
const writeOwnerList = (list) => fs.writeFileSync(ownerFile, JSON.stringify([...new Set(list)], null, 2));

// Function to send sudo list (from listsudo logic)
async function sendSudoList(malvin, mek, from, sender) {
    try {
        ensureOwnerFile();
        const owners = readOwnerList();
        let caption;
        if (owners.length === 0) {
            caption = `
╭───[ *sᴜᴅᴏ ʟɪsᴛ* ]───
│
├ *ᴛᴏᴛᴀʟ*: 0 owners 😊
├ *sᴛᴀᴛᴜs*: no temporary owners found
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;
            await malvin.sendMessage(from, {
                text: caption,
                contextInfo: { mentionedJid: [sender] }
            }, { quoted: mek });
        } else {
            const ownerList = owners
                .map((owner, i) => `├ *${i + 1}.* ${owner.replace('@s.whatsapp.net', '')}`)
                .join('\n');
            caption = `
╭───[ *sᴜᴅᴏ ʟɪsᴛ* ]───
│
├ *ᴛᴏᴛᴀʟ*: ${owners.length} owners 🤴
│
${ownerList}
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;
            await malvin.sendMessage(from, {
                image: { url: LIST_IMAGE },
                caption,
                contextInfo: { mentionedJid: [sender] }
            }, { quoted: mek });
        }
    } catch (err) {
        console.error('❌ sendSudoList error:', err);
        await malvin.sendMessage(from, {
            text: `❌ ${toTinyCaps('error listing owners')}: ${err.message || 'unknown error'} 😞`
        }, { quoted: mek });
    }
}

// Add temporary owner
malvin({
    pattern: 'setsudo',
    alias: ['addsudo', 'addowner', 'sudo'],
    react: '🎭',
    desc: 'add temporary owner 🤴',
    category: 'owner',
    use: '.setsudo <number|tag|reply>',
    filename: __filename
}, async (malvin, mek, m, { from, args, isCreator, reply, sender }) => {
    try {
        if (!isCreator) {
            return reply('❌ owner-only command 🚫');
        }

        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const target = m.mentionedJid?.[0] ||
                      m.quoted?.sender ||
                      (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net');

        if (!target) {
            return reply('❌ please provide a number, tag, or reply to a user 😔');
        }

        ensureOwnerFile();
        const owners = readOwnerList();

        if (owners.includes(target)) {
            return reply('❌ user already a temporary owner 🎭');
        }

        owners.push(target);
        writeOwnerList(owners);

        const caption = `
╭───[ *ᴀᴅᴅ ᴏᴡɴᴇʀ* ]───
│
├ *ᴜsᴇʀ*: ${target.replace('@s.whatsapp.net', '')} 🤴
├ *sᴛᴀᴛᴜs*: added as temporary owner 🎭
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;

        // Initialize ButtonManager
        const buttonManager = new ButtonManager(malvin);

        // Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Define button
        const buttons = [
            {
                buttonId: `setsudo-viewlist-${sessionId}`,
                buttonText: { displayText: '📋 View Sudo List' },
                type: 1
            }
        ];

        // Create and send buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
            imageUrl: LIST_IMAGE,
            caption,
            footer: toTinyCaps('powered by malvin'),
            buttons,
            contextInfo: {
                mentionedJid: [m.sender, target],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: NEWSLETTER_JID,
                    newsletterName: toTinyCaps('malvin xd'),
                    serverMessageId: 143
                }
            },
            quoted: mek
        });

        const sentMsg = await malvin.sendMessage(from, buttonsMessage);
        const messageId = sentMsg.key.id;

        // Define button action
        const actions = {
            'setsudo-viewlist': async (receivedMsg) => {
                await sendSudoList(malvin, receivedMsg, from, sender);
            }
        };

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('❌ setsudo error:', err);
        await reply(`❌ error adding owner: ${err.message || 'unknown error'} 😞`);
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

// Remove temporary owner
malvin({
    pattern: 'delsudo',
    alias: ['delowner', 'deletesudo'],
    react: '🗑️',
    desc: 'remove temporary owner 🤴',
    category: 'owner',
    use: '.delsudo <number|tag|reply>',
    filename: __filename
}, async (malvin, mek, m, { from, args, isCreator, reply, sender }) => {
    try {
        if (!isCreator) {
            return reply('❌ owner-only command 🚫');
        }

        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const target = m.mentionedJid?.[0] ||
                      m.quoted?.sender ||
                      (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net');

        if (!target) {
            return reply('❌ please provide a number, tag, or reply to a user 😔');
        }

        ensureOwnerFile();
        const owners = readOwnerList();

        if (!owners.includes(target)) {
            return reply('❌ user not a temporary owner 🤷');
        }

        const updated = owners.filter(x => x !== target);
        writeOwnerList(updated);

        const caption = `
╭───[ *ʀᴇᴍᴏᴠᴇ ᴏᴡɴᴇʀ* ]───
│
├ *ᴜsᴇʀ*: ${target.replace('@s.whatsapp.net', '')} 🗑️
├ *sᴛᴀᴛᴜs*: removed from temporary owners ✅
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;

        // Initialize ButtonManager
        const buttonManager = new ButtonManager(malvin);

        // Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Define button
        const buttons = [
            {
                buttonId: `delsudo-viewlist-${sessionId}`,
                buttonText: { displayText: '📋 View Sudo List' },
                type: 1
            }
        ];

        // Create and send buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
            imageUrl: LIST_IMAGE,
            caption,
            footer: toTinyCaps('powered by malvin'),
            buttons,
            contextInfo: {
                mentionedJid: [m.sender, target],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: NEWSLETTER_JID,
                    newsletterName: toTinyCaps('malvin xd'),
                    serverMessageId: 143
                }
            },
            quoted: mek
        });

        const sentMsg = await malvin.sendMessage(from, buttonsMessage);
        const messageId = sentMsg.key.id;

        // Define button action
        const actions = {
            'delsudo-viewlist': async (receivedMsg) => {
                await sendSudoList(malvin, receivedMsg, from, sender);
            }
        };

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('❌ delsudo error:', err);
        await reply(`❌ error removing owner: ${err.message || 'unknown error'} 😞`);
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

// List temporary owners (unchanged)
malvin({
    pattern: 'listsudo',
    alias: ['listowner'],
    react: '📋',
    desc: 'list temporary owners 📜',
    category: 'owner',
    use: '.listsudo',
    filename: __filename
}, async (malvin, mek, m, { from, isCreator, reply }) => {
    try {
        if (!isCreator) {
            return reply('❌ owner-only command 🚫');
        }

        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        ensureOwnerFile();
        const owners = readOwnerList();

        if (owners.length === 0) {
            return reply('✅ no temporary owners found 😊');
        }

        const ownerList = owners
            .map((owner, i) => `├ *${i + 1}.* ${owner.replace('@s.whatsapp.net', '')}`)
            .join('\n');

        const caption = `
╭───[ *sᴜᴅᴏ ʟɪsᴛ* ]───
│
├ *ᴛᴏᴛᴀʟ*: ${owners.length} owners 🤴
│
${ownerList}
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;

        await malvin.sendMessage(from, {
            image: { url: LIST_IMAGE },
            caption,
            contextInfo: { mentionedJid: [m.sender] }
        }, { quoted: mek });

        await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('❌ listsudo error:', err);
        await reply(`❌ error listing owners: ${err.message || 'unknown error'} 😞`);
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});