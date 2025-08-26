const { malvin } = require("../malvin");
const axios = require('axios');
const fs = require('fs');
const path = require("path");
const AdmZip = require("adm-zip");
const config = require('../settings');

// JSON file for update tracking
const updateFilePath = path.join(__dirname, '../lib/updates.json');

// Initialize updates file if it doesn't exist
if (!fs.existsSync(updateFilePath)) {
  fs.writeFileSync(updateFilePath, JSON.stringify({ updates: [] }, null, 2));
}

// Helper functions for JSON operations
function readUpdates() {
  try {
    const data = fs.readFileSync(updateFilePath, 'utf8');
    return JSON.parse(data).updates;
  } catch (e) {
    console.error('Error reading updates file:', e);
    return [];
  }
}

function writeUpdate(version, changes) {
  try {
    const updates = readUpdates();
    updates.push({
      version,
      changes,
      update_date: new Date().toISOString()
    });
    fs.writeFileSync(updateFilePath, JSON.stringify({ updates }, null, 2));
  } catch (e) {
    console.error('Error writing to updates file:', e);
  }
}

// Improved version checking
async function getVersionInfo() {
  try {
    let localVersion = "unknown";
    
    // Try package.json first
    try {
      const pkg = require('../package.json');
      localVersion = pkg.version;
    } catch {}
    
    // Fallback to git
    if (localVersion === "unknown" && fs.existsSync(path.join(__dirname, '../.git'))) {
      try {
        const head = fs.readFileSync(path.join(__dirname, '../.git/HEAD'), 'utf8').trim();
        if (head.startsWith('ref: ')) {
          const ref = head.substring(5);
          if (fs.existsSync(path.join(__dirname, `../.git/${ref}`))) {
            localVersion = fs.readFileSync(path.join(__dirname, `../.git/${ref}`), 'utf8').trim().substring(0, 7);
          }
        } else {
          localVersion = head.substring(0, 7);
        }
      } catch {}
    }
    
    // Fallback to updates file
    if (localVersion === "unknown") {
      const updates = readUpdates();
      localVersion = updates[updates.length - 1]?.version || "unknown";
    }
    
    return localVersion;
  } catch (e) {
    console.error('Version check error:', e);
    return "unknown";
  }
}

malvin({  
  pattern: "update",  
  alias: ["upgrade", "sync"],  
  react: '🚀',  
  desc: "Update the bot to the latest version",  
  category: "system",  
  filename: __filename
}, async (client, message, args, { from, reply, sender, isOwner }) => {  
  if (!isOwner) return reply("❌ Owner only command!");
  
  try {
    const repoUrl = config.REPO || "https://github.com/XdKing2/MALVIN-XD";
    const repoApiUrl = repoUrl.replace('github.com', 'api.github.com/repos');
    
    // Get current local version
    const localVersion = await getVersionInfo();
    await reply(`🔍 Current version: ${localVersion}`);
    
    // Get latest release info
    await reply("Checking for updates...");
    let latestVersion;
    let changes = "Manual update";
    
    try {
      // Try releases first
      const releaseResponse = await axios.get(`${repoApiUrl}/releases/latest`, { timeout: 10000 });
      latestVersion = releaseResponse.data.tag_name;
      changes = releaseResponse.data.body || "No changelog provided";
      
      // If versions match, return immediately
      if (latestVersion === localVersion) {
        return reply(`✅ Already on latest release version: ${localVersion}`);
      }
    } catch (releaseError) {
      console.log('No releases found, checking main branch');
      
      // Fallback to main branch commit
      const commitResponse = await axios.get(`${repoApiUrl}/commits/main`, { timeout: 10000 });
      latestVersion = commitResponse.data.sha.substring(0, 7);
      changes = commitResponse.data.commit.message || "Main branch update";
      
      // If commit hashes match
      if (latestVersion === localVersion) {
        return reply(`✅ Already on latest commit: ${localVersion}`);
      }
    }
    
    // Confirm update
    await reply(`📥 New version available: ${latestVersion}\n\nChanges:\n${changes}\n\nUpdating...`);
    
    // Download the ZIP
    const { data } = await axios.get(`${repoUrl}/archive/main.zip`, {
      responseType: "arraybuffer",
      timeout: 30000
    });

    // Process ZIP
    const zip = new AdmZip(data);
    const zipEntries = zip.getEntries();
    const protectedFiles = ["settings.js", "app.json", "data", "lib/updates.json", "package-lock.json"];
    const basePath = `${repoUrl.split('/').pop()}-main/`;
    
    await reply("🔄 Applying updates...");
    
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const relativePath = entry.entryName.replace(basePath, '');
      const destPath = path.join(__dirname, '..', relativePath);
      
      if (protectedFiles.some(f => destPath.includes(f))) continue;
      
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      zip.extractEntryTo(entry, dir, false, true, entry.name);
    }

    // Record update
    writeUpdate(latestVersion, changes);

    await reply(`✅ Update to ${latestVersion} complete!\n\nRestarting...`);
    setTimeout(() => process.exit(0), 2000);

  } catch (error) {
    console.error("Update error:", error);
    reply(`❌ Update failed: ${error.message}\n\nPlease update manually from:\n${config.REPO || "https://github.com/XdKing2/MALVIN-XD"}`);
  }
});