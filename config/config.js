const { Telegraf, session } = require("telegraf");
const { Connection, PublicKey } = require("@solana/web3.js");
const mongoose = require("mongoose");
const User = require("@models/user.model")

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const MONGO_URI = process.env.MONGO_URI || "";

const HTTP_URL = process.env.HTTP_URL || '';
const WSS_URL = process.env.WSS_URL || '';

const connection = new Connection(HTTP_URL, {
  wsEndpoint: WSS_URL,
  commitment: "confirmed",
});

/*************************  Connect DB  *************************/

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("DB Connected!!!")
  })
  .catch((error) => {
    console.error("DB Connection Error: ", error);
  });
  
/*************************  Bot Setup  *************************/

const bot = new Telegraf(BOT_TOKEN);

bot.use(session());
bot.use((ctx, next) => {
  try {
    if (!ctx.session) {
      ctx.session = {};
    }

    return next();
  } catch (error) {
    console.error("Error:", error);
  }
})

module.exports = {
  connection,
  bot,
}