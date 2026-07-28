import type { ConnectionConfig } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import type { FC, ReactNode } from 'react';
import React, { useMemo } from 'react';
import { ConnectionContext } from './useConnection.js';

export interface ConnectionProviderProps {
    children: ReactNode;
    endpoint: string;
    config?: ConnectionConfig;
}

/**
 * Publishes a `@solana/web3.js` v3 `Connection` to the subtree, exactly like the classic
 * `@solana/wallet-adapter-react` `ConnectionProvider`.
 *
 * Render it anywhere above components that call {@link useConnection} — inside or outside
 * `KitWalletProvider`; the two providers are independent.
 */
export const ConnectionProvider: FC<ConnectionProviderProps> = ({
    children,
    endpoint,
    config = { commitment: 'confirmed' },
}) => {
    const connection = useMemo(() => new Connection(endpoint, config), [endpoint, config]);

    return <ConnectionContext.Provider value={{ connection }}>{children}</ConnectionContext.Provider>;
};
