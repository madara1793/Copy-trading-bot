const { PublicKey, Connection } = require('@solana/web3.js');

const { bot } = require("@config/config");
const User = require("@models/user.model");
const { swapSuccessText } = require("@models/text.model");
const { swapTokens, getTokenInfo, getBalanceOfWallet, getTokenBalanceOfWallet, transferLamport } = require('./web3');


const connection1 = new Connection(process.env.HTTP_URL || "",  {commitment: "confirmed"});
const LAMPORTS_IN_SOL = 1_000_000_000;


/*
 * Primary function invoked by main loop and calling all subsequent functions during its work
 * @param {Context} ctx
 */
const trackTargetWallet = async (trade) => {
  const targetWalletAddress = trade.targetAddress;
  console.log(">>>>>Targetting >>>>>>>", targetWalletAddress);

  connection1.onAccountChange(new PublicKey(targetWalletAddress), async () => {
    console.log("Detected>>>>>>", targetWalletAddress);

    if (!trade.status) {
      console.log("Cancelled because paused setup")
      return;
    }

    const signatures = await connection1.getSignaturesForAddress(new PublicKey(targetWalletAddress));
    let parseRes = await parseTransaction(targetWalletAddress, signatures[0]);
    if (parseRes === -1) {
      parseRes = await parseTransaction(targetWalletAddress, signatures[2]);
    }
    if (!parseRes) {
      return;
    }

    let inputMint = parseRes.inputMint;
    let outputMint = parseRes.outputMint;
    let mode = parseRes.mode;

    console.log(inputMint, outputMint, mode)

    if (inputMint && outputMint && mode) {
      const user = await User.findById(trade.userId._id);

      let tradeAmount = 0;
      if (mode === 'buy') {
        tradeAmount = trade.tradeAmount * LAMPORTS_IN_SOL;
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

      const solBalance = await getBalanceOfWallet(pubKey);
      if (inputMint === 'So11111111111111111111111111111111111111112') {
        if (tradeAmount + jitoFee * LAMPORTS_IN_SOL > solBalance) {
          console.log("Insufficient sol balance");
          const tokenInfo = await getTokenInfo(outputMint);

          replyMsg = `🔴 Buying ${tokenInfo.name} failed due to insufficient balanace.
CA: <code>${outputMint}</code>
Current Sol Balance: ${solBalance/LAMPORTS_IN_SOL}
Required Sol Balance: ${trade.tradeAmount}(Trade Amount)+${jitoFee}(JiTo Fee)
`;
          await bot.telegram.sendMessage(user.tgId, replyMsg, { parse_mode: 'HTML' });
          return;
        }
      } else if (outputMint === 'So11111111111111111111111111111111111111112') {
        const tokenBalance = await getTokenBalanceOfWallet(pubKey, inputMint);
        if (jitoFee * LAMPORTS_IN_SOL > solBalance || tradeAmount > tokenBalance) {
          console.log("Insufficient token balance");
          const tokenInfo = await getTokenInfo(inputMint);

          replyMsg = `🔴 Selling ${tokenInfo.symbol} failed due to insufficient balanace.
CA: <code>${inputMint}</code>
Current Sol Balance: ${solBalance/LAMPORTS_IN_SOL},  Token Balance: ${tokenBalance}
Required Sol Balance: ${jitoFee}(JiTo Tip), Token BalanceL ${tradeAmount}
`;
          await bot.telegram.sendMessage(user.tgId, replyMsg, { parse_mode: 'HTML' });
          return;
        }
      }

      const result = await swapTokens(
        inputMint, 
        outputMint, 
        tradeAmount, 
        secKey, 
        jitoFee,
        user.tgId
      );
      
      if (result.success) {
        if (mode === 'buy') {
          const tokenInfo = await getTokenInfo(outputMint);
          replyMsg = swapSuccessText(tokenInfo, result.signature, tradeAmount / LAMPORTS_IN_SOL, result.outAmount);
          
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
          replyMsg = swapSuccessText(tokenInfo, result.signature, result.outAmount / LAMPORTS_IN_SOL, tradeAmount, false);
          

          // Distribute
          const sellToken = user.tokens.find(token => token.address === inputMint);
          const profit = Math.abs(result.solDiff) - Math.abs(sellToken.usedSolAmount)
          console.log("profit 2>>>>>>>>", profit);

          if (profit > 0) {
            const leftReward = await distributeReferralRewards(secKey, user._id, profit);
            console.log(profit, leftReward);
          }


          //Remove sold token from tokenlist
          user.tokens.splice(user.tokens.findIndex(token => token.address === inputMint), 1);
          await user.save();
        }
      } else {
        replyMsg = `🔴 Buy failed \n ${result.error ? result.error : 'Something went wrong'}`;
      }

      await bot.telegram.sendMessage(user.tgId, replyMsg, { parse_mode: 'HTML' });
    } else {
      console.log("Parse Error...");
    }
  });
}

const parseTransaction = async (copyWalletAddress, signature) => {
  const transaction = await connection1.getTransaction(signature.signature, {
    maxSupportedTransactionVersion: 0
  });

  const meta = transaction.meta
  if (meta.err) return null;

  const postTokenBalances = meta.postTokenBalances;
  const preTokenBalances = meta.preTokenBalances;
  console.log(postTokenBalances, preTokenBalances)

  if (postTokenBalances.length === 0 || preTokenBalances.length === 0) 
    return -1;

  const targetToken = postTokenBalances.filter(postToken => 
    preTokenBalances.some(preToken => preToken.accountIndex === postToken.accountIndex)
  )[0];


  const postAmount = postTokenBalances.filter(postToken => postToken.mint === targetToken.mint && postToken.owner === copyWalletAddress)[0] ?
    postTokenBalances.filter(postToken => postToken.mint === targetToken.mint && postToken.owner === copyWalletAddress)[0].uiTokenAmount.amount 
    : 0;
  const preAmount = preTokenBalances.filter(preToken => preToken.mint === targetToken.mint && preToken.owner === copyWalletAddress)[0] ? 
    preTokenBalances.filter(preToken => preToken.mint === targetToken.mint && preToken.owner === copyWalletAddress)[0].uiTokenAmount.amount 
    : 0;

  
  let inputMint, outputMint, mode;

  if (postAmount === preAmount) {
    return null;
  } else if (postAmount > preAmount) {
    inputMint = 'So11111111111111111111111111111111111111112';
    outputMint = targetToken.mint;
    mode = 'buy';
  } else {
    inputMint = targetToken.mint;
    outputMint = 'So11111111111111111111111111111111111111112';
    mode = 'sell';
  }

  return {
    inputMint,
    outputMint,
    mode,
  }
}


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
  // After your existing mints.push logic, add this processing:
  // const uniqueMints = mints.reduce((acc, current) => {
  //   const existing = acc.find((item) => item.mint === current.mint);
  //   if (existing) {
  //     existing.amount += current.amount;
  //   } else {
  //     acc.push(current);
  //   }
  //   return acc;
  // }, [] as { mint: string; amount: number }[]);

  // Filter out small amounts
  let is_buy = true;
  let is_wSolReceived = false;
  const significantMints = mints.filter((item) => Math.abs(item.amount) > 0);
  significantMints.forEach((item) => {
    const isWSol = item.mint === NATIVE_MINT.toBase58();
    if(isWSol && item.amount > 0) is_wSolReceived = true;
    if (!isWSol && item.amount < 0) is_buy = false;
  });

  if(is_wSolReceived && is_buy)
    return null;

  const onlyWsolChanges =
    significantMints.length === 1 &&
    significantMints[0].mint === NATIVE_MINT.toBase58();
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



module.exports = {
  trackTargetWallet,
}