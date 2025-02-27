const { Context }  = require("telegraf");

const User = require("@models/user.model");
const Wallet = require("@models/wallet.model");
const { generateWallet } = require("@utils/web3");
const { newWalletText, walletText, exportWalletKeyText } = require("@models/text.model");
const { walletMarkUp, defaultWalletMarkup } = require("@models/markup.model");
const { generateWalletName } = require("@utils/functions");
const { getPublicKey } = require("@utils/web3");

/**
 * @param {Context} ctx
*/
const generateWalletAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;

    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    const wallet = await generateWallet();

    const newWallet = new Wallet({
      userId: user._id,
      name: `Wallet ${user.wallets.length + 1}`,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
    });
    await newWallet.save();

    if (!user.wallets.length) {
      user.defaultWallet = newWallet._id;
    }
    user.wallets.push(newWallet._id);
    await user.save();

    const message = await ctx.reply(
      newWalletText(newWallet),
      { parse_mode: 'HTML', reply_markup: walletMarkUp.reply_markup } 
    );

    setTimeout(async () => {
      console.log(message.message_id)
      await ctx.deleteMessage(message.message_id);
    }, 20000)
  } catch (error) {
    console.error('Error :', error);
  }
};

/**
 * The function to handle 'Wallet' action
 * @param {Context} ctx
 */
const walletAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }
    
    const wallets = await Wallet.find({ userId: user._id });
    console.log(wallets);
    const filterWallets = wallets.map((wallet) => {
      return {
        name: wallet.name,
        publicKey: wallet.publicKey,
        isDefaultWallet: user.defaultWallet.toString() == wallet._id.toString(),
      };
    })

    await ctx.reply(
      walletText(filterWallets), 
      { parse_mode: 'HTML', reply_markup: walletMarkUp.reply_markup }
    );
  } catch (error) {
    console.error('Error while walletAction:', error);
  }
};


/**
 * @param {Context} ctx
 */
const defaultWalletAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;

    const user = await User.findOne({ tgId }).populate('wallets');
    if (!user) {
      throw new Error('User not found!');
    }

    await ctx.reply(
      'Please select the wallet number you want to operate on - Switch Default Wallet',
      { parse_mode: 'Markdown', reply_markup: defaultWalletMarkup(user.wallets, 'default').reply_markup}
    );
  } catch (error) {
    console.error("Error while updating default wallet: ", error);
  }
}

/**
 * @param {Context} ctx
 */
const setDefaultWalletAction = async (ctx) => {
  try {
    const index = parseInt(ctx.match[1]); // Extract wallet index

    const tgId = ctx.chat.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    if (user.wallets[index]) {
      user.defaultWallet = user.wallets[index];
      await user.save();

      const wallets = await Wallet.find({ userId: user._id });
      const filterWallets = wallets.map((wallet) => {
        return {
          name: wallet.name,
          publicKey: wallet.publicKey,
          isDefaultWallet: user.defaultWallet.toString() === wallet._id.toString(),
        };
      })
  
      await ctx.editMessageText(
        walletText(filterWallets), 
        { parse_mode: 'HTML', reply_markup: walletMarkUp.reply_markup }
      );
      // await ctx.deleteMessage();
    } else {
      await ctx.answerCbQuery('Wallet not found!', { show_alert: true });
    }
  } catch (error) {

  }
}


/**
 * @param {Context} ctx
 */
const walletNameAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;

    const user = await User.findOne({ tgId }).populate('wallets');;
    if (!user) {
      throw new Error('User not found!');
    }

    await ctx.reply(
      'Please select the wallet number you want to operate on - Set Wallet Name',
      { parse_mode: 'Markdown', reply_markup: defaultWalletMarkup(user.wallets, 'name').reply_markup}
    );
  } catch (error) {
    console.error("Error while updating default wallet: ", error);
  }
}


/**
 * @param {Context} ctx
 */
