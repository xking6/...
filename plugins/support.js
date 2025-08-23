/*
Project Name : MALVIN XD
Creator      : Malvin King
Repo         : https://github.com/XdKing2/MALVIN-XD
Support      : wa.me/263714757857
*/

const config = require('../settings');
const { malvin } = require('../malvin');
const { runtime } = require('../lib/functions');

const more = String.fromCharCode(8206);
const readMore = more.repeat(100); // Compact expandable section

malvin({
    pattern: "support",
    alias: ["follow", "links"],
    desc: "Display support and follow links for MALVIN XD",
    category: "main",
    react: "📡",
    filename: __filename
}, 
async (malvin, mek, m, {
    from, reply, pushname
}) => {
    try {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const uptimeFormatted = runtime(process.uptime());

        const message = `
╭──❖ *ᴍᴀʟᴠɪɴ xᴅ ꜱᴜᴘᴘᴏʀᴛ* ❖──╮
│
│ 👨‍💻 *ᴅᴇᴠᴇʟᴏᴘᴇʀ*: ᴍᴀʟᴠɪɴ ᴋɪɴɢ 🇿🇼
│ ⚙️ *ᴍᴏᴅᴇ*:  ${config.MODE}
│ ⏳ *ᴜᴘᴛɪᴍᴇ*:  ${uptimeFormatted}
│ 🔑 *ᴘʀᴇꜰɪx*:  ${config.PREFIX}
│ 🛠️ *ᴠᴇʀꜱɪᴏɴ*:  ${config.version}
│ 🕒 *ᴛɪᴍᴇ*:  ${currentTime}
│
╰────────────────╯

✨ *ᴄᴏɴɴᴇᴄᴛ ᴡɪᴛʜ ᴍᴀʟᴠɪɴ xᴅ* ${readMore}

🔔 *ᴡʜᴀᴛꜱᴀᴘᴘ ᴄʜᴀɴɴᴇʟ*  
🔗 https://whatsapp.com/channel/0029VbB3YxTDJ6H15SKoBv3S

🎥 *ʏᴏᴜᴛᴜʙᴇ ᴄʜᴀɴɴᴇʟ*  
🔗 https://youtube.com/@malvintech2

📞 *ᴄᴏɴᴛᴀᴄᴛ ᴅᴇᴠᴇʟᴏᴘᴇʀ*  
🔗 wa.me/263714757857?text=Hi%20Malvin,%20I%20need%20support!

 💡 *ᴊᴏɪɴ ᴛʜᴇ xᴅ ᴄᴏᴍᴍᴜɴɪᴛʏ!*
 
> 🚀 *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ ᴋɪɴɢ*  
  

        `.trim();

        await malvin.sendMessage(from, {
            image: { url: 'https://i.ibb.co/cSz0G58r/malvin-xd.jpg' },
            caption: message,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363402507750390@newsletter',
                    newsletterName: '🪀 ᴍᴀʟᴠɪɴ-xᴅ 🪀',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Support Cmd Error:", e);
        reply(`⚠️ Error: ${e.message}`);
    }
});