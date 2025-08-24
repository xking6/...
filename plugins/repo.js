// repo.js
const fetch = require('node-fetch');
const config = require('../settings');
const { malvin } = require('../malvin');
const { ButtonManager } = require('../button'); 

malvin({
    pattern: "repo",
    alias: ["sc", "script"],
    desc: "Fetch information about a GitHub repository.",
    react: "🪄",
    category: "info",
    filename: __filename,
},
async (malvin, mek, m, { from, reply }) => {
    const githubRepoURL = 'https://github.com/XdKing2/MALVIN-BXD';

    try {
        const [, username] = githubRepoURL.match(/github\.com\/([^/]+)\/([^/]+)/);

        // Fetch repo data from GitHub API
        const response = await fetch(`https://api.github.com/repos/XdKing2/MALVIN-XD`);
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

        const repoData = await response.json();

        // Prepare caption
        const formattedInfo = `
╭──〔 🚀 ᴍᴀʟᴠɪɴ xᴅ ʀᴇᴘᴏ 〕──
│
├─ 𖥸 *ɴᴀᴍᴇ*   : ${repoData.name}
├─ ⭐ *sᴛᴀʀs*    : ${repoData.stargazers_count}
├─ 🍴 *ғᴏʀᴋs*    : ${repoData.forks_count}
├─ 👑 *ᴏᴡɴᴇʀ*   : ᴍᴀʟᴠɪɴ ᴋɪɴɢ
├─ 📜 *ᴅᴇsᴄ* : ${repoData.description || 'ɴ/ᴀ'}
│
╰──〔 *ᴅᴇᴠ ᴍᴀʟᴠɪɴ* 〕──
`;

        // Initialize ButtonManager
        const buttonManager = new ButtonManager(malvin);

        // Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Define buttons
        const buttons = [
            {
                buttonId: `repo-visit-${sessionId}`,
                buttonText: { displayText: '🌐 Visit Repo' },
                type: 1
            },
            {
                buttonId: `repo-owner-${sessionId}`,
                buttonText: { displayText: '👑 Owner Profile' },
                type: 1
            },
            {
                buttonId: `repo-audio-${sessionId}`,
                buttonText: { displayText: '🎵 Play Intro' },
                type: 1
            }
        ];

        // Create and send buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
            imageUrl: 'https://files.catbox.moe/01f9y1.jpg',
            caption: formattedInfo,
            footer: config.FOOTER || '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ ᴋɪɴɢ',
            buttons,
            contextInfo: {
                mentionedJid: [m.sender],
                newsletterName: '🔥ᴍᴀʟᴠɪɴ-ʀᴇᴘᴏ🔥'
            },
            quoted: mek
        });

        const sentMsg = await malvin.sendMessage(from, buttonsMessage);
        const messageId = sentMsg.key.id;

        // Define button actions
        const actions = {
            'repo-visit': async (receivedMsg) => {
                await malvin.sendMessage(from, {
                    text: `🌐 Click to visit the repo: ${githubRepoURL}`,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Visit Repo',
                            body: 'Open in browser',
                            mediaType: 1,
                            mediaUrl: githubRepoURL,
                            sourceUrl: githubRepoURL
                        }
                    }
                }, { quoted: receivedMsg });
            },
            'repo-owner': async (receivedMsg) => {
                await malvin.sendMessage(from, {
                    text: `👑 Click to visit the owner profile: https://github.com/${username}`,
                    contextInfo: {
                        externalAdReply: {
                            title: 'Owner Profile',
                            body: 'Open in browser',
                            mediaType: 1,
                            mediaUrl: `https://github.com/${username}`,
                            sourceUrl: `https://github.com/${username}`
                        }
                    }
                }, { quoted: receivedMsg });
            },
            'repo-audio': async (receivedMsg) => {
                await malvin.sendMessage(from, {
                    audio: { url: 'https://files.catbox.moe/z47dgd.mp3' },
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: receivedMsg });
            }
        };

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

    } catch (error) {
        console.error("❌ Error in repo command:", error);
        await malvin.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply("⚠️ Failed to fetch repo info. Please try again later.");
    }
});
