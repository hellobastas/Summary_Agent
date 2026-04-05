const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const { exec } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// YouTube URL patterns
const YT_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;

function extractVideoId(text) {
  const match = text.match(YT_REGEX);
  return match ? match[1] : null;
}

// Split long messages for Telegram's 4096 char limit
function splitMessage(text, maxLen = 4000) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // Try to split at a double newline (paragraph break)
    let splitAt = remaining.lastIndexOf('\n\n', maxLen);
    if (splitAt < maxLen * 0.3) {
      // Try single newline
      splitAt = remaining.lastIndexOf('\n', maxLen);
    }
    if (splitAt < maxLen * 0.3) {
      // Hard split at max length
      splitAt = maxLen;
    }

    chunks.push(remaining.substring(0, splitAt));
    remaining = remaining.substring(splitAt).trimStart();
  }

  return chunks;
}

// --- Handle YouTube links ---
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== CHAT_ID.toString()) return;
  if (!msg.text) return;

  const text = msg.text.trim();

  // Skip commands
  if (text.startsWith('/')) return;

  const videoId = extractVideoId(text);
  if (!videoId) return;

  const statusMsg = await bot.sendMessage(chatId, '⏳ Fetching transcript and generating summary...');

  const summarizeScript = path.join(__dirname, 'summarize.sh');

  exec(`bash "${summarizeScript}" "${videoId}"`, {
    timeout: 300000, // 5 min timeout
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer for long summaries
    env: { ...process.env, PATH: process.env.PATH }
  }, async (err, stdout, stderr) => {
    // Delete the status message
    try {
      await bot.deleteMessage(chatId, statusMsg.message_id);
    } catch (e) { /* ignore */ }

    if (err) {
      const errorMsg = stderr || err.message;
      if (errorMsg.includes('Failed to get transcript')) {
        await bot.sendMessage(chatId, '❌ No transcript available for this video. It may not have captions.');
      } else if (err.killed) {
        await bot.sendMessage(chatId, '❌ Summary timed out. The video might be too long.');
      } else {
        await bot.sendMessage(chatId, `❌ Error: ${errorMsg.substring(0, 500)}`);
      }
      return;
    }

    const summary = stdout.trim();
    if (!summary) {
      await bot.sendMessage(chatId, '❌ Got empty summary. Something went wrong.');
      return;
    }

    // Send summary in chunks if needed
    const chunks = splitMessage(summary);
    for (const chunk of chunks) {
      try {
        await bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' });
      } catch (e) {
        // Fallback to plain text if Markdown parsing fails
        await bot.sendMessage(chatId, chunk);
      }
    }
  });
});

// --- /start ---
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== CHAT_ID.toString()) return;

  await bot.sendMessage(chatId,
    '🎬 *Summary Agent*\n\n' +
    'Send me any YouTube link and I\'ll give you a layered summary:\n\n' +
    '• *Layer 1* — Quick Scan (30-second overview)\n' +
    '• *Layer 2* — Deep Dive (arguments & evidence)\n' +
    '• *Layer 3* — Full Picture (tangents, data, loose threads)\n\n' +
    'Just paste a link to get started.',
    { parse_mode: 'Markdown' }
  );
});

// --- /help ---
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== CHAT_ID.toString()) return;

  await bot.sendMessage(chatId,
    '🤖 *Summary Agent Commands*\n\n' +
    'Just paste a YouTube link — that\'s it.\n\n' +
    'Supported formats:\n' +
    '• youtube.com/watch?v=...\n' +
    '• youtu.be/...\n' +
    '• youtube.com/shorts/...\n' +
    '• youtube.com/live/...\n\n' +
    '/start — Welcome message\n' +
    '/help — This message',
    { parse_mode: 'Markdown' }
  );
});

console.log('Summary Agent Telegram bot started. Waiting for YouTube links...');
