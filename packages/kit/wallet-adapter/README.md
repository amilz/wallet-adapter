# `@solana/wallet-adapter-kit`

Wallet-adapter ergonomics for `@solana/web3.js` v3 apps, built natively on [Kit](https://github.com/anza-xyz/kit).

If you know the classic `@solana/wallet-adapter-react` `useWallet()` and `WalletMultiButton`, this is the same shape — a single hook plus a drop-in button and modal — but implemented on the modern Kit stack (`@solana/kit`, `@solana/react`, `@solana/kit-plugin-wallet`). It hides Kit's client plumbing and per-hook `client` argument, and discovers wallets automatically through the [wallet standard](https://github.com/wallet-standard/wallet-standard).

> For migrating an **existing** wallet-adapter app to web3.js v3 while keeping your current wallet UI, use [`@solana/web3-compat-wallet-adapter`](../../compat/web3js) instead. This package is for **new** v3/Kit apps.

## Install

```shell
npm install @solana/wallet-adapter-kit @solana/kit @solana/react @solana/kit-plugin-wallet
```

## Quick start

```tsx
import '@solana/wallet-adapter-kit/styles.css';
import { KitWalletProvider, WalletModalProvider, WalletMultiButton, useWallet } from '@solana/wallet-adapter-kit';

function App() {
    return (
        <KitWalletProvider chain="solana:mainnet" endpoint="https://api.mainnet-beta.solana.com">
            <WalletModalProvider>
                <WalletMultiButton />
                <Profile />
            </WalletModalProvider>
        </KitWalletProvider>
    );
}

function Profile() {
    const { address, connected } = useWallet();
    return connected ? <p>Connected: {address}</p> : <p>Not connected</p>;
}
```

`<KitWalletProvider>` builds a Kit client with the wallet plugin (and, when `endpoint` is set, an RPC) and publishes it to the subtree. There is no wallet list to configure — every wallet-standard wallet that supports the chain is discovered automatically.

## Hooks

### `useWallet()`

One hook mirroring the classic `useWallet()` surface, sourced from the connected wallet's reactive store:

```tsx
const {
    wallets, // discovered wallets
    wallet, // connected wallet, or null
    account, // connected account, or null
    address, // connected account address, or null
    signer, // Kit TransactionSigner, or null
    status, // 'connected' | 'connecting' | 'disconnected' | 'disconnecting' | 'pending' | 'reconnecting'
    connected,
    connecting,
    disconnecting,
    connect, // (wallet) => void          — fire-and-forget
    connectAsync, // (wallet) => Promise<accounts>
    disconnect, // (wallet?) => void
    disconnectAsync,
    signMessage, // (bytes) => Promise<signature>
    signIn, // (wallet, input) => Promise<output>
} = useWallet();
```

### `useWalletSigner()`

Returns the connected account's Kit signer (or `null`). Pass it straight into a Kit transaction message or a `@solana/web3.js` v3 signing API:

```tsx
const signer = useWalletSigner();
```

### Individual hooks

`useWallets`, `useConnectedWallet`, `useWalletStatus`, `useIsWalletReady`, `useConnect`, `useDisconnect`, `useSignMessage`, `useSignIn`, `useSelectAccount` are also exported. These are thin wrappers over `@solana/kit-plugin-wallet/react` that read the client from context, so — unlike the underlying Kit hooks — you never pass a `client` argument.

## UI

Import `@solana/wallet-adapter-kit/styles.css` once, then use:

- `WalletMultiButton` — connect button that opens the wallet-selection modal, then shows the truncated address with a dropdown (copy address, change wallet, disconnect).
- `WalletModalProvider` / `useWalletModal` — controls the modal; render the provider above any `WalletMultiButton`.
- `WalletModal`, `WalletListItem`, `WalletIcon`, `Button` — the lower-level pieces, for building custom UI.

Styling reuses the classic `wallet-adapter-*` class names, so existing wallet-adapter themes and overrides apply unchanged.

## Migrating from `@solana/wallet-adapter-react` (web3.js v1 → v3)

The `@solana/wallet-adapter-kit/web3js` entry point mirrors the classic `@solana/wallet-adapter-react` surface for apps moving to `@solana/web3.js` v3, so most components migrate by swapping imports:

```tsx
import '@solana/wallet-adapter-kit/styles.css';
import {
    ConnectionProvider,
    KitWalletProvider,
    WalletModalProvider,
    WalletMultiButton,
    useConnection,
    useWallet,
} from '@solana/wallet-adapter-kit/web3js';
import { SystemProgram, Transaction } from '@solana/web3.js';

function App() {
    return (
        <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
            <KitWalletProvider chain="solana:mainnet">
                <WalletModalProvider>
                    <WalletMultiButton />
                    <SendSol />
                </WalletModalProvider>
            </KitWalletProvider>
        </ConnectionProvider>
    );
}

function SendSol() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    const onClick = async () => {
        const transaction = new Transaction();
        transaction.feePayer = publicKey!;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        transaction.add(SystemProgram.transfer({ fromPubkey: publicKey!, lamports: 1_000_000n, toPubkey: publicKey! }));
        await sendTransaction(transaction, connection);
    };

    return <button onClick={onClick}>Send</button>;
}
```

The entry point re-exports everything from the root entry point, plus:

- `ConnectionProvider` / `useConnection` — publish and read a `@solana/web3.js` v3 `Connection`, exactly like the classic provider. Replaces the v1 `ConnectionProvider`; `WalletProvider wallets={[...]}` becomes `KitWalletProvider chain`.
- `useWallet()` — the Kit-native hook extended with the classic fields: `publicKey` (a web3.js `Address`), `select(walletName)`, `signTransaction`, `signAllTransactions` (both `undefined` when unavailable, as in v1), and `sendTransaction(transaction, connection, options)`. All of them accept and return web3.js `Transaction`/`VersionedTransaction` instances; signing is bridged to the wallet's Kit signer under the hood.
- `useAnchorWallet()` — `{ publicKey, signTransaction, signAllTransactions }` or `undefined`, for Anchor-style providers.
- Codec helpers — `toKitTransaction`, `toVersionedTransaction`, `toLegacyTransaction`, `isVersionedTransaction`, and `signTransactionsWithWalletSigner`, for crossing between web3.js transactions and Kit signers yourself.

What intentionally differs from v1: `wallet`/`wallets` are wallet-standard `UiWallet` objects (`wallet.name`, not `wallet.adapter.name`), there is no argumentless `connect()` (use `select(name)` or `connect(wallet)`), and `signIn` keeps the Kit shape `signIn(wallet, input)`.

`@solana/web3.js` v3 is an optional peer dependency — install it only if you use this entry point.

## Differences from `@solana/wallet-adapter-react`

- **Auto-discovery.** There is no `wallets={[...]}` list and no per-wallet adapter packages — every wallet-standard wallet is offered automatically. Use `KitWalletProvider`'s `filter` to narrow the set.
- **One chain per provider.** A provider targets a single `chain`. To switch networks, render a provider with a different `chain`/`endpoint`.
- **Kit types.** `address` is a base58 `string` (not a `PublicKey`), and `signer` is a Kit `TransactionSigner` (not a set of `signTransaction` methods).
- **ESM only.** This package ships ES modules and targets modern bundlers (Next.js, Vite), matching the Kit ecosystem it builds on.
