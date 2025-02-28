const fetch = require("cross-fetch");

/**
 *
 * @param {string} inputAddr
 * @param {string} outputAddr
 * @param {number} amount
 * @param {number} slippageBps
 * @returns
 */
const getQuoteForSwap = async (inputAddr, outputAddr, amount, slippageBps = 50) => {
  try {
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputAddr}&outputMint=${outputAddr}&amount=${amount}&slippageBps=${slippageBps}`
    );
    const quote = await response.json();
    
    return quote;
  } catch (error) {
    console.error('Error while getQuoteForSwap:', error);
    throw new Error('Error while getQuoteForSwap');
  }
}


const getSwapInstruction = async (quote, publicKey) => {
  try {
    const response = await fetch(
      'https://api.jup.ag/swap/v1/swap-instructions', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: publicKey.toString(),
        }),
      }

    
    );

    const instructions = await response.json();
    if (instructions.error) {
      throw new Error("Failed to get swap instructions: " + instructions.error);
    }

    return instructions;
  } catch (error) {

  }
}


/**
 *
 * @param {any} quote
 * @param {string} publicKey
 * @returns
 */
const getSerializedTransaction = async (quote, publicKey, address) => {
  try {
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: publicKey,
        wrapAndUnwrapSol: true,
        feeAccount: address,
      }),
    });
    const { swapTransaction } = await response.json();
    return swapTransaction;
  } catch (error) {
    console.log('Error while getSerializedTransaction:', error);
    throw new Error('Error while getSerializedTransaction');
  }
}


const getTokenPrice = async (token) => {
  try {
    const response = await fetch(`https://api.jup.ag/price/v2?ids=${token}`, {
      method: 'get',
      redirect: 'follow',
    });
    const { data } = await response.json();
    console.log('price:', data);
    return data[token]?.price;
  } catch (error) {
    console.error('Error while getTokenPrice:', error);
    throw new Error('Error while getTokenPrice');
  }
}


module.exports = {
  getQuoteForSwap,
  getSerializedTransaction,
  getTokenPrice,
  getSwapInstruction
};