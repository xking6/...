const config = require('./settings');
const malvin = require('./malvin');
// Tiny caps converter (for consistent error message formatting)
const toTinyCaps = (text) => {
    const tinyCapsMap = {
        a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
        j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'q', r: 'ʀ',
        s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
    };
    return text.toLowerCase().split('').map(c => tinyCapsMap[c] || c).join('');
};

class ButtonManager {
    constructor(malvin) {
        this.malvin = malvin;
        this.handlers = new Map();
    }

    // Create a buttons message
    createButtonsMessage(options) {
        const {
            imageUrl,
            caption,
            footer,
            buttons,
            contextInfo = {},
            quoted // Ensure quoted is passed through
        } = options;

        // Default contextInfo with forwarded appearance
        const defaultContextInfo = {
            mentionedJid: contextInfo.mentionedJid || [],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: config.NEWSLETTER_JID || '120363420989526190@newsletter', // Align with .menu
                newsletterName: config.OWNER_NAME || 'Malvin King',
                serverMessageId: 143
            }
        };

        // Merge provided contextInfo with defaults
        const mergedContextInfo = {
            ...defaultContextInfo,
            ...contextInfo,
            mentionedJid: contextInfo.mentionedJid || defaultContextInfo.mentionedJid
        };

        return {
            image: imageUrl ? (Buffer.isBuffer(imageUrl) ? imageUrl : { url: imageUrl }) : undefined,
            caption,
            footer,
            buttons,
            headerType: imageUrl ? 4 : 1, // Image header if imageUrl is provided
            contextInfo: mergedContextInfo,
            quoted // Include quoted in the message object
        };
    }

    // Add button handler
    addHandler(messageId, sessionId, callback) {
        const handler = async (msgData) => {
            const receivedMsg = msgData.messages[0];
            if (!receivedMsg.message?.buttonsResponseMessage) return;

            const buttonId = receivedMsg.message.buttonsResponseMessage.selectedButtonId;
            const senderId = receivedMsg.key.remoteJid;
            const isReplyToBot = receivedMsg.message.buttonsResponseMessage.contextInfo?.stanzaId === messageId;

            console.log('Button Clicked:', { buttonId, senderId, isReplyToBot });

            if (isReplyToBot && senderId && buttonId.includes(sessionId)) {
                await callback(receivedMsg, buttonId);
            }
        };

        this.malvin.ev.on('messages.upsert', handler);
        this.handlers.set(`${messageId}-${sessionId}`, handler);

        // Remove handler after 2 minutes
        setTimeout(() => {
            this.malvin.ev.off('messages.upsert', handler);
            this.handlers.delete(`${messageId}-${sessionId}`);
        }, 120000);
    }

    // Handle button actions
    async handleAction(receivedMsg, buttonId, actions, fakevCard) { // Added fakevCard parameter
        const from = receivedMsg.key.remoteJid;
        const contextInfo = {
            mentionedJid: [receivedMsg.key.participant || receivedMsg.key.remoteJid],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: config.NEWSLETTER_JID || '120363420989526190@newsletter',
                newsletterName: config.OWNER_NAME || 'Malvin King',
                serverMessageId: 143
            }
        };

        await this.malvin.sendMessage(from, { react: { text: '⏳', key: receivedMsg.key } });

        try {
            const actionPrefix = Object.keys(actions).find(key => buttonId.startsWith(`${key}-`));
            if (!actionPrefix) {
                throw new Error('Invalid action selected');
            }
            await actions[actionPrefix](receivedMsg);
            await this.malvin.sendMessage(from, { react: { text: '✅', key: receivedMsg.key } });
        } catch (error) {
            console.error('Button Handler Error:', error.stack);
            await this.malvin.sendMessage(from, { react: { text: '❌', key: receivedMsg.key } });
            await this.malvin.sendMessage(from, {
                text: `❎ ${toTinyCaps('error')}: ${toTinyCaps(error.message || 'Action failed')}`,
                contextInfo,
                quoted: fakevCard
            });
        }
    }
}

module.exports = { ButtonManager };
