# Compat shim — `@solana/web3-compat-wallet-adapter`

Use your existing wallet-adapter setup with `@solana/web3.js` v3. Your `ConnectionProvider`, `WalletProvider`, `wallets={[...]}` list, wallet modal, autoconnect, and every wallet UI component stay unchanged. Only the code that builds and sends transactions moves to v3.

The package exposes the connected wallet-adapter wallet as a Kit `TransactionSigner` that v3 signing APIs accept natively.

## Contents

- [When this path fits](#when-this-path-fits)
- [Step 1 — install + peer-dependency override](#step-1--install--peer-dependency-override)
- [Step 2 — get a signer instead of calling signTransaction](#step-2--get-a-signer-instead-of-calling-signtransaction)
- [Step 3 — pass the signer to v3 APIs](#step-3--pass-the-signer-to-v3-apis)
- [Off-chain message signing](#off-chain-message-signing)
- [Outside React](#outside-react)
- [Limitations](#limitations)
- [API reference](#api-reference)
- [Verify](#verify)

## When this path fits

Migrating an existing app with the smallest possible diff. The provider stack, wallet selection UI, and adapter list are all preserved. Recommended default when migrating a real app.

## Step 1 — install + peer-dependency override

```shell
npm install @solana/web3.js@rc @solana/web3-compat-wallet-adapter
```

The wallet-adapter packages declare a `@solana/web3.js@^1.98.0` peer dependency, which v3 does not satisfy yet. Until those ranges widen, tell the package manager to resolve the peer to v3, or install will error on a peer conflict:

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

(Or install with `npm install --legacy-peer-deps`.)

Leave the providers alone. `ConnectionProvider`, `WalletProvider wallets={[...]}`, `autoConnect`, the modal, and every wallet UI component keep working exactly as before.

## Step 2 — get a signer instead of calling signTransaction

Replace direct `signTransaction` / `signAllTransactions` usage with the signer hook. `signer` is `null` until a wallet is connected. Must be used within a `WalletProvider`.

**Before (v1):**

```tsx
import { useWallet } from '@solana/wallet-adapter-react';

function SendButton() {
    const { publicKey, signTransaction } = useWallet();
    // build a v1 Transaction, then: await signTransaction(transaction)
}
```

**After (v3):**

```tsx
import { useWalletAdapterKitSigner } from '@solana/web3-compat-wallet-adapter';

function SendButton() {
    const { signer } = useWalletAdapterKitSigner();
    // signer is null until a wallet is connected
}
```

Keep pulling `publicKey`, `connected`, `select`, `connect`, `disconnect`, `wallet`, `wallets`, and `signMessage` from the classic `useWallet()` as before — only signing/sending changes. `useWalletAdapterKitSigner()` optionally accepts `{ chain }` (e.g. `{ chain: 'solana:mainnet' }`) which is passed through to the wallet.

## Step 3 — pass the signer to v3 APIs

The signer works with `Transaction#sign` / `partialSign`, `VersionedTransaction#sign`, `Connection#sendTransaction`, and `sendAndConfirmTransaction`. It also satisfies `@solana/kit`'s `TransactionPartialSigner` and `TransactionModifyingSigner`, so it can be a fee payer or instruction signer in a Kit transaction message.

```ts
const transaction = new VersionedTransaction(message);
await transaction.sign([signer]);
await connection.sendTransaction(transaction);

// or, with a legacy Transaction, sign and send in one step:
await sendAndConfirmTransaction(connection, transaction, [signer]);
```

Anywhere the v1 app called `wallet.sendTransaction(tx, connection)`, build the transaction with v3, sign with `signer`, and send via the v3 `Connection` / `sendAndConfirmTransaction`.

## Off-chain message signing

The transaction signer signs **transactions only**. Its `signMessages` method exists because web3.js v3 routes transaction signing through it when no transaction lifetime is available, and it treats its input as transaction message bytes — do not use it for arbitrary messages. To sign an off-chain message (e.g. auth), keep using `useWallet().signMessage`:

```tsx
const { signMessage } = useWallet();
await signMessage(new TextEncoder().encode('hello world'));
```

## Outside React

Build a signer directly from any connected adapter (throws `WalletNotConnectedError` if the adapter is not connected):

```ts
import { createSignerFromWalletAdapter } from '@solana/web3-compat-wallet-adapter';

const signer = createSignerFromWalletAdapter(adapter);
// createSignerFromWalletAdapter(adapter, { chain: 'solana:mainnet' }) to pin the chain
```

## Limitations

- **Legacy (non-wallet-standard) adapters are not supported.** Their `signTransaction` operates on v1 class instances, which do not exist in a v3 app. The signer throws `WalletSignTransactionError` explaining this if signing is attempted.
- **Wallets that only support `solana:signAndSendTransaction`** cannot return a signature without sending, so they are not supported. Keep using the adapter's own `sendTransaction` for those.
- **Wallets that modify a transaction while signing** (e.g. to inject fees) are only compatible with the `modifyAndSignTransactions` path. The web3.js class APIs (`Transaction#sign`, etc.) apply a bare signature to the original transaction, so the signer detects the modification and throws rather than producing an invalid signature.

## API reference

| Export | Kind | Signature | Notes |
|---|---|---|---|
| `useWalletAdapterKitSigner` | hook | `(config?: { chain?: IdentifierString }) => { signer: WalletAdapterTransactionSigner \| null }` | `signer` is `null` until connected; use inside a `WalletProvider` |
| `createSignerFromWalletAdapter` | function | `(adapter: Adapter, config?: { chain?: IdentifierString }) => WalletAdapterTransactionSigner` | Non-React; throws `WalletNotConnectedError` if not connected |
| `WalletAdapterTransactionSigner` | type | `MessagePartialSigner & TransactionModifyingSigner & TransactionPartialSigner` | The signer type |
| `WalletAdapterSignerConfig` | type | `{ chain?: IdentifierString }` | Config for both APIs |

Peer dependencies: `@solana/wallet-adapter-base ^0.9.27`, `@solana/wallet-adapter-react ^0.15.39`, `react`.

## Verify

- App builds after the override is added.
- Wallet connects through the unchanged modal / autoconnect.
- A transaction signs via `signer` and sends through the v3 `Connection`.
- Off-chain message signing still goes through `useWallet().signMessage`, not the signer.
