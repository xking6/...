const fs = require('fs');
const path = require('path');
const { getConfig } = require('./lib/configdb');
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
  PREFIX: getConfig("PREFIX") || settings.PREFIX || ".", // Command prefix (e.g., ".", "/", "!")
  CHATBOT: getConfig("CHATBOT") || "on", // Chatbot toggle
  BOT_NAME: getConfig("BOT_NAME") || process.env.BOT_NAME || "ᴍᴀʟᴠɪɴ-xᴅ", // Bot's display name
  MODE: getConfig("MODE") || process.env.MODE || "private", // Bot mode: public/private/group/inbox
  REPO: process.env.REPO || "https://github.com/XdKing2/MALVIN-BXD", // Bot's GitHub repo
  PAIRING_CODE: process.env.PARING_CODE || 'true', // true or false for terminal pairing
  BAILEYS: process.env.BAILEYS || "@whiskeysockets/baileys", // WhatsApp library

  // ===== OWNER & DEVELOPER SETTINGS =====
  OWNER_NUMBER: settings.OWNER_NUMBER || process.env.OWNER_NUMBER || "263714757857", // Owner's WhatsApp number
  OWNER_NAME: getConfig("OWNER_NAME") || process.env.OWNER_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ", // Owner's name
  DEV_NAME: process.env.DEV_NAME || "ᴍᴀʟᴠɪɴ ᴋɪɴɢ", // Developer's name
  DEV: process.env.DEV || "263714757857", // Developer's contact
  DEVELOPER_NUMBER: '263714757857@s.whatsapp.net', // Developer's WhatsApp ID
  
  
  MENU_AUDIO_URL: getConfig("MENU_AUDIO_URL") || process.env.MENU_AUDIO_URL || 'https://files.catbox.moe/vkvci3.mp3', // Menu audio
  AUDIO_URL: getConfig("AUDIO_URL") || process.env.AUDIO_URL || 'https://files.catbox.moe/vkvci3.mp3', // global audio
  AUDIO_URL2: getConfig("AUDIO_URL2") || process.env.AUDIO_URL2 || 'https://files.catbox.moe/vkvci3.mp3', // global audio
  
  
  NEWSLETTER_JID: process.env.NEWSLETTER_JID || '120363402507750390@newsletter', // Newsletter JID

  // ===== AUTO-RESPONSE SETTINGS =====
  AUTO_REPLY: getConfig("AUTO_REPLY") || process.env.AUTO_REPLY || "false", // Auto-reply toggle
  AUTO_STATUS_REPLY: getConfig("AUTO_STATUS_REPLY") || process.env.AUTO_STATUS_REPLY || "false", // Reply to status updates
  AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "*Just seen ur status 😆 🤖*", // Status reply message
  READ_MESSAGE: getConfig("READ_MESSAGE") || process.env.READ_MESSAGE || "false", // Mark messages as read
  REJECT_MSG: process.env.REJECT_MSG || "*📵 Calls are not allowed on this number unless you have permission. 🚫*", // Call rejection message
  ALIVE_IMG: getConfig("ALIVE_IMG") || process.env.ALIVE_IMG || "https://i.ibb.co/fYrXbwbf/malvin-xd.jpg", // Alive image
  LIVE_MSG: process.env.LIVE_MSG || "> ʙᴏᴛ ɪs sᴘᴀʀᴋɪɴɢ ᴀᴄᴛɪᴠᴇ ᴀɴᴅ ᴀʟɪᴠᴇ\n\n\nᴋᴇᴇᴘ ᴜsɪɴɢ ✦ᴍᴀʟᴠɪɴ xᴅ✦ ғʀᴏᴍ ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ ɪɴᴄ⚡\n\n\n*© ᴡʜᴀᴛꜱᴀᴘᴘ ʙᴏᴛ - ᴍᴅ\n\n> ɢɪᴛʜᴜʙ :* github.com/XdKing2/MALVIN-XD", // Alive message

  // ===== REACTION & STICKER SETTINGS =====
  AUTO_REACT: getConfig("AUTO_REACT") || process.env.AUTO_REACT || "false", // Auto-react to messages
  OWNER_REACT: getConfig("OWNER_REACT") || process.env.OWNER_REACT || "false", // Owner-specific reactions
  CUSTOM_REACT: getConfig("CUSTOM_REACT") || process.env.CUSTOM_REACT || "false", // Custom emoji reactions
  CUSTOM_REACT_EMOJIS: getConfig("CUSTOM_REACT_EMOJIS") || process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍", // Custom reaction emojis
  STICKER_NAME: process.env.STICKER_NAME || "ᴋʜᴀɴ-ᴍᴅ", // Sticker pack name
  AUTO_STICKER: getConfig("AUTO_STICKER") || process.env.AUTO_STICKER || "false", // Auto-send stickers

  // ===== MEDIA & AUTOMATION =====
  AUTO_RECORDING: getConfig("AUTO_RECORDING") || process.env.AUTO_RECORDING || "false", // Auto-record voice notes
  AUTO_TYPING: getConfig("AUTO_TYPING") || process.env.AUTO_TYPING || "false", // Show typing indicator
  MENTION_REPLY: getConfig("MENTION_REPLY") || process.env.MENTION_REPLY || "false", // Reply to mentions
  MENU_IMAGE_URL: getConfig("MENU_IMAGE_URL") || process.env.MENU_IMAGE_URL || "https://i.ibb.co/bgfX1qBy/malvin-xd.jpg", // Menu image

  // ===== SECURITY & ANTI-FEATURES =====
  ANTI_DELETE: getConfig("ANTI_DELETE") || process.env.ANTI_DELETE || "true", // Prevent message deletion
  ANTI_CALL: getConfig("ANTI_CALL") || process.env.ANTI_CALL || "false", // Block incoming calls
  ANTI_BAD_WORD: getConfig("ANTI_BAD_WORD") || process.env.ANTI_BAD_WORD || "false", // Block bad words
  ANTI_LINK: getConfig("ANTI_LINK") || process.env.ANTI_LINK || "true", // Block links in groups
  ANTI_VV: getConfig("ANTI_VV") || process.env.ANTI_VV || "true", // Block view-once messages
  DELETE_LINKS: getConfig("DELETE_LINKS") || process.env.DELETE_LINKS || "false", // Auto-delete links
  ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "inbox", // Log deleted messages
  ANTI_BOT: getConfig("ANTI_BOT") || process.env.ANTI_BOT || "true", // Block other bots
  PM_BLOCKER: getConfig("PM_BLOCKER") || process.env.PM_BLOCKER || "true", // Block private messages

  // ===== BOT BEHAVIOR & APPEARANCE =====
  DESCRIPTION: process.env.DESCRIPTION || "*© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ-xᴅ*", // Bot footer
  PUBLIC_MODE: getConfig("PUBLIC_MODE") || process.env.PUBLIC_MODE || "true", // Allow public commands
  ALWAYS_ONLINE: getConfig("ALWAYS_ONLINE") || process.env.ALWAYS_ONLINE || "false", // Show bot as always online
  AUTO_STATUS_REACT: getConfig("AUTO_STATUS_REACT") || process.env.AUTO_STATUS_REACT || "true", // React to status updates
  AUTO_STATUS_SEEN: getConfig("AUTO_STATUS_SEEN") || process.env.AUTO_STATUS_SEEN || "true", // View status updates
  AUTO_BIO: getConfig("AUTO_BIO") || process.env.AUTO_BIO || "false", // Auto-update bio
  WELCOME: getConfig("WELCOME") || process.env.WELCOME || "false", // Welcome messages
  GOODBYE: getConfig("GOODBYE") || process.env.GOODBYE || "false", // Goodbye messages
  ADMIN_ACTION: getConfig("ADMIN_ACTION") || process.env.ADMIN_ACTION || "false", // Admin event handling
  version: process.env.version || "1.5.0", // Bot version
  TIMEZONE: settings.TIMEZONE || process.env.TIMEZONE || "Africa/Harare", // Bot timezone

  LOGGING_ENABLED: process.env.LOGGING_ENABLED || "true", 

};
