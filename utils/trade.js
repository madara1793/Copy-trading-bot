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
const { swapTokens, getTokenInfo, getBalanceOfWallet, getTokenBalanceOfWallet, transferLamport } = require('./web3');
const { swapSuccessText } = require("@models/text.model");
const { getPair } = require('./dexscreener');



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
const trackTargetWallet = async (trade) => {
    let signatures;

    const targetWalletAddress = trade.targetAddress;
  
    console.log(">>>>>Targetting >>>>>>>", targetWalletAddress);

    connection1.onAccountChange(new PublicKey(targetWalletAddress), async () => {
      console.log("Detected>>>>>>", targetWalletAddress);

      if (!trade.status) {
        console.log("Cancelled because paused setup")
        return;
      }

      const parseRes = await parseTransaction(targetWalletAddress);
      if (!parseRes) {
        return;
      }

      let inputMint = parseRes.inputMint;
      let outputMint = parseRes.outputMint;
      let amount = parseRes.amount;
      let mode = parseRes.mode;

      console.log(inputMint, outputMint, amount, mode)

      if (inputMint && outputMint && amount && mode) {
        const user = await User.findById(trade.userId._id);

        let tradeAmount = 0;
        console.log(mode)
        if (mode === 'buy') {
          tradeAmount = trade.tradeAmount * 1e9;
        } else {
          const sellToken = user.tokens.find(token => token.address === inputMint);
          if (!sellToken) {
            return;
          }
          tradeAmount = sellToken.amount;
        }
        const jitoFee = trade.jitoTip;
        const pubKey = trade.wallet.publicKey;
        const secKey = trade.wallet.privateKey;

        let replyMsg = '';

        const result = await swapTokens(
          inputMint, 
          outputMint, 
          tradeAmount, 
          secKey, 
          jitoFee
        );
        
        console.log(result)

        if (result.success) {

          if (mode === 'buy') {
            const tokenInfo = await getTokenInfo(outputMint);
            replyMsg = swapSuccessText(tokenInfo, result.signature, tradeAmount / 1e9, result.outAmount);
            
            const tokenIndex = user.tokens.findIndex(token => token.address===outputMint);
            if (tokenIndex == -1) {
              user.tokens.push({
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                decimals: tokenInfo.decimals,
                address: tokenInfo.address,
                amount: result.outAmount,
                usedSolAmount: result.solDiff,
                price: tokenInfo.price,
              });
            } else {
              user.tokens[tokenIndex].amount += result.outAmount;
              user.tokens[tokenIndex].usedSolAmount += result.solDiff;
            }
            await user.save();
          } else {
            const tokenInfo = await getTokenInfo(inputMint);
            replyMsg = swapSuccessText(tokenInfo, result.signature, result.outAmount / 1e9, tradeAmount, false);
            
            //Remove sold token from tokenlist
            user.tokens.splice(user.tokens.findIndex(token => token.address === inputMint), 1);
            await user.save();
          }
          
          if (mode === 'sell') {
            const sellToken = user.tokens.find(token => token.address === inputMint);
            if (sellToken) {
              const profit = Math.abs(result.solDiff) - Math.abs(sellToken.usedSolAmount)
              console.log("profit 2>>>>>>>>", profit);
  
              if (profit > 0) {
                const leftReward = await distributeReferralRewards(secKey, user._id, profit);
                console.log(profit, leftReward);
              }
            }
          }
        } else {
          replyMsg = `🔴 Buy failed \n ${result.error ? result.error : 'Something went wrong'}`;
        }

        await bot.telegram.sendMessage(user.tgId, replyMsg, { parse_mode: 'HTML' });
      } else {
        console.log("Parse Error...");
      }
    });
    
    return;
    
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
        await processTransaction(signatureInfo, trade);
        processedTransactionSignatures.push(signatureInfo.signature);
        if (processedTransactionSignatures.length > processedTransactionSignaturesLimitCount)
          processedTransactionSignatures.shift(); // Remove first value to keep this list relatively short
      }
    }
}

/**
 * Process specific transaction
 *  @param {any} signatureInfo
  * @param {any} trade
 */
