/*
🔧 Project      : MALVIN-XD
👑 Creator      : Malvin King (Mr. Lord Malvin)
📦 Repository   : https://github.com/XdKing2/MALVIN-XD
📞 Support      : https://wa.me/263714757857
*/

const { malvin } = require('../malvin');
const config = require('../settings');

// Fake ChatGPT vCard
const fakevCard = {
    key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast"
    },
    message: {
        contactMessage: {
            displayName: "© ᴍᴀʟᴠɪɴ ᴀɪ",
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Meta
ORG:META AI;
TEL;type=CELL;type=VOICE;waid=13135550002:+13135550002
END:VCARD`
        }
    }
};

malvin({
  pattern: "owner",
  react: "📞",
  desc: "Send bot owner's contact",
  category: "main",
  filename: __filename
}, async (malvin, mek, m, { from, reply }) => {
  try {
    const ownerName = config.OWNER_NAME || "Malvin King";
    const ownerNumber = config.OWNER_NUMBER || "263714757857";

    // Build vCard contact
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${ownerName}`,
      `TEL;type=CELL;type=VOICE;waid=${ownerNumber.replace('+', '')}:${ownerNumber}`,
      "END:VCARD"
    ].join('\n');

    // Send vCard contact
    await malvin.sendMessage(from, {
      contacts: {
        displayName: ownerName,
        contacts: [{ vcard }]
      }
    });

    // Send image + caption
    await malvin.sendMessage(from, {
      image: { url: 'https://files.catbox.moe/01f9y1.jpg' },
      caption: `
╭── ❍ 𝙼𝙰𝙻𝚅𝙸𝙽-𝚇𝙳 ❍
│  𝙽𝚊𝚖𝚎   : *${ownerName}*
│  𝙽𝚞𝚖𝚋𝚎𝚛 : *${ownerNumber}*
│  𝚅𝚎𝚛𝚜𝚒𝚘𝚗 : *${config.version || 'Unknown'}*
╰─────────⭓
> Stay connected for 🔥 updates!`,
      contextInfo: {
        mentionedJid: [`${ownerNumber.replace('+', '')}@s.whatsapp.net`],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: config.NEWSLETTER_JID || '120363420989526190@newsletter',
          newsletterName: config.OWNER_NAME || 'Malvin King',
          serverMessageId: 143
        }
      }
    }, { quoted: fakevCard });

  } catch (error) {
    console.error("❌ Error in .owner command:", error);
    reply(`⚠️ An error occurred: ${error.message}`);
  }
});


