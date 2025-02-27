const { Context } = require('telegraf');
const { LAMPORTS_PER_SOL } = require("@solana/web3.js");

const User = require('@models/user.model');
const Wallet = require('@models/wallet.model');
const { withdrawMarkup } = require('@models/markups/withdraw.markup');
const { defaultWalletMarkup } = require('@models/markup.model');
const { withdrawText, WithdrawalUpdateText, WithdrawAmountText, WalletNotFoundText, withdrawSuccessText, withdrawFailedText } = require('@models/texts/withdraw.text');
const { getBalanceOfWallet, transferLamport, confirmTransaction } = require('@utils/web3');


/**
 * 
 * @param {Context} ctx 
 */
const withdrawAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId }).populate('defaultWallet', 'publicKey name');
    if (!user) {
      throw new Error('User not found!');
    }

    const balance = await getBalanceOfWallet(user.defaultWallet.publicKey);

    await ctx.reply(
      withdrawText({
        wallet: user.defaultWallet,
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
const switchWithdrawWallet = async (ctx) => {
  const tgId = ctx.chat.id;

  const user = await User.findOne({ tgId }).populate('wallets');;
  if (!user) {
    throw new Error('User not found!');
  }

  await ctx.reply(
    'Please select the wallet number you want to withdraw',
    { 
      parse_mode: 'Markdown', 
      reply_markup: defaultWalletMarkup(user.wallets, 'withdraw').reply_markup 
    }
  );
}

/**
 * @param {Context} ctx
 */
const switchWithdrawWalletAction = async (ctx) => {
  try {
    const index = ctx.update.callback_query.data.split("withdraw_wallet_")[1];
    if (!index) {
      return;
    }

    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    const wallet = await Wallet.findById(user.wallets[index], 'publicKey name');
    if (!wallet) {
      await ctx.reply(WalletNotFoundText);
      return;
    }
    if (user.wallets[index]) {
      user.defaultWallet = wallet._id;
      await user.save();

      const balance = await getBalanceOfWallet(wallet.publicKey);

      await ctx.editMessageText(
        withdrawText({
          wallet: wallet,
          balance: balance / 1e9,
          withdrawalAddress: user.withdrawalAddress,
        }), {
          parse_mode: "HTML",
          reply_markup: withdrawMarkup.reply_markup
        }
      )
    } else {
      await ctx.answerCbQuery('Wallet not found!', { show_alert: true });
    }
  } catch (error) {

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
        wallet: user.defaultWallet,
        balance: balance / LAMPORTS_PER_SOL,
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


    await confirmTransaction(txId);

    await ctx.reply(withdrawSuccessText(txId), { parse_mode: 'HTML' });
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

    await ctx.reply(withdrawSuccessText(txId), { parse_mode: 'HTML' });

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
      amount * LAMPORTS_PER_SOL,
    );

    console.log('txId:', txId);

    await confirmTransaction(txId);

    await ctx.reply(withdrawSuccessText(txId), { parse_mode: 'HTML' });

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
  switchWithdrawWallet,
  switchWithdrawWalletAction,
}