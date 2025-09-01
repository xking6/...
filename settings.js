const fs = require('fs');
const path = require('path');
const settings = require('./settingss');

if (fs.existsSync(path.resolve('config.env'))) {
  require('dotenv').config({ path: path.resolve('config.env') });
}

// Helper to convert "true"/"false" strings to actual boolean
function convertToBool(text, trueValue = 'true') {
  return text === trueValue;
}

module.exports = {
  // ===== BOT CORE SETTINGS =====
  SESSION_ID: settings.SESSION_ID || process.env.SESSION_ID || "", // Bot's session ID (keep secure)
  PREFIX: settings.PREFIX || process.env.PREFIX || ".", // Command prefix (e.g., ".", "/", "!")
  CHATBOT: settings.CHATBOT || process.env.CHATBOT || "on", // Chatbot toggle
  BOT_NAME: settings.BOT_NAME || process.env.BOT_NAME || "ᴍᴀʟᴠɪɴ-xᴅ", // Bot's display name
  MODE: settings.MODE || process.env.MODE || "private", // Bot mode: public/private/group/inbox
  REPO: process.env.REPO || "https://github.com/XdKing2/MALVIN-BXD", // Bot's GitHub repo
  PAIRING_CODE: process.env.PAIRING_CODE || 'true', // true or false for terminal pairing
  BAILEYS: process.env.BAILEYS || "@whiskeysockets/baileys", // WhatsApp library

  // ===== OWNER & DEVELOPER SETTINGS =====
  OWNER_NUMBER: settings.OWNER_NUMBER || process.env.OWNER_NUMBER || "263714757857", // Owner's WhatsApp number
  OWNER_NAME: settings.OWNER_NAME || process.env.OWNER_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ", // Owner's name
  DEV_NAME: process.env.DEV_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ", // Developer's name
  DEV: process.env.DEV || "263714757857", // Developer's contact
  DEVELOPER_NUMBER: '263714757857@s.whatsapp.net', // Developer's WhatsApp ID
  
  MENU_AUDIO_URL: settings.MENU_AUDIO_URL || process.env.MENU_AUDIO_URL || 'https://files.catbox.moe/vkvci3.mp3', // Menu audio
  AUDIO_URL: settings.AUDIO_URL || process.env.AUDIO_URL || 'https://files.catbox.moe/vkvci3.mp3', // global audio
  AUDIO_URL2: settings.AUDIO_URL2 || process.env.AUDIO_URL2 || 'https://files.catbox.moe/vkvci3.mp3', // global audio
  
  NEWSLETTER_JID: process.env.NEWSLETTER_JID || '120363402507750390@newsletter', // Newsletter JID

  // ===== AUTO-RESPONSE SETTINGS =====
  AUTO_REPLY: settings.AUTO_REPLY || process.env.AUTO_REPLY || "false", // Auto-reply toggle
  AUTO_STATUS_REPLY: settings.AUTO_STATUS_REPLY || process.env.AUTO_STATUS_REPLY || "false", // Reply to status updates
  AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "*Just seen ur status 😆 🤖*", // Status reply message
  READ_MESSAGE: settings.READ_MESSAGE || process.env.READ_MESSAGE || "false", // Mark messages as read
  REJECT_MSG: process.env.REJECT_MSG || "*📵 Calls are not allowed on this number unless you have permission. 🚫*", // Call rejection message
  ALIVE_IMG: settings.ALIVE_IMG || process.env.ALIVE_IMG || "https://i.ibb.co/fYrXbwbf/malvin-xd.jpg", // Alive image
  LIVE_MSG: process.env.LIVE_MSG || "> ʙᴏᴛ ɪs sᴘᴀʀᴋɪɴɢ ᴀᴄᴛɪᴠᴇ ᴀɴᴅ ᴀʟɪᴠᴇ\n\n\nᴋᴇᴇᴘ ᴜsɪɴɢ ✦ᴍᴀʟᴠɪɴ xᴅ✦ ғʀᴏᴍ ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ ɪɴᴄ⚡\n\n\n*© ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ - ᴍᴅ\n\n> ɢɪᴛʜᴜʙ :* github.com/XdKing2/MALVIN-XD", // Alive message

  // ===== REACTION & STICKER SETTINGS =====
  AUTO_REACT: settings.AUTO_REACT || process.env.AUTO_REACT || "false", // Auto-react to messages
  OWNER_REACT: settings.OWNER_REACT || process.env.OWNER_REACT || "false", // Owner-specific reactions
  CUSTOM_REACT: settings.CUSTOM_REACT || process.env.CUSTOM_REACT || "false", // Custom emoji reactions
  CUSTOM_REACT_EMOJIS: settings.CUSTOM_REACT_EMOJIS || process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍", // Custom reaction emojis
  STICKER_NAME: process.env.STICKER_NAME || "ᴋʜᴀɴ-ᴍᴅ", // Sticker pack name
  AUTO_STICKER: settings.AUTO_STICKER || process.env.AUTO_STICKER || "false", // Auto-send stickers

  // ===== MEDIA & AUTOMATION =====
  AUTO_RECORDING: settings.AUTO_RECORDING || process.env.AUTO_RECORDING || "false", // Auto-record voice notes
  AUTO_TYPING: settings.AUTO_TYPING || process.env.AUTO_TYPING || "false", // Show typing indicator
  MENTION_REPLY: settings.MENTION_REPLY || process.env.MENTION_REPLY || "false", // Reply to mentions
  MENU_IMAGE_URL: settings.MENU_IMAGE_URL || process.env.MENU_IMAGE_URL || "https://i.ibb.co/bgfX1qBy/malvin-xd.jpg", // Menu image

  // ===== SECURITY & ANTI-FEATURES =====
  ANTI_DELETE: settings.ANTI_DELETE || process.env.ANTI_DELETE || "true", // Prevent message deletion
  ANTI_CALL: settings.ANTI_CALL || process.env.ANTI_CALL || "false", // Block incoming calls
  ANTI_BAD_WORD: settings.ANTI_BAD_WORD || process.env.ANTI_BAD_WORD || "false", // Block bad words
  ANTI_LINK: settings.ANTI_LINK || process.env.ANTI_LINK || "true", // Block links in groups
  ANTI_VV: settings.ANTI_VV || process.env.ANTI_VV || "true", // Block view-once messages
  DELETE_LINKS: settings.DELETE_LINKS || process.env.DELETE_LINKS || "false", // Auto-delete links
  ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "inbox", // Log deleted messages
  ANTI_BOT: settings.ANTI_BOT || process.env.ANTI_BOT || "true", // Block other bots
  PM_BLOCKER: settings.PM_BLOCKER || process.env.PM_BLOCKER || "true", // Block private messages

  // ===== BOT BEHAVIOR & APPEARANCE =====
  DESCRIPTION: process.env.DESCRIPTION || "*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ-xᴅ*", // Bot footer
  PUBLIC_MODE: settings.PUBLIC_MODE || process.env.PUBLIC_MODE || "true", // Allow public commands
  ALWAYS_ONLINE: settings.ALWAYS_ONLINE || process.env.ALWAYS_ONLINE || "false", // Show bot as always online
  AUTO_STATUS_REACT: settings.AUTO_STATUS_REACT || process.env.AUTO_STATUS_REACT || "true", // React to status updates
  AUTO_STATUS_SEEN: settings.AUTO_STATUS_SEEN || process.env.AUTO_STATUS_SEEN || "true", // View status updates
  AUTO_BIO: settings.AUTO_BIO || process.env.AUTO_BIO || "false", // Auto-update bio
  WELCOME: settings.WELCOME || process.env.WELCOME || "false", // Welcome messages
  GOODBYE: settings.GOODBYE || process.env.GOODBYE || "false", // Goodbye messages
  ADMIN_ACTION: settings.ADMIN_ACTION || process.env.ADMIN_ACTION || "false", // Admin event handling
  version: process.env.version || "1.5.5", // Bot version
  TIMEZONE: settings.TIMEZONE || process.env.TIMEZONE || "Africa/Harare", // Bot timezone

  LOGGING_ENABLED: process.env.LOGGING_ENABLED || "true", 
};
