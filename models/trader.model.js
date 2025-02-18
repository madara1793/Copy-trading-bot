const { Schema, model }  = require("mongoose");

const TraderSchema = new Schema({
  address: {
    type: String,
    required: true,
  }
});

const Trader = model("Trader", TraderSchema, "Trader");

module.exports = Trader;