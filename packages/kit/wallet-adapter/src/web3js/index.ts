/**
 * The `@solana/web3.js` v3 flavor of `@solana/wallet-adapter-kit`, mirroring the classic
 * `@solana/wallet-adapter-react` surface: everything from the root entry point, plus
 * `ConnectionProvider`/`useConnection`, a `useWallet` extended with `publicKey`/`select`/
 * `signTransaction`/`signAllTransactions`/`sendTransaction`, `useAnchorWallet`, and codec helpers
 * for crossing between web3.js transactions and Kit signers.
 *
 * The root entry point's Kit-native `useWallet` is superseded here by the extended one.
 */
export * from '../KitWalletProvider.js';
export * from '../hooks.js';
export * from '../types.js';
export * from '../ui/index.js';
export * from '../useWalletClient.js';
export * from '../useWalletSigner.js';
export * from './ConnectionProvider.js';
export * from './transactions.js';
export * from './useAnchorWallet.js';
export * from './useConnection.js';
export * from './useWallet.js';
