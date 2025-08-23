const { malvin } = require('../malvin');
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { ButtonManager } = require('../button');

// In-memory store for video sessions and cache
const videoSessions = new Map();
const cache = new Map(); // Added cache declaration to fix error

// Tiny caps converter (for consistency with menu.js, alive.js, etc.)
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

// Normalize YouTube URL
function normalizeYouTubeUrl(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
    return match ? `https://youtube.com/watch?v=${match[1]}` : null;
}

// Get video ID
function getVideoId(url) {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/.*[?&]v=)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
}

// Download and validate video
async function downloadAndValidateVideo(url, retries = 2) {
    try {
        // Check content type
        try {
            const headResponse = await axios.head(url, { timeout: 10000 });
            const contentType = headResponse.headers['content-type'];
            if (!contentType.includes('video/') && !contentType.includes('application/octet-stream')) {
                console.error(`Invalid content type: ${contentType}`);
                if (retries > 0) return downloadAndValidateVideo(url, retries - 1);
                return null;
            }
        } catch (error) {
            console.warn(`Header check failed: ${error.message}, proceeding with download...`);
        }

        // Download video
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `video_${Date.now()}.mp4`);
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            timeout: 30000,
        });

        const writer = require('fs').createWriteStream(tempFile);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // Validate file size
        const stats = await fs.stat(tempFile);
        if (stats.size < 100000) {
            console.error('Downloaded file is too small:', stats.size);
            await fs.unlink(tempFile).catch(() => {});
            if (retries > 0) return downloadAndValidateVideo(url, retries - 1);
            return null;
        }

        return tempFile;
    } catch (error) {
        console.error(`Failed to download video: ${error.message}`);
        if (retries > 0) {
            console.log(`Retrying download... Attempts left: ${retries}`);
            return downloadAndValidateVideo(url, retries - 1);
        }
        return null;
    }
}

// Check progress
async function checkProgress(progressUrl, retries = 10) {
    try {
        const progressEndpoint = `https://chathuraytdl.netlify.app/.netlify/functions/ytdl?action=progress&url=${encodeURIComponent(progressUrl)}`;
        const response = await axios.get(progressEndpoint, { timeout: 10000 });
        const data = response.data;

        if (data.success && data.processing_status === 'completed' && data.download_url) {
            return { download_url: data.download_url, status: 'completed' };
        } else if (data.success && data.processing_status !== 'completed') {
            console.log(`Processing: ${data.processing_status || 'in progress'}`);
            if (retries > 0) {
                await new Promise((resolve) => setTimeout(resolve, 10000));
                return checkProgress(progressUrl, retries - 1);
            }
        }
        return null;
    } catch (error) {
        console.error(`Progress check failed: ${error.message}`);
        if (retries > 0) {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            return checkProgress(progressUrl, retries - 1);
        }
        return null;
    }
}

