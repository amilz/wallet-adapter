import { ConnectionProvider, KitWalletProvider, WalletModalProvider } from '@solana/wallet-adapter-kit/web3js';

import type { ReactNode } from 'react';

export const CHAIN = 'solana:devnet';
export const ENDPOINT = 'https://api.devnet.solana.com';

export function AppProviders({ children, endpoint = ENDPOINT }: { children: ReactNode; endpoint?: string }) {
    return (
        <ConnectionProvider endpoint={endpoint}>
            <KitWalletProvider chain={CHAIN}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </KitWalletProvider>
        </ConnectionProvider>
    );
}
