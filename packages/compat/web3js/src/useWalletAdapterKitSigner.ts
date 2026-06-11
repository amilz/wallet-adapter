import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import {
    createSignerFromWalletAdapter,
    type WalletAdapterSignerConfig,
    type WalletAdapterTransactionSigner,
} from './signer.js';

/**
 * Expose the connected wallet-adapter wallet as a Kit transaction signer.
 *
 * The signer can be passed directly to `@solana/web3.js` v3 signing APIs
 * (`Transaction#sign`, `VersionedTransaction#sign`, `Connection#sendTransaction`,
 * `sendAndConfirmTransaction`) and to `@solana/kit` transaction signing functions.
 *
 * Returns `{ signer: null }` while no wallet is connected. Must be used within a
 * `WalletProvider`.
 *
 * @example
 * ```tsx
 * const { signer } = useWalletAdapterKitSigner();
 * // ...
 * await transaction.sign([signer]);
 * ```
 */
export function useWalletAdapterKitSigner(config: WalletAdapterSignerConfig = {}): {
    signer: WalletAdapterTransactionSigner | null;
} {
    const { wallet, publicKey } = useWallet();
    const adapter = wallet?.adapter ?? null;
    const base58 = publicKey?.toBase58() ?? null;
    const { chain } = config;
    const signer = useMemo(
        () => (adapter?.publicKey && base58 ? createSignerFromWalletAdapter(adapter, { chain }) : null),
        [adapter, base58, chain]
    );
    return { signer };
}
