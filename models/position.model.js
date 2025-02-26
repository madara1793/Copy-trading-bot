const { Schema, model } = require('mongoose');

const PositionSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  wallet: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
  },
  usedSolAmount: {
    type: Number,
  },
  outAmount: {
    type: Number,
  },
  solDiff: {
    type: Number,
  },
  sellAmount: {
    type: Number,
  },
  tokenInfo: {
    name: String,
    symbol: String,
    address: String,
    decimals: Number,
    price: Number,
  },
  jitoTip: {
    type: Number,
  },
  slippage: {
    type: Number,
  },
  state: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

const Position = model('Position', PositionSchema, 'Position');

module.exports = Position;