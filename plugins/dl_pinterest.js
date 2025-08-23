const config = require('../settings');
const { malvin } = require('../malvin');
const axios = require('axios');

malvin({
    pattern: "pindl",
    alias: ["pinterestdl", "pint", "pins", "pindownload"],
    desc: "Download Pinterest videos or images",
    category: "download",
    react: "⬇️",
    filename: __filename
},
async (malvin, mek, m, { from, sender, args, reply }) => {
    try {
        if (!args[0]) return reply("Please provide a Pinterest URL\nExample: .pinterest https://pin.it/example");

        const url = args[0].includes("pin.it") || args[0].includes("pinterest.com") ? args[0] : null;
        if (!url) return reply("Invalid Pinterest URL");

        // Show processing indicator
        await malvin.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const apiUrl = `https://delirius-apiofc.vercel.app/download/pinterestdl?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl);

        if (!response.data.status || !response.data.data) {
            return reply("Failed to fetch Pinterest data. Please try again later.");
        }

        const pinData = response.data.data;
        const isVideo = pinData.download.type === "video";

        // Create buttons message
        const buttonsMessage = {
            text: `
╭──〔 🎉 ᴍᴀʟᴠɪɴ xᴅ ᴘɪɴ ᴅʟ 🎉 〕──
│
├─ 📌 ᴛɪᴛʟᴇ: ${pinData.title}
├─ 😎 ᴀᴜᴛʜᴏʀ: ${pinData.author_name} (@${pinData.username})
├─ 🔥 ʟɪᴋᴇs: ${pinData.likes}
├─ 🕒 ᴜᴘʟᴏᴀᴅ: ${pinData.upload}
│
├─ 🚀 ɢᴇᴛ ɪᴛ ɴᴏᴡ:
│   ᴘɪᴄᴋ ᴀ ᴅᴏᴡɴʟᴏᴀᴅ ᴏᴘᴛɪᴏɴ ʙᴇʟᴏᴡ
│   ᴀɴᴅ ᴇɴᴊᴏʏ ᴛʜᴇ ᴠɪʙᴇ! 😍
│
╰──〔 ✨ ᴍᴀʟᴠɪɴ xᴅ 〕──`,
            footer: config.DESCRIPTION,
            buttons: [
                {
                    buttonId: `pin-image-${url}`,
                    buttonText: { displayText: "📷 Download Image" },
                    type: 1
                }
            ],
            headerType: 1,
            image: { url: pinData.thumbnail }
        };

        if (isVideo) {
            buttonsMessage.buttons.push({
                buttonId: `pin-video-${url}`,
                buttonText: { displayText: "🎬 Download Video" },
                type: 1
            });
        }

        // Send message with buttons
        const sentMsg = await malvin.sendMessage(from, buttonsMessage, { quoted: mek });
        const messageId = sentMsg.key.id;

        // Create a listener for button responses
        const buttonHandler = async (msgData) => {
            const receivedMsg = msgData.messages[0];
            if (!receivedMsg.message?.buttonsResponseMessage) return;

            const buttonId = receivedMsg.message.buttonsResponseMessage.selectedButtonId;
            const senderId = receivedMsg.key.remoteJid;
            const isReplyToBot = receivedMsg.message.buttonsResponseMessage.contextInfo?.stanzaId === messageId;

            if (isReplyToBot && senderId === from) {
                // Remove listener to prevent multiple triggers
                malvin.ev.off("messages.upsert", buttonHandler);

                // Show processing reaction
                await malvin.sendMessage(from, { react: { text: '⏳', key: receivedMsg.key } });

                try {
                    const type = buttonId.startsWith('pin-image-') ? 'image' : 'video';
                    const pinUrl = buttonId.split('-').slice(2).join('-');

                    // Make fresh API request
                    const freshApiUrl = `https://delirius-apiofc.vercel.app/download/pinterestdl?url=${encodeURIComponent(pinUrl)}`;
                    const freshResponse = await axios.get(freshApiUrl);

                    if (!freshResponse.data.status || !freshResponse.data.data) {
                        return reply("Failed to fetch Pinterest data. Please try again later.");
                    }

                    const freshData = freshResponse.data.data;

                    if (type === "video") {
                        if (freshData.download.type !== "video") {
                            return reply("This pin doesn't contain a video.");
                        }
                        
                        await malvin.sendMessage(from, {
                            video: { url: freshData.download.url },
                            caption: `*🎥 ᴘɪɴᴛᴇʀᴇsᴛ ᴠɪᴅᴇᴏ*\n\n` +
                                     `*🔎 ᴛɪᴛᴛʟᴇ:* ${freshData.title}\n` +
                                     `*😎 ᴀᴜᴛʜᴏʀ:* ${freshData.author_name}`
                        }, { quoted: receivedMsg });
                    } else {
                        await malvin.sendMessage(from, {
                            image: { url: freshData.thumbnail },
                            caption: `*📸 ᴘɪɴᴛᴇʀᴇsᴛ ɪᴍᴀɢᴇ*\n\n` +
                                     `*🔍 ᴛɪᴛᴛʟᴇ:* ${freshData.title}\n` +
                                     `*😎 ᴀᴜᴛʜᴏʀ:* ${freshData.author_name}`
                        }, { quoted: receivedMsg });
                    }
                } catch (error) {
                    console.error("ᴘɪɴᴛᴇʀᴇsᴛ ᴅʟ ᴇʀʀᴏʀ:", error);
                    reply(`❌ ᴇʀʀᴏʀ: ${error.message}`);
                }
            }
        };

        // Add the listener
        malvin.ev.on("messages.upsert", buttonHandler);

        // Remove listener after 2 minutes if no response
        setTimeout(() => {
            malvin.ev.off("messages.upsert", buttonHandler);
        }, 120000);

    } catch (error) {
        console.error("Pinterest Download Error:", error);
        reply(`❌ Error: ${error.message}`);
    }
});


malvin({
    pattern: "pindl2",
    alias: ["pinterestdl2", "pint2", "pins2", "pindownload2", "pt", "pin2"],
    desc: "Download media from Pinterest",
    category: "download",
    react: "📌",
    filename: __filename
}, async (malvin, mek, m, { args, from, reply }) => {
    try {
        // ⏳ React: Processing Start
        await malvin.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Validate input
        if (args.length < 1) {
            await malvin.sendMessage(from, { react: { text: "⚠️", key: mek.key } });
            return reply('❎ Please provide a Pinterest URL.');
        }

        const pinterestUrl = args[0];
        const response = await axios.get(`https://delirius-apiofc.vercel.app/download/pinterestdl?url=${encodeURIComponent(pinterestUrl)}`);

        if (!response.data.status || !response.data.data) {
            await malvin.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply('❎ Failed to fetch data from Pinterest.');
        }

        const data = response.data.data;
        const title = data.title || "No title available";
        const description = data.description || "No description available";
        const mediaType = data.download?.type || "unknown";
        const mediaUrl = data.download?.url;
        const thumb = data.thumbnail;

        const caption = `> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ*`;

        if (mediaType === "video" && mediaUrl) {
            await malvin.sendMessage(from, { video: { url: mediaUrl }, caption }, { quoted: mek });
        } else if (mediaType === "image" && mediaUrl) {
            await malvin.sendMessage(from, { image: { url: mediaUrl }, caption }, { quoted: mek });
        } else {
            await malvin.sendMessage(from, { image: { url: thumb }, caption }, { quoted: mek });
        }

        // ✅ React: Completed
        await malvin.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error(e);
        await malvin.sendMessage(from, { react: { text: "❌", key: mek.key } });
        reply('❎ An error occurred while processing your request.');
    }
});
