# Kit-native — `@solana/wallet-adapter-kit`

Wallet-adapter ergonomics for `@solana/web3.js` v3 apps, built natively on Kit (`@solana/kit`, `@solana/react`, `@solana/kit-plugin-wallet`). Same shape as the classic `useWallet()` + `WalletMultiButton`, but with Kit types and auto-discovery. This replaces the entire wallet layer, so it fits a full rewrite or a new app — not a minimal-diff migration (use the compat shim for that).

## Contents

- [When this path fits](#when-this-path-fits)
- [Step 1 — install](#step-1--install)
- [Step 2 — replace the provider stack](#step-2--replace-the-provider-stack)
- [Step 3 — import the styles](#step-3--import-the-styles)
- [Step 4 — migrate useWallet](#step-4--migrate-usewallet)
- [Step 5 — sign and send transactions](#step-5--sign-and-send-transactions)
- [UI components](#ui-components)
- [Hooks](#hooks)
- [Differences and gotchas](#differences-and-gotchas)
- [Verify](#verify)

## When this path fits

New app, or a rewrite where you want Kit-native ergonomics: auto-discovery (no `wallets={[...]}` list, no per-wallet adapter packages), string addresses, a Kit `TransactionSigner` on the wallet, and a single provider. ESM only.

## Step 1 — install

```shell
npm install @solana/wallet-adapter-kit @solana/kit @solana/react @solana/kit-plugin-wallet
```

Peer dependencies: `@solana/kit ^7.0.0`, `@solana/kit-plugin-wallet ^0.14.0`, `@solana/react ^7.0.0`, `react`, `react-dom`.

## Step 2 — replace the provider stack

Delete `ConnectionProvider` + `WalletProvider` (and the `wallets={[...]}` adapter array) and render one `<KitWalletProvider>`. It builds a Kit client with the wallet plugin (plus an RPC when `endpoint` is set) and publishes it to the subtree. There is no wallet list — every wallet-standard wallet supporting the chain is discovered automatically.

**Before (v1):**

```tsx
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';

function AppProviders({ children }) {
    return (
        <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
            <WalletProvider wallets={[/* adapter instances */]} autoConnect>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}
```

**After (v3 / Kit):**

```tsx
import '@solana/wallet-adapter-kit/styles.css';
import { KitWalletProvider, WalletModalProvider } from '@solana/wallet-adapter-kit';

function AppProviders({ children }) {
    return (
        <KitWalletProvider chain="solana:mainnet" endpoint="https://api.mainnet-beta.solana.com">
            <WalletModalProvider>{children}</WalletModalProvider>
        </KitWalletProvider>
    );
}
```

`KitWalletProvider` props:

| Prop | Type | Notes |
|---|---|---|
| `chain` (required) | `WalletPluginConfig['chain']` | e.g. `'solana:mainnet'`. One provider targets one chain |
| `endpoint` | `string` | HTTP RPC URL; when set, an RPC is attached so the client can send transactions |
| `rpcSubscriptionsUrl` | `string` | WS URL; defaults to `endpoint` with `http` swapped for `ws` |
| `autoConnect` | `boolean` | Silently reconnect the persisted wallet on startup. Default `true` |
| `storage` | `WalletPluginConfig['storage']` | Persistence adapter; `null` disables it. Must be a stable reference across renders |
| `storageKey` | `string` | Default `'kit-wallet'` |
| `filter` | `WalletPluginConfig['filter']` | Restrict which discovered wallets are offered; may be defined inline |

## Step 3 — import the styles

Import `@solana/wallet-adapter-kit/styles.css` once (see the provider example above). Styling reuses the classic `wallet-adapter-*` class names, so existing wallet-adapter themes and overrides apply unchanged.

## Step 4 — migrate useWallet

`useWallet()` mirrors the classic surface but returns Kit types. Map the fields:

| Classic (`@solana/wallet-adapter-react`) | Kit-native (`@solana/wallet-adapter-kit`) | Notes |
|---|---|---|
| `publicKey: PublicKey \| null` | `address: string \| null` | base58 string, not a `PublicKey` |
| — | `account`, `signer` | new: connected `account` and a Kit `TransactionSigner` |
| `select(name)` then `await connect()` | `connect(wallet)` / `connectAsync(wallet)` | pass a discovered wallet object, not a name; no `select` |
| `disconnect()` | `disconnect(wallet?)` / `disconnectAsync(wallet?)` | |
| `connecting` / `connected` / `disconnecting` | same names | derived from `status` |
| — | `status` | `'connected' \| 'connecting' \| 'disconnected' \| 'disconnecting' \| 'pending' \| 'reconnecting'` |
| `signMessage(bytes)` | `signMessage(bytes)` | resolves with the signature |
| `signIn(input)` | `signIn(wallet, input)` | |
| `signTransaction` / `signAllTransactions` / `sendTransaction` | use `signer` (see Step 5) | no per-call sign/send on the hook |
| `wallet` / `wallets` | `wallet` / `wallets` | Kit `UiWallet` objects |

```tsx
import { useWallet } from '@solana/wallet-adapter-kit';

function Profile() {
    const { address, connected, signer } = useWallet();
    return connected ? <p>Connected: {address}</p> : <p>Not connected</p>;
}
```

`connect` is fire-and-forget; use `connectAsync` / `disconnectAsync` when you need the resolved value or to catch failures.

## Step 5 — sign and send transactions

Get the connected account's Kit signer with `useWalletSigner()` (or `useWallet().signer`); it is `null` when disconnected or read-only. Pass it into a Kit transaction message (as fee payer or instruction signer) or into a `@solana/web3.js` v3 signing API — the same `TransactionSigner` interop as the compat shim.

```tsx
import { useWalletSigner } from '@solana/wallet-adapter-kit';

function SendButton() {
    const signer = useWalletSigner();
    // signer is null until connected
    // pass `signer` to a Kit transaction message or a v3 signing API
}
```

There is no `sendTransaction` on the hook. Build and send with the Kit client (configured via `endpoint`) or your v3 `Connection`, signing with `signer`.

## UI components

- `WalletMultiButton` — connect button that opens the wallet-selection modal, then shows the truncated address with a dropdown (copy address, change wallet, disconnect). Replaces the classic `WalletMultiButton`.
- `WalletModalProvider` / `useWalletModal` — controls the modal; render the provider above any `WalletMultiButton`.
- `WalletModal`, `WalletListItem`, `WalletIcon`, `Button` — lower-level pieces for custom UI.

## Hooks

`useWallet` and `useWalletSigner` cover most needs. These individual hooks are also exported (thin wrappers over `@solana/kit-plugin-wallet/react` that read the client from context, so you never pass a `client` argument): `useWallets`, `useConnectedWallet`, `useWalletStatus`, `useIsWalletReady`, `useConnect`, `useDisconnect`, `useSignMessage`, `useSignIn`, `useSelectAccount`.

## Differences and gotchas

- **Auto-discovery.** No `wallets={[...]}` list and no per-wallet adapter packages — every wallet-standard wallet is offered. Use `KitWalletProvider`'s `filter` to narrow the set.
- **One chain per provider.** A provider targets a single `chain`. To switch networks, render a provider with a different `chain` / `endpoint`; the client rebuilds and the subtree resubscribes.
- **Kit types.** `address` is a base58 `string` (not a `PublicKey`); `signer` is a Kit `TransactionSigner` (not a bag of `signTransaction` methods). Anywhere the old code used `publicKey.toBase58()`, use `address` directly; where it needed a `PublicKey`, convert with Kit's `address()` helper as needed.
- **ESM only.** Ships ES modules for modern bundlers (Next.js, Vite).
- **`storage` must be a stable reference.** An inline `storage` object rebuilds the client every render. `filter` may be inline — its changes apply without rebuilding.

## Verify

- App builds (ESM bundler).
- `WalletMultiButton` lists discovered wallets and connects.
- `useWallet()` returns a string `address` and a non-null `signer` when connected.
- A transaction signs with `signer` and sends through the Kit client / RPC.
