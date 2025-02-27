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
        [
          Markup.button.callback(`💳 Wallet`, 'Wallet'),
          Markup.button.callback("📈 Copy Trade", "Copy Trade"),
        ],
        [
          Markup.button.callback('👜 Positions', 'Position'),
        ],
        [
          Markup.button.callback('💰 Withdraw', 'Withdraw'),
          Markup.button.callback('👥 Referrals', 'Invite friends')
        ],
        [
          Markup.button.callback('🛠️ Setting', 'Setting'), 
          Markup.button.callback('❓Help', 'Help')
        ],
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
const settingMarkUp = (user) => {
  try {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`${user.enableAutoTrade?'🟢':'🔴'} Auto Trading (Auto Buy/Sell)`, "Auto Trading"),
        Markup.button.callback(`${user.enableAutoTrade?'🔴':'🟢'} Manual Trading`, 'Manual Trading'),
      ],
      [
        Markup.button.callback(`💵 Priority Fee`, 'Priority Fee'),
        Markup.button.callback(`💵 Jito Tip`, 'Jito Tip'),
      ],
      [
        Markup.button.callback(`💵 Trade Amount`, 'Trade Amount'),
        Markup.button.callback(`💵 Slippage BPS`, 'Slippage BPS'),
      ],
      [Markup.button.callback('⬅ Return', 'Return'), Markup.button.callback('❌ Close', 'Close')],
    ]);
  } catch (error) {
    console.error('Error while settingMarkUp:', error);
    throw new Error('Failed to create markup for user settings.');
  }
};

/**
 * The Markup of Trade Page
 */
const tradeMarkUp = Markup.inlineKeyboard([
  [Markup.button.callback('Start Trade', 'Start Trade'), Markup.button.callback('Stop Trade', 'Stop Trade')],
  [Markup.button.callback('⬅ Return', 'Return'), Markup.button.callback('❌ Close', 'Close')],
]);

/**
 * 'Close' Markup
 */
const closeMarkUp = Markup.inlineKeyboard([[Markup.button.callback('❌ Close', 'Close')]]);

/**
 * The Markup of Wallet page
 */
const walletMarkUp = Markup.inlineKeyboard([
  [
    Markup.button.callback('📍Change Default', 'Change Default'),
    Markup.button.callback('✏️ Set Wallet Name', 'Change Name'),
  ],
  [
    Markup.button.callback('🧷 Import Wallet', 'Import Wallet Msg'), 
    Markup.button.callback('💳 Generate Wallet', 'Generate Wallet'),
  ],
  [
    Markup.button.callback('💣 Unbind Wallet', 'Unbind Wallet'),
    Markup.button.callback('🔑 Export Wallet', 'Export Wallet'),
  ],
  [
    Markup.button.callback('⬅ Return', 'Return'), 
    Markup.button.callback('❌ Close', 'Close'),
  ],
]);

const defaultWalletMarkup = (wallets, type) => {
  let buttonQuery = '';
  switch (type) {
    case 'default':
      buttonQuery = 'change_wallet_';
      break;
    case 'name':
      buttonQuery = 'change_name_';
      break;
    case 'unbind':
      buttonQuery = 'unbind_wallet_';
      break;
    case 'export':
      buttonQuery = 'export_wallet_';
      break;
    case 'withdraw':
      buttonQuery = 'withdraw_wallet_';
      break;
    case 'trade':
      buttonQuery = 'change_tradeWallet_'
    default:
      break;
  }
  
  const buttons = wallets.map((wallet, index) =>
    Markup.button.callback(`${wallet.name}`, `${buttonQuery}${index}`)
  );

  // Group buttons into rows of 4
  const groupedButtons = [];
  for (let i = 0; i < buttons.length; i += 4) {
    groupedButtons.push(buttons.slice(i, i + 4));
  }

  return Markup.inlineKeyboard(groupedButtons);
}

const helpMarkup = Markup.inlineKeyboard([
  [Markup.button.callback('⬅ Return', 'Return'), Markup.button.callback('❌ Close', 'Close')],
]);

module.exports = {
  tradeMarkUp,
  closeMarkUp, 
  helpMarkup, 
  walletMarkUp, 
  defaultWalletMarkup,
  settingMarkUp, 
  startMarkUp 
};
