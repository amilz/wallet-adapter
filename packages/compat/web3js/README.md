# `@solana/web3-compat-wallet-adapter`

Use your existing wallet-adapter setup with `@solana/web3.js` v3.

This package exposes the connected wallet-adapter wallet as a [Kit](https://github.com/anza-xyz/kit) transaction signer that `@solana/web3.js@3.x` signing APIs accept natively. Your `WalletProvider`, wallet modal, autoconnect, and every wallet UI component keep working unchanged — only the code that builds and sends transactions migrates to v3.

## Migrating an app

### 1. Upgrade web3.js

```shell
npm install @solana/web3.js@rc @solana/web3-compat-wallet-adapter
```

The wallet-adapter packages declare a `@solana/web3.js@^1.98.0` peer dependency, which v3 does not satisfy yet. Until the ranges are widened, tell your package manager to resolve the peer to v3:

```jsonc
// package.json — npm
{
    "overrides": {
        "@solana/web3.js": "$@solana/web3.js"
    }
}
```

```jsonc
// package.json — pnpm
{
    "pnpm": {
        "overrides": {
            "@solana/web3.js": "3.0.0-rc.1"
        }
    }
}
```

(Or use `npm install --legacy-peer-deps`.)

### 2. Get a signer instead of calling `signTransaction`

```tsx
import { useWalletAdapterKitSigner } from '@solana/web3-compat-wallet-adapter';

function SendButton() {
    const { signer } = useWalletAdapterKitSigner();
    // `signer` is null until a wallet is connected.
}
```

### 3. Pass the signer to web3.js v3 APIs

```ts
const transaction = new VersionedTransaction(message);
await transaction.sign([signer]);
await connection.sendTransaction(transaction);

// or, with a legacy Transaction, let web3.js sign and send in one step:
await sendAndConfirmTransaction(connection, transaction, [signer]);
```

The same signer works with `Transaction#sign`/`partialSign`, `VersionedTransaction#sign`, `Connection#sendTransaction`, and `sendAndConfirmTransaction`. It also satisfies `@solana/kit`'s `TransactionPartialSigner` and `TransactionModifyingSigner` interfaces, so it can be used as a fee payer or instruction signer in Kit transaction messages.

Outside React, build a signer directly from any connected adapter:

```ts
import { createSignerFromWalletAdapter } from '@solana/web3-compat-wallet-adapter';

const signer = createSignerFromWalletAdapter(adapter);
```

## How it works

Wallets surfaced through the [wallet standard](https://github.com/wallet-standard/wallet-standard) — which includes nearly every modern wallet — expose a `solana:signTransaction` feature that takes and returns serialized transaction bytes. The signer serializes each transaction, has the wallet sign the bytes, and extracts the signature. No web3.js types cross the wallet boundary, so the wallet does not care which web3.js version your app uses.

## Limitations

- **Legacy (non-wallet-standard) adapters are not supported.** Their `signTransaction` methods operate on web3.js v1 class instances, which do not exist in a v3 app. The signer throws a `WalletSignTransactionError` explaining this if signing is attempted.
- **Wallets that only support `solana:signAndSendTransaction`** cannot return a signature without sending, so they are not supported either; keep using the adapter's `sendTransaction` for those.
- **The signer signs transactions only.** Its `signMessages` method exists because web3.js v3 routes transaction signing through it when no transaction lifetime is available; it treats its input as transaction message bytes. To sign arbitrary off-chain messages, keep using `useWallet().signMessage`.
- **Wallets that modify transactions while signing** (e.g. to inject fees) are only compatible with the `modifyAndSignTransactions` path. The web3.js class APIs apply a bare signature to the original transaction, so the signer detects modification and throws rather than producing an invalid signature.

## Development

In this monorepo, the web3.js v3 release candidate is a devDependency under the alias `web3js-v3` (`npm:@solana/web3.js@3.0.0-rc.1`) rather than the usual `@solana/web3.js` name. The repo's `.npmrc` sets `shamefully-hoist=true`, so a devDependency named `@solana/web3.js` would hoist v3 to the root `node_modules` and break the v1-based packages that resolve web3.js from there. If this package moves to its own repository, switch the devDependency back to a plain `@solana/web3.js` entry.
