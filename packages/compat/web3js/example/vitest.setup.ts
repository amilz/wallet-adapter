import { TextDecoder, TextEncoder } from 'node:util';

// jsdom runs in its own VM realm, so its Uint8Array (and the byte arrays
// produced by its TextEncoder) are different intrinsics from Node's.
// @solana/web3.js, @solana/buffer-layout, and tweetnacl all do
// `instanceof Uint8Array` checks that fail across realms. Restore Node's
// intrinsics so every byte array in the tests comes from a single realm.
const NodeUint8Array = Object.getPrototypeOf(Buffer.prototype).constructor as Uint8ArrayConstructor;
globalThis.Uint8Array = NodeUint8Array;
globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
