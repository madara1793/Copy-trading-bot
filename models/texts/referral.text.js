const referralText = (user) => {
  return `
<b>Referral Program</b>

🔗 <b>Your Referral Link:</b>
<code>https://t.me/kcrypto_copy_trading_bot?ref=${user.referralCode}</code>

<b>Your Payout Address:</b>
<code>${user.defaultWallet.publicKey}</code>

📈 <b>Referrals Volume:</b>

• Level 1: 0 Users / 0 SOL
• Level 2: 0 Users / 0 SOL
• Level 3: 0 Users / 0 SOL
• Referred Trades: 0

📊 <b>Rewards Overview:</b>

• Total Unclaimed: 0 SOL
• Total Claimed: 0 SOL
• Lifetime Earnings: 0 SOL
• Last distribution: 2025-02-16 12:19:06 \n
  `;
}

module.exports = {
  referralText,
};