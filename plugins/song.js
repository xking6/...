const { malvin } = require('../malvin');
const axios = require('axios');
const yts = require('yt-search');
const Config = require('../settings');
const { ButtonManager } = require('../button');

// Optimized axios instance
const axiosInstance = axios.create({
    timeout: 15000,
    maxRedirects: 5,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});

// Kaiz-API configuration
const KAIZ_API_KEY = 'cf2ca612-296f-45ba-abbc-473f18f991eb'; // Replace if needed
const KAIZ_API_URL = 'https://kaiz-apis.gleeze.com/api/ytdown-mp3';

// Utility function to fetch YouTube video info
async function fetchVideoInfo(text) {
    const isYtUrl = text.match(/(youtube\.com|youtu\.be)/i);
    if (isYtUrl) {
        const videoId = text.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
        if (!videoId) throw new Error('Invalid YouTube URL format');
        const videoInfo = await yts({ videoId });
        if (!videoInfo) throw new Error('Could not fetch video info');
        return { url: `https://youtu.be/${videoId}`, info: videoInfo };
    } else {
        const searchResults = await yts(text);
        if (!searchResults?.videos?.length) throw new Error('No results found');
        const validVideos = searchResults.videos.filter(v => !v.live && v.seconds < 7200 && v.views > 10000);
        if (!validVideos.length) throw new Error('Only found live streams/unpopular videos');
        return { url: validVideos[0].url, info: validVideos[0] };
    }
}

// Utility function to fetch audio from Kaiz-API
async function fetchAudioData(videoUrl) {
    const apiUrl = `${KAIZ_API_URL}?url=${encodeURIComponent(videoUrl)}&apikey=${KAIZ_API_KEY}`;
    const response = await axiosInstance.get(apiUrl);
    if (!response.data?.download_url) throw new Error('Invalid API response');
    return response.data;
}

// Utility function to fetch thumbnail
async function fetchThumbnail(thumbnailUrl) {
    if (!thumbnailUrl) return null;
    try {
        const response = await axiosInstance.get(thumbnailUrl, { responseType: 'arraybuffer', timeout: 8000 });
        return Buffer.from(response.data, 'binary');
    } catch (e) {
        console.error('Thumbnail error:', e);
        return null;
    }
}

// Utility function to send audio
async function sendAudio(malvin, chat, audioBuffer, fileName, type, caption, quoted) {
    const message = type === 'audio'
        ? { audio: audioBuffer, mimetype: 'audio/mpeg', fileName, ptt: false }
        : { document: audioBuffer, mimetype: 'audio/mpeg', fileName };
    await malvin.sendMessage(chat, { ...message, caption }, { quoted });
}

