const { safeStorage } = require('electron');

/**
 * Encrypts a string using Electron's safeStorage.
 * @param {string} plainText The string to encrypt.
 * @returns {Buffer} The encrypted buffer.
 */
function encryptString(plainText) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('Encryption is not available on this system. Storing data in plaintext.');
    return Buffer.from(plainText, 'utf8');
  }
  return safeStorage.encryptString(plainText);
}

/**
 * Decrypts a buffer using Electron's safeStorage.
 * @param {Buffer} encryptedBuffer The buffer to decrypt.
 * @returns {string} The decrypted string.
 */
function decryptString(encryptedBuffer) {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('Encryption is not available on this system. Data was stored in plaintext.');
    return encryptedBuffer.toString('utf8');
  }
  return safeStorage.decryptString(encryptedBuffer);
}

module.exports = {
  encryptString,
  decryptString,
};