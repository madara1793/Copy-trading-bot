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
const settingActions = require("@actions/setting.action");
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
const { 
  tradeAction,
  setTradeTarget,
  setTradeName,
  setupTradeAction,
  startTradeAction, 
  terminateTradeAction,
} = require("@actions/trade.action");
const tradeActions = require("@actions/trade.action");
const referralActions = require("@actions/referral.action");
const withdrawActions = require("@actions/withdraw.action");
const positionActions = require("@actions/position.action");
const User = require("@models/user.model");
const Wallet = require("@models/wallet.model");
const Trade = require("@models/trade.model");
const { setTargetWallet } = require("@store/index");
      
const { trackTargetWallet } = require("@utils/trade");


bot.command("start", startCommand);

bot.command("help", helpCommand);

bot.command("settings", settingCommand);

bot.command("wallets", walletAction);

bot.command("positions", positionActions.positionActions);
bot.command("withdraw", withdrawActions.withdrawAction);
bot.command("copytrade", tradeActions.tradeAction)


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
    const tradeId = ctx.session.tradeId;

    console.log(botState, tradeId);
    
    if (!user) {
      throw new Error('User not found');
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
      case 'priorityFee_buy': 
        await setPriorityFee(ctx, true);
        break;
      case 'priorityFee_sell': 
        await setPriorityFee(ctx, false);
        break;
      case 'jitoTip_buy':
        await setJitoTip(ctx, true);
        break;
      case 'jitoTip_sell':
        await setJitoTip(ctx, false);
        break;
      case 'tradeAmount':
        await setTradeAmount(ctx);
        break;
      case 'slippage_buy':
        await setSlippage(ctx, true);
        break;
      case 'slippage_sell':
        await setSlippage(ctx, false);
        break;
      case 'enterTargetAddress': {
        const tradeId = ctx.session.tradeId;
        const res = await setTradeTarget(tradeId, text);
        if (!res) {
          ctx.session.botState = 'enterTargetAddress';
          ctx.reply('Invalid Address');
          return;
        }

        ctx.session.state = 'enterTradeName';
        await ctx.deleteMessage(ctx.message.message_id);
        await ctx.deleteMessage(ctx.session.targetAddressMsgId);
        await ctx.reply(`Please choose a name for this config:`);
        break;
      }
      case 'enterTradeName': {
        const tradeId = ctx.session.tradeId;
        const res = await setTradeName(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        }
        break;
      }
      case 'enterMinTokenHolder': {
        const res = await tradeActions.setMinTokenHolder(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterMinTokenVolume': {
        const res = await tradeActions.setMinVolume(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterMinMCap': {
        const res = await tradeActions.setMinMCap(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterMaxMCap': {
        const res = await tradeActions.setMaxMCap(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterMinTokenAge': {
        const res = await tradeActions.setMinTokenAge(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterMaxTokenAge': {
        const res = await tradeActions.setMaxTokenAge(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterMinTriggerAmount': {
        const res = await tradeActions.setMinTriggerAmount(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterMaxTriggerAmount': {
        const res = await tradeActions.setMaxTriggerAmount(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterTradeAmount': {
        const res = await tradeActions.setTradeAmount(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterTradeSlippage': {
        const res = await tradeActions.setCopySlippage(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterTradeJitoFee': {
        const res = await tradeActions.setCopyJitoTip(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'enterTradePriorityFee': {
        const res = await tradeActions.setCopyPriorityFee(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid value. Please enter a valid number.');
        }
        break;
      }
      case 'setTradeTargetAddress': {
        const res = await tradeActions.setTargetAddress(tradeId, text);
        if (res) {
          setupTradeAction(ctx, tradeId);
        } else {
          ctx.reply('Invalid address. Please enter a valid address.');
        }
        break;
      }
      case 'SetWithdrawal': {
        await withdrawActions.setWithdrawalAddress(ctx);
        break;
      }
      case 'WithdrawXAmount': {
        await withdrawActions.withdrawXAmountAction(ctx);
        break;
      }
      case 'CreatePosition': {
        await positionActions.createPositionAction(ctx);
        break;
      }
      case 'SetPositionBuyTip': {
        await positionActions.setPositionBuyTip(ctx);
        break;
      }
      case 'SetPositionSlippage': {
        await positionActions.setPositionSlippage(ctx);
        break;
      }
      case 'enterSellPositionAmount': {
        await positionActions.sellPosition(ctx, ctx.session.sellPositionId, parseFloat(ctx.message.text))
        break;
      }
      default:
        break;
    }

    // ctx.session.state = undefined;

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

bot.action('BUY_PriorityFeeSetting', priorityFeeMsgAction);
bot.action('SELL_PriorityFeeSetting', priorityFeeMsgAction);
bot.action('BUY_JitoTipSetting', jitoTipMsgAction);
bot.action('SELL_JitoTipSetting', jitoTipMsgAction);
bot.action('Trade Amount', tradeAmountMsgAction);
bot.action('BUY_SlippageSetting', slippageMsgAction);
bot.action('SELL_SlippageSetting', slippageMsgAction);
bot.action('Return To Setting', settingActions.settingAction)


/***************** Trade Actions ******************/

bot.action('Add New Trade Config', tradeActions.addTradeMsgAction);
bot.action('Pause Copy Trade', tradeActions.tradeAction)
bot.action('Start Copy Trade', tradeActions.tradeAction)


/******* Trade Settings Actions *******/

bot.action(/change_tradeWallet_(\d+)/, tradeActions.changeTradeWallet);
bot.action('Set Trade Wallet', tradeActions.setTradeWalletMsgAction);
bot.action('Set Trade Name', tradeActions.setTradeNameMsgAction);
bot.action('Set Target Address', tradeActions.setTargetMsgAction)
bot.action('Set Min Token Holder', tradeActions.minTokenHolderMsgAction);
bot.action('Set Min Volume', tradeActions.minTokenVolumeMsgAction);
bot.action('Set Min MCap', tradeActions.minMCapMsgAction)
bot.action('Set Max MCap', tradeActions.maxMCapMsgAction);
bot.action('Set Min Token Age', tradeActions.minTokenAgeMsgAction)
bot.action('Set Max Token Age', tradeActions.maxTokenAgeMsgAction);
bot.action('Set Min Trigger Amount', tradeActions.minTriggerAmountMsgAction);
bot.action('Set Max Trigger Amount', tradeActions.maxTriggerAmountMsgAction);
bot.action('Set Copy Slippage', tradeActions.tradeSlippageMsgAction);
bot.action('Set Copy Trade Amount', tradeActions.tradeAmountMsgAction);
bot.action('Set Copy Jito Tip', tradeActions.tradeJitoFeeMsgAction);
bot.action('Set Copy Priority Fee', tradeActions.tradePriorityFeeMsgAction);
bot.action('Set Trade Status', tradeActions.updateTradeState);
bot.action('Delete Trade Config', tradeActions.deleteTrade);
bot.action('Return to Trade List', tradeActions.returnToTradeAction);

bot.action(/trade_[A-Za-z0-9]+$/, tradeActions.openTradeAction);


bot.action('Copy Trade', tradeAction);

bot.action('Start Trade', startTradeAction);

bot.action('Stop Trade', terminateTradeAction);

bot.action('Add Top Trader', topTraderAction);

bot.action('Following Traders', getFollowingTraders);

bot.action('Generate Wallet', generateWalletAction);




/******************************* Referrals  ****************************/

bot.action('Invite friends', referralActions.referralAction);
bot.action('Refresh Referrals', referralActions.referralAction);


/******************************* Withdrawals  ****************************/

bot.action('Withdraw', withdrawActions.withdrawAction);
bot.action('Withdraw 50%', withdrawActions.withdraw50Action);
bot.action('Withdraw 100%', withdrawActions.withdrawAllAction);
bot.action('Withdraw X SOL', withdrawActions.withdrawXMsgAction);
bot.action('Set Withdrawal Address', withdrawActions.setWithdrawalMsgAction);
bot.action('Swtich Withraw Address', withdrawActions.switchWithdrawWallet)
bot.action(/withdraw_wallet_[A-Za-z0-9]+$/, withdrawActions.switchWithdrawWalletAction);

/******************************* Positions ****************************/
bot.action('Position', positionActions.positionActions);
bot.action('Import Position', positionActions.createPositionMsgAction);
bot.action('Switch to Sell', positionActions.switchToSellPositionAction);
bot.action('Switch to Buy', positionActions.switchToBuyPositionAction);
bot.action(/Buy_(\d+)/, positionActions.buyPosition);
bot.action(/Position_[A-Za-z0-9]+$/, positionActions.getPositionAction);
bot.action(/Sell_(\d+)_[A-Za-z0-9]+$/, positionActions.sellPositionMsg);
bot.action(/Sell_(\X+)_[A-Za-z0-9]+$/, positionActions.sellPositionMsg);

// bot.action('Set Position Buy Tip', positionActions.setPositionBuyTipMsgAction);
// bot.action('Set Position Slippage', positionActions.setPositionSlippageMsgAction);

/****************************** Settings *************************** */
bot.action('Manual Buy Setting', settingActions.manualBuySettingAction);
bot.action('Manual Sell Setting', settingActions.manualSellSettingAction);


setCommands(bot);


bot.launch();
console.log("Bot is running....");

setTimeout(async() => {
  const trades = await Trade.find({ status: true })
    .populate('wallet')
    .populate('userId');

  
  Promise.all(trades.map(async (trade) => {
    const intervalID = setTimeout(() => trackTargetWallet(trade), 5000);
    trade.intervalId = intervalID;
    await trade.save();
  }))
}, 5000);

