const { Markup } = require('telegraf');

const withdrawMarkup = Markup.inlineKeyboard([
  [
    Markup.button.callback('50%', 'Withdraw 50%'),
    Markup.button.callback('100%', 'Withdraw 100%'),
    Markup.button.callback('X SOL', 'Withdraw X SOL'),
  ],
  [
    Markup.button.callback('Switch Wallet', 'Swtich Withraw Address'),
    Markup.button.callback('Set Withdrawal Address', 'Set Withdrawal Address'),
  ],
  [
    Markup.button.callback('⬅️ Back', 'Return'),
    Markup.button.callback('🔃 Refresh', 'Refresh'),
  ],
  [
    Markup.button.callback('❌ Close', 'Close'),
  ]
])


module.exports = {
  withdrawMarkup,
}