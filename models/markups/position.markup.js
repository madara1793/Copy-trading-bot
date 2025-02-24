const { Markup } = require('telegraf');

const positionListMarkup = (positions) => {
  const positionButtons = positions.map((position, index) => 
    Markup.button.callback(`Position ${index+1}`, `Position_${position._id.toString()}`)
  );
  const groupedPosButtons = [];
  for (let i = 0; i < positionButtons.length; i += 3) {
    groupedPosButtons.push(positionButtons.slice(i, i + 3));
  }

  return Markup.inlineKeyboard([
    ...groupedPosButtons,
    [
      Markup.button.callback('🆕 Import Position', 'Import Position'),
    ],
    [
      Markup.button.callback('↩️ Back', 'Return'),
      Markup.button.callback('🔄️ Refresh', 'Refresh'),
    ],
  ])
}

const buyPositionMarkup = (positionSetting) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('↔️ Switch to Sell', 'Switch to Sell'),
      Markup.button.callback('🔄️ Refresh', 'Refresh') 
    ],
    [
      Markup.button.callback('Active Wallets', 'Cancel')
    ],
    [
      Markup.button.callback('💰 0.5 SOL', 'Buy_0'),
      Markup.button.callback('💰 1 SOL', 'Buy_1'),
      Markup.button.callback('💰 2 SOL', 'Buy_2'),
    ],
    [
      Markup.button.callback('💰 5 SOL', 'Buy_3'),
      Markup.button.callback('💰 10 SOL', 'Buy_4'),
      Markup.button.callback('💰 X SOL', 'Buy_X'),
    ],
    [
      Markup.button.callback(`💳 Buy Tip: ${positionSetting.buyTip} SOL`, 'Set Position Buy Tip'),
      Markup.button.callback(`🛝 Slippage: ${positionSetting.slippage} %`, 'Set Position Slippage'),
    ],
    [
      Markup.button.callback('Generate PnL', 'Generate PnL'),
    ],
    [
      Markup.button.callback('⬅️ Back', 'Return'),
    ]
  ]);
}

const sellPositionMarkup = (positionSetting) => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('↔️ Switch to Buy', 'Switch to Buy'),
      Markup.button.callback('🔄️ Refresh', 'Refresh') 
    ],
    [
      Markup.button.callback('Active Wallets', 'Cancel')
    ],
    [
      Markup.button.callback('💸 1 %', `Sell_0_${positionSetting.positionId}`),
      Markup.button.callback('💸 5 %',  `Sell_1_${positionSetting.positionId}`),
      Markup.button.callback('💸 10 %',  `Sell_2_${positionSetting.positionId}`),
    ],
    [
      Markup.button.callback('💸 50 %',  `Sell_3_${positionSetting.positionId}`),
      Markup.button.callback('💸 100 %',  `Sell_4_${positionSetting.positionId}`),
      Markup.button.callback('💸 X %',  `Sell_X_${positionSetting.positionId}`),
    ],
    [
      Markup.button.callback(`💳 Sell Tip: ${positionSetting.buyTip} SOL`, 'Set Position Buy Tip'),
      Markup.button.callback(`🛝 Slippage: ${positionSetting.slippage} %`, 'Set Position Slippage'),
    ],
    [
      Markup.button.callback('Generate PnL', 'Generate PnL'),
    ],
    [
      Markup.button.callback('⬅️ Back', 'Return'),
    ]
  ])
}


module.exports = {
  positionListMarkup,
  buyPositionMarkup,
  sellPositionMarkup,
}