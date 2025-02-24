
const positionListText = (positions) => {
  if (positions.length === 0) {
    return `
<b>Positions</b>

No open positions yet!
Start your trading journey by pasting a contract address in chat.
`;
  }

  const positionText = positions.map((position, index) => {
    return `
Position ${index+1}:
<code>${position.tokenInfo.address}</code>
Token Amount: ${position.outAmount / (10 ** position.tokenInfo.decimals)}
Use Sol Amount: ${position.usedSolAmount}
Created At: ${new Date(position.createdAt).toUTCString()}
`;
  }).join("\n");

  return positionText;
}

const createPositionText = `
Enter the contract address of the token you want to buy
`;


const openPositionText = (tokenInfo, walletText) => {
  return `
<b>Position</b>

🌐 ${tokenInfo.name} ${tokenInfo.symbol}
<code>${tokenInfo.address}</code> 
📊 Market Cap: $${tokenInfo.mCap}

${walletText}
  `
}

const setBuyTipText = `
Please enter your desired sell fee amount in SOL:
`;

const setSlippageText = `
Please enter your desired buy slippage amount in %:
`;


module.exports = {
  positionListText,
  openPositionText,
  createPositionText,
  setBuyTipText,
  setSlippageText,
}
