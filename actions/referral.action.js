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

    console.log(ctx.match[0])
    if (ctx.match[0] === 'Invite friends') {
      await ctx.reply(
        referralText(user), {
          parse_mode: "HTML",
          reply_markup: referralMarkup.reply_markup
        }
      )
    } else if (ctx.match[0] === 'Refresh Referrals') {
      await ctx.editMessageText(
        referralText(user), {
          parse_mode: "HTML",
          reply_markup: referralMarkup.reply_markup
        }
      )
    }
  } catch (error) {
    console.error('Error while referralAction:', error);
  }
}


module.exports = {
  referralAction
}