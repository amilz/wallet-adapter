import type { WalletName } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, SystemProgram, Transaction } from '@solana/web3.js';
import type { ReactNode } from 'react';
import { useCallback } from 'react';

const ENDPOINT = 'http://127.0.0.1:8899';

// Any valid base58-encoded 32-byte blockhash works for offline signing.
const RECENT_BLOCKHASH = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <ConnectionProvider endpoint={ENDPOINT}>
            <WalletProvider wallets={[]} autoConnect={false}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}

export function useWalletActions() {
    const wallet = useWallet();
    const { select, connect, publicKey, signMessage, signTransaction } = wallet;

    const connectTo = useCallback(
        async (walletName: string) => {
            select(walletName as WalletName);
            await connect();
        },
        [select, connect],
    );

    const signHelloWorld = useCallback(async () => {
        if (!signMessage) throw new Error('Wallet does not support message signing');
        return await signMessage(new TextEncoder().encode('hello world'));
    }, [signMessage]);

    const signTransferToSelf = useCallback(async () => {
        if (!publicKey) throw new Error('Wallet not connected');
        if (!signTransaction) throw new Error('Wallet does not support transaction signing');
        const transaction = new Transaction({
            recentBlockhash: RECENT_BLOCKHASH,
            feePayer: publicKey,
        }).add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: publicKey,
                lamports: 0.1 * LAMPORTS_PER_SOL,
            }),
        );
        return await signTransaction(transaction);
    }, [publicKey, signTransaction]);

    return { wallet, connectTo, signHelloWorld, signTransferToSelf };
}
