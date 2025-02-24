const User = require('@models/user.model');
const Wallet = require('@models/wallet.model');

const startText = (wallets) => {
  const balances = wallets.map((wallet, index) => {
    return `→ W${index+1}:
<code>${wallet.publicKey}</code>
Balance: ${wallet.balance} SOL
`;
});

  return `
    🎉 Welcome to Mimic! 🎭

Mimic success, maximize profits.

🎭Your Solana Wallet Address:
${balances.join('')}

Get started below👇! 
  `
};

/**
 * The text when start command is inputed
 */
const settingText =  `
  🛠️ Copy Trading Bot Settings

Welcome to the settings page for your Solana Trading Bot!

1. Trade Amount: 
  - Specify the amount of SOL you wish to trade (Default is 0.001 sol).
2. Priority Fee: 
  - Set the priority fee (in SOL) to ensure your transactions are processed quickly.
3. Jito Fee:
  - Set the Jito fee (in SOL) to  prioritize transaction inclusion in blocks using Jito’s MEV.
4. Slippage BPS: 
  - Define the slippage in basis points (bps).

🔧 Please adjust these settings according to your trading strategy and preferences.

                                                            The Unique Solana Trading Bot.
`;

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

const walletText = (wallets) => {
  if (!wallets || wallets.length === 0) {
    return `
      \n <b>No wallets found</b>  Please generate new wallets
    `;
  }

  return wallets.map((wallet, index) => {
    return `<b>W${index + 1}</b>: ${wallet.name} ${wallet.isDefaultWallet ? '📌':''} \n<code>${wallet.publicKey}</code>`;
  }).join('\n\n');
};

/**
 * @param {Wallet} wallet
 */
const newWalletText = (wallet) => {
  return `
    ✅ Wallet generated successfully\nWallet address:\n<code>${wallet.publicKey}</code>\nWallet private key:\n<code>${wallet.privateKey}</code>\n
🚨🚨Please save Private key properly, this message will be automatically deleted after 20 seconds
❗️After the wallet is unbound, the private key cannot be retrieved
❗️If you forget to save, please check the private key in /settings/export private key
  `;
};

const privateKeyInputText = `
  Please enter your private key. \n Support formats are in the style of Phantom  (e.g. "2gn5wDdGAxaJWeN...") or Solflare (e.g. [46,26,185,95,...])
⚠️ Do not disclose your private key to others.
`;

const exportWalletKeyText = (wallet) => {
  return `${wallet.name}\nPublic Key:\n<code>${wallet.publicKey}</code>\n\nPrivate Key:\n<code>${wallet.privateKey}</code>`;
};


const tradeStartText = (trades) => {
  return `
🤖 Copy Trade

🌐 Utilize blazing fast copy trading speeds

${trades.map(trade => `${trade.status ? '🟢':'🔴'} <code>${trade.targetAddress}</code>`)}

Create a task below
  `;
}

/**
 * The text to be sent when new user login
 * @param {User} user
 */
const followingTraderText = (user) => {
  if (!user.followingTraders || user.followingTraders.length === 0) {
    return `
      \n <b>No following traders found</b>  Please add following traders
    `;
  }
  return user.followingTraders.map((trader, index) => {
    return `<b>Trader ${index + 1}:</b>\n${trader}\n`;
  }).join('\n');
}

/**
 * The text when help command is inputed
 */
const helpText = `🚀 <b>Solana Copy Trading Bot</b> 🚀

Supercharge your trading with our cutting-edge bot that tracks and capitalizes on Serum migrations from Raydium 💎

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

const swapSuccessText = (tokenInfo, signature, solAmount, tokenAmount, isBuy=true) => {
  return `🟢 <b>${isBuy?'Buying': 'Selling'} <b>${tokenInfo.symbol || tokenInfo.name}</b> is success</b>.
You ${isBuy?'bought':'sold'} ${tokenAmount / 10 ** tokenInfo.decimals} <b>${
    tokenInfo.symbol || tokenInfo.name
  }</b> using <b>${solAmount}</b> SOL.
📝<a href='https://solscan.io/tx/${signature}'>Transaction</a>`;
};

const swapFailedText = (signature, errorMsg) => {
  return `
⛔ Transaction failed
${errorMsg}
📝<a href='https://solscan.io/tx/${signature}'>Transaction</a>
`;
}


module.exports = { 
  helpText, 
  settingText, 
  newUserText, 
  walletText,
  newWalletText,
  privateKeyInputText,
  exportWalletKeyText,
  tradeStartText, 
  followingTraderText,
  startText, 
  swapSuccessText,
  swapFailedText,
};
