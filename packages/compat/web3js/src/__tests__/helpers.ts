import {
    type Address,
    assertIsTransactionWithinSizeLimit,
    blockhash,
    compileTransaction,
    createTransactionMessage,
    generateKeyPair,
    getAddressFromPublicKey,
    getCompiledTransactionMessageDecoder,
    getCompiledTransactionMessageEncoder,
    getTransactionDecoder,
    getTransactionEncoder,
    partiallySignTransaction,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
    type Transaction,
    type TransactionWithinSizeLimit,
    type TransactionWithLifetime,
} from '@solana/kit';
import type { Adapter } from '@solana/wallet-adapter-base';
import { SolanaSignTransaction, type SolanaSignTransactionInput } from '@solana/wallet-standard-features';
import type { Wallet, WalletAccount } from '@wallet-standard/base';

export const TEST_BLOCKHASH = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';
export const MUTATED_BLOCKHASH = 'So11111111111111111111111111111111111111112';

export interface MockWallet {
    address: Address;
    keyPair: CryptoKeyPair;
    signTransaction: jest.Mock;
    wallet: Wallet;
}

export async function createMockWallet({ mutateMessage = false } = {}): Promise<MockWallet> {
    const keyPair = await generateKeyPair();
    const walletAddress = await getAddressFromPublicKey(keyPair.publicKey);
    const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));

    const signTransaction = jest.fn(async (...inputs: SolanaSignTransactionInput[]) => {
        const decoder = getTransactionDecoder();
        const encoder = getTransactionEncoder();
        return await Promise.all(
            inputs.map(async ({ transaction }) => {
                let decoded = decoder.decode(transaction);
                if (mutateMessage) {
                    const compiledMessage = getCompiledTransactionMessageDecoder().decode(decoded.messageBytes);
                    const mutated = getCompiledTransactionMessageEncoder().encode({
                        ...compiledMessage,
                        lifetimeToken: blockhash(MUTATED_BLOCKHASH),
                    });
                    decoded = { ...decoded, messageBytes: mutated as unknown as typeof decoded.messageBytes };
                }
                const signed = await partiallySignTransaction([keyPair], decoded);
                return { signedTransaction: new Uint8Array(encoder.encode(signed)) };
            })
        );
    });

    const account: WalletAccount = {
        address: walletAddress,
        chains: ['solana:mainnet'],
        features: [SolanaSignTransaction],
        publicKey: publicKeyBytes,
    };
    const wallet = {
        accounts: [account],
        chains: ['solana:mainnet'],
        features: {
            [SolanaSignTransaction]: {
                signTransaction,
                supportedTransactionVersions: ['legacy', 0],
                version: '1.0.0',
            },
        },
        icon: 'data:image/svg+xml;base64,',
        name: 'Mock Wallet',
        version: '1.0.0',
    } as unknown as Wallet;

    return { address: walletAddress, keyPair, signTransaction, wallet };
}

export function createMockAdapter(wallet: Wallet, walletAddress: Address): Adapter {
    return {
        name: 'Mock Wallet',
        publicKey: { toBase58: () => walletAddress },
        standard: true,
        wallet,
    } as unknown as Adapter;
}

export function createTestTransaction(
    feePayer: Address
): Transaction & TransactionWithinSizeLimit & TransactionWithLifetime {
    const message = setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: blockhash(TEST_BLOCKHASH), lastValidBlockHeight: 100n },
        setTransactionMessageFeePayer(feePayer, createTransactionMessage({ version: 0 }))
    );
    const transaction = compileTransaction(message);
    assertIsTransactionWithinSizeLimit(transaction);
    return transaction;
}
