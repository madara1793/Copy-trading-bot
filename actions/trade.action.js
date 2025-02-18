const { Context } = require('telegraf');

const User = require('@models/user.model');
const Wallet = require('@models/wallet.model');
const { tradeStartText } = require('@models/text.model');
const { tradeMarkUp } = require('@models/markup.model');
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

    console.log(user.enableAutoTrade);

    await ctx.editMessageText(
      tradeStartText(user.enableAutoTrade), { 
        parse_mode: "MarkdownV2", 
        reply_markup: tradeMarkUp.reply_markup 
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

module.exports = {
  tradeAction,
  startTradeAction,
  terminateTradeAction
};