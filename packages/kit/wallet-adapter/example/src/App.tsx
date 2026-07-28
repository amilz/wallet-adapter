import { KitWalletProvider, WalletModalProvider } from '@solana/wallet-adapter-kit';
import type { ReactNode } from 'react';

export const CHAIN = 'solana:devnet';
export const ENDPOINT = 'https://api.devnet.solana.com';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <KitWalletProvider chain={CHAIN} endpoint={ENDPOINT}>
            <WalletModalProvider>{children}</WalletModalProvider>
        </KitWalletProvider>
    );
}
