const fs = require('fs');
const bs58 = require('bs58');
const { Context } = require('telegraf');
const {
  Keypair,
  PublicKey,
  ParsedInstruction,
  TransactionInstruction,
  ComputeBudgetProgram,
  TransactionMessage,
  NATIVE_MINT,
  Connection,
} = require('@solana/web3.js');

const Wallet = require("@models/wallet.model");
const User = require("@models/user.model");
const { bot } = require("@config/config");
const { swapTokens, getTokenInfo, getBalanceOfWallet, getTokenBalanceOfWallet } = require('./web3');
const { swapSuccessText } = require("@models/text.model");


const connection1 = new Connection(process.env.HTTP_URL || "",  {commitment: "confirmed"});
const TARGET_WALLET_MIN_TRADE = parseInt(process.env.TARGET_WALLET_MIN_TRADE || "0");
const RAYDIUM_LIQUIDITYPOOL_V4 = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
const SOL_ADDRESS = new PublicKey('So11111111111111111111111111111111111111112');
const TRADE_AMOUNT = parseInt(process.env.TRADE_AMOUNT || "0");


const { 
  LIQUIDITY_STATE_LAYOUT_V4, 
  Liquidity, 
  MARKET_STATE_LAYOUT_V3, 
  SPL_MINT_LAYOUT, 
  LiquidityPoolKeys, 
  Market
} = require("@raydium-io/raydium-sdk");

const {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
} = require("@solana/spl-token");

const { getTargetWallet, getTargetMinTradeAmount } = require("@store/index")



const LAMPORTS_IN_SOL = 1_000_000_000;

// Confirm the bot started working
console.info('Gamesoft Interactive, 2025');
console.info('Copy trading bot for Solana.');
console.info('Target wallet minimal trade size', TARGET_WALLET_MIN_TRADE / LAMPORTS_IN_SOL, 'SOL');
console.info('Trading amount', TRADE_AMOUNT / LAMPORTS_IN_SOL, 'SOL');


/*
 * Stores timestamp when the app started
 * Used to prevent processing transactions created before app launch
 */

let appStartedAtSeconds = Math.floor(Date.now() / 1000);

/*
 * Trade log filename (ensure it is ignored by Git)
 * TODO: Specify through configuration file
 */

const LOG_FILE = 'trade_log.csv';

// Create log file if not exists and add headers
if (!fs.existsSync(LOG_FILE)) { 
  fs.writeFileSync(LOG_FILE, 'Timestamp,Action,Wallet,Token,Amount (SOL),Reason\n'); 
}

/**
 * How many latest transactions to check for target wallet with each main loop iteration
 */
const signaturesForAddressLimitCount = 10;

/**
 * Stores transaction signatures which has been already processed.
 * Used to prevent processing transactions more than once.
 */
const processedTransactionSignatures = [];

/**
 * How many processed transaction signatures to store at most.
 * This value must be higher than signaturesForAddressLimitCount but not too much. x10 is probably enough.
 */
const processedTransactionSignaturesLimitCount = signaturesForAddressLimitCount * 10;

let buyTokenList = [];

/*
 * Primary function invoked by main loop and calling all subsequent functions during its work
 * @param {Context} ctx
 */
const trackTargetWallet = async (user) => {

    let signatures;

    const wallet = await Wallet.findById(user.defaultWallet);
    const pubKey = wallet.publicKey;
    const secretKey = wallet.privateKey;
    const targetWalletAddress = user.followingTraders[0];
  
    console.log(">>>>>Targetting >>>>>>>", targetWalletAddress);
    if (!targetWalletAddress) {
      console.error('Error: Target wallet not found');
      return;
    }

    const targetWallet = new PublicKey(targetWalletAddress);

    try {
      signatures = await connection1.getSignaturesForAddress(targetWallet, {limit: signaturesForAddressLimitCount});
    } catch (error) {
      console.error('Error fetching signatures:', error.cause);
      return;
    }

    for (const signatureInfo of signatures) {
      // Send for processing only unprocessed transactions
      // Do not send transactions created before app launch
      if (signatureInfo.blockTime && signatureInfo.blockTime > appStartedAtSeconds && !processedTransactionSignatures.includes(signatureInfo.signature)) {
        await processTransaction(targetWallet, pubKey, secretKey, signatureInfo, user.tgId);
        processedTransactionSignatures.push(signatureInfo.signature);
        if (processedTransactionSignatures.length > processedTransactionSignaturesLimitCount)
          processedTransactionSignatures.shift(); // Remove first value to keep this list relatively short
      }
    }
}

