
const { Context } = require('telegraf');
const { v4: uuidv4 } = require('uuid');

const { bot } = require("@config/config");
const { startMarkUp, settingMarkUp } =  require("@models/markup.model");
const { helpText, startText, settingText } = require("@models/text.model");
const User = require("@models/user.model");
const Wallet = require("@models/wallet.model");
const { getBalanceOfWallet, generateWallet } = require("@utils/web3");
const { generateWalletName } = require("@utils/functions");


const determineReferralLvl = async (referrer_id) => {
  let depth = 0;

  let referrer = referrer_id;
  while(depth < 3) {
    const parent = await User.findById(referrer);
    if (!parent) break;

    parent.referLvls[`level_${depth+1}`].count += 1;
    await parent.save();

    referrer = parent.referrer;
    depth++;
  }
}

/**
 * The function to handle 'start' command
 * @param {Context} ctx
 */
const startCommand = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const username = ctx.chat.username || '';
    const referralCode = ctx.message.text.split(' ')[1];

    const user = await User.findOne({ tgId });
    if (!user) {
      const uuid = uuidv4().split('-')[0].toUpperCase();
      const referrer = await User.findOne({ referralCode });

      const newUser = new User({
        tgId,
        username,
        referralCode: uuid,
        referrer: referrer && referrer._id
      });
      
      //Generate wallet
      const wallet = await generateWallet();
      const newWallet = new Wallet({
        userId: newUser._id,
        name: generateWalletName(),
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
      });
      await newWallet.save();
  
      if (!newUser.wallets.length) {
        newUser.defaultWallet = newWallet._id;
      }
      newUser.wallets.push(newWallet._id);
      await newUser.save();


      const wallets = [newWallet].map((wallet) => {
        return {
          name: wallet.name,
          publicKey: wallet.publicKey,
          balance: 0,
        };
      });
      await ctx.reply(startText(wallets), startMarkUp('HTML'));

      if (referrer) {
        await determineReferralLvl(referrer._id);
      }
    } else {
      const wallets = await Wallet.find({ userId: user._id });

      const balances = await Promise.all(wallets.map(async (wallet) => {
        const balance = await getBalanceOfWallet(wallet.publicKey);
        return {
          name: wallet.name,
          publicKey: wallet.publicKey,
          balance: balance / 1e9,
        };
      }));
      await ctx.reply(startText(balances), startMarkUp('HTML'));
    }
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

    await ctx.reply(settingText, settingMarkUp(user));
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
      { command: '/wallets', description: 'Wallets' },
      { command: '/copytrade', description: 'Copy Trade' },
      { command: '/positions', description: 'Positions' },
      { command: '/withdraw', description: 'Withdraw Sol' },
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