const { Context } = require('telegraf');

const User = require('@models/user.model');
const Wallet = require('@models/wallet.model');
const Trade = require('@models/trade.model');
const { tradeStartText } = require('@models/text.model');
const { tradeMarkUp } = require('@models/markup.model');
const { tradeMainText } = require('@models/texts/trade.text');
const { copyTradeMarkup, tradeSettingMarkup } = require('@models/markups/trade.markup');
const tradeTexts = require('@models/texts/trade.text');
const { trackTargetWallet } = require('@utils/trade');
const { getBalanceOfWallet } = require('@utils/web3')

/**
 * The function to handle 'Return' action
 * @param {Context} ctx
 */
const tradeAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }


    const trades = await Trade.find({ userId: user._id });

    await ctx.reply(
      tradeStartText(trades), { 
        parse_mode: "HTML", 
        reply_markup: copyTradeMarkup(trades).reply_markup 
      }
    );
  } catch (error) {
    console.error('Error while tradeAction:', error);
  }
};

const startTradeAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    if (user.intervalId !== -1) {
      clearInterval(user.intervalId);
    }

    if (!user.followingTraders.length) {
      await ctx.reply('You have not following wallet! Please add your target wallet');
      return;
    }

    if (!user.wallets || !user.wallets.length) {
      await ctx.reply('You have not wallet');
      return;
    }

    const wallet = await Wallet.findById(user.defaultWallet);
    const solBalance = await getBalanceOfWallet(wallet.publicKey);
    console.log(solBalance);
    if (solBalance < user.tradeAmount * 1e9) {
      await ctx.reply(`You have not enough balance to trade\nYour balance is ${solBalance} You need to top up at least ${user.tradeAmount} sol`);
      return;
    }

    const intervalID = setInterval(() => trackTargetWallet(user), 5000);
    user.intervalId = intervalID;
    user.enableAutoTrade = true;
    await user.save();

    await ctx.editMessageText(
      tradeStartText(true), { 
        parse_mode: "MarkdownV2", 
        reply_markup: tradeMarkUp.reply_markup 
      }
    );
  } catch (error) {
    console.error('Error while startTradeAction:', error);
  }
};

const terminateTradeAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    user.enableAutoTrade = false;
    await user.save();

    if (user.intervalId !== -1) {
      clearInterval(user.intervalId);
    }
    
    await ctx.editMessageText(
      tradeStartText(false), { 
        parse_mode: "MarkdownV2", 
        reply_markup: tradeMarkUp.reply_markup 
      }
    );

  } catch (error) {
    console.error('Error while terminateTradeAction:', error);
  }
};


/**
 * 
 * @param {Context} ctx 
 * @returns 
 */
const addTradeMsgAction = async (ctx) => {
  ctx.session.state = 'enterTargetAddress';
  
  const tradeId = await addNewTrade(ctx);
  if (!tradeId) {
    ctx.reply('Error while adding new trade');
    return;
  }

  const targetAddressMsg = await ctx.reply('Please enter your desired target address:');
  
  ctx.session.state = 'enterTargetAddress';
  ctx.session.tradeId = tradeId;
  ctx.session.targetAddressMsgId = targetAddressMsg.message_id;
}

/**
 * 
 * @param {Context} ctx 
 * @returns 
 */
const addNewTrade = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    const trade = new Trade({
      userId: user._id,
      wallet: user.defaultWallet,
    });
    await trade.save();

    return trade._id;
  } catch (error) {
    console.log("Error while addNewTrade:", error);
    return null;
  }
}

/**
 * 
 * @param {Context} ctx 
 */
const setTradeTarget = async (tradeId, targetAddress) => {
  try {
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      throw new Error('Trade not found!');
    }
    trade.targetAddress = targetAddress;
    await trade.save();

    return true;
  } catch (error) {
    console.log("Error while setTradeTarget:", error);
    return false;
  }
}

const setTradeName = async (tradeId, tradeName) => {
  try {
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      throw new Error('Trade not found!');
    }
    trade.name = tradeName;
    await trade.save();

    return true;
  } catch (error) {
    console.log("Error while setTradeName:", error);
    return false;
  }
}

/**
 * @param {Context} ctx
 */
const minTokenHolderMsgAction = async (ctx) => {
  ctx.session.state = 'enterMinTokenHolder';
  await ctx.reply(tradeTexts.minTokenHolderMsg);
}

