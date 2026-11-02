/* Usage: npm run make-code -- SOMECODE
 * Prints the hash to paste into MONEY.supporterCodeHashes in platform/site.config.js.
 * Give the plain code to supporters (e.g. as a Ko-fi shop item). */
import crypto from 'node:crypto';
const code = (process.argv[2] || '').trim().toUpperCase();
if (!code) { console.log('Usage: npm run make-code -- YOURCODE'); process.exit(1); }
console.log(crypto.createHash('sha256').update(code).digest('hex'));
