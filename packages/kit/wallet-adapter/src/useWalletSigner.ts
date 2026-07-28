import { useConnectedWallet } from '@solana/kit-plugin-wallet/react';
import { useWalletClient } from './useWalletClient.js';

/**
 * Returns the connected account's Kit signer, or `null` when disconnected or when the wallet is
 * read-only.
 *
 * Pass it straight into a Kit transaction message (as fee payer or an instruction signer) or into
 * `@solana/web3.js` v3 signing APIs.
 */
export function useWalletSigner() {
    const connected = useConnectedWallet(useWalletClient());
    return connected?.signer ?? null;
}