// Fetch video data
async function fetchVideoData(url, format, retries = 2) {
    const cacheKey = `${getVideoId(url)}:${format}`;
    if (cache.has(cacheKey)) {
        console.log(`Using cached data for: ${url} (${format})`);
        return cache.get(cacheKey);
    }

    try {
        const apiUrl = `https://chathuraytdl.netlify.app/ytdl?url=${encodeURIComponent(url)}&format=${format}`;
        console.log(`Fetching from API: ${apiUrl}`);
        const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        const data = response.data;
        if (data.success && data.download_url && data.processing_status === 'completed') {
            const result = {
                download_url: data.download_url,
                title: data.info.title || '',
                thumbnail: data.info.image || `https://i.ytimg.com/vi/${getVideoId(url)}/hqdefault.jpg`,
            };
            cache.set(cacheKey, result);
            setTimeout(() => cache.delete(cacheKey), 3600000);
            return result;
        } else if (data.success && data.progress_url) {
            console.log('Checking progress...');
            const progressResult = await checkProgress(data.progress_url);
            if (progressResult && progressResult.status === 'completed') {
                const result = {
                    download_url: progressResult.download_url,
                    title: data.info.title || '',
                    thumbnail: data.info.image || `https://i.ytimg.com/vi/${getVideoId(url)}/hqdefault.jpg`,
                };
                cache.set(cacheKey, result);
                setTimeout(() => cache.delete(cacheKey), 3600000);
                return result;
            }
        }
        throw new Error('Failed to get download link');
    } catch (error) {
        console.error(`API fetch failed: ${error.message}`);
        if (retries > 0) {
            console.log(`Retrying API fetch... (${retries} left)`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return fetchVideoData(url, format, retries - 1);
        }
        return null;
    }
}

// Search YouTube
async function searchYouTube(query, maxResults = 10) {
    const cacheKey = `search:${query}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    try {
        const searchResults = await yts({ query, pages: 1 });
        const videos = searchResults.videos.slice(0, maxResults);
        cache.set(cacheKey, videos);
        setTimeout(() => cache.delete(cacheKey), 1800000);
        return videos;
    } catch (error) {
        console.error(`Search error: ${error.message}`);
        return [];
    }
}

// Send video thumbnail with buttons
async function sendVideoWithButtons(malvin, mek, from, sender, ytdata, currentIndex, searchResults, sessionId) {
    const { title, thumbnail, timestamp, url, author, views, ago } = ytdata;
    const caption = `
╭───[ *xᴅ ᴠɪᴅᴇᴏ ᴅʟ* ]───
│
├ *ᴛɪᴛʟᴇ*: ${title || 'Unknown'} 📌
├ *ᴄʜᴀɴɴᴇʟ*: ${author?.name || 'Unknown'} 🎬
├ *ᴠɪᴇᴡs*: ${views || 'N/A'} 👁️
├ *ᴅᴜʀᴀᴛɪᴏɴ*: ${timestamp || 'N/A'} ⏱️
├ *ᴜᴘʟᴏᴀᴅᴇᴅ*: ${ago || 'N/A'} 🕒
├ *ᴜʀʟ*: ${url || 'Unknown'} 🔗
├ *ʀᴇsᴜʟᴛ*: ${currentIndex + 1} of ${searchResults.length} 🔢
│
├ *ɢᴇᴛ ɪᴛ ɴᴏᴡ*: choose your download type below and enjoy the vibe! 😍
│
╰───[ *ᴍᴀʟᴠɪɴ-xᴅ* ]───
>`;

    const buttonManager = new ButtonManager(malvin);
    const buttons = [
        {
            buttonId: `video-v144-${sessionId}-${encodeURIComponent(url)}`,
            buttonText: { displayText: '🎬 Video 144p' },
            type: 1
        },
        {
            buttonId: `video-v360-${sessionId}-${encodeURIComponent(url)}`,
            buttonText: { displayText: '🎬 Video 360p' },
            type: 1
        },
        {
            buttonId: `video-v720-${sessionId}-${encodeURIComponent(url)}`,
            buttonText: { displayText: '🎬 Video 720p' },
            type: 1
        },
        {
            buttonId: `video-d144-${sessionId}-${encodeURIComponent(url)}`,
            buttonText: { displayText: '📁 Document 144p' },
            type: 1
        },
        {
            buttonId: `video-d360-${sessionId}-${encodeURIComponent(url)}`,
            buttonText: { displayText: '📁 Document 360p' },
            type: 1
        },
        {
            buttonId: `video-d720-${sessionId}-${encodeURIComponent(url)}`,
            buttonText: { displayText: '📁 Document 720p' },
            type: 1
        },
        {
            buttonId: `video-next-${sessionId}`,
            buttonText: { displayText: '➡️ Next Video' },
            type: 1
        },
        {
            buttonId: `video-end-${sessionId}`,
            buttonText: { displayText: '🛑 End' },
            type: 1
        }
    ];

    const buttonsMessage = buttonManager.createButtonsMessage({
        imageUrl: thumbnail,
        caption,
        footer: toTinyCaps('> powered by malvin'),
        buttons,
        contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363402507750390@newsletter',
                newsletterName: toTinyCaps('malvin xd'),
                serverMessageId: 143
            },
            externalAdReply: {
                title: title || 'YouTube Video',
                body: `Duration: ${timestamp || 'N/A'}`,
                thumbnailUrl: thumbnail,
                mediaType: 2,
                mediaUrl: url,
                sourceUrl: url
            }
        },
        quoted: mek
    });

    const sentMsg = await malvin.sendMessage(from, buttonsMessage);
    const messageId = sentMsg.key.id;

    // Store session data
    videoSessions.set(sessionId, { searchResults, currentIndex, sender, from });

    // Define button actions
    const actions = {
        'video-v144': async (receivedMsg) => {
            await downloadAndSendVideo(malvin, receivedMsg, from, url, title, '144', false);
        },
        'video-v360': async (receivedMsg) => {
            await downloadAndSendVideo(malvin, receivedMsg, from, url, title, '360', false);
        },
        'video-v720': async (receivedMsg) => {
            await downloadAndSendVideo(malvin, receivedMsg, from, url, title, '720', false);
        },
        'video-d144': async (receivedMsg) => {
            await downloadAndSendVideo(malvin, receivedMsg, from, url, title, '144', true);
        },
        'video-d360': async (receivedMsg) => {
            await downloadAndSendVideo(malvin, receivedMsg, from, url, title, '360', true);
        },
        'video-d720': async (receivedMsg) => {
            await downloadAndSendVideo(malvin, receivedMsg, from, url, title, '720', true);
        },
        'video-next': async (receivedMsg) => {
            const session = videoSessions.get(sessionId);
            if (!session) {
                await malvin.sendMessage(from, {
                    text: toTinyCaps('session expired, please use .video again') + ' 😔'
                }, { quoted: receivedMsg });
                return;
            }

            const { searchResults, currentIndex, sender, from } = session;
            const nextIndex = currentIndex + 1;

            if (nextIndex >= searchResults.length) {
                await malvin.sendMessage(from, {
                    text: toTinyCaps('no more videos available') + ' 😔\n' + toTinyCaps('use .video again to start a new search')
                }, { quoted: receivedMsg });
                videoSessions.delete(sessionId);
                return;
            }

            try {
                await sendVideoWithButtons(malvin, receivedMsg, from, sender, searchResults[nextIndex], nextIndex, searchResults, sessionId);
                videoSessions.set(sessionId, { searchResults, currentIndex: nextIndex, sender, from });
            } catch (err) {
                console.error('Next video error:', err);
                await malvin.sendMessage(from, {
                    text: toTinyCaps('failed to load next video') + ' 😞'
                }, { quoted: receivedMsg });
            }
        },
        'video-end': async (receivedMsg) => {
            await malvin.sendMessage(from, {
                text: toTinyCaps('video search session ended') + ' ✅\n' + toTinyCaps('use .video to start a new search')
            }, { quoted: receivedMsg });
            videoSessions.delete(sessionId);
        }
    };

    buttonManager.addHandler(messageId, sessionId, (receivedMsg, buttonId) => {
        buttonManager.handleAction(receivedMsg, buttonId, actions);
    });
}

// Download and send video
async function downloadAndSendVideo(malvin, mek, from, url, title, format, isDocument) {
    const data = await fetchVideoData(url, format);
    if (!data || !data.download_url) {
        await malvin.sendMessage(from, {
            text: toTinyCaps('download link not found') + ' 😞\n' + toTinyCaps('try again later')
        }, { quoted: mek });
        return;
    }

    const tempFile = await downloadAndValidateVideo(data.download_url);
    if (!tempFile) {
        await malvin.sendMessage(from, {
            text: toTinyCaps('failed to download video') + ' 😞\n' + toTinyCaps('the video file might be corrupted')
        }, { quoted: mek });
        return;
    }

    try {
        const fileName = `${(title || 'video').replace(/[<>:"\/\\|?*]+/g, '')}_${format}p.mp4`;
        const caption = toTinyCaps(`${title || 'video'} - ${format}p ${isDocument ? '(document)' : ''}`);
        const message = isDocument
            ? {
                  document: { url: tempFile },
                  mimetype: 'video/mp4',
                  fileName,
                  caption,
                  contextInfo: {
                      externalAdReply: {
                          title: title || 'YouTube Video',
                          body: `Video Downloader - ${format}p`,
                          thumbnailUrl: data.thumbnail,
                          sourceUrl: url,
                      },
                  },
              }
            : {
                  video: { url: tempFile },
                  mimetype: 'video/mp4',
                  fileName,
                  caption,
                  contextInfo: {
                      externalAdReply: {
                          title: title || 'YouTube Video',
                          body: `Video Downloader - ${format}p`,
                          thumbnailUrl: data.thumbnail,
                          sourceUrl: url,
                      },
                  },
              };

        await malvin.sendMessage(from, message, { quoted: mek });
        await malvin.sendMessage(from, { react: { text: isDocument ? '📁' : '🎥', key: mek.key } });
        await fs.unlink(tempFile).catch(() => {});
    } catch (error) {
        console.error('Send video error:', error);
        await malvin.sendMessage(from, {
            text: toTinyCaps('error sending video') + `: ${error.message || 'unknown error'} 😞`
        }, { quoted: mek });
        await fs.unlink(tempFile).catch(() => {});
    }
}

malvin({
    pattern: 'video',
    alias: ['ytvideo4', 'mp4', 'ytmp4'],
    react: '🎬',
    desc: 'download enchanted videos from youtube 📷',
    category: 'media',
    use: '.video <query>',
    filename: __filename
}, async (malvin, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) {
            await reply(toTinyCaps('please provide a video name or url') + '\n' + toTinyCaps('example: .video alan walker faded') + ' 😔');
            await malvin.sendMessage(from, { react: { text: '⚠️', key: mek.key } });
            return;
        }

        await malvin.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        await reply(toTinyCaps(`searching for *${q}*`) + ' 🔍');

        const url = normalizeYouTubeUrl(q);
        let searchResults;

        if (url) {
            searchResults = await searchYouTube(url);
            if (!searchResults.length) {
                await reply(toTinyCaps('video not found') + ' 😔');
                await malvin.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return;
            }
        } else {
            searchResults = await searchYouTube(q);
            if (!searchResults.length) {
                await reply(toTinyCaps('no videos found matching your query') + ' 😔');
                await malvin.sendMessage(from, { react: { text: '❌', key: mek.key } });
                return;
            }
        }

        await reply(toTinyCaps(`found *${searchResults.length}* videos for *${q}*`) + ' ✅');

        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await sendVideoWithButtons(malvin, mek, from, sender, searchResults[0], 0, searchResults, sessionId);
        await malvin.sendMessage(from, { react: { text: '✅', key: mek.key } });

    } catch (error) {
        console.error('Video Command Error:', error);
        await reply(toTinyCaps('error') + `: ${error.message || 'unknown error'} 😞`);
        await malvin.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});