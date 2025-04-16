const crypto = require('crypto');

const hashText = (text) => {
  const hash = crypto.createHash('md5');
  hash.update(text);
  return hash.digest('hex');
};

const compareTextWithHash = (text, hash) => {
  const hashedText = hashText(text);
  return hashedText === hash;
};

module.exports = { compareTextWithHash };