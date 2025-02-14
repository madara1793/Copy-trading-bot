const { Telegraf, session } = require("telegraf");
const { Connection, PublicKey } = require("@solana/web3.js");
const mongoose = require("mongoose");


const BOT_TOKEN = process.env.BOT_TOKEN || "";
const MONGO_URI = process.env.MONGO_URI || "";


//Initalize DB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("DB Connected!!!")
  })
  .catch((error) => {
    console.error("DB Connection Error: ", error);
  });
  

// Create a new Telegraf instance
const bot = new Telegraf(BOT_TOKEN);

bot.use(session());
bot.use((ctx, next) => {
  try {
    if (!ctx.session) {
      ctx.session = {};
    }
  } catch (error) {
    console.error("Error:", error);
  }
})

module.exports = {
  bot,
}