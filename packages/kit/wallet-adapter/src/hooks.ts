import {
    useConnect as useConnectWithClient,
    useConnectedWallet as useConnectedWalletWithClient,
    useDisconnect as useDisconnectWithClient,
    useIsWalletReady as useIsWalletReadyWithClient,
    useSelectAccount as useSelectAccountWithClient,
    useSignIn as useSignInWithClient,
    useSignMessage as useSignMessageWithClient,
    useWallets as useWalletsWithClient,
    useWalletStatus as useWalletStatusWithClient,
} from '@solana/kit-plugin-wallet/react';
import type { WalletNamespace, WalletState, WalletStatus } from '@solana/kit-plugin-wallet';
import type { ConnectAction, DisconnectAction, SignInAction, SignMessageAction } from './types.js';
import { useWalletClient } from './useWalletClient.js';

/** Discovered wallets matching the provider's chain and filter. */
export function useWallets(): WalletState['wallets'] {
    return useWalletsWithClient(useWalletClient());
}

/** The active connection (`{ account, signer, wallet }`) or `null`. */
export function useConnectedWallet(): WalletState['connected'] {
    return useConnectedWalletWithClient(useWalletClient());
}

/** The current wallet connection status. */
export function useWalletStatus(): WalletStatus {
    return useWalletStatusWithClient(useWalletClient());
}

/** `true` once the client has settled past its initial auto-reconnect warm-up. */
export function useIsWalletReady(): boolean {
    return useIsWalletReadyWithClient(useWalletClient());
}

/** Connect to a discovered wallet. */
export function useConnect(): ConnectAction {
    return useConnectWithClient(useWalletClient());
}

/** Disconnect the active wallet (or deauthorize a specific one). */
export function useDisconnect(): DisconnectAction {
    return useDisconnectWithClient(useWalletClient());
}

/** Sign an arbitrary message with the connected account. */
export function useSignMessage(): SignMessageAction {
    return useSignMessageWithClient(useWalletClient());
}

/** Sign In With Solana. */
export function useSignIn(): SignInAction {
    return useSignInWithClient(useWalletClient());
}

/** Switch the active account to another authorized account. */
export function useSelectAccount(): WalletNamespace['selectAccount'] {
    return useSelectAccountWithClient(useWalletClient());
}
