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
  wallets: [{
    type: Schema.Types.ObjectId,
    ref: "Wallet",
  }],
  defaultWallet: {
    type: Schema.Types.ObjectId,
    ref: "Wallet",
  },
  followingTraders: {
    type: [String],
    default: [],
  },
  intervalId: {
    type: Number,
    default: -1,
  },
  targetMinAmount: {
    type: Number,
    default: 0,
  },
  targetMaxAmount: {
    type: Number,
    default: 0,
  },
  priorityFee: {
    type: Number,
    default: 0.00000001,
  },
  jitoFee: {
    type: Number,
    default: 0.001,
  },
  tradeAmount: {
    type: Number,
    default: 0.001,
  },
  slippage: {
    type: Number,
    default: 0.01,
  },
  enableAutoTrade: {
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
  referralCode: {
    type: String,
    required: true,
    unique: true,  
  },
  referrer: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  referralRewards: {
    type: Number,
    default: 0,
  },
  referLvls: {
    level_1: {
      count: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      }
    },
    level_2: {
      count: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      }
    },
    level_3: {
      count: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      }
    },
  },
  referralCounts: {
    type: Number,
    default: 0,
  },
  withdrawalAddress: {
    type: String,
  }
});

const User = model("User", UserSchema, "User");

module.exports = User;