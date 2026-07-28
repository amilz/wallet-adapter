# `@solana/wallet-adapter-kit` + `@solana/web3.js` v3

Same wallet adapter as [`../example`](../example), but the app is written against
[`@solana/web3.js`](https://github.com/solana-foundation/solana-web3.js/tree/v3.x) v3 instead of `@solana/kit`.

web3.js v3 keeps the classic class-based API (`Address`, `Connection`, `Transaction`, `SystemProgram`) and rebuilds its
internals on Kit. This example uses the `@solana/wallet-adapter-kit/web3js` entry point, which mirrors the classic
`@solana/wallet-adapter-react` surface on top of the Kit-native adapter:

- `useWallet().publicKey` is a web3.js `Address`, ready to use as a fee payer or transfer party.
- `signMessage` signs arbitrary bytes through the wallet.
- A `SystemProgram.transfer` transaction is built with the classic web3.js `Transaction().add(...)` API and signed with
  `useWallet().signTransaction`, which bridges to the wallet's Kit signer through Kit's transaction codec under the
  hood. (The wallet exposes a Kit _modifying_ signer, which web3.js v3's `Transaction.sign()` — partial signers only —
  cannot consume directly.)

The transaction sends a small amount of Devnet SOL so the connected wallet must have some SOL on Devnet ([Devnet Faucet](https://faucet.solana.com/)) to cover the fee.

## Run

This example is a standalone project, not part of the monorepo workspace — install with `--ignore-workspace`.

```shell
pnpm install --ignore-workspace
pnpm dev    # open the printed URL, add ?mock=1 to use the built-in mock wallet
pnpm test   # headless: connects the mock wallet and signs a web3.js transaction against a local Surfpool instance
```
