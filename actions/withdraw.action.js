const { Context } = require('telegraf');

const User = require('@models/user.model');
const { withdrawMarkup } = require('@models/markups/withdraw.markup');
const { withdrawText, WithdrawalUpdateText, WithdrawAmountText, withdrawSuccessText, withdrawFailedText } = require('@models/texts/withdraw.text');
const { getBalanceOfWallet, transferLamport, confirmTransaction } = require('@utils/web3');


/**
 * 
 * @param {Context} ctx 
 */
const withdrawAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId }).populate('defaultWallet', 'publicKey');
    if (!user) {
      throw new Error('User not found!');
    }

    const balance = await getBalanceOfWallet(user.defaultWallet.publicKey);

    await ctx.reply(
      withdrawText({
        balance: balance / 1e9,
        withdrawalAddress: user.withdrawalAddress,
      }), {
        parse_mode: "HTML",
        reply_markup: withdrawMarkup.reply_markup
      }
    )
  } catch(error) {
    console.log('Error while withdrawAction:', error);
  }
}


/**
 * @param {Context} ctx 
 */
const setWithdrawalMsgAction = async (ctx) => {
  console.log('setWithdrawalMsgAction');
  try {
    ctx.session.state = 'SetWithdrawal';
    await ctx.reply(WithdrawalUpdateText)
  } catch (error) {
    console.log('Error while setWithdrawAction:', error);
  }
}


/**
 * @param {Context} ctx 
 */
const setWithdrawalAddress = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId }).populate('defaultWallet', 'publicKey');
    if (!user) {
      throw new Error('User not found!');
    }

    user.withdrawalAddress = ctx.message.text;
    await user.save();

    const balance = await getBalanceOfWallet(user.defaultWallet.publicKey);

    await ctx.reply(
      withdrawText({
        balance: balance,
        withdrawalAddress: user.withdrawalAddress,
      }), {
        parse_mode: "HTML",
        reply_markup: withdrawMarkup.reply_markup
      }
    )
  } catch (error) {
    console.log('Error while setWithdrawalAddress:', error);
  }
}


/**
 * @param {Context} ctx
 */
const withdraw50Action = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId }).populate('defaultWallet', 'publicKey', 'privateKey');
    if (!user) {
      throw new Error('User not found!');
    }

    if (!user.withdrawalAddress) {
      ctx.reply('Please set your withdrawal address first');
      return;
    }

    const balance = await getBalanceOfWallet(user.defaultWallet.publicKey);
    if (balance == 0) {
      ctx.reply('Your balance is 0');
      return;
    }

    const txId = await transferLamport(
      user.defaultWallet.privateKey, 
      user.withdrawalAddress, 
      balance / 2
    );

    console.log('txId:', txId);

    await confirmTransaction(txId);

    await ctx.reply(withdrawSuccessText(txId));
  } catch (error) {
    console.log('Error while withdraw50Action:', error);
    await ctx.reply(withdrawFailedText(error));
  }
}


/**
 * @param {Context} ctx
 */
const withdrawAllAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId }).populate('defaultWallet', 'publicKey');
    if (!user) {
      throw new Error('User not found!');
    }

    if (!user.withdrawalAddress) {
      ctx.reply('Please set your withdrawal address first');
      return;
    }

    const balance = await getBalanceOfWallet(user.defaultWallet.publicKey);
    if (balance == 0) {
      ctx.reply('Your balance is 0');
      return;
    }

    const txId = await transferLamport(
      user.defaultWallet.privateKey, 
      user.withdrawalAddress, 
      balance
    );

    console.log('txId:', txId);

    await confirmTransaction(txId);

    await ctx.reply(withdrawSuccessText(txId));

  } catch (error) {
    console.log('Error while withdraw50Action:', error);
    await ctx.reply(withdrawFailedText(error));

  }
}


/**
 * @param {Context} ctx
 */
const withdrawXMsgAction = async (ctx) => {
  ctx.session.state = 'WithdrawXAmount';
  await ctx.reply(WithdrawAmountText);
}

/**
 * @param {Context} ctx
 */
const withdrawXAmountAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const amount = parseFloat(ctx.message.text);
    const user = await User.findOne({ tgId }).populate('defaultWallet');
    if (!user) {
      throw new Error('User not found!');
    }

    if (!user.withdrawalAddress) {
      ctx.reply('Please set your withdrawal address first');
      return;
    }
    console.log(user.defaultWallet.privateKey, user.withdrawalAddress, amount);

    const balance = await getBalanceOfWallet(user.defaultWallet.publicKey);
    if (balance / 1e9 < amount) {
      ctx.reply('Insufficient balance');
      return;
    }


    const txId = await transferLamport(
      user.defaultWallet.privateKey, 
      user.withdrawalAddress, 
      amount,
    );

    console.log('txId:', txId);

    await confirmTransaction(txId);

    await ctx.reply(withdrawSuccessText(txId));

  } catch (error) {
    console.log('Error while withdraw50Action:', error);
    await ctx.reply(withdrawFailedText(error));
  }
}


module.exports = {
  withdrawAction,
  setWithdrawalMsgAction,
  withdrawXMsgAction,
  setWithdrawalAddress,
  withdraw50Action,
  withdrawAllAction,
  withdrawXAmountAction,
}