/**
 * Process specific transaction
  * @param {PublicKey} targetWalletAddress 
  * @param {string} pubKey
  * @param {string} wallet
  * @param {any} signatureInfo
  * @param {number} tradeAmount
  * @param {number} jitoFee
  * @param {string} tgId
 */
async function processTransaction(targetWalletAddress, pubKey, wallet, signatureInfo, tgId) {
    console.info('wallet', wallet);
    console.log('Transaction detected:');
    console.log('Signature:', signatureInfo.signature);
    console.info('Timestamp:', signatureInfo.blockTime && new Date(signatureInfo.blockTime * 1000).toLocaleString() || 'None');    

    const { signature, err } = signatureInfo;
    
    if (err) return;

    let transactionDetails;
    try {
        transactionDetails = await connection1.getParsedTransaction(signature, {commitment: "confirmed", maxSupportedTransactionVersion: 0});
    } catch (error) {
        console.log('Error: analyze signature error!');
        return null;
    }

    const signer = transactionDetails.transaction.message.accountKeys
      .find(key => key.signer && key.writable && key.source === 'transaction')
      ?.pubkey.toBase58();

    console.log("Signer", signer);
    if (!signer) {
      console.log('No signer');
      return;
    }

    const solAmount = (transactionDetails.meta.postBalances[0] - transactionDetails.meta.preBalances[0]) / LAMPORTS_IN_SOL;
    console.log("sola amount", solAmount);

    const tokenData = getDeltaAmount(
      signer, 
      transactionDetails.meta.preTokenBalances,
      transactionDetails.meta.postTokenBalances,
    );
    console.log(tokenData);
    if (!tokenData) return;
    if (
      (tokenData.is_buy && solAmount > 0) ||
      (!tokenData.is_buy && solAmount < 0)
    ) {
      return;
    }

    if (tokenData.significantMints.length > 0) {
      console.log(tokenData.significantMints);
      const user = await User.findOne({ tgId });
      const tradeAmount = user.tradeAmount;
      const jitoFee = user.jitoFee;


      if (!user) {
        return;
      }
      
      tokenData.significantMints.forEach(async (mint) => {
        let replyMsg = '';
        const solBalance = await getBalanceOfWallet(pubKey);
        if (tokenData.is_buy && solBalance < tradeAmount * 1e9) {
          replyMsg = `Insufficient balance Current balance: ${solBalance / 1000000000} SOL`;
        } else {
          if (tokenData.is_buy) {
            const result = await swapTokens(
              'So11111111111111111111111111111111111111112', 
              mint.mint, 
              tradeAmount * 1e9, 
              wallet, 
              jitoFee
            );
            if (result.success) {
              const tokenInfo = await getTokenInfo(mint.mint);

              replyMsg = swapSuccessText(tokenInfo, result.signature, tradeAmount, result.outAmount);

              user.tokens.push({
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                decimals: tokenInfo.decimals,
                address: tokenInfo.address,
                amount: tokenAmount || result.outAmount,
                usedSolAmount: result.solDiff,
                price: tokenInfo.price,
              });
              await user.save();
            } else {
              replyMsg = `🔴 Buy failed \n ${result.error ? result.error : 'Something went wrong'}`;
            }
          } else {
            const amount = user.tokens.find(token => token.address === mint.mint).amount || 0;
            if (!amount) {
              replyMsg = "You don't have this token";
            }
            const result = await swapTokens(
              mint.mint, 
              'So11111111111111111111111111111111111111112', 
              amount, 
              wallet, 
              jitoFee
            );
            if (result.success) {
              const tokenInfo = await getTokenInfo(mint.mint);

              replyMsg = `🟢 <b>Selling <b>${tokenInfo.symbol|| tokenInfo.name}</b> is success</b>\nYou sold ${amount  / 10 ** tokenInfo.decimals}`;

              user.tokens.splice(user.tokens.findIndex(token => token.address === mint.mint), 1);
              await user.save();
            } else {
              replyMsg = `🔴 Sell failed \n ${result.error ? result.error : 'Something went wrong'}`;
            }
          }
        }

        await bot.telegram.sendMessage(tgId, replyMsg, { parse_mode: 'HTML' });
      })
    }


    // if (res && res.mint && res.pool) {

    //     console.info('\x1b[32mSwap transaction\x1b[0m');
    //     console.info('Mint:', res.mint.toString());
    //     console.info('Pool:', res.pool.toString());

    //     const tradeSize = await getTradeSize(connection1, res.signature);

    //     // Skip trades below the minimum threshold
    //     // if (tradeSize < targetMinTradeAmount) {
    //     //     logToFile('Skipped', targetWalletAddress.toString(), res.mint.toString(), (tradeSize / 1_000_000_000).toString(), 'Below minimum trade size');
    //     //     console.log(`Skipped: Value (${tradeSize / 1000000000} SOL) below threshold (${targetMinTradeAmount / 1000000000} SOL).`);
    //     //     return;
    //     // }

    //     logToFile('Buy Detected', targetWalletAddress.toString(), res.mint.toString(), (tradeSize / 1_000_000_000).toString());
    //     console.log(`Target: buy ${res.mint} token on ${res.pool} pool`);


    //     console.log(res.mint.toBase58(), wallet, tradeAmount, jitoFee)
    //     const balance = await getBalanceOfWallet(pubKey);
    //     let replyMessage = '';

    //     if (tradeSize === 0) return;

    //     if (balance < tradeAmount * 10 ** 9) {
    //       replyMessage = `Insufficient balance. Current balance: ${balance / 1000000000} SOL`;
    //     } else {
    //       const tokenInfo = await getTokenInfo(res.mint.toBase58());

    //       const inputToken = tradeSize === 1 ? 'So11111111111111111111111111111111111111112' : res.mint.toBase58();
    //       const outputToken = tradeSize === 1 ? res.mint.toBase58() : 'So11111111111111111111111111111111111111112';
    //       const amount = tradeSize === 1 ? tradeAmount * 1e9 : (await getTokenBalanceOfWallet(pubKey, res.mint.toBase58())) * (10 ** tokenInfo.decimals);

    //       const result = await swapTokens(
    //         inputToken, 
    //         outputToken, 
    //         amount, 
    //         wallet, 
    //         jitoFee
    //       );

    //       if (result.success) {
    //         const tokenAmount = await getTokenBalanceOfWallet(pubKey, res.mint.toBase58());

    //         replyMessage = swapSuccessText(tokenInfo, result.signature, tradeAmount, tokenAmount || result.outAmount);

    //         const user = await User.findOne({ tgId });
    //         if (user) {
    //           user.tokens.push({
    //             name: tokenInfo.name,
    //             symbol: tokenInfo.symbol,
    //             decimals: tokenInfo.decimals,
    //             address: tokenInfo.address,
    //             amount: tokenAmount || result.outAmount,
    //             usedSolAmount: result.solDiff,
    //             price: tokenInfo.price,
    //           });
    //           await user.save();
    //         } else {
    //           replyMessage = `🔴 Buy failed. \n ${result.error ? result.error : 'Something went wrong.'}`;
    //         }
    //       }
    //     }


    //     await bot.telegram.sendMessage(tgId, replyMessage, { parse_mode: 'HTML' });

    //     // if (buy && buy.mint && buy.poolKeys) {
    //     //     sellWithLimitOrder(connection2, buy.mint, buy.poolKeys);
    //     // }
    // } else {
    //     console.info('Not a swap transaction.');
    // }
}

