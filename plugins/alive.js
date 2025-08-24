const { malvin } = require('../malvin');
const moment = require('moment-timezone');
const config = require('../settings');
const os = require('os');
const { runtime } = require('../lib/functions');
const { ButtonManager } = require('../button');

const botStartTime = Date.now();
const ALIVE_IMG = config.ALIVE_IMAGE || 'https://i.ibb.co/fYrXbwbf/malvin-xd.jpg';
const NEWSLETTER_JID = config.NEWSLETTER_JID || '120363402507750390@newsletter';
const AUDIO_URL = config.AUDIO_URL || 'https://files.catbox.moe/pjlpd7.mp3';

// Tiny caps mapping for lowercase letters
const tinyCapsMap = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
    j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'q', r: 'ʀ',
    s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
};

// Function to convert string to tiny caps
const toTinyCaps = (str) => {
    return str
        .split('')
        .map((char) => tinyCapsMap[char.toLowerCase()] || char)
        .join('');
};

// Format status info with tiny caps
const formatStatusInfo = (pushname, harareTime, harareDate, runtimeHours, runtimeMinutes, runtimeSeconds, config) => `
╭──〔 🔥 ᴀʟɪᴠᴇ sᴛᴀᴛᴜs 🥰 〕──
│
├─ 👋 ʜɪ, ${pushname} 🙃
│
├─ ⏰ ᴛɪᴍᴇ: ${harareTime}
├─ 📆 ᴅᴀᴛᴇ: ${harareDate}
├─ ⏳ ᴜᴘᴛɪᴍᴇ: ${runtimeHours} ʜʀs, ${runtimeMinutes} ᴍɪɴs, ${runtimeSeconds} sᴇᴄs
├─ 🧩 ʀᴀᴍ ᴜsᴀɢᴇ: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}ᴍʙ / ${Math.round(os.totalmem() / 1024 / 1024)}ᴍʙ
│
├─ 📢 ɴᴏᴛɪᴄᴇ:
│   ɪ ᴀᴍ ɴᴏᴛ ʀᴇsᴘᴏɴsɪʙʟᴇ ғᴏʀ ᴀɴʏ
│   ᴡʜᴀᴛsᴀᴘᴘ ʙᴀɴs ᴛʜᴀᴛ ᴍᴀʏ ᴏᴄᴄᴜʀ
│   ᴅᴜᴇ ᴛᴏ ᴛʜᴇ ᴜsᴀɢᴇ ᴏғ ᴛʜɪs ʙᴏᴛ.
│   ᴜsᴇ ɪᴛ ᴡɪsᴇʟʏ ᴀɴᴅ ᴀᴛ ʏᴏᴜʀ ᴏᴡɴ ʀɪsᴋ ⚠️
│
├─ 🔗 ${config.REPO || 'https://github.com/Malvin-BXD'}
│
╰───〔 🥰 〕───
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ xᴅ
`.trim();

