// jsdom does not provide TextEncoder/TextDecoder, which @solana/web3.js v3 needs at load time.
const { TextDecoder, TextEncoder } = require('node:util');

if (typeof globalThis.TextEncoder === 'undefined') {
    globalThis.TextEncoder = TextEncoder;
    globalThis.TextDecoder = TextDecoder;
}