const minTokenVolumeMsgAction = async (ctx) => {
  ctx.session.state = 'enterMinTokenVolume';
  await ctx.reply(tradeTexts.minTokenVolumeMsg);
}

const minMCapMsgAction = async (ctx) => {
  ctx.session.state = 'enterMinMCap';
  await ctx.reply(tradeTexts.minMCapMsg);
}

const maxMCapMsgAction = async (ctx) => {
  ctx.session.state = 'enterMaxMCap';
  await ctx.reply(tradeTexts.maxMCapMsg);
}

const minTokenAgeMsgAction = async (ctx) => {
  ctx.session.state = 'enterMinTokenAge';
  await ctx.reply(tradeTexts.minTokenAgeMsg);
}

const maxTokenAgeMsgAction = async (ctx) => {
  ctx.session.state = 'enterMaxTokenAge';
  await ctx.reply(tradeTexts.maxTokenAgeMsg);
}

const minTriggerAmountMsgAction = async (ctx) => {
  ctx.session.state = 'enterMinTriggerAmount';
  await ctx.reply(tradeTexts.minTriggerAmountMsg);
}

const maxTriggerAmountMsgAction = async (ctx) => {
  ctx.session.state = 'enterMaxTriggerAmount';
  await ctx.reply(tradeTexts.maxTriggerAmountMsg);
}

const tradeAmountMsgAction = async (ctx) => {
  ctx.session.state = 'enterTradeAmount';
  await ctx.reply(tradeTexts.tradeAmountMsg);
}


