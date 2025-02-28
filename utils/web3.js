const { AddressLookupTableAccount, Keypair, PublicKey, VersionedTransaction, SystemProgram, TransactionInstruction, TransactionMessage, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { searcherClient } = require("jito-ts/dist/sdk/block-engine/searcher");
const { Metaplex } = require('@metaplex-foundation/js');
const bs58 = require('bs58');

const { connection, bot } = require('@config/config');
const { uint8ArrayToHex } = require("@utils/functions");
const { getTokenPrice, getQuoteForSwap, getSwapInstruction, getSerializedTransaction } = require('./jupiter');
const { sendBundle } = require('./jito');
const { pendingTxText } = require('@models/text.model');

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

const getTokenSupply = async (mint) => {
  const res = await connection.getTokenSupply(new PublicKey(mint));
  return res.value;
};

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
  const hexRegex = /^[0-9a-fA-F]+$/;
  const privateKeyUint8 = hexRegex.test(privateKey) ? Buffer.from(privateKey, 'hex') : bs58.decode(privateKey)

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

const deserializeInstruction = (instruction) => {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
};


const getAddressLookupTableAccounts = async (
  keys
) => {
  const addressLookupTableAccountInfos =
  await connection.getMultipleAccountsInfo(
      keys.map((key) => new PublicKey(key))
  );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
        });
        acc.push(addressLookupTableAccount);
    }

    return acc;
    }, new Array());
};


const getJitoTipAccount = async () => {
  const blockchainEngineUrl = process.env.BLOCKCHAIN_ENGINE_URL;
  const searcher = searcherClient(blockchainEngineUrl, undefined);
  const _tipAccount = (await searcher.getTipAccounts()).value[0];
  const tipAccount = new PublicKey(_tipAccount);

  return tipAccount;

}


/**
 *
 * @param {string} inputAddr
 * @param {string} outputAddr
 * @param {number} amount
 * @param {string} secretKey
 * @param {number} jitoFee
 */
const swapTokens = async (inputAddr, outputAddr, amount, secretKey, jitoFee, tgId = null) => {
  const hexRegex = /^[0-9a-fA-F]+$/;

  const keyPair = Keypair.fromSecretKey(hexRegex.test(secretKey) ? 
    Buffer.from(secretKey, 'hex') :
    bs58.decode(secretKey)
  );
  const prevSolBalance = await getBalanceOfWallet(keyPair.publicKey.toString());
  
  const quote = await getQuoteForSwap(inputAddr, outputAddr, Math.floor(amount * 0.99));
  if (quote.error) {
    return { success: false, error: quote.error };
  }

  const { addressLookupTableAddresses, swapInstruction, setupInstructions } = await getSwapInstruction(quote, keyPair.publicKey.toString());


  // Jito Fee Instruction
  const tipAccount = await getJitoTipAccount();
  const jitoTipInstruction = SystemProgram.transfer({
    fromPubkey: keyPair.publicKey,
    toPubkey: tipAccount,
    lamports: Math.floor(jitoFee * LAMPORTS_PER_SOL),
  });

  // 1% Swap Fee Instruction
  const lamports = inputAddr === 'So11111111111111111111111111111111111111112' ? amount * 0.01 : quote.outAmount * 0.01;
  const feeInstruction = SystemProgram.transfer({
    fromPubkey: keyPair.publicKey,
    toPubkey: new PublicKey(process.env.FEE_COLLECTOR),
    lamports: Math.floor(lamports),
  });
  
  const instructions = [
    jitoTipInstruction,
    feeInstruction,
    ...setupInstructions.map(deserializeInstruction),
    deserializeInstruction(swapInstruction),
  ];

  const addressLookupTableAccounts = [];
  addressLookupTableAccounts.push(
    ...(await getAddressLookupTableAccounts(addressLookupTableAddresses))
  );
    
  const blockhash = (await connection.getLatestBlockhash()).blockhash;
  const messageV0 = new TransactionMessage({
    payerKey: keyPair.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const feeVersionedTransaction = new VersionedTransaction(messageV0);
  feeVersionedTransaction.sign([keyPair]);
  
  if (tgId) {
    await bot.telegram.sendMessage(tgId, pendingTxText(feeVersionedTransaction.signatures[0]), { parse_mode: 'HTML' });
  }

  // Send Bundle
  const result = await sendBundle([feeVersionedTransaction], keyPair, jitoFee);
  console.log('sendBundle result:', result);

  const laterSolBalance = await getBalanceOfWallet(keyPair.publicKey.toString());

  return {
    ...result,
    outAmount: quote.outAmount,
    solDiff: Math.abs(laterSolBalance - prevSolBalance)
  }
}

const transferLamport = async (fromSecretKey, toPubliKey, lamports) => {
  const hexRegex = /^[0-9a-fA-F]+$/;

  const payer = Keypair.fromSecretKey(hexRegex.test(fromSecretKey) ? 
    Buffer.from(fromSecretKey, 'hex') :
    bs58.decode(fromSecretKey)
  );
  const payerBalance = await connection.getBalance(payer.publicKey);

  if (payerBalance < lamports) {
    throw new Error('Insufficient SOL balance');
  }

  const instructions = [
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: new PublicKey(toPubliKey),
      lamports: Math.floor(lamports),
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
  getTokenSupply,
  generateWallet,
  getBalanceOfWallet,
  getTokenBalanceOfWallet,
  getPublicKey,
  transferLamport,
  confirmTransaction,
  swapTokens,
};