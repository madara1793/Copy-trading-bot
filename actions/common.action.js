const { Context } = require('telegraf');

const User = require('@models/user.model');
const Wallet = require('@models/wallet.model');
const { startText } = require('@models/text.model');
const { startMarkUp } = require('@models/markup.model');
const { getBalanceOfWallet } = require("@utils/web3");

/**
 * The function to handle 'Close' action
 * @param {Context} ctx
 */
const closeAction = (ctx) => {
  try {
    ctx.deleteMessage();
  } catch (error) {
    console.error('Error while closeAction:', error);
  }
};

/**
 * The function to handle 'Return' action
 * @param {Context} ctx
 */
const returnAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }
    const wallets = await Wallet.find({ userId: user._id });

    const balances = await Promise.all(wallets.map(async (wallet) => {
      const balance = await getBalanceOfWallet(wallet.publicKey);
      return {
        name: wallet.name,
        publicKey: wallet.publicKey,
        balance: balance / 1e9,
      };
    }));
    await ctx.editMessageText(startText(balances), startMarkUp('HTML'));

  } catch (error) {
    console.error('Error while returnAction:', error);
  }
};

module.exports = {
  closeAction,
  returnAction,
};
