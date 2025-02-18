const { Context } = require('telegraf');

const User = require('@models/user.model');
const { startText } = require('@models/text.model');
const { startMarkUp } = require('@models/markup.model');


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
    await ctx.editMessageText(startText(user), startMarkUp('HTML'));
  } catch (error) {
    console.error('Error while returnAction:', error);
  }
};

module.exports = {
  closeAction,
  returnAction,
};
