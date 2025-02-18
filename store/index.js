const store = {
  users: {},
  wallets: {},
  targeWallet: null,
  targetMinTradeAmount: 0,
  intervalID: null,

  getUser: function (id) {
    return this.users[id] || null;
  },

  setUser: function (user) {
    const { id } = user;
    this.users[id] = user;
  },

  getWallet: function (id) {
    return this.wallets[id] || null;
  },

  setWallet: function (wallet) {
    const { id } = wallet;
    this.wallets[id] = wallet;
  },

  getTargetWallet: function () {
    return this.targeWallet;
  },
  setTargetWallet: function (wallet) {
    console.log(wallet);
    this.targeWallet = wallet;
  },

  getTargetMinTradeAmount: function () {
    return this.targetMinTradeAmount;
  },

  setTargetMinTradeAmount: function (amount) {
    this.targetMinTradeAmount = amount;
  },

  getIntervalID: function () {
    return this.intervalID;
  },

  setIntervalID: function (id) {
    this.intervalID = id;
  },

  clearAllInterval: function () {
    if (this.intervalID) {
      clearInterval(this.intervalID);
    }

    this.intervalID = null;
  }
};

module.exports = store;
