const referralText = (user, referrals) => {
  return `
<b>Referral Program</b>

🔗 <b>Your Referral Link:</b>
<code>https://t.me/kcrypto_copy_trading_bot?start=${user.referralCode}</code>

<b>Your Payout Address:</b>
<code>${user.defaultWallet.publicKey}</code>

📈 <b>Referrals Volume:</b>

• Level 1: ${user.referLvls.level_1.count} Users / 0 SOL
• Level 2: ${user.referLvls.level_2.count} Users / 0 SOL
• Level 3: ${user.referLvls.level_3.count} Users / 0 SOL
• Referred Trades: ${user.referralCounts}

📊 <b>Rewards Overview:</b>

• Total Claimed: ${user.referralRewards} SOL
  `;
}

module.exports = {
  referralText,
};