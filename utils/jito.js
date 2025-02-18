const { VersionedTransaction, Keypair, PublicKey } = require("@solana/web3.js");
const { Bundle } = require("jito-ts/dist/sdk/block-engine/types");
const { searcherClient } = require("jito-ts/dist/sdk/block-engine/searcher");
const { isError } = require('jito-ts/dist/sdk/block-engine/utils');
const base58 = require('bs58');

const { connection } = require("@config/config");


/**
 *
 * @param {string} signature
 * @returns
 */
const onSignatureResult = async (signature) => {
  return new Promise((resolve, reject) => {
    let timeout = setTimeout(() => {
      console.log('transaction failed', signature);
      reject(false);
    }, 30000);
    connection.onSignature(
      signature,
      (updatedTxInfo) => {
        console.log('update account info', updatedTxInfo);
        clearTimeout(timeout);
        resolve(true);
      },
      'confirmed'
    );
  });
};


/**
 *
 * @param {string[]} signatures
 * @returns
 */
const onBundleResultFromConfirmTransaction = async (signatures) => {
  for (const signature of signatures) {
    try {
      const txResult = await onSignatureResult(signature);
      console.log('txResult', txResult, signature);
      if (txResult == false) return false;
    } catch (err) {
      console.log('transaction confirmation error', err);
      return false;
    }
  }
  return true;
};


/**
 * 
 * @param {VersionedTransaction[]} bundledTranscations 
 * @param {Keypair} keyPair 
 * @param {number} jitoFee 
 * @returns
 */
const sendBundle = async (bundledTranscations, keyPair, jitoFee) => {
  try {
    const blockchainEngineUrl = process.env.BLOCKCHAIN_ENGINE_URL;
    const searcher = searcherClient(blockchainEngineUrl, undefined);
    const bundle = new Bundle(bundledTranscations, bundledTranscations.length + 1);

    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const _tipAccount = (await searcher.getTipAccounts()).value[0];
    const tipAccount = new PublicKey(_tipAccount);

    let maybeBundle = bundle.addTipTx(keyPair, jitoFee * 1e9, tipAccount, blockhash);
    if (isError(maybeBundle)) {
      throw maybeBundle;
    }

    const signatures = bundledTranscations.map(tx => {
      return base58.default.encode(tx.signatures[0]);
    })

    const bundleId = await searcher.sendBundle(maybeBundle);
    console.log(`Bundle ${bundleId.value} sent.`);

    const res = await onBundleResultFromConfirmTransaction(signatures);
    return {
      success: res,
      signature: signatures[0],
    };
  } catch (error) {
    console.log("Error in bundle", error);
  }
}

module.exports = {
  sendBundle,
}