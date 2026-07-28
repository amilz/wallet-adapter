import type { Client, ClientPlugin } from '@solana/kit';
import { createClient } from '@solana/kit';
import { solanaRpc } from '@solana/kit-plugin-rpc';
import type { WalletPluginConfig } from '@solana/kit-plugin-wallet';
import { walletSigner } from '@solana/kit-plugin-wallet';
import { ClientProvider } from '@solana/react';
import type { ReactNode } from 'react';
import React, { useMemo, useRef } from 'react';

export type KitWalletProviderProps = {
    children: ReactNode;
    /** The chain this app targets, e.g. `'solana:mainnet'`. One provider targets one chain. */
    chain: WalletPluginConfig['chain'];
    /** HTTP RPC endpoint. When set, an RPC is attached to the client so `useClient()` can send transactions. */
    endpoint?: string;
    /** WebSocket RPC subscriptions endpoint. Defaults to `endpoint` with `http` swapped for `ws`. */
    rpcSubscriptionsUrl?: string;
    /** Silently reconnect to the persisted wallet on startup. @default true */
    autoConnect?: boolean;
    /**
     * Storage adapter for persisting the selected account. Pass `null` to disable persistence.
     * Must be a stable reference across renders — an inline object rebuilds the client each render.
     */
    storage?: WalletPluginConfig['storage'];
    /** Storage key used for persistence. @default 'kit-wallet' */
    storageKey?: string;
    /** Restrict which discovered wallets are offered. May be defined inline; changes apply without rebuilding the client. */
    filter?: WalletPluginConfig['filter'];
};

/**
 * Builds a Kit client with the wallet plugin (and an optional RPC) and publishes it to the subtree.
 *
 * Wrap your app in this once, then reach for {@link useWallet}, {@link useWalletSigner}, and the
 * prebuilt UI components. To switch networks, render a provider with a different `chain`/`endpoint` —
 * the client is rebuilt and the subtree resubscribes.
 */
export function KitWalletProvider({
    children,
    chain,
    endpoint,
    rpcSubscriptionsUrl,
    autoConnect,
    storage,
    storageKey,
    filter,
}: KitWalletProviderProps) {
    const filterRef = useRef(filter);
    filterRef.current = filter;

    const client = useMemo<Client<object>>(() => {
        const filterWallets: NonNullable<WalletPluginConfig['filter']> = (wallet) =>
            filterRef.current ? filterRef.current(wallet) : true;
        const withWallet = createClient().use(
            walletSigner({ autoConnect, chain, filter: filterWallets, storage, storageKey })
        );
        if (!endpoint) return withWallet;
        // `solanaRpc`'s return type is too deep for `.use()` to infer, so the plugin's output is
        // widened to keep the client shape resolvable; RPC capabilities are read via `useClient`.
        const rpcPlugin = solanaRpc({ rpcSubscriptionsUrl, rpcUrl: endpoint }) as ClientPlugin<object, object>;
        return withWallet.use(rpcPlugin);
    }, [chain, endpoint, rpcSubscriptionsUrl, autoConnect, storage, storageKey]);

    return <ClientProvider client={client}>{children}</ClientProvider>;
}