/**
 * Obtains trade size for transaction with specified signature
 */

async function getTradeSize(connection, signature) {

    let transactionDetails;
    try {
        transactionDetails = await connection.getParsedTransaction(signature, {commitment: "confirmed", maxSupportedTransactionVersion: 0});
    } catch (error) {
        console.error('Error fetching trade size:', error);
        return 0;
    }

    const postBalances = transactionDetails?.meta?.postBalances || [];
    const preBalances = transactionDetails?.meta?.preBalances || [];
    const postTokenBalances = transactionDetails?.meta?.preTokenBalances || [];
    const preTokenBalances = transactionDetails?.meta?.preTokenBalances || [];

    console.log(postBalances[0], preBalances[0], postTokenBalances[0], preTokenBalances[0]);

    if (postBalances.length > 0 && preBalances.length > 0 && postTokenBalances > 0 && preTokenBalances > 0) {
      if (postBalances[0] < preBalances[0] && postTokenBalances[0] > preTokenBalances[0]) {
        return 1;
      } else if (postBalances[0] > preBalances[0] && postTokenBalances[0] < preTokenBalances[0]) {
        return -1;
      } else {
        return 0;
      }
    }

    return 0;  
}

/**
 * Analyzes transaction
 * @param {Connection} connection 
 * @param signature 
 * @returns 
 */
