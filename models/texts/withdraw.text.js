const withdrawText = (user) => {
  return `
<b>Withdraw Your SOL</b>

<code>${user.wallet.publicKey}</code>
Balance: ${user.balance} SOL

Current withdrawal address: <code>${user.withdrawalAddress || "N/A"}</code> \n
  `;
}

const WithdrawalUpdateText = `
Input your withdrawal address
`;

const WithdrawAmountText = `
Please enter the amount you want to withdraw
`;

const WalletNotFoundText = `
Wallet Not Found
`;


const withdrawSuccessText = (txId) => {
  return  `
✅ Withdrawal address updated successfully!
<a href="https://solscan.io/tx/${txId}">${txId}</a>
  `;
}

const withdrawFailedText = (error) => `
  ⛔ Transaction failed
  <code>${error}</code>
`;


module.exports = {
  withdrawText,
  WithdrawalUpdateText,
  WithdrawAmountText,
  WalletNotFoundText,
  withdrawSuccessText,
  withdrawFailedText,
}