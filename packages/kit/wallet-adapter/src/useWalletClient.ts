import type { ClientWithWallet } from '@solana/kit-plugin-wallet';
import { useClient } from '@solana/react';

/**
 * Reads the wallet-enabled Kit client published by {@link KitWalletProvider}.
 *
 * Every other hook in this package pulls its client from here, so callers never pass one explicitly.
 * Widen the type when you also configured RPC or program plugins and need those capabilities.
 */
export function useWalletClient<TClient extends ClientWithWallet = ClientWithWallet>() {
    return useClient<TClient>();
}