async function analyzeSignature(connection, signature) {

    let transactionDetails;
    try {
        transactionDetails = await connection.getParsedTransaction(signature, {commitment: "confirmed", maxSupportedTransactionVersion: 0});
    } catch (error) {
        console.log('Error: analyze signature error!');
        return null;
    }

    const signer = transactionDetails.transaction.message.accountKeys
      .find(key => key.signer && key.writable && key.source === 'transaction')
      ?.pubkey.toBase58();
    if (!signer) {
      console.log('No signer');
      return;
    }

    const solAmount = (transactionDetails.meta.postBalances[0] - transactionDetails.meta.preBalances[0]) / LAMPORTS_IN_SOL;

    const tokenData = getDeltaAmount(
      signer, 
      transactionDetails.meta.preTokenBalances,
      transactionDetails.meta.postTokenBalances,
    );
    if (!tokenData) return;
    if (
      (tokenData.is_buy && solAmount > 0) ||
      (!tokenData.is_buy && solAmount < 0)
    ) {
      return;
    }

    if (tokenData.significantMints.length > 0) {
      console.log(tokenData.significantMints);
    }
    

    // // let isBuy = true;
    // let mintAddress;
    // let poolAddress;
    
    // if (transactionDetails?.meta?.logMessages) {
    //   const logs = transactionDetails.meta.logMessages;          
    //   const isRaydiumLog = logs.some(log =>
    //     log.includes(RAYDIUM_LIQUIDITYPOOL_V4.toString())
    //   );          
    //   const isTransferLog = logs.some(log =>
    //     log.includes("Program log: Instruction: Transfer")
    //   );
  
    //   if (isRaydiumLog && isTransferLog) {    
    //     //console.log('--- Detect Target Wallet Swap Transaction ---');  
    //     for (const instruction of transactionDetails.transaction.message.instructions) {  
    //       if ('accounts' in instruction && instruction.programId.equals(RAYDIUM_LIQUIDITYPOOL_V4)) {
    //         poolAddress = instruction.accounts[1];
    //         const poolAccount = await connection.getAccountInfo(poolAddress, "confirmed");
            
    //         if(poolAccount) {
    //           const poolInfo = LIQUIDITY_STATE_LAYOUT_V4.decode(poolAccount.data);
    //           mintAddress = poolInfo.quoteMint.equals(SOL_ADDRESS) ? poolInfo.baseMint : poolInfo.quoteMint;
    //         }
    //       }
    //       const parsedInstruction = instruction;
    //       console.log(parsedInstruction);
    //       if(parsedInstruction?.parsed?.type == 'createAccountWithSeed' && parsedInstruction?.parsed?.info?.lamports == '2039280') {
    //         // isBuy = false;  
    //       }        
    //     }
    //   }
    // }  


    // return {signature, pool: poolAddress, mint: mintAddress }  
}



const getDeltaAmount = (signer, preData, postData) => {
  const mints = [];

  for (const item1 of preData) {
    const _mint1 = item1.mint;
    const _owner1 = item1.owner;
    if (_owner1 !== signer) continue;
    for (const item2 of postData) {
      const _mint2 = item2.mint;
      const _owner2 = item2.owner;
      if (_owner2 !== signer) continue;
      if (_mint1 === _mint2 && _owner1 === _owner2) {
        const deltaAmount =
          Number(item2.uiTokenAmount.uiAmount) -
          Number(item1.uiTokenAmount.uiAmount);
        const mint = _mint1;
        if (deltaAmount === 0) continue;
        mints.push({ mint: mint, amount: deltaAmount });
      }
    }
  }

  let is_buy = true;
  let is_wSolReceived = false;
  const significantMints = mints.filter((item) => Math.abs(item.amount) > 0);
  significantMints.forEach((item) => {
    const isWSol = item.mint === 'So11111111111111111111111111111111111111112';
    if(isWSol && item.amount > 0) is_wSolReceived = true;
    if (!isWSol && item.amount < 0) is_buy = false;
  });

  if(is_wSolReceived && is_buy)
    return null;

  const onlyWsolChanges =
    significantMints.length === 1 &&
    significantMints[0].mint === 'So11111111111111111111111111111111111111112';
  return onlyWsolChanges ? null : { is_buy, significantMints };
};


