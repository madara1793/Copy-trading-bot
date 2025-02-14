require('dotenv').config();
require('module-alias/register');

const { bot } =  require("@config/config");
const { 
  startCommand, 
  helpCommand, 
  settingCommand, 
  setCommands 
} = require("@commands/command");

bot.command("start", startCommand);

bot.command("help", helpCommand);

bot.command("setting", setCommands);


bot.on("text", async (ctx) => {
  const botState = ctx.session.state;
  const text = ctx.message.text;
  const chatId = ctx.chat.id;

  if (text.startsWith('/')) {
    ctx.reply('⚠️ Unrecognizable commands. Input /help to see the help.');
    return;
  }

  try {

  } catch (error) {
    console.error('Error while on text:', error);
  }
});


setCommands(bot);


bot.launch();
console.log("Bot is running....");

