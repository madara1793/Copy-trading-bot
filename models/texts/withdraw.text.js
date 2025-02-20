const withdrawText = (user) => {
  return `
<b>Withdraw Solana</b>

Balance: ${user.balance} SOL

Current withdrawal address:
<code>${user.withdrawalAddress}</code> \n
  `;
}

const WithdrawalUpdateText = `
Input your withdrawal address
`;

const WithdrawAmountText = `
Please enter the amount you want to withdraw
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
  withdrawSuccessText,
  withdrawFailedText
}