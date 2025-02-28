const { Context } = require("telegraf");

const Wallet = require('@models/wallet.model');
const User = require('@models/user.model');
const Position = require('@models/position.model');
const { buyPositionMarkup, positionListMarkup, sellPositionMarkup } = require("@models/markups/position.markup");
const { openPositionText, positionListText, createPositionText } = require("@models/texts/position.text");
const { swapSuccessText, swapFailedText } = require("@models/text.model");
const { getBalanceOfWallet, getTokenSupply, getTokenInfo } = require("@utils/web3");
const { swapTokens } = require('@utils/web3');


/**
 * 
 * @param {Context} ctx 
 */
const positionActions = async (ctx) => {
  const tgId = ctx.chat.id;

  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error("User Not Found");
  }

  const positions = await Position.find({ user: user._id, state: true });

  try {
    await ctx.reply(positionListText(positions), {
      parse_mode: "HTML",
      reply_markup: positionListMarkup(positions).reply_markup,
    })
  } catch (error) {
    console.log('Error while positionActions:', error);
  }
}


/**
 * @param {Context} ctx
 */
const createPositionMsgAction = async (ctx) => {
  try {
    ctx.session.state = 'CreatePosition';
    await ctx.reply(createPositionText);
  } catch (error) {
    await ctx.reply('Error while createPositionMsgAction');
  }
}

/**
 * 
 * @param {Context} ctx 
 */
const createPositionAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user  = await User.findOne({ tgId }).populate('defaultWallet');

    const walletText = 
      await Promise.all(
        [user.defaultWallet].map(async (wallet, index) => {
          const balance = await getBalanceOfWallet(wallet.publicKey);
          return `💳 W${index + 1}: ${balance / 1e9} SOL\n`
        })
      )
      .then((texts) => texts.join(''));

    const tokenAddress = ctx.message.text;
    let tokenInfo = await getTokenInfo(tokenAddress);
    const tokenSupply = await getTokenSupply(tokenAddress);
    tokenInfo.mCap = Math.round(tokenInfo.price * tokenSupply.uiAmount);

    const positionSetting = {
      buyTip: user.jitoFee.buy,
      slippage: user.slippage.buy * 100,
    }

    ctx.session.tokenAddress = tokenAddress;
    await ctx.reply(
      openPositionText(tokenInfo, walletText), {
        parse_mode: "HTML",
        reply_markup: buyPositionMarkup(positionSetting).reply_markup,
      }
    );
  } catch (error) {
    console.log('Error while createPositionAction:', error);
  }
}

/**
 * @param {Context} ctx
 */
const switchToSellPositionAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user  = await User.findOne({ tgId });

    const positionSetting = {
      buyTip: user.jitoFee.sell,
      slippage: user.slippage.sell * 100,
    };

    await ctx.editMessageReplyMarkup(sellPositionMarkup(positionSetting).reply_markup);

  } catch (error) {
    console.log('Error while switching sellPositionAction:', error);
  }
}

/**
 * @param {Context} ctx
 */
const switchToBuyPositionAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user  = await User.findOne({ tgId });

    const positionSetting = {
      buyTip: user.jitoFee.buy,
      slippage: user.slippage.buy * 100,
    };

    await ctx.editMessageReplyMarkup(buyPositionMarkup(positionSetting).reply_markup);
  } catch (error) {
    console.log('Error while switching sellPositionAction:', error);
  }
}

/**
 * @param {Context} ctx 
 */
const getPositionAction = async (ctx) => {
  const positionId = ctx.update.callback_query.data.split("Position_")[1];
  if (!positionId) {
    throw new Error("Invalid Position ID");
  } 

  const position = await Position.findById(positionId);

  const tgId = ctx.chat.id;
  const user  = await User.findOne({ tgId });
  const positionSetting = {
    buyTip: user.jitoFee.sell,
    slippage: user.slippage.sell * 100 || 50,
    positionId,
  };

  await ctx.reply(positionListText([position]), {
    parse_mode: "HTML",
    reply_markup:sellPositionMarkup(positionSetting).reply_markup,
  })
}


/**
 * @param {Context} ctx 
 */
