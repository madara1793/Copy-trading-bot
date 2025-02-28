const { Context } = require("telegraf");

const { settingMarkUp, ManualBuySettingMarkup, ManualSellSettingMarkup } =  require("@models/markup.model");
const { settingText, followingTraderText } = require("@models/text.model");
const User = require("@models/user.model");
const Wallet = require("@models/wallet.model");
const { getBalanceOfWallet } = require("@utils/web3");


/**
 * The function to handle 'setting' command
 * @param {Context} ctx
 */
const settingAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });

    if (!user) {
      throw new Error('User not found!');
    }

    await ctx.reply(settingText, {
      parse_mode: 'HTML',
      reply_markup: settingMarkUp(user).reply_markup
    });
  } catch (error) {
    console.error('Error while settingCommand:', error);
    await ctx.reply('An error occurred while fetching your settings. Please try again later.');
  }
};

/**
 * @param {Context} ctx
 */
const manualBuySettingAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });

    if (!user) {
      throw new Error('User not found!');
    }

    ctx.session.currentSettingScreen = 'BUY';
    await ctx.editMessageText(settingText, {
      parse_mode: 'HTML',
      reply_markup: ManualBuySettingMarkup(user).reply_markup
    });  
  } catch (error) {
    console.error('Error while settingCommand:', error);
    await ctx.reply('An error occurred while fetching your settings. Please try again later.');
  }
}

/**
 * @param {Context} ctx
 */
const manualSellSettingAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });

    if (!user) {
      throw new Error('User not found!');
    }

    ctx.session.currentSettingScreen = 'SELL';
    await ctx.editMessageText(settingText, {
      parse_mode: 'HTML',
      reply_markup: ManualSellSettingMarkup(user).reply_markup
    });    } catch (error) {
    console.error('Error while settingCommand:', error);
    await ctx.reply('An error occurred while fetching your settings. Please try again later.');
  }
}


/**
 * The function to handle 'Wallet' action
 * @param {Context} ctx
 */
const topTraderAction = async (ctx) => {
  try {
    await ctx.reply(`✍ Input the wallet address of trader you want to copy`);

    ctx.session.state = 'topTrader';
  } catch (error) {
    console.error('Error :', error);
  }
};

/**
 * @param { Context } ctx
 * @returns
 */
const getFollowingTraders = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    await ctx.reply(followingTraderText(user), { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error :', error);
  }
}

/**
 * @param { Context } ctx
 */
const priorityFeeMsgAction = async (ctx) => {
  const tgId = ctx.chat.id;
  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  if (ctx.update.callback_query.data.split('_')[0] === 'BUY') {
    ctx.session.state = 'priorityFee_buy';
  } else {
    ctx.session.state = 'priorityFee_sell';
  }

  await ctx.reply(`✍ Input the priority fee you want to set`);
};


/**
 * @param { Context } ctx
 */
const setPriorityFee = async (ctx, isBuy) => {
  try {
    const fee = parseFloat(ctx.message.text);
    if (isNaN(fee)) {
      ctx.reply('Invalid Input');
      return;
    }
    
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    if (isBuy) {
      user.priorityFee.buy = fee;
    } else {
      user.priorityFee.sell = fee;
    }
    await user.save();

    await ctx.reply(`✅ Priority fee updated to ${fee}`);
  } catch (error) {
    console.log("Error while setting priority fee: ", error);
  }
}


/**
 * @param { Context } ctx
 */
const jitoTipMsgAction = async (ctx) => {
  const tgId = ctx.chat.id;
  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  if (ctx.update.callback_query.data.split('_')[0] === 'BUY') {
    ctx.session.state = 'jitoTip_buy';
  } else {
    ctx.session.state = 'jitoTip_sell';
  }
  await ctx.reply(`✍ Input the Jito tip you want to set`);
}


/**
 * @param { Context } ctx
 */
const setJitoTip = async (ctx, isBuy) => {
  const tgId = ctx.chat.id;
  const tip = parseFloat(ctx.message.text);
  if (isNaN(tip)) {
    ctx.reply('Invalid Input');
    return;
  }

  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  if (isBuy) {
    user.jitoFee.buy = tip;
  } else {
    user.jitoFee.sell = tip;
  }
  await user.save();

  await ctx.reply(`✅ Jito tip updated to ${tip}`);
}


/**
 * @param { Context } ctx
 */
const tradeAmountMsgAction = async (ctx) => {
  const tgId = ctx.chat.id;
  
  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  ctx.session.state = 'tradeAmount';
  await ctx.reply(`✍ Input the trade amount(Sol) you want to set \n Current Amount is ${user.tradeAmount}`);
}

/**
 * @param { Context } ctx
 */
const setTradeAmount = async (ctx) => {
  const tgId = ctx.chat.id;

  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  user.tradeAmount = ctx.message.text;
  await user.save();

  await ctx.reply(`✅ Trade amount set to ${user.tradeAmount}`);
}

/**
 * @param { Context } ctx
 */
const slippageMsgAction = async (ctx) => {
  const tgId = ctx.chat.id;

  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  if (ctx.update.callback_query.data.split('_')[0] === 'BUY') {
    ctx.session.state = 'slippage_buy';
  } else {
    ctx.session.state = 'slippage_sell';
  }
  await ctx.reply(`✍ Input the slippage you want to set`);
}

/**
 * @param { Context } ctx
 */
const setSlippage = async (ctx, isBuy) => {
  const slippage = parseFloat(ctx.message.text);
  if (isNaN(slippage)) {
    ctx.reply("Invalid Input");
    return;
  }

  const tgId = ctx.chat.id;
  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  if (isBuy) {
    user.slippage.buy = slippage;
  } else {
    user.slippage.sell = slippage;
  }
  await user.save();

  await ctx.reply(`✅ Slippage updated to ${slippage}`);
}




module.exports = {
  settingAction,
  manualBuySettingAction,
  manualSellSettingAction,
  topTraderAction,
  getFollowingTraders,
  priorityFeeMsgAction,
  setPriorityFee,
  jitoTipMsgAction,
  setJitoTip,
  tradeAmountMsgAction,
  setTradeAmount,
  slippageMsgAction,
  setSlippage,
};