const setMinTokenHolder = async (tradeId, minTokenHolder) => {
  try {
    const minHolder = parseInt(minTokenHolder);
    console.log(minHolder);
    if (Number.isInteger(minHolder) && minHolder > 0) {
      const trade = await Trade.findById(tradeId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.minTriggerTokenHolders = minTokenHolder;
      await trade.save();

      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setMinTokenHolder:", error);
    return false;
  }
}

const setMinVolume = async (tokenId, minTokenVolume) => {
  try {
    const minVolume = parseFloat(minTokenVolume);
    if (!Number.isNaN(minVolume) && minVolume > 0) {
      const trade = await Trade.findById(tokenId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.minTriggerTokenVolume = minTokenVolume;
      await trade.save();

      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setMinTokenHolder:", error);
    return false;
  }
}

const setMinMCap = async (tokenId, minTokenMCap) => {
  try {
    const minMCap = parseFloat(minTokenMCap);
    if (!Number.isNaN(minMCap) && minMCap > 0) {
      const trade = await Trade.findById(tokenId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.minTriggerMCap = minMCap;
      await trade.save();

      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setMinTokenHolder:", error);
    return false;
  }
}

const setMaxMCap = async (tokenId, maxTokenMCap) => {
  try {
    const maxMCap = parseFloat(maxTokenMCap);
    if (!Number.isNaN(maxMCap) && maxMCap > 0) {
      const trade = await Trade.findById(tokenId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.minTriggerMCap = maxMCap;
      await trade.save();

      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setMinTokenHolder:", error);
    return false;
  }
}

const setMinTokenAge = async (tokenId, minTokenAge) => {
  try {
    const minAge = parseInt(minTokenAge);
    if (Number.isInteger(minAge) && minAge > 0) {
      const trade = await Trade.findById(tokenId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.minTriggerTokenAge = minAge;
      await trade.save();

      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setMinTokenHolder:", error);
    return false;
  }
  
}

const setMaxTokenAge = async (tokenId, maxTokenAge) => {
  try {
    const maxAge = parseInt(maxTokenAge);
    if (Number.isInteger(maxAge) && maxAge > 0) {
      const trade = await Trade.findById(tokenId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.maxTriggerTokenAge = maxAge;
      await trade.save();
      
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setMinToken", error);
    return false;
  }
}

const setMinTriggerAmount = async (tokenId, minTriggerAmount) => {
  try {
    const minAmount = parseFloat(minTriggerAmount);
    if (!Number.isNaN(minAmount) && minAmount > 0) {
      const trade = await Trade.findById(tokenId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.minTriggerAmount = minAmount;
      await trade.save();

      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setMinTokenHolder:", error);
    return false;
  }
}

const setMaxTriggerAmount = async (tokenId, maxTriggerAmount) => {
  try {
    const maxAmount = parseFloat(maxTriggerAmount);
    if (!Number.isNaN(maxAmount) && maxAmount > 0) {
      const trade = await Trade.findById(tokenId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.maxTriggerAmount = maxAmount;
      await trade.save();
    
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setMinTokenHolder:", error);
    return false;
  }
}

const setTradeAmount = async (tokenId, tradeAmount) => {
  try {
    const amount = parseFloat(tradeAmount);
    if (!Number.isNaN(amount) && amount > 0) {
      const trade = await Trade.findById(tokenId);
      if (!trade) {
        throw new Error('Trade not found!');
      }
      trade.tradeAmount = amount;
      await trade.save();

      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error while setting trade amount:", error);
    return false;
  }
}

/**
 * 
 * @param {Context} ctx 
 * @returns 
 */
const updateTradeState = async (ctx) => {
  try {
    const tradeId = ctx.session.tradeId;
    const trade = await Trade.findById(tradeId).populate('wallet', 'name');
    if (!trade) {
      throw new Error('Trade not found!');
    }
    trade.status = !trade.status;
    await trade.save();

    await ctx.editMessageText(
      tradeMainText(trade),
      {
        parse_mode: "HTML",
        reply_markup: tradeSettingMarkup(trade).reply_markup
      }
    );
  } catch (error) {
    console.log("Error while updating trade status:", error);
    return false;
  }
}


/**
 * 
 * @param {Context} ctx 
 * @returns 
 */
const deleteTrade = async (ctx) => {
  try {
    const tradeId = ctx.session.tradeId;
    
    await Trade.findByIdAndDelete(tradeId);

    await ctx.deleteMessage();
    tradeAction(ctx);
  } catch (error) {
    console.log("Error while deleteTrade:", error);
    return false;
  }
}

/**
 * 
 * @param {Context} ctx 
 * @returns 
 */
const setupTradeAction = async (ctx, tradeId) => {
  try {
    const trade = await Trade.findById(tradeId).populate('wallet', 'name');
    if (!trade) {
      throw new Error('Trade not found!');
    }

    await ctx.reply(
      tradeMainText(trade), 
      {
        parse_mode: "HTML",
        reply_markup: tradeSettingMarkup(trade).reply_markup
      }
    );
  } catch (error) {
    console.log("Error while setTradeName:", error);
    return false;
  }
}

/**
 * @param {Context} ctx
 */
const openTradeAction = async (ctx) => {
  try {
    const tradeId = ctx.update.callback_query.data.split('trade_')[1];
    const trade = await Trade.findById(tradeId).populate('wallet', 'name');
    if (!trade) {
      throw new Error('Trade not found!');
    }

    ctx.session.tradeId = tradeId;
    await ctx.editMessageText(
      tradeMainText(trade), 
      {
        parse_mode: "HTML",
        reply_markup: tradeSettingMarkup(trade).reply_markup
      }
    );
  } catch (error) {
    console.log("Error while openTradeAction:", error);
  }
}

/**
 * @param {Context} ctx
 */
const returnToTradeAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    const trades = await Trade.find({ userId: user._id });

    await ctx.editMessageText(
      tradeStartText(trades), { 
        parse_mode: "HTML", 
        reply_markup: copyTradeMarkup(trades).reply_markup 
      }
    );
  } catch (error) {
    console.error('Error while tradeAction:', error);
  }
}

module.exports = {
  tradeAction,
  returnToTradeAction,
  startTradeAction,
  terminateTradeAction,
  setupTradeAction,
  openTradeAction,
  addTradeMsgAction,
  minTokenHolderMsgAction,
  minTokenVolumeMsgAction,
  minTokenAgeMsgAction,
  maxTokenAgeMsgAction,
  minMCapMsgAction,
  maxMCapMsgAction,
  minTriggerAmountMsgAction,
  maxTriggerAmountMsgAction,
  tradeAmountMsgAction,
  addNewTrade,
  setTradeTarget,
  setTradeName,
  setMinTokenHolder,
  setMinVolume,
  setMinTokenAge,
  setMaxTokenAge,
  setMaxMCap,
  setMinMCap,
  setMinTriggerAmount,
  setMaxTriggerAmount,
  setTradeAmount,
  updateTradeState,
  deleteTrade,
};