// async function sellAllToken(
//   connection,
//   pool,
//   mint,
//   tokenAmount
// ) {
//   const tokenATA = getAssociatedTokenAddressSync(mint, WALLET.publicKey);
//   const solATA = getAssociatedTokenAddressSync(SOL_ADDRESS, WALLET.publicKey);
//   const tokenBalance = BigInt(tokenAmount);
//   const poolKeys = await getLiquidityV4PoolKeys(connection1, pool);
//   if (poolKeys && tokenBalance > BigInt(0)) {
//     const swapInst = await getSwapTokenGivenInInstructions(
//       WALLET.publicKey,
//       poolKeys,
//       mint,
//       tokenBalance
//     );
//     let sellInsts = [];
//     sellInsts.push(
//       ComputeBudgetProgram.setComputeUnitPrice({
//         microLamports: 10000000,
//       }),
//       ComputeBudgetProgram.setComputeUnitLimit({ units: 78000 }),
//       ...swapInst,
//       createCloseAccountInstruction(
//         tokenATA,
//         WALLET.publicKey,
//         WALLET.publicKey,
//         []
//       )
//     );
//     let blockhash = await connection
//       .getLatestBlockhash()
//       .then((res) => res.blockhash);
//     const newTokenTransactionMessage = new TransactionMessage({
//       payerKey: WALLET.publicKey,
//       recentBlockhash: blockhash,
//       instructions: sellInsts,
//     }).compileToV0Message();
//     const versionedNewTokenTransaction = new VersionedTransaction(
//       newTokenTransactionMessage
//     );
//     versionedNewTokenTransaction.sign([WALLET]);
//     const res = await connection.sendRawTransaction(
//       versionedNewTokenTransaction.serialize(),
//       { skipPreflight: true }
//     );
//     console.log(`Sell: sell token - ${res}`);
//   }
// }

async function getLiquidityV4PoolKeys(connection, pool) {
  try {
    const poolAccount = await connection.getAccountInfo(pool, "confirmed");
    if (!poolAccount) return null;
    const poolInfo = LIQUIDITY_STATE_LAYOUT_V4.decode(poolAccount.data);
    if ( poolInfo.baseMint.toString() != SOL_ADDRESS.toString() && poolInfo.quoteMint.toString() != SOL_ADDRESS.toString() ) {
      return null;
    }

    const marketAccount = await connection.getAccountInfo(
      poolInfo.marketId,
      "confirmed"
    );
    if (!marketAccount) return null;
    const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

    const lpMintAccount = await connection.getAccountInfo(
      poolInfo.lpMint,
      "confirmed"
    );
    if (!lpMintAccount) return null;
    const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

    const poolKeys = {
      id: pool,
      baseMint: poolInfo.baseMint,
      quoteMint: poolInfo.quoteMint,
      lpMint: poolInfo.lpMint,
      baseDecimals: poolInfo.baseDecimal,
      quoteDecimals: poolInfo.quoteDecimal,
      lpDecimals: lpMintInfo.decimals,
      version: 4,
      programId: poolAccount.owner,
      authority: Liquidity.getAssociatedAuthority({
        programId: poolAccount.owner,
      }).publicKey,
      openOrders: poolInfo.openOrders,
      targetOrders: poolInfo.targetOrders,
      baseVault: poolInfo.baseVault,
      quoteVault: poolInfo.quoteVault,
      withdrawQueue: poolInfo.withdrawQueue,
      lpVault: poolInfo.lpVault,
      marketVersion: 3,
      marketProgramId: poolInfo.marketProgramId,
      marketId: poolInfo.marketId,
      marketAuthority: Market.getAssociatedAuthority({
        programId: poolInfo.marketProgramId,
        marketId: poolInfo.marketId,
      }).publicKey,
      marketBaseVault: marketInfo.baseVault,
      marketQuoteVault: marketInfo.quoteVault,
      marketBids: marketInfo.bids,
      marketAsks: marketInfo.asks,
      marketEventQueue: marketInfo.eventQueue,
      lookupTableAccount: PublicKey.default,
    };
    return poolKeys;
  } catch (error) {
    console.log('Error: get poolkeys error!');
    return null;
  }  
}

async function getSwapTokenGivenInInstructions (
  owner,
  poolKeys,
  tokenIn,
  _amountIn
) {
  const tokenOut = tokenIn.equals(poolKeys.baseMint) ? poolKeys.quoteMint : poolKeys.baseMint;
  const tokenInATA = getAssociatedTokenAddressSync(tokenIn, owner);
  const tokenOutATA = getAssociatedTokenAddressSync(tokenOut, owner);
  const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
    {
      poolKeys: poolKeys,
      userKeys: {
        tokenAccountIn: tokenInATA,
        tokenAccountOut: tokenOutATA,
        owner,
      },
      amountIn: _amountIn,
      minAmountOut: BigInt(0),
    },
    poolKeys.version
  );
  return [
    createAssociatedTokenAccountIdempotentInstruction(
      owner,
      tokenOutATA,
      owner,
      tokenOut
    ),
    ...innerTransaction.instructions,
  ];
};

// Performs logging to file
function logToFile(action, wallet, token, amount, reason = '') { 
  const timestamp = new Date().toISOString(); 
  const logEntry =  `${timestamp},${action},${wallet},${token},${amount},${reason}\n`; 
  fs.appendFileSync(LOG_FILE, logEntry); 
} 

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  trackTargetWallet,
  sleep
}