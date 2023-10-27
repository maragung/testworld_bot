const TOKEN = "";
const userSettings = {};

console.log("Mina Testworld - Node Info\n");
console.log("Generating config...");
const TelegramBot = require("node-telegram-bot-api");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const si = require("systeminformation");
const ip = getCurrentIp();
const os = require("os");
const fs = require('fs');


const bot = new TelegramBot(TOKEN, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (msg.text.toLowerCase() === "/start") {
    logCommand("start");
    let responseText = "Hello! Here are the available commands:\n";
    responseText += "/disk - Get disk information\n";
    responseText += "/mina - Get Mina client status\n";
    responseText += "/os - Get OS information and server uptime\n";
    responseText += "/enable - Enable Mina info sending every hour\n";
    responseText += "/disable - Disable Mina info sending";
    bot.sendMessage(chatId, responseText);
  } else if (msg.text.toLowerCase() === "/disk") {
    logCommand("disk");
    try {
      const { stdout } = await exec("df -h");
      bot.sendMessage(chatId, `Disk Information:\n${stdout}`);
    } catch (error) {
      bot.sendMessage(
        chatId,
        "An error occurred while fetching disk information."
      );
    }
  } else if (msg.text.toLowerCase() === "/mina") {
    logCommand("mina");
    try {
      const { stdout } = await exec("mina client status");
      const relevantData = parseMinaStatus(stdout);
      bot.sendMessage(chatId, relevantData);
    } catch (error) {
      bot.sendMessage(chatId, "Error to get status Mina client.");
    }
  } else if (messageText === "/enable") {
    logCommand("enable");
    userSettings[chatId] = true;
    bot.sendMessage(
      chatId,
      "Mina info sending is enabled. Info will be sent every hour."
    );
  } else if (messageText === "/disable") {
    logCommand("disable");
    userSettings[chatId] = false;
    bot.sendMessage(chatId, "Mina info sending is disabled.");
  } else if (messageText === "/os") {
    logCommand("os");
    const osInfoText = `
OS Information:
Platform: ${os.platform()}
Distro: ${getLinuxDistro()}
Release: ${os.release()}
Kernel: ${os.type()} ${os.arch()}
Uptime: ${formatUptime(os.uptime())}
IP Address: ${ip}`;

    bot.sendMessage(chatId, osInfoText);
  }
});

function logCommand(command) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  // Convert to 12-hour format
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  const time = `${formattedHours}:${formattedMinutes} ${ampm}`;
  console.log(`${time} /${command}`);
}

function parseMinaStatus(data) {
  const relevantInfo = `
IP Address: ${ip}
Block height: ${extractValue(data, "Block height")}
Max observed block height: ${extractValue(data, "Max observed block height")}
Max observed unvalidated block height: ${extractValue(
    data,
    "Max observed unvalidated block height"
  )}
Local uptime: ${extractValue(data, "Local uptime")}
Sync status: ${extractValue(data, "Sync status")}
Block producers running: ${extractValue(data, "Block producers running")}
Coinbase receiver: ${extractValue(data, "Coinbase receiver")}
Best tip consensus time: ${extractValue(data, "Best tip consensus time")}
Best tip global slot (across all hard-forks): ${extractValue(
    data,
    "Best tip global slot (across all hard-forks)"
  )}
Next block will be produced in: ${extractValue(
    data,
    "Next block will be produced in"
  )}
Consensus time now: ${extractValue(data, "Consensus time now")}`;

  return relevantInfo;
}

function extractValue(data, key) {
  const regex = new RegExp(`${key}:\\s+(.+)`);
  const match = data.match(regex);
  return match ? match[1] : "N/A";
}

function sendMinaInfo(chatId) {
  exec("mina client status")
    .then(({ stdout }) => {
      const relevantData = parseMinaStatus(stdout);
      bot.sendMessage(chatId, relevantData);
    })
    .catch((error) => {
      console.error(
        "An error occurred while getting Mina client status:",
        error
      );
    });
}

const intervalInMilliseconds = 3600000;

setInterval(() => {
  for (const chatId in userSettings) {
    if (userSettings[chatId]) {
      sendMinaInfo(chatId);
    }
  }
}, intervalInMilliseconds);

function getCurrentIp() {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  let result = "N/A";

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        result = net.address;
        break;
      }
    }
  }

  return result;
}

function formatUptime(uptimeInSeconds) {
  const days = Math.floor(uptimeInSeconds / (60 * 60 * 24));
  const hours = Math.floor((uptimeInSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((uptimeInSeconds % (60 * 60)) / 60);

  return `${days} days, ${hours} hours, ${minutes} minutes`;
}

function getLinuxDistro() {
  try {
    const osRelease = fs.readFileSync('/etc/os-release', 'utf8');
    const distroLine = osRelease
      .split('\n')
      .find(line => line.startsWith('PRETTY_NAME='));
    if (distroLine) {
      return distroLine.replace('PRETTY_NAME=', '').replace(/"/g, '');
    }
  } catch (error) {
    console.error('Error reading distro information:', error);
  }
  return 'N/A';
}







console.log("Bot is Running...");
console.log(ip);
