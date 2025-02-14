/**
 * The text when start command is inputed
 */
const startText = (user) => {
  return `🎉 @${user?.username}, <b>Welcome to EdgeStrike AI-driven Scalping Trading Bot</b>

The Unique Solana Trading Bot.
`;
};

/**
 * The text to be sent when new user login
 * @param {} user
 */
const newUserText = (user) => {
  try {
    return `👋 Hello, *@${user?.username}*

⚠ Keep your _private keys_ *safe*
💳 Public Key: \`${user.wallet.publicKey}\`
🔑 Private Key: ||_${user.wallet.privateKey}_||
`;
  } catch (error) {
    console.error('Error while getting newUserText:', error);
    throw new Error('Failed to create newUser text.');
  }
};

/**
 * The text when help command is inputed
 */
const helpText = `🚀 <b>EdgeStrike AI-driven Scalping Trading Bot</b> 🚀

Supercharge your trading with our cutting-edge bot that tracks and capitalizes on Serum migrations from Pump.fun! 💎

Key Features: 
✅ Lightning-fast transaction tracking 
✅ Instant buy execution 
✅ Smart auto-buy/sell based on MC 
✅ Real-time Telegram alerts

How it works:

🔍 Monitors Pump.fun migrations to Serum
💨 Executes rapid buy orders upon detection
📊 Tracks market cap in real-time
💰 Triggers auto-sell when your conditions are met

Join the trading revolution today! 🌟
`;

const swapSuccessText = (tokenInfo, signature, solAmount, tokenAmount) => {
  return `🟢 <b>Buying <b>${tokenInfo.symbol || tokenInfo.name}</b> is success</b>.
You bought ${tokenAmount / 10 ** tokenInfo.decimals} <b>${
    tokenInfo.symbol || tokenInfo.name
  }</b> using <b>${solAmount}</b> SOL.
📝<a href='https://solscan.io/tx/${signature}'>Transaction</a>`;
};

const settingText = `User Setting:
Please depoit SOL to your wallet to start sniping
You can set auto sniping amount, jito fee, time range, etc.`;

module.exports = { helpText, settingText, newUserText, startText, swapSuccessText };
