const axios = require('axios');
const config = require('../settings');
const { malvin } = require('../malvin');
const moment = require('moment-timezone');
const { ButtonManager } = require('../button');

malvin({
    pattern: 'version',
    react: '🚀',
    desc: 'check bot version & updates 📦',
    category: 'info',
    use: '.version',
    filename: __filename
}, async (malvin, mek, m, { from, sender, reply }) => {
    try {
        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const time = moment().tz('Africa/Harare').format('HH:mm:ss');
        const date = moment().tz('Africa/Harare').format('DD/MM/YYYY');
        const localPackage = require('../package.json');
        const currentVersion = localPackage.version;

        let latestVersion = 'Unknown';
        let status = '🔍 *Remote check disabled*';

        // Check if remote version checking is enabled
        if (config.CHECK_VERSION !== false) {
            const repoUrl = config.REPO || 'https://github.com/XdKing2/MALVIN-XD';
            const repoPath = repoUrl.replace('https://github.com/', '');
            const rawUrl = `https://raw.githubusercontent.com/${repoPath}/master/package.json`;

            const { data: remotePackage } = await axios.get(rawUrl, { timeout: 15000 });
            latestVersion = remotePackage.version || 'Unknown';
            status = currentVersion === latestVersion
                ? '✅ *Up-to-date*'
                : '⚠️ *Update available*';
        }

        const caption = `
╭───[ *ʙᴏᴛ ᴠᴇʀsɪᴏɴ* ]───
│
├ *ᴄᴜʀʀᴇɴᴛ*: v${currentVersion} 📍
├ *ʟᴀᴛᴇsᴛ*: v${latestVersion} 🆕
├ *sᴛᴀᴛᴜs*: ${status}
│
├ *ᴄʜᴇᴄᴋᴇᴅ*: ${date} 🗓️
├ *ᴛɪᴍᴇ*: ${time} 🕒
│
├ *ʙᴏᴛ*: ${config.BOT_NAME || 'ᴍᴀʟᴠɪɴ-xᴅ'} 🤖
├ *ᴅᴇᴠᴇʟᴏᴘᴇʀ*: ${config.DEV_NAME || 'ᴍʀ. ᴍᴀʟᴠɪɴ ᴋɪɴɢ'} 👑
│
├ ⭐ *Star the repo to support!*
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
`;

        // Initialize ButtonManager
        const buttonManager = new ButtonManager(malvin);

        // Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Define buttons
        const buttons = [
            {
                buttonId: `version-help-${sessionId}`,
                buttonText: { displayText: '❓ Help' },
                type: 1
            },
            {
                buttonId: `version-repo-${sessionId}`,
                buttonText: { displayText: '📦 Repo' },
                type: 1
            },
            {
                buttonId: `version-check-${sessionId}`,
                buttonText: { displayText: '🔄 Check Again' },
                type: 1
            }
        ];

        // Create and send buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
            imageUrl: config.ALIVE_IMG || 'https://files.catbox.moe/01f9y1.jpg',
            caption,
            footer: config.FOOTER || '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ xᴅ ',
            buttons,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363402507750390@newsletter',
                    newsletterName: config.BOT_NAME ? `${config.BOT_NAME} Bot` : 'ᴍᴀʟᴠɪɴ-xᴅ',
                    serverMessageId: 143
                }
            },
            quoted: mek
        });

        const sentMsg = await malvin.sendMessage(from, buttonsMessage);
        const messageId = sentMsg.key.id;

        // Define button actions
        const actions = {
            'version-help': async (receivedMsg) => {
                await malvin.sendMessage(from, {
                    text: `❓ *Help*: Use .help for a list of commands or contact ${config.DEV_NAME || 'Mr. Malvin King'} for support.`
                }, { quoted: receivedMsg });
            },
            'version-repo': async (receivedMsg) => {
                await malvin.sendMessage(from, {
                    text: `📦 *Repository*: Visit ${config.REPO || 'https://github.com/XdKing2/MALVIN-XD'} to star and support ${config.BOT_NAME || 'Malvin-XD'}!`
                }, { quoted: receivedMsg });
            },
            'version-check': async (receivedMsg) => {
                try {
                    const repoUrl = config.REPO || 'https://github.com/XdKing2/MALVIN-XD';
                    const repoPath = repoUrl.replace('https://github.com/', '');
                    const rawUrl = `https://raw.githubusercontent.com/${repoPath}/master/package.json`;
                    const { data: remotePackage } = await axios.get(rawUrl, { timeout: 15000 });
                    const newLatestVersion = remotePackage.version || 'Unknown';
                    const newStatus = currentVersion === newLatestVersion
                        ? '✅ *Up-to-date*'
                        : '⚠️ *Update available*';
                    await malvin.sendMessage(from, {
                        text: `🔄 *Version Check*:\n- Current: v${currentVersion}\n- Latest: v${newLatestVersion}\n- Status: ${newStatus}`
                    }, { quoted: receivedMsg });
                } catch (error) {
                    await malvin.sendMessage(from, {
                        text: `❎ *Error checking version*: ${error.message || 'Failed to fetch latest version'}`
                    }, { quoted: receivedMsg });
                }
            }
        };

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        await malvin.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (error) {
        console.error('❌ Version check error:', error);

        const localVersion = require('../package.json').version;
        const caption = `
╭───[ *ᴠᴇʀsɪᴏɴ ᴇʀʀᴏʀ* ]───
│
├ *ʟᴏᴄᴀʟ ᴠᴇʀsɪᴏɴ*: v${localVersion} 📍
├ *ᴇʀʀᴏʀ*: ${error.message || 'unknown error'} ❌
├ *ʀᴇᴘᴏ*: ${config.REPO || 'not configured'} 📦
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
> *powered by malvin* ♡`;

        await reply(caption);
        await malvin.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});