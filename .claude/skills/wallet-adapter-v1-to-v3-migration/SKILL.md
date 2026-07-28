---
name: wallet-adapter-v1-to-v3-migration
description: Migrate a Solana dApp's wallet-connection layer off classic @solana/wallet-adapter-react (web3.js v1) to @solana/web3.js v3 / Kit. Picks up after the core web3js-v1-to-v3-migration — the app builds transactions with Kit, but the wallet is still wired through useWallet() returning a PublicKey and signTransaction/sendTransaction. Helps choose between two paths — the @solana/web3-compat-wallet-adapter shim (keep your WalletProvider, modal, and autoconnect; expose the wallet as a Kit TransactionSigner) or the Kit-native @solana/wallet-adapter-kit (replace ConnectionProvider + WalletProvider with one KitWalletProvider) — then gives source-accurate before/after steps. Use when the user asks to "migrate wallet adapter to v3", "wallet-adapter to kit", "migrate wallet connection to web3.js v3", "upgrade WalletProvider to kit", "get a Kit signer from useWallet", "replace ConnectionProvider/WalletProvider with KitWalletProvider", or "migrate useWallet publicKey to address".
---

# Wallet-adapter v1 -> web3.js v3 / Kit migration

Migrate the **wallet-connection layer** of a Solana dApp from classic `@solana/wallet-adapter-react` (web3.js v1) to `@solana/web3.js` v3 / Kit.

## Scope and prerequisite

This skill migrates the wallet seam only: `WalletProvider`, `useWallet()`, and the `publicKey` / `signTransaction` / `sendTransaction` / `signMessage` calls your components make.

It assumes the app's **core** web3.js code has already been migrated with the upstream `web3js-v1-to-v3-migration` skill. That skill moves transaction building, RPC, and codecs to v3/Kit but **does not touch the wallet-adapter layer**. After running it you are typically left with: transactions built with Kit, but the wallet still coming from `@solana/wallet-adapter-react`'s `useWallet()` returning a `PublicKey` and v1-shaped `signTransaction` / `sendTransaction`. That mismatch is what this skill resolves.

If the core migration has not been done yet, do that first — signing v1 objects with a v3 signer will not type-check or work.

## Choose a path

Two supported forward paths, both maintained in this repo. Pick before editing anything.

| | **Compat shim** — `@solana/web3-compat-wallet-adapter` | **Kit-native** — `@solana/wallet-adapter-kit` |
|---|---|---|
| Best for | Existing app, smallest diff | Full rewrite / new app |
| Provider stack | Unchanged (`ConnectionProvider` + `WalletProvider wallets={[...]}`) | Replaced by one `<KitWalletProvider>` |
| Wallet UI / modal / autoconnect | Kept as-is | Reimplemented on Kit (`WalletMultiButton`, `WalletModalProvider`) |
| Wallet list | Keep your `wallets={[...]}` adapters | Auto-discovery via wallet standard — no list |
| `useWallet()` | Still classic (`publicKey: PublicKey`) | Kit shape (`address: string`, `signer`) |
| What changes | Only transaction build/sign/send code | The whole wallet layer |
| Module format | CJS + ESM | ESM only |

Decision rule:

- **Migrating an existing app and want the smallest, lowest-risk diff -> compat shim.** This is the recommended default. You keep every wallet UI component, the modal, autoconnect, and your adapter list, and only the code that signs/sends transactions moves to v3. See **[references/compat-shim.md](references/compat-shim.md)**.
- **Doing a full rewrite, starting a new app, or you want Kit-native ergonomics** (auto-discovery, string addresses, a single provider, no per-wallet adapter packages) **-> kit adapter.** See **[references/kit-native.md](references/kit-native.md)**.

If unsure, default to the compat shim — it is reversible and touches the least code.

## The core idea

Both paths converge on the same primitive: a Kit `TransactionSigner`. web3.js v3 signing APIs (`Transaction#sign`, `VersionedTransaction#sign`, `Connection#sendTransaction`, `sendAndConfirmTransaction`) and `@solana/kit` all accept a `TransactionSigner` directly. Wherever the v1 app called `wallet.signTransaction(tx)` or `wallet.sendTransaction(tx, connection)`, the v3 app instead obtains a signer and passes it into the v3 API.

- Compat shim: `const { signer } = useWalletAdapterKitSigner()`
- Kit-native: `const signer = useWalletSigner()` (or `useWallet().signer`)

## Workflow

1. Confirm the prerequisite: core web3.js v1 -> v3 migration is done.
2. Pick a path using the table above; state which and why.
3. Open the matching reference file and follow its before/after steps end to end.
4. Verify: app builds, wallet connects, and a transaction signs and sends through the new signer. Confirm off-chain message signing still uses `signMessage` (not the transaction signer).

## Do not invent APIs

Every hook, type, prop, and import path in the reference files is taken verbatim from this repo's source (`packages/compat/web3js` and `packages/kit/wallet-adapter`). Do not add signer methods, provider props, or hook names that are not documented there. When in doubt, read the source before writing code.
