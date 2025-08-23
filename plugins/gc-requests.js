//---------------------------------------------
//           MALVIN-XD  
//---------------------------------------------
//  ⚠️ DO NOT MODIFY THIS FILE OR REMOVE THIS CREDIT⚠️  
//---------------------------------------------

const { malvin } = require('../malvin');
const { ButtonManager } = require('../button');
const config = require('../settings');

// Session storage for pending join requests
const requestSessions = new Map();

const LIST_IMAGE = 'https://files.catbox.moe/qumhu4.jpg';
const NEWSLETTER_JID = config.NEWSLETTER_JID || '120363402507750390@newsletter';

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

// Helper function to process request list with buttons
async function processRequestList(client, m, from, quoted, sessionId) {
    try {
        // Validate m and m.key
        if (!m || !m.key || !m.key.id) {
            console.error('Invalid m object:', JSON.stringify(m, null, 2));
            throw new Error('Invalid message object');
        }
        console.log(`Processing request list, session: ${sessionId}`);

        // Send processing reaction
        try {
            await client.sendMessage(from, { react: { text: '⏳', key: m.key } });
        } catch (reactError) {
            console.error('Failed to send reaction:', reactError.message);
            await client.sendMessage(from, { text: toTinyCaps('processing...') }, { quoted });
        }

        const requests = await client.groupRequestParticipantsList(from);
        if (requests.length === 0) {
            try {
                await client.sendMessage(from, { react: { text: 'ℹ️', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send info reaction:', reactError.message);
            }
            return client.sendMessage(from, {
                text: toTinyCaps('no pending join requests.'),
                quoted
            });
        }

        // Store requests in session
        if (!requestSessions.has(sessionId)) {
            requestSessions.set(sessionId, { requests });
            setTimeout(() => requestSessions.delete(sessionId), 2 * 60 * 1000); // Expire after 2 minutes
            console.log(`Stored requests in session: ${sessionId}, count: ${requests.length}`);
        }

        // Build caption
        let text = `╭─[ *${toTinyCaps('pending join requests')}* ]──\n│\n`;
        requests.forEach((user, i) => {
            text += `├ ${i + 1}. @${user.jid.split('@')[0]}\n`;
        });
        text += `│\n╰───[ *${toTinyCaps('malvin-xd')}* ]───`;

        // Initialize ButtonManager
        let buttonManager;
        try {
            buttonManager = new ButtonManager(client);
            console.log('ButtonManager initialized');
        } catch (error) {
            console.error('Failed to initialize ButtonManager:', error);
            throw new Error('Button system initialization failed');
        }

        // Define buttons (Accept/Reject for each user, up to WhatsApp limit)
        const buttons = [];
        const maxButtons = 5; // WhatsApp button limit
        requests.slice(0, maxButtons).forEach((user, i) => {
            buttons.push(
                {
                    buttonId: `accept-${user.jid}-${sessionId}`,
                    buttonText: { displayText: `${toTinyCaps('accept')} @${user.jid.split('@')[0]}` },
                    type: 1
                },
                {
                    buttonId: `reject-${user.jid}-${sessionId}`,
                    buttonText: { displayText: `${toTinyCaps('reject')} @${user.jid.split('@')[0]}` },
                    type: 1
                }
            );
        });

        // Create and send buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
            imageUrl: LIST_IMAGE,
            caption: text,
            footer: toTinyCaps('> powered by malvin xd'),
            buttons,
            contextInfo: {
                mentionedJid: requests.map(u => u.jid)
            },
            quoted
        });

        const sentMsg = await client.sendMessage(from, buttonsMessage);
        if (!sentMsg || !sentMsg.key || !sentMsg.key.id) {
            console.error('Failed to send buttons message:', JSON.stringify(sentMsg, null, 2));
            throw new Error('Failed to send buttons message');
        }
        const messageId = sentMsg.key.id;
        console.log(`Sent buttons message with ID: ${messageId}`);

        // Define button actions
        const actions = {};
        requests.forEach(user => {
            actions[`accept-${user.jid}`] = async (receivedMsg) => {
                if (!requestSessions.has(sessionId)) {
                    console.log(`Session expired: ${sessionId}`);
                    await client.sendMessage(from, {
                        text: toTinyCaps('session expired, please run requestlist again') + ' 😔',
                        quoted: receivedMsg
                    });
                    return;
                }
                try {
                    await client.groupRequestParticipantsUpdate(from, [user.jid], "approve");
                    console.log(`Accepted user: ${user.jid}`);
                    await client.sendMessage(from, {
                        text: toTinyCaps(`successfully accepted @${user.jid.split('@')[0]}`),
                        quoted: receivedMsg,
                        mentions: [user.jid]
                    });
                } catch (error) {
                    console.error(`Accept error for ${user.jid}:`, error);
                    await client.sendMessage(from, {
                        text: toTinyCaps(`failed to accept @${user.jid.split('@')[0]}`) + ' 😞',
                        quoted: receivedMsg,
                        mentions: [user.jid]
                    });
                }
            };
            actions[`reject-${user.jid}`] = async (receivedMsg) => {
                if (!requestSessions.has(sessionId)) {
                    console.log(`Session expired: ${sessionId}`);
                    await client.sendMessage(from, {
                        text: toTinyCaps('session expired, please run requestlist again') + ' 😔',
                        quoted: receivedMsg
                    });
                    return;
                }
                try {
                    await client.groupRequestParticipantsUpdate(from, [user.jid], "reject");
                    console.log(`Rejected user: ${user.jid}`);
                    await client.sendMessage(from, {
                        text: toTinyCaps(`successfully rejected @${user.jid.split('@')[0]}`),
                        quoted: receivedMsg,
                        mentions: [user.jid]
                    });
                } catch (error) {
                    console.error(`Reject error for ${user.jid}:`, error);
                    await client.sendMessage(from, {
                        text: toTinyCaps(`failed to reject @${user.jid.split('@')[0]}`) + ' 😞',
                        quoted: receivedMsg,
                        mentions: [user.jid]
                    });
                }
            };
        });

        // Add button handler
        try {
            buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
                console.log(`Handling button click: ${buttonId}`);
                buttonManager.handleAction(receivedMsg, buttonId, actions);
            });
        } catch (handlerError) {
            console.error('Failed to add button handler:', handlerError);
        }

        // Send success reaction
        try {
            await client.sendMessage(from, { react: { text: '✅', key: m.key } });
        } catch (reactError) {
            console.error('Failed to send success reaction:', reactError.message);
        }
    } catch (error) {
        console.error('Request list error:', error);
        await client.sendMessage(from, {
            text: `❌ ${toTinyCaps('failed to fetch join requests')}: ${error.message || 'unknown error'} 😞`,
            quoted
        });
        if (m && m.key) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
        }
    }
}

