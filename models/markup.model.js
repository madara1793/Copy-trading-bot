const { Markup } = require('telegraf');

/**
 * The Markup be sent when 'start' command
 * @param {string} parseMode
 * @returns
 */
const startMarkUp = (parseMode) => {
  try {
    return {
      parse_mode: parseMode,
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('Setting', 'Setting'), Markup.button.callback('Help', 'Help')],
      ]).reply_markup,
    };
  } catch (error) {
    console.error('Error while startMarkUp:', error);
    throw new Error('Failed to create markup for start command');
  }
};

/**
 * The Markup of Setting page
 * @param {*} user
 * @returns
 */
const settingMarkUp = (user, amount) => {
  try {
    return Markup.inlineKeyboard([
      [Markup.button.callback(`💳 Wallet (${amount / 1e9})`, 'Wallet')],
      [
        Markup.button.callback(`${user.botStatus ? 'Bot On 🟢' : 'Bot Off 🔴'}`, 'On Off'),
        Markup.button.callback(`${user.timeStatus ? 'UTC Time Check On 🟢' : 'UTC Time Check Off 🔴'}`, 'Time On Off'),
      ],
      [
        Markup.button.callback(`💵 Snipe Amount: ${user.snipeAmount} SOL`, 'Snipe Amount'),
        Markup.button.callback(`💵 Fee: ${user.jitoFee}`, 'Jito Fee'),
      ],
      [
        Markup.button.callback('⏰ Start At: 0:00', 'Start Time'),
        Markup.button.callback('⏰ Stop At: 24:00', 'Stop Time'),
      ],
      [Markup.button.callback('⬅ Return', 'Return'), Markup.button.callback('❌ Close', 'Close')],
    ]);
  } catch (error) {
    console.error('Error while settingMarkUp:', error);
    throw new Error('Failed to create markup for user settings.');
  }
};

/**
 * 'Close' Markup
 */
const closeMarkUp = Markup.inlineKeyboard([[Markup.button.callback('❌ Close', 'Close')]]);

/**
 * The Markup of Wallet page
 */
const walletMarkUp = Markup.inlineKeyboard([
  [Markup.button.callback('⬅ Return', 'Setting'), Markup.button.callback('❌ Close', 'Close')],
]);

const helpMarkup = Markup.inlineKeyboard([
  [Markup.button.callback('⬅ Return', 'Return'), Markup.button.callback('❌ Close', 'Close')],
]);

module.exports = {
  closeMarkUp, 
  helpMarkup, 
  walletMarkUp, 
  settingMarkUp, 
  startMarkUp 
};