async function processTransaction(signatureInfo, trade) {
    console.log('Transaction detected:');
    console.log('Signature:', signatureInfo.signature);

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
      
      const user = await User.findById(trade.userId._id);
      const tradeAmount = trade.tradeAmount;
      const jitoFee = trade.jitoTip;
      const pubKey = trade.wallet.publicKey;
      const secKey = trade.wallet.privateKey;

      if (tradeAmount == 0) {
        return;
      }

      tokenData.significantMints.forEach(async (mint) => {
        let replyMsg = '';
        
        const solBalance = await getBalanceOfWallet(pubKey);
        if (tokenData.is_buy && solBalance < tradeAmount * 1e9) {
          return;
        } 

        console.log(secKey);
        if (tokenData.is_buy) {
          const result = await swapTokens(
            'So11111111111111111111111111111111111111112', 
            mint.mint, 
            tradeAmount * 1e9, 
            secKey, 
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
              amount: result.outAmount,
              usedSolAmount: result.solDiff,
              price: tokenInfo.price,
            });
            await user.save();
          } else {
            replyMsg = `🔴 Buy failed \n ${result.error ? result.error : 'Something went wrong'}`;
          }
        } else {
          const sellToken = user.tokens.find(token => token.address === mint.mint);
          if (!sellToken) {
            replyMsg = "You don't have this token";
            return;
          }
          console.log(sellToken);
          const result = await swapTokens(
            mint.mint, 
            'So11111111111111111111111111111111111111112', 
            sellToken.amount, 
            secKey, 
            jitoFee
          );
          if (result.success) {
            const tokenInfo = await getTokenInfo(mint.mint);
            const sellToken = user.tokens.find(token => token.address === mint.mint);
            const amount = sellToken.amount / 10 ** sellToken.decimals * tokenInfo.price;
            console.log("Profit 1>>>>>", amount - Math.abs(sellToken.usedSolAmount))
            const profit = Math.abs(result.solDiff) - Math.abs(sellToken.usedSolAmount)
            console.log("profit 2>>>>>>>>", profit);

            if (profit > 0) {
              const leftReward = await distributeReferralRewards(secKey, user._id, profit);
              console.log(profit, leftReward);
            }

            replyMsg = `🟢 <b>Selling <b>${tokenInfo.symbol|| tokenInfo.name}</b> is success</b>\nYou sold ${amount  / 10 ** tokenInfo.decimals}`;

            user.tokens.splice(user.tokens.findIndex(token => token.address === mint.mint), 1);
            await user.save();
          } else {
            replyMsg = `🔴 Sell failed \n ${result.error ? result.error : 'Something went wrong'}`;
          }
        }

        await bot.telegram.sendMessage(tgId, replyMsg, { parse_mode: 'HTML' });
      })
    }
}


const parseTransaction = async (copyWalletAddress) => {
  const signatures = await connection1.getSignaturesForAddress(new PublicKey(copyWalletAddress));
  const transaction = await connection1.getTransaction(signatures[1].signature, {
    maxSupportedTransactionVersion: 0
  });

  const meta = transaction.meta
  if (meta.err) return null;

  console.log(meta)

  const postTokenBalances = meta.postTokenBalances;
  const preTokenBalances = meta.preTokenBalances;
  if (postTokenBalances.length === 0 || preTokenBalances.length === 0)
    return null;

  const targetTokenBalances = postTokenBalances.filter(one => one.owner === copyWalletAddress);
  console.log("targetTokneBalances => ", targetTokenBalances)
  if (targetTokenBalances.length <= 0)
    return null;

  const postAmount = targetTokenBalances[0].uiTokenAmount.uiAmount;
  const preAmount = preTokenBalances.filter(one => one.mint === targetTokenBalances[0].mint)[0].uiTokenAmount.uiAmount;
  
  let inputMint, outputMint, slippage, amount, mode;

  const pair = await getPair(targetTokenBalances[0].mint);
  const priceSol = parseFloat(pair.priceNative);
  amount=(postAmount-preAmount)*priceSol* Math.pow(10, 9)

  console.log("post>>>>", targetTokenBalances[0].uiTokenAmount.uiAmount, targetTokenBalances[0].mint);
  console.log("pre<<<<<<<",  preTokenBalances.filter(one => one.mint === targetTokenBalances[0].mint)[0].uiTokenAmount.uiAmount, preTokenBalances.filter(one => one.mint === targetTokenBalances[0].mint)[0].mint)

  if (postAmount === preAmount) {
    return null;
  } else if (postAmount > preAmount) {
    inputMint = 'So11111111111111111111111111111111111111112';
    outputMint = targetTokenBalances[0].mint;
    amount = parseInt(amount* 0.99);
    mode = 'buy';
  } else {
    inputMint = targetTokenBalances[0].mint;
    outputMint = 'So11111111111111111111111111111111111111112';
    amount = parseInt(-amount / preAmount);
    mode = 'sell';
  }

  return {
    inputMint,
    outputMint,
    amount,
    mode,
  }
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

const distributeReferralRewards = async (secKey, userId, profit) => {
  const rewardPercentages = [0.03, 0.02, 0.01];
  let currentUser = await User.findById(userId);

  let reward = profit;
  let depth = 0;

  while(currentUser && currentUser.referrer && depth < 3) {
    let referrer = await User.findById(currentUser.referrer).populate('defaultWallet');
    if(referrer) {
      let rewardAmount = Math.round(reward * rewardPercentages[depth] / 100);
      await transferLamport(
        secKey,
        referrer.defaultWallet.publicKey, 
        rewardAmount
      );
      
      referrer.referralRewards += rewardAmount;
      referrer.referLvls[`level_${depth+1}`].amount += rewardAmount;
      referrer.referralCounts += 1;
      await referrer.save();

      currentUser = referrer;
      depth++;
    } else {
      break;
    }
  }

  return reward;
}


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



module.exports = {
  trackTargetWallet,
}