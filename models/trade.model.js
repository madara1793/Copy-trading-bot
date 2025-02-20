const { Schema, model } = require('mongoose');

const tradeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
  },
  targetAddress: {
    type: String,
  },
  name: {
    type: String,
  },
  status: {
    type: Boolean,
    default: false,
  },
  tradeAmount: {
    type: Number,
    default: 0.001,
  },
  minTriggerAmount: {
    type: Number,
  },
  maxTriggerAmount: {
    type: Number,
  },
  minTriggerMCap: {
    type: Number,
  },
  maxTriggerMCap: {
    type: Number,
  },
  minTriggerTokenAge: {
    type: Number,
  },
  maxTriggerTokenAge: {
    type: Number,
  },
  minTriggerTokenVolume: {
    type: Number,
  },
  minTriggerTokenHolders: {
    type: Number,
  }
});


const trade = model('Trade', tradeSchema, 'Trade');

module.exports = trade;