malvin(
    {
        pattern: 'song',
        alias: ['ytaudio', 'music'],
        desc: 'High quality YouTube audio downloader',
        category: 'media',
        react: '🎵',
        use: '<YouTube URL or search query>',
        filename: __filename,
    },
    async (malvin, mek, m, { text, reply }) => {
        try {
            if (!text) {
                await malvin.sendMessage(mek.chat, { react: { text: '⚠️', key: mek.key } });
                return reply('🎵 *Usage:* .song <query/url>\nExample: .song https://youtu.be/ox4tmEV6-QU\n.song Alan Walker faded');
            }

            // Send processing reaction
            await malvin.sendMessage(mek.chat, { react: { text: '⏳', key: mek.key } });

            // Fetch video info
            const { url: videoUrl, info: videoInfo } = await fetchVideoInfo(text);

            // Fetch audio data
            const songData = await fetchAudioData(videoUrl);

            // Fetch thumbnail
            const thumbnailBuffer = await fetchThumbnail(videoInfo.thumbnail);

            // Prepare ASCII-art message
            const caption = ` 
 =🎉 ᴍᴀʟᴠɪɴ xᴅ sᴏɴɢ ᴅʟ 🎉

├─ 📌 ᴛɪᴛʟᴇ: ${songData.title || videoInfo?.title || 'Unknown'}
├─ 😎 ᴀᴜᴛʜᴏʀ: ${videoInfo?.author?.name || 'Unknown'}
├─ ⏱️ ᴅᴜʀᴀᴛɪᴏɴ: ${videoInfo?.timestamp || 'Unknown'}
├─ 👁️ ᴠɪᴇᴡs: ${videoInfo?.views?.toLocaleString() || 'Unknown'}
├─ 🕒 ᴘᴜʙʟɪsʜᴇᴅ: ${videoInfo?.ago || 'Unknown'}
├─ 🔗 ᴜʀʟ: ${videoUrl || 'Unknown'}
│
├─ 🚀 ɢᴇᴛ ɪᴛ ɴᴏᴡ:
│   ᴄʜᴏᴏsᴇ ʏᴏᴜʀ ᴅᴏᴡɴʟᴏᴀᴅ ᴛʏᴘᴇ ʙᴇʟᴏᴡ
│   ᴀɴᴅ ᴇɴᴊᴏʏ ᴛʜᴇ ᴠɪʙᴇ! 😍
│
├─ ⚠️ ɴᴏᴛɪᴄᴇ:
│   ᴜsᴇ ᴡɪsᴇʟʏ, ᴍᴀʟᴠɪɴ xᴅ ɪs ɴᴏᴛ
│   ʀᴇsᴘᴏɴsɪʙʟᴇ ғᴏʀ ᴀɴʏ ɪssᴜᴇs.
│
╰──〔 ✨ ᴍᴀʟᴠɪɴ xᴅ 〕──`;

            // Initialize ButtonManager
            const buttonManager = new ButtonManager(malvin);

            // Generate unique session ID
            const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Create buttons message
            const buttonsMessage = buttonManager.createButtonsMessage({
                imageUrl: thumbnailBuffer,
                caption,
                footer: Config.FOOTER || '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ ',
                buttons: [
                    {
                        buttonId: `song-audio-${sessionId}-${encodeURIComponent(videoUrl)}`,
                        buttonText: { displayText: '🎵 Audio (Play)' },
                        type: 1
                    },
                    {
                        buttonId: `song-document-${sessionId}-${encodeURIComponent(videoUrl)}`,
                        buttonText: { displayText: '📁 Document (Save)' },
                        type: 1
                    }
                ],
                contextInfo: {
                    externalAdReply: {
                        title: songData.title || videoInfo?.title || 'YouTube Audio',
                        body: `Duration: ${videoInfo?.timestamp || 'N/A'}`,
                        thumbnail: thumbnailBuffer,
                        mediaType: 1,
                        mediaUrl: videoUrl,
                        sourceUrl: videoUrl
                    }
                },
                quoted: mek
            });

            // Send message with buttons
            const sentMsg = await malvin.sendMessage(mek.chat, buttonsMessage);
            const messageId = sentMsg.key.id;

            // Define button actions
            const actions = {
                'song-audio': async (receivedMsg) => {
                    const freshSongData = await fetchAudioData(videoUrl);
                    const audioResponse = await axiosInstance.get(freshSongData.download_url, {
                        responseType: 'arraybuffer',
                        headers: { Referer: 'https://www.youtube.com/', 'Accept-Encoding': 'identity' },
                        timeout: 30000
                    });
                    const audioBuffer = Buffer.from(audioResponse.data, 'binary');
                    const fileName = `${(freshSongData.title || videoInfo?.title || 'audio').replace(/[<>:"\/\\|?*]+/g, '')}.mp3`;
                    await sendAudio(malvin, mek.chat, audioBuffer, fileName, 'audio', caption, receivedMsg);
                },
                'song-document': async (receivedMsg) => {
                    const freshSongData = await fetchAudioData(videoUrl);
                    const audioResponse = await axiosInstance.get(freshSongData.download_url, {
                        responseType: 'arraybuffer',
                        headers: { Referer: 'https://www.youtube.com/', 'Accept-Encoding': 'identity' },
                        timeout: 30000
                    });
                    const audioBuffer = Buffer.from(audioResponse.data, 'binary');
                    const fileName = `${(freshSongData.title || videoInfo?.title || 'audio').replace(/[<>:"\/\\|?*]+/g, '')}.mp3`;
                    await sendAudio(malvin, mek.chat, audioBuffer, fileName, 'document', caption, receivedMsg);
                }
            };

            // Add button handler
            buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
                buttonManager.handleAction(receivedMsg, buttonId, actions);
            });

            // Send success reaction
            await malvin.sendMessage(mek.chat, { react: { text: '✅', key: mek.key } });

        } catch (error) {
            console.error('Song Command Error:', error);
            await malvin.sendMessage(mek.chat, { react: { text: '❌', key: mek.key } });
            await reply(`❎ Error: ${error.message || 'An unexpected error occurred'}`);
        }
    }
);