const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
  tgId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  wallet: {
    publicKey: {
      type: String,
      required: true,
    },
    privateKey: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      default: 0,
    }
  },
  jitoFee: {
    type: Number,
    default: 0.1,
  },
  botStatus: {
    type: Boolean,
    default: false,
  },
  startAt: {
    type: Date,
    default: () => Date.now(),
  },
  stopAt: {
    type: Date,
    default: () => Date.now(),
  },
  tokens: [{
    name: {
      type: String,
      default: "",
    },
    symbol: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      required: true,
    },
    usedSolAmount: {
      type: Number,
      default: 0,
    },
    decimals: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "Bought",
    },
  }],
});

const User = model("User", UserSchema, "Userh");

module.exports = User;