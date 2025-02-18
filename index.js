require('dotenv').config();
require('module-alias/register');

const { bot } =  require("@config/config");
const { 
  startCommand, 
  helpCommand, 
  settingCommand, 
  setCommands 
} = require("@commands/command");
const { 
  topTraderAction, 
  getFollowingTraders, 
  settingAction,
  priorityFeeMsgAction,
  setPriorityFee,
  jitoTipMsgAction,
  setJitoTip,
  tradeAmountMsgAction,
  setTradeAmount,
  slippageMsgAction,
  setSlippage,
} = require("@actions/setting.action");
const { 
  generateWalletAction, 
  walletAction, 
  defaultWalletAction, 
  setDefaultWalletAction, 
  walletNameAction, 
  setWalletNameAction,
  importWalletMsgAction,
  importWallet,
  unbindWalletMsgAction,
  unbindWallet,
  exportKeyMsgAction,
  exportKey,
} = require("@actions/wallet.action");
const { closeAction, returnAction } = require("@actions/common.action");
const { tradeAction, startTradeAction, terminateTradeAction } = require("@actions/trade.action");
const User = require("@models/user.model");
const Wallet = require("@models/wallet.model");
const { setTargetWallet } = require("@store/index");
      
const { trackTargetWallet } = require("@utils/trade");


bot.command("start", startCommand);

bot.command("help", helpCommand);

bot.command("setting", settingCommand);


bot.on("text", async (ctx) => {
  const botState = ctx.session.state;
  const text = ctx.message.text;
  const chatId = ctx.chat.id;

  if (text.startsWith('/')) {
    ctx.reply('⚠️ Unrecognizable commands. Input /help to see the help.');
    return;
  }

  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found');
    }
    
    if (botState === 'topTrader') {
      const traderAddress = text;
      const traderIndex = user.followingTraders.findIndex(trader => trader === traderAddress);
      
      if (traderIndex == -1) {
        user.followingTraders.push(traderAddress);
        await user.save();
        ctx.reply(`✅ Added ${traderAddress} to your following traders`);

      } else {
        ctx.reply(`✅ Already registered ${traderAddress}`);
      }
      setTargetWallet(traderAddress);
    }
    if (botState === 'walletName') {
      const walletId = ctx.session.walletId;
      const wallet = await Wallet.findById(walletId);

      wallet.name = text;
      await wallet.save();

      ctx.reply(`✅ Wallet Name Changed`);
    }
    if (botState === 'importWallet') {
      await importWallet(ctx);
    }

    switch (botState) {
      case 'priorityFee': 
        await setPriorityFee(ctx);
        break;
      case 'jitoTip':
        await setJitoTip(ctx);
        break;
      case 'tradeAmount':
        await setTradeAmount(ctx);
        break;
      case 'slippage':
        await setSlippage(ctx);
        break;
      default:
        break;
    }

  } catch (error) {
    console.error('Error while on text:', error);
  }
});


bot.action('Close', closeAction);

bot.action('Return', returnAction);

bot.action('Setting', settingAction);


/** Wallet Actions */
bot.action('Wallet', walletAction);

bot.action('Change Default', defaultWalletAction);

bot.action(/change_wallet_(\d+)/, setDefaultWalletAction);

bot.action('Change Name', walletNameAction);

bot.action(/change_name_(\d+)/, setWalletNameAction);

bot.action('Import Wallet Msg', importWalletMsgAction);

bot.action('Import Wallet', importWallet);

bot.action('Unbind Wallet', unbindWalletMsgAction);

bot.action(/unbind_wallet_(\d+)/, unbindWallet);

bot.action('Export Wallet', exportKeyMsgAction);

bot.action(/export_wallet_(\d+)/, exportKey);


/** Setting Actions */

bot.action('Priority Fee', priorityFeeMsgAction);

bot.action('Jito Tip', jitoTipMsgAction);

bot.action('Trade Amount', tradeAmountMsgAction);

bot.action('Slippage BPS', slippageMsgAction);

/** Trade Actions */

bot.action('Copy Trade', tradeAction);

bot.action('Start Trade', startTradeAction);

bot.action('Stop Trade', terminateTradeAction);

bot.action('Add Top Trader', topTraderAction);

bot.action('Following Traders', getFollowingTraders);

bot.action('Generate Wallet', generateWalletAction);


setCommands(bot);


bot.launch();
console.log("Bot is running....");

setTimeout(async() => {
  const users = await User.find();
  Promise.all(users.map(async (user) => {
    if (user.enableAutoTrade) {
      const intervalID = setInterval(() => trackTargetWallet(user), 5000);
      user.intervalId = intervalID;
      await user.save();
      }
  }))
}, 5000);

