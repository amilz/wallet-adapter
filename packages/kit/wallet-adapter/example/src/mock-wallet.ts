import { registerWallet } from '@wallet-standard/wallet';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

const keypair = nacl.sign.keyPair();

export const mockWalletPublicKeyBytes: Uint8Array = keypair.publicKey;
export const mockWalletAddress: string = bs58.encode(keypair.publicKey);

const CHAINS = ['solana:devnet'] as const;

const ICON =
    'data:image/svg+xml;base64,' +
    btoa('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#9945FF"/></svg>');

const account = {
    address: mockWalletAddress,
    chains: CHAINS,
    features: ['solana:signMessage', 'solana:signTransaction'] as const,
    publicKey: keypair.publicKey,
};

// Real wallets expose no accounts until the user approves a connection, so `accounts` starts empty
// and is populated on connect.
let connectedAccounts: (typeof account)[] = [];

export const mockWallet = {
    chains: CHAINS,
    features: {
        'solana:signMessage': {
            signMessage: async (...inputs: readonly { message: Uint8Array }[]) =>
                inputs.map(({ message }) => ({
                    signature: nacl.sign.detached(message, keypair.secretKey),
                    signedMessage: message,
                })),
            version: '1.0.0' as const,
        },
        'solana:signTransaction': {
            signTransaction: async (...inputs: readonly { transaction: Uint8Array }[]) =>
                inputs.map(({ transaction }) => {
                    const numSignatures = transaction[0];
                    const messageOffset = 1 + numSignatures * 64;
                    const message = transaction.slice(messageOffset);
                    const signed = new Uint8Array(transaction);
                    signed.set(nacl.sign.detached(message, keypair.secretKey), 1);
                    return { signedTransaction: signed };
                }),
            supportedTransactionVersions: ['legacy', 0] as const,
            version: '1.0.0' as const,
        },
        'standard:connect': {
            connect: async () => {
                connectedAccounts = [account];
                return { accounts: connectedAccounts };
            },
            version: '1.0.0' as const,
        },
        'standard:events': {
            on: (_event: string, _listener: (...args: unknown[]) => void) => () => {},
            version: '1.0.0' as const,
        },
    },
    get accounts() {
        return connectedAccounts;
    },
    icon: ICON as `data:image/svg+xml;base64,${string}`,
    name: 'Mock Wallet',
    version: '1.0.0' as const,
};

export function registerMockWallet(): void {
    registerWallet(mockWallet);
}