// Command to list all pending group join requests
malvin({
    pattern: "requestlist",
    alias: "joinrequests",
    desc: toTinyCaps('shows pending group join requests'),
    category: 'group',
    react: '📋',
    use: '.requestlist',
    filename: __filename
}, async (client, m, _, { from, quoted, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!m || !m.key || !m.key.id) {
            console.error('Invalid m object in requestlist:', JSON.stringify(m, null, 2));
            return reply(`❌ ${toTinyCaps('invalid message context')}: please try again 😞`);
        }

        if (!isGroup) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('this command can only be used in groups')}.`);
        }
        if (!isAdmins) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('only group admins can use this command')}.`);
        }
        if (!isBotAdmins) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('i need to be an admin to view join requests')}.`);
        }

        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Starting requestlist, session: ${sessionId}`);
        await processRequestList(client, m, from, quoted, sessionId);
    } catch (error) {
        console.error('Requestlist command error:', error);
        await reply(`❌ ${toTinyCaps('failed to fetch join requests')}: ${error.message || 'unknown error'} 😞`);
        if (m && m.key) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
        }
    }
});

// Command to accept all pending join requests
malvin({
    pattern: 'acceptall',
    desc: toTinyCaps('accepts all pending group join requests'),
    category: 'group',
    react: '✅',
    use: '.acceptall',
    filename: __filename
}, async (client, m, _, { from, quoted, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!m || !m.key || !m.key.id) {
            console.error('Invalid m object in acceptall:', JSON.stringify(m, null, 2));
            return reply(`❌ ${toTinyCaps('invalid message context')}: please try again 😞`);
        }

        try {
            await client.sendMessage(from, { react: { text: '⏳', key: m.key } });
        } catch (reactError) {
            console.error('Failed to send processing reaction:', reactError.message);
        }

        if (!isGroup) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('this command can only be used in groups')}.`);
        }
        if (!isAdmins) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('only group admins can use this command')}.`);
        }
        if (!isBotAdmins) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('i need to be an admin to accept join requests')}.`);
        }

        const requests = await client.groupRequestParticipantsList(from);
        if (requests.length === 0) {
            try {
                await client.sendMessage(from, { react: { text: 'ℹ️', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send info reaction:', reactError.message);
            }
            return reply(toTinyCaps('no pending join requests to accept.'));
        }

        const jids = requests.map(u => u.jid);
        await client.groupRequestParticipantsUpdate(from, jids, 'approve');

        try {
            await client.sendMessage(from, { react: { text: '👍', key: m.key } });
        } catch (reactError) {
            console.error('Failed to send success reaction:', reactError.message);
        }
        return reply(toTinyCaps(`successfully accepted ${requests.length} join requests.`));
    } catch (error) {
        console.error('Accept all error:', error);
        await reply(`❌ ${toTinyCaps('failed to accept join requests')}: ${error.message || 'unknown error'} 😞`);
        if (m && m.key) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
        }
    }
});

// Command to reject all pending join requests
malvin({
    pattern: 'rejectall',
    desc: toTinyCaps('rejects all pending group join requests'),
    category: 'group',
    react: '❌',
    use: '.rejectall',
    filename: __filename
}, async (client, m, _, { from, quoted, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!m || !m.key || !m.key.id) {
            console.error('Invalid m object in rejectall:', JSON.stringify(m, null, 2));
            return reply(`❌ ${toTinyCaps('invalid message context')}: please try again 😞`);
        }

        try {
            await client.sendMessage(from, { react: { text: '⏳', key: m.key } });
        } catch (reactError) {
            console.error('Failed to send processing reaction:', reactError.message);
        }

        if (!isGroup) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('this command can only be used in groups')}.`);
        }
        if (!isAdmins) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('only group admins can use this command')}.`);
        }
        if (!isBotAdmins) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
            return reply(`❌ ${toTinyCaps('i need to be an admin to reject join requests')}.`);
        }

        const requests = await client.groupRequestParticipantsList(from);
        if (requests.length === 0) {
            try {
                await client.sendMessage(from, { react: { text: 'ℹ️', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send info reaction:', reactError.message);
            }
            return reply(toTinyCaps('no pending join requests to reject.'));
        }

        const jids = requests.map(u => u.jid);
        await client.groupRequestParticipantsUpdate(from, jids, 'reject');

        try {
            await client.sendMessage(from, { react: { text: '👎', key: m.key } });
        } catch (reactError) {
            console.error('Failed to send success reaction:', reactError.message);
        }
        return reply(toTinyCaps(`successfully rejected ${requests.length} join requests.`));
    } catch (error) {
        console.error('Reject all error:', error);
        await reply(`❌ ${toTinyCaps('failed to reject join requests')}: ${error.message || 'unknown error'} 😞`);
        if (m && m.key) {
            try {
                await client.sendMessage(from, { react: { text: '❌', key: m.key } });
            } catch (reactError) {
                console.error('Failed to send error reaction:', reactError.message);
            }
        }
    }
});