const { Context } = require("telegraf");

const { settingMarkUp } =  require("@models/markup.model");
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

    await ctx.reply(settingText, settingMarkUp(user));
  } catch (error) {
    console.error('Error while settingCommand:', error);
    await ctx.reply('An error occurred while fetching your settings. Please try again later.');
  }
};

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

  ctx.session.state = 'priorityFee';
  await ctx.reply(`✍ Input the priority fee you want to set \n Current Fee is ${user.priorityFee}`);
};


/**
 * @param { Context } ctx
 */
const setPriorityFee = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    const priorityFee = ctx.message.text;
    user.priorityFee = priorityFee;
    await user.save();

    await ctx.reply(`✅ Priority fee set to ${priorityFee}`);
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

  ctx.session.state = 'jitoTip';
  console.log(user.jitoFee)
  await ctx.reply(`✍ Input the Jito tip you want to set \n Current Tip is ${user.jitoFee}`);
}


/**
 * @param { Context } ctx
 */
const setJitoTip = async (ctx) => {
  const tgId = ctx.chat.id;

  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  user.jitoFee = ctx.message.text;
  await user.save();

  await ctx.reply(`✅ Jito tip set to ${user.jitoFee}`);
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

  ctx.session.state = 'slippage';
  await ctx.reply(`✍ Input the slippage you want to set \n Current Slippage is ${user.slippage}`);
}

/**
 * @param { Context } ctx
 */
const setSlippage = async (ctx) => {
  const tgId = ctx.chat.id;

  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  user.slippage = ctx.message.text;
  await user.save();

  await ctx.reply(`✅ Slippage set to ${user.slippage}`);
}

module.exports = {
  settingAction,
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