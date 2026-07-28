import type { Address, Transaction, VersionedTransaction } from '@solana/web3.js';
import { useMemo } from 'react';
import { useWallet } from './useWallet.js';

export interface AnchorWallet {
    publicKey: Address;
    signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>;
}

/**
 * The connected wallet as the `Wallet` interface Anchor providers expect, or `undefined` when
 * disconnected or unable to return signed transactions. Mirrors the classic
 * `@solana/wallet-adapter-react` `useAnchorWallet()`.
 */
export function useAnchorWallet(): AnchorWallet | undefined {
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    return useMemo(
        () =>
            publicKey && signTransaction && signAllTransactions
                ? { publicKey, signAllTransactions, signTransaction }
                : undefined,
        [publicKey, signTransaction, signAllTransactions]
    );
}
