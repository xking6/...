const fs = require('fs');
const path = require('path');
const { malvin } = require('../malvin');
const config = require('../settings');
const { ButtonManager } = require('../button');

const banFile = path.resolve('./lib/ban.json');
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

// Ensure ban.json exists
const ensureBanFile = () => {
    if (!fs.existsSync(banFile)) {
        fs.writeFileSync(banFile, JSON.stringify([], null, 2));
    }
};

// Helper to read ban list
const readBanList = () => JSON.parse(fs.readFileSync(banFile, 'utf-8'));

// Helper to write ban list
const writeBanList = (list) => fs.writeFileSync(banFile, JSON.stringify([...new Set(list)], null, 2));

// Function to send ban list
async function sendBanList(malvin, mek, from, sender) {
    try {
        ensureBanFile();
        const banned = readBanList();
        let caption;
        if (banned.length === 0) {
            caption = `
╭───[ *ʙᴀɴ ʟɪsᴛ* ]───
│
├ *ᴛᴏᴛᴀʟ*: 0 users 😊
├ *sᴛᴀᴛᴜs*: no banned users found
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;
            await malvin.sendMessage(from, {
                text: caption,
                contextInfo: { mentionedJid: [sender] }
            }, { quoted: mek });
        } else {
            const banList = banned
                .map((id, i) => `├ *${i + 1}.* ${id.replace('@s.whatsapp.net', '')}`)
                .join('\n');
            caption = `
╭───[ *ʙᴀɴ ʟɪsᴛ* ]───
│
├ *ᴛᴏᴛᴀʟ*: ${banned.length} users ⛔
│
${banList}
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
        console.error('❌ sendBanList error:', err);
        await malvin.sendMessage(from, {
            text: `❌ ${toTinyCaps('error listing bans')}: ${err.message || 'unknown error'} 😞`
        }, { quoted: mek });
    }
}

// Ban command
malvin({
    pattern: 'ban',
    alias: ['blockuser', 'addban'],
    react: '⛔',
    desc: 'ban a user from bot 🤖',
    category: 'owner',
    use: '.ban <number|tag|reply>',
    filename: __filename
}, async (malvin, mek, m, { from, args, isCreator, reply, sender }) => {
    try {
        if (!isCreator) {
            return reply(toTinyCaps('owner-only command') + ' 🚫');
        }

        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const target = m.mentionedJid?.[0] ||
                      m.quoted?.sender ||
                      (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net');

        if (!target) {
            return reply(toTinyCaps('please provide a number, tag, or reply to a user') + ' 😔');
        }

        ensureBanFile();
        const banned = readBanList();
        if (banned.includes(target)) {
            return reply(toTinyCaps('user already banned') + ' ⛔');
        }

        banned.push(target);
        writeBanList(banned);

        const caption = `
╭───[ *ʙᴀɴ ᴜsᴇʀ* ]───
│
├ *ᴜsᴇʀ*: ${target.replace('@s.whatsapp.net', '')} ⛔
├ *sᴛᴀᴛᴜs*: banned successfully 🚫
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
                buttonId: `ban-viewlist-${sessionId}`,
                buttonText: { displayText: '📋 View Ban List' },
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
                mentionedJid: [sender, target],
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
            'ban-viewlist': async (receivedMsg) => {
                await sendBanList(malvin, receivedMsg, from, sender);
            }
        };

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('❌ ban error:', err);
        await reply(`❌ ${toTinyCaps('error banning user')}: ${err.message || 'unknown error'} 😞`);
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

// Unban command
malvin({
    pattern: 'unban',
    alias: ['removeban'],
    react: '✅',
    desc: 'unban a user from bot 🤖',
    category: 'owner',
    use: '.unban <number|tag|reply>',
    filename: __filename
}, async (malvin, mek, m, { from, args, isCreator, reply, sender }) => {
    try {
        if (!isCreator) {
            return reply(toTinyCaps('owner-only command') + ' 🚫');
        }

        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const target = m.mentionedJid?.[0] ||
                      m.quoted?.sender ||
                      (args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net');

        if (!target) {
            return reply(toTinyCaps('please provide a number, tag, or reply to a user') + ' 😔');
        }

        ensureBanFile();
        const banned = readBanList();
        if (!banned.includes(target)) {
            return reply(toTinyCaps('user not banned') + ' 🤷');
        }

        const updated = banned.filter(u => u !== target);
        writeBanList(updated);

        const caption = `
╭───[ *ᴜɴʙᴀɴ ᴜsᴇʀ* ]───
│
├ *ᴜsᴇʀ*: ${target.replace('@s.whatsapp.net', '')} ✅
├ *sᴛᴀᴛᴜs*: unbanned successfully 🎉
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
                buttonId: `unban-viewlist-${sessionId}`,
                buttonText: { displayText: '📋 View Ban List' },
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
                mentionedJid: [sender, target],
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
            'unban-viewlist': async (receivedMsg) => {
                await sendBanList(malvin, receivedMsg, from, sender);
            }
        };

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('❌ unban error:', err);
        await reply(`❌ ${toTinyCaps('error unbanning user')}: ${err.message || 'unknown error'} 😞`);
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});

// Listban command
malvin({
    pattern: 'listban',
    alias: ['banlist', 'bannedusers'],
    react: '📋',
    desc: 'list all banned users 📜',
    category: 'owner',
    use: '.listban',
    filename: __filename
}, async (malvin, mek, m, { from, isCreator, reply }) => {
    try {
        if (!isCreator) {
            return reply(toTinyCaps('owner-only command') + ' 🚫');
        }

        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        ensureBanFile();
        const banned = readBanList();
        if (banned.length === 0) {
            return reply(toTinyCaps('no banned users found') + ' 😊');
        }

        const banList = banned
            .map((id, i) => `├ *${i + 1}.* ${id.replace('@s.whatsapp.net', '')}`)
            .join('\n');

        const caption = `
╭───[ *ʙᴀɴ ʟɪsᴛ* ]───
│
├ *ᴛᴏᴛᴀʟ*: ${banned.length} users ⛔
│
${banList}
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;

        await malvin.sendMessage(from, {
            image: { url: LIST_IMAGE },
            caption,
            contextInfo: { mentionedJid: [sender] }
        }, { quoted: mek });

        await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (err) {
        console.error('❌ listban error:', err);
        await reply(`❌ ${toTinyCaps('error listing bans')}: ${err.message || 'unknown error'} 😞`);
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});