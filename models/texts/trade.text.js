const tradeMainText = (trade) => {
  return `
<b>🚀 Setup New Copy-Trading Profile</b>

🎯 Target Wallet
<code>${trade.targetAddress} ${trade.status ? '🟢':'🔴'}</code>

📊 Active Platforms
🟢 Other / 🟢 PumpFun / 🟢 Moonshot

🟢: The feature/mode is turned <b>ON</b>
🔴: The feature/mode is turned <b>OFF</b>\n
  `
};

const minTokenHolderMsg = `
  Please enter the minimum number of target token holders:
`;

const minTokenVolumeMsg = `
  Please enter the minimum volume of latest 5 minutes volume of target token:
`;

const minMCapMsg = `
  Please enter the minimum market cap of target token:
`;

const maxMCapMsg = `
  Please enter the maximum market cap of target token:
`;

const minTokenAgeMsg = `
  Please enter the minimum age of target token:
`;

const maxTokenAgeMsg = `
  Please enter the maximum age of target token:
`;

const minTriggerAmountMsg = `
  Please enter the minimum trigger amount:
`;

const maxTriggerAmountMsg = `
  Please enter the maximum trigger amount:
`;

const tradeAmountMsg = `
  Please enter the trade amount:
`;


module.exports = {
  tradeMainText,
  minTokenHolderMsg,
  minTokenVolumeMsg,
  minMCapMsg,
  maxMCapMsg,
  minTokenAgeMsg,
  maxTokenAgeMsg,
  minTriggerAmountMsg,
  maxTriggerAmountMsg,
  tradeAmountMsg
}