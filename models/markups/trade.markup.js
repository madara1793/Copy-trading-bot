const { Markup } = require('telegraf');

/**
 * 
 */
const copyTradeMarkup = (trades) => {
  console.log(trades);
  const buttons = trades.map((trade, index) => 
    Markup.button.callback(`${trade.name}`, `trade_${trade._id.toString()}`)
  );

  const groupedButtons = [];
  for (let i = 0; i < buttons.length; i += 4) {
    groupedButtons.push(buttons.slice(i, i + 4));
  }

  return Markup.inlineKeyboard([
    ...groupedButtons,
    [Markup.button.callback('🆕 Add new config', 'Add New Trade Config')],
    [
      Markup.button.callback('⏹️ Pause All', 'Pause Copy Trade'), 
      Markup.button.callback('▶️ Start All', 'Start Copy Trade')
    ],
    [
      Markup.button.callback('⬅️ Back', 'Return'),
      Markup.button.callback('🔄 Refresh', 'Refresh')
    ],
    [
      Markup.button.callback('❌ Close', 'Close')
    ]
  ]);
};


const tradeSettingMarkup = (trade) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(`Wallet: ${trade.wallet.name}`, 'Set Trade Wallet'),
      Markup.button.callback(`Config Name: ${trade.name}`, 'Set Trade Name'),
    ],
    [
      Markup.button.callback(`🔑 Target Address: ${trade.targetAddress}`, 'Target Address'),
    ],
    [
      Markup.button.callback(`🔎 Min Token Holder: ${trade.minTriggerTokenHolders || 'N/A'}`, 'Set Min Token Holder'),
      Markup.button.callback(`🔎 5 Minute Volume: ${trade.minTriggerTokenVolume || 'N/A'}`, 'Set Min Volume'),
    ],
    [
      Markup.button.callback(`🔎 Min MCap: ${trade.minTriggerMCap || 'N/A'}`, 'Set Min MCap'),
      Markup.button.callback(`🔎 Max MCap: ${trade.maxTriggerMCap || 'N/A'}`, 'Set Max MCap'),
    ],
    [
      Markup.button.callback(`🔎 Min Token Age: ${trade.minTriggerTokenAge || 'N/A'}`, 'Set Min Token Age'),
      Markup.button.callback(`🔎 Max Token Age: ${trade.maxTriggerTokenAge || 'N/A'}`, 'Set Max Token Age'),
    ],
    [
      Markup.button.callback(`🔎 Min Trigger Amount: ${trade.minTriggerAmount || 'N/A'}`, 'Set Min Trigger Amount'),
      Markup.button.callback(`🔎 Max Trigger Amount: ${trade.maxTriggerAmount || 'N/A'}`, 'Set Max Trigger Amount'),
    ],
    [
      Markup.button.callback(`💰 Priority Fee: ${trade.priorityFee} SOL`, 'Set Copy Priority Fee'),
      Markup.button.callback(`💰 Jito Tip: ${trade.jitoTip} SOL`, 'Set Copy Jito Tip'),
    ],
    [
      Markup.button.callback(`💰 Trade Amount ${trade.tradeAmount} SOL`, 'Set Copy Trade Amount'),
      Markup.button.callback(`💰 Slippage (${trade.slippage*100}%)`, 'Set Copy Slippage'),
    ],  
    [
      Markup.button.callback(`Active: ${trade.status ? '🟢':'🔴'}`, 'Set Trade Status'),
      Markup.button.callback(`Delete Config`, 'Delete Trade Config'),
    ],
    [
      Markup.button.callback('⬅️ Back', 'Return to Trade List'),
    ]
  ]);
}


module.exports = {
  copyTradeMarkup,
  tradeSettingMarkup,
}