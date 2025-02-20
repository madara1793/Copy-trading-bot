const { Keypair, PublicKey, VersionedTransaction } = require('@solana/web3.js');
const { Metaplex } = require('@metaplex-foundation/js');
const bs58 = require('bs58');

const { connection } = require('@config/config');
const { uint8ArrayToHex } = require("@utils/functions");
const { getTokenPrice, getQuoteForSwap, getSerializedTransaction } = require('./jupiter');
const { sendBundle } = require('./jito');
const { SystemProgram } = require('@solana/web3.js');
const { TransactionMessage } = require('@solana/web3.js');


/**
 * Get token metadata from its address
 * @param {string} mintAddress
 */
async function getTokenInfo(mintAddress) {
  const metaplex = Metaplex.make(connection);

  const mint = new PublicKey(mintAddress);

  try {
    const tokenMetadata = await metaplex.nfts().findByMint({ mintAddress: mint });
    const price = await getTokenPrice(mintAddress);
    console.log('Token Name:', tokenMetadata.mint.supply);
    return {
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      address: tokenMetadata.address.toString(),
      decimals: tokenMetadata.mint.decimals,
      price,
    };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
  }
}

/**
 * Generate new Solana wallet.
 * @returns Return object of publicKey and privateKey
 */
const generateWallet = async () => {
  try {
    const keyPair = Keypair.generate(); // Generate new key pair of publicKey and privateKey
    console.log('Pub', keyPair.publicKey.toString(), 'pri', uint8ArrayToHex(keyPair.secretKey));
    return {
      publicKey: keyPair.publicKey.toString(),
      privateKey: uint8ArrayToHex(keyPair.secretKey),
    };
  } catch (error) {
    console.error('Error while generating wallet:', error);
    throw new Error('Failed to generate new Solana wallet.');
  }
};


/**
 * Get the SOL balance of wallet
 * @param {string} walletAddress
 * @returns
 */
const getBalanceOfWallet = async (walletAddress) => {
  try {
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    console.log('SOL balance:', balance);
    return balance;
  } catch (error) {
    console.error('Error while getBalanceOfWallet', error);
  }
}

/**
 * Get the token balance of wallet
 * @param {string} walletAddress
 * @param {string} tokenAdddr
 * @returns
 */
const getTokenBalanceOfWallet = async (walletAddr, tokenAdddr) => {
  try {
    const info = await connection.getParsedTokenAccountsByOwner(new PublicKey(walletAddr), {
      mint: new PublicKey(tokenAdddr),
    });
    const tokenInfo = info?.value[0]?.account?.data.parsed.info.tokenAmount;
    console.log('token balance:', tokenInfo);
    // return balance;
    return tokenInfo?.amount;
  } catch (error) {
    console.error('Error while getBalanceOfWallet', error);
    return null;
  }
}

/**
 * Get public key from private key
 * @param {string} privateKey 
 * @returns 
 */
const getPublicKey = (privateKey) => {
  const privateKeyUint8 = bs58.default.decode(privateKey);

  const keyPair = Keypair.fromSecretKey(privateKeyUint8);
  return keyPair.publicKey.toString();
};


/**
 *
 * @param {string} swapTransaction
 * @returns
 */
const getDeserialize = async (swapTransaction) => {
  try {
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    return transaction;
  } catch (error) {
    console.error('Error while getDeserialize:', error);
    throw new Error('Error while getDeserialize');
  }
}


/**
 *
 * @param {VersionedTransaction} transaction
 * @param {Keypair} keyPair
 * @returns
 */
const signTransaction = async (transaction, keyPair) => {
  try {
    transaction.sign([keyPair]);
    return transaction;
  } catch (error) {
    console.error('Error while signTransaction:', error);
    throw new Error('Error while signTransaction');
  }
}

/**
 *
 * @param {string} inputAddr
 * @param {string} outputAddr
 * @param {number} amount
 * @param {string} secretKey
 * @param {number} jitoFee
 */
const swapTokens = async (inputAddr, outputAddr, amount, secretKey, jitoFee) => {
  const keyPair = Keypair.fromSecretKey(bs58.default.decode(secretKey));
  const prevSolBalance = await getBalanceOfWallet(keyPair.publicKey.toString());
  console.log("-----> Previous Sol: ", prevSolBalance);
  
  const quote = await getQuoteForSwap(inputAddr, outputAddr, amount);
  if (quote.error) {
    return { success: false, error: quote.error };
  }
  console.log("-----> Quote: ", quote);

  const swapTransaction = await getSerializedTransaction(quote, keyPair.publicKey.toString());
  const transaction = await getDeserialize(swapTransaction);
  console.log("-----> Swap Tx: ", transaction);

  const signedTransaction = await signTransaction(transaction, keyPair);
  console.log("-----> Signed Tx: ", signedTransaction);

  const result = await sendBundle([signedTransaction], keyPair, jitoFee);
  console.log('sendBundle result:', result);

  const laterSolBalance = await getBalanceOfWallet(keyPair.publicKey.toString());
  console.log('-----> later Sol:', laterSolBalance);

  return {
    ...result,
    outAmount: quote.outAmount,
    solDiff: Math.abs(laterSolBalance - prevSolBalance)
  }
}

const transferLamport = async (fromSecretKey, toPubliKey, lamports) => {
  const payer = Keypair.fromSecretKey(bs58.default.decode(fromSecretKey));
  const payerBalance = await connection.getBalance(payer.publicKey);

  if (payerBalance < lamports) {
    throw new Error('Insufficient SOL balance');
  }

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: new PublicKey(toPubliKey),
      lamports,
    }),
  ];
  const blockhash = await connection.getLatestBlockhash().then(((res) => res.blockhash));
  const messageV0 = new TransactionMessage({
    payerKey: payer.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);

  transaction.sign([payer]);
  const txId = await connection.sendTransaction(transaction);

  return txId;
}

const confirmTransaction = async (txid) => {
  const res = await connection.confirmTransaction(txid);
  if (res.value.err) {
    throw new Error(res.value.err.toString());
  }
  return res;
};



module.exports = {
  getTokenInfo,
  generateWallet,
  getBalanceOfWallet,
  getTokenBalanceOfWallet,
  getPublicKey,
  transferLamport,
  confirmTransaction,
  swapTokens,
};