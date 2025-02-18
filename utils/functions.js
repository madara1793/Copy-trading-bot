const { v4: uuidv4 } = require('uuid');

/**
 * Convert Uint8Array type hexadecimal string type.
 *
 * @param {Uint8Array} uint8Array
 * @returns Return hexadecimal string
 */

function uint8ArrayToHex(uint8Array) {
  try {
    return Array.from(uint8Array)
      .map((byte) => byte.toString(16).padStart(2, '0')) // Convert each byte to hex and pad with zeros
      .join(''); // Join all hex strings together
  } catch (error) {
    console.error('Error while uint8ArrayToHex function:', error);
    throw new Error('Failed to convert uint8Array to hexadecimal string.');
  }
}

/**
 * 
 * @returns Return random string
 */
const generateWalletName = () => {
  return 'wallet-' + uuidv4().split('-')[0];
};



module.exports = {
  uint8ArrayToHex,
  generateWalletName,
};