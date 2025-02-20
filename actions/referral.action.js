const { Context } = require('telegraf');

const User = require('@models/user.model');
const { referralMarkup } = require('@models/markups/referral.markup');
const { referralText } = require('@models/texts/referral.text');

/**
 * 
 * @param {Context} ctx 
 */
const referralAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId }).populate('defaultWallet', 'publicKey');
    if (!user) {
      throw new Error('User not found!');
    }

    await ctx.reply(
      referralText(user), {
        parse_mode: "HTML",
        reply_markup: referralMarkup.reply_markup
      }
    )
  } catch (error) {
    console.error('Error while referralAction:', error);
  }
}


module.exports = {
  referralAction
}