const setWalletNameAction = async (ctx) => {
  const index = parseInt(ctx.match[1]); // Extract wallet index

  const tgId = ctx.chat.id;
  const user = await User.findOne({ tgId });
  if (!user) {
    throw new Error('User not found!');
  }

  if (user.wallets[index]) {
    const wallet = await Wallet.findById(user.wallets[index]);
    if (!wallet) {
      throw new Error('Wallet not found!');
    }

    await ctx.reply(
      'Please enter the new wallet name: 📍 Up to 10 characters',
    );

    ctx.session.state = 'walletName';
    ctx.session.walletId = wallet._id;
  } else {
    await ctx.answerCbQuery('Wallet not found!', { show_alert: true });
  }

}


/**
 * @param {Context} ctx
 */
const importWalletMsgAction = async (ctx) => {
  ctx.session.state = 'importWallet';
  await ctx.reply(
    'Please enter the private key:',
  );
}


/**
 * @param {Context} ctx
*/
const importWallet = async (ctx) => {
  try {
    const tgId = ctx.chat.id;
    const text = ctx.message.text;

    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    const pubKey = getPublicKey(text);
    if (!pubKey) {
      await ctx.reply('Invalid public key!');
      return;
    }

    const wallet = await Wallet.findOne({ publicKey: pubKey });
    if (wallet) {
      await ctx.reply('Wallet already exists!');
      return;
    }

    const newWallet = new Wallet({
      userId: user._id,
      name: `Wallet ${user.wallets.length + 1}`,
      publicKey: pubKey,
      privateKey: text,
    });
    await newWallet.save();

    if (!user.wallets.length) {
      user.defaultWallet = newWallet._id;
    }
    user.wallets.push(newWallet._id);
    await user.save();

    await ctx.deleteMessage();
    await ctx.reply('✅ Wallet imported successfully!');
    
  } catch (error) {
    console.error("Error while importing wallet: ", error);
  }
}

/**
 * @param {Context} ctx
 */
const unbindWalletMsgAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;

    const user = await User.findOne({ tgId }).populate('wallets');;
    if (!user) {
      throw new Error('User not found!');
    }

    await ctx.reply(
      'Please select the wallet number you want to operate on - Unbind Wallet',
      { parse_mode: 'Markdown', reply_markup: defaultWalletMarkup(user.wallets, 'unbind').reply_markup}
    );
  } catch (error) {
    console.error("Error while updating default wallet: ", error);
  }
}

/**
 * @param {Context} ctx
 */
const unbindWallet = async (ctx) => {
  try {
    const index = parseInt(ctx.match[1]); // Extract wallet index
    const tgId = ctx.chat.id;
  
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }

    if (user.wallets[index]) {
      await Wallet.findByIdAndDelete(user.wallets[index]);

      if (user.defaultWallet.toString() === user.wallets[index].toString()) {
        user.defaultWallet = user.wallets[index ? 0 : 1];
      }
      user.wallets.splice(index, 1);
      await user.save();

      await ctx.editMessageText('✅ Wallet unbinded successfully!');
    } else {
      await ctx.answerCbQuery('Wallet not found!', { show_alert: true });
    }
  } catch (error) {
    console.error("Error while unbinding wallet: ", error);
  }
}

/**
 * @param {Context} ctx
 */
const exportKeyMsgAction = async (ctx) => {
  try {
    const tgId = ctx.chat.id;

    const user = await User.findOne({ tgId }).populate('wallets');;
    if (!user) {
      throw new Error('User not found!');
    }

    await ctx.reply(
      'Please select the wallet number you want to operate on - Export Private Key',
      { parse_mode: 'Markdown', reply_markup: defaultWalletMarkup(user.wallets, 'export').reply_markup}
    );
  } catch (error) {
    console.error("Error while updating default wallet: ", error);
  }
}

/**
 * @param {Context} ctx
*/
const exportKey = async (ctx) => {
  try {
    const index = parseInt(ctx.match[1]); // Extract wallet index
    const tgId = ctx.chat.id;

    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }
    if (user.wallets[index]) {
      const wallet = await Wallet.findById(user.wallets[index]);
      if (!wallet) {
        throw new Error('Wallet not found!');
      }

      const message = await ctx.reply(
        exportWalletKeyText(wallet),
        { parse_mode: 'HTML' }
      );

      setTimeout(async () => {
        await ctx.deleteMessage(message.message_id);
      }, 5000);
    }
    
  } catch (error) {
    console.error("Error while updating default wallet: ", error);
  }
}


module.exports = {
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
};  