// Help command logic (from help.js)
async function sendHelpCommand(malvin, mek, from, sender) {
    try {
        const pushname = mek.pushName || 'xᴅ ᴜsᴇʀ';
        const HELP_IMAGE = 'https://i.ibb.co/SXZwxKtx/malvin-xd.jpg';
        const formattedInfo = `
╭═✦〔 🤖 *${toTinyCaps('Bot Settings')}* 〕✦═╮
│
├ 👤 ʜᴇʟʟᴏ: ${pushname}
│
├ 🔧 *1. \`ᴍᴏᴅᴇ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.MODE || 'public')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}mode private/public
│
├ 🎯 *2. \`ᴀᴜᴛᴏ ᴛʏᴘɪɴɢ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_TYPING || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autotyping on/off
│
├ 🌐 *3. \`ᴀʟᴡᴀʏs ᴏɴʟɪɴᴇ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.ALWAYS_ONLINE || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}alwaysonline on/off
│
├ 🎙️ *4. \`ᴀᴜᴛᴏ ʀᴇᴄᴏʀᴅɪɴɢ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_RECORDING || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autorecording on/off
│
├ 📖 *5. \`ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ sᴛᴀᴛᴜs\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_STATUS_REACT || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autostatusreact on/off
│
├ 👀 *6. \`ᴀᴜᴛᴏ ᴠɪᴇᴡ sᴛᴀᴛᴜs\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_STATUS_SEEN || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autoviewstatus on/off
│
├ 🚫 *7. \`ᴀɴᴛɪ ʙᴀᴅ ᴡᴏʀᴅ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.ANTI_BAD_WORD || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}antibad on/off
│
├ 🗑️ *8. \`ᴀɴᴛɪ ᴅᴇʟᴇᴛᴇ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.ANTI_DELETE || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}antidelete on/off
│
├ 🖼️ *9. \`ᴀᴜᴛᴏ sᴛɪᴄᴋᴇʀ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_STICKER || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autosticker on/off
│
├ 💬 *10. \`ᴀᴜᴛᴏ ʀᴇᴘʟʏ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_REPLY || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autoreply on/off
│
├ 💞 *11. \`ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_REACT || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autoreact on/off
│
├ 📢 *12. \`sᴛᴀᴛᴜs ʀᴇᴘʟʏ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_STATUS_REPLY || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autostatusreply on/off
│
├ 🔗 *13. \`ᴀɴᴛɪ ʟɪɴᴋ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.ANTI_LINK || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}antilink on/off
│
├ 🤖 *14. \`ᴀɴᴛɪ ʙᴏᴛ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.ANTI_BOT || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}antibot off/warn/delete/kick
│
├ 📞 *15. \`ᴀɴᴛɪ ᴄᴀʟʟ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.ANTI_CALL || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}anticall off/on
│
├ 💖 *16. \`ʜᴇᴀʀᴛ ʀᴇᴀᴄᴛ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.HEART_REACT || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}heartreact on/off
│
├ 🔧 *17. \`sᴇᴛ ᴘʀᴇғɪx\`*
│   - ᴄᴜʀʀᴇɴᴛ: ${config.PREFIX || '.'}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}setprefix <new_prefix>
│
├ 🤖 *18. \`sᴇᴛ ʙᴏᴛ ɴᴀᴍᴇ\`*
│   - ᴄᴜʀʀᴇɴᴛ: ${toTinyCaps(config.BOT_NAME || 'SUBZERO MD')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}setbotname <new_name>
│
├ 🤴 *19. \`sᴇᴛ ᴏᴡɴᴇʀ ɴᴀᴍᴇ\`*
│   - ᴄᴜʀʀᴇɴᴛ: ${toTinyCaps(config.OWNER_NAME || 'DEE')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}setownername <owner_name>
│
├ 🖼️ *20. \`sᴇᴛ ʙᴏᴛ ɪᴍᴀɢᴇ\`*
│   - ᴄᴜʀʀᴇɴᴛ: ${toTinyCaps(config.BOT_IMAGE || 'DEFAULT IMAGE')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}setbotimage <image_url> / reply to photo
│
├ 🔄 *21. \`ᴀᴜᴛᴏ ʙɪᴏ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.AUTO_BIO || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}autobio on/off [custom text]
│
├ 🫂 *22. \`ᴡᴇʟᴄᴏᴍᴇ & ɢᴏᴏᴅʙʏᴇ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps(config.WELCOME_GOODBYE || 'off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}welcome on/off
│
├ 🤖 *23. \`ᴀɪ ᴄʜᴀᴛʙᴏᴛ\`*
│   - sᴛᴀᴛᴜs: ${toTinyCaps('off')}
│   - ᴜsᴀɢᴇ: ${config.PREFIX}chatbot on/off
│
├ 📊 *24. \`ᴘᴏʟʟ\`*
│   - ᴜsᴀɢᴇ: ${config.PREFIX}poll question;option1,option2,...
│
├ 💞 *25. \`ʀᴀɴᴅᴏᴍ sʜɪᴘ\`*
│   - ᴜsᴀɢᴇ: ${config.PREFIX}randomship
│
├ 👥 *26. \`ɴᴇᴡ ɢʀᴏᴜᴘ\`*
│   - ᴜsᴀɢᴇ: ${config.PREFIX}newgc group_name;number1,number2,...
│
├ 🚪 *27. \`ᴇxɪᴛ ɢʀᴏᴜᴘ\`*
│   - ᴜsᴀɢᴇ: ${config.PREFIX}exit
│
├ 🔗 *28. \`ɢʀᴏᴜᴘ ɪɴᴠɪᴛᴇ ʟɪɴᴋ\`*
│   - ᴜsᴀɢᴇ: ${config.PREFIX}invite2
│
├ 📢 *29. \`ʙʀᴏᴀᴅᴄᴀsᴛ\`*
│   - ᴜsᴀɢᴇ: ${config.PREFIX}broadcast <text>
│
├ 🖼️ *30. \`sᴇᴛ ɢʀᴏᴜᴘ ᴘʀᴏғɪʟᴇ ᴘɪᴄᴛᴜʀᴇ\`*
│   - ᴜsᴀɢᴇ: ${config.PREFIX}setgrouppp (reply to an image)
│
╰───

📌 *Note*: Replace "on/off" with the desired state to enable or disable a feature.

> 🤖 *Status:* ✅ *Malvin is Alive and Ready!*
🎉 *Enjoy the Service!*
        `.trim();

        const isValidImage = HELP_IMAGE && HELP_IMAGE.startsWith('http');
        if (isValidImage) {
            await malvin.sendMessage(from, {
                image: { url: HELP_IMAGE },
                caption: formattedInfo,
                contextInfo: {
                    mentionedJid: [sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: NEWSLETTER_JID,
                        newsletterName: toTinyCaps('ʜᴇʟᴘ ʟɪsᴛ'),
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });
        } else {
            await malvin.sendMessage(from, { text: formattedInfo }, { quoted: mek });
        }
    } catch (error) {
        console.error('Help Command Error:', error);
        await malvin.sendMessage(from, {
            text: `
❌ *Error:* An issue occurred while processing the help command.
🛠 *Details:* ${error.message}
Please report this issue or try again later.
            `.trim()
        }, { quoted: mek });
    }
}

malvin({
    pattern: 'alive',
    alias: ['uptime', 'runtime'],
    desc: 'Check if the bot is active.',
    category: 'info',
    react: '🚀',
    filename: __filename,
}, async (malvin, mek, m, { reply, from, sender }) => {
    try {
        const pushname = m.pushName || 'User';
        const harareTime = moment().tz('Africa/Harare').format('HH:mm:ss');
        const harareDate = moment().tz('Africa/Harare').format('dddd, MMMM Do YYYY');
        const runtimeMilliseconds = Date.now() - botStartTime;
        const runtimeSeconds = Math.floor((runtimeMilliseconds / 1000) % 60);
        const runtimeMinutes = Math.floor((runtimeMilliseconds / (1000 * 60)) % 60);
        const runtimeHours = Math.floor(runtimeMilliseconds / (1000 * 60 * 60));

        if (!ALIVE_IMG || !ALIVE_IMG.startsWith('http')) {
            throw new Error('Invalid ALIVE_IMG URL. Please set a valid image URL.');
        }

        const statusInfo = formatStatusInfo(
            pushname,
            harareTime,
            harareDate,
            runtimeHours,
            runtimeMinutes,
            runtimeSeconds,
            config
        );

        // Initialize ButtonManager
        const buttonManager = new ButtonManager(malvin);

        // Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Define buttons
        const buttons = [
            {
                buttonId: `alive-help-${sessionId}`,
                buttonText: { displayText: '❓ Help' },
                type: 1
            },
            {
                buttonId: `alive-about-${sessionId}`,
                buttonText: { displayText: 'ℹ️ About' },
                type: 1
            },
            {
                buttonId: `alive-audio-${sessionId}`,
                buttonText: { displayText: '🎵 Play Audio' },
                type: 1
            }
        ];

        // Create and send buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
            imageUrl: ALIVE_IMG,
            caption: statusInfo,
            footer: toTinyCaps('Powered by Malvin XD'),
            buttons,
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: NEWSLETTER_JID,
                    newsletterName: toTinyCaps('🔥 malvin xd 🥰'),
                    serverMessageId: 143
                }
            },
            quoted: mek
        });

        const sentMsg = await malvin.sendMessage(from, buttonsMessage);
        const messageId = sentMsg.key.id;

        // Define button actions
        const actions = {
            'alive-help': async (receivedMsg) => {
                await sendHelpCommand(malvin, receivedMsg, from, sender);
            },
            'alive-about': async (receivedMsg) => {
                await malvin.sendMessage(from, {
                    text: `
╭──⟦ℹ️ ᴀʙᴏᴜᴛ ${toTinyCaps(config.BOT_NAME || 'MALVIN XD')} ⟧
├ 
├ 📍 ᴠᴇʀsɪᴏɴ: ${config.version || '1.0.0'}
├ 🙃 ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ: ${config.DEV_NAME || 'ᴍᴀʟᴠɪɴ ᴋɪɴɢ'}
├ ℹ️ ᴍᴏᴅᴇ: ${config.MODE || 'ᴘᴜʙʟɪᴄ'}
╰───
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ xᴅ
                    `.trim(),
                    contextInfo: {
                        mentionedJid: [sender],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: NEWSLETTER_JID,
                            newsletterName: toTinyCaps('🔥 malvin xd 🥰'),
                            serverMessageId: 143
                        }
                    }
                }, { quoted: receivedMsg });
            },
            'alive-audio': async (receivedMsg) => {
                if (AUDIO_URL) {
                    await malvin.sendMessage(from, {
                        audio: { url: AUDIO_URL },
                        mimetype: 'audio/mp4',
                        ptt: true
                    }, { quoted: receivedMsg });
                } else {
                    await malvin.sendMessage(from, {
                        text: toTinyCaps('🎵 No audio configured')
                    }, { quoted: receivedMsg });
                }
            }
        };

        // Add button handler
        buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
        });

        // Send initial reaction
        await malvin.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error('❌ Error in alive command:', error.message);
        const errorMessage = toTinyCaps(`
            An error occurred while processing the alive command.
            Error Details: ${error.message}
            Please report this issue or try again later.
        `).trim();
        await malvin.sendMessage(from, { react: { text: '❌', key: mek.key } });
        await reply(errorMessage);
    }
});
