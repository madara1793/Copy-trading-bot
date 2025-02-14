
const { Context } = require('telegraf');

const { bot } = require("@config/config");
const { startText } = require("@models/text.model");
const User = require("@models/user.model");

/**
 * The function to handle 'start' command
 * @param {Context} ctx
 */
const startCommand = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const username = ctx.chat.username || '';

    const user = await User.findOne({ tgId });
    if (!user) {
      const newUser = new User({
        tgId,
        username,
      });

      await newUser.save();
    }

    await ctx.reply(startText(user), startMarkUp('HTML'));
  } catch (error) {
    console.error('Error while starting the bot:', error);
    await ctx.reply('An error occured while starting. Please try again later.');
  }
};


/**
 * The function to handle 'help' command
 * @param {Context} ctx
 */
const helpCommand = async (ctx) => {
  try {
    ctx.reply(helpText, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error while helpCommand:', error);
  }
};

/**
 * The function to handle 'setting' command
 * @param {Context} ctx
 */
const settingCommand = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });

    if (!user) {
      throw new Error('User not found!');
    }
    const balance = await getBalanceOfWallet(user.wallet.publicKey);
    await ctx.reply(settingText, settingMarkUp(user, balance));
  } catch (error) {
    console.error('Error while settingCommand:', error);
    await ctx.reply('An error occurred while fetching your settings. Please try again later.');
  }
};

/**
 * The function to set the menu button shows all commands
 */
const setCommands = async () => {
  try {
    const commands = [
      { command: '/start', description: 'Start the bot' },
      { command: '/setting', description: 'Setting' },
      { command: '/help', description: 'Help' },
    ];
    const result = await bot.telegram.setMyCommands(commands);
    if (!result) {
      throw new Error('Something went wrong while setting comands.');
    }
  } catch (error) {
    console.error('Error while setCommands:', error);
  }
};

module.exports = {
  startCommand, helpCommand, settingCommand, setCommands,
};