const buyPosition = async (ctx) => {
  const purchaseQuantities = [0.00001, 1, 2, 5, 10];

  try {
    const index = parseInt(ctx.match[1]);
    const amount = purchaseQuantities[index];
    const tokenAddress = ctx.session.tokenAddress;

    console.log(index, amount);

    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId }).populate('defaultWallet');
    if (!user) {
      throw new Error('User not found!');
    }

    if (!tokenAddress) {
      await ctx.reply('Invalid token address');
      return;
    }

    
    const result = await swapTokens(
      'So11111111111111111111111111111111111111112',
      tokenAddress,
      amount * 1e9,
      user.defaultWallet.privateKey,
      user.jitoFee.buy,
      tgId,
    );
    
    if (result.error) {
      await ctx.reply(swapFailedText(result.signature, result.error || ''));
      return;
    }
    if (result.success) {
      const tokenInfo = await getTokenInfo(tokenAddress);
      
      const replyMsg = swapSuccessText(tokenInfo, result.signature, amount, result.outAmount);
      await ctx.reply(replyMsg, { parse_mode:  "HTML" });
      
      const position = new Position({
        user: user._id,
        tokenInfo: tokenInfo,
        wallet: user.defaultWallet._id,
        usedSolAmount: amount,
        outAmount: result.outAmount,
        solDiff: result.solDiff,
        jitoTip: user.jitoFee.sell,
        state: true,
      });
      await position.save();
    }
  } catch (error) {
    console.log('Error while buyPosition:', error);
  }
}

/**
 * @param {Context} ctx
 */
const sellPositionMsg = async (ctx) => {
  const sellQuantities = [1, 5, 10, 50, 100];

  const queryData = ctx.update.callback_query.data;
  const index = parseInt(queryData.split("_")[1]);
  const positionId = queryData.split("_")[2];

  if (isNaN(index)) {
    ctx.session.state = 'enterSellPositionAmount';
    ctx.session.sellPositionId = positionId;

    await ctx.reply('Enter your desired amount to sell:');
    return;
  }

  const position = await Position.findById(positionId).populate('wallet');
  if (!position) {
    throw new Error("Position not found!");
  }

  const percent = sellQuantities[index];
  const sellAmount = percent / 100 * position.outAmount;


  await sellPosition(ctx, positionId, sellAmount);
}



/**
 * @param {Context} ctx
 */
const sellPosition = async (ctx, positionId, sellAmount) => {
  try {
    const tgId = ctx.chat.id;

    const position = await Position.findById(positionId).populate('wallet');
    if (!position) {
      throw new Error("Position not found!");
    }
    if (position.outAmount < sellAmount) {
      return;
    }
    
    const result = await swapTokens(
      position.tokenInfo.address,
      'So11111111111111111111111111111111111111112',
      sellAmount,
      position.wallet.privateKey,
      position.jitoTip,
      tgId
    );
    
    if (result.error) {
      await ctx.reply(swapFailedText(result.signature, result.error || ''));
      return;
    }
    if (result.success) {
      const replyMsg = swapSuccessText(
        position.tokenInfo, 
        result.signature,  
        result.outAmount / 1e9, 
        sellAmount, 
        false
      );
      await ctx.reply(replyMsg, { parse_mode:  "HTML" });

      if (position.outAmount === sellAmount) {
        position.state = false;
      }
      position.outAmount -= sellAmount;
      await position.save();
    }
  } catch (error) {
    console.log('Error while buyPosition:', error);
  }
}












// /**
//  * @param {Context} ctx
//  */
// const setPositionBuyTipMsgAction = async (ctx) => {
//   try {
//     ctx.session.state = 'SetPositionBuyTip';
//     await ctx.reply(setBuyTipText);
//   } catch (error) {

//   }
// }


// /**
//  * 
//  * @param {Context} ctx 
//  */
// const setPositionBuyTip = async (ctx) => {
//   ctx.session.buyTip = parseFloat(ctx.message.text);
//   const positionSetting = {
//     buyTip: parseFloat(ctx.session.buyTip),
//     slippage: parseFloat(ctx.session.slippage) || 0.2,
//   }
//   await ctx.editMessageReplyMarkup(positionSetting);
// }


// /**
//  * @param {Context} ctx
//  */
// const setPositionSlippageMsgAction = async (ctx) => {
//   try {
//     ctx.session.state = 'SetPositionSlippage';
//     await ctx.reply(setSlippageText);
//   } catch (error) {

//   }
// }

// /**
//  * @param {Context} ctx 
//  */
// const setPositionSlippage = async (ctx) => {
//   ctx.session.slippage = parseFloat(ctx.message.text);
//   const positionSetting = {
//     buyTip: parseFloat(ctx.session.buyTip) || 0.001,
//     slippage: parseFloat(ctx.session.slippage),
//   }
// }


module.exports = {
  createPositionMsgAction,
  positionActions,
  createPositionAction,
  switchToSellPositionAction,
  switchToBuyPositionAction,
  buyPosition,
  sellPositionMsg,
  sellPosition,
  getPositionAction,
}