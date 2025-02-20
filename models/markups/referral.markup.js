const { Markup } = require('telegraf');

const referralMarkup = Markup.inlineKeyboard([
  // [
  //   Markup.button.callback(`💰 Change Referral Code`, 'Change Referral Code'),
  // ],
  [
    Markup.button.callback(`⬅️ Back`, 'Return'),
    Markup.button.callback(`🔃 Refresh`, 'Refresh'),
  ],
  [
    Markup.button.callback(`❌ Close`, 'Close'),
  ]
]);


module.exports = {
  referralMarkup,
}