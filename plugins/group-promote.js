const { malvin } = require('../malvin');
const config = require('../settings');
const moment = require('moment-timezone');

malvin({
    pattern: 'promote',
    alias: ['p', 'makeadmin'],
    desc: 'Promotes a member to group admin',
    category: 'admin',
    react: '⬆️',
    filename: __filename,
    usage: `${config.PREFIX}promote <number/reply>`
}, async (malvin, mek, m, { from, quoted, q, isGroup, sender, botNumber, isBotAdmins, isAdmins, reply, isOwner }) => {
    try {
        if (!isGroup) return reply("❌ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴄᴀɴ ᴏɴʟʏ ʙᴇ ᴜsᴇᴅ ɪɴ ɢʀᴏᴜᴘs");
        if (!isBotAdmins) return reply("❌ ɪ ɴᴇᴇᴅ ᴛᴏ ʙᴇ ᴀɴ ᴀᴅᴍɪɴ ᴛᴏ ᴘʀᴏᴍᴏᴛᴇ sᴏᴍᴇᴏɴᴇ");

        // Fetch fresh group metadata to verify admin status
        const groupMetadata = isGroup ? await malvin.groupMetadata(from) : null;
        const participants = groupMetadata?.participants || [];
        const isSenderAdmin = participants.some(p => p.id === sender && p.admin);

        if (!isSenderAdmin && !isOwner) {
            return reply("❌ ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴏʀ ᴛʜᴇ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ");
        }

        let number;
        if (quoted) {
            number = quoted.sender.split('@')[0];
        } else if (q && /^\+?\d{7,15}$/.test(q.replace(/[@\s+]/g, ''))) {
            number = q.replace(/[@\s+]/g, '');
        } else {
            return reply(
                `╭═✦〔 🤖 *ᴘʀᴏᴍᴏᴛᴇ* 〕✦═╮\n` +
                `│\n` +
                `│ 📜 *ᴜsᴀɢᴇ:*\n` +
                `│ ➸ ${config.PREFIX}promote <number/reply>\n` +
                `│\n` +
                `│ 💡 *ᴇxᴀᴍᴘʟᴇ:*\n` +
                `│ ➸ ${config.PREFIX}promote 263714757857\n` +
                `│ ➸ Reply to a message\n` +
                `╰═⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬═╯`
            );
        }

        if (number === botNumber.split('@')[0]) {
            return reply("❌ ɪ ᴄᴀɴ'ᴛ ᴘʀᴏᴍᴏᴛᴇ ᴍʏsᴇʟғ");
        }

        const jid = `${number}@s.whatsapp.net`;

        // Check if user is in the group
        const isInGroup = participants.some(p => p.id === jid);
        if (!isInGroup) {
            return reply("❌ ᴛʜᴇ ᴜsᴇʀ ɪs ɴᴏᴛ ɪɴ ᴛʜɪs ɢʀᴏᴜᴘ");
        }

        // Check if user is already an admin
        const isAlreadyAdmin = participants.some(p => p.id === jid && p.admin);
        if (isAlreadyAdmin) {
            return reply(`ℹ️ @${number} ɪs ᴀʟʀᴇᴀᴅʏ ᴀɴ ᴀᴅᴍɪɴ`, { mentions: [jid] });
        }

        // Promote user
        await malvin.groupParticipantsUpdate(from, [jid], 'promote');

        // Send success message with timestamp
        const timestamp = moment().tz(config.TIMEZONE || 'Africa/Harare').format('DD/MM/YYYY HH:mm:ss');
        await malvin.sendMessage(from, {
            text: `╭═✦〔 🤖 *ᴘʀᴏᴍᴏᴛᴇ* 〕✦═╮\n` +
                  `│\n` +
                  `│ ✅ *sᴜᴄᴄᴇss*\n` +
                  `│ ➸ @${number} ᴘʀᴏᴍᴏᴛᴇᴅ ᴛᴏ ᴀᴅᴍɪɴ\n` +
                  `│ ⏰ *ᴛɪᴍᴇ*: ${timestamp}\n` +
                  `╰═⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬⚬═╯`,
            mentions: [jid],
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.NEWSLETTER_JID || '120363402507750390@newsletter',
                    newsletterName: config.OWNER_NAME || 'MALVIN KING',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (error) {
        console.error('❌ Promote command error:', error.message);
        let errorMsg = '❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴘʀᴏᴍᴏᴛᴇ ᴛʜᴇ ᴍᴇᴍʙᴇʀ.';
        if (error.message.includes('not-authorized')) {
            errorMsg += ' ɪɴsᴜғғɪᴄɪᴇɴᴛ ᴘᴇʀᴍɪssɪᴏɴs.';
        } else if (error.message.includes('not-in-group')) {
            errorMsg += ' ᴜsᴇʀ ɴᴏᴛ ɪɴ ɢʀᴏᴜᴘ.';
        } else {
            errorMsg += ' ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ.';
        }
        await reply(errorMsg);
    }
});