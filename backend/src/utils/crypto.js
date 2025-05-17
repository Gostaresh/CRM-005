const crypto = require("crypto");
const env = require("../config/env");
const logger = require("./logger");

const algorithm = "aes-256-ctr";
let secretKey = env.sessionSecret || "your-32-byte-secret-key!!!!!!123";

if (Buffer.byteLength(secretKey, "utf8") !== 32) {
  logger.warn(`SESSION_SECRET is not 32 bytes long. Generating a new key.`);
  secretKey = crypto.randomBytes(32).toString("hex").slice(0, 32);
  logger.info(`Generated secretKey: ${secretKey}`);
}

const iv = crypto.randomBytes(16);

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return {
    iv: iv.toString("hex"),
    content: encrypted.toString("hex"),
  };
};

const decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(hash.iv, "hex")
  );
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(hash.content, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString();
};

module.exports = { encrypt